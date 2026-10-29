import { mainCta, serviceCta } from "@/lib/booking";
import { formatDuration, formatPrice } from "@/lib/format";
import { formatPhone, instagramUrl, mailtoHref, safeHref, telHref, tiktokUrl, whatsappHref, detectProvider, isExampleUrl } from "@/lib/urls";
import type { Faq, GalleryImage, PublicBusiness, Review, Service } from "@/lib/types";
import { CtaButton } from "./CtaButton";
import { StickyBar } from "./StickyBar";
import { TrackedLink, TrackingProvider } from "./tracking";
import { Clock, Globe, Instagram, Mail, MapPin, Phone, Star, Tiktok, Whatsapp, Info } from "../icons";

export interface BeautyPageData {
  business: PublicBusiness;
  services: Service[];
  gallery: GalleryImage[];
  reviews: Review[];
  faqs: Faq[];
}

export function BeautyPage({ data, tracking }: { data: BeautyPageData; tracking: boolean }) {
  const { business: b, services, gallery, reviews, faqs } = data;
  const cta = mainCta(b);
  const website = safeHref(b.website_url);
  const socials = [
    b.instagram_handle && { key: "instagram", label: "Instagram", href: instagramUrl(b.instagram_handle), Icon: Instagram },
    b.tiktok_handle && { key: "tiktok", label: "TikTok", href: tiktokUrl(b.tiktok_handle), Icon: Tiktok },
    b.whatsapp_number && { key: "whatsapp", label: "WhatsApp", href: whatsappHref(b.whatsapp_number), Icon: Whatsapp },
    website && { key: "website", label: "Website", href: website, Icon: Globe },
  ].filter(Boolean) as Array<{ key: string; label: string; href: string; Icon: typeof Instagram }>;
  const hasSampleReviews = reviews.some((r) => r.is_sample);
  const provider = b.general_booking_url && !isExampleUrl(b.general_booking_url) ? detectProvider(b.general_booking_url) : null;
  const sections = [
    services.length && { id: "services", label: "Services" },
    gallery.length && { id: "gallery", label: "Gallery" },
    reviews.length && { id: "reviews", label: "Reviews" },
    faqs.length && { id: "policies", label: "Policies" },
    { id: "contact", label: "Contact" },
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  return (
    <TrackingProvider businessId={b.id} enabled={tracking}>
      <div data-theme={b.theme} className="min-h-screen bg-page pb-24 text-ink sm:pb-10">
        {b.is_demo && (
          <div className="bg-ink px-4 py-2 text-center text-[12px] leading-snug text-page">
            Demo page for a fictional business. Booking buttons open example pages — no real bookings are made.
          </div>
        )}

        <div className="mx-auto max-w-2xl">
          {/* Hero */}
          <header className="relative">
            <div className="aspect-[16/8] w-full overflow-hidden bg-accent-soft sm:rounded-b-[2rem]">
              {b.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.cover_image_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="-mt-12 flex flex-col items-center px-5 text-center">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-page bg-accent shadow-lift">
                {b.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logo_url} alt={`${b.name} logo`} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-4xl italic">{b.name.charAt(0)}</span>
                )}
              </div>
              <h1 className="mt-4 font-display text-[2.6rem] font-medium leading-none tracking-tight sm:text-5xl">{b.name}</h1>
              <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted">
                <span>{b.category}</span>
                {b.location && (
                  <>
                    <span aria-hidden className="h-1 w-1 rounded-full bg-muted/50" />
                    <span className="inline-flex items-center gap-1"><MapPin width={14} height={14} />{b.location}</span>
                  </>
                )}
              </p>
              {b.description && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/80">{b.description}</p>}

              {socials.length > 0 && (
                <ul className="mt-5 flex items-center gap-2.5" aria-label="Social links">
                  {socials.map(({ key, label, href, Icon }) => (
                    <li key={key}>
                      <TrackedLink
                        href={href}
                        event={key === "whatsapp" ? "contact_click" : "social_click"}
                        trackTarget={key}
                        aria-label={label}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:border-ink/40 hover:bg-accent-soft"
                      >
                        <Icon />
                      </TrackedLink>
                    </li>
                  ))}
                </ul>
              )}

              <div id="main-cta" className="mt-6 w-full max-w-sm">
                {cta ? (
                  <CtaButton cta={cta} bookingLabel="Book an appointment" className="py-4 shadow-lift" />
                ) : (
                  <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">Online booking coming soon.</p>
                )}
              </div>
            </div>
          </header>

          {/* Section nav */}
          {sections.length > 2 && (
            <nav aria-label="Page sections" className="sticky top-0 z-20 mt-8 border-y border-line bg-page/85 backdrop-blur-md">
              <div className="overflow-x-auto"><ul className="mx-auto flex w-max gap-1 px-4 py-2 text-[13px]">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="block whitespace-nowrap rounded-full px-3.5 py-1.5 text-muted transition hover:bg-accent-soft hover:text-ink">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul></div>
            </nav>
          )}

          <main className="px-4 sm:px-6">
            {/* Services */}
            {services.length > 0 && (
              <section id="services" className="scroll-mt-16 pt-10" aria-labelledby="services-title">
                <SectionTitle id="services-title" eyebrow="Treatment menu" title="Services & prices" />
                <ul className="mt-6 space-y-4">
                  {services.map((s) => {
                    const sCta = serviceCta(s, b);
                    return (
                      <li key={s.id} className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
                        <div className="flex gap-4 p-4">
                          {s.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.image_url} alt="" loading="lazy" className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28" />
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-display text-[1.45rem] font-medium leading-tight">{s.name}</h3>
                            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                              <span className="font-semibold">{s.price_from && <span className="font-normal text-muted">from </span>}{formatPrice(s.price_pence, s.currency)}</span>
                              <span className="inline-flex items-center gap-1 text-muted"><Clock width={14} height={14} />{formatDuration(s.duration_minutes)}</span>
                            </p>
                            {s.description && <p className="mt-2 text-sm leading-relaxed text-ink/75">{s.description}</p>}
                          </div>
                        </div>
                        {sCta && (
                          <div className="border-t border-line px-4 py-3">
                            <CtaButton cta={sCta} bookingLabel="Book this treatment" serviceId={s.id} variant="secondary" className="py-2.5" />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Gallery */}
            {gallery.length > 0 && (
              <section id="gallery" className="scroll-mt-16 pt-14" aria-labelledby="gallery-title">
                <SectionTitle id="gallery-title" eyebrow="Portfolio" title="Recent work" />
                <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {gallery.map((g) => (
                    <li key={g.id}>
                      <figure>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.image_url} alt={g.caption || `${b.name} portfolio image`} loading="lazy" className="aspect-square w-full rounded-2xl object-cover" />
                        {g.caption && <figcaption className="mt-1.5 px-1 text-xs text-muted">{g.caption}</figcaption>}
                      </figure>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <section id="reviews" className="scroll-mt-16 pt-14" aria-labelledby="reviews-title">
                <SectionTitle id="reviews-title" eyebrow="Kind words" title="What clients say" />
                {hasSampleReviews && (
                  <p className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs text-muted">
                    <Info width={14} height={14} /> Sample reviews for demonstration
                  </p>
                )}
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
                      <div className="flex gap-0.5 text-star" role="img" aria-label={`${r.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((n) => <Star key={n} width={16} height={16} filled={n <= r.rating} />)}
                      </div>
                      <blockquote className="mt-3 font-display text-lg leading-snug">“{r.body}”</blockquote>
                      <p className="mt-3 text-xs text-muted">
                        {r.author_name}{r.source && <> · {r.source}</>}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Policies / FAQ */}
            {faqs.length > 0 && (
              <section id="policies" className="scroll-mt-16 pt-14" aria-labelledby="policies-title">
                <SectionTitle id="policies-title" eyebrow="Good to know" title="Policies & FAQs" />
                <div className="mt-6 divide-y divide-line rounded-3xl border border-line bg-surface px-5 shadow-soft">
                  {faqs.map((f) => (
                    <details key={f.id} className="group py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                        {f.question}
                        <span aria-hidden className="text-xl leading-none text-muted transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-ink/75">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Contact */}
            <section id="contact" className="scroll-mt-16 pt-14" aria-labelledby="contact-title">
              <SectionTitle id="contact-title" eyebrow="Find us" title="Contact" />
              <ul className="mt-6 space-y-2 text-[15px]">
                {b.address && <ContactRow Icon={MapPin} text={b.address} />}
                {b.whatsapp_number && (
                  <ContactRow Icon={Whatsapp} text={`WhatsApp ${formatPhone(b.whatsapp_number)}`} href={whatsappHref(b.whatsapp_number)} target="whatsapp" />
                )}
                {b.contact_phone && <ContactRow Icon={Phone} text={formatPhone(b.contact_phone)} href={telHref(b.contact_phone)} target="phone" />}
                {b.contact_email && <ContactRow Icon={Mail} text={b.contact_email} href={mailtoHref(b.contact_email)} target="email" />}
                {b.instagram_handle && <ContactRow Icon={Instagram} text={`@${b.instagram_handle}`} href={instagramUrl(b.instagram_handle)} target="instagram" social />}
              </ul>
              {cta && (
                <div className="mt-6">
                  <CtaButton cta={cta} bookingLabel="Book an appointment" />
                </div>
              )}
            </section>
          </main>

          <footer className="mt-16 px-6 text-center text-xs leading-relaxed text-muted">
            <p>
              {provider
                ? `Appointments are booked and paid for on ${provider}. `
                : "Appointments are booked directly with the business. "}
              BeautyLink only links to their booking page and never takes bookings or payments.
            </p>
            <p className="mt-2">
              This page counts visits and button clicks anonymously using a random ID stored on your device — no advertising
              cookies and no personal data. Do Not Track is respected.
            </p>
            <p className="mt-6">
              <a href="/" className="font-display text-base italic text-ink/70 hover:text-ink">Made with BeautyLink</a>
            </p>
          </footer>
        </div>

        {cta && (
          <StickyBar watchId="main-cta">
            <CtaButton cta={cta} bookingLabel="Book an appointment" />
          </StickyBar>
        )}
      </div>
    </TrackingProvider>
  );
}

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-1.5 font-display text-[2rem] font-medium leading-tight">{title}</h2>
    </div>
  );
}

function ContactRow({ Icon, text, href, target, social }: { Icon: typeof Phone; text: string; href?: string; target?: string; social?: boolean }) {
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft"><Icon width={17} height={17} /></span>
      <span className="min-w-0 break-words">{text}</span>
    </>
  );
  return (
    <li>
      {href ? (
        <TrackedLink href={href} event={social ? "social_click" : "contact_click"} trackTarget={target} className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-accent-soft/60">
          {inner}
        </TrackedLink>
      ) : (
        <div className="flex items-center gap-3 px-2 py-1.5">{inner}</div>
      )}
    </li>
  );
}
