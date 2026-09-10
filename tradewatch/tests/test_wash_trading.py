import json
import unittest
from decimal import Decimal
from pathlib import Path

from tradewatch.detectors.wash_trading import WashTradingConfig, detect_wash_trading
from tradewatch.models import Trade

FIXTURES = Path(__file__).parent / "fixtures"


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


class WashTradingDetectorTests(unittest.TestCase):
    def test_clean_tape_produces_no_flags(self):
        trades = load_trades("trades_clean.json")
        self.assertEqual(detect_wash_trading(trades), [])

    def test_embedded_burst_is_flagged(self):
        trades = load_trades("trades_wash_pattern.json")
        flags = detect_wash_trading(trades)
        self.assertTrue(flags, "expected the wash-trade burst to be flagged")
        self.assertTrue(all(f.kind == "wash_trade_pattern" for f in flags))
        # The burst runs from t=120 to ~136.5; every flag should fall in that window.
        self.assertTrue(all(115 <= f.start_ts <= 140 for f in flags))
        self.assertTrue(any(f.severity == "high" for f in flags))

    def test_high_severity_evidence_reflects_uniform_sizing(self):
        trades = load_trades("trades_wash_pattern.json")
        flags = detect_wash_trading(trades)
        high = [f for f in flags if f.severity == "high"][0]
        self.assertLess(high.evidence["size_coefficient_of_variation"], 0.05)
        self.assertGreaterEqual(high.evidence["round_trip_ratio"], 0.85)

    def test_empty_input_is_safe(self):
        self.assertEqual(detect_wash_trading([]), [])

    def test_small_volume_below_threshold_is_not_flagged(self):
        trades = [
            Trade(timestamp=float(i), price=Decimal("100"), amount=Decimal("0.1"), side=side)
            for i, side in enumerate(["buy", "sell", "buy", "sell"])
        ]
        config = WashTradingConfig(min_gross_volume=Decimal("10"))
        self.assertEqual(detect_wash_trading(trades, config), [])


if __name__ == "__main__":
    unittest.main()
