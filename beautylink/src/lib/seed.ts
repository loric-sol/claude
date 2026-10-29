import { randomBytes, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

/**
 * Seeds the fictional "Amy Beauty Studio" demo business.
 * - Booking links use example.com (reserved for documentation) so they are
 *   clearly demo destinations, never live booking pages.
 * - The phone number is from Ofcom's range reserved for drama/fiction.
 * - Reviews and analytics are flagged as sample data.
 */

export const DEMO_SLUG = "amybeauty";
const DEMO_EMAIL = "demo@beautylink.local";
const BOOK = "https://example.com/demo-booking/amy-beauty-studio";

export function seedDemo(db: DatabaseSync) {
  db.exec("BEGIN");
  try {
    let userId = (db.prepare("SELECT id FROM users WHERE is_demo = 1").get() as { id: string } | undefined)?.id;
    if (!userId) {
      userId = randomUUID();
      // Unusable random password: the demo account is only reachable via the "Explore demo" button.
      db.prepare("INSERT INTO users (id, email, password_hash, is_demo) VALUES (?, ?, ?, 1)")
        .run(userId, DEMO_EMAIL, `disabled$${randomBytes(24).toString("hex")}`);
    }
    // If a real account has taken the demo slug, keep it and use a suffixed slug.
    const slugTaken = db.prepare("SELECT 1 FROM businesses WHERE slug = ?").get(DEMO_SLUG);
    const slug = slugTaken ? `${DEMO_SLUG}-demo` : DEMO_SLUG;

    const businessId = randomUUID();
    db.prepare(
      `INSERT INTO businesses (id, owner_user_id, name, slug, category, location, description, logo_url, cover_image_url, theme,
        general_booking_url, contact_email, contact_phone, whatsapp_number, address, instagram_handle, tiktok_handle, website_url, published, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
    ).run(
      businessId, userId, "Amy Beauty Studio", slug, "Lash & brow artist", "Clapham, London",
      "Soft, natural lash and brow work, glossy nails and results-led facials from a calm private studio in Clapham. Every treatment starts with a consultation so the result suits you.",
      "/demo/amy-logo.svg", "/demo/amy-cover.svg", "blush",
      BOOK, "hello@amybeauty.example", "447700900123", "447700900123",
      "Studio 4, 12 Example Lane, Clapham, London SW4", "amybeautystudio_demo", "amybeautystudio_demo", "https://example.com/amy-beauty-studio",
    );

    const services: Array<[string, string, number, boolean, number, string, string | null, boolean]> = [
      ["Classic lash extensions", "One extension applied to each natural lash for a soft, mascara-like finish. Includes consultation and aftercare.", 4500, false, 60, "/demo/service-classic-lashes.svg", `${BOOK}/classic-lash-extensions`, true],
      ["Brow shaping", "Wax and tweeze shaping mapped to your face, finished with a soothing balm.", 2500, false, 30, "/demo/service-brows.svg", `${BOOK}/brow-shaping`, true],
      ["Gel manicure", "Cuticle care, shaping and a long-wear gel colour of your choice. Lasts up to three weeks.", 3200, false, 45, "/demo/service-gel-manicure.svg", `${BOOK}/gel-manicure`, true],
      ["Signature facial", "A personalised facial with double cleanse, gentle exfoliation, extractions, massage and a mask chosen for your skin.", 6000, false, 50, "/demo/service-signature-facial.svg", `${BOOK}/signature-facial`, true],
      ["Lash lift & tint", "Lifts and darkens your natural lashes for 6–8 weeks. Patch test required 48 hours before.", 4000, false, 45, "/demo/service-lash-lift.svg", null, true],
      ["Russian volume lashes", "Handmade fans for a fuller, fluffier look. Price depends on desired density.", 6500, true, 90, "/demo/service-volume-lashes.svg", `${BOOK}/russian-volume`, true],
      ["Brow lamination", "Brushes brows up into a fuller, fluffy shape that lasts around six weeks. Includes tint.", 3800, false, 45, "/demo/service-brow-lamination.svg", `${BOOK}/brow-lamination`, true],
      ["Lash infill (2–3 weeks)", "For existing clients only. Hidden while Amy is fully booked for infills.", 3000, false, 45, "/demo/service-classic-lashes.svg", `${BOOK}/lash-infill`, false],
    ];
    const insService = db.prepare(
      `INSERT INTO services (id, business_id, name, description, price_pence, price_from, currency, duration_minutes, image_url, booking_url, display_order, active)
       VALUES (?, ?, ?, ?, ?, ?, 'GBP', ?, ?, ?, ?, ?)`,
    );
    const serviceIds: string[] = [];
    services.forEach(([name, desc, price, from, mins, img, url, active], i) => {
      const id = randomUUID();
      serviceIds.push(id);
      insService.run(id, businessId, name, desc, price, from ? 1 : 0, mins, img, url, i, active ? 1 : 0);
    });

    const gallery: Array<[string, string]> = [
      ["/demo/gallery-lash-detail.svg", "Russian volume, 10–12mm"],
      ["/demo/gallery-nude-set.svg", "Nude ombré gel set"],
      ["/demo/gallery-brow-result.svg", "Laminated brows after tint"],
      ["/demo/gallery-chrome-nails.svg", "Pearl chrome almond nails"],
      ["/demo/gallery-skincare-shelf.svg", "Products we use in the studio"],
      ["/demo/gallery-arches.svg", "The studio, Clapham"],
    ];
    const insGallery = db.prepare("INSERT INTO gallery_images (id, business_id, image_url, caption, display_order) VALUES (?, ?, ?, ?, ?)");
    gallery.forEach(([url, caption], i) => insGallery.run(randomUUID(), businessId, url, caption, i));

    const reviews: Array<[string, number, string]> = [
      ["Sophie R.", 5, "My classic set looks so natural — I've had three people ask if they're my real lashes. Amy is calm, gentle and so precise."],
      ["Priya K.", 5, "Best brow shape I've ever had. She actually listened to what I wanted and explained how to grow them out."],
      ["Hannah M.", 5, "The signature facial was so relaxing and my skin was glowing for days. Lovely, spotless studio."],
      ["Jess T.", 4, "Gel manicure lasted just over three weeks without chipping. Will definitely be back."],
    ];
    const insReview = db.prepare("INSERT INTO reviews (id, business_id, author_name, rating, body, source, is_sample, display_order) VALUES (?, ?, ?, ?, ?, 'Sample review', 1, ?)");
    reviews.forEach(([who, rating, body], i) => insReview.run(randomUUID(), businessId, who, rating, body, i));

    const faqs: Array<[string, string]> = [
      ["Do I need to pay a deposit?", "A £10 deposit is taken when you book through the booking page and comes off the price of your treatment."],
      ["What is your cancellation policy?", "Please give at least 24 hours' notice to cancel or move an appointment. Late cancellations and no-shows lose their deposit."],
      ["Do I need a patch test?", "Yes — for lash extensions, lash lifts and any tinting, a quick patch test is needed at least 48 hours before your first appointment."],
      ["What if I'm running late?", "Please message as soon as you can. If you arrive more than 15 minutes late, your treatment may need to be shortened or rebooked."],
      ["How should I prepare for lashes?", "Come with clean, makeup-free eyes and avoid caffeine beforehand so you can relax for the full appointment."],
    ];
    const insFaq = db.prepare("INSERT INTO faqs (id, business_id, question, answer, display_order) VALUES (?, ?, ?, ?, ?)");
    faqs.forEach(([q, a], i) => insFaq.run(randomUUID(), businessId, q, a, i));

    seedSampleAnalytics(db, businessId, serviceIds.slice(0, 7));
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** Deterministic pseudo-random generator so the demo charts look the same on every reset. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ~60 days of plausible traffic, all flagged is_sample = 1. */
function seedSampleAnalytics(db: DatabaseSync, businessId: string, serviceIds: string[]) {
  const rand = mulberry32(42);
  const ins = db.prepare(
    "INSERT INTO page_events (business_id, service_id, event_type, target, visitor_id, session_id, is_sample, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
  );
  const serviceWeights = [0.28, 0.16, 0.14, 0.12, 0.1, 0.12, 0.08];
  const pickService = () => {
    let r = rand();
    for (let i = 0; i < serviceWeights.length; i++) {
      r -= serviceWeights[i];
      if (r <= 0) return serviceIds[i];
    }
    return serviceIds[0];
  };
  const visitors = Array.from({ length: 900 }, () => randomUUID());
  const now = Date.now();
  for (let d = 59; d >= 0; d--) {
    const day = new Date(now - d * 864e5);
    const dow = day.getDay();
    const weekend = dow === 0 || dow === 6;
    const trend = 1 + (59 - d) / 70; // gentle growth
    const sessions = Math.round((18 + rand() * 14) * trend * (weekend ? 1.35 : 1));
    for (let s = 0; s < sessions; s++) {
      const visitor = visitors[Math.floor(Math.pow(rand(), 1.4) * visitors.length)];
      const sessionId = randomUUID();
      const base = new Date(day);
      base.setHours(8 + Math.floor(rand() * 14), Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
      if (base.getTime() > now) base.setTime(now - Math.floor(rand() * 3_600_000));
      const at = (offsetSec: number) => new Date(base.getTime() + offsetSec * 1000).toISOString();
      ins.run(businessId, null, "page_view", null, visitor, sessionId, at(0));
      const r = rand();
      if (r < 0.15) {
        ins.run(businessId, pickService(), "booking_click", "service", visitor, sessionId, at(30 + rand() * 90));
      } else if (r < 0.2) {
        ins.run(businessId, null, "booking_click", "general", visitor, sessionId, at(10 + rand() * 40));
      } else if (r < 0.27) {
        const t = rand();
        ins.run(businessId, null, "social_click", t < 0.6 ? "instagram" : t < 0.85 ? "tiktok" : "website", visitor, sessionId, at(20 + rand() * 60));
      } else if (r < 0.3) {
        ins.run(businessId, null, "contact_click", rand() < 0.7 ? "whatsapp" : "email", visitor, sessionId, at(20 + rand() * 60));
      }
    }
  }
}

/** Restores the demo business to its original state (used by the dashboard "Reset demo" button). */
export function resetDemo(db: DatabaseSync) {
  db.prepare("DELETE FROM businesses WHERE is_demo = 1").run();
  seedDemo(db);
}
