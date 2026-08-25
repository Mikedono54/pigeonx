-- Places and target species (alive-product spec, 2026-08-24).
--
-- The product's core model is Place + Target bird + Protection plan. Org
-- accounts already had a place: `locations`. Solo accounts had none — a Free
-- user could run a sound but had nowhere to say *what* they were protecting or
-- *which* birds were the problem. `user_places` is that missing row, and the
-- same personalization columns are bolted onto `locations` so a Business
-- location answers the same questions.
--
-- Free = one place. That limit lives in the app, not here: the DB has no
-- opinion about how many rows a plan may own, and a downgrade must never make
-- an existing row unreadable.

-- ─── enums ────────────────────────────────────────────────────────────────────

-- Exact species groups, in the onboarding's own words. `mixed_small` is the
-- catch-all for starling/sparrow/finch flocks; `unsure` is a first-class answer
-- because most people genuinely do not know, and guessing wrong is worse than
-- saying so.
create type bird_target_t as enum (
  'pigeons',
  'gulls',
  'starlings',
  'corvids',
  'mixed_small',
  'unsure'
);

-- What is being protected. Drives the "Recommended for <place>" sound section
-- and the placement help.
create type place_kind_t as enum (
  'balcony',
  'roof',
  'dock',
  'storefront',
  'warehouse',
  'parking',
  'garden',
  'farm',
  'custom'
);

-- ─── locations gain the same answers ──────────────────────────────────────────

alter table public.locations
  add column kind place_kind_t,
  add column target bird_target_t,
  add column area_size text,
  add column people_nearby boolean not null default true,
  add column limit_audible boolean not null default false,
  add column birds_active text;

alter table public.locations
  add constraint locations_area_size_ck
  check (area_size is null or area_size in ('small', 'medium', 'large'));

comment on column public.locations.birds_active is
  'Free text, in the user''s words: "early morning", "after lunch", "all day".';

-- ─── user_places ──────────────────────────────────────────────────────────────

-- A solo account's place. No org, no location, no zone — just the answers the
-- onboarding asked for, keyed to the person who gave them.
create table public.user_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind place_kind_t,
  target bird_target_t,
  area_size text,
  people_nearby boolean not null default true,
  limit_audible boolean not null default false,
  birds_active text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_places_area_size_ck
    check (area_size is null or area_size in ('small', 'medium', 'large')),
  constraint user_places_name_ck check (btrim(name) <> '')
);

create index user_places_user_idx on public.user_places (user_id, created_at);

create trigger set_updated_at before update on public.user_places
  for each row execute function public.set_updated_at();

-- ─── RLS: own rows only ───────────────────────────────────────────────────────

alter table public.user_places enable row level security;

grant select, insert, update, delete on public.user_places to authenticated;
grant all on public.user_places to service_role;

create policy user_places_select_own on public.user_places
  for select to authenticated using (user_id = auth.uid());

create policy user_places_insert_own on public.user_places
  for insert to authenticated with check (user_id = auth.uid());

create policy user_places_update_own on public.user_places
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_places_delete_own on public.user_places
  for delete to authenticated using (user_id = auth.uid());
