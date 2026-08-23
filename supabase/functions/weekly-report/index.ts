/**
 * Per-location weekly summary. Runs on a schedule (see README), computes last
 * week's numbers with `location_report()` and freezes them in
 * `location_reports`. Sending is a stub that logs: there is no email provider
 * yet, and inventing one now would be a guess.
 *
 * Keeps JWT verification — the scheduler calls it with the service-role key.
 */

import { json, preflight } from '../_shared/http.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { lastCompleteWeekStart, weekEnd, weeklyReportEmail } from '../_shared/reports.ts';

interface Body {
  /** `YYYY-MM-DD`, the Monday of the week to report. Defaults to last week. */
  week_start?: string;
  /** Limit the run to one location. Defaults to every location. */
  location_id?: string;
  /** Recompute a week that was already stored. */
  force?: boolean;
}

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'method not allowed' }, 405);
  }

  let body: Body = {};
  if (req.method === 'POST') {
    try {
      body = (await req.json()) as Body;
    } catch {
      body = {};
    }
  }

  const weekStart = body.week_start ?? lastCompleteWeekStart();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return json({ error: 'week_start must be YYYY-MM-DD' }, 400);
  }

  const db = serviceClient();

  let query = db.from('locations').select('id, name, org_id, timezone');
  if (body.location_id) query = query.eq('id', body.location_id);

  const { data: locations, error } = await query;
  if (error) {
    console.error('weekly-report: could not list locations', error.message);
    return json({ error: 'could not list locations' }, 500);
  }

  const results: Array<{ location_id: string; sessions: number; stored: boolean }> = [];

  for (const location of locations ?? []) {
    const report = await db.rpc('location_report', {
      p_location_id: location.id,
      p_week_start: weekStart,
    });

    if (report.error) {
      console.error(`weekly-report: ${location.id} failed: ${report.error.message}`);
      continue;
    }

    const row = Array.isArray(report.data) ? report.data[0] : report.data;
    const data = {
      week_start: weekStart,
      week_end: weekEnd(weekStart),
      location_name: location.name,
      sessions: Number(row?.sessions ?? 0),
      total_minutes: Number(row?.total_minutes ?? 0),
      zones_active: Number(row?.zones_active ?? 0),
    };

    const stored = await db.from('location_reports').upsert(
      { location_id: location.id, week_start: weekStart, data },
      {
        onConflict: 'location_id,week_start',
        ignoreDuplicates: !body.force,
      },
    );

    if (stored.error) {
      console.error(`weekly-report: storing ${location.id} failed: ${stored.error.message}`);
      continue;
    }

    await sendReportEmail(db, location.org_id, data);
    results.push({ location_id: location.id, sessions: data.sessions, stored: true });
  }

  console.log(`weekly-report: week of ${weekStart}, ${results.length} location(s)`);
  return json({ ok: true, week_start: weekStart, locations: results });
});

/**
 * Stub sender. It builds the real subject and body so the wording is exercised
 * every run, then logs instead of sending. Swap the console.log for a provider
 * call when one exists; nothing else here has to change.
 */
async function sendReportEmail(
  db: ReturnType<typeof serviceClient>,
  orgId: string,
  data: Parameters<typeof weeklyReportEmail>[0],
): Promise<void> {
  const { data: org } = await db
    .from('organizations')
    .select('contact_email')
    .eq('id', orgId)
    .maybeSingle();

  const { subject, body } = weeklyReportEmail(data);
  const to = org?.contact_email ?? '(no contact email on the organization)';

  console.log(`weekly-report: would email ${to}\nSubject: ${subject}\n\n${body}`);
}
