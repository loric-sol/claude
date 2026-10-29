import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFaqs, getGallery, getPublicBusinessBySlug, getReviews, getServices } from "@/lib/repo";
import { BeautyPage } from "@/components/public/BeautyPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

async function load(slug: string) {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const business = getPublicBusinessBySlug(slug);
  if (!business) return null;
  const user = await getCurrentUser();
  // Owner check uses a separate query so owner ids never sit on the public object.
  const isOwner = Boolean(user && db().prepare("SELECT 1 FROM businesses WHERE id = ? AND owner_user_id = ?").get(business.id, user.id));
  if (!business.published && !isOwner) return null;
  return { business, isOwner };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await load((await params).slug);
  if (!r) return { title: "Page not found · BeautyLink" };
  const b = r.business;
  return {
    title: `${b.name} · ${b.category} in ${b.location || "the UK"}`,
    description: b.description.slice(0, 160),
    openGraph: { title: b.name, description: b.description.slice(0, 160), images: b.cover_image_url ? [b.cover_image_url] : [] },
    robots: b.published ? undefined : { index: false },
  };
}

export default async function PublicPage({ params, searchParams }: Props) {
  const r = await load((await params).slug);
  if (!r) notFound();
  const { business, isOwner } = r;
  const preview = (await searchParams).preview === "1";

  const data = {
    business,
    services: getServices(business.id, { activeOnly: true }),
    gallery: getGallery(business.id),
    reviews: getReviews(business.id),
    faqs: getFaqs(business.id),
  };

  return (
    <>
      {isOwner && (
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-[#2b201b] px-4 py-2 text-center text-[12px] text-[#fffaf6]">
          <span>
            {business.published ? "Your page is live." : "Preview — this page is unpublished and only visible to you."}
            {" "}Your own visits are not counted in analytics.
          </span>
          <Link href="/dashboard" className="underline underline-offset-2">Back to dashboard</Link>
        </div>
      )}
      <BeautyPage data={data} tracking={!isOwner && !preview} />
    </>
  );
}
