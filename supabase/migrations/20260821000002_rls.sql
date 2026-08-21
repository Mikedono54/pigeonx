-- PigeonX row-level security (spec §4.1).
-- Roles: staff  → read org rows, start sessions, switch a zone's active profile
--        manager→ + zones, devices, schedules, org audio profiles
--        owner  → + organization settings, members, billing

-- ─── helpers ──────────────────────────────────────────────────────────────────

create or replace function public.role_rank(r member_role_t)
returns int
language sql
immutable
as $$
  select case r when 'staff' then 1 when 'manager' then 2 when 'owner' then 3 end;
$$;

create or replace function public.is_org_member(org uuid, min_role member_role_t default 'staff')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = org
      and m.user_id = auth.uid()
      and public.role_rank(m.role) >= public.role_rank(min_role)
  );
$$;

create or replace function public.location_org(loc uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.org_id from public.locations l where l.id = loc;
$$;

create or replace function public.zone_org(zone uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.org_id
  from public.zones z
  join public.locations l on l.id = z.location_id
  where z.id = zone;
$$;

create or replace function public.device_org(device uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.zone_org(d.zone_id) from public.devices d where d.id = device;
$$;

grant execute on function public.is_org_member(uuid, member_role_t) to authenticated;
grant execute on function public.zone_org(uuid) to authenticated;
grant execute on function public.location_org(uuid) to authenticated;
grant execute on function public.device_org(uuid) to authenticated;

-- ─── enable RLS everywhere ────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.locations enable row level security;
alter table public.zones enable row level security;
alter table public.devices enable row level security;
alter table public.audio_profiles enable row level security;
alter table public.schedules enable row level security;
alter table public.sessions enable row level security;
alter table public.subscriptions enable row level security;

-- ─── profiles: own row only ───────────────────────────────────────────────────

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ─── organizations ────────────────────────────────────────────────────────────

create policy organizations_select_member on public.organizations
  for select to authenticated using (public.is_org_member(id, 'staff'));

create policy organizations_update_owner on public.organizations
  for update to authenticated
  using (public.is_org_member(id, 'owner'))
  with check (public.is_org_member(id, 'owner'));

-- ─── org_members: members see the roster, owners manage it ────────────────────

create policy org_members_select_member on public.org_members
  for select to authenticated using (public.is_org_member(org_id, 'staff'));

create policy org_members_insert_owner on public.org_members
  for insert to authenticated with check (public.is_org_member(org_id, 'owner'));

create policy org_members_update_owner on public.org_members
  for update to authenticated
  using (public.is_org_member(org_id, 'owner'))
  with check (public.is_org_member(org_id, 'owner'));

create policy org_members_delete_owner on public.org_members
  for delete to authenticated using (public.is_org_member(org_id, 'owner'));

-- ─── locations: read by members, written by managers ──────────────────────────

create policy locations_select_member on public.locations
  for select to authenticated using (public.is_org_member(org_id, 'staff'));

create policy locations_insert_manager on public.locations
  for insert to authenticated with check (public.is_org_member(org_id, 'manager'));

create policy locations_update_manager on public.locations
  for update to authenticated
  using (public.is_org_member(org_id, 'manager'))
  with check (public.is_org_member(org_id, 'manager'));

create policy locations_delete_owner on public.locations
  for delete to authenticated using (public.is_org_member(org_id, 'owner'));

-- ─── zones: staff may switch the active profile, managers may do the rest ─────

create policy zones_select_member on public.zones
  for select to authenticated
  using (public.is_org_member(public.location_org(location_id), 'staff'));

create policy zones_insert_manager on public.zones
  for insert to authenticated
  with check (public.is_org_member(public.location_org(location_id), 'manager'));

create policy zones_update_staff on public.zones
  for update to authenticated
  using (public.is_org_member(public.location_org(location_id), 'staff'))
  with check (public.is_org_member(public.location_org(location_id), 'staff'));

create policy zones_delete_manager on public.zones
  for delete to authenticated
  using (public.is_org_member(public.location_org(location_id), 'manager'));

-- RLS cannot express "this role may change only this column", so a trigger holds
-- staff to `active_profile_id`. Service-role writes (auth.uid() is null) skip it.
create or replace function public.zones_staff_column_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_org_member(public.location_org(old.location_id), 'manager') then
    return new;
  end if;
  if new.location_id is distinct from old.location_id
     or new.name is distinct from old.name
     or new.trigger_mode is distinct from old.trigger_mode then
    raise exception 'staff may only change a zone''s active profile'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger zones_staff_column_guard
  before update on public.zones
  for each row execute function public.zones_staff_column_guard();

-- ─── devices: read by members, written by managers ────────────────────────────

create policy devices_select_member on public.devices
  for select to authenticated using (public.is_org_member(public.zone_org(zone_id), 'staff'));

create policy devices_insert_manager on public.devices
  for insert to authenticated with check (public.is_org_member(public.zone_org(zone_id), 'manager'));

create policy devices_update_manager on public.devices
  for update to authenticated
  using (public.is_org_member(public.zone_org(zone_id), 'manager'))
  with check (public.is_org_member(public.zone_org(zone_id), 'manager'));

create policy devices_delete_manager on public.devices
  for delete to authenticated using (public.is_org_member(public.zone_org(zone_id), 'manager'));

-- ─── audio_profiles: system rows are public to signed-in users ────────────────

create policy audio_profiles_select on public.audio_profiles
  for select to authenticated
  using (
    is_system
    or owner_user_id = auth.uid()
    or (owner_org_id is not null and public.is_org_member(owner_org_id, 'staff'))
  );

create policy audio_profiles_insert_own on public.audio_profiles
  for insert to authenticated
  with check (
    not is_system
    and (
      owner_user_id = auth.uid()
      or (owner_org_id is not null and public.is_org_member(owner_org_id, 'manager'))
    )
  );

create policy audio_profiles_update_own on public.audio_profiles
  for update to authenticated
  using (
    owner_user_id = auth.uid()
    or (owner_org_id is not null and public.is_org_member(owner_org_id, 'manager'))
  )
  with check (
    not is_system
    and (
      owner_user_id = auth.uid()
      or (owner_org_id is not null and public.is_org_member(owner_org_id, 'manager'))
    )
  );

create policy audio_profiles_delete_own on public.audio_profiles
  for delete to authenticated
  using (
    owner_user_id = auth.uid()
    or (owner_org_id is not null and public.is_org_member(owner_org_id, 'manager'))
  );

-- ─── schedules: read by members, written by managers ──────────────────────────

create policy schedules_select_member on public.schedules
  for select to authenticated using (public.is_org_member(public.zone_org(zone_id), 'staff'));

create policy schedules_insert_manager on public.schedules
  for insert to authenticated with check (public.is_org_member(public.zone_org(zone_id), 'manager'));

create policy schedules_update_manager on public.schedules
  for update to authenticated
  using (public.is_org_member(public.zone_org(zone_id), 'manager'))
  with check (public.is_org_member(public.zone_org(zone_id), 'manager'));

create policy schedules_delete_manager on public.schedules
  for delete to authenticated using (public.is_org_member(public.zone_org(zone_id), 'manager'));

-- ─── sessions: own runs, plus everything inside your org ──────────────────────

create policy sessions_select on public.sessions
  for select to authenticated
  using (
    user_id = auth.uid()
    or (zone_id is not null and public.is_org_member(public.zone_org(zone_id), 'staff'))
  );

create policy sessions_insert_own on public.sessions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (zone_id is null or public.is_org_member(public.zone_org(zone_id), 'staff'))
  );

create policy sessions_update_own on public.sessions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── subscriptions: read-only for the subject; writes are service-role only ───

create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (
    user_id = auth.uid()
    or (org_id is not null and public.is_org_member(org_id, 'owner'))
  );
