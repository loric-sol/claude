import json
import unittest
from decimal import Decimal
from pathlib import Path

from tradewatch.detectors.spoofing import SpoofingConfig, detect_spoofing
from tradewatch.models import OrderBookSnapshot, Trade

FIXTURES = Path(__file__).parent / "fixtures"


def load_snapshots(name):
    raw = json.loads((FIXTURES / name).read_text())
    return [
        OrderBookSnapshot(
            timestamp=float(s["timestamp"]),
            bids=[(Decimal(p), Decimal(q)) for p, q in s["bids"]],
            asks=[(Decimal(p), Decimal(q)) for p, q in s["asks"]],
        )
        for s in raw
    ]


def load_trades(name):
    raw = json.loads((FIXTURES / name).read_text())
    return [
        Trade(
            timestamp=float(t["timestamp"]),
            price=Decimal(t["price"]),
            amount=Decimal(t["amount"]),
            side=t["side"],
        )
        for t in raw
    ]


class SpoofingDetectorTests(unittest.TestCase):
    def test_clean_book_produces_no_flags(self):
        snapshots = load_snapshots("orderbook_clean.json")
        self.assertEqual(detect_spoofing(snapshots, trades=[]), [])

    def test_wall_appear_and_pull_is_flagged(self):
        snapshots = load_snapshots("orderbook_spoof.json")
        trades = load_trades("trades_for_spoof.json")
        flags = detect_spoofing(snapshots, trades)
        self.assertTrue(flags, "expected the ask-wall pull to be flagged")
        flag = flags[0]
        self.assertEqual(flag.kind, "spoofing_pattern")
        self.assertEqual(flag.evidence["side"], "asks")
        self.assertEqual(flag.evidence["price"], "50002.00")
        self.assertEqual(flag.severity, "high")
        self.assertLess(flag.evidence["executed_fraction"], 0.05)

    def test_order_that_mostly_executes_is_not_flagged(self):
        snapshots = load_snapshots("orderbook_spoof.json")
        # If the wall's volume actually traded, it isn't a pull -- it's a fill.
        trades = [
            Trade(timestamp=13.0, price=Decimal("50002"), amount=Decimal("9.5"), side="buy"),
        ]
        flags = detect_spoofing(snapshots, trades)
        self.assertEqual(flags, [])

    def test_fewer_than_two_snapshots_is_safe(self):
        self.assertEqual(detect_spoofing([], []), [])
        one = load_snapshots("orderbook_clean.json")[:1]
        self.assertEqual(detect_spoofing(one, []), [])

    def test_custom_config_lifetime_window(self):
        snapshots = load_snapshots("orderbook_spoof.json")
        trades = load_trades("trades_for_spoof.json")
        # The wall lived for 8s (t=12 to t=20); a 5s max lifetime should miss it.
        strict = SpoofingConfig(max_lifetime_seconds=5.0)
        self.assertEqual(detect_spoofing(snapshots, trades, strict), [])


if __name__ == "__main__":
    unittest.main()
