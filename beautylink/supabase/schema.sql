-- BeautyLink — production schema for Supabase (Postgres + Supabase Auth)
--
-- STATUS: reference schema for the production migration. It mirrors the
-- SQLite prototype in src/lib/db.ts but has NOT been run against a live
-- Supabase project as part of this MVP. Review and test before use.
--
-- Account data lives in Supabase's auth.users (email, password hash, etc.)
-- and is never exposed through the public tables or views below.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- tables

create table public.businesses (
  id                  uuid primary key default gen_random_uuid(),
  owner_user_id       uuid not null references auth.users(id) on delete cascade,
  name                text not null check (char_length(name) between 1 and 80),
  slug                text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  category            text not null,
  location            text not null default '',
  description         text not null default '' check (char_length(description) <= 400),
  logo_url            text,
  cover_image_url     text,
  theme               text not null default 'blush' check (theme in ('blush','linen','sage','noir')),
  general_booking_url text check (general_booking_url is null or general_booking_url ~* '^https?://'),
  contact_email       text,
  contact_phone       text,
  whatsapp_number     text check (whatsapp_number is null or whatsapp_number ~ '^\d{8,15}$'),
  address             text,
  instagram_handle    text,
  tiktok_handle       text,
  website_url         text check (website_url is null or website_url ~* '^https?://'),
  published           boolean not null default false,
  is_demo             boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- One owner can have many businesses/locations (UI currently uses the first).
create index businesses_owner_idx on public.businesses(owner_user_id);

create table public.services (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  description      text not null default '' check (char_length(description) <= 500),
  price_pence      integer not null check (price_pence >= 0),
  price_from       boolean not null default false,
  currency         char(3) not null default 'GBP',
  duration_minutes integer not null check (duration_minutes between 5 and 600),
  image_url        text,
  booking_url      text check (booking_url is null or booking_url ~* '^https?://'),
  display_order    integer not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index services_business_idx on public.services(business_id, display_order);

create table public.gallery_images (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  image_url     text not null,
  caption       text not null default '' check (char_length(caption) <= 120),
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  author_name   text not null,
  rating        smallint not null check (rating between 1 and 5),
  body          text not null check (char_length(body) <= 500),
  source        text not null default '',
  is_sample     boolean not null default false,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create table public.faqs (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  question      text not null,
  answer        text not null,
  display_order integer not null default 0
);

-- Anonymous analytics: no IP, user agent or personal data.
create table public.page_events (
  id          bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id  uuid references public.services(id) on delete set null,
  event_type  text not null check (event_type in ('page_view','booking_click','social_click','contact_click')),
  target      text,
  visitor_id  uuid,
  session_id  uuid,
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index page_events_business_time_idx on public.page_events(business_id, created_at);

-- --------------------------------------------------------- public views
-- Public pages read these views, never the base tables, so owner ids and
-- unpublished content are not reachable with the anon key.

create view public.public_businesses with (security_barrier) as
  select id, name, slug, category, location, description, logo_url, cover_image_url, theme,
         general_booking_url, contact_email, contact_phone, whatsapp_number, address,
         instagram_handle, tiktok_handle, website_url, is_demo
  from public.businesses where published;

create view public.public_services with (security_barrier) as
  select s.id, s.business_id, s.name, s.description, s.price_pence, s.price_from, s.currency,
         s.duration_minutes, s.image_url, s.booking_url, s.display_order
  from public.services s join public.businesses b on b.id = s.business_id
  where b.published and s.active;

create view public.public_gallery with (security_barrier) as
  select g.id, g.business_id, g.image_url, g.caption, g.display_order
  from public.gallery_images g join public.businesses b on b.id = g.business_id where b.published;

create view public.public_reviews with (security_barrier) as
  select r.id, r.business_id, r.author_name, r.rating, r.body, r.source, r.is_sample, r.display_order
  from public.reviews r join public.businesses b on b.id = r.business_id where b.published;

create view public.public_faqs with (security_barrier) as
  select f.id, f.business_id, f.question, f.answer, f.display_order
  from public.faqs f join public.businesses b on b.id = f.business_id where b.published;

grant select on public.public_businesses, public.public_services, public.public_gallery,
  public.public_reviews, public.public_faqs to anon, authenticated;

-- ---------------------------------------------------- row level security

alter table public.businesses     enable row level security;
alter table public.services       enable row level security;
alter table public.gallery_images enable row level security;
alter table public.reviews        enable row level security;
alter table public.faqs           enable row level security;
alter table public.page_events    enable row level security;

-- Owners manage their own businesses.
create policy "owners read own businesses" on public.businesses
  for select to authenticated using (owner_user_id = auth.uid());
create policy "owners create businesses" on public.businesses
  for insert to authenticated with check (owner_user_id = auth.uid());
create policy "owners update own businesses" on public.businesses
  for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "owners delete own businesses" on public.businesses
  for delete to authenticated using (owner_user_id = auth.uid());

-- Helper: does the current user own this business?
create function public.owns_business(b uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.businesses where id = b and owner_user_id = auth.uid()) $$;

create policy "owners manage services" on public.services
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owners manage gallery" on public.gallery_images
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owners manage reviews" on public.reviews
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owners manage faqs" on public.faqs
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- Analytics: owners can read their own events. Nobody inserts directly;
-- events go through record_event() below (or a server route using the
-- service-role key, which must never be shipped to the browser).
create policy "owners read own events" on public.page_events
  for select to authenticated using (public.owns_business(business_id));
create policy "owners delete own sample events" on public.page_events
  for delete to authenticated using (public.owns_business(business_id) and is_sample);

create function public.record_event(
  p_business_id uuid, p_event_type text, p_service_id uuid default null,
  p_target text default null, p_visitor_id uuid default null, p_session_id uuid default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from businesses where id = p_business_id and published) then
    raise exception 'unknown business';
  end if;
  if p_service_id is not null and not exists (select 1 from services where id = p_service_id and business_id = p_business_id) then
    raise exception 'unknown service';
  end if;
  if p_target is not null and p_target not in ('general','service','instagram','tiktok','website','whatsapp','phone','email') then
    raise exception 'bad target';
  end if;
  insert into page_events (business_id, service_id, event_type, target, visitor_id, session_id)
  values (p_business_id, p_service_id, p_event_type, p_target, p_visitor_id, p_session_id);
end $$;
revoke all on function public.record_event from public;
grant execute on function public.record_event to anon, authenticated;

-- Storage: create a public bucket "business-images"; allow authenticated
-- users to write only under a folder named after a business they own, e.g.
--   create policy "owners upload" on storage.objects for insert to authenticated
--   with check (bucket_id = 'business-images' and public.owns_business(((storage.foldername(name))[1])::uuid));
