-- Protection plans (alive-product spec, 2026-08-24).
--
-- A plan is the third leg of Place + Target + Plan: which sounds run, in what
-- order, for how long, out of which speaker, during which hours and days. The
-- app builds the defaults (see `recommendPlan` in @pigeonx/core) — nothing is
-- seeded here, because a recommendation that arrives as a database row reads to
-- the user as a promise, and the spec is explicit that recommendations are
-- recommendations.
--
-- `sound_ids` is a uuid[] of `audio_profiles.id`. Postgres cannot enforce a
-- foreign key from an array element, and we do not want it to: a plan that
-- references a sound the user later deleted should degrade to "that sound is
-- gone", not refuse the delete or silently rewrite the rotation.

create table public.protection_plans (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete cascade,
  owner_org_id uuid references public.organizations (id) on delete cascade,
  user_place_id uuid references public.user_places (id) on delete set null,
  zone_id uuid references public.zones (id) on delete set null,
  name text not null,
  target bird_target_t not null default 'unsure',
  sound_ids uuid[] not null default '{}',
  randomize_order boolean not null default true,
  interval_seconds int not null default 0,
  session_minutes int not null default 15,
  output output_kind_t not null default 'phone',
  volume numeric not null default 0.85,
  quiet_start time,
  quiet_end time,
  days int[] not null default '{1,2,3,4,5,6,7}',
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Exactly one owner. A plan with neither belongs to nobody and would be
  -- invisible under RLS; a plan with both has two answers to "who may edit it".
  constraint protection_plans_owner_ck check (
    (owner_user_id is not null) <> (owner_org_id is not null)
  ),
  constraint protection_plans_name_ck check (btrim(name) <> ''),
  constraint protection_plans_volume_ck check (volume >= 0 and volume <= 1),
  constraint protection_plans_interval_ck check (interval_seconds >= 0 and interval_seconds <= 86400),
  constraint protection_plans_minutes_ck check (session_minutes > 0 and session_minutes <= 1440),
  constraint protection_plans_range_ck check (
    starts_on is null or ends_on is null or ends_on >= starts_on
  )
);

create index protection_plans_owner_user_idx on public.protection_plans (owner_user_id);
create index protection_plans_owner_org_idx on public.protection_plans (owner_org_id);
create index protection_plans_place_idx on public.protection_plans (user_place_id);
create index protection_plans_zone_idx on public.protection_plans (zone_id);

create trigger set_updated_at before update on public.protection_plans
  for each row execute function public.set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

-- Solo: own rows. Org: every member reads, managers and owners write — the same
-- split `schedules` already uses, because a plan is a schedule's content and
-- staff who could rewrite one could quietly turn protection off.
alter table public.protection_plans enable row level security;

grant select, insert, update, delete on public.protection_plans to authenticated;
grant all on public.protection_plans to service_role;

create policy protection_plans_select on public.protection_plans
  for select to authenticated
  using (
    owner_user_id = auth.uid()
    or (owner_org_id is not null and public.is_org_member(owner_org_id, 'staff'))
  );

create policy protection_plans_insert on public.protection_plans
  for insert to authenticated
  with check (
    owner_user_id = auth.uid()
    or (owner_org_id is not null and public.is_org_member(owner_org_id, 'manager'))
  );

create policy protection_plans_update on public.protection_plans
  for update to authenticated
  using (
    owner_user_id = auth.uid()
    or (owner_org_id is not null and public.is_org_member(owner_org_id, 'manager'))
  )
  with check (
    owner_user_id = auth.uid()
    or (owner_org_id is not null and public.is_org_member(owner_org_id, 'manager'))
  );

create policy protection_plans_delete on public.protection_plans
  for delete to authenticated
  using (
    owner_user_id = auth.uid()
    or (owner_org_id is not null and public.is_org_member(owner_org_id, 'manager'))
  );
