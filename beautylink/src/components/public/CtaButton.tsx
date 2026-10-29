import type { Cta } from "@/lib/booking";
import { TrackedLink } from "./tracking";
import { ArrowUpRight, Message, Phone, Mail, Instagram, Whatsapp } from "../icons";

const contactIcon = { whatsapp: Whatsapp, phone: Phone, email: Mail, instagram: Instagram } as const;

/**
 * Renders a booking or contact CTA as a plain external link.
 * Booking links say where they go ("Opens Fresha"), so visitors know the
 * booking itself happens on the owner's booking platform.
 */
export function CtaButton({
  cta, bookingLabel, serviceId, variant = "primary", className = "",
}: {
  cta: Cta;
  bookingLabel: string;
  serviceId?: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const style = variant === "primary"
    ? "bg-cta text-cta-ink hover:opacity-90"
    : "border border-ink/80 text-ink hover:bg-ink hover:text-page";

  if (cta.kind === "booking") {
    const sub = cta.isDemoLink ? "Demo link · opens an example page" : cta.provider ? `Opens ${cta.provider}` : null;
    return (
      <TrackedLink
        href={cta.href}
        event="booking_click"
        serviceId={serviceId ?? null}
        trackTarget={cta.source}
        className={`group flex w-full flex-col items-center justify-center rounded-full px-5 py-3 text-center transition active:scale-[0.99] ${style} ${className}`}
      >
        <span className="flex items-center gap-1.5 text-[15px] font-medium tracking-wide">
          {bookingLabel}
          <ArrowUpRight width={16} height={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
        {sub && <span className="mt-0.5 text-[11px] opacity-70">{sub}</span>}
      </TrackedLink>
    );
  }

  const Icon = contactIcon[cta.channel] ?? Message;
  return (
    <TrackedLink
      href={cta.href}
      event="contact_click"
      serviceId={serviceId ?? null}
      trackTarget={cta.channel}
      className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium transition active:scale-[0.99] ${style} ${className}`}
    >
      <Icon width={18} height={18} />
      {cta.label}
    </TrackedLink>
  );
}
