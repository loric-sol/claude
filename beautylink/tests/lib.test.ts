import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseWebUrl, normalisePhone, normaliseInstagram, normaliseTiktok, normaliseEmail, safeHref, detectProvider, isExampleUrl } from "../src/lib/urls.ts";
import { parsePriceToPence, formatPrice, formatDuration } from "../src/lib/format.ts";
import { serviceCta, mainCta } from "../src/lib/booking.ts";
import { slugError, slugify } from "../src/lib/categories.ts";
import type { PublicBusiness, Service } from "../src/lib/types.ts";

test("web URLs: accepts and normalises booking links", () => {
  assert.deepEqual(normaliseWebUrl("https://www.fresha.com/a/amy"), { ok: true, url: "https://www.fresha.com/a/amy" });
  assert.deepEqual(normaliseWebUrl("booksy.com/en-gb/123"), { ok: true, url: "https://booksy.com/en-gb/123" });
  assert.deepEqual(normaliseWebUrl("  "), { ok: true, url: null });
});

test("web URLs: rejects dangerous or broken input", () => {
  for (const bad of [
    "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>", "vbscript:x", "file:///etc/passwd",
    "ftp://example.com", "https://user:pass@example.com", "https://localhost", "not a url", "https://192.168.0.1/x", "mailto:a@b.com",
  ]) {
    const r = normaliseWebUrl(bad);
    assert.equal(r.ok, false, `expected rejection: ${bad}`);
  }
  assert.equal(safeHref("javascript:alert(1)"), null);
});

test("contact handles and phone numbers", () => {
  assert.deepEqual(normaliseInstagram("@amy.beauty"), { ok: true, value: "amy.beauty" });
  assert.deepEqual(normaliseInstagram("https://www.instagram.com/amy.beauty/"), { ok: true, value: "amy.beauty" });
  assert.equal(normaliseInstagram("amy beauty!").ok, false);
  assert.deepEqual(normaliseTiktok("https://www.tiktok.com/@amybeauty"), { ok: true, value: "amybeauty" });
  assert.deepEqual(normalisePhone("07700 900123"), { ok: true, value: "447700900123" });
  assert.deepEqual(normalisePhone("+44 7700 900123"), { ok: true, value: "447700900123" });
  assert.equal(normalisePhone("123").ok, false);
  assert.equal(normaliseEmail("nope").ok, false);
});

test("prices are parsed to integer pence without float errors", () => {
  assert.equal(parsePriceToPence("45"), 4500);
  assert.equal(parsePriceToPence("32.5"), 3250);
  assert.equal(parsePriceToPence("£19.99"), 1999);
  assert.equal(parsePriceToPence("1,200"), 120000);
  assert.equal(parsePriceToPence("4.555"), null);
  assert.equal(parsePriceToPence("-5"), null);
  assert.equal(formatPrice(4500), "£45");
  assert.equal(formatPrice(3250), "£32.50");
  assert.equal(formatDuration(90), "1 hr 30 min");
});

test("provider detection", () => {
  assert.equal(detectProvider("https://www.fresha.com/a/x"), "Fresha");
  assert.equal(detectProvider("https://booksy.com/en-gb/1"), "Booksy");
  assert.equal(detectProvider("https://www.treatwell.co.uk/place/x"), "Treatwell");
  assert.equal(isExampleUrl("https://example.com/demo"), true);
});

test("slugs", () => {
  assert.equal(slugify("Amy's Beauty & Brows!"), "amy-s-beauty-and-brows");
  assert.equal(slugError("dashboard") !== null, true);
  assert.equal(slugError("ab"), slugError("ab")); // too short
  assert.notEqual(slugError("ab"), null);
  assert.equal(slugError("amybeauty"), null);
});

const business = (over: Partial<PublicBusiness> = {}): PublicBusiness => ({
  id: "b1", name: "Amy", slug: "amy", category: "Nail technician", location: "", description: "", logo_url: null, cover_image_url: null,
  theme: "blush", general_booking_url: null, contact_email: null, contact_phone: null, whatsapp_number: null, address: null,
  instagram_handle: null, tiktok_handle: null, website_url: null, published: true, is_demo: false, ...over,
});
const service = (over: Partial<Service> = {}): Service => ({
  id: "s1", business_id: "b1", name: "Gel manicure", description: "", price_pence: 3200, price_from: false, currency: "GBP",
  duration_minutes: 45, image_url: null, booking_url: null, display_order: 0, active: true, ...over,
});

test("service CTA: own link wins", () => {
  const cta = serviceCta(service({ booking_url: "https://booksy.com/x" }), business({ general_booking_url: "https://www.fresha.com/a" }));
  assert.equal(cta?.kind, "booking");
  assert.equal(cta?.kind === "booking" && cta.source, "service");
  assert.equal(cta?.kind === "booking" && cta.href, "https://booksy.com/x");
});

test("service CTA: falls back to general link", () => {
  const cta = serviceCta(service(), business({ general_booking_url: "https://www.fresha.com/a" }));
  assert.equal(cta?.kind === "booking" && cta.source, "general");
});

test("service CTA: falls back to WhatsApp with a prefilled message, then nothing", () => {
  const cta = serviceCta(service(), business({ whatsapp_number: "447700900123" }));
  assert.equal(cta?.kind, "contact");
  assert.match(cta!.href, /^https:\/\/wa\.me\/447700900123\?text=.*Gel%20manicure/);
  assert.equal(serviceCta(service(), business()), null);
  assert.equal(mainCta(business()), null);
});

test("service CTA: a tampered stored URL is never rendered", () => {
  const cta = serviceCta(service({ booking_url: "javascript:alert(1)" }), business({ contact_email: "a@b.co" }));
  assert.equal(cta?.kind, "contact");
});
