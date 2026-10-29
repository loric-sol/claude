import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { recordEvent } from "@/lib/analytics";

/**
 * Public, unauthenticated endpoint used by the beauty page to log
 * page views and outbound clicks (sent with navigator.sendBeacon).
 * It only ever accepts events for published businesses and services
 * that belong to them, and stores no personal data.
 */

const id = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);
const Event = z.object({
  businessId: id,
  type: z.enum(["page_view", "booking_click", "social_click", "contact_click"]),
  serviceId: id.nullish(),
  target: z.enum(["general", "service", "instagram", "tiktok", "website", "whatsapp", "phone", "email"]).nullish(),
  visitorId: id.nullish(),
  sessionId: id.nullish(),
});

const BOT_UA = /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|headless|lighthouse/i;

// Simple per-process rate limit. Replace with a shared store (e.g. Redis) when running multiple instances.
const buckets = new Map<string, { count: number; reset: number }>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + 60_000 });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return false;
  }
  b.count++;
  return b.count > 60;
}

export async function POST(req: NextRequest) {
  if (BOT_UA.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 2000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Event.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const e = parsed.data;

  if (rateLimited(e.visitorId ?? e.sessionId ?? e.businessId)) return new NextResponse(null, { status: 429 });

  const business = db().prepare("SELECT id FROM businesses WHERE id = ? AND published = 1").get(e.businessId);
  if (!business) return NextResponse.json({ error: "Unknown business" }, { status: 404 });
  if (e.serviceId) {
    const service = db().prepare("SELECT id FROM services WHERE id = ? AND business_id = ?").get(e.serviceId, e.businessId);
    if (!service) return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  recordEvent({
    businessId: e.businessId,
    type: e.type,
    serviceId: e.serviceId ?? null,
    target: e.target ?? null,
    visitorId: e.visitorId ?? null,
    sessionId: e.sessionId ?? null,
  });
  return new NextResponse(null, { status: 204 });
}
