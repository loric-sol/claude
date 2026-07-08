import csv
from decimal import Decimal
from pathlib import Path
from typing import Dict, Optional, Tuple

from .models import K1Data

FIELDNAMES = ["partnership_ein", "partner_name", "tax_year", "ending_basis"]

LedgerKey = Tuple[str, str, int]


class BasisLedger:
    """A flat CSV of (partnership, partner, tax year) -> ending basis.

    One file per preparer, carried forward season to season. No database,
    no schema migration — just a ledger you can open in a spreadsheet.
    """

    def __init__(self, path: Path):
        self.path = Path(path)
        self._rows: Dict[LedgerKey, Decimal] = {}
        if self.path.exists():
            with self.path.open(newline="") as fh:
                for row in csv.DictReader(fh):
                    key = (row["partnership_ein"], row["partner_name"], int(row["tax_year"]))
                    self._rows[key] = Decimal(row["ending_basis"])

    def get_prior_ending_basis(
        self, partnership_ein: str, partner_name: str, tax_year: int
    ) -> Optional[Decimal]:
        return self._rows.get((partnership_ein, partner_name, tax_year))

    def record_ending_basis(self, k1: K1Data) -> None:
        if k1.ending_capital_account is None:
            return
        self._rows[(k1.partnership_ein, k1.partner_name, k1.tax_year)] = k1.ending_capital_account
        self._write()

    def _write(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=FIELDNAMES)
            writer.writeheader()
            for (ein, partner_name, tax_year), ending_basis in sorted(self._rows.items()):
                writer.writerow(
                    {
                        "partnership_ein": ein,
                        "partner_name": partner_name,
                        "tax_year": tax_year,
                        "ending_basis": str(ending_basis),
                    }
                )
