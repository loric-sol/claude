import unittest
from decimal import Decimal

from liasse.correspondence import build_email_draft
from liasse.flags import BasisFlag, FlagType
from liasse.models import K1Data


class BuildEmailDraftTests(unittest.TestCase):
    def setUp(self):
        self.k1 = K1Data(
            partner_name="Jane Doe",
            partnership_name="Acme Holdings LP",
            partnership_ein="12-3456789",
            tax_year=2025,
            beginning_capital_account=Decimal("45000.00"),
            ending_capital_account=Decimal("58000.00"),
        )

    def test_mismatch_draft_includes_both_figures_and_names(self):
        flag = BasisFlag(
            flag_type=FlagType.BASIS_MISMATCH,
            message="mismatch",
            prior_ending_basis=Decimal("50000.00"),
            current_beginning_basis=Decimal("45000.00"),
        )
        draft = build_email_draft(flag, self.k1)
        self.assertIn("Subject:", draft)
        self.assertIn("Jane", draft)
        self.assertIn("Acme Holdings LP", draft)
        self.assertIn("50000.00", draft)
        self.assertIn("45000.00", draft)

    def test_missing_beginning_draft(self):
        flag = BasisFlag(
            flag_type=FlagType.MISSING_BEGINNING_BASIS,
            message="missing",
        )
        draft = build_email_draft(flag, self.k1)
        self.assertIn("Missing beginning basis", draft)
        self.assertIn("Acme Holdings LP", draft)

    def test_no_prior_record_draft(self):
        flag = BasisFlag(
            flag_type=FlagType.NO_PRIOR_RECORD,
            message="no prior",
            current_beginning_basis=Decimal("45000.00"),
        )
        draft = build_email_draft(flag, self.k1)
        self.assertIn("first year", draft)
        self.assertIn("45000.00", draft)


if __name__ == "__main__":
    unittest.main()
