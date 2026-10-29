import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { demoModeEnabled } from "@/lib/db";
import { getPublicBusinessBySlug } from "@/lib/repo";
import { DEMO_SLUG } from "@/lib/seed";
import { demoLoginAction } from "./auth-actions";
import { SubmitButton } from "@/components/ui/form";
import { ArrowUpRight, Chart, LinkIcon, Sparkle } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const demo = demoModeEnabled() ? getPublicBusinessBySlug(DEMO_SLUG) ?? getPublicBusinessBySlug(`${DEMO_SLUG}-demo`) : null;
  const demoLive = demo?.is_demo && demo.published;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="font-display text-2xl italic">BeautyLink</span>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <Link href="/dashboard" className="btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Log in</Link>
              <Link href="/signup" className="btn-primary">Create your page</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <p className="eyebrow">For UK lash, brow, nail, hair & skin pros</p>
            <h1 className="mt-4 font-display text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              The link in bio that <em className="italic">fills your diary.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/75">
              A beautiful page for your services, prices, photos and reviews — where every treatment has a booking button that goes straight to
              Fresha, Booksy, Treatwell, Square or whatever you already use.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {demoLive && (
                <Link href={`/${demo.slug}`} className="btn-primary px-6 py-3 text-[15px]">
                  See an example page <ArrowUpRight width={16} height={16} />
                </Link>
              )}
              {demoModeEnabled() && !user && (
                <form action={demoLoginAction}>
                  <SubmitButton className="btn-secondary px-6 py-3 text-[15px]" pendingText="Opening…">Try the dashboard</SubmitButton>
                </form>
              )}
              {!demoModeEnabled() && <Link href="/signup" className="btn-primary px-6 py-3 text-[15px]">Create your page</Link>}
            </div>
            <p className="mt-4 text-sm text-muted">Set up in under 10 minutes. No new booking system to learn.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[320px]">
            <div className="absolute -inset-10 -z-10 rounded-full bg-accent/40 blur-3xl" aria-hidden />
            <div className="overflow-hidden rounded-[2.6rem] border-[10px] border-ink bg-page shadow-lift">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/demo/amy-cover.svg" alt="" className="aspect-[16/9] w-full object-cover" />
              <div className="-mt-8 flex flex-col items-center px-5 pb-6 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/demo/amy-logo.svg" alt="" className="h-16 w-16 rounded-full border-4 border-page" />
                <p className="mt-2 font-display text-2xl">Amy Beauty Studio</p>
                <p className="text-[11px] text-muted">Lash & brow artist · Clapham</p>
                <div className="mt-3 w-full rounded-full bg-cta py-2.5 text-xs text-cta-ink">Book an appointment</div>
                {[["Classic lash extensions", "£45 · 1 hr", "/demo/service-classic-lashes.svg"], ["Gel manicure", "£32 · 45 min", "/demo/service-gel-manicure.svg"]].map(([n, p, img]) => (
                  <div key={n} className="mt-3 w-full rounded-2xl border border-line bg-surface p-2.5 text-left">
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="h-11 w-11 rounded-xl" />
                      <div><p className="font-display text-base leading-tight">{n}</p><p className="text-[11px] text-muted">{p}</p></div>
                    </div>
                    <div className="mt-2 rounded-full border border-ink/70 py-1.5 text-center text-[11px]">Book this treatment ↗</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-3">
            {[
              { Icon: Sparkle, title: "Looks like a boutique, not a list of links", body: "Service menu with photos, prices and durations, a portfolio, reviews and your policies — in a premium theme." },
              { Icon: LinkIcon, title: "Bookings stay in your booking system", body: "We don't take bookings or payments. Each button sends clients to your existing Fresha, Booksy, Treatwell or Square page." },
              { Icon: Chart, title: "See what turns into bookings", body: "Track page views, booking clicks per treatment and social taps — without collecting your clients' personal data." },
            ].map(({ Icon, title, body }) => (
              <div key={title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft"><Icon /></span>
                <h2 className="mt-4 font-display text-2xl leading-tight">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-xs text-muted">
        BeautyLink prototype · Demo content is fictional · BeautyLink is not affiliated with any booking provider.
      </footer>
    </div>
  );
}
