-- Stored weekly summaries, written by the `weekly-report` edge function.
--
-- `location_report(location_id, week_start)` computes the numbers live; this
-- table freezes them so a report stays what it said at the time it was sent,
-- even after sessions are edited or a location is reorganised.

create table public.location_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  week_start date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, week_start)
);

create index location_reports_location_idx
  on public.location_reports (location_id, week_start desc);

create trigger set_updated_at before update on public.location_reports
  for each row execute function public.set_updated_at();

alter table public.location_reports enable row level security;

grant select on public.location_reports to authenticated;
grant all on public.location_reports to service_role;

-- Members read their own location's reports. Writes are service-role only: the
-- function that generates them holds the key, no client should be able to
-- rewrite history.
create policy location_reports_select_member on public.location_reports
  for select to authenticated
  using (public.is_org_member(public.location_org(location_id), 'staff'));
