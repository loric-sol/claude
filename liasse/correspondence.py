from .flags import BasisFlag, FlagType
from .models import K1Data

_SIGNOFF = "Thanks,\n"


def build_email_draft(flag: BasisFlag, k1: K1Data) -> str:
    """Static-template client email for a given flag. No API call, no cost.

    Swap this out later for a Claude API call if you want the wording to
    vary with the specifics of the flag instead of filling a fixed template.
    """
    greeting_name = k1.partner_name.split()[0] if k1.partner_name else "there"

    if flag.flag_type == FlagType.MISSING_BEGINNING_BASIS:
        subject = f"Missing beginning basis on your {k1.partnership_name} K-1"
        body = (
            f"Hi {greeting_name},\n\n"
            f"While preparing your {k1.tax_year} return, I noticed the Schedule K-1 "
            f"from {k1.partnership_name} doesn't show a beginning capital account "
            f"balance. Could you send over last year's K-1 for this partnership, or "
            f"check with the partnership's accountant for the correct figure?\n\n"
            f"{_SIGNOFF}"
        )
    elif flag.flag_type == FlagType.BASIS_MISMATCH:
        subject = f"Basis discrepancy on your {k1.partnership_name} K-1"
        body = (
            f"Hi {greeting_name},\n\n"
            f"I'm reviewing your {k1.tax_year} Schedule K-1 from {k1.partnership_name} "
            f"and noticed a mismatch: last year's return shows an ending basis of "
            f"{flag.prior_ending_basis}, but this year's K-1 reports a beginning "
            f"balance of {flag.current_beginning_basis}. Could you check with the "
            f"partnership on which figure is correct before I finalize your return?\n\n"
            f"{_SIGNOFF}"
        )
    elif flag.flag_type == FlagType.NO_PRIOR_RECORD:
        subject = f"Confirming beginning basis for {k1.partnership_name}"
        body = (
            f"Hi {greeting_name},\n\n"
            f"This looks like the first year I'm tracking basis for your interest in "
            f"{k1.partnership_name}. This year's K-1 reports a beginning balance of "
            f"{flag.current_beginning_basis} — could you confirm this matches your "
            f"records (or last year's return) before I proceed?\n\n"
            f"{_SIGNOFF}"
        )
    else:  # pragma: no cover - exhaustive over FlagType
        raise ValueError(f"Unknown flag type: {flag.flag_type}")

    return f"Subject: {subject}\n\n{body}"
