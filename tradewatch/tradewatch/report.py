"""Render flags into a human-readable report."""
from __future__ import annotations

from typing import List

from .models import Flag

_SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def render_markdown(flags: List[Flag], title: str = "Trade Surveillance Report") -> str:
    if not flags:
        return f"# {title}\n\nNo patterns flagged.\n"

    flags = sorted(flags, key=lambda f: (_SEVERITY_ORDER.get(f.severity, 9), f.start_ts))
    lines = [f"# {title}", "", f"{len(flags)} pattern(s) flagged.", ""]
    for f in flags:
        lines.append(f"## [{f.severity.upper()}] {f.kind} ({f.start_ts:.1f}–{f.end_ts:.1f}s)")
        lines.append("")
        lines.append(f.explanation)
        lines.append("")
        lines.append("Evidence:")
        for k, v in f.evidence.items():
            lines.append(f"- {k}: {v}")
        lines.append("")
    return "\n".join(lines)
