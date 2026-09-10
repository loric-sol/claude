"""Data sources for trades and order-book snapshots.

Real exchange APIs (Binance, Coinbase, etc.) are commodity plumbing --
`ccxt` already wraps dozens of them. This module keeps that plumbing behind
one small interface so the detectors never need to know whether the data
came from a live exchange or a recorded fixture.
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from decimal import Decimal
from pathlib import Path
from typing import List, Optional

from .models import OrderBookSnapshot, Trade


class DataSource(ABC):
    @abstractmethod
    def get_trades(self) -> List[Trade]:
        ...

    @abstractmethod
    def get_order_book_snapshots(self) -> List[OrderBookSnapshot]:
        ...


class MockDataSource(DataSource):
    """Reads trades/snapshots from local JSON, shaped like a recorded exchange feed.

    This is what the test suite and CLI demo run against -- no network, no
    API key, no rate limit. Point `CCXTDataSource` at a real exchange when
    you want live data; nothing else in the pipeline changes.
    """

    def __init__(self, trades_path: Path, orderbook_path: Optional[Path] = None):
        self.trades_path = Path(trades_path)
        self.orderbook_path = Path(orderbook_path) if orderbook_path else None

    def get_trades(self) -> List[Trade]:
        raw = json.loads(self.trades_path.read_text())
        return [
            Trade(
                timestamp=float(t["timestamp"]),
                price=Decimal(str(t["price"])),
                amount=Decimal(str(t["amount"])),
                side=t["side"],
            )
            for t in raw
        ]

    def get_order_book_snapshots(self) -> List[OrderBookSnapshot]:
        if not self.orderbook_path:
            return []
        raw = json.loads(self.orderbook_path.read_text())
        return [
            OrderBookSnapshot(
                timestamp=float(s["timestamp"]),
                bids=[(Decimal(str(p)), Decimal(str(q))) for p, q in s["bids"]],
                asks=[(Decimal(str(p)), Decimal(str(q))) for p, q in s["asks"]],
            )
            for s in raw
        ]


class CCXTDataSource(DataSource):
    """Wired to a real exchange via ccxt -- exchange id and symbol are the only
    things you need to fill in once you `pip install -e ".[live]"`.

    Not covered by the test suite (it needs network access and a live order
    book), so treat it as scaffolding: correct shape, unverified against any
    particular exchange's quirks (rate limits, snapshot depth limits, symbol
    formatting). `get_order_book_snapshots` returns a single snapshot per
    call -- polling it on an interval and collecting the results is the
    caller's job.
    """

    def __init__(self, exchange_id: str, symbol: str, limit: int = 500):
        try:
            import ccxt  # type: ignore
        except ImportError as exc:
            raise ImportError(
                "CCXTDataSource needs the 'live' extra: pip install -e '.[live]'"
            ) from exc
        self._exchange = getattr(ccxt, exchange_id)()
        self.symbol = symbol
        self.limit = limit

    def get_trades(self) -> List[Trade]:
        raw = self._exchange.fetch_trades(self.symbol, limit=self.limit)
        return [
            Trade(
                timestamp=t["timestamp"] / 1000.0,
                price=Decimal(str(t["price"])),
                amount=Decimal(str(t["amount"])),
                side=t["side"],
            )
            for t in raw
        ]

    def get_order_book_snapshots(self) -> List[OrderBookSnapshot]:
        book = self._exchange.fetch_order_book(self.symbol)
        snapshot = OrderBookSnapshot(
            timestamp=book["timestamp"] / 1000.0 if book.get("timestamp") else 0.0,
            bids=[(Decimal(str(p)), Decimal(str(q))) for p, q in book["bids"]],
            asks=[(Decimal(str(p)), Decimal(str(q))) for p, q in book["asks"]],
        )
        return [snapshot]
