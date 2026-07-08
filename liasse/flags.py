from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from .models import K1Data

# Extraction/rounding noise between what a partnership reports and what got
# typed in last year shouldn't trigger a client email over a few cents.
TOLERANCE = Decimal("1.00")


class FlagType(str, Enum):
    MISSING_BEGINNING_BASIS = "missing_beginning_basis"
    BASIS_MISMATCH = "basis_mismatch"
    NO_PRIOR_RECORD = "no_prior_record"


@dataclass(frozen=True)
class BasisFlag:
    flag_type: FlagType
    message: str
    prior_ending_basis: Optional[Decimal] = None
    current_beginning_basis: Optional[Decimal] = None


def evaluate_basis(k1: K1Data, prior_ending_basis: Optional[Decimal]) -> List[BasisFlag]:
    """Compare last year's ending basis to this year's beginning basis.

    Returns an empty list when everything ties out cleanly.
    """
    if k1.beginning_capital_account is None:
        return [
            BasisFlag(
                flag_type=FlagType.MISSING_BEGINNING_BASIS,
                message=(
                    f"{k1.partnership_name} K-1 for {k1.partner_name} ({k1.tax_year}) "
                    "has no beginning capital account reported."
                ),
                prior_ending_basis=prior_ending_basis,
            )
        ]

    if prior_ending_basis is None:
        return [
            BasisFlag(
                flag_type=FlagType.NO_PRIOR_RECORD,
                message=(
                    f"No prior-year ending basis on file for {k1.partner_name} in "
                    f"{k1.partnership_name}. Beginning basis of "
                    f"{k1.beginning_capital_account} on the {k1.tax_year} K-1 could not be verified."
                ),
                current_beginning_basis=k1.beginning_capital_account,
            )
        ]

    if abs(prior_ending_basis - k1.beginning_capital_account) > TOLERANCE:
        return [
            BasisFlag(
                flag_type=FlagType.BASIS_MISMATCH,
                message=(
                    f"{k1.partner_name}'s {k1.tax_year - 1} ending basis in "
                    f"{k1.partnership_name} was {prior_ending_basis}, but the "
                    f"{k1.tax_year} K-1 reports a beginning balance of "
                    f"{k1.beginning_capital_account}."
                ),
                prior_ending_basis=prior_ending_basis,
                current_beginning_basis=k1.beginning_capital_account,
            )
        ]

    return []
