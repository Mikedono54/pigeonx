# weekly-report

Freezes last week's numbers for every location into `location_reports` and
builds the summary email. Sending is a stub: it logs the exact subject and body
it would send, because there is no email provider yet.

    POST https://wnmrcngjsdlyddrdiqtj.supabase.co/functions/v1/weekly-report
    Authorization: Bearer <service-role key>

    {}                                  # last complete week, every location
    { "week_start": "2026-08-10" }      # a specific week
    { "location_id": "…" }              # one location
    { "force": true }                   # recompute a week already stored

    → 200 { "ok": true, "week_start": "2026-08-10",
            "locations": [ { "location_id": "…", "sessions": 24, "stored": true } ] }

## Authentication

Keeps JWT verification. The scheduler supplies the service-role key, which is
also what lets the function read every org's locations. Do not call it from a
browser: that would put the service-role key in a client.

## What a week is

Monday to Sunday, UTC. A hospitality week ends on Sunday, so Sunday closes a
week rather than opening one. With no `week_start` the function reports the last
week that has actually finished, never a partial current one.

Existing rows are left alone unless `force` is set, so a re-run after a failure
is safe and a stored report keeps saying what it said when it was sent.

## Secrets

None of its own. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by
the platform. An email provider key (Resend, Postmark, SES) gets added here when
the stub is replaced.

## Scheduling

Two options; pick one, not both.

### pg_cron (runs inside the database)

Enable the extensions once in the SQL editor:

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
```

Store the service-role key in Vault rather than pasting it into the job body:

```sql
select vault.create_secret(
  '<service-role key>', 'weekly_report_key', 'service-role key for weekly-report'
);
```

Then schedule it for 07:00 UTC every Monday:

```sql
select cron.schedule(
  'pigeonx-weekly-report',
  '0 7 * * 1',
  $$
  select net.http_post(
    url     := 'https://wnmrcngjsdlyddrdiqtj.supabase.co/functions/v1/weekly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'weekly_report_key'
      )
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

Check it with `select * from cron.job;` and
`select * from cron.job_run_details order by start_time desc limit 10;`.
Remove it with `select cron.unschedule('pigeonx-weekly-report');`.

### Supabase scheduled functions (dashboard)

Dashboard → Edge Functions → weekly-report → Schedules → `0 7 * * 1`. The
platform supplies the authorization header. Simpler, and there is no key to
rotate; pg_cron is the fallback if a schedule needs to live in migrations.

The cron line is also recorded as a comment in `supabase/config.toml` so it is
not only documented here.

## Wording

Subject and body come from `weeklyReportEmail` in `../_shared/reports.ts`,
mirrored from `packages/core/src/reports.ts` and covered by
`packages/core/src/reports.test.ts` — including a test that there are no em
dashes and that a week with no runs says so plainly rather than showing zeros.

## Deploy

    SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) \
      npx supabase@latest functions deploy weekly-report \
      --project-ref wnmrcngjsdlyddrdiqtj
