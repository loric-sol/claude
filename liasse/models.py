from dataclasses import dataclass
from decimal import Decimal
from typing import Optional


@dataclass(frozen=True)
class K1Data:
    """Fields pulled from a K-1 extraction vendor's response (Lido, K1x, etc).

    beginning/ending_capital_account come from Schedule K-1 Item L. That's a
    capital account, not the partner's full outside tax basis (which also
    includes their share of partnership liabilities) — treat basis_mismatch
    flags as "worth a phone call," not as a final basis determination.
    """

    partner_name: str
    partnership_name: str
    partnership_ein: str
    tax_year: int
    beginning_capital_account: Optional[Decimal]
    ending_capital_account: Optional[Decimal]
    client_email: Optional[str] = None
