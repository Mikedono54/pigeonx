-- Per-user sync surface + the two read models the apps poll.
--
-- Solo (Free/Pro) accounts have no org, so they have no locations, zones or
-- devices. They still need their reminder schedules and their remembered
-- speakers to follow them between phone and web, which is what these two tables
-- are for. Org schedules stay in `schedules`; org hardware stays in `devices`.
-- Saved sounds are already per-user: that is `audio_profiles.owner_user_id`.

-- ─── user_schedules ───────────────────────────────────────────────────────────

create table public.user_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  zone_id uuid references public.zones (id) on delete set null,
  profile_id uuid not null references public.audio_profiles (id) on delete restrict,
  days int[] not null,
  start_time time not null,
  end_time time not null,
  enabled boolean not null default true,
  executor schedule_executor_t not null default 'reminder',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_schedules_days_ck check (
    array_length(days, 1) between 1 and 7
    and days <@ array[0, 1, 2, 3, 4, 5, 6]
  ),
  constraint user_schedules_window_ck check (start_time <> end_time)
);

create index user_schedules_user_idx on public.user_schedules (user_id);

-- ─── user_devices ─────────────────────────────────────────────────────────────

-- A solo account's "speakers": this phone, a remembered Bluetooth speaker, a
-- simulated emitter. No zone, no org, no firmware channel.
create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind device_kind_t not null,
  name text not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_devices_user_idx on public.user_devices (user_id);

-- ─── updated_at ───────────────────────────────────────────────────────────────

create trigger set_updated_at before update on public.user_schedules
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.user_devices
  for each row execute function public.set_updated_at();

-- ─── RLS: own rows only ───────────────────────────────────────────────────────

alter table public.user_schedules enable row level security;
alter table public.user_devices enable row level security;

grant select, insert, update, delete on public.user_schedules to authenticated;
grant select, insert, update, delete on public.user_devices to authenticated;
grant all on public.user_schedules to service_role;
grant all on public.user_devices to service_role;

create policy user_schedules_select_own on public.user_schedules
  for select to authenticated using (user_id = auth.uid());

create policy user_schedules_insert_own on public.user_schedules
  for insert to authenticated with check (user_id = auth.uid());

create policy user_schedules_update_own on public.user_schedules
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_schedules_delete_own on public.user_schedules
  for delete to authenticated using (user_id = auth.uid());

create policy user_devices_select_own on public.user_devices
  for select to authenticated using (user_id = auth.uid());

create policy user_devices_insert_own on public.user_devices
  for insert to authenticated with check (user_id = auth.uid());

create policy user_devices_update_own on public.user_devices
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_devices_delete_own on public.user_devices
  for delete to authenticated using (user_id = auth.uid());

-- ─── realtime ─────────────────────────────────────────────────────────────────

-- zones/devices/sessions joined the publication in the init migration; adding a
-- table twice is an error, so check first and only add what is missing.
do $$
declare
  t text;
begin
  foreach t in array array['zones', 'devices', 'sessions', 'user_devices']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- Realtime sends old-row identity on update/delete only when the table has a
-- replica identity; the default (primary key) is enough for these.

-- ─── zone_live_status ─────────────────────────────────────────────────────────

-- What the dashboard's location page renders: one row per zone, and whether it
-- is running right now. Security invoker, so a non-member simply gets no rows.
create or replace function public.zone_live_status(p_location_id uuid)
returns table (
  zone_id uuid,
  zone_name text,
  running boolean,
  current_session_id uuid,
  started_at timestamptz,
  profile_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    z.id,
    z.name,
    live.id is not null as running,
    live.id,
    live.started_at,
    coalesce(live_profile.name, active_profile.name)
  from public.zones z
  left join lateral (
    select s.id, s.started_at, s.profile_id
    from public.sessions s
    where s.zone_id = z.id and s.ended_at is null
    order by s.started_at desc
    limit 1
  ) live on true
  left join public.audio_profiles live_profile on live_profile.id = live.profile_id
  left join public.audio_profiles active_profile on active_profile.id = z.active_profile_id
  where z.location_id = p_location_id
  order by z.name;
$$;

-- ─── history ──────────────────────────────────────────────────────────────────

-- The caller's run log: their own sessions plus every session inside an org they
-- belong to. That "plus" is not written here — the `sessions` select policy
-- already says it, and this function runs as the caller.
create or replace function public.history(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns table (
  id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  minutes numeric,
  output_kind output_kind_t,
  peak_freq_hz int,
  source session_source_t,
  user_id uuid,
  profile_id uuid,
  profile_name text,
  zone_id uuid,
  zone_name text,
  location_id uuid,
  location_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.id,
    s.started_at,
    s.ended_at,
    round(extract(epoch from (coalesce(s.ended_at, now()) - s.started_at)) / 60.0, 2),
    s.output_kind,
    s.peak_freq_hz,
    s.source,
    s.user_id,
    s.profile_id,
    ap.name,
    s.zone_id,
    z.name,
    l.id,
    l.name
  from public.sessions s
  left join public.audio_profiles ap on ap.id = s.profile_id
  left join public.zones z on z.id = s.zone_id
  left join public.locations l on l.id = z.location_id
  where s.started_at >= p_from
    and s.started_at < p_to
  order by s.started_at desc;
$$;

grant execute on function public.zone_live_status(uuid) to authenticated;
grant execute on function public.history(timestamptz, timestamptz) to authenticated;
