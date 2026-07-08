import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from liasse.ledger import BasisLedger
from liasse.models import K1Data


class BasisLedgerTests(unittest.TestCase):
    def test_missing_ledger_file_returns_none(self):
        with tempfile.TemporaryDirectory() as tmp:
            ledger = BasisLedger(Path(tmp) / "ledger.csv")
            self.assertIsNone(
                ledger.get_prior_ending_basis("12-3456789", "Jane Doe", 2024)
            )

    def test_record_and_read_round_trip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ledger.csv"
            ledger = BasisLedger(path)
            k1 = K1Data(
                partner_name="Jane Doe",
                partnership_name="Acme Holdings LP",
                partnership_ein="12-3456789",
                tax_year=2025,
                beginning_capital_account=Decimal("50000.00"),
                ending_capital_account=Decimal("62000.00"),
            )
            ledger.record_ending_basis(k1)

            reloaded = BasisLedger(path)
            self.assertEqual(
                reloaded.get_prior_ending_basis("12-3456789", "Jane Doe", 2025),
                Decimal("62000.00"),
            )

    def test_reads_seeded_csv(self):
        fixture = Path(__file__).parent / "fixtures" / "ledger_seed.csv"
        ledger = BasisLedger(fixture)
        self.assertEqual(
            ledger.get_prior_ending_basis("12-3456789", "Jane Doe", 2024),
            Decimal("50000.00"),
        )


if __name__ == "__main__":
    unittest.main()
