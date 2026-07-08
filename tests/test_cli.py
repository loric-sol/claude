import shutil
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from liasse.cli import main
from liasse.ledger import BasisLedger

FIXTURES = Path(__file__).parent / "fixtures"


class CliEndToEndTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.ledger_path = self.tmp / "ledger.csv"
        shutil.copy(FIXTURES / "ledger_seed.csv", self.ledger_path)
        self.outbox = self.tmp / "outbox"

    def run_cli(self, fixture_name):
        return main(
            [
                str(FIXTURES / fixture_name),
                "--ledger",
                str(self.ledger_path),
                "--outbox",
                str(self.outbox),
            ]
        )

    def test_clean_k1_writes_no_draft(self):
        exit_code = self.run_cli("k1_ok.json")
        self.assertEqual(exit_code, 0)
        self.assertFalse(self.outbox.exists())

    def test_mismatch_k1_writes_a_draft_and_updates_ledger(self):
        exit_code = self.run_cli("k1_mismatch.json")
        self.assertEqual(exit_code, 0)

        drafts = list(self.outbox.glob("*basis_mismatch.txt"))
        self.assertEqual(len(drafts), 1)
        self.assertIn("Acme Holdings LP", drafts[0].read_text())

        ledger = BasisLedger(self.ledger_path)
        self.assertEqual(
            ledger.get_prior_ending_basis("12-3456789", "Jane Doe", 2025),
            Decimal("58000.00"),
        )

    def test_missing_beginning_writes_a_draft(self):
        exit_code = self.run_cli("k1_missing_beginning.json")
        self.assertEqual(exit_code, 0)
        drafts = list(self.outbox.glob("*missing_beginning_basis.txt"))
        self.assertEqual(len(drafts), 1)


if __name__ == "__main__":
    unittest.main()
