/**
 * Named row and RPC-result types, so the apps write `OrgInviteRow` instead of
 * `Database['public']['Tables']['org_invites']['Row']` in every hook.
 *
 * `db.types.ts` is generated (`pnpm db:types`) — never edit it. This file is the
 * hand-written surface over it.
 */

import type { Database } from './db.types.js';

type Tables = Database['public']['Tables'];
type Fns = Database['public']['Functions'];

export type Row<T extends keyof Tables> = Tables[T]['Row'];
export type Insert<T extends keyof Tables> = Tables[T]['Insert'];
export type Update<T extends keyof Tables> = Tables[T]['Update'];

// ─── tables ───────────────────────────────────────────────────────────────────

export type ProfileRow = Row<'profiles'>;
export type OrganizationRow = Row<'organizations'>;
export type OrgMemberRow = Row<'org_members'>;
export type OrgInviteRow = Row<'org_invites'>;
export type LocationRow = Row<'locations'>;
export type ZoneRow = Row<'zones'>;
export type DeviceRow = Row<'devices'>;
export type AudioProfileDbRow = Row<'audio_profiles'>;
export type ScheduleRow = Row<'schedules'>;
export type SessionRow = Row<'sessions'>;
export type SubscriptionRow = Row<'subscriptions'>;
export type UserScheduleRow = Row<'user_schedules'>;
export type UserDeviceRow = Row<'user_devices'>;
export type UserPlaceRow = Row<'user_places'>;
export type ProtectionPlanRow = Row<'protection_plans'>;
export type LocationReportRow = Row<'location_reports'>;

export type OrgInviteInsert = Insert<'org_invites'>;
export type UserScheduleInsert = Insert<'user_schedules'>;
export type UserDeviceInsert = Insert<'user_devices'>;
export type UserPlaceInsert = Insert<'user_places'>;
export type UserPlaceUpdate = Update<'user_places'>;
export type ProtectionPlanInsert = Insert<'protection_plans'>;
export type ProtectionPlanUpdate = Update<'protection_plans'>;
export type LocationReportInsert = Insert<'location_reports'>;

// ─── enums ────────────────────────────────────────────────────────────────────

type Enums = Database['public']['Enums'];

export type MemberRole = Enums['member_role_t'];
export type OrgPlan = Enums['org_plan_t'];
export type DeviceKind = Enums['device_kind_t'];
export type DeviceStatus = Enums['device_status_t'];
export type ScheduleExecutor = Enums['schedule_executor_t'];
export type SessionSource = Enums['session_source_t'];
// `OutputKind` already comes from profiles.ts — the enum and the union are the
// same set, and profiles.ts owns the audio side of it.
export type TriggerMode = Enums['trigger_mode_t'];
// `BirdTarget`, `PlaceKind`, `SessionResult` and `ScheduleTrigger` are declared
// in places.ts, which owns their labels; these aliases prove the unions there
// still match the enums the database actually has.
type EnumMatches<A extends B, B> = A;
export type BirdTargetEnum = EnumMatches<Enums['bird_target_t'], import('./places.js').BirdTarget>;
export type PlaceKindEnum = EnumMatches<Enums['place_kind_t'], import('./places.js').PlaceKind>;
export type SessionResultEnum = EnumMatches<
  Enums['session_result_t'],
  import('./places.js').SessionResult
>;
export type ScheduleTriggerEnum = EnumMatches<
  Enums['schedule_trigger_t'],
  import('./places.js').ScheduleTrigger
>;

// ─── RPC results ──────────────────────────────────────────────────────────────

export type MembershipRow = Fns['my_memberships']['Returns'][number];
export type ZoneLiveStatusRow = Fns['zone_live_status']['Returns'][number];
export type HistoryRow = Fns['history']['Returns'][number];
export type LocationReportResult = Fns['location_report']['Returns'][number];
export type ZoneActivityRow = Fns['zone_activity']['Returns'][number];
export type PlaceFeedbackRow = Fns['place_feedback']['Returns'][number];
export type ZoneFeedbackRow = Fns['zone_feedback']['Returns'][number];

// `location_reports.data` is typed as `WeeklyReportData` in reports.ts, which
// also owns the wording of the email built from it.
