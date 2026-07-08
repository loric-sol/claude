import argparse
import sys
from pathlib import Path
from typing import Optional, Sequence

from .correspondence import build_email_draft
from .extraction import MockK1Extractor
from .flags import evaluate_basis
from .ledger import BasisLedger


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        prog="liasse",
        description="Basis-tracking flag layer for K-1s (DASSI IQ).",
    )
    parser.add_argument(
        "input",
        type=Path,
        help="Path to a K-1 extraction JSON (mock vendor response for now)",
    )
    parser.add_argument(
        "--ledger",
        type=Path,
        default=Path("ledger.csv"),
        help="Path to the basis ledger CSV (default: ledger.csv)",
    )
    parser.add_argument(
        "--outbox",
        type=Path,
        default=Path("outbox"),
        help="Directory to write drafted client emails (default: outbox/)",
    )
    args = parser.parse_args(argv)

    extractor = MockK1Extractor()
    k1 = extractor.extract(args.input)

    ledger = BasisLedger(args.ledger)
    prior_ending_basis = ledger.get_prior_ending_basis(
        partnership_ein=k1.partnership_ein,
        partner_name=k1.partner_name,
        tax_year=k1.tax_year - 1,
    )

    flags = evaluate_basis(k1, prior_ending_basis)

    if not flags:
        print(
            f"OK: {k1.partner_name} / {k1.partnership_name} ({k1.tax_year}) "
            "— basis carries forward cleanly."
        )
    else:
        args.outbox.mkdir(parents=True, exist_ok=True)
        for flag in flags:
            print(f"[{flag.flag_type.value}] {flag.message}")
            draft = build_email_draft(flag, k1)
            draft_path = (
                args.outbox / f"{k1.partnership_ein}_{k1.tax_year}_{flag.flag_type.value}.txt"
            )
            draft_path.write_text(draft)
            print(f"  -> draft saved to {draft_path}")

    ledger.record_ending_basis(k1)
    print(f"Ledger updated: {args.ledger}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
