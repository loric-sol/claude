import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { getOrigin } from "@/lib/origin";
import { logoutAction } from "@/app/auth-actions";
import { resetDemoAction } from "./actions";
import { SideNav, TabNav } from "@/components/dashboard/Nav";
import { CopyUrl } from "@/components/dashboard/CopyUrl";
import { PublishToggle } from "@/components/dashboard/PublishToggle";
import { ActionButton } from "@/components/ui/form";
import { ArrowUpRight, Eye, Logout } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard · BeautyLink", robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, business } = await requireBusiness();
  const url = `${await getOrigin()}/${business.slug}`;

  return (
    <div className="min-h-screen bg-[#f6efe8]">
      {user.is_demo && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-ink px-4 py-2 text-center text-xs text-page">
          <span>Demo mode — you’re editing the fictional Amy Beauty Studio. Anyone using the demo shares this data.</span>
          <form action={resetDemoAction}>
            <ActionButton className="underline underline-offset-2" confirm="Reset all demo content and sample analytics?">Reset demo</ActionButton>
          </form>
        </div>
      )}
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-4 lg:px-8 lg:py-8">
        <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col lg:flex">
          <Link href="/" className="px-3 font-display text-2xl italic">BeautyLink</Link>
          <div className="mt-8 flex-1"><SideNav /></div>
          <div className="space-y-2 border-t border-line px-3 pt-4 text-xs text-muted">
            <p className="truncate" title={user.email}>{user.is_demo ? "Demo account" : user.email}</p>
            <form action={logoutAction}>
              <ActionButton className="inline-flex items-center gap-1.5 hover:text-ink"><Logout width={14} height={14} /> Log out</ActionButton>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-6 space-y-4">
            <div className="flex items-center justify-between lg:hidden">
              <Link href="/" className="font-display text-xl italic">BeautyLink</Link>
              <form action={logoutAction}>
                <ActionButton className="btn-ghost px-3 py-1.5 text-xs" label="Log out"><Logout width={16} height={16} /></ActionButton>
              </form>
            </div>
            <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex min-w-0 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {business.logo_url ? <img src={business.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-display text-lg italic">{business.name.charAt(0)}</span>}
                <div className="min-w-0">
                  <p className="truncate font-medium">{business.name}</p>
                  <PublishToggle published={business.published} />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="sm:w-72"><CopyUrl url={url} compact /></div>
                <a href={`/${business.slug}?preview=1`} target="_blank" rel="noopener" className="btn-secondary px-3.5 py-2 text-xs">
                  <Eye width={16} height={16} /> Preview page <ArrowUpRight width={12} height={12} />
                </a>
              </div>
            </div>
            <div className="lg:hidden"><TabNav /></div>
          </header>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
