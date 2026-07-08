# liasse

A basis-tracking flag layer for K-1s, built for DASSI IQ's US tax prep workflow.

The premise: K-1 extraction (OCR/parsing) is a commodity, sold well by
Lido and K1x. Don't rebuild it. This repo is only the 10% that's actually
yours: comparing prior-year ending basis to this year's beginning basis,
flagging mismatches, and drafting the client email when something's off.

## What it does

For each K-1:
1. Extracts structured fields (partner, partnership, tax year, beginning/ending
   capital account) via a `K1Extractor`.
2. Looks up last year's ending basis for that partner/partnership in a local
   CSV ledger.
3. Flags one of three things:
   - `basis_mismatch` — prior ending basis doesn't match this year's beginning
     balance (beyond a $1 rounding tolerance)
   - `missing_beginning_basis` — this year's K-1 has no beginning balance at all
   - `no_prior_record` — no ledger entry exists yet for this partner/partnership
4. When a flag fires, writes a draft client email to `outbox/`.
5. Records this year's ending basis in the ledger, so next season's run has
   something to compare against.

Note: Item L's capital account isn't the same thing as a partner's full
outside tax basis (which also includes their share of partnership
liabilities). Treat a `basis_mismatch` flag as "worth a call to confirm,"
not as a final determination.

## Status: extraction is stubbed

There's no Lido or K1x API call yet — `MockK1Extractor` reads a JSON file
shaped like a vendor response instead of a real PDF. This lets the
basis-tracking and email-drafting logic (the actual point of this repo) get
built and tested today, independent of vendor signup.

`liasse/extraction.py` also has `LidoK1Extractor` and `K1xExtractor` classes
already wired to the right shape — the HTTP call, auth header, and response
parsing are there, but the endpoint URL and exact field names are
placeholders until you have real API docs and a key. When you sign up:

1. Set `LIDO_API_KEY` (or `K1X_API_KEY`) in your environment.
2. Fix the endpoint URL and response field names in the relevant class to
   match Lido's/K1x's actual docs.
3. In `liasse/cli.py`, swap `MockK1Extractor()` for `LidoK1Extractor()` (or
   `K1xExtractor()`).
4. `pip install -e ".[vendor]"` to pull in `requests`.

Nothing else in the pipeline needs to change — ledger, flags, and
correspondence all just consume the `K1Data` the extractor returns.

## Try it

No dependencies needed for the stub/demo path.

```bash
python -m liasse.cli examples/k1_2025.json --ledger examples/ledger.csv --outbox examples/outbox
```

The example ledger has a 2024 ending basis of $33,500 for Sam Client in
Riverbend Properties LP; the example K-1 reports a 2025 beginning balance
of $31,000 — a mismatch, so you should see a flag printed and a draft email
written to `examples/outbox/`.

Run it again and it'll also update `examples/ledger.csv` with the 2025
ending basis, so a 2026 K-1 for the same partner/partnership would compare
against that.

## Tests

Stdlib only, no pytest required:

```bash
python -m unittest discover -s tests
```

## Layout

```
liasse/
  models.py         K1Data — the shape extraction returns
  extraction.py      K1Extractor interface, MockK1Extractor, Lido/K1x stubs
  ledger.py          CSV-backed prior/current ending-basis storage
  flags.py           the actual basis-comparison rule
  correspondence.py  static-template client email drafts
  cli.py             `liasse <k1.json> --ledger ledger.csv`
examples/            a runnable end-to-end demo (mismatch scenario)
tests/               unit + CLI end-to-end tests, fixtures for all 3 flag types
```

## Next steps (only if this earns its keep this season)

- Swap in the real Lido/K1x extractor (see above).
- Replace the static `correspondence.py` template with a Claude API call so
  wording adapts to the specifics of each flag instead of filling blanks.
- Only after that: consider whether it's worth a UI for other solo preparers.
