"use client";

import { useActionState } from "react";
import { addGalleryAction, addReviewAction, saveFaqAction } from "@/app/dashboard/actions";
import { initialFormState } from "@/lib/form";
import { IMAGE_LIBRARY } from "@/lib/image-library";
import type { Faq } from "@/lib/types";
import { ActionForm, FormMessage, SelectField, SubmitButton, TextArea, TextField } from "../ui/form";
import { ImagePicker } from "./ImagePicker";

/** Successful submits remount the form (via key) so it clears for the next entry. */
const resetKey = (s: { ok?: boolean; stamp?: number }) => (s.ok ? s.stamp : "form");

export function AddGalleryForm() {
  const [state, action] = useActionState(addGalleryAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <div>
      <ActionForm key={resetKey(state)} action={action} className="card space-y-4 p-5 sm:p-6">
        <h2 className="font-medium">Add an image</h2>
        <ImagePicker name="image" label="Image" initialUrl={null} library={IMAGE_LIBRARY} allowRemove={false} error={e.image} />
        <TextField label="Caption" name="caption" optional maxLength={120} placeholder="e.g. Russian volume, 10–12mm" error={e.caption} />
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingText="Adding…">Add to gallery</SubmitButton>
        </div>
      </ActionForm>
      <div className="mt-2 min-h-5"><FormMessage state={state} /></div>
    </div>
  );
}

export function AddReviewForm() {
  const [state, action] = useActionState(addReviewAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <div>
      <ActionForm key={resetKey(state)} action={action} className="card space-y-4 p-5 sm:p-6">
        <h2 className="font-medium">Add a client review</h2>
        <p className="text-xs text-muted">Only add genuine reviews you have permission to share, e.g. copied from Google, Fresha or a client message.</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <TextField label="Client name" name="author_name" maxLength={60} placeholder="e.g. Sophie R." error={e.author_name} hint="First name and initial is plenty." />
          <SelectField label="Rating" name="rating" defaultValue="5" error={e.rating}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
          </SelectField>
        </div>
        <TextArea label="Review" name="body" rows={3} maxLength={500} error={e.body} />
        <TextField label="Where it came from" name="source" optional maxLength={60} placeholder="e.g. Google, Fresha, Instagram DM" error={e.source} />
        <SubmitButton pendingText="Adding…">Add review</SubmitButton>
      </ActionForm>
      <div className="mt-2 min-h-5"><FormMessage state={state} /></div>
    </div>
  );
}

export function FaqForm({ faq }: { faq?: Faq }) {
  const [state, action] = useActionState(saveFaqAction, initialFormState);
  const e = state.errors ?? {};
  const prefix = faq ? `faq-${faq.id}` : "faq-new";
  return (
    <ActionForm key={faq ? faq.id : resetKey(state)} action={action} className="space-y-3">
      {faq && <input type="hidden" name="id" value={faq.id} />}
      <div>
        <label htmlFor={`${prefix}-q`} className="label">Question or policy</label>
        <input id={`${prefix}-q`} name="question" className="input" maxLength={160} defaultValue={faq?.question} placeholder="e.g. What is your cancellation policy?" aria-invalid={e.question ? true : undefined} />
        {e.question && <p className="mt-1 text-xs text-red-700">{e.question}</p>}
      </div>
      <div>
        <label htmlFor={`${prefix}-a`} className="label">Answer</label>
        <textarea id={`${prefix}-a`} name="answer" className="input min-h-20" maxLength={800} rows={2} defaultValue={faq?.answer} aria-invalid={e.answer ? true : undefined} />
        {e.answer && <p className="mt-1 text-xs text-red-700">{e.answer}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className={faq ? "btn-secondary px-4 py-2 text-xs" : "btn-primary"}>{faq ? "Save" : "Add"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
