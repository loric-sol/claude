"""Regenerates the synthetic fixture files used by the test suite and CLI demo.

These are NOT recordings of a real exchange -- they're hand-designed
scenarios (a fixed random seed for the "organic" background noise, plus a
deliberately embedded wash-trade burst or spoof-and-pull sequence) so the
tests assert against known ground truth. Re-run this file if you change the
scenario parameters below; the checked-in JSON is the output.
"""
import json
import random
from decimal import Decimal
from pathlib import Path

OUT = Path(__file__).parent
random.seed(7)


def organic_trades(start_ts, duration, base_price="50000.00"):
    price = Decimal(base_price)
    trades = []
    t = start_ts
    while t < start_ts + duration:
        t += random.uniform(0.5, 4.0)
        price += Decimal(str(round(random.uniform(-3, 3), 2)))
        amount = Decimal(str(round(random.uniform(0.05, 0.8), 4)))
        side = random.choice(["buy", "sell"])
        trades.append(
            {"timestamp": round(t, 2), "price": str(price), "amount": str(amount), "side": side}
        )
    return trades


def build_trades_clean():
    trades = organic_trades(0, 300)
    (OUT / "trades_clean.json").write_text(json.dumps(trades, indent=2))


def build_trades_wash_pattern():
    trades = organic_trades(0, 90)
    # Embed a wash-trade burst: 12 alternating buy/sell trades, uniform size,
    # pinned to one price -- gross volume cancels out, price never moves.
    burst_start = 120.0
    price = Decimal("50000.00")
    for i in range(12):
        trades.append(
            {
                "timestamp": round(burst_start + i * 1.5, 2),
                "price": str(price),
                "amount": "1.2000",
                "side": "buy" if i % 2 == 0 else "sell",
            }
        )
    trades += organic_trades(180, 90)
    trades.sort(key=lambda t: t["timestamp"])
    (OUT / "trades_wash_pattern.json").write_text(json.dumps(trades, indent=2))


def build_orderbook_clean():
    snapshots = []
    mid = Decimal("50000.00")
    for i in range(15):
        ts = i * 4.0
        bids = [
            (str(mid - Decimal(str(j))), str(round(random.uniform(0.5, 2.0), 3)))
            for j in range(1, 6)
        ]
        asks = [
            (str(mid + Decimal(str(j))), str(round(random.uniform(0.5, 2.0), 3)))
            for j in range(1, 6)
        ]
        snapshots.append({"timestamp": ts, "bids": bids, "asks": asks})
    (OUT / "orderbook_clean.json").write_text(json.dumps(snapshots, indent=2))


def build_spoof_scenario():
    mid = Decimal("50000.00")
    snapshots = []
    trades = []

    # Normal book for the first few snapshots.
    baseline_bids = [(str(mid - Decimal(str(j))), "1.000") for j in range(1, 6)]
    baseline_asks = [(str(mid + Decimal(str(j))), "1.000") for j in range(1, 6)]
    for i in range(3):
        snapshots.append({"timestamp": i * 4.0, "bids": baseline_bids, "asks": baseline_asks})

    spoof_price = str(mid + Decimal("2"))  # one level away from touch

    # t=12: a large ask wall appears (10x the ~1.0 baseline) at level 2.
    wall_asks = [
        (str(mid + Decimal("1")), "1.000"),
        (spoof_price, "10.000"),
        (str(mid + Decimal("3")), "1.000"),
        (str(mid + Decimal("4")), "1.000"),
        (str(mid + Decimal("5")), "1.000"),
    ]
    snapshots.append({"timestamp": 12.0, "bids": baseline_bids, "asks": wall_asks})
    snapshots.append({"timestamp": 16.0, "bids": baseline_bids, "asks": wall_asks})  # still resting

    # Meanwhile the spoofer buys on the bid side while the wall discourages sellers.
    trades.append(
        {"timestamp": 14.0, "price": str(mid - Decimal("1")), "amount": "0.4000", "side": "buy"}
    )
    trades.append(
        {"timestamp": 15.0, "price": str(mid - Decimal("1")), "amount": "0.3000", "side": "buy"}
    )

    # t=20: the wall is pulled -- back to baseline, with no matching trade volume at spoof_price.
    snapshots.append({"timestamp": 20.0, "bids": baseline_bids, "asks": baseline_asks})
    snapshots.append({"timestamp": 24.0, "bids": baseline_bids, "asks": baseline_asks})

    (OUT / "orderbook_spoof.json").write_text(json.dumps(snapshots, indent=2))
    (OUT / "trades_for_spoof.json").write_text(json.dumps(trades, indent=2))


if __name__ == "__main__":
    build_trades_clean()
    build_trades_wash_pattern()
    build_orderbook_clean()
    build_spoof_scenario()
    print("Fixtures regenerated.")
