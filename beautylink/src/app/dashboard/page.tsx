import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";
import { serviceCta } from "@/lib/booking";
import { formatPercent } from "@/lib/format";
import { getGallery, getServices } from "@/lib/repo";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PublishToggle } from "@/components/dashboard/PublishToggle";
import { Check } from "@/components/icons";

export default async function Overview({ searchParams }: { searchParams: Promise<{ welcome?: string; reset?: string }> }) {
  const { business: b } = await requireBusiness();
  const sp = await searchParams;
  const services = getServices(b.id);
  const active = services.filter((s) => s.active);
  const gallery = getGallery(b.id);
  const stats = getAnalytics(b.id, 7, true);

  const steps = [
    { done: Boolean(b.description && b.location), label: "Describe your business and location", href: "/dashboard/profile" },
    { done: Boolean(b.logo_url || b.cover_image_url), label: "Add a logo or cover image", href: "/dashboard/appearance" },
    { done: Boolean(b.general_booking_url) || (active.length > 0 && active.every((s) => s.booking_url)), label: "Add your booking link (Fresha, Booksy, Treatwell…)", href: "/dashboard/links" },
    { done: active.length >= 3, label: "Add at least three services with prices", href: "/dashboard/services" },
    { done: active.length > 0 && active.every((s) => serviceCta(s, b)?.kind === "booking"), label: "Give every service a working booking button", href: "/dashboard/services" },
    { done: Boolean(b.instagram_handle || b.tiktok_handle || b.whatsapp_number || b.contact_email || b.contact_phone), label: "Add Instagram, TikTok or contact details", href: "/dashboard/links" },
    { done: gallery.length >= 3, label: "Show off your work with three gallery images", href: "/dashboard/gallery" },
    { done: b.published, label: "Publish your page and add the link to your bio", href: null },
  ];
  const completed = steps.filter((s) => s.done).length;

  return (
    <>
      {sp.welcome && <Banner>Your page has been created. Work through the checklist below — it takes about 10 minutes.</Banner>}
      {sp.reset && <Banner>Demo data has been reset.</Banner>}
      <PageHeader title={`Hello, ${b.name.split(" ")[0]}`} description="Your link-in-bio page turns Instagram and TikTok visitors into bookings on your existing booking system." />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="card p-5 sm:p-6" aria-labelledby="checklist-title">
          <div className="flex items-center justify-between gap-4">
            <h2 id="checklist-title" className="font-medium">Set-up checklist</h2>
            <span className="text-sm text-muted">{completed} of {steps.length} done</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent-soft" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completed} aria-label="Set-up progress">
            <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
          </div>
          <ul className="mt-5 divide-y divide-line">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 py-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${s.done ? "border-ink bg-ink text-page" : "border-line"}`}>
                  {s.done && <Check width={14} height={14} />}
                </span>
                <span className={`flex-1 text-sm ${s.done ? "text-muted line-through decoration-line" : ""}`}>{s.label}</span>
                {!s.done && s.href && <Link href={s.href} className="btn-secondary px-3 py-1.5 text-xs">Do this</Link>}
                {!s.done && !s.href && <PublishToggle published={b.published} />}
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-5">
          <section className="card p-5" aria-labelledby="week-title">
            <div className="flex items-center justify-between">
              <h2 id="week-title" className="font-medium">Last 7 days</h2>
              <Link href="/dashboard/analytics" className="text-xs text-muted underline underline-offset-2 hover:text-ink">Full analytics</Link>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Stat label="Page views" value={stats.pageViews.toLocaleString("en-GB")} />
              <Stat label="Booking clicks" value={stats.bookingClicks.toLocaleString("en-GB")} />
              <Stat label="Click-through" value={formatPercent(stats.bookingClicks, stats.pageViews)} />
            </dl>
            <p className="mt-4 text-xs text-muted">
              Booking clicks are visitors sent to your booking page — not confirmed appointments.
              {stats.sampleEventCount > 0 && " Includes sample demo data."}
            </p>
          </section>

          <section className="card p-5">
            <h2 className="font-medium">Quick actions</h2>
            <div className="mt-3 grid gap-2">
              <Link href="/dashboard/services/new" className="btn-primary">Add a service</Link>
              <Link href="/dashboard/links" className="btn-secondary">Edit booking link</Link>
              <a href={`/${b.slug}?preview=1`} target="_blank" rel="noopener" className="btn-secondary">Preview your page</a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-accent-soft/60 px-2 py-3">
      <dd className="font-display text-2xl font-medium">{value}</dd>
      <dt className="mt-0.5 text-[11px] text-muted">{label}</dt>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <p role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{children}</p>;
}
