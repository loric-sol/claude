"use client";

import { useState } from "react";
import { Check, Copy } from "../icons";

export function CopyUrl({ url, compact = false }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true); // e.g. clipboard blocked on http:// — the URL is selectable as a fallback
    }
  }
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-full border border-line bg-white py-1 pl-4 pr-1 ${compact ? "text-xs" : "text-sm"}`}>
      <span className="min-w-0 flex-1 truncate select-all" title={url}>{url.replace(/^https?:\/\//, "")}</span>
      <button type="button" onClick={copy} className="btn-primary shrink-0 px-3 py-1.5 text-xs" aria-live="polite">
        {copied ? <><Check width={14} height={14} /> Copied</> : failed ? "Select & copy" : <><Copy width={14} height={14} /> Copy link</>}
      </button>
    </div>
  );
}
