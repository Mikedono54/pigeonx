/**
 * Sample data, so the dashboard can be looked at before a real business exists.
 *
 * Turn it on with `?demo=1` and off with `?demo=0`. Every page that runs on
 * sample data says so at the top, and nothing here is written anywhere.
 */

import type {
  Area,
  Invite,
  LiveArea,
  Membership,
  Place,
  PlaceReport,
  Play,
  ScheduleRow,
  Sound,
  Speaker,
  TeamMember,
} from './types';

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
  },
  {
    id: 'p2',
    org_id: ORG_ID,
    name: 'Pier 9 Hotel',
    address: '9 Pier Road',
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'p3',
    org_id: ORG_ID,
    name: 'Old Town Cafe',
    address: '221 Main Street',
    timezone: 'America/Los_Angeles',
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
  { id: 's1', name: 'Hawk call', kind: 'sample', is_system: true },
  { id: 's2', name: 'Bird alarm call', kind: 'sample', is_system: true },
  { id: 's3', name: 'Rising and falling sound', kind: 'sweep', is_system: true },
  { id: 's4', name: 'Patio evening', kind: 'pulse', is_system: false },
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
    zone_id: 'a3',
    kind: 'simulated',
    name: 'Test speaker',
    status: 'unknown',
    last_seen_at: null,
  },
  {
    id: 'd5',
    zone_id: 'a4',
    kind: 'pigeonx_emitter',
    name: 'Pool west',
    status: 'online',
    last_seen_at: minutesAgo(4),
  },
];

export function demoLive(placeId: string): LiveArea[] {
  const running: Record<string, { minutes: number; sound: string }> = {
    a1: { minutes: 12.7, sound: 'Hawk call' },
    a4: { minutes: 3.2, sound: 'Hawk call' },
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
      const sound = DEMO_SOUNDS[(n + i) % 3];
      plays.push({
        id: `play-${daysAgo}-${i}`,
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
        minutes,
        output_kind: 'pigeonx_emitter',
        source: i % 3 === 0 ? 'schedule' : 'manual',
        user_id: i % 2 === 0 ? 'me' : 'teammate',
        profile_id: sound.id,
        profile_name: sound.name,
        zone_id: area.id,
        zone_name: area.name,
        location_id: area.location_id,
        location_name: DEMO_PLACES.find((p) => p.id === area.location_id)?.name ?? null,
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
    area_name: 'Patio',
    place_id: 'p1',
    place_name: 'Harbour House',
    sound_name: 'Hawk call',
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
    area_name: 'Roof deck',
    place_id: 'p1',
    place_name: 'Harbour House',
    sound_name: 'Bird alarm call',
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
    area_name: 'Pool deck',
    place_id: 'p2',
    place_name: 'Pier 9 Hotel',
    sound_name: 'Hawk call',
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
