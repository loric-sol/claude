import { setPublishedAction } from "@/app/dashboard/actions";
import { ActionButton } from "../ui/form";

/** Server-rendered form so it works without client JS. */
export function PublishToggle({ published }: { published: boolean }) {
  return (
    <form action={setPublishedAction} className="flex items-center gap-3">
      <input type="hidden" name="published" value={published ? "0" : "1"} />
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${published ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-500" : "bg-amber-500"}`} />
        {published ? "Live" : "Unpublished"}
      </span>
      <ActionButton
        className={published ? "btn-secondary px-3.5 py-1.5 text-xs" : "btn-primary px-3.5 py-1.5 text-xs"}
        confirm={published ? "Unpublish your page? Visitors will see “This page isn’t available” until you publish again." : undefined}
      >
        {published ? "Unpublish" : "Publish page"}
      </ActionButton>
    </form>
  );
}
