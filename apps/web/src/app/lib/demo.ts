/**
 * Sample data, so the dashboard can be looked at before a real business exists.
 *
 * Turn it on with `?demo=1` and off with `?demo=0`. Every page that runs on
 * sample data says so at the top, and nothing here is written anywhere.
 */

import type {
  Area,
  AreaFeedback,
  Invite,
  LiveArea,
  Membership,
  Place,
  PlaceReport,
  Play,
  ProtectionPlan,
  ScheduleRow,
  Sound,
  Speaker,
  TeamMember,
} from './types';
import type { SessionResult } from './labels';

const KEY = 'pigeonx-demo';

export function readDemoFlagFromUrl(search: string): boolean | null {
  const value = new URLSearchParams(search).get('demo');
  if (value === '1') return true;
  if (value === '0') return false;
  return null;
}

/** Reads `?demo=1` once, then remembers it for the rest of the visit. */
export function syncDemoFlag(search: string): boolean {
  const fromUrl = readDemoFlagFromUrl(search);
  try {
    if (fromUrl === true) sessionStorage.setItem(KEY, '1');
    if (fromUrl === false) sessionStorage.removeItem(KEY);
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return fromUrl === true;
  }
}

export function isDemo(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function leaveDemo(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clean up */
  }
}

/* ── the sample business ───────────────────────────────────────────────── */

export const DEMO_EMAIL = 'alex@harbourhouse.com';

const ORG_ID = 'demo-org';

export const DEMO_BUSINESSES: Membership[] = [
  { org_id: ORG_ID, name: 'Harbour House Group', plan: 'business', role: 'owner' },
  { org_id: 'demo-org-2', name: 'Pier 9 Hospitality', plan: 'business', role: 'manager' },
];

export const DEMO_PLACES: Place[] = [
  {
    id: 'p1',
    org_id: ORG_ID,
    name: 'Harbour House',
    address: '18 Dock Street',
    timezone: 'America/Los_Angeles',
    kind: 'dock',
    target: 'gulls',
    area_size: 'large',
    people_nearby: true,
    limit_audible: false,
    birds_active: 'early morning',
  },
  {
    id: 'p2',
    org_id: ORG_ID,
    name: 'Pier 9 Hotel',
    address: '9 Pier Road',
    timezone: 'America/Los_Angeles',
    kind: 'roof',
    target: 'pigeons',
    area_size: 'medium',
    people_nearby: true,
    limit_audible: true,
    birds_active: 'all day',
  },
  {
    id: 'p3',
    org_id: ORG_ID,
    name: 'Old Town Cafe',
    address: '221 Main Street',
    timezone: 'America/Los_Angeles',
    kind: 'storefront',
    target: 'starlings',
    area_size: 'small',
    people_nearby: true,
    limit_audible: true,
    birds_active: null,
  },
];

export const DEMO_AREAS: Area[] = [
  { id: 'a1', location_id: 'p1', name: 'Patio', active_profile_id: 's1' },
  { id: 'a2', location_id: 'p1', name: 'Roof deck', active_profile_id: 's2' },
  { id: 'a3', location_id: 'p1', name: 'Front walk', active_profile_id: null },
  { id: 'a4', location_id: 'p2', name: 'Pool deck', active_profile_id: 's1' },
  { id: 'a5', location_id: 'p2', name: 'Balcony row', active_profile_id: 's3' },
  { id: 'a6', location_id: 'p3', name: 'Sidewalk tables', active_profile_id: 's2' },
];

export const DEMO_SOUNDS: Sound[] = [
  {
    id: 's1',
    name: 'Hawk call',
    kind: 'sample',
    is_system: true,
    description: 'Red-tailed hawk call on a 30 second cycle.',
    params: { asset: 'predator_hawk', gapMs: 30000, randomizePct: 40, gain: 0.9 },
  },
  {
    id: 's2',
    name: 'Pigeon distress call',
    kind: 'sample',
    is_system: true,
    description: 'Recorded pigeon distress call on a 20 second cycle.',
    params: { asset: 'distress_pigeon', gapMs: 20000, randomizePct: 30, gain: 0.9 },
  },
  {
    id: 's3',
    name: 'Sweep 15 to 19 kHz',
    kind: 'sweep',
    is_system: true,
    description: 'Slow sweep so birds cannot settle into one frequency.',
    params: { fromHz: 15000, toHz: 19000, rateHz: 0.25, gain: 0.8 },
  },
  {
    id: 's4',
    name: 'Pigeon 18 kHz',
    kind: 'tone',
    is_system: true,
    description: 'Steady 18 kHz tone.',
    params: { freqHz: 18000, gain: 0.8 },
  },
  {
    id: 's5',
    name: 'Max 22 kHz',
    kind: 'tone',
    is_system: true,
    description: 'Steady 22 kHz tone. Needs a PigeonX speaker.',
    params: { freqHz: 22000, gain: 0.9 },
  },
  {
    id: 's6',
    name: 'Patio evening',
    kind: 'pulse',
    is_system: false,
    description: 'Your own pulse, built for the patio.',
    params: { freqHz: 16500, onMs: 150, offMs: 600, randomizePct: 60, gain: 0.85 },
  },
];

/* ── the sample plans ──────────────────────────────────────────────────── */

export const DEMO_PLANS: ProtectionPlan[] = [
  {
    id: 'pl1',
    owner_org_id: ORG_ID,
    zone_id: 'a1',
    name: 'Gull Rotation',
    target: 'gulls',
    sound_ids: ['s1', 's3'],
    randomize_order: true,
    interval_seconds: 900,
    session_minutes: 15,
    output: 'pigeonx_emitter',
    volume: 0.85,
    quiet_start: '22:00',
    quiet_end: '06:00',
    days: [1, 2, 3, 4, 5, 6, 7],
    starts_on: null,
    ends_on: null,
  },
  {
    id: 'pl2',
    owner_org_id: ORG_ID,
    zone_id: 'a2',
    name: 'Roof Morning Plan',
    target: 'gulls',
    sound_ids: ['s2'],
    randomize_order: false,
    interval_seconds: 1800,
    session_minutes: 20,
    output: 'pigeonx_emitter',
    volume: 0.9,
    quiet_start: null,
    quiet_end: null,
    days: [6, 7],
    starts_on: null,
    ends_on: null,
  },
  {
    id: 'pl3',
    owner_org_id: ORG_ID,
    zone_id: 'a4',
    name: 'Quiet Pigeon Plan',
    target: 'pigeons',
    sound_ids: ['s4', 's3'],
    randomize_order: true,
    interval_seconds: 600,
    session_minutes: 15,
    output: 'pigeonx_emitter',
    volume: 0.8,
    quiet_start: '21:00',
    quiet_end: '07:00',
    days: [1, 2, 3, 4, 5, 6, 7],
    starts_on: null,
    ends_on: null,
  },
  {
    id: 'pl4',
    owner_org_id: ORG_ID,
    zone_id: 'a6',
    name: 'Sidewalk Starling Plan',
    target: 'starlings',
    sound_ids: ['s3', 's6'],
    randomize_order: true,
    interval_seconds: 0,
    session_minutes: 10,
    output: 'bt_speaker',
    volume: 0.7,
    quiet_start: '20:00',
    quiet_end: '08:00',
    days: [1, 2, 3, 4, 5],
    starts_on: null,
    ends_on: null,
  },
];

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

export const DEMO_SPEAKERS: Speaker[] = [
  {
    id: 'd1',
    zone_id: 'a1',
    kind: 'pigeonx_emitter',
    name: 'Patio east',
    status: 'online',
    last_seen_at: minutesAgo(2),
  },
  {
    id: 'd2',
    zone_id: 'a1',
    kind: 'bt_speaker',
    name: 'Bar speaker',
    status: 'online',
    last_seen_at: minutesAgo(11),
  },
  {
    id: 'd3',
    zone_id: 'a2',
    kind: 'pigeonx_emitter',
    name: 'Roof north',
    status: 'offline',
    last_seen_at: minutesAgo(60 * 26),
  },
  {
    id: 'd4',
    zone_id: 'a2',
    kind: 'pigeonx_emitter',
    name: 'Roof south',
    status: 'online',
    last_seen_at: minutesAgo(6),
  },
  {
    id: 'd5',
    zone_id: 'a4',
    kind: 'pigeonx_emitter',
    name: 'Pool west',
    status: 'online',
    last_seen_at: minutesAgo(4),
  },
  {
    id: 'd6',
    zone_id: 'a4',
    kind: 'pigeonx_emitter',
    name: 'Pool east',
    status: 'online',
    last_seen_at: minutesAgo(9),
  },
  {
    id: 'd7',
    zone_id: 'a5',
    kind: 'bt_speaker',
    name: 'Balcony row 1',
    status: 'online',
    last_seen_at: minutesAgo(21),
  },
  {
    id: 'd8',
    zone_id: 'a6',
    kind: 'bt_speaker',
    name: 'Awning speaker',
    status: 'online',
    last_seen_at: minutesAgo(3),
  },
  {
    id: 'd9',
    zone_id: 'a6',
    kind: 'simulated',
    name: 'Test speaker',
    status: 'online',
    last_seen_at: minutesAgo(14),
  },
];

export function demoLive(placeId: string): LiveArea[] {
  const running: Record<string, { minutes: number; sound: string }> = {
    a1: { minutes: 12.7, sound: 'Hawk call' },
    a4: { minutes: 3.2, sound: 'Pigeon 18 kHz' },
  };
  return DEMO_AREAS.filter((a) => a.location_id === placeId).map((a) => {
    const run = running[a.id];
    const sound = DEMO_SOUNDS.find((s) => s.id === a.active_profile_id)?.name ?? null;
    return {
      zone_id: a.id,
      zone_name: a.name,
      running: Boolean(run),
      current_session_id: run ? `sess-${a.id}` : null,
      started_at: run ? minutesAgo(run.minutes) : null,
      profile_name: run ? run.sound : sound,
    };
  });
}

/** A believable week: busier at the weekend, a quiet Wednesday. */
export function demoPlays(): Play[] {
  const perDayAgo = [9, 14, 11, 4, 13, 21, 17];
  // Most runs go unreported. Of the ones a person answered, most say they left.
  const results: Array<SessionResult | null> = [
    'left',
    null,
    'left',
    'some_left',
    null,
    'left',
    'not_yet',
    null,
    'unknown',
    'left',
    null,
    'some_left',
  ];
  const plays: Play[] = [];
  const areas = DEMO_AREAS;
  let n = 0;
  perDayAgo.forEach((count, index) => {
    const daysAgo = 6 - index;
    for (let i = 0; i < count; i += 1) {
      const area = areas[(n + i) % areas.length];
      const start = new Date();
      start.setDate(start.getDate() - daysAgo);
      start.setHours(7 + ((i * 3) % 12), (i * 17) % 60, 0, 0);
      const minutes = 4 + ((i * 7) % 26);
      const end = new Date(start.getTime() + minutes * 60000);
      const sound = DEMO_SOUNDS[(n + i) % 4];
      const plan = DEMO_PLANS.find((p) => p.zone_id === area.id) ?? null;
      const place = DEMO_PLACES.find((p) => p.id === area.location_id) ?? null;
      plays.push({
        id: `play-${daysAgo}-${i}`,
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
        minutes,
        output_kind: plan?.output ?? 'pigeonx_emitter',
        source: i % 3 === 0 ? 'schedule' : 'manual',
        result: results[(n + i) % results.length],
        user_id: i % 2 === 0 ? 'me' : 'teammate',
        profile_id: sound.id,
        profile_name: sound.name,
        plan_id: plan?.id ?? null,
        plan_name: plan?.name ?? null,
        zone_id: area.id,
        zone_name: area.name,
        location_id: area.location_id,
        location_name: place?.name ?? null,
        place_name: place?.name ?? null,
      });
    }
    n += count;
  });
  return plays.sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export function demoReport(placeId: string): PlaceReport {
  const plays = demoPlays().filter((p) => p.location_id === placeId);
  const areas = new Set(plays.map((p) => p.zone_id));
  return {
    sessions: plays.length,
    total_minutes: plays.reduce((sum, p) => sum + (p.minutes ?? 0), 0),
    zones_active: areas.size,
  };
}

/** The same counting `zone_feedback` does, over the sample runs. */
export function demoFeedback(areaId: string): AreaFeedback {
  const runs = demoPlays().filter((p) => p.zone_id === areaId);
  const count = (r: SessionResult) => runs.filter((p) => p.result === r).length;
  const plan = DEMO_PLANS.find((p) => p.zone_id === areaId) ?? null;
  return {
    sessions_total: runs.length,
    sessions_with_result: runs.filter((p) => p.result !== null).length,
    left_count: count('left'),
    some_left_count: count('some_left'),
    not_yet_count: count('not_yet'),
    best_plan_name: plan?.name ?? null,
  };
}

export const DEMO_SCHEDULES: ScheduleRow[] = [
  {
    id: 'sc1',
    zone_id: 'a1',
    profile_id: 's1',
    days: [1, 2, 3, 4, 5],
    start_time: '11:00:00',
    end_time: '14:00:00',
    enabled: true,
    executor: 'device',
    trigger: 'time',
    offset_minutes: 0,
    plan_id: 'pl1',
    quiet_start: '22:00',
    quiet_end: '06:00',
    area_name: 'Patio',
    place_id: 'p1',
    place_name: 'Harbour House',
    sound_name: 'Hawk call',
    plan_name: 'Gull Rotation',
    output: 'pigeonx_emitter',
  },
  {
    id: 'sc2',
    zone_id: 'a2',
    profile_id: 's2',
    days: [0, 6],
    start_time: '06:30:00',
    end_time: '09:00:00',
    enabled: true,
    executor: 'device',
    trigger: 'sunrise',
    offset_minutes: 30,
    plan_id: 'pl2',
    quiet_start: null,
    quiet_end: null,
    area_name: 'Roof deck',
    place_id: 'p1',
    place_name: 'Harbour House',
    sound_name: 'Pigeon distress call',
    plan_name: 'Roof Morning Plan',
    output: 'pigeonx_emitter',
  },
  {
    id: 'sc3',
    zone_id: 'a4',
    profile_id: 's1',
    days: [0, 1, 2, 3, 4, 5, 6],
    start_time: '17:00:00',
    end_time: '20:30:00',
    enabled: false,
    executor: 'reminder',
    trigger: 'sunset',
    offset_minutes: -45,
    plan_id: 'pl3',
    quiet_start: '21:00',
    quiet_end: '07:00',
    area_name: 'Pool deck',
    place_id: 'p2',
    place_name: 'Pier 9 Hotel',
    sound_name: 'Hawk call',
    plan_name: 'Quiet Pigeon Plan',
    output: 'pigeonx_emitter',
  },
  {
    id: 'sc4',
    zone_id: 'a6',
    profile_id: 's3',
    days: [1, 2, 3, 4, 5],
    start_time: '07:00:00',
    end_time: '10:00:00',
    enabled: true,
    executor: 'device',
    trigger: 'time',
    offset_minutes: 0,
    plan_id: 'pl4',
    quiet_start: '20:00',
    quiet_end: '08:00',
    area_name: 'Sidewalk tables',
    place_id: 'p3',
    place_name: 'Old Town Cafe',
    sound_name: 'Sweep 15 to 19 kHz',
    plan_name: 'Sidewalk Starling Plan',
    output: 'bt_speaker',
  },
  {
    id: 'sc5',
    zone_id: 'a5',
    profile_id: 's3',
    days: [2, 4],
    start_time: '16:00:00',
    end_time: '18:30:00',
    enabled: true,
    executor: 'device',
    trigger: 'time',
    offset_minutes: 0,
    plan_id: null,
    quiet_start: null,
    quiet_end: null,
    area_name: 'Balcony row',
    place_id: 'p2',
    place_name: 'Pier 9 Hotel',
    sound_name: 'Sweep 15 to 19 kHz',
    plan_name: null,
    output: null,
  },
  {
    id: 'sc6',
    zone_id: 'a1',
    profile_id: 's3',
    days: [0, 6],
    start_time: '19:00:00',
    end_time: '21:00:00',
    enabled: true,
    executor: 'device',
    trigger: 'sunset',
    offset_minutes: 0,
    plan_id: 'pl1',
    quiet_start: '22:00',
    quiet_end: '06:00',
    area_name: 'Patio',
    place_id: 'p1',
    place_name: 'Harbour House',
    sound_name: 'Hawk call',
    plan_name: 'Gull Rotation',
    output: 'pigeonx_emitter',
  },
  {
    id: 'sc7',
    zone_id: 'a4',
    profile_id: 's4',
    days: [1, 2, 3, 4, 5],
    start_time: '06:00:00',
    end_time: '08:00:00',
    enabled: true,
    executor: 'device',
    trigger: 'sunrise',
    offset_minutes: -30,
    plan_id: 'pl3',
    quiet_start: '21:00',
    quiet_end: '07:00',
    area_name: 'Pool deck',
    place_id: 'p2',
    place_name: 'Pier 9 Hotel',
    sound_name: 'Pigeon 18 kHz',
    plan_name: 'Quiet Pigeon Plan',
    output: 'pigeonx_emitter',
  },
];

export const DEMO_MEMBERS: TeamMember[] = [
  {
    id: 'm1',
    user_id: 'me',
    role: 'owner',
    created_at: '2026-05-02T10:00:00Z',
    display_name: 'Alex',
    email: 'alex@harbourhouse.com',
  },
  {
    id: 'm2',
    user_id: 'u2',
    role: 'manager',
    created_at: '2026-06-14T10:00:00Z',
    display_name: 'Dana',
    email: 'dana@harbourhouse.com',
  },
  {
    id: 'm3',
    user_id: 'u3',
    role: 'staff',
    created_at: '2026-07-30T10:00:00Z',
    display_name: 'Sam',
    email: 'sam@harbourhouse.com',
  },
];

export const DEMO_INVITES: Invite[] = [
  {
    id: 'i1',
    email: 'jordan@harbourhouse.com',
    role: 'staff',
    token: '11111111-2222-3333-4444-555555555555',
    expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    accepted_at: null,
  },
];

/** Sample data is read only. Every write says the same thing. */
export function demoWriteBlocked(): never {
  throw new Error('This is sample data. Sign in to make changes.');
}
