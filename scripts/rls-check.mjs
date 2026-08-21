#!/usr/bin/env node
/**
 * RLS verification against the live PigeonX project.
 *
 * No Docker locally, so instead of `supabase test db` this script drives the
 * real API: it provisions two orgs and two users with the service-role key,
 * then re-runs every assertion through anon-key clients signed in as each user.
 *
 *   node scripts/rls-check.mjs
 *
 * Exits non-zero if any assertion fails. Test rows and users are removed at the
 * end, pass or fail.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = fileURLToPath(new URL('..', import.meta.url));

function loadEnv() {
  const raw = readFileSync(new URL('.env', `file://${root}`), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const URL_ = process.env.SUPABASE_URL ?? env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !ANON || !SERVICE) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}

const SYSTEM_PROFILE_18K = '00000000-0000-0000-0000-000000000001';
const SYSTEM_PROFILE_PULSE = '00000000-0000-0000-0000-000000000002';

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

let failures = 0;
function check(name, ok, detail = '') {
  if (ok) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** A write that RLS blocks shows up either as an error or as zero rows touched. */
const blocked = ({ error, data }) => Boolean(error) || !data || data.length === 0;

const stamp = Date.now();
const created = { users: [], orgs: [] };

async function makeUser(tag) {
  const email = `rlscheck+${tag}.${stamp}@pigeonx.test`;
  const password = `Pigeon!${stamp}${tag}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser(${tag}): ${error.message}`);
  created.users.push(data.user.id);

  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(`signIn(${tag}): ${signIn.error.message}`);
  return { id: data.user.id, email, client };
}

async function makeOrg(name, ownerId, role) {
  const org = await admin
    .from('organizations')
    .insert({ name, plan: 'business', contact_email: `${name}@pigeonx.test` })
    .select('id')
    .single();
  if (org.error) throw new Error(`insert org ${name}: ${org.error.message}`);
  created.orgs.push(org.data.id);

  const member = await admin
    .from('org_members')
    .insert({ org_id: org.data.id, user_id: ownerId, role });
  if (member.error) throw new Error(`insert member ${name}: ${member.error.message}`);

  const loc = await admin
    .from('locations')
    .insert({ org_id: org.data.id, name: `${name} HQ`, timezone: 'America/Los_Angeles' })
    .select('id')
    .single();
  if (loc.error) throw new Error(`insert location ${name}: ${loc.error.message}`);

  const zone = await admin
    .from('zones')
    .insert({ location_id: loc.data.id, name: `${name} Patio` })
    .select('id')
    .single();
  if (zone.error) throw new Error(`insert zone ${name}: ${zone.error.message}`);

  return { id: org.data.id, locationId: loc.data.id, zoneId: zone.data.id };
}

async function cleanup() {
  for (const id of created.orgs) await admin.from('organizations').delete().eq('id', id);
  for (const id of created.users) {
    await admin.from('sessions').delete().eq('user_id', id);
    await admin.auth.admin.deleteUser(id);
  }
}

async function main() {
  const A = await makeUser('a');
  const B = await makeUser('b');
  const org1 = await makeOrg(`rlscheck-org1-${stamp}`, A.id, 'owner');
  const org2 = await makeOrg(`rlscheck-org2-${stamp}`, B.id, 'staff');

  // ── system profiles are readable by every signed-in user ────────────────────
  for (const [tag, user] of [
    ['A', A],
    ['B', B],
  ]) {
    const r = await user.client.from('audio_profiles').select('id').eq('is_system', true);
    check(
      `${tag} reads the 9 system profiles`,
      !r.error && r.data?.length === 9,
      r.error?.message ?? `got ${r.data?.length}`,
    );
  }

  // ── own-row access ─────────────────────────────────────────────────────────
  const ownProfile = await A.client.from('profiles').select('id, plan');
  check(
    'A sees exactly one profile row (its own, auto-created on signup)',
    !ownProfile.error && ownProfile.data?.length === 1 && ownProfile.data[0].id === A.id,
    ownProfile.error?.message ?? `got ${ownProfile.data?.length}`,
  );

  // ── cross-org isolation ────────────────────────────────────────────────────
  const aOrg2Zones = await A.client.from('zones').select('id').eq('id', org2.zoneId);
  check(
    'A cannot select org2 zones',
    !aOrg2Zones.error && aOrg2Zones.data.length === 0,
    aOrg2Zones.error?.message,
  );

  const aOrg1Zones = await A.client.from('zones').select('id').eq('id', org1.zoneId);
  check(
    'A can select its own org1 zone',
    !aOrg1Zones.error && aOrg1Zones.data.length === 1,
    aOrg1Zones.error?.message,
  );

  const bOrg1Orgs = await B.client.from('organizations').select('id').eq('id', org1.id);
  check(
    'B cannot see org1 at all',
    !bOrg1Orgs.error && bOrg1Orgs.data.length === 0,
    bOrg1Orgs.error?.message,
  );

  const aOrg2Locations = await A.client.from('locations').select('id').eq('id', org2.locationId);
  check(
    'A cannot select org2 locations',
    !aOrg2Locations.error && aOrg2Locations.data.length === 0,
    aOrg2Locations.error?.message,
  );

  // ── role limits ────────────────────────────────────────────────────────────
  const bUpdateOrg2 = await B.client
    .from('organizations')
    .update({ name: 'hijacked' })
    .eq('id', org2.id)
    .select('id');
  check(
    'B (staff) cannot update its own organization',
    blocked(bUpdateOrg2),
    JSON.stringify(bUpdateOrg2.data ?? null),
  );

  const aUpdateOrg1 = await A.client
    .from('organizations')
    .update({ contact_email: 'owner@pigeonx.test' })
    .eq('id', org1.id)
    .select('id');
  check(
    'A (owner) can update its own organization',
    !aUpdateOrg1.error && aUpdateOrg1.data.length === 1,
    aUpdateOrg1.error?.message,
  );

  const bNewZone = await B.client
    .from('zones')
    .insert({ location_id: org2.locationId, name: 'staff-made zone' })
    .select('id');
  check('B (staff) cannot create a zone', blocked(bNewZone), JSON.stringify(bNewZone.data ?? null));

  const bSetProfile = await B.client
    .from('zones')
    .update({ active_profile_id: SYSTEM_PROFILE_18K })
    .eq('id', org2.zoneId)
    .select('id, active_profile_id');
  check(
    "B (staff) can switch its zone's active profile",
    !bSetProfile.error && bSetProfile.data?.[0]?.active_profile_id === SYSTEM_PROFILE_18K,
    bSetProfile.error?.message,
  );

  const bRenameZone = await B.client
    .from('zones')
    .update({ name: 'renamed by staff' })
    .eq('id', org2.zoneId)
    .select('id');
  check(
    'B (staff) cannot rename a zone',
    blocked(bRenameZone),
    JSON.stringify(bRenameZone.data ?? null),
  );

  const aRenameOrg2Zone = await A.client
    .from('zones')
    .update({ name: 'renamed across orgs' })
    .eq('id', org2.zoneId)
    .select('id');
  check(
    'A cannot touch org2 zones',
    blocked(aRenameOrg2Zone),
    JSON.stringify(aRenameOrg2Zone.data ?? null),
  );

  // ── sessions ───────────────────────────────────────────────────────────────
  const bSession = await B.client
    .from('sessions')
    .insert({
      zone_id: org2.zoneId,
      user_id: B.id,
      profile_id: SYSTEM_PROFILE_PULSE,
      output_kind: 'phone',
      source: 'manual',
    })
    .select('id');
  check(
    'B (staff) can insert a session in its org2 zone',
    !bSession.error && bSession.data?.length === 1,
    bSession.error?.message,
  );

  const aSessionInOrg2 = await A.client
    .from('sessions')
    .insert({
      zone_id: org2.zoneId,
      user_id: A.id,
      profile_id: SYSTEM_PROFILE_PULSE,
      output_kind: 'phone',
    })
    .select('id');
  check(
    'A cannot insert a session in an org2 zone',
    blocked(aSessionInOrg2),
    JSON.stringify(aSessionInOrg2.data ?? null),
  );

  const spoofed = await B.client
    .from('sessions')
    .insert({
      zone_id: org2.zoneId,
      user_id: A.id,
      profile_id: SYSTEM_PROFILE_PULSE,
      output_kind: 'phone',
    })
    .select('id');
  check(
    'B cannot log a session as another user',
    blocked(spoofed),
    JSON.stringify(spoofed.data ?? null),
  );

  const aSeesOrg2Sessions = await A.client.from('sessions').select('id').eq('zone_id', org2.zoneId);
  check(
    'A cannot read org2 sessions',
    !aSeesOrg2Sessions.error && aSeesOrg2Sessions.data.length === 0,
    aSeesOrg2Sessions.error?.message,
  );

  // ── RPCs ───────────────────────────────────────────────────────────────────
  const started = await B.client.rpc('start_session', {
    p_zone_id: org2.zoneId,
    p_profile_id: SYSTEM_PROFILE_18K,
    p_device_id: null,
    p_output: 'phone',
  });
  check(
    'B can start_session() in its zone',
    !started.error && Boolean(started.data),
    started.error?.message,
  );

  if (started.data) {
    const row = await admin.from('sessions').select('peak_freq_hz').eq('id', started.data).single();
    check(
      'start_session() records the profile peak frequency',
      row.data?.peak_freq_hz === 18000,
      `got ${row.data?.peak_freq_hz}`,
    );

    const ended = await B.client.rpc('end_session', { p_session_id: started.data });
    check('B can end_session()', !ended.error && ended.data !== null, ended.error?.message);
  }

  const aStartsInOrg2 = await A.client.rpc('start_session', {
    p_zone_id: org2.zoneId,
    p_profile_id: SYSTEM_PROFILE_18K,
    p_device_id: null,
    p_output: 'phone',
  });
  check(
    'A cannot start_session() in an org2 zone',
    Boolean(aStartsInOrg2.error),
    JSON.stringify(aStartsInOrg2.data ?? null),
  );

  const aOrgs = await A.client.rpc('my_orgs');
  check(
    'my_orgs() returns only the caller org, with role',
    !aOrgs.error &&
      aOrgs.data?.length === 1 &&
      aOrgs.data[0].id === org1.id &&
      aOrgs.data[0].role === 'owner',
    aOrgs.error?.message ?? JSON.stringify(aOrgs.data),
  );

  const report = await A.client.rpc('location_report', {
    p_location_id: org1.locationId,
    p_week_start: new Date().toISOString().slice(0, 10),
  });
  check('location_report() runs for a member', !report.error, report.error?.message);

  const crossReport = await A.client.rpc('location_report', {
    p_location_id: org2.locationId,
    p_week_start: new Date().toISOString().slice(0, 10),
  });
  const crossRow = Array.isArray(crossReport.data) ? crossReport.data[0] : crossReport.data;
  check(
    'location_report() leaks nothing across orgs',
    !crossReport.error && (!crossRow || crossRow.sessions === 0),
    JSON.stringify(crossReport.data ?? crossReport.error),
  );

  // ── system profiles are immutable from the client ──────────────────────────
  const tamper = await B.client
    .from('audio_profiles')
    .update({ name: 'tampered' })
    .eq('id', SYSTEM_PROFILE_18K)
    .select('id');
  check('nobody can edit a system profile', blocked(tamper), JSON.stringify(tamper.data ?? null));

  const fakeSystem = await B.client
    .from('audio_profiles')
    .insert({
      name: 'fake system',
      kind: 'tone',
      params: { freqHz: 18000, gain: 0.5 },
      is_system: true,
    })
    .select('id');
  check(
    'nobody can create a system profile',
    blocked(fakeSystem),
    JSON.stringify(fakeSystem.data ?? null),
  );

  const ownProfileInsert = await B.client
    .from('audio_profiles')
    .insert({
      name: 'B custom',
      kind: 'tone',
      params: { freqHz: 16500, gain: 0.5 },
      owner_user_id: B.id,
      min_plan: 'pro',
    })
    .select('id');
  check(
    'B can create its own audio profile',
    !ownProfileInsert.error && ownProfileInsert.data?.length === 1,
    ownProfileInsert.error?.message,
  );

  if (ownProfileInsert.data?.[0]) {
    const aSeesIt = await A.client
      .from('audio_profiles')
      .select('id')
      .eq('id', ownProfileInsert.data[0].id);
    check(
      "A cannot read B's private audio profile",
      !aSeesIt.error && aSeesIt.data.length === 0,
      aSeesIt.error?.message,
    );
    await admin.from('audio_profiles').delete().eq('id', ownProfileInsert.data[0].id);
  }

  // ── billing ────────────────────────────────────────────────────────────────
  const sub = await admin
    .from('subscriptions')
    .insert({ org_id: org2.id, provider: 'stripe', product_id: 'biz', status: 'active' })
    .select('id')
    .single();
  if (!sub.error) {
    const bSees = await B.client.from('subscriptions').select('id').eq('id', sub.data.id);
    check(
      'B (staff) cannot read org billing',
      !bSees.error && bSees.data.length === 0,
      bSees.error?.message,
    );
    await admin.from('subscriptions').delete().eq('id', sub.data.id);
  } else {
    check('seed a subscription row for the billing check', false, sub.error.message);
  }
}

try {
  await main();
} catch (err) {
  failures += 1;
  console.log(`FAIL  harness — ${err.message}`);
} finally {
  await cleanup();
}

console.log(failures === 0 ? '\nAll RLS checks passed.' : `\n${failures} RLS check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
