"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveServiceAction } from "@/app/dashboard/actions";
import { penceToInput } from "@/lib/format";
import { initialFormState } from "@/lib/form";
import { IMAGE_LIBRARY } from "@/lib/image-library";
import type { Service } from "@/lib/types";
import { normaliseWebUrl, detectProvider, isExampleUrl } from "@/lib/urls";
import { ActionForm, FormMessage, SubmitButton, TextArea, TextField } from "../ui/form";
import { ImagePicker } from "./ImagePicker";

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];

export function ServiceForm({ service, generalBookingUrl, fallbackLabel }: { service: Service | null; generalBookingUrl: string | null; fallbackLabel: string | null }) {
  const [state, action] = useActionState(saveServiceAction, initialFormState);
  const e = state.errors ?? {};
  const [bookingUrl, setBookingUrl] = useState(service?.booking_url ?? "");
  const check = normaliseWebUrl(bookingUrl, "Booking link");
  const provider = check.ok && check.url ? (isExampleUrl(check.url) ? "Demo example link" : detectProvider(check.url)) : null;

  return (
    <ActionForm action={action} className="card space-y-6 p-5 sm:p-7">
      {service && <input type="hidden" name="id" value={service.id} />}
      <TextField label="Service name" name="name" required maxLength={80} defaultValue={service?.name} placeholder="e.g. Classic lash extensions" error={e.name} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <TextField label="Price" name="price" inputMode="decimal" prefix="£" required defaultValue={service ? penceToInput(service.price_pence) : ""} placeholder="45" error={e.price} />
          <label className="mt-2 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="price_from" defaultChecked={service?.price_from} className="h-4 w-4 accent-[#2b201b]" />
            Show as “from” price
          </label>
        </div>
        <TextField label="Duration (minutes)" name="duration_minutes" type="number" min={5} max={600} step={5} required list="durations" defaultValue={service?.duration_minutes ?? 60} error={e.duration_minutes} />
        <datalist id="durations">{DURATIONS.map((d) => <option key={d} value={d} />)}</datalist>
      </div>
      <TextArea label="Description" name="description" optional maxLength={500} rows={3} defaultValue={service?.description} placeholder="What's included, how long it lasts, any prep needed." error={e.description} />

      <div className="rounded-2xl border border-line bg-accent-soft/40 p-4">
        <TextField
          label="Booking link for this service"
          name="booking_url"
          type="url"
          inputMode="url"
          optional
          value={bookingUrl}
          onChange={(ev) => setBookingUrl(ev.target.value)}
          placeholder="https://www.fresha.com/book-now/…"
          error={e.booking_url ?? (!check.ok && bookingUrl.length > 8 ? check.error : undefined)}
          hint={
            provider
              ? `Visitors will be sent to ${provider} to book this treatment.`
              : generalBookingUrl
                ? "Leave empty to use your general booking link."
                : fallbackLabel
                  ? `No booking link yet — the button will show “${fallbackLabel}” instead.`
                  : "No booking link or contact details yet, so this service won't have a button."
          }
        />
        <p className="mt-2 text-xs text-muted">Paste the link to this treatment in Fresha, Booksy, Treatwell, Square or any booking site. BeautyLink never takes the booking itself.</p>
      </div>

      <ImagePicker name="image" label="Photo" initialUrl={service?.image_url ?? null} library={IMAGE_LIBRARY} error={e.image} />

      <label className="flex items-start gap-3 rounded-2xl border border-line p-4">
        <input type="checkbox" name="active" defaultChecked={service ? service.active : true} className="mt-0.5 h-4 w-4 accent-[#2b201b]" />
        <span>
          <span className="block text-sm font-medium">Show on my page</span>
          <span className="block text-xs text-muted">Untick to hide this service without deleting it.</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <SubmitButton>{service ? "Save changes" : "Add service"}</SubmitButton>
        <Link href="/dashboard/services" className="btn-ghost">Cancel</Link>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
