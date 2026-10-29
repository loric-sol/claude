import "server-only";
import { randomUUID } from "node:crypto";
import { db, nowIso, transaction } from "./db";
import { isThemeId } from "./themes";
import type { Business, Faq, GalleryImage, PublicBusiness, Review, Service } from "./types";

type Row = Record<string, unknown>;

const PUBLIC_BUSINESS_COLUMNS = `id, name, slug, category, location, description, logo_url, cover_image_url, theme,
  general_booking_url, contact_email, contact_phone, whatsapp_number, address, instagram_handle,
  tiktok_handle, website_url, published, is_demo`;

function toPublicBusiness(r: Row): PublicBusiness {
  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    category: String(r.category),
    location: String(r.location ?? ""),
    description: String(r.description ?? ""),
    logo_url: (r.logo_url as string) ?? null,
    cover_image_url: (r.cover_image_url as string) ?? null,
    theme: isThemeId(String(r.theme)) ? (r.theme as PublicBusiness["theme"]) : "blush",
    general_booking_url: (r.general_booking_url as string) ?? null,
    contact_email: (r.contact_email as string) ?? null,
    contact_phone: (r.contact_phone as string) ?? null,
    whatsapp_number: (r.whatsapp_number as string) ?? null,
    address: (r.address as string) ?? null,
    instagram_handle: (r.instagram_handle as string) ?? null,
    tiktok_handle: (r.tiktok_handle as string) ?? null,
    website_url: (r.website_url as string) ?? null,
    published: Boolean(r.published),
    is_demo: Boolean(r.is_demo),
  };
}

function toBusiness(r: Row): Business {
  return {
    ...toPublicBusiness(r),
    owner_user_id: String(r.owner_user_id),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

function toService(r: Row): Service {
  return {
    id: String(r.id),
    business_id: String(r.business_id),
    name: String(r.name),
    description: String(r.description ?? ""),
    price_pence: Number(r.price_pence),
    price_from: Boolean(r.price_from),
    currency: String(r.currency),
    duration_minutes: Number(r.duration_minutes),
    image_url: (r.image_url as string) ?? null,
    booking_url: (r.booking_url as string) ?? null,
    display_order: Number(r.display_order),
    active: Boolean(r.active),
  };
}

const toGallery = (r: Row): GalleryImage => ({
  id: String(r.id),
  business_id: String(r.business_id),
  image_url: String(r.image_url),
  caption: String(r.caption ?? ""),
  display_order: Number(r.display_order),
});

const toReview = (r: Row): Review => ({
  id: String(r.id),
  business_id: String(r.business_id),
  author_name: String(r.author_name),
  rating: Number(r.rating),
  body: String(r.body),
  source: String(r.source ?? ""),
  is_sample: Boolean(r.is_sample),
  display_order: Number(r.display_order),
});

const toFaq = (r: Row): Faq => ({
  id: String(r.id),
  business_id: String(r.business_id),
  question: String(r.question),
  answer: String(r.answer),
  display_order: Number(r.display_order),
});

/* ----------------------------- Businesses ----------------------------- */

export function getPublicBusinessBySlug(slug: string): PublicBusiness | null {
  const r = db().prepare(`SELECT ${PUBLIC_BUSINESS_COLUMNS} FROM businesses WHERE slug = ?`).get(slug) as Row | undefined;
  return r ? toPublicBusiness(r) : null;
}

export function getBusinessesForOwner(userId: string): Business[] {
  return (db().prepare("SELECT * FROM businesses WHERE owner_user_id = ? ORDER BY created_at").all(userId) as Row[]).map(toBusiness);
}

export function getBusinessById(id: string): Business | null {
  const r = db().prepare("SELECT * FROM businesses WHERE id = ?").get(id) as Row | undefined;
  return r ? toBusiness(r) : null;
}

export function isSlugTaken(slug: string, exceptBusinessId?: string): boolean {
  const r = db().prepare("SELECT id FROM businesses WHERE slug = ?").get(slug) as Row | undefined;
  return Boolean(r && r.id !== exceptBusinessId);
}

export function createBusiness(input: {
  ownerUserId: string; name: string; slug: string; category: string; location: string; generalBookingUrl: string | null;
}): string {
  const id = randomUUID();
  db().prepare(
    `INSERT INTO businesses (id, owner_user_id, name, slug, category, location, general_booking_url, theme, published)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'blush', 0)`,
  ).run(id, input.ownerUserId, input.name, input.slug, input.category, input.location, input.generalBookingUrl);
  return id;
}

const UPDATABLE_BUSINESS_FIELDS = [
  "name", "slug", "category", "location", "description", "logo_url", "cover_image_url", "theme",
  "general_booking_url", "contact_email", "contact_phone", "whatsapp_number", "address",
  "instagram_handle", "tiktok_handle", "website_url", "published",
] as const;
type BusinessPatch = Partial<Record<(typeof UPDATABLE_BUSINESS_FIELDS)[number], string | number | null>>;

export function updateBusiness(id: string, patch: BusinessPatch) {
  const keys = Object.keys(patch).filter((k) => (UPDATABLE_BUSINESS_FIELDS as readonly string[]).includes(k));
  if (!keys.length) return;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => patch[k as keyof BusinessPatch] ?? null);
  db().prepare(`UPDATE businesses SET ${sets}, updated_at = ? WHERE id = ?`).run(...values, nowIso(), id);
}

/* ------------------------------ Services ------------------------------ */

export function getServices(businessId: string, opts: { activeOnly?: boolean } = {}): Service[] {
  const sql = `SELECT * FROM services WHERE business_id = ? ${opts.activeOnly ? "AND active = 1" : ""} ORDER BY display_order, created_at`;
  return (db().prepare(sql).all(businessId) as Row[]).map(toService);
}

export function getService(businessId: string, serviceId: string): Service | null {
  const r = db().prepare("SELECT * FROM services WHERE id = ? AND business_id = ?").get(serviceId, businessId) as Row | undefined;
  return r ? toService(r) : null;
}

export interface ServiceInput {
  name: string;
  description: string;
  price_pence: number;
  price_from: boolean;
  duration_minutes: number;
  image_url: string | null;
  booking_url: string | null;
  active: boolean;
}

export function createService(businessId: string, s: ServiceInput): string {
  const id = randomUUID();
  const max = db().prepare("SELECT COALESCE(MAX(display_order), -1) AS m FROM services WHERE business_id = ?").get(businessId) as Row;
  db().prepare(
    `INSERT INTO services (id, business_id, name, description, price_pence, price_from, currency, duration_minutes, image_url, booking_url, display_order, active)
     VALUES (?, ?, ?, ?, ?, ?, 'GBP', ?, ?, ?, ?, ?)`,
  ).run(id, businessId, s.name, s.description, s.price_pence, s.price_from ? 1 : 0, s.duration_minutes, s.image_url, s.booking_url, Number(max.m) + 1, s.active ? 1 : 0);
  touchBusiness(businessId);
  return id;
}

export function updateService(businessId: string, serviceId: string, s: ServiceInput) {
  db().prepare(
    `UPDATE services SET name = ?, description = ?, price_pence = ?, price_from = ?, duration_minutes = ?, image_url = ?,
       booking_url = ?, active = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
  ).run(s.name, s.description, s.price_pence, s.price_from ? 1 : 0, s.duration_minutes, s.image_url, s.booking_url, s.active ? 1 : 0, nowIso(), serviceId, businessId);
  touchBusiness(businessId);
}

export function setServiceActive(businessId: string, serviceId: string, active: boolean) {
  db().prepare("UPDATE services SET active = ?, updated_at = ? WHERE id = ? AND business_id = ?").run(active ? 1 : 0, nowIso(), serviceId, businessId);
  touchBusiness(businessId);
}

export function deleteService(businessId: string, serviceId: string) {
  db().prepare("DELETE FROM services WHERE id = ? AND business_id = ?").run(serviceId, businessId);
  touchBusiness(businessId);
}

/** Moves an item one position up or down within its business, then renumbers. */
function move(table: "services" | "gallery_images" | "reviews" | "faqs", businessId: string, id: string, direction: "up" | "down") {
  transaction(() => {
    const order = table === "services" || table === "gallery_images" ? "display_order, created_at" : "display_order";
    const ids = (db().prepare(`SELECT id FROM ${table} WHERE business_id = ? ORDER BY ${order}`).all(businessId) as Row[]).map((r) => String(r.id));
    const i = ids.indexOf(id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const stmt = db().prepare(`UPDATE ${table} SET display_order = ? WHERE id = ? AND business_id = ?`);
    ids.forEach((rowId, idx) => stmt.run(idx, rowId, businessId));
  });
  touchBusiness(businessId);
}

export const moveService = (b: string, id: string, d: "up" | "down") => move("services", b, id, d);
export const moveGalleryImage = (b: string, id: string, d: "up" | "down") => move("gallery_images", b, id, d);
export const moveReview = (b: string, id: string, d: "up" | "down") => move("reviews", b, id, d);
export const moveFaq = (b: string, id: string, d: "up" | "down") => move("faqs", b, id, d);

function touchBusiness(businessId: string) {
  db().prepare("UPDATE businesses SET updated_at = ? WHERE id = ?").run(nowIso(), businessId);
}

/* ------------------------------- Gallery ------------------------------ */

export function getGallery(businessId: string): GalleryImage[] {
  return (db().prepare("SELECT * FROM gallery_images WHERE business_id = ? ORDER BY display_order, created_at").all(businessId) as Row[]).map(toGallery);
}

export function addGalleryImage(businessId: string, imageUrl: string, caption: string) {
  const max = db().prepare("SELECT COALESCE(MAX(display_order), -1) AS m FROM gallery_images WHERE business_id = ?").get(businessId) as Row;
  db().prepare("INSERT INTO gallery_images (id, business_id, image_url, caption, display_order) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), businessId, imageUrl, caption, Number(max.m) + 1);
  touchBusiness(businessId);
}

export function updateGalleryCaption(businessId: string, id: string, caption: string) {
  db().prepare("UPDATE gallery_images SET caption = ? WHERE id = ? AND business_id = ?").run(caption, id, businessId);
}

export function deleteGalleryImage(businessId: string, id: string) {
  db().prepare("DELETE FROM gallery_images WHERE id = ? AND business_id = ?").run(id, businessId);
  touchBusiness(businessId);
}

/* --------------------------- Reviews & FAQs --------------------------- */

export function getReviews(businessId: string): Review[] {
  return (db().prepare("SELECT * FROM reviews WHERE business_id = ? ORDER BY display_order, created_at").all(businessId) as Row[]).map(toReview);
}

export function addReview(businessId: string, r: { author_name: string; rating: number; body: string; source: string }) {
  const max = db().prepare("SELECT COALESCE(MAX(display_order), -1) AS m FROM reviews WHERE business_id = ?").get(businessId) as Row;
  db().prepare("INSERT INTO reviews (id, business_id, author_name, rating, body, source, is_sample, display_order) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
    .run(randomUUID(), businessId, r.author_name, r.rating, r.body, r.source, Number(max.m) + 1);
  touchBusiness(businessId);
}

export function deleteReview(businessId: string, id: string) {
  db().prepare("DELETE FROM reviews WHERE id = ? AND business_id = ?").run(id, businessId);
  touchBusiness(businessId);
}

export function getFaqs(businessId: string): Faq[] {
  return (db().prepare("SELECT * FROM faqs WHERE business_id = ? ORDER BY display_order").all(businessId) as Row[]).map(toFaq);
}

export function addFaq(businessId: string, question: string, answer: string) {
  const max = db().prepare("SELECT COALESCE(MAX(display_order), -1) AS m FROM faqs WHERE business_id = ?").get(businessId) as Row;
  db().prepare("INSERT INTO faqs (id, business_id, question, answer, display_order) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), businessId, question, answer, Number(max.m) + 1);
  touchBusiness(businessId);
}

export function updateFaq(businessId: string, id: string, question: string, answer: string) {
  db().prepare("UPDATE faqs SET question = ?, answer = ? WHERE id = ? AND business_id = ?").run(question, answer, id, businessId);
  touchBusiness(businessId);
}

export function deleteFaq(businessId: string, id: string) {
  db().prepare("DELETE FROM faqs WHERE id = ? AND business_id = ?").run(id, businessId);
  touchBusiness(businessId);
}
