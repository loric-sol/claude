import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { describeServiceCta } from "@/lib/booking";
import { formatDuration, formatPrice } from "@/lib/format";
import { getServices } from "@/lib/repo";
import { deleteServiceAction, moveServiceAction, toggleServiceAction } from "../actions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ActionButton } from "@/components/ui/form";
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil, Plus, Trash } from "@/components/icons";

const toneClass = { good: "bg-emerald-50 text-emerald-800", info: "bg-sky-50 text-sky-800", warn: "bg-amber-50 text-amber-800" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { business } = await requireBusiness();
  const services = getServices(business.id);
  const { saved } = await searchParams;

  return (
    <>
      {saved && <p role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">“{saved}” saved. Changes are live on your page{business.published ? "" : " once you publish"}.</p>}
      <PageHeader
        title="Services"
        description="Your treatment menu. Each service gets its own “Book this treatment” button — give it a direct booking link, or it will use your general booking link."
        actions={<Link href="/dashboard/services/new" className="btn-primary"><Plus width={16} height={16} /> Add service</Link>}
      />

      {services.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <p className="font-display text-2xl">No services yet</p>
          <p className="mt-2 max-w-sm text-sm text-muted">Add your treatments with prices and durations so visitors know exactly what to book.</p>
          <Link href="/dashboard/services/new" className="btn-primary mt-6"><Plus width={16} height={16} /> Add your first service</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {services.map((s, i) => {
            const cta = describeServiceCta(s, business);
            return (
              <li key={s.id} className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${s.active ? "" : "opacity-70"}`}>
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {s.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="h-16 w-16 shrink-0 rounded-xl bg-accent-soft" />
                  )}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{s.name}</span>
                      {!s.active && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-normal text-stone-700">Hidden</span>}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {s.price_from && "from "}{formatPrice(s.price_pence, s.currency)} · {formatDuration(s.duration_minutes)}
                    </p>
                    <p className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] ${toneClass[cta.tone]}`}>{cta.text}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <form action={moveServiceAction}>
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="direction" value="up" />
                    <ActionButton className="btn-ghost p-2" label={`Move ${s.name} up`}><ChevronUp width={18} height={18} className={i === 0 ? "opacity-25" : ""} /></ActionButton>
                  </form>
                  <form action={moveServiceAction}>
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="direction" value="down" />
                    <ActionButton className="btn-ghost p-2" label={`Move ${s.name} down`}><ChevronDown width={18} height={18} className={i === services.length - 1 ? "opacity-25" : ""} /></ActionButton>
                  </form>
                  <form action={toggleServiceAction}>
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="active" value={s.active ? "0" : "1"} />
                    <ActionButton className="btn-ghost p-2" label={s.active ? `Hide ${s.name} from your page` : `Show ${s.name} on your page`}>
                      {s.active ? <Eye width={18} height={18} /> : <EyeOff width={18} height={18} />}
                    </ActionButton>
                  </form>
                  <Link href={`/dashboard/services/${s.id}`} className="btn-secondary px-3 py-1.5 text-xs"><Pencil width={14} height={14} /> Edit</Link>
                  <form action={deleteServiceAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <ActionButton className="btn-ghost p-2 text-red-700" label={`Delete ${s.name}`} confirm={`Delete “${s.name}”? This can't be undone.`}><Trash width={18} height={18} /></ActionButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-xs text-muted">
        Tip: the eye icon hides a service without deleting it — handy when you’re fully booked for a treatment.
      </p>
    </>
  );
}
