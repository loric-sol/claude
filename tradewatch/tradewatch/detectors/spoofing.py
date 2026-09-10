"""Layering/spoofing pattern detection from order-book snapshots.

The classic pattern: a large order appears away from the touch (so it's
unlikely to actually get hit), sits there just long enough to bias other
traders' read of supply and demand, then gets pulled -- at or just before
the moment price approaches it -- without ever trading. This module flags
price levels that behave that way.

It cannot see order IDs or intent, so a large resting order pulled because
the trader's own view of the market changed looks identical in this data.
Treat flags as candidates for a human (or an exchange's own order-ID-level
surveillance system) to review, not as proven spoofing.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List

from ..models import Flag, OrderBookSnapshot, Trade


@dataclass(frozen=True)
class SpoofingConfig:
    large_order_multiple: float = 5.0  # x the snapshot's median level size to count as "large"
    min_levels_from_touch: int = 1  # 0 = best bid/ask, 1 = one level away, etc.
    max_lifetime_seconds: float = 15.0  # pulled within this long after appearing = suspicious
    max_executed_fraction: float = 0.2  # at most this much of the order can have actually traded


def detect_spoofing(
    snapshots: List[OrderBookSnapshot],
    trades: List[Trade],
    config: SpoofingConfig = SpoofingConfig(),
) -> List[Flag]:
    if len(snapshots) < 2:
        return []
    snapshots = sorted(snapshots, key=lambda s: s.timestamp)
    flags: List[Flag] = []
    for side in ("bids", "asks"):
        flags.extend(_detect_side(snapshots, trades, side, config))
    return sorted(flags, key=lambda f: f.start_ts)


def _median(values: List[Decimal]) -> Decimal:
    if not values:
        return Decimal("0")
    s = sorted(values)
    mid = len(s) // 2
    if len(s) % 2:
        return s[mid]
    return (s[mid - 1] + s[mid]) / 2


def _detect_side(
    snapshots: List[OrderBookSnapshot],
    trades: List[Trade],
    side: str,
    config: SpoofingConfig,
) -> List[Flag]:
    flags: List[Flag] = []
    open_orders: Dict[Decimal, dict] = {}  # price -> {"size": Decimal, "first_seen": float}

    for snap in snapshots:
        levels = getattr(snap, side)
        book = {price: size for price, size in levels}
        baseline = _median([size for _, size in levels])
        threshold = baseline * Decimal(str(config.large_order_multiple)) if baseline else None

        for rank, (price, size) in enumerate(levels):
            if rank < config.min_levels_from_touch:
                continue
            if threshold and size >= threshold and price not in open_orders:
                open_orders[price] = {"size": size, "first_seen": snap.timestamp}

        for price in list(open_orders.keys()):
            info = open_orders[price]
            current_size = book.get(price, Decimal("0"))
            if current_size >= info["size"] * Decimal("0.9"):
                continue  # still resting -- not pulled yet

            lifetime = snap.timestamp - info["first_seen"]
            traded = _executed_volume_at_price(
                trades, price, info["first_seen"], snap.timestamp
            )
            executed_fraction = float(traded / info["size"]) if info["size"] else 0.0

            if (
                lifetime <= config.max_lifetime_seconds
                and executed_fraction <= config.max_executed_fraction
            ):
                flags.append(
                    Flag(
                        kind="spoofing_pattern",
                        start_ts=info["first_seen"],
                        end_ts=snap.timestamp,
                        severity="high" if executed_fraction < 0.05 else "medium",
                        evidence={
                            "side": side,
                            "price": str(price),
                            "order_size": str(info["size"]),
                            "lifetime_seconds": round(lifetime, 2),
                            "executed_fraction": round(executed_fraction, 4),
                        },
                        explanation=(
                            f"A {info['size']}-unit order on the {side[:-1]} side at {price} "
                            f"appeared and was pulled {lifetime:.1f}s later with only "
                            f"{executed_fraction:.1%} of it ever trading."
                        ),
                    )
                )
            del open_orders[price]
    return flags


def _executed_volume_at_price(
    trades: List[Trade], price: Decimal, start: float, end: float
) -> Decimal:
    """Sum of trade volume at exactly this price within [start, end].

    Real order books quote in fixed ticks, so an exact match is fine against
    recorded/live data; if you feed this synthetic prices with floating
    rounding noise, snap them to the exchange's tick size first.
    """
    total = Decimal("0")
    for t in trades:
        if start <= t.timestamp <= end and t.price == price:
            total += t.amount
    return total
