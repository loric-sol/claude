"use client";

import { useActionState, useState } from "react";
import { updateLinksAction } from "@/app/dashboard/actions";
import { initialFormState } from "@/lib/form";
import type { Business } from "@/lib/types";
import { detectProvider, formatPhone, isExampleUrl, normaliseWebUrl } from "@/lib/urls";
import { ActionForm, FormMessage, SubmitButton, TextField } from "../ui/form";

export function LinksForm({ business: b }: { business: Business }) {
  const [state, action] = useActionState(updateLinksAction, initialFormState);
  const e = state.errors ?? {};
  const [booking, setBooking] = useState(b.general_booking_url ?? "");
  const check = normaliseWebUrl(booking, "Booking link");
  const provider = check.ok && check.url ? (isExampleUrl(check.url) ? "a demo example page" : detectProvider(check.url)) : null;

  return (
    <ActionForm action={action} className="space-y-6">
      <section className="card space-y-4 p-5 sm:p-7" aria-labelledby="booking-title">
        <div>
          <h2 id="booking-title" className="font-medium">General booking link</h2>
          <p className="mt-1 text-sm text-muted">Used by your main “Book an appointment” button, and by any service without its own link.</p>
        </div>
        <TextField
          label="Booking page URL"
          name="general_booking_url"
          type="url"
          inputMode="url"
          value={booking}
          onChange={(ev) => setBooking(ev.target.value)}
          placeholder="https://www.fresha.com/a/your-salon-…"
          error={e.general_booking_url ?? (!check.ok && booking.length > 8 ? check.error : undefined)}
          hint={provider ? `Visitors will be sent to ${provider}.` : "Paste your Fresha, Booksy, Treatwell, Square Appointments or other booking page link."}
        />
        {check.ok && check.url && (
          <a href={check.url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-muted underline underline-offset-2 hover:text-ink">
            Test this link in a new tab ↗
          </a>
        )}
        <p className="rounded-xl bg-accent-soft/60 p-3 text-xs text-muted">
          No booking system? Leave this empty — your buttons will invite visitors to message you on WhatsApp, call or email instead.
        </p>
      </section>

      <section className="card space-y-4 p-5 sm:p-7" aria-labelledby="social-title">
        <h2 id="social-title" className="font-medium">Social & website</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Instagram" name="instagram_handle" prefix="@" optional defaultValue={b.instagram_handle ?? ""} placeholder="yourstudio" error={e.instagram_handle} />
          <TextField label="TikTok" name="tiktok_handle" prefix="@" optional defaultValue={b.tiktok_handle ?? ""} placeholder="yourstudio" error={e.tiktok_handle} />
        </div>
        <TextField label="Website" name="website_url" type="url" inputMode="url" optional defaultValue={b.website_url ?? ""} placeholder="https://…" error={e.website_url} />
      </section>

      <section className="card space-y-4 p-5 sm:p-7" aria-labelledby="contact-title">
        <h2 id="contact-title" className="font-medium">Contact details</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="WhatsApp number" name="whatsapp_number" type="tel" inputMode="tel" optional defaultValue={b.whatsapp_number ? formatPhone(b.whatsapp_number) : ""} placeholder="07700 900123" error={e.whatsapp_number} />
          <TextField label="Phone" name="contact_phone" type="tel" inputMode="tel" optional defaultValue={b.contact_phone ? formatPhone(b.contact_phone) : ""} placeholder="07700 900123" error={e.contact_phone} />
        </div>
        <TextField label="Email" name="contact_email" type="email" optional defaultValue={b.contact_email ?? ""} placeholder="hello@yourstudio.co.uk" error={e.contact_email} />
        <TextField label="Studio address" name="address" optional maxLength={160} defaultValue={b.address ?? ""} placeholder="Leave empty if you're mobile or share it after booking" error={e.address} />
        <p className="text-xs text-muted">Everything here is shown publicly on your page.</p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Save links</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
