"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBusiness, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORIES, slugError, slugify } from "@/lib/categories";
import { parsePriceToPence } from "@/lib/format";
import { isAllowedImageUrl } from "@/lib/image-library";
import { str, type FormState } from "@/lib/form";
import * as repo from "@/lib/repo";
import { clearSampleEvents } from "@/lib/analytics";
import { resetDemo } from "@/lib/seed";
import { isThemeId } from "@/lib/themes";
import { isFile, saveUpload } from "@/lib/uploads";
import { normaliseEmail, normaliseInstagram, normalisePhone, normaliseTiktok, normaliseWebUrl } from "@/lib/urls";

const done = (message: string): FormState => {
  revalidatePath("/", "layout");
  return { ok: true, message, stamp: Date.now() };
};
const fail = (errors: Record<string, string>, message = "Please fix the highlighted fields."): FormState => ({ ok: false, errors, message, stamp: Date.now() });

/**
 * Image fields post either a new file (`<name>_file`) or the chosen/existing
 * URL (`<name>_url`, empty to remove). Only bundled or uploaded images are accepted.
 */
async function imageField(fd: FormData, name: string): Promise<{ ok: true; url: string | null } | { ok: false; error: string }> {
  const file = fd.get(`${name}_file`);
  if (isFile(file)) {
    const r = await saveUpload(file);
    return r.ok ? { ok: true, url: r.url } : r;
  }
  const url = str(fd, `${name}_url`);
  if (!url) return { ok: true, url: null };
  if (!isAllowedImageUrl(url)) return { ok: false, error: "Please choose an image from the library or upload one." };
  return { ok: true, url };
}

const text = (max: number, label: string, required = false) =>
  (required ? z.string().min(1, `${label} is required.`) : z.string()).max(max, `${label} must be ${max} characters or fewer.`);

function zodErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/* ---------------------------- Onboarding ---------------------------- */

export async function createBusinessAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(fd, "name");
  const slug = slugify(str(fd, "slug") || name);
  const category = str(fd, "category");
  const location = str(fd, "location");
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Business name is required.";
  else if (name.length > 80) errors.name = "Keep the name under 80 characters.";
  const se = slugError(slug);
  if (se) errors.slug = se;
  else if (repo.isSlugTaken(slug)) errors.slug = "That page address is already taken.";
  if (!(CATEGORIES as readonly string[]).includes(category)) errors.category = "Choose a category.";
  if (location.length > 80) errors.location = "Keep the location under 80 characters.";
  const booking = normaliseWebUrl(str(fd, "general_booking_url"), "Booking link");
  if (!booking.ok) errors.general_booking_url = booking.error;
  if (Object.keys(errors).length) return fail(errors);
  if (repo.getBusinessesForOwner(user.id).length) redirect("/dashboard");
  repo.createBusiness({ ownerUserId: user.id, name, slug, category, location, generalBookingUrl: booking.ok ? booking.url : null });
  revalidatePath("/", "layout");
  redirect("/dashboard?welcome=1");
}

/* ------------------------------ Profile ----------------------------- */

const Profile = z.object({
  name: text(80, "Business name", true),
  category: z.enum(CATEGORIES, { message: "Choose a category." }),
  location: text(80, "Location"),
  description: text(400, "Description"),
});

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const { user, business } = await requireBusiness();
  const parsed = Profile.safeParse({ name: str(fd, "name"), category: str(fd, "category"), location: str(fd, "location"), description: str(fd, "description") });
  const errors = parsed.success ? {} : zodErrors(parsed.error);
  let slug = business.slug;
  if (!user.is_demo) {
    slug = str(fd, "slug").toLowerCase();
    const se = slugError(slug);
    if (se) errors.slug = se;
    else if (repo.isSlugTaken(slug, business.id)) errors.slug = "That page address is already taken.";
  }
  if (!parsed.success || Object.keys(errors).length) return fail(errors);
  repo.updateBusiness(business.id, { ...parsed.data, slug });
  return done("Profile saved.");
}

/* ----------------------------- Appearance --------------------------- */

export async function updateAppearanceAction(_: FormState, fd: FormData): Promise<FormState> {
  const { business } = await requireBusiness();
  const theme = str(fd, "theme");
  const errors: Record<string, string> = {};
  if (!isThemeId(theme)) errors.theme = "Choose a theme.";
  const logo = await imageField(fd, "logo");
  if (!logo.ok) errors.logo = logo.error;
  const cover = await imageField(fd, "cover");
  if (!cover.ok) errors.cover = cover.error;
  if (Object.keys(errors).length) return fail(errors);
  repo.updateBusiness(business.id, { theme, logo_url: logo.ok ? logo.url : null, cover_image_url: cover.ok ? cover.url : null });
  return done("Appearance saved.");
}

/* ------------------------- Booking & contact links ------------------ */

export async function updateLinksAction(_: FormState, fd: FormData): Promise<FormState> {
  const { business } = await requireBusiness();
  const errors: Record<string, string> = {};
  const booking = normaliseWebUrl(str(fd, "general_booking_url"), "Booking link");
  const website = normaliseWebUrl(str(fd, "website_url"), "Website");
  const ig = normaliseInstagram(str(fd, "instagram_handle"));
  const tt = normaliseTiktok(str(fd, "tiktok_handle"));
  const wa = normalisePhone(str(fd, "whatsapp_number"), "WhatsApp number");
  const phone = normalisePhone(str(fd, "contact_phone"));
  const email = normaliseEmail(str(fd, "contact_email"));
  const address = str(fd, "address");
  if (!booking.ok) errors.general_booking_url = booking.error;
  if (!website.ok) errors.website_url = website.error;
  if (!ig.ok) errors.instagram_handle = ig.error;
  if (!tt.ok) errors.tiktok_handle = tt.error;
  if (!wa.ok) errors.whatsapp_number = wa.error;
  if (!phone.ok) errors.contact_phone = phone.error;
  if (!email.ok) errors.contact_email = email.error;
  if (address.length > 160) errors.address = "Keep the address under 160 characters.";
  if (Object.keys(errors).length || !booking.ok || !website.ok || !ig.ok || !tt.ok || !wa.ok || !phone.ok || !email.ok) return fail(errors);
  repo.updateBusiness(business.id, {
    general_booking_url: booking.url,
    website_url: website.url,
    instagram_handle: ig.value,
    tiktok_handle: tt.value,
    whatsapp_number: wa.value,
    contact_phone: phone.value,
    contact_email: email.value,
    address: address || null,
  });
  return done("Links saved.");
}

/* ------------------------------ Services ---------------------------- */

export async function saveServiceAction(_: FormState, fd: FormData): Promise<FormState> {
  const { business } = await requireBusiness();
  const id = str(fd, "id");
  const existing = id ? repo.getService(business.id, id) : null;
  if (id && !existing) return fail({}, "This service no longer exists.");

  const errors: Record<string, string> = {};
  const name = str(fd, "name");
  const description = str(fd, "description");
  if (!name) errors.name = "Service name is required.";
  else if (name.length > 80) errors.name = "Keep the name under 80 characters.";
  if (description.length > 500) errors.description = "Keep the description under 500 characters.";
  const price = parsePriceToPence(str(fd, "price"));
  if (price === null) errors.price = "Enter a price in pounds, e.g. 45 or 32.50.";
  else if (price > 10_000_00) errors.price = "Price looks too high — check the amount.";
  const duration = Number(str(fd, "duration_minutes"));
  if (!Number.isInteger(duration) || duration < 5 || duration > 600) errors.duration_minutes = "Duration must be between 5 and 600 minutes.";
  const booking = normaliseWebUrl(str(fd, "booking_url"), "Booking link");
  if (!booking.ok) errors.booking_url = booking.error;
  const image = await imageField(fd, "image");
  if (!image.ok) errors.image = image.error;
  if (Object.keys(errors).length || price === null || !booking.ok || !image.ok) return fail(errors);

  const input: repo.ServiceInput = {
    name,
    description,
    price_pence: price,
    price_from: fd.get("price_from") === "on",
    duration_minutes: duration,
    image_url: image.url,
    booking_url: booking.url,
    active: fd.get("active") === "on",
  };
  if (existing) repo.updateService(business.id, existing.id, input);
  else repo.createService(business.id, input);
  revalidatePath("/", "layout");
  redirect(`/dashboard/services?saved=${encodeURIComponent(name)}`);
}

export async function toggleServiceAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.setServiceActive(business.id, str(fd, "id"), str(fd, "active") === "1");
  revalidatePath("/", "layout");
}

export async function moveServiceAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.moveService(business.id, str(fd, "id"), str(fd, "direction") === "up" ? "up" : "down");
  revalidatePath("/", "layout");
}

export async function deleteServiceAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.deleteService(business.id, str(fd, "id"));
  revalidatePath("/", "layout");
}

/* ------------------------------- Gallery ---------------------------- */

export async function addGalleryAction(_: FormState, fd: FormData): Promise<FormState> {
  const { business } = await requireBusiness();
  const caption = str(fd, "caption");
  if (caption.length > 120) return fail({ caption: "Keep captions under 120 characters." });
  if (repo.getGallery(business.id).length >= 24) return fail({ image: "You can show up to 24 gallery images." });
  const image = await imageField(fd, "image");
  if (!image.ok) return fail({ image: image.error });
  if (!image.url) return fail({ image: "Choose or upload an image first." });
  repo.addGalleryImage(business.id, image.url, caption);
  return done("Image added to your gallery.");
}

export async function updateCaptionAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.updateGalleryCaption(business.id, str(fd, "id"), str(fd, "caption").slice(0, 120));
  revalidatePath("/", "layout");
}

export async function moveGalleryAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.moveGalleryImage(business.id, str(fd, "id"), str(fd, "direction") === "up" ? "up" : "down");
  revalidatePath("/", "layout");
}

export async function deleteGalleryAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.deleteGalleryImage(business.id, str(fd, "id"));
  revalidatePath("/", "layout");
}

/* --------------------------- Reviews & FAQs -------------------------- */

const ReviewInput = z.object({
  author_name: text(60, "Client name", true),
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  body: text(500, "Review", true),
  source: text(60, "Source"),
});

export async function addReviewAction(_: FormState, fd: FormData): Promise<FormState> {
  const { business } = await requireBusiness();
  const parsed = ReviewInput.safeParse({ author_name: str(fd, "author_name"), rating: str(fd, "rating"), body: str(fd, "body"), source: str(fd, "source") });
  if (!parsed.success) return fail(zodErrors(parsed.error));
  repo.addReview(business.id, parsed.data);
  return done("Review added.");
}

export async function deleteReviewAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.deleteReview(business.id, str(fd, "id"));
  revalidatePath("/", "layout");
}

export async function moveReviewAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.moveReview(business.id, str(fd, "id"), str(fd, "direction") === "up" ? "up" : "down");
  revalidatePath("/", "layout");
}

const FaqInput = z.object({ question: text(160, "Question", true), answer: text(800, "Answer", true) });

export async function saveFaqAction(_: FormState, fd: FormData): Promise<FormState> {
  const { business } = await requireBusiness();
  const parsed = FaqInput.safeParse({ question: str(fd, "question"), answer: str(fd, "answer") });
  if (!parsed.success) return fail(zodErrors(parsed.error));
  const id = str(fd, "id");
  if (id) repo.updateFaq(business.id, id, parsed.data.question, parsed.data.answer);
  else repo.addFaq(business.id, parsed.data.question, parsed.data.answer);
  return done(id ? "Saved." : "Added.");
}

export async function deleteFaqAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.deleteFaq(business.id, str(fd, "id"));
  revalidatePath("/", "layout");
}

export async function moveFaqAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.moveFaq(business.id, str(fd, "id"), str(fd, "direction") === "up" ? "up" : "down");
  revalidatePath("/", "layout");
}

/* ------------------------- Publishing & demo ------------------------ */

export async function setPublishedAction(fd: FormData) {
  const { business } = await requireBusiness();
  repo.updateBusiness(business.id, { published: str(fd, "published") === "1" ? 1 : 0 });
  revalidatePath("/", "layout");
}

export async function clearSampleAnalyticsAction() {
  const { business } = await requireBusiness();
  clearSampleEvents(business.id);
  revalidatePath("/", "layout");
}

export async function resetDemoAction() {
  const { user } = await requireBusiness();
  if (!user.is_demo) return; // Only the demo account can be reset.
  resetDemo(db());
  revalidatePath("/", "layout");
  redirect("/dashboard?reset=1");
}
