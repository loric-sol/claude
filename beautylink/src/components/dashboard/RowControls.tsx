import { ActionButton } from "../ui/form";
import { ChevronDown, ChevronUp, Trash } from "../icons";

/** Up / down / delete buttons for a list row, each a tiny server-action form. */
export function RowControls({
  id, label, move, remove, isFirst, isLast,
}: {
  id: string;
  label: string;
  move: (fd: FormData) => Promise<void>;
  remove: (fd: FormData) => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <form action={move}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="direction" value="up" />
        <ActionButton className="btn-ghost p-2" label={`Move ${label} up`}><ChevronUp width={18} height={18} className={isFirst ? "opacity-25" : ""} /></ActionButton>
      </form>
      <form action={move}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="direction" value="down" />
        <ActionButton className="btn-ghost p-2" label={`Move ${label} down`}><ChevronDown width={18} height={18} className={isLast ? "opacity-25" : ""} /></ActionButton>
      </form>
      <form action={remove}>
        <input type="hidden" name="id" value={id} />
        <ActionButton className="btn-ghost p-2 text-red-700" label={`Delete ${label}`} confirm={`Delete ${label}? This can't be undone.`}><Trash width={18} height={18} /></ActionButton>
      </form>
    </div>
  );
}
