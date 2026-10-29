"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import type { EventType } from "@/lib/types";

/**
 * Client-side analytics for the public page.
 * - Visitor id: random, first-party, in localStorage. Not created when the
 *   browser sends Do Not Track / Global Privacy Control.
 * - Session id: random, in sessionStorage.
 * - Events are sent with navigator.sendBeacon so the outbound navigation to
 *   the booking site is never delayed or blocked.
 */

type Track = (type: EventType, extra?: { serviceId?: string | null; target?: string | null }) => void;
const TrackingContext = createContext<Track>(() => {});

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback for non-secure contexts (e.g. testing on a phone over http://192.168.x.x).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function storageId(storage: () => Storage, key: string): string | null {
  try {
    const s = storage();
    let v = s.getItem(key);
    if (!v) {
      v = randomId();
      s.setItem(key, v);
    }
    return v;
  } catch {
    return null;
  }
}

function privacySignal(): boolean {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.doNotTrack === "1" || n.globalPrivacyControl === true;
}

export function TrackingProvider({ businessId, enabled, children }: { businessId: string; enabled: boolean; children: ReactNode }) {
  const ids = useRef<{ visitorId: string | null; sessionId: string | null } | null>(null);

  const getIds = useCallback(() => {
    if (!ids.current) {
      ids.current = {
        visitorId: privacySignal() ? null : storageId(() => localStorage, "bl_vid"),
        sessionId: storageId(() => sessionStorage, "bl_sid"),
      };
    }
    return ids.current;
  }, []);

  const track = useCallback<Track>(
    (type, extra = {}) => {
      if (!enabled) return;
      const body = JSON.stringify({ businessId, type, serviceId: extra.serviceId ?? null, target: extra.target ?? null, ...getIds() });
      try {
        const blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon?.("/api/events", blob)) return;
      } catch {
        /* fall through */
      }
      fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    },
    [businessId, enabled, getIds],
  );

  // One page view per browser session per business.
  useEffect(() => {
    if (!enabled) return;
    const key = `bl_pv_${businessId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: still count the view */
    }
    track("page_view");
  }, [businessId, enabled, track]);

  return <TrackingContext.Provider value={track}>{children}</TrackingContext.Provider>;
}

type TrackedLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  event: EventType;
  serviceId?: string | null;
  /** Which button was clicked, e.g. "general", "service", "instagram". */
  trackTarget?: string | null;
};

/** An ordinary external link that records a click event before the browser navigates. */
export function TrackedLink({ event, serviceId, trackTarget, onClick, children, ...rest }: TrackedLinkProps) {
  const track = useContext(TrackingContext);
  return (
    <a
      {...rest}
      rel="noopener"
      onClick={(e) => {
        track(event, { serviceId, target: trackTarget });
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
