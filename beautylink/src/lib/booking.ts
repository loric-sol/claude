import type { PublicBusiness, Service } from "./types";
import {
  safeHref, whatsappHref, telHref, mailtoHref, instagramUrl, detectProvider, isExampleUrl,
} from "./urls.ts";

/**
 * Decides what the call-to-action on the public page does.
 * BeautyLink never takes bookings itself: every CTA is an ordinary external
 * link to the owner's booking software, or a contact fallback.
 */
export type Cta =
  | { kind: "booking"; href: string; source: "service" | "general"; provider: string | null; isDemoLink: boolean }
  | { kind: "contact"; href: string; channel: ContactChannel; label: string };

export type ContactChannel = "whatsapp" | "phone" | "email" | "instagram";

export function bookingCta(url: string | null, source: "service" | "general"): Cta | null {
  const href = safeHref(url);
  if (!href) return null;
  return { kind: "booking", href, source, provider: detectProvider(href), isDemoLink: isExampleUrl(href) };
}

/** Best available way to contact the business when there is no booking link. */
export function contactFallback(b: PublicBusiness, about?: string): Cta | null {
  const message = about
    ? `Hi ${b.name}, I'd like to book ${about}. Is there availability?`
    : `Hi ${b.name}, I'd like to book an appointment.`;
  if (b.whatsapp_number) {
    return { kind: "contact", channel: "whatsapp", href: whatsappHref(b.whatsapp_number, message), label: "Enquire on WhatsApp" };
  }
  if (b.contact_phone) return { kind: "contact", channel: "phone", href: telHref(b.contact_phone), label: "Call to book" };
  if (b.contact_email) {
    return { kind: "contact", channel: "email", href: mailtoHref(b.contact_email, about ? `Booking enquiry: ${about}` : "Booking enquiry"), label: "Email to book" };
  }
  if (b.instagram_handle) {
    return { kind: "contact", channel: "instagram", href: instagramUrl(b.instagram_handle), label: "Message on Instagram" };
  }
  return null;
}

/** Main "Book an appointment" button. */
export function mainCta(b: PublicBusiness): Cta | null {
  return bookingCta(b.general_booking_url, "general") ?? contactFallback(b);
}

/** Per-service button: service link -> general link -> contact -> nothing. */
export function serviceCta(s: Service, b: PublicBusiness): Cta | null {
  return bookingCta(s.booking_url, "service") ?? bookingCta(b.general_booking_url, "general") ?? contactFallback(b, s.name);
}

/** Short description for the dashboard of what a service button will do. */
export function describeServiceCta(s: Service, b: PublicBusiness): { tone: "good" | "info" | "warn"; text: string } {
  const cta = serviceCta(s, b);
  if (!cta) return { tone: "warn", text: "No booking button — add a booking link or contact method" };
  if (cta.kind === "contact") return { tone: "warn", text: `No booking link · falls back to “${cta.label}”` };
  if (cta.source === "service") return { tone: "good", text: `Own booking link · ${cta.isDemoLink ? "demo example page" : cta.provider ?? "external site"}` };
  return { tone: "info", text: "Uses your general booking link" };
}
