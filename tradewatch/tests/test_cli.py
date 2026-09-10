import unittest
from pathlib import Path

from tradewatch.cli import main

FIXTURES = Path(__file__).parent / "fixtures"


class CliEndToEndTests(unittest.TestCase):
    def test_clean_data_reports_no_flags(self, capsys=None):
        exit_code = main(["--trades", str(FIXTURES / "trades_clean.json")])
        self.assertEqual(exit_code, 0)

    def test_wash_pattern_data_runs_clean_exit(self):
        exit_code = main(["--trades", str(FIXTURES / "trades_wash_pattern.json")])
        self.assertEqual(exit_code, 0)

    def test_writes_report_to_file(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            out_path = Path(tmp) / "report.md"
            exit_code = main(
                [
                    "--trades",
                    str(FIXTURES / "trades_wash_pattern.json"),
                    "--out",
                    str(out_path),
                ]
            )
            self.assertEqual(exit_code, 0)
            content = out_path.read_text()
            self.assertIn("wash_trade_pattern", content)

    def test_with_orderbook_flags_spoofing_too(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            out_path = Path(tmp) / "report.md"
            exit_code = main(
                [
                    "--trades",
                    str(FIXTURES / "trades_for_spoof.json"),
                    "--orderbook",
                    str(FIXTURES / "orderbook_spoof.json"),
                    "--out",
                    str(out_path),
                ]
            )
            self.assertEqual(exit_code, 0)
            content = out_path.read_text()
            self.assertIn("spoofing_pattern", content)


if __name__ == "__main__":
    unittest.main()
