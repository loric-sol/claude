"""Wash-trading *pattern* detection from a public trade tape.

Important limitation, stated up front: public trade feeds don't carry
account IDs. There is no way to prove two trades came from the same
beneficial owner using this data alone -- only the exchange (or a regulator
with subpoena power) can do that. What this module finds instead is the
statistical fingerprint wash trading leaves behind even when accounts are
invisible: a burst of volume that largely cancels itself out (bought and
sold back in near-equal size, over and over) while barely moving the price.
Legitimate market-making can look similar over short windows, so treat a
flag as "worth pulling the account-level tape for," not as a finding.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import List

from ..models import Flag, Trade


@dataclass(frozen=True)
class WashTradingConfig:
    window_seconds: float = 30.0
    min_trades_in_window: int = 4
    min_gross_volume: Decimal = Decimal("10")
    min_round_trip_ratio: float = 0.85  # bought-and-sold-back fraction of gross volume
    max_price_range_pct: float = 0.001  # price stays within 0.1% of the window's mid


def detect_wash_trading(
    trades: List[Trade], config: WashTradingConfig = WashTradingConfig()
) -> List[Flag]:
    if not trades:
        return []
    trades = sorted(trades, key=lambda t: t.timestamp)
    raw_flags: List[Flag] = []
    start_idx = 0
    for end_idx in range(len(trades)):
        window_end_ts = trades[end_idx].timestamp
        while trades[start_idx].timestamp < window_end_ts - config.window_seconds:
            start_idx += 1
        window = trades[start_idx : end_idx + 1]
        if len(window) < config.min_trades_in_window:
            continue

        signed = sum((t.amount if t.side == "buy" else -t.amount) for t in window)
        gross = sum(t.amount for t in window)
        if gross < config.min_gross_volume:
            continue

        round_trip_ratio = float(1 - abs(signed) / gross)
        prices = [t.price for t in window]
        mid = (max(prices) + min(prices)) / 2 or Decimal("1")
        price_range_pct = float((max(prices) - min(prices)) / mid)

        if (
            round_trip_ratio >= config.min_round_trip_ratio
            and price_range_pct <= config.max_price_range_pct
        ):
            sizes = [float(t.amount) for t in window]
            mean_size = sum(sizes) / len(sizes)
            variance = sum((s - mean_size) ** 2 for s in sizes) / len(sizes)
            cv = (variance**0.5) / mean_size if mean_size else 0.0
            severity = "high" if cv < 0.05 else "medium"
            raw_flags.append(
                Flag(
                    kind="wash_trade_pattern",
                    start_ts=window[0].timestamp,
                    end_ts=window[-1].timestamp,
                    severity=severity,
                    evidence={
                        "trade_count": len(window),
                        "gross_volume": str(gross),
                        "round_trip_ratio": round(round_trip_ratio, 4),
                        "price_range_pct": round(price_range_pct, 6),
                        "size_coefficient_of_variation": round(cv, 4),
                    },
                    explanation=(
                        f"{len(window)} trades over "
                        f"{window[-1].timestamp - window[0].timestamp:.1f}s moved {gross} units "
                        f"of gross volume but netted out to "
                        f"{round((1 - round_trip_ratio) * 100, 1)}% of that in position change, "
                        f"while price stayed within {price_range_pct:.3%}."
                    ),
                )
            )
    return _merge_overlapping(raw_flags)


def _merge_overlapping(flags: List[Flag]) -> List[Flag]:
    """Collapse the sliding-window hits covering the same burst into one flag."""
    if not flags:
        return []
    merged = [flags[0]]
    for f in flags[1:]:
        last = merged[-1]
        if f.start_ts <= last.end_ts:
            better_severity = "high" if "high" in (last.severity, f.severity) else last.severity
            merged[-1] = Flag(
                kind=last.kind,
                start_ts=last.start_ts,
                end_ts=max(last.end_ts, f.end_ts),
                severity=better_severity,
                evidence=f.evidence,
                explanation=f.explanation,
            )
        else:
            merged.append(f)
    return merged
