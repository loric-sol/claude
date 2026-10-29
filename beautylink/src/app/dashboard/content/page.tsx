import { requireBusiness } from "@/lib/auth";
import { getFaqs, getReviews } from "@/lib/repo";
import { deleteFaqAction, deleteReviewAction, moveFaqAction, moveReviewAction } from "../actions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AddReviewForm, FaqForm } from "@/components/dashboard/AddForms";
import { RowControls } from "@/components/dashboard/RowControls";
import { Star } from "@/components/icons";

export default async function ContentPage() {
  const { business } = await requireBusiness();
  const reviews = getReviews(business.id);
  const faqs = getFaqs(business.id);
  return (
    <>
      <PageHeader title="Reviews & policies" description="Social proof and the answers clients need before they book." />

      <h2 className="mb-3 font-display text-2xl">Reviews</h2>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
        <section aria-label="Reviews">
          {reviews.length === 0 ? (
            <div className="card px-6 py-10 text-center text-sm text-muted">No reviews yet. The reviews section is hidden until you add one.</div>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r, i) => (
                <li key={r.id} className="card flex gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex text-star" aria-label={`${r.rating} stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} width={14} height={14} filled={n <= r.rating} />)}</span>
                      {r.is_sample && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">Sample — replace before going live</span>}
                    </div>
                    <p className="mt-2 text-sm">“{r.body}”</p>
                    <p className="mt-1 text-xs text-muted">{r.author_name}{r.source && ` · ${r.source}`}</p>
                  </div>
                  <RowControls id={r.id} label={`review by ${r.author_name}`} move={moveReviewAction} remove={deleteReviewAction} isFirst={i === 0} isLast={i === reviews.length - 1} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <AddReviewForm />
      </div>

      <h2 className="mb-3 mt-12 font-display text-2xl">Policies & FAQs</h2>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
        <section aria-label="Policies and FAQs">
          {faqs.length === 0 ? (
            <div className="card px-6 py-10 text-center text-sm text-muted">Add your deposit, cancellation and patch-test policies so clients know what to expect.</div>
          ) : (
            <ul className="space-y-3">
              {faqs.map((f, i) => (
                <li key={f.id} className="card p-4">
                  <div className="flex justify-end"><RowControls id={f.id} label="this question" move={moveFaqAction} remove={deleteFaqAction} isFirst={i === 0} isLast={i === faqs.length - 1} /></div>
                  <FaqForm faq={f} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="card p-5 sm:p-6">
          <h3 className="mb-4 font-medium">Add a policy or question</h3>
          <FaqForm />
        </div>
      </div>
    </>
  );
}
