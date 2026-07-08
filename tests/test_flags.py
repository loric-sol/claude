import unittest
from decimal import Decimal

from liasse.flags import FlagType, evaluate_basis
from liasse.models import K1Data


def make_k1(beginning, ending=Decimal("62000.00")):
    return K1Data(
        partner_name="Jane Doe",
        partnership_name="Acme Holdings LP",
        partnership_ein="12-3456789",
        tax_year=2025,
        beginning_capital_account=beginning,
        ending_capital_account=ending,
    )


class EvaluateBasisTests(unittest.TestCase):
    def test_clean_carryforward_produces_no_flags(self):
        k1 = make_k1(beginning=Decimal("50000.00"))
        flags = evaluate_basis(k1, prior_ending_basis=Decimal("50000.00"))
        self.assertEqual(flags, [])

    def test_small_rounding_difference_is_not_flagged(self):
        k1 = make_k1(beginning=Decimal("50000.40"))
        flags = evaluate_basis(k1, prior_ending_basis=Decimal("50000.00"))
        self.assertEqual(flags, [])

    def test_missing_beginning_basis_is_flagged(self):
        k1 = make_k1(beginning=None)
        flags = evaluate_basis(k1, prior_ending_basis=Decimal("50000.00"))
        self.assertEqual(len(flags), 1)
        self.assertEqual(flags[0].flag_type, FlagType.MISSING_BEGINNING_BASIS)

    def test_no_prior_record_is_flagged(self):
        k1 = make_k1(beginning=Decimal("50000.00"))
        flags = evaluate_basis(k1, prior_ending_basis=None)
        self.assertEqual(len(flags), 1)
        self.assertEqual(flags[0].flag_type, FlagType.NO_PRIOR_RECORD)
        self.assertEqual(flags[0].current_beginning_basis, Decimal("50000.00"))

    def test_mismatch_beyond_tolerance_is_flagged(self):
        k1 = make_k1(beginning=Decimal("45000.00"))
        flags = evaluate_basis(k1, prior_ending_basis=Decimal("50000.00"))
        self.assertEqual(len(flags), 1)
        flag = flags[0]
        self.assertEqual(flag.flag_type, FlagType.BASIS_MISMATCH)
        self.assertEqual(flag.prior_ending_basis, Decimal("50000.00"))
        self.assertEqual(flag.current_beginning_basis, Decimal("45000.00"))


if __name__ == "__main__":
    unittest.main()
