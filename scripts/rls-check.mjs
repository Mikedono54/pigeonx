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

  await teamChecks(A, B);
  await syncChecks(A, B, org1);
  await aliveChecks(A, B, org1, org2);
  await accountDeletionChecks();
}

// ── places, protection plans, reported results (alive-product spec) ──────────
async function aliveChecks(A, B, org1, org2) {
  const one = (r) => (Array.isArray(r.data) ? r.data[0] : r.data);

  // ── user_places: own rows only ─────────────────────────────────────────────
  const aPlace = await A.client
    .from('user_places')
    .insert({
      user_id: A.id,
      name: 'A back balcony',
      kind: 'balcony',
      target: 'pigeons',
      area_size: 'small',
      people_nearby: true,
      limit_audible: true,
      birds_active: 'early morning',
    })
    .select('id, target, limit_audible')
    .single();
  check(
    'A can name its own place and answer the onboarding questions',
    !aPlace.error && aPlace.data?.target === 'pigeons' && aPlace.data?.limit_audible === true,
    aPlace.error?.message,
  );

  const bPlace = await B.client
    .from('user_places')
    .insert({ user_id: B.id, name: 'B dock', kind: 'dock', target: 'gulls' })
    .select('id')
    .single();
  check('B can name its own place', !bPlace.error, bPlace.error?.message);

  const aSeesBPlace = await B.client.from('user_places').select('id').eq('user_id', A.id);
  check(
    "B cannot read A's places",
    !aSeesBPlace.error && aSeesBPlace.data.length === 0,
    aSeesBPlace.error?.message,
  );

  const bSeesAPlaceById = await B.client
    .from('user_places')
    .select('id, name')
    .eq('id', aPlace.data?.id ?? '00000000-0000-0000-0000-000000000000');
  check(
    "B cannot read A's place even knowing its id",
    !bSeesAPlaceById.error && bSeesAPlaceById.data.length === 0,
    JSON.stringify(bSeesAPlaceById.data ?? null),
  );

  const bRenamesAPlace = await B.client
    .from('user_places')
    .update({ name: 'hijacked' })
    .eq('id', aPlace.data?.id)
    .select('id');
  check(
    "B cannot rename A's place",
    blocked(bRenamesAPlace),
    JSON.stringify(bRenamesAPlace.data ?? null),
  );

  const spoofPlace = await B.client
    .from('user_places')
    .insert({ user_id: A.id, name: 'planted' })
    .select('id');
  check(
    "B cannot create a place under A's account",
    blocked(spoofPlace),
    JSON.stringify(spoofPlace.data ?? null),
  );

  const aInvalidSize = await A.client
    .from('user_places')
    .insert({ user_id: A.id, name: 'bad size', area_size: 'enormous' })
    .select('id');
  check(
    'user_places refuses an area size outside small/medium/large',
    Boolean(aInvalidSize.error),
    JSON.stringify(aInvalidSize.data ?? null),
  );

  // ── protection_plans: own rows ─────────────────────────────────────────────
  const aPlan = await A.client
    .from('protection_plans')
    .insert({
      owner_user_id: A.id,
      user_place_id: aPlace.data?.id,
      name: 'Quiet Pigeon Plan',
      target: 'pigeons',
      sound_ids: [SYSTEM_PROFILE_18K, SYSTEM_PROFILE_PULSE],
      session_minutes: 15,
      output: 'phone',
    })
    .select('id, name, randomize_order, days, volume')
    .single();
  check(
    'A can save its own protection plan, with the spec defaults',
    !aPlan.error &&
      aPlan.data?.randomize_order === true &&
      Number(aPlan.data?.volume) === 0.85 &&
      JSON.stringify(aPlan.data?.days) === '[1,2,3,4,5,6,7]',
    aPlan.error?.message ?? JSON.stringify(aPlan.data),
  );

  const bSeesAPlan = await B.client
    .from('protection_plans')
    .select('id')
    .eq('id', aPlan.data?.id ?? '00000000-0000-0000-0000-000000000000');
  check(
    "B cannot read A's protection plan",
    !bSeesAPlan.error && bSeesAPlan.data.length === 0,
    JSON.stringify(bSeesAPlan.data ?? null),
  );

  const bEditsAPlan = await B.client
    .from('protection_plans')
    .update({ name: 'hijacked' })
    .eq('id', aPlan.data?.id)
    .select('id');
  check(
    "B cannot edit A's protection plan",
    blocked(bEditsAPlan),
    JSON.stringify(bEditsAPlan.data ?? null),
  );

  const ownerless = await A.client
    .from('protection_plans')
    .insert({ name: 'ownerless' })
    .select('id');
  check(
    'a plan with no owner is refused',
    Boolean(ownerless.error),
    JSON.stringify(ownerless.data ?? null),
  );

  // ── protection_plans: org rows, staff read / manager write ─────────────────
  const orgPlan = await admin
    .from('protection_plans')
    .insert({
      owner_org_id: org2.id,
      zone_id: org2.zoneId,
      name: 'Org2 Gull Rotation',
      target: 'gulls',
      sound_ids: [SYSTEM_PROFILE_18K],
    })
    .select('id, name')
    .single();
  if (orgPlan.error) {
    check('seed an org protection plan', false, orgPlan.error.message);
    return;
  }

  const bReadsOrgPlan = await B.client
    .from('protection_plans')
    .select('id, name')
    .eq('id', orgPlan.data.id);
  check(
    'B (staff) can read its org’s protection plan',
    !bReadsOrgPlan.error && bReadsOrgPlan.data?.length === 1,
    bReadsOrgPlan.error?.message ?? JSON.stringify(bReadsOrgPlan.data),
  );

  const bWritesOrgPlan = await B.client
    .from('protection_plans')
    .update({ name: 'staff rewrite' })
    .eq('id', orgPlan.data.id)
    .select('id');
  check(
    'B (staff) cannot rewrite its org’s protection plan',
    blocked(bWritesOrgPlan),
    JSON.stringify(bWritesOrgPlan.data ?? null),
  );

  const bCreatesOrgPlan = await B.client
    .from('protection_plans')
    .insert({ owner_org_id: org2.id, name: 'staff plan' })
    .select('id');
  check(
    'B (staff) cannot create an org protection plan',
    blocked(bCreatesOrgPlan),
    JSON.stringify(bCreatesOrgPlan.data ?? null),
  );

  const bDeletesOrgPlan = await B.client
    .from('protection_plans')
    .delete()
    .eq('id', orgPlan.data.id)
    .select('id');
  check(
    'B (staff) cannot delete its org’s protection plan',
    blocked(bDeletesOrgPlan),
    JSON.stringify(bDeletesOrgPlan.data ?? null),
  );

  const aReadsOrg2Plan = await A.client
    .from('protection_plans')
    .select('id')
    .eq('id', orgPlan.data.id);
  check(
    'A (outside org2) cannot read an org2 protection plan',
    !aReadsOrg2Plan.error && aReadsOrg2Plan.data.length === 0,
    JSON.stringify(aReadsOrg2Plan.data ?? null),
  );

  const aOrgPlan = await A.client
    .from('protection_plans')
    .insert({ owner_org_id: org1.id, name: 'Org1 Pigeon Rotation', target: 'pigeons' })
    .select('id');
  check(
    'A (owner) can create a protection plan for its own org',
    !aOrgPlan.error && aOrgPlan.data?.length === 1,
    aOrgPlan.error?.message,
  );

  // ── report_session_result ──────────────────────────────────────────────────
  const aRun = await A.client.rpc('start_session', {
    p_zone_id: null,
    p_profile_id: SYSTEM_PROFILE_18K,
    p_device_id: null,
    p_output: 'phone',
    p_source: 'manual',
    p_plan_id: aPlan.data?.id,
    p_user_place_id: aPlace.data?.id,
  });
  check(
    'A can start a session against its own place and plan',
    !aRun.error && Boolean(aRun.data),
    aRun.error?.message,
  );
  await A.client.rpc('end_session', { p_session_id: aRun.data });

  const bReports = await B.client.rpc('report_session_result', {
    p_session_id: aRun.data,
    p_result: 'left',
  });
  check(
    "report_session_result() refuses another user's session",
    Boolean(bReports.error),
    JSON.stringify(bReports.data ?? null),
  );

  const aReportsNotYet = await A.client.rpc('report_session_result', {
    p_session_id: aRun.data,
    p_result: 'not_yet',
  });
  check('A can report its own result', !aReportsNotYet.error, aReportsNotYet.error?.message);

  const aOverwrites = await A.client.rpc('report_session_result', {
    p_session_id: aRun.data,
    p_result: 'left',
  });
  check('a mistapped result can be corrected', !aOverwrites.error, aOverwrites.error?.message);

  const stored = await admin.from('sessions').select('result').eq('id', aRun.data).single();
  check(
    'the corrected result is what the row holds',
    stored.data?.result === 'left',
    `got ${stored.data?.result}`,
  );

  // ── place_feedback ─────────────────────────────────────────────────────────
  const aFeedback = one(await A.client.rpc('place_feedback', { p_user_place_id: aPlace.data.id }));
  check(
    'place_feedback() counts only what the user reported, and names the best plan',
    aFeedback?.sessions_total === 1 &&
      aFeedback?.sessions_with_result === 1 &&
      aFeedback?.left_count === 1 &&
      aFeedback?.some_left_count === 0 &&
      aFeedback?.not_yet_count === 0 &&
      aFeedback?.best_plan_name === 'Quiet Pigeon Plan',
    JSON.stringify(aFeedback),
  );

  const bFeedback = one(await B.client.rpc('place_feedback', { p_user_place_id: aPlace.data.id }));
  check(
    "place_feedback() tells B nothing about A's place",
    bFeedback?.sessions_total === 0 &&
      bFeedback?.sessions_with_result === 0 &&
      bFeedback?.left_count === 0 &&
      bFeedback?.best_plan_name === null,
    JSON.stringify(bFeedback),
  );

  const emptyFeedback = one(
    await B.client.rpc('place_feedback', { p_user_place_id: bPlace.data.id }),
  );
  check(
    'a place with no reported results names no best plan',
    emptyFeedback?.sessions_total === 0 && emptyFeedback?.best_plan_name === null,
    JSON.stringify(emptyFeedback),
  );

  // ── zone_feedback ──────────────────────────────────────────────────────────
  const bRun = await B.client.rpc('start_session', {
    p_zone_id: org2.zoneId,
    p_profile_id: SYSTEM_PROFILE_18K,
    p_device_id: null,
    p_output: 'phone',
    p_source: 'manual',
    p_plan_id: orgPlan.data.id,
    p_user_place_id: null,
  });
  await B.client.rpc('end_session', { p_session_id: bRun.data });
  const bReportsOwn = await B.client.rpc('report_session_result', {
    p_session_id: bRun.data,
    p_result: 'some_left',
  });
  check(
    'B can report the result of its own zone run',
    !bReportsOwn.error,
    bReportsOwn.error?.message,
  );

  const bZone = one(await B.client.rpc('zone_feedback', { p_zone_id: org2.zoneId }));
  check(
    'zone_feedback() reports the org zone’s one reported result',
    bZone?.sessions_with_result === 1 &&
      bZone?.some_left_count === 1 &&
      bZone?.left_count === 0 &&
      bZone?.best_plan_name === 'Org2 Gull Rotation',
    JSON.stringify(bZone),
  );

  const aZone = one(await A.client.rpc('zone_feedback', { p_zone_id: org2.zoneId }));
  check(
    "zone_feedback() leaks nothing about another org's zone",
    aZone?.sessions_total === 0 &&
      aZone?.sessions_with_result === 0 &&
      aZone?.best_plan_name === null,
    JSON.stringify(aZone),
  );

  // ── history carries the result, the plan and the place ─────────────────────
  const hist = await A.client.rpc('history', {
    p_from: new Date(Date.now() - 86400000).toISOString(),
    p_to: new Date(Date.now() + 86400000).toISOString(),
  });
  const row = hist.data?.find((h) => h.id === aRun.data);
  check(
    'history() returns the result, the plan name and the place name',
    !hist.error &&
      row?.result === 'left' &&
      row?.plan_name === 'Quiet Pigeon Plan' &&
      row?.place_name === 'A back balcony',
    hist.error?.message ?? JSON.stringify(row),
  );

  // ── schedule triggers ──────────────────────────────────────────────────────
  const sunrise = await A.client
    .from('user_schedules')
    .insert({
      user_id: A.id,
      profile_id: SYSTEM_PROFILE_18K,
      days: [1, 2, 3, 4, 5],
      start_time: '06:00',
      end_time: '07:00',
      trigger: 'sunrise',
      offset_minutes: -30,
      plan_id: aPlan.data?.id,
      quiet_start: '22:00',
      quiet_end: '07:00',
    })
    .select('id, trigger, offset_minutes')
    .single();
  check(
    'A can schedule a run for half an hour before sunrise',
    !sunrise.error && sunrise.data?.trigger === 'sunrise' && sunrise.data?.offset_minutes === -30,
    sunrise.error?.message,
  );

  const absurdOffset = await A.client
    .from('user_schedules')
    .insert({
      user_id: A.id,
      profile_id: SYSTEM_PROFILE_18K,
      days: [1],
      start_time: '06:00',
      end_time: '07:00',
      trigger: 'sunset',
      offset_minutes: 5000,
    })
    .select('id');
  check(
    'an offset beyond ±12 h is refused',
    Boolean(absurdOffset.error),
    JSON.stringify(absurdOffset.data ?? null),
  );
}

// ── teams: create_org, invite, accept, remove ────────────────────────────────
async function teamChecks(A, B) {
  const C = await makeUser('c');

  const newOrg = await A.client.rpc('create_org', { p_name: `rlscheck-team-${stamp}` });
  check(
    'create_org() returns an org id',
    !newOrg.error && Boolean(newOrg.data),
    newOrg.error?.message,
  );
  if (!newOrg.data) return;
  const teamOrg = newOrg.data;
  created.orgs.push(teamOrg);

  const plan = await admin.from('organizations').select('plan').eq('id', teamOrg).single();
  check(
    "create_org() puts the org on 'business'",
    plan.data?.plan === 'business',
    `got ${plan.data?.plan}`,
  );

  const asOwner = await A.client
    .from('org_members')
    .select('role')
    .eq('org_id', teamOrg)
    .eq('user_id', A.id);
  check(
    'create_org() makes the caller an owner',
    !asOwner.error && asOwner.data?.[0]?.role === 'owner',
    asOwner.error?.message ?? JSON.stringify(asOwner.data),
  );

  const memberships = await A.client.rpc('my_memberships');
  check(
    'my_memberships() lists the new org with its plan and role',
    !memberships.error &&
      memberships.data?.some(
        (m) => m.org_id === teamOrg && m.plan === 'business' && m.role === 'owner',
      ),
    memberships.error?.message ?? JSON.stringify(memberships.data),
  );

  const cInvites = await C.client.rpc('invite_member', {
    p_org_id: teamOrg,
    p_email: 'nobody@pigeonx.test',
    p_role: 'staff',
  });
  check(
    'a non-member cannot invite_member()',
    Boolean(cInvites.error),
    JSON.stringify(cInvites.data ?? null),
  );

  const invite = await A.client.rpc('invite_member', {
    p_org_id: teamOrg,
    p_email: B.email.toUpperCase(),
    p_role: 'staff',
  });
  check(
    'owner can invite_member(), gets a token',
    !invite.error && Boolean(invite.data),
    invite.error?.message,
  );
  if (!invite.data) return;

  const cSeesInvites = await C.client.from('org_invites').select('id').eq('org_id', teamOrg);
  check(
    'an outsider cannot read an org’s invites',
    !cSeesInvites.error && cSeesInvites.data.length === 0,
    cSeesInvites.error?.message,
  );

  const bSeesOwnInvite = await B.client
    .from('org_invites')
    .select('id, role')
    .eq('org_id', teamOrg);
  check(
    'the invitee can read their own invite by email',
    !bSeesOwnInvite.error && bSeesOwnInvite.data?.length === 1,
    bSeesOwnInvite.error?.message ?? JSON.stringify(bSeesOwnInvite.data),
  );

  const wrongPerson = await C.client.rpc('accept_invite', { p_token: invite.data });
  check(
    'accept_invite() refuses a token sent to someone else',
    Boolean(wrongPerson.error),
    JSON.stringify(wrongPerson.data ?? null),
  );

  const accepted = await B.client.rpc('accept_invite', { p_token: invite.data });
  check(
    'accept_invite() joins the invitee (email matched case-insensitively)',
    !accepted.error && accepted.data === teamOrg,
    accepted.error?.message ?? JSON.stringify(accepted.data),
  );

  const replay = await B.client.rpc('accept_invite', { p_token: invite.data });
  check(
    'an invite cannot be redeemed twice',
    Boolean(replay.error),
    JSON.stringify(replay.data ?? null),
  );

  const bRole = await B.client.rpc('my_memberships');
  check(
    'the accepted member sees the org with the invited role',
    !bRole.error && bRole.data?.some((m) => m.org_id === teamOrg && m.role === 'staff'),
    bRole.error?.message ?? JSON.stringify(bRole.data),
  );

  const bInvites = await B.client.rpc('invite_member', {
    p_org_id: teamOrg,
    p_email: 'someone@pigeonx.test',
    p_role: 'staff',
  });
  check(
    'staff cannot invite_member()',
    Boolean(bInvites.error),
    JSON.stringify(bInvites.data ?? null),
  );

  const bRemoves = await B.client.rpc('remove_member', { p_org_id: teamOrg, p_user_id: A.id });
  check(
    'staff cannot remove_member()',
    Boolean(bRemoves.error),
    JSON.stringify(bRemoves.data ?? null),
  );

  const removeLastOwner = await A.client.rpc('remove_member', {
    p_org_id: teamOrg,
    p_user_id: A.id,
  });
  check(
    'remove_member() refuses to remove the last owner',
    Boolean(removeLastOwner.error),
    JSON.stringify(removeLastOwner.data ?? null),
  );

  const removed = await A.client.rpc('remove_member', { p_org_id: teamOrg, p_user_id: B.id });
  check(
    'owner can remove_member()',
    !removed.error && removed.data === true,
    removed.error?.message,
  );

  const bGone = await admin
    .from('org_members')
    .select('id')
    .eq('org_id', teamOrg)
    .eq('user_id', B.id);
  check('the removed member is really gone', bGone.data?.length === 0, JSON.stringify(bGone.data));
}

// ── per-user sync tables + the two read models ───────────────────────────────
async function syncChecks(A, B, org1) {
  const aDevice = await A.client
    .from('user_devices')
    .insert({ user_id: A.id, kind: 'bt_speaker', name: 'Patio speaker' })
    .select('id');
  check(
    'A can save its own remembered speaker',
    !aDevice.error && aDevice.data?.length === 1,
    aDevice.error?.message,
  );

  const spoofDevice = await B.client
    .from('user_devices')
    .insert({ user_id: A.id, kind: 'phone', name: 'not mine' })
    .select('id');
  check(
    "B cannot save a speaker under A's account",
    blocked(spoofDevice),
    JSON.stringify(spoofDevice.data ?? null),
  );

  const bSeesADevice = await B.client.from('user_devices').select('id').eq('user_id', A.id);
  check(
    "B cannot read A's speakers",
    !bSeesADevice.error && bSeesADevice.data.length === 0,
    bSeesADevice.error?.message,
  );

  const aSchedule = await A.client
    .from('user_schedules')
    .insert({
      user_id: A.id,
      profile_id: SYSTEM_PROFILE_18K,
      days: [1, 2, 3],
      start_time: '06:00',
      end_time: '09:00',
      executor: 'reminder',
    })
    .select('id');
  check(
    'A can save its own reminder schedule',
    !aSchedule.error && aSchedule.data?.length === 1,
    aSchedule.error?.message,
  );

  const bSeesASchedule = await B.client.from('user_schedules').select('id').eq('user_id', A.id);
  check(
    "B cannot read A's schedules",
    !bSeesASchedule.error && bSeesASchedule.data.length === 0,
    bSeesASchedule.error?.message,
  );

  // zone_live_status: start a run in org1 and expect the zone to read as running.
  const run = await A.client.rpc('start_session', {
    p_zone_id: org1.zoneId,
    p_profile_id: SYSTEM_PROFILE_18K,
    p_device_id: null,
    p_output: 'phone',
  });

  const live = await A.client.rpc('zone_live_status', { p_location_id: org1.locationId });
  const liveZone = live.data?.find((z) => z.zone_id === org1.zoneId);
  check(
    'zone_live_status() reports the running zone with its session and profile',
    !live.error &&
      liveZone?.running === true &&
      liveZone.current_session_id === run.data &&
      Boolean(liveZone.started_at) &&
      Boolean(liveZone.profile_name),
    live.error?.message ?? JSON.stringify(live.data),
  );

  const crossLive = await B.client.rpc('zone_live_status', { p_location_id: org1.locationId });
  check(
    'zone_live_status() returns nothing to a non-member',
    !crossLive.error && (crossLive.data?.length ?? 0) === 0,
    crossLive.error?.message ?? JSON.stringify(crossLive.data),
  );

  const hist = await A.client.rpc('history', {
    p_from: new Date(Date.now() - 86400000).toISOString(),
    p_to: new Date(Date.now() + 86400000).toISOString(),
  });
  check(
    'history() returns the caller’s run with profile and place names',
    !hist.error &&
      hist.data?.some((h) => h.id === run.data && h.profile_name && h.zone_name && h.location_name),
    hist.error?.message ?? JSON.stringify(hist.data?.slice(0, 2)),
  );

  const bHist = await B.client.rpc('history', {
    p_from: new Date(Date.now() - 86400000).toISOString(),
    p_to: new Date(Date.now() + 86400000).toISOString(),
  });
  check(
    "history() never shows another org's runs",
    !bHist.error && !bHist.data?.some((h) => h.id === run.data),
    bHist.error?.message,
  );

  if (run.data) await A.client.rpc('end_session', { p_session_id: run.data });
}

// ── delete_my_account (Apple review 5.1.1(v)) ────────────────────────────────
async function accountDeletionChecks() {
  const D = await makeUser('d');
  const E = await makeUser('e');

  const soleOrg = await D.client.rpc('create_org', { p_name: `rlscheck-solo-${stamp}` });
  if (soleOrg.data) created.orgs.push(soleOrg.data);

  const sharedOrg = await D.client.rpc('create_org', { p_name: `rlscheck-shared-${stamp}` });
  if (sharedOrg.data) created.orgs.push(sharedOrg.data);
  const inv = await D.client.rpc('invite_member', {
    p_org_id: sharedOrg.data,
    p_email: E.email,
    p_role: 'manager',
  });
  await E.client.rpc('accept_invite', { p_token: inv.data });

  const blockedDelete = await D.client.rpc('delete_my_account');
  check(
    'delete_my_account() refuses while the caller is an org’s only owner and others are in it',
    Boolean(blockedDelete.error),
    JSON.stringify(blockedDelete.data ?? null),
  );

  const stillThere = await admin.auth.admin.getUserById(D.id);
  check(
    'the refused deletion left the account intact',
    Boolean(stillThere.data?.user),
    stillThere.error?.message,
  );

  // Hand the shared org over, then the deletion is allowed.
  await admin
    .from('org_members')
    .update({ role: 'owner' })
    .eq('org_id', sharedOrg.data)
    .eq('user_id', E.id);
  await admin.from('org_members').delete().eq('org_id', sharedOrg.data).eq('user_id', D.id);

  await D.client.from('user_devices').insert({ user_id: D.id, kind: 'phone', name: 'D phone' });

  const gone = await D.client.rpc('delete_my_account');
  check('delete_my_account() succeeds once nothing is orphaned', !gone.error, gone.error?.message);

  const lookup = await admin.auth.admin.getUserById(D.id);
  check(
    'the auth user is deleted',
    !lookup.data?.user,
    JSON.stringify(lookup.data?.user?.id ?? null),
  );

  const leftovers = await admin.from('user_devices').select('id').eq('user_id', D.id);
  check(
    'the deleted account leaves no rows behind',
    leftovers.data?.length === 0,
    JSON.stringify(leftovers.data),
  );

  const soloOrgGone = await admin.from('organizations').select('id').eq('id', soleOrg.data);
  check(
    'an org the deleted account solely owned goes with it',
    soloOrgGone.data?.length === 0,
    JSON.stringify(soloOrgGone.data),
  );

  const sharedOrgKept = await admin.from('organizations').select('id').eq('id', sharedOrg.data);
  check(
    'an org handed to someone else survives',
    sharedOrgKept.data?.length === 1,
    JSON.stringify(sharedOrgKept.data),
  );
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
