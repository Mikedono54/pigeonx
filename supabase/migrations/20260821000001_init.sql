-- PigeonX initial schema (spec §4.1).
-- Tables all carry created_at/updated_at; RLS is enabled in the next migration.

create extension if not exists "pgcrypto";

-- ─── enums ────────────────────────────────────────────────────────────────────

create type plan_t as enum ('free', 'pro', 'business', 'enterprise');
create type org_plan_t as enum ('business', 'enterprise');
create type member_role_t as enum ('owner', 'manager', 'staff');
create type device_kind_t as enum ('phone', 'bt_speaker', 'pigeonx_emitter', 'simulated');
create type profile_kind_t as enum ('tone', 'sweep', 'pulse', 'sample');
create type trigger_mode_t as enum ('manual', 'schedule', 'motion');
create type schedule_executor_t as enum ('device', 'reminder');
create type session_source_t as enum ('manual', 'schedule', 'remote');
create type output_kind_t as enum ('phone', 'bt_speaker', 'pigeonx_emitter', 'simulated');
create type device_status_t as enum ('online', 'offline', 'unknown');

-- ─── updated_at ───────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── profiles (one per auth user) ─────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  plan plan_t not null default 'free',
  rc_app_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── organizations ────────────────────────────────────────────────────────────

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan org_plan_t not null default 'business',
  stripe_customer_id text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role member_role_t not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index org_members_user_idx on public.org_members (user_id);
create index org_members_org_idx on public.org_members (org_id);

-- ─── locations / zones / devices ──────────────────────────────────────────────

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address text,
  timezone text not null default 'America/Los_Angeles',
  business_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index locations_org_idx on public.locations (org_id);

create table public.audio_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete cascade,
  owner_org_id uuid references public.organizations (id) on delete cascade,
  is_system boolean not null default false,
  slug text unique,
  name text not null,
  description text,
  kind profile_kind_t not null,
  params jsonb not null,
  min_plan plan_t not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audio_profiles_owner_ck check (
    (is_system and owner_user_id is null and owner_org_id is null)
    or (not is_system and (owner_user_id is not null or owner_org_id is not null))
  )
);

create index audio_profiles_owner_user_idx on public.audio_profiles (owner_user_id);
create index audio_profiles_owner_org_idx on public.audio_profiles (owner_org_id);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  name text not null,
  trigger_mode trigger_mode_t not null default 'manual',
  active_profile_id uuid references public.audio_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index zones_location_idx on public.zones (location_id);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references public.zones (id) on delete set null,
  kind device_kind_t not null,
  name text not null,
  ble_id text,
  last_seen_at timestamptz,
  status device_status_t not null default 'unknown',
  firmware text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index devices_zone_idx on public.devices (zone_id);

-- ─── schedules ────────────────────────────────────────────────────────────────

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones (id) on delete cascade,
  profile_id uuid not null references public.audio_profiles (id) on delete restrict,
  days int[] not null,
  start_time time not null,
  end_time time not null,
  enabled boolean not null default true,
  executor schedule_executor_t not null default 'reminder',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_days_ck check (
    array_length(days, 1) between 1 and 7
    and days <@ array[0, 1, 2, 3, 4, 5, 6]
  ),
  constraint schedules_window_ck check (start_time <> end_time)
);

create index schedules_zone_idx on public.schedules (zone_id);

-- ─── sessions (the proof-point log) ───────────────────────────────────────────

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references public.zones (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  profile_id uuid not null references public.audio_profiles (id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  output_kind output_kind_t not null,
  peak_freq_hz int,
  source session_source_t not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_range_ck check (ended_at is null or ended_at >= started_at)
);

create index sessions_zone_idx on public.sessions (zone_id, started_at desc);
create index sessions_user_idx on public.sessions (user_id, started_at desc);

-- ─── subscriptions (mirror of RevenueCat / Stripe) ────────────────────────────

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete cascade,
  provider text not null,
  product_id text not null,
  status text not null,
  current_period_end timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_subject_ck check (
    (user_id is not null and org_id is null) or (user_id is null and org_id is not null)
  )
);

create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_org_idx on public.subscriptions (org_id);

-- ─── updated_at triggers ──────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'organizations', 'org_members', 'locations', 'zones',
    'devices', 'audio_profiles', 'schedules', 'sessions', 'subscriptions'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t
    );
  end loop;
end;
$$;

-- ─── realtime ─────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.zones;
alter publication supabase_realtime add table public.devices;
alter publication supabase_realtime add table public.sessions;
