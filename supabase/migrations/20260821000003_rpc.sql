-- PigeonX helper RPCs (spec §4.1). All run as the caller, so RLS still applies.

-- The org switcher's data source.
create or replace function public.my_orgs()
returns table (id uuid, name text, plan org_plan_t, role member_role_t)
language sql
stable
security invoker
set search_path = public
as $$
  select o.id, o.name, o.plan, m.role
  from public.organizations o
  join public.org_members m on m.org_id = o.id and m.user_id = auth.uid()
  order by o.name;
$$;

-- The peak frequency a profile emits, derived from its params (mirrors
-- packages/core/src/profiles.ts `peakFreqHz`).
create or replace function public.profile_peak_freq_hz(p_profile_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case ap.kind
    when 'tone' then (ap.params ->> 'freqHz')::numeric
    when 'pulse' then (ap.params ->> 'freqHz')::numeric
    when 'sweep' then greatest((ap.params ->> 'fromHz')::numeric, (ap.params ->> 'toHz')::numeric)
    when 'sample' then 8000
  end::int
  from public.audio_profiles ap
  where ap.id = p_profile_id;
$$;

-- Start a run. Returns the new session id.
create or replace function public.start_session(
  p_zone_id uuid,
  p_profile_id uuid,
  p_device_id uuid default null,
  p_output output_kind_t default 'phone',
  p_source session_source_t default 'manual'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.sessions (zone_id, user_id, device_id, profile_id, output_kind, peak_freq_hz, source)
  values (
    p_zone_id,
    auth.uid(),
    p_device_id,
    p_profile_id,
    p_output,
    public.profile_peak_freq_hz(p_profile_id),
    p_source
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Close a run. Returns the session's duration in minutes.
create or replace function public.end_session(p_session_id uuid)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  minutes numeric;
begin
  update public.sessions
  set ended_at = now()
  where id = p_session_id and ended_at is null
  returning round(extract(epoch from (ended_at - started_at)) / 60.0, 2) into minutes;

  return minutes;
end;
$$;

-- Per-day activity for one zone.
create or replace function public.zone_activity(
  p_zone_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns table (day date, sessions int, total_minutes numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (s.started_at at time zone 'UTC')::date as day,
    count(*)::int as sessions,
    round(
      sum(extract(epoch from (coalesce(s.ended_at, now()) - s.started_at)) / 60.0)::numeric,
      2
    ) as total_minutes
  from public.sessions s
  where s.zone_id = p_zone_id
    and s.started_at >= p_from
    and s.started_at < p_to
  group by 1
  order by 1;
$$;

-- One week of coverage for a location — the weekly report's payload.
create or replace function public.location_report(p_location_id uuid, p_week_start date)
returns table (sessions int, total_minutes numeric, zones_active int)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(s.id)::int as sessions,
    coalesce(
      round(
        sum(extract(epoch from (coalesce(s.ended_at, now()) - s.started_at)) / 60.0)::numeric,
        2
      ),
      0
    ) as total_minutes,
    count(distinct s.zone_id)::int as zones_active
  from public.zones z
  left join public.sessions s
    on s.zone_id = z.id
   and s.started_at >= p_week_start::timestamptz
   and s.started_at < (p_week_start + 7)::timestamptz
  where z.location_id = p_location_id;
$$;

grant execute on function public.my_orgs() to authenticated;
grant execute on function public.profile_peak_freq_hz(uuid) to authenticated;
grant execute on function public.start_session(uuid, uuid, uuid, output_kind_t, session_source_t) to authenticated;
grant execute on function public.end_session(uuid) to authenticated;
grant execute on function public.zone_activity(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.location_report(uuid, date) to authenticated;
