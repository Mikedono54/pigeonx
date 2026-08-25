-- Session results (alive-product spec, 2026-08-24).
--
-- "Did the birds leave?" — Yes / Some left / Not yet / I could not tell. This is
-- the only effectiveness data PigeonX has, and it is the only kind it is allowed
-- to show. There is no detection, no bird counting, no inferred success: every
-- number the app puts on screen traces back to a person tapping one of four
-- buttons about a run they watched.

create type session_result_t as enum ('left', 'some_left', 'not_yet', 'unknown');

alter table public.sessions
  add column result session_result_t,
  add column plan_id uuid references public.protection_plans (id) on delete set null,
  add column user_place_id uuid references public.user_places (id) on delete set null;

create index sessions_place_idx on public.sessions (user_place_id, started_at desc);
create index sessions_plan_idx on public.sessions (plan_id);

comment on column public.sessions.result is
  'Reported by the person who ran the session. NULL means unreported — which is not the same as ''unknown'', where they told us they could not tell.';

-- ─── start_session gains the plan and the place ───────────────────────────────

-- Same function, two more optional arguments, appended so every existing named
-- call still resolves. PostgREST passes arguments by name.
drop function if exists public.start_session(uuid, uuid, uuid, output_kind_t, session_source_t);

create or replace function public.start_session(
  p_zone_id uuid,
  p_profile_id uuid,
  p_device_id uuid default null,
  p_output output_kind_t default 'phone',
  p_source session_source_t default 'manual',
  p_plan_id uuid default null,
  p_user_place_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.sessions (
    zone_id, user_id, device_id, profile_id, output_kind, peak_freq_hz, source,
    plan_id, user_place_id
  )
  values (
    p_zone_id,
    auth.uid(),
    p_device_id,
    p_profile_id,
    p_output,
    public.profile_peak_freq_hz(p_profile_id),
    p_source,
    p_plan_id,
    p_user_place_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- ─── report_session_result ────────────────────────────────────────────────────

-- Only the person who ran the session may say how it went, and they may change
-- their mind: the post-session prompt is easy to mistap, and a wrong answer that
-- cannot be corrected would poison the place's summary forever.
create or replace function public.report_session_result(
  p_session_id uuid,
  p_result session_result_t
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  touched int;
begin
  if auth.uid() is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;

  update public.sessions
  set result = p_result
  where id = p_session_id and user_id = auth.uid();

  get diagnostics touched = row_count;
  if touched = 0 then
    raise exception 'only the person who ran a session may report its result'
      using errcode = '42501';
  end if;
end;
$$;

-- ─── feedback ─────────────────────────────────────────────────────────────────

-- What the place's summary card is allowed to say. Counts come from reported
-- results only; `best_plan_name` is the plan with the most "they left" reports,
-- ties broken by how many runs it has been reported on, and NULL when nobody has
-- reported anything yet. Security invoker, so the numbers are computed over the
-- sessions the caller can already see and nothing else.

create or replace function public.place_feedback(p_user_place_id uuid)
returns table (
  sessions_total int,
  sessions_with_result int,
  left_count int,
  some_left_count int,
  not_yet_count int,
  best_plan_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  with mine as (
    select s.result, s.plan_id
    from public.sessions s
    where s.user_place_id = p_user_place_id
  ),
  best as (
    select pp.name
    from mine
    join public.protection_plans pp on pp.id = mine.plan_id
    where mine.result is not null
    group by pp.id, pp.name
    order by count(*) filter (where mine.result = 'left') desc, count(*) desc
    limit 1
  )
  select
    (select count(*) from mine)::int,
    (select count(*) from mine where result is not null)::int,
    (select count(*) from mine where result = 'left')::int,
    (select count(*) from mine where result = 'some_left')::int,
    (select count(*) from mine where result = 'not_yet')::int,
    (select name from best);
$$;

create or replace function public.zone_feedback(p_zone_id uuid)
returns table (
  sessions_total int,
  sessions_with_result int,
  left_count int,
  some_left_count int,
  not_yet_count int,
  best_plan_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  with mine as (
    select s.result, s.plan_id
    from public.sessions s
    where s.zone_id = p_zone_id
  ),
  best as (
    select pp.name
    from mine
    join public.protection_plans pp on pp.id = mine.plan_id
    where mine.result is not null
    group by pp.id, pp.name
    order by count(*) filter (where mine.result = 'left') desc, count(*) desc
    limit 1
  )
  select
    (select count(*) from mine)::int,
    (select count(*) from mine where result is not null)::int,
    (select count(*) from mine where result = 'left')::int,
    (select count(*) from mine where result = 'some_left')::int,
    (select count(*) from mine where result = 'not_yet')::int,
    (select name from best);
$$;

-- ─── history now carries the result, the plan and the place ───────────────────

-- The return type changes, so the old function has to go first.
drop function if exists public.history(timestamptz, timestamptz);

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
  result session_result_t,
  user_id uuid,
  profile_id uuid,
  profile_name text,
  plan_id uuid,
  plan_name text,
  zone_id uuid,
  zone_name text,
  location_id uuid,
  location_name text,
  user_place_id uuid,
  place_name text
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
    s.result,
    s.user_id,
    s.profile_id,
    ap.name,
    s.plan_id,
    pp.name,
    s.zone_id,
    z.name,
    l.id,
    l.name,
    s.user_place_id,
    coalesce(up.name, z.name)
  from public.sessions s
  left join public.audio_profiles ap on ap.id = s.profile_id
  left join public.protection_plans pp on pp.id = s.plan_id
  left join public.user_places up on up.id = s.user_place_id
  left join public.zones z on z.id = s.zone_id
  left join public.locations l on l.id = z.location_id
  where s.started_at >= p_from
    and s.started_at < p_to
  order by s.started_at desc;
$$;

grant execute on function public.start_session(uuid, uuid, uuid, output_kind_t, session_source_t, uuid, uuid) to authenticated;
grant execute on function public.report_session_result(uuid, session_result_t) to authenticated;
grant execute on function public.place_feedback(uuid) to authenticated;
grant execute on function public.zone_feedback(uuid) to authenticated;
grant execute on function public.history(timestamptz, timestamptz) to authenticated;
