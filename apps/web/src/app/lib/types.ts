/**
 * The shapes the dashboard reads. Written by hand so the web app keeps
 * building even while the database types are being regenerated elsewhere.
 */

import type {
  AreaSize,
  BirdTarget,
  OutputKind,
  PlaceKind,
  ScheduleTrigger,
  SessionResult,
} from './labels';

export type MemberRole = 'owner' | 'manager' | 'staff';
export type DeviceKind = 'phone' | 'bt_speaker' | 'pigeonx_emitter' | 'simulated';
export type DeviceStatus = 'online' | 'offline' | 'unknown';
export type Executor = 'device' | 'reminder';
export type ProfileKind = 'tone' | 'sweep' | 'pulse' | 'sample';

export type Membership = {
  org_id: string;
  name: string;
  plan: string;
  role: MemberRole;
};

/** A location, with the personalization answers the spec asks for. */
export type Place = {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  timezone: string;
  kind: PlaceKind | null;
  target: BirdTarget | null;
  area_size: AreaSize | null;
  people_nearby: boolean;
  limit_audible: boolean;
  /** Free text in their own words: "early morning", "after lunch". */
  birds_active: string | null;
};

/** What the personalization sheet may change. */
export type PlaceAnswers = {
  kind: PlaceKind | null;
  target: BirdTarget | null;
  area_size: AreaSize | null;
  people_nearby: boolean;
  limit_audible: boolean;
  birds_active: string | null;
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
  /** What the person who ran it reported. `null` means nobody answered. */
  result: SessionResult | null;
  user_id: string;
  profile_id: string;
  profile_name: string | null;
  plan_id: string | null;
  plan_name: string | null;
  zone_id: string | null;
  zone_name: string | null;
  location_id: string | null;
  location_name: string | null;
  place_name: string | null;
};

/** One row of `location_report(p_location_id, p_week_start)`. */
export type PlaceReport = {
  sessions: number;
  total_minutes: number;
  zones_active: number;
};

/** One row of `zone_feedback(p_zone_id)`. Reported results only. */
export type AreaFeedback = {
  sessions_total: number;
  sessions_with_result: number;
  left_count: number;
  some_left_count: number;
  not_yet_count: number;
  best_plan_name: string | null;
};

export type Sound = {
  id: string;
  name: string;
  kind: ProfileKind;
  is_system: boolean;
  description: string | null;
  /** The jsonb column. Read through `peakFreqHz` and nowhere else. */
  params: Record<string, unknown>;
};

/** A row of `protection_plans` owned by a business. */
export type ProtectionPlan = {
  id: string;
  owner_org_id: string | null;
  /** The area it is attached to, or `null` while it sits in the library. */
  zone_id: string | null;
  name: string;
  target: BirdTarget;
  /** `audio_profiles.id`s, in rotation order. */
  sound_ids: string[];
  randomize_order: boolean;
  interval_seconds: number;
  session_minutes: number;
  output: OutputKind;
  volume: number;
  quiet_start: string | null;
  quiet_end: string | null;
  /** 1 is Monday, 7 is Sunday. Not the same numbering as a schedule. */
  days: number[];
  starts_on: string | null;
  ends_on: string | null;
};

export type Schedule = {
  id: string;
  zone_id: string;
  profile_id: string;
  /** 0 is Sunday, 6 is Saturday. Not the same numbering as a plan. */
  days: number[];
  start_time: string;
  end_time: string;
  enabled: boolean;
  executor: Executor;
  trigger: ScheduleTrigger;
  /** Minutes either side of sunrise or sunset. Negative is before. */
  offset_minutes: number;
  plan_id: string | null;
  quiet_start: string | null;
  quiet_end: string | null;
};

/** A schedule with the names the timeline shows. */
export type ScheduleRow = Schedule & {
  area_name: string;
  place_id: string;
  place_name: string;
  sound_name: string;
  plan_name: string | null;
  /** The plan's output when a plan is attached, otherwise nothing to say. */
  output: OutputKind | null;
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
