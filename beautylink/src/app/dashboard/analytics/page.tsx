import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";
import { formatPercent } from "@/lib/format";
import { clearSampleAnalyticsAction } from "../actions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { BarChart } from "@/components/dashboard/BarChart";
import { ActionButton } from "@/components/ui/form";
import { Info } from "@/components/icons";

const RANGES = [7, 30, 90] as const;
const LABELS: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", website: "Website", whatsapp: "WhatsApp", phone: "Phone", email: "Email", other: "Other",
};

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; sample?: string }> }) {
  const { business } = await requireBusiness();
  const sp = await searchParams;
  const range = RANGES.find((r) => String(r) === sp.range) ?? 30;
  const includeSample = sp.sample !== "0";
  const a = getAnalytics(business.id, range, includeSample);
  const href = (p: { range?: number; sample?: boolean }) =>
    `/dashboard/analytics?range=${p.range ?? range}${(p.sample ?? includeSample) ? "" : "&sample=0"}`;
  const maxService = Math.max(1, ...a.topServices.map((s) => s.clicks));
  const empty = a.pageViews === 0 && a.bookingClicks === 0 && a.socialClicks === 0 && a.contactClicks === 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="How visitors from your bio use your page."
        actions={
          <div className="flex rounded-full border border-line bg-surface p-1 text-xs" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <Link key={r} href={href({ range: r })} aria-current={r === range ? "true" : undefined}
                className={`rounded-full px-3 py-1.5 ${r === range ? "bg-ink text-page" : "text-muted hover:text-ink"}`}>
                {r} days
              </Link>
            ))}
          </div>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
        <Info className="mt-0.5 shrink-0" />
        <p>
          <strong className="font-medium">Booking clicks are not bookings.</strong> They count visitors who tapped a booking button and were sent to your booking site.
          BeautyLink can’t see whether they completed an appointment — check your booking system for confirmed bookings.
        </p>
      </div>

      {a.sampleEventCount > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span>{includeSample ? "Showing generated sample activity for the demo, plus any real visits." : "Sample activity hidden — showing real visits only."}</span>
          <span className="flex gap-2">
            <Link href={href({ sample: !includeSample })} className="btn-secondary px-3 py-1.5 text-xs">{includeSample ? "Hide sample data" : "Show sample data"}</Link>
            <form action={clearSampleAnalyticsAction}>
              <ActionButton className="btn-ghost px-3 py-1.5 text-xs" confirm="Permanently delete the generated sample analytics?">Delete sample data</ActionButton>
            </form>
          </span>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Page views" value={a.pageViews} prev={a.previous.pageViews} />
        <Kpi label="Unique visitors" value={a.uniqueVisitors} note="Approximate, per browser" />
        <Kpi label="Booking clicks" value={a.bookingClicks} prev={a.previous.bookingClicks} note={`${a.serviceBookingClicks} from services · ${a.generalBookingClicks} main button`} />
        <Kpi label="Booking click-through" text={formatPercent(a.bookingClicks, a.pageViews)} note="Booking clicks ÷ page views" />
        <Kpi label="Social & contact clicks" value={a.socialClicks + a.contactClicks} note={`${a.socialClicks} social · ${a.contactClicks} contact`} />
      </dl>

      {empty ? (
        <div className="card mt-6 px-6 py-14 text-center">
          <p className="font-display text-2xl">No visits yet in this period</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {business.published ? "Share your page link in your Instagram and TikTok bio — visits and clicks will appear here." : "Publish your page and add the link to your bio to start collecting stats."}
          </p>
        </div>
      ) : (
        <>
          <section className="card mt-6 p-5" aria-labelledby="trend-title">
            <h2 id="trend-title" className="font-medium">Performance over time</h2>
            <p className="mt-4 text-xs font-medium text-muted">Page views</p>
            <BarChart data={a.daily.map((d) => ({ date: d.date, value: d.views }))} color="#e3c3b9" label="Page views" />
            <p className="mt-4 text-xs font-medium text-muted">Booking clicks</p>
            <BarChart data={a.daily.map((d) => ({ date: d.date, value: d.bookingClicks }))} color="#2b201b" label="Booking clicks" />
            <details className="mt-3 text-xs text-muted">
              <summary className="cursor-pointer">View as table</summary>
              <table className="mt-2 w-full max-w-sm text-left">
                <thead><tr><th className="py-1 font-medium">Date (UTC)</th><th className="font-medium">Views</th><th className="font-medium">Booking clicks</th></tr></thead>
                <tbody>{a.daily.map((d) => <tr key={d.date}><td className="py-0.5">{d.date}</td><td>{d.views}</td><td>{d.bookingClicks}</td></tr>)}</tbody>
              </table>
            </details>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="card p-5" aria-labelledby="top-title">
              <h2 id="top-title" className="font-medium">Most-clicked services</h2>
              {a.topServices.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No service booking clicks in this period.</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {a.topServices.map((s) => (
                    <li key={s.serviceId}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="truncate">{s.name}{!s.active && <span className="text-muted"> (hidden)</span>}</span>
                        <span className="tabular-nums text-muted">{s.clicks}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-accent-soft">
                        <div className="h-full rounded-full bg-[#c99a8b]" style={{ width: `${(s.clicks / maxService) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="card space-y-6 p-5" aria-label="Social and contact clicks">
              <Breakdown title="Social link clicks" rows={a.socialBreakdown} />
              <Breakdown title="Contact clicks" rows={a.contactBreakdown} />
            </section>
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-muted">
        Your own visits while logged in, and previews, aren’t counted. Visitors with Do Not Track enabled are counted as views but not as unique visitors.
        Times are grouped by UTC day.
      </p>
    </>
  );
}

function Kpi({ label, value, text, prev, note }: { label: string; value?: number; text?: string; prev?: number; note?: string }) {
  const change = prev !== undefined && value !== undefined && prev > 0 ? Math.round(((value - prev) / prev) * 100) : null;
  return (
    <div className="card p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-medium tabular-nums">{text ?? (value ?? 0).toLocaleString("en-GB")}</dd>
      {change !== null && <dd className={`text-xs ${change >= 0 ? "text-emerald-700" : "text-red-700"}`}>{change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs previous period</dd>}
      {note && <dd className="mt-0.5 text-[11px] text-muted">{note}</dd>}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ target: string; clicks: number }> }) {
  return (
    <div>
      <h2 className="font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">None in this period.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line text-sm">
          {rows.map((r) => (
            <li key={r.target} className="flex justify-between py-2"><span>{LABELS[r.target] ?? r.target}</span><span className="tabular-nums text-muted">{r.clicks}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
