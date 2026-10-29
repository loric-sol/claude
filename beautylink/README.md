# BeautyLink (MVP)

A link-in-bio page for independent UK beauty professionals: services, prices, photos, reviews and policies on one mobile-first page, with booking buttons that send visitors to the booking software the owner already uses (Fresha, Booksy, Treatwell, Square Appointments and so on).

**BeautyLink does not take bookings.** It has no calendar, no availability, no payments and no booking confirmations. Every booking button is an ordinary external link.

---

## Quick start

Requirements: **Node.js 22.13 or newer** (the prototype uses Node's built-in `node:sqlite`). You don't need a database server, any credentials or any native modules.

```bash
cd beautylink
```

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Open http://localhost:3000.

- **Example public page:** http://localhost:3000/amybeauty
- **Demo dashboard:** click **Try the dashboard** on the home page, or **Explore the demo dashboard** on `/login`. You don't need an account.
- **Your own account:** use **Create your page**. You can sign up with any email, and no verification email is sent.

The database (`data/beautylink.db`) is created and seeded automatically the first time the app runs.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests for URL safety, pricing and booking-button fallbacks |
| `npm run test:e2e` | Browser test of the critical journeys (see below) |
| `npm run db:reset` | Deletes the local database. It is re-created and re-seeded on the next start. Stop the server first. |
| `npm run images` | Regenerates the bundled demo illustrations in `public/demo` |

To view the page on your phone, run `npm run dev -- -H 0.0.0.0` and open `http://<your-computer-ip>:3000/amybeauty` on the same Wi-Fi.

### Configuration (`.env.local`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | derived from the request | Base URL used for the shareable page link |
| `DEMO_MODE` | `true` | Seeds Amy Beauty Studio and shows the demo-login buttons. Set it to `false` in production. |
| `DATABASE_PATH` | `./data/beautylink.db` | SQLite file location |
| `UPLOAD_DIR` | `./data/uploads` | Where uploaded images are stored |

The app has no secret keys. `.env.local` and `data/` are git-ignored.

---

## Architecture

- **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4.** Pages are server-rendered. Dashboard changes go through server actions.
- **Storage (prototype):** a single SQLite file read through Node's built-in driver (`src/lib/db.ts`). The relational schema matches the brief: users, businesses, services, gallery images, reviews, FAQs and page events. All reads and writes go through `src/lib/repo.ts` and `src/lib/analytics.ts`, so you can replace the storage without changing the UI.
- **Production schema:** `supabase/schema.sql` holds the same model for Postgres, with row-level security, public read-only views and a `record_event()` function for anonymous analytics. **This file has not been run against a live Supabase project.** Treat it as the migration starting point.
- **Auth (prototype):** local email and password. Passwords are hashed with scrypt. The session token sits in an httpOnly, SameSite=Lax cookie, and the database stores only its SHA-256 hash. The plan is to replace this with Supabase Auth.
- **Dependencies:** `next`, `react`, `react-dom`, `zod` and `server-only`. The charts and icons are hand-written SVG.

```
src/
  app/
    [slug]/              public beauty page (+ "not available" page)
    dashboard/           owner dashboard pages + actions.ts (all mutations)
    api/events/          anonymous analytics endpoint (sendBeacon)
    api/uploads/[name]/  serves uploaded images
    login/ signup/ onboarding/
  components/public/     BeautyPage, CtaButton, tracking (client), StickyBar
  components/dashboard/  forms, ImagePicker, charts, nav
  lib/
    booking.ts   which URL each button uses (the core product rule)
    urls.ts      URL / handle / phone validation and safe href generation
    repo.ts      data access          analytics.ts  event writes + reports
    auth.ts      sessions             seed.ts       demo business + sample analytics
supabase/schema.sql  production schema + RLS
tests/               unit tests + e2e script
```

### How booking buttons work (`src/lib/booking.ts`)

1. The main **Book an appointment** button uses the general booking URL.
2. Each **Book this treatment** button uses the service's own booking URL. If the service has none, it uses the general booking URL.
3. If there is no booking URL at all, the button becomes a contact option. It picks the first one available: WhatsApp (with a pre-filled message naming the treatment), then phone, then email, then Instagram.
4. If the business has no booking URL and no contact details, the page shows no button rather than a broken one.

Each button shows where it goes, for example "Opens Fresha" or "Demo link · opens an example page".

URL safety:
- On save, only `http` and `https` links are accepted. A link without a scheme gets `https://` added. The app rejects other schemes (`javascript:`, `data:`, `file:` and so on), links containing credentials, bare hostnames and IP addresses.
- Stored URLs are validated again before they are rendered, so a value tampered with in the database is never output.
- The dashboard checks the link as the owner types and shows a clear error message. The server validates it again on save.

Clicks are recorded with `navigator.sendBeacon` and the browser then follows the link normally, so tracking never delays or blocks the visitor.

### Analytics and privacy

- Recorded events: `page_view` (once per browser session), `booking_click` (marked as service or main button), `social_click` and `contact_click`.
- No IP addresses, user agents, referrers or names are stored. A random visitor ID is kept in `localStorage` for the unique-visitor count. It is not created when the browser sends Do Not Track or Global Privacy Control.
- The owner's own visits and previews are not counted. Bots are filtered by user agent, and the endpoint is rate-limited.
- The dashboard explains that **booking clicks are not confirmed appointments**.
- The demo's generated activity is flagged `is_sample`. You can hide it or delete it from the Analytics page.

---

## What works

- **Public page** (`/{slug}`), designed mobile-first:
  - cover image, logo, name, category and location, and description
  - Instagram, TikTok, WhatsApp and website links
  - a main booking button, plus a sticky booking bar on mobile
  - a section menu
  - service cards with an image, price ("from" prices supported), duration, description and a per-service button
  - gallery, reviews (sample reviews are labelled), and policies/FAQ accordions
  - contact block and footer
  - four themes: Blush, Linen, Sage and Noir
  - Open Graph metadata
  - unpublished pages show "This page isn't available" and return a 404 to the public
- **Sign-up, log-in and onboarding:** creates an unpublished page with an auto-generated address. Reserved and duplicate addresses are blocked.
- **Dashboard**, with a responsive layout and a demo banner:
  - **Overview:** a set-up checklist, 7-day stats and quick actions
  - **Services:** add, edit, delete (with confirmation), hide/show and reorder. Each service has a live status for its booking button, such as "Own booking link", "Uses your general booking link" or "falls back to WhatsApp".
  - **Booking & links:** general booking URL with provider detection and a test link, Instagram/TikTok handles (full URLs are accepted too), website, WhatsApp, phone, email and address
  - **Profile:** name, page address, category, location and description
  - **Appearance:** theme picker with live previews, logo and cover image (upload, or pick from the library)
  - **Gallery:** add from an upload or the library, edit captions, reorder and delete
  - **Reviews & policies:** add, reorder and delete reviews; add, edit, reorder and delete FAQs
  - **Analytics:** 7, 30 or 90 days of page views, unique visitors, booking clicks (service vs main button), click-through rate, social and contact clicks, change against the previous period, daily charts with a table view, and most-clicked services
  - Publish/unpublish, copy URL, and a preview in a new tab
- **Image uploads:** JPG, PNG or WebP up to 5 MB. The real file type is checked from the file's bytes, and SVG is rejected. Uploads get random file names and are served with `nosniff`.
- **Demo:** Amy Beauty Studio has 8 services (one hidden, one using the general link), 6 gallery images, 4 labelled sample reviews, 5 policies and about 60 days of sample analytics. **Reset demo** restores it.

## Limitations and what is demo-only

- **Images:** the build environment couldn't download stock photos, so the demo images are illustrations generated locally (`scripts/generate-demo-images.mjs`). They load reliably and are labelled as illustrations in the editor. Real owners would upload their own photos.
- **Demo links:** booking links point to `example.com` (a domain reserved for examples) and are labelled "Demo link" on the page. The demo phone number is from Ofcom's range reserved for drama. The Instagram and TikTok handles are made up.
- **Shared demo:** everyone who uses the demo account edits the same data. Use **Reset demo** to restore it, and turn it off with `DEMO_MODE=false`. The demo account can't change its page address.
- **Storage and hosting:** SQLite and local-disk uploads need a server with a persistent disk, such as a VPS, Railway or Fly.io with a volume. They will **not** persist on serverless hosts like Vercel. For production, move to `supabase/schema.sql` and Supabase Storage.
- **Auth:** there is no email verification, password reset or account deletion yet. Sessions last 30 days.
- **One business per account in the UI.** The schema already supports several.
- **Rate limiting** is in-memory and per process.
- **Analytics:**
  - Unique visitors are approximate: a visitor is counted again if they clear storage or switch device.
  - Days are grouped by UTC.
  - BeautyLink can't know whether a booking was completed.
- **Reordering** uses up/down buttons rather than drag and drop. This is deliberate, as it is accessible and works on touch screens.
- **UK consent law:** before launch, confirm that the anonymous analytics ID meets UK PECR requirements (it is stored in `localStorage`), or add a consent notice.
- Node prints an `ExperimentalWarning` for `node:sqlite`. It is harmless.

---

## Manual test checklist

**Visitor (use a phone, or the browser's mobile emulation)**
1. Open `/amybeauty`. The demo banner, cover, logo, name, category, location and social icons all appear.
2. Scroll down. A sticky **Book an appointment** bar appears once the main button is off-screen.
3. Under **Gel manicure**, tap **Book this treatment**. The browser goes to `example.com/demo-booking/amy-beauty-studio/gel-manicure`. No confirmation page from BeautyLink appears.
4. Go back. **Lash lift & tint** has no link of its own, so its button goes to the general booking URL.
5. **Lash infill** (hidden) is not shown. Reviews carry the "Sample reviews" label, and the policy accordions open.

**Owner**

6. On `/login`, choose **Explore the demo dashboard**. The overview shows the checklist and stats.
7. Go to **Services**, then **Edit** on Classic lash extensions. Set the price to `49` and the booking link to `javascript:alert(1)`, then save. An error appears and your typed values are kept.
8. Change the link to `www.fresha.com/book-now/test` and save. A confirmation appears, and the list shows "Own booking link · Fresha".
9. Click **Preview page**. The service shows **£49** and the button reads "Opens Fresha". Its link is `https://www.fresha.com/book-now/test`.
10. Click **Unpublish**. A logged-out (private) window now shows "This page isn't available", while the owner preview still works. Click **Publish page** to restore it.
11. Hide a service with the eye icon and move a service with the arrows. Check the public page.
12. In **Appearance**, choose **Noir** and save. The public page switches theme.
13. In **Analytics**, check that the "Booking clicks are not bookings" notice is shown. Toggle **Hide sample data** and the real-only figures appear. Try the 7, 30 and 90-day ranges.
14. **Reset demo** (top banner) restores the original data.

**New owner**

15. Sign up. A password shorter than 8 characters is rejected. Then go through onboarding: name, address, category and location. You land on an unpublished page.
16. Add a WhatsApp number in **Booking & links**, then add a service without a booking link. The editor warns that the button will be "Enquire on WhatsApp".
17. Publish. The public page shows WhatsApp buttons with a pre-filled message naming the service.

### Automated tests

```bash
npm test
```

The end-to-end script runs the journeys above in Chromium. Start it from a fresh database with the server running:

```bash
npm run db:reset
```

```bash
npm run dev
```

In a second terminal:

```bash
npm i -D playwright && npx playwright install chromium
```

```bash
npm run test:e2e
```

It expects the server at `BASE_URL`, which defaults to `http://localhost:3000`.

During development, 10 unit tests and all 21 end-to-end checks passed against the production build (`next build && next start`).

## Suggested next steps

1. Supabase: apply `supabase/schema.sql`, switch auth to Supabase Auth, move uploads to Storage, and record events with `record_event()`.
2. Add email verification, password reset and account deletion, plus a data export for UK GDPR.
3. Add UTM/source tagging (Instagram vs TikTok bio), QR codes and a custom domain per page.
4. Run usability tests with 5–10 real lash, brow and nail techs, timing the first 10 minutes of set-up.
