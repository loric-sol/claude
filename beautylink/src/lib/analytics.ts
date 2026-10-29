import "server-only";
import { db } from "./db";
import type { EventType } from "./types";

/**
 * Analytics storage and queries.
 *
 * Writes go through `recordEvent` only, and reads through `getAnalytics`, so the
 * SQLite implementation can be swapped for Postgres/Supabase (same table, see
 * supabase/schema.sql) or an analytics service without touching the UI.
 *
 * Privacy: we store no IP address, user agent, referrer or name — just the
 * event type, the business/service, and random first-party visitor/session ids.
 */

export interface NewEvent {
  businessId: string;
  type: EventType;
  serviceId?: string | null;
  target?: string | null;
  visitorId?: string | null;
  sessionId?: string | null;
}

export function recordEvent(e: NewEvent) {
  db().prepare(
    "INSERT INTO page_events (business_id, service_id, event_type, target, visitor_id, session_id, is_sample) VALUES (?, ?, ?, ?, ?, ?, 0)",
  ).run(e.businessId, e.serviceId ?? null, e.type, e.target ?? null, e.visitorId ?? null, e.sessionId ?? null);
}

export interface AnalyticsSummary {
  rangeDays: number;
  includesSample: boolean;
  sampleEventCount: number;
  pageViews: number;
  uniqueVisitors: number;
  bookingClicks: number;
  serviceBookingClicks: number;
  generalBookingClicks: number;
  socialClicks: number;
  contactClicks: number;
  topServices: Array<{ serviceId: string; name: string; clicks: number; active: boolean }>;
  socialBreakdown: Array<{ target: string; clicks: number }>;
  contactBreakdown: Array<{ target: string; clicks: number }>;
  daily: Array<{ date: string; views: number; bookingClicks: number }>;
  previous: { pageViews: number; bookingClicks: number };
}

type Row = Record<string, unknown>;

export function getAnalytics(businessId: string, rangeDays: number, includeSample: boolean): AnalyticsSummary {
  const d = db();
  const end = new Date();
  const start = new Date(end);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (rangeDays - 1));
  const prevStart = new Date(start);
  prevStart.setUTCDate(prevStart.getUTCDate() - rangeDays);
  const sampleFilter = includeSample ? "" : "AND is_sample = 0";
  const startIso = start.toISOString();

  const totals = d.prepare(
    `SELECT
       SUM(event_type = 'page_view') AS views,
       COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN visitor_id END) AS visitors,
       SUM(event_type = 'booking_click') AS bookings,
       SUM(event_type = 'booking_click' AND target = 'service') AS service_bookings,
       SUM(event_type = 'booking_click' AND target = 'general') AS general_bookings,
       SUM(event_type = 'social_click') AS social,
       SUM(event_type = 'contact_click') AS contact
     FROM page_events WHERE business_id = ? AND created_at >= ? ${sampleFilter}`,
  ).get(businessId, startIso) as Row;

  const prev = d.prepare(
    `SELECT SUM(event_type = 'page_view') AS views, SUM(event_type = 'booking_click') AS bookings
     FROM page_events WHERE business_id = ? AND created_at >= ? AND created_at < ? ${sampleFilter}`,
  ).get(businessId, prevStart.toISOString(), startIso) as Row;

  const topServices = (d.prepare(
    `SELECT s.id, s.name, s.active, COUNT(*) AS clicks FROM page_events e JOIN services s ON s.id = e.service_id
     WHERE e.business_id = ? AND e.event_type = 'booking_click' AND e.created_at >= ? ${sampleFilter.replace("is_sample", "e.is_sample")}
     GROUP BY s.id ORDER BY clicks DESC LIMIT 10`,
  ).all(businessId, startIso) as Row[]).map((r) => ({ serviceId: String(r.id), name: String(r.name), clicks: Number(r.clicks), active: Boolean(r.active) }));

  const breakdown = (type: EventType) =>
    (d.prepare(
      `SELECT COALESCE(target, 'other') AS target, COUNT(*) AS clicks FROM page_events
       WHERE business_id = ? AND event_type = ? AND created_at >= ? ${sampleFilter} GROUP BY target ORDER BY clicks DESC`,
    ).all(businessId, type, startIso) as Row[]).map((r) => ({ target: String(r.target), clicks: Number(r.clicks) }));

  const dailyRows = d.prepare(
    `SELECT substr(created_at, 1, 10) AS day, SUM(event_type = 'page_view') AS views, SUM(event_type = 'booking_click') AS bookings
     FROM page_events WHERE business_id = ? AND created_at >= ? ${sampleFilter} GROUP BY day`,
  ).all(businessId, startIso) as Row[];
  const byDay = new Map(dailyRows.map((r) => [String(r.day), r]));
  const daily: AnalyticsSummary["daily"] = [];
  for (let i = 0; i < rangeDays; i++) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const key = day.toISOString().slice(0, 10);
    const r = byDay.get(key);
    daily.push({ date: key, views: Number(r?.views ?? 0), bookingClicks: Number(r?.bookings ?? 0) });
  }

  const sample = d.prepare("SELECT COUNT(*) AS n FROM page_events WHERE business_id = ? AND is_sample = 1").get(businessId) as Row;

  return {
    rangeDays,
    includesSample: includeSample,
    sampleEventCount: Number(sample.n),
    pageViews: Number(totals.views ?? 0),
    uniqueVisitors: Number(totals.visitors ?? 0),
    bookingClicks: Number(totals.bookings ?? 0),
    serviceBookingClicks: Number(totals.service_bookings ?? 0),
    generalBookingClicks: Number(totals.general_bookings ?? 0),
    socialClicks: Number(totals.social ?? 0),
    contactClicks: Number(totals.contact ?? 0),
    topServices,
    socialBreakdown: breakdown("social_click"),
    contactBreakdown: breakdown("contact_click"),
    daily,
    previous: { pageViews: Number(prev.views ?? 0), bookingClicks: Number(prev.bookings ?? 0) },
  };
}

export function clearSampleEvents(businessId: string) {
  db().prepare("DELETE FROM page_events WHERE business_id = ? AND is_sample = 1").run(businessId);
}
