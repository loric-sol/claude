"""Core data types shared by ingestion, detectors, and reporting."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List, Tuple


@dataclass(frozen=True)
class Trade:
    """A single executed trade from the public tape.

    `side` is the taker's side ("buy" or "sell") -- the convention most
    exchange trade-stream APIs use. There is no account/order identifier
    here because public feeds don't carry one.
    """

    timestamp: float  # unix seconds
    price: Decimal
    amount: Decimal
    side: str


@dataclass(frozen=True)
class OrderBookSnapshot:
    """Top-of-book-and-deeper snapshot at one point in time.

    bids/asks are lists of (price, size), best price first. A snapshot, not
    a diff/delta feed -- the polling interval determines how much can hide
    between two consecutive snapshots (see README's limitations section).
    """

    timestamp: float
    bids: List[Tuple[Decimal, Decimal]]
    asks: List[Tuple[Decimal, Decimal]]


@dataclass(frozen=True)
class Flag:
    """One suspected-pattern hit, with the evidence a human would need to review it."""

    kind: str
    start_ts: float
    end_ts: float
    severity: str
    evidence: Dict[str, str]
    explanation: str
