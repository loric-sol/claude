"use client";

import { useActionState, useState } from "react";
import { createBusinessAction } from "@/app/dashboard/actions";
import { CATEGORIES, slugify } from "@/lib/categories";
import { initialFormState } from "@/lib/form";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/ui/form";

export function OnboardingForm({ origin }: { origin: string }) {
  const [state, action] = useActionState(createBusinessAction, initialFormState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const e = state.errors ?? {};
  return (
    <ActionForm action={action} className="mt-8 space-y-5">
      <TextField label="Business name" name="name" required value={name} placeholder="e.g. Amy Beauty Studio" error={e.name}
        onChange={(ev) => { setName(ev.target.value); if (!slugEdited) setSlug(slugify(ev.target.value)); }} />
      <TextField label="Your page address" name="slug" value={slug} prefix={`${origin.replace(/^https?:\/\//, "")}/`} error={e.slug}
        hint="This is the link you'll put in your Instagram and TikTok bio."
        onChange={(ev) => { setSlugEdited(true); setSlug(ev.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }} />
      <SelectField label="What do you do?" name="category" defaultValue="" error={e.category}>
        <option value="" disabled>Choose a category</option>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </SelectField>
      <TextField label="Location" name="location" placeholder="e.g. Clapham, London" optional error={e.location} />
      <TextField label="Booking link" name="general_booking_url" type="url" inputMode="url" optional placeholder="https://www.fresha.com/…" error={e.general_booking_url}
        hint="Your Fresha, Booksy, Treatwell, Square or other booking page. You can add it later." />
      {state.message && !state.ok && <p role="alert" className="text-sm text-red-700">{state.message}</p>}
      <SubmitButton className="btn-primary w-full py-3" pendingText="Creating your page…">Create my page</SubmitButton>
      <p className="text-center text-xs text-muted">Your page stays unpublished until you choose to publish it.</p>
    </ActionForm>
  );
}
