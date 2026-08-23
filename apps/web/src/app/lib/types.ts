/**
 * The shapes the dashboard reads. Written by hand so the web app keeps
 * building even while the database types are being regenerated elsewhere.
 */

export type MemberRole = 'owner' | 'manager' | 'staff';
export type DeviceKind = 'phone' | 'bt_speaker' | 'pigeonx_emitter' | 'simulated';
export type DeviceStatus = 'online' | 'offline' | 'unknown';
export type Executor = 'device' | 'reminder';

export type Membership = {
  org_id: string;
  name: string;
  plan: string;
  role: MemberRole;
};

export type Place = {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  timezone: string;
};

export type Area = {
  id: string;
  location_id: string;
  name: string;
  active_profile_id: string | null;
};

export type Speaker = {
  id: string;
  zone_id: string | null;
  kind: DeviceKind;
  name: string;
  status: DeviceStatus;
  last_seen_at: string | null;
};

/** One row of `zone_live_status(p_location_id)`. */
export type LiveArea = {
  zone_id: string;
  zone_name: string;
  running: boolean;
  current_session_id: string | null;
  started_at: string | null;
  profile_name: string | null;
};

/** One row of `history(p_from, p_to)`. */
export type Play = {
  id: string;
  started_at: string;
  ended_at: string | null;
  minutes: number | null;
  output_kind: string;
  source: string;
  user_id: string;
  profile_id: string;
  profile_name: string | null;
  zone_id: string | null;
  zone_name: string | null;
  location_id: string | null;
  location_name: string | null;
};

/** One row of `location_report(p_location_id, p_week_start)`. */
export type PlaceReport = {
  sessions: number;
  total_minutes: number;
  zones_active: number;
};

export type Sound = {
  id: string;
  name: string;
  kind: string;
  is_system: boolean;
};

export type Schedule = {
  id: string;
  zone_id: string;
  profile_id: string;
  days: number[];
  start_time: string;
  end_time: string;
  enabled: boolean;
  executor: Executor;
};

/** A schedule with the names the table shows. */
export type ScheduleRow = Schedule & {
  area_name: string;
  place_id: string;
  place_name: string;
  sound_name: string;
};

export type TeamMember = {
  id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  display_name: string | null;
  email: string | null;
};

export type Invite = {
  id: string;
  email: string;
  role: MemberRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
};
