import json
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Dict, Optional

from flask import Flask, render_template, request

from .correspondence import build_email_draft
from .flags import evaluate_basis
from .ledger import BasisLedger
from .models import K1Data

app = Flask(__name__)

DEFAULT_LEDGER = "ledger.csv"
DEFAULT_OUTBOX = "outbox"


def _decimal_or_none(value) -> Optional[Decimal]:
    value = (value or "").strip() if isinstance(value, str) else value
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return None


def _k1_from_dict(data: dict) -> K1Data:
    return K1Data(
        partner_name=data["partner_name"],
        partnership_name=data["partnership_name"],
        partnership_ein=data["partnership_ein"],
        tax_year=int(data["tax_year"]),
        beginning_capital_account=_decimal_or_none(data.get("beginning_capital_account")),
        ending_capital_account=_decimal_or_none(data.get("ending_capital_account")),
        client_email=data.get("client_email"),
    )


def _k1_from_form(form) -> K1Data:
    return _k1_from_dict(form)


def _render_result(
    k1: K1Data,
    ledger_path: str,
    outbox_path: str,
    status_message: Optional[str] = None,
    draft_overrides: Optional[Dict[str, str]] = None,
):
    ledger = BasisLedger(Path(ledger_path))
    prior_ending_basis = ledger.get_prior_ending_basis(
        partnership_ein=k1.partnership_ein,
        partner_name=k1.partner_name,
        tax_year=k1.tax_year - 1,
    )
    flags = evaluate_basis(k1, prior_ending_basis)

    overrides = draft_overrides or {}
    drafts = [
        {
            "flag_type": flag.flag_type.value,
            "message": flag.message,
            "draft": overrides.get(flag.flag_type.value, build_email_draft(flag, k1)),
        }
        for flag in flags
    ]

    return render_template(
        "result.html",
        k1=k1,
        prior_ending_basis=prior_ending_basis,
        drafts=drafts,
        ledger_path=ledger_path,
        outbox_path=outbox_path,
        status_message=status_message,
    )


@app.get("/")
def upload_form():
    return render_template(
        "upload.html", default_ledger=DEFAULT_LEDGER, default_outbox=DEFAULT_OUTBOX
    )


@app.post("/check")
def check():
    uploaded = request.files.get("k1_file")
    ledger_path = request.form.get("ledger_path") or DEFAULT_LEDGER
    outbox_path = request.form.get("outbox_path") or DEFAULT_OUTBOX

    if uploaded is None or uploaded.filename == "":
        return render_template(
            "upload.html",
            default_ledger=ledger_path,
            default_outbox=outbox_path,
            error="Choose a K-1 extraction JSON file first.",
        )

    try:
        data = json.loads(uploaded.read())
        k1 = _k1_from_dict(data)
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        return render_template(
            "upload.html",
            default_ledger=ledger_path,
            default_outbox=outbox_path,
            error=f"Couldn't read that file as a K-1 extraction: {exc}",
        )

    return _render_result(k1, ledger_path, outbox_path)


@app.post("/confirm-ledger")
def confirm_ledger():
    k1 = _k1_from_form(request.form)
    ledger_path = request.form.get("ledger_path") or DEFAULT_LEDGER
    outbox_path = request.form.get("outbox_path") or DEFAULT_OUTBOX

    ledger = BasisLedger(Path(ledger_path))
    ledger.record_ending_basis(k1)

    return _render_result(
        k1,
        ledger_path,
        outbox_path,
        status_message=(
            f"Ledger updated: recorded {k1.tax_year} ending basis of "
            f"{k1.ending_capital_account} for {k1.partner_name} / {k1.partnership_name}."
        ),
    )


@app.post("/save-draft")
def save_draft():
    k1 = _k1_from_form(request.form)
    ledger_path = request.form.get("ledger_path") or DEFAULT_LEDGER
    outbox_path = request.form.get("outbox_path") or DEFAULT_OUTBOX
    flag_type = request.form["flag_type"]
    draft_text = request.form["draft_text"]

    outbox = Path(outbox_path)
    outbox.mkdir(parents=True, exist_ok=True)
    draft_path = outbox / f"{k1.partnership_ein}_{k1.tax_year}_{flag_type}.txt"
    draft_path.write_text(draft_text)

    return _render_result(
        k1,
        ledger_path,
        outbox_path,
        status_message=f"Draft saved to {draft_path}",
        draft_overrides={flag_type: draft_text},
    )


def main():
    app.run(debug=True)


if __name__ == "__main__":
    main()
