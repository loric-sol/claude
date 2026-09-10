"""CLI: run detectors against a trades/order-book source and print a report."""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import List, Optional

from .detectors.spoofing import SpoofingConfig, detect_spoofing
from .detectors.wash_trading import WashTradingConfig, detect_wash_trading
from .ingestion import MockDataSource
from .report import render_markdown


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Scan trade/order-book data for surveillance patterns."
    )
    parser.add_argument("--trades", required=True, type=Path, help="JSON file of trades")
    parser.add_argument(
        "--orderbook", type=Path, default=None, help="JSON file of order-book snapshots"
    )
    parser.add_argument(
        "--out", type=Path, default=None, help="Write report to this file instead of stdout"
    )
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    source = MockDataSource(args.trades, args.orderbook)
    trades = source.get_trades()
    snapshots = source.get_order_book_snapshots()

    flags = list(detect_wash_trading(trades, WashTradingConfig()))
    if snapshots:
        flags.extend(detect_spoofing(snapshots, trades, SpoofingConfig()))

    report = render_markdown(flags)
    if args.out:
        args.out.write_text(report)
    else:
        print(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
