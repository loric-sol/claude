"use client";

import { useActionState, useState } from "react";
import { updateAppearanceAction } from "@/app/dashboard/actions";
import { initialFormState } from "@/lib/form";
import { COVER_LIBRARY, LOGO_LIBRARY } from "@/lib/image-library";
import { THEMES, THEME_IDS, type ThemeId } from "@/lib/themes";
import type { Business } from "@/lib/types";
import { ActionForm, FormMessage, SubmitButton } from "../ui/form";
import { ImagePicker } from "./ImagePicker";

export function AppearanceForm({ business }: { business: Business }) {
  const [state, action] = useActionState(updateAppearanceAction, initialFormState);
  const [theme, setTheme] = useState<ThemeId>(business.theme);
  const e = state.errors ?? {};
  return (
    <ActionForm action={action} className="space-y-6">
      <fieldset className="card p-5 sm:p-7">
        <legend className="sr-only">Theme</legend>
        <h2 className="font-medium">Theme</h2>
        <p className="mt-1 text-sm text-muted">Colours and mood for your public page.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {THEME_IDS.map((id) => {
            const t = THEMES[id];
            const selected = theme === id;
            return (
              <label key={id} className={`cursor-pointer rounded-2xl border-2 p-2 transition ${selected ? "border-ink" : "border-line hover:border-ink/30"}`}>
                <input type="radio" name="theme" value={id} checked={selected} onChange={() => setTheme(id)} className="sr-only" />
                <div data-theme={id} className="overflow-hidden rounded-xl border border-line bg-page p-3">
                  <div className="mx-auto h-8 w-8 rounded-full bg-accent" />
                  <p className="mt-2 text-center font-display text-lg leading-none text-ink">Your Studio</p>
                  <div className="mt-2 rounded-full bg-cta py-1.5 text-center text-[10px] text-cta-ink">Book an appointment</div>
                  <div className="mt-2 rounded-lg border border-line bg-surface p-2">
                    <div className="h-1.5 w-2/3 rounded bg-ink/70" />
                    <div className="mt-1 h-1.5 w-1/3 rounded bg-muted/50" />
                  </div>
                </div>
                <p className="mt-2 px-1 text-sm font-medium">{t.name}</p>
                <p className="px-1 text-xs text-muted">{t.description}</p>
              </label>
            );
          })}
        </div>
        {e.theme && <p className="mt-2 text-xs text-red-700">{e.theme}</p>}
      </fieldset>

      <div className="card space-y-8 p-5 sm:p-7">
        <ImagePicker name="logo" label="Logo or profile photo" aspect="round" initialUrl={business.logo_url} library={LOGO_LIBRARY} error={e.logo}
          hint="A square image works best. Shown in a circle." />
        <ImagePicker name="cover" label="Cover image" aspect="wide" initialUrl={business.cover_image_url} library={COVER_LIBRARY} error={e.cover}
          hint="A wide image (around 1600 × 700) shown at the top of your page." />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Save appearance</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
