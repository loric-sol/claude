import { requireBusiness } from "@/lib/auth";
import { getGallery } from "@/lib/repo";
import { deleteGalleryAction, moveGalleryAction, updateCaptionAction } from "../actions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AddGalleryForm } from "@/components/dashboard/AddForms";
import { RowControls } from "@/components/dashboard/RowControls";
import { ActionButton } from "@/components/ui/form";

export default async function GalleryPage() {
  const { business } = await requireBusiness();
  const images = getGallery(business.id);
  return (
    <>
      <PageHeader title="Gallery" description="Your portfolio. Recent, well-lit photos of your work are the strongest reason to book." />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
        <section aria-label="Gallery images">
          {images.length === 0 ? (
            <div className="card px-6 py-14 text-center">
              <p className="font-display text-2xl">Your gallery is empty</p>
              <p className="mt-2 text-sm text-muted">Add a few photos of your best work — the gallery section is hidden until you do.</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {images.map((g, i) => (
                <li key={g.id} className="card overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.image_url} alt={g.caption || "Gallery image"} className="aspect-[4/3] w-full object-cover" />
                  <div className="space-y-2 p-3">
                    <form action={updateCaptionAction} className="flex gap-2">
                      <input type="hidden" name="id" value={g.id} />
                      <label htmlFor={`cap-${g.id}`} className="sr-only">Caption for image {i + 1}</label>
                      <input id={`cap-${g.id}`} name="caption" defaultValue={g.caption} maxLength={120} placeholder="Add a caption" className="input py-1.5 text-sm" />
                      <ActionButton className="btn-secondary px-3 py-1.5 text-xs">Save</ActionButton>
                    </form>
                    <div className="flex justify-end">
                      <RowControls id={g.id} label="this image" move={moveGalleryAction} remove={deleteGalleryAction} isFirst={i === 0} isLast={i === images.length - 1} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <AddGalleryForm />
      </div>
    </>
  );
}
