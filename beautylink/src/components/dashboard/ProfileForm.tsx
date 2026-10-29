"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/dashboard/actions";
import { CATEGORIES } from "@/lib/categories";
import { initialFormState } from "@/lib/form";
import type { Business } from "@/lib/types";
import { ActionForm, FormMessage, SelectField, SubmitButton, TextArea, TextField } from "../ui/form";

export function ProfileForm({ business, origin, slugLocked }: { business: Business; origin: string; slugLocked: boolean }) {
  const [state, action] = useActionState(updateProfileAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <ActionForm action={action} className="card space-y-5 p-5 sm:p-7">
      <TextField label="Business name" name="name" required maxLength={80} defaultValue={business.name} error={e.name} />
      <TextField
        label="Page address"
        name="slug"
        defaultValue={business.slug}
        prefix={`${origin.replace(/^https?:\/\//, "")}/`}
        disabled={slugLocked}
        error={e.slug}
        hint={slugLocked ? "The demo page address can't be changed." : "Changing this breaks any links you've already shared."}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Category" name="category" defaultValue={business.category} error={e.category}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </SelectField>
        <TextField label="Location" name="location" maxLength={80} defaultValue={business.location} placeholder="e.g. Clapham, London" error={e.location} hint="Town or area — shown under your name." />
      </div>
      <TextArea label="Short description" name="description" rows={4} maxLength={400} defaultValue={business.description} error={e.description}
        placeholder="What you specialise in and what clients can expect." hint="Up to 400 characters. Two or three sentences work best." />
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <SubmitButton>Save profile</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
