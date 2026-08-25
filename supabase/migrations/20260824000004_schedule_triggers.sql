-- Schedule triggers (alive-product spec, 2026-08-24).
--
-- A schedule can now start at a clock time, at sunrise or at sunset, with an
-- offset ("30 minutes before sunrise" is when pigeons come back to a ledge).
--
-- Sunrise and sunset are computed on the device, from its own location and
-- clock, and never stored: the DB holds the *intent* ("sunrise minus 30"), not a
-- timestamp that would be wrong the next morning and wrong all winter. A row
-- with trigger = 'sunrise' keeps `start_time` as the fallback the app shows
-- before it has a location fix.

create type schedule_trigger_t as enum ('time', 'sunrise', 'sunset');

alter table public.schedules
  add column "trigger" schedule_trigger_t not null default 'time',
  add column offset_minutes int not null default 0,
  add column plan_id uuid references public.protection_plans (id) on delete set null,
  add column quiet_start time,
  add column quiet_end time;

alter table public.user_schedules
  add column "trigger" schedule_trigger_t not null default 'time',
  add column offset_minutes int not null default 0,
  add column plan_id uuid references public.protection_plans (id) on delete set null,
  add column quiet_start time,
  add column quiet_end time;

-- ±12 h covers "two hours before sunrise" and nothing absurd enough to be a typo.
alter table public.schedules
  add constraint schedules_offset_ck check (offset_minutes between -720 and 720);

alter table public.user_schedules
  add constraint user_schedules_offset_ck check (offset_minutes between -720 and 720);

comment on column public.schedules.offset_minutes is
  'Minutes relative to the trigger. Negative is before: -30 with trigger = ''sunrise'' means half an hour before sunrise. Ignored when trigger = ''time''.';

comment on column public.user_schedules.offset_minutes is
  'Minutes relative to the trigger. Negative is before. Ignored when trigger = ''time''.';
