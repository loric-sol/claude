/** Shape returned by every dashboard server action, consumed by useActionState. */
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Changes on every submit so success messages re-appear. */
  stamp?: number;
};

export const initialFormState: FormState = {};

export const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};
