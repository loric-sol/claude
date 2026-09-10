# tradewatch

Heuristic trade-surveillance detectors for public exchange data: wash-trade
and spoofing/layering **patterns**, flagged from trade tape and order-book
snapshots alone — no account IDs, no order IDs, no ML black box.

This is a deliberately narrow tool. Real surveillance systems (Nasdaq SMARTS,
FINRA's cross-market surveillance, exchange-internal market-integrity teams)
work off the full order lifecycle: every order, cancel, and modify, tagged to
an account, correlated across venues. That data is proprietary. What's public
— trade prints and order-book depth — is a much weaker signal, and this repo
is upfront about the gap between the two rather than pretending a public-data
tool can "detect fraud."

## What it actually does

**Wash-trade pattern detector** (`tradewatch/detectors/wash_trading.py`)
Slides a time window over the trade tape and flags bursts where a lot of
gross volume traded hands but net position barely moved and price didn't
move at all — the fingerprint fake volume leaves even when you can't see
who's on both sides of the trade. Flags carry the numbers behind the call
(round-trip ratio, price range, size uniformity) so a reviewer can judge it
directly instead of trusting a black-box score.

**Spoofing/layering pattern detector** (`tradewatch/detectors/spoofing.py`)
Watches order-book snapshots over time for a large order that appears away
from the touch, sits briefly, then gets pulled — without a matching amount
of it ever executing. That's the shape of a classic spoof (place a fake wall
to bias the tape, trade on the other side, cancel before the wall gets hit).

**What it explicitly does *not* claim:**
- It cannot prove wash trading, because public trade feeds carry no account
  identifiers. Two trades canceling each other out could be one manipulator
  or two independent market makers who happened to trade against each other.
  A flag means "worth pulling the account-level tape for," not "confirmed."
- It cannot see order intent, only outcome. A large order pulled because the
  trader's view of the market changed looks identical to a spoof in this
  data.
- Thresholds (window length, size multiples, lifetime cutoffs) are
  starting points calibrated against the synthetic scenarios in this repo,
  not backtested against labeled real-world manipulation cases. Retune them
  against your own data before trusting the output on anything real.

## Layout

```
tradewatch/
  models.py              Trade, OrderBookSnapshot, Flag
  ingestion.py            MockDataSource (local JSON) + CCXTDataSource (scaffold)
  detectors/
    wash_trading.py
    spoofing.py
  report.py                renders flags to Markdown
  cli.py
tests/
  fixtures/
    generate_fixtures.py   regenerates the synthetic scenarios below
    trades_clean.json, trades_wash_pattern.json
    orderbook_clean.json, orderbook_spoof.json, trades_for_spoof.json
  test_wash_trading.py, test_spoofing.py, test_cli.py
```

## Running it

```
pip install -e .
tradewatch --trades tests/fixtures/trades_wash_pattern.json
```

```
tradewatch --trades tests/fixtures/trades_for_spoof.json \
           --orderbook tests/fixtures/orderbook_spoof.json
```

Sample output against the embedded wash-trade scenario:

```
# Trade Surveillance Report

1 pattern(s) flagged.

## [HIGH] wash_trade_pattern (120.0–136.5s)

12 trades over 16.5s moved 14.4000 units of gross volume but netted out to
0.0% of that in position change, while price stayed within 0.000%.

Evidence:
- trade_count: 12
- gross_volume: 14.4000
- round_trip_ratio: 1.0
- price_range_pct: 0.0
- size_coefficient_of_variation: 0.0
```

## Test fixtures are synthetic, on purpose

`tests/fixtures/generate_fixtures.py` builds every fixture from a fixed
random seed plus a hand-designed scenario (an embedded wash-trade burst, an
embedded spoof-and-pull). They are not recordings of a real exchange. That's
intentional: the tests assert against known ground truth, which you can't get
from a real tape without already knowing whether it contains manipulation.
Real validation is the next step — see Roadmap.

## Going live

`ingestion.CCXTDataSource` wraps [ccxt](https://github.com/ccxt/ccxt) so any
of the dozens of exchanges it supports work with one line — fill in the
exchange id and symbol, `pip install -e ".[live]"`. It's scaffolding, not
tested against a real exchange's quirks (rate limits, book-depth limits,
symbol formatting): expect to debug it against whichever exchange you point
it at. `get_order_book_snapshots()` returns a single snapshot per call —
polling it on an interval and accumulating snapshots is the caller's job,
since the spoofing detector needs a *sequence* of snapshots to see an order
appear and disappear.

## Roadmap

- **Backtest against labeled cases.** The CFTC/SEC publish enforcement
  actions with dates, symbols, and described manipulation patterns (e.g.
  the Sarao spoofing case). Running this tool against the public tape from
  those windows — even without perfect ground truth — would be a much
  stronger validation than synthetic fixtures alone.
- **Quote-stuffing / order-to-trade ratio detector**, using message-rate
  data where available (most public feeds don't expose it — Binance's
  diff-depth stream is one that does).
- **Cross-venue timing correlation**, e.g. flagging trades on one exchange
  that consistently front-run price moves on another — the public-data
  analogue of cross-market surveillance.
- **Tick-tolerance price matching** in the spoofing detector instead of
  exact Decimal equality, for exchanges where snapshot and trade-stream
  prices don't line up byte-for-byte.
