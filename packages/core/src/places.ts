import { z } from 'zod';
import { Uuid } from './schemas.js';

/**
 * Places, target species, and the words the app says out loud.
 *
 * Every label here is the *only* wording the UI should use. The database stores
 * `corvids` because that is what the species group is called; the person on the
 * balcony is looking at crows and jays and has never used the word "corvid".
 * Same rule as the frequency labels in the spec: say the exact thing, in the
 * words the person already has.
 */

// ─── target species ───────────────────────────────────────────────────────────

export type BirdTarget = 'pigeons' | 'gulls' | 'starlings' | 'corvids' | 'mixed_small' | 'unsure';

export const BIRD_TARGETS = [
  'pigeons',
  'gulls',
  'starlings',
  'corvids',
  'mixed_small',
  'unsure',
] as const satisfies readonly BirdTarget[];

export const BIRD_TARGET_LABELS: Record<BirdTarget, string> = {
  pigeons: 'Pigeons',
  gulls: 'Gulls',
  starlings: 'Starlings',
  corvids: 'Crows or jays',
  mixed_small: 'Small mixed birds',
  /** A real answer, not a shrug: "Not sure" gets the Starter Rotation. */
  unsure: 'Not sure',
};

export const BirdTargetSchema = z.enum(BIRD_TARGETS);

// ─── place kind ───────────────────────────────────────────────────────────────

export type PlaceKind =
  | 'balcony'
  | 'roof'
  | 'dock'
  | 'storefront'
  | 'warehouse'
  | 'parking'
  | 'garden'
  | 'farm'
  | 'custom';

export const PLACE_KINDS = [
  'balcony',
  'roof',
  'dock',
  'storefront',
  'warehouse',
  'parking',
  'garden',
  'farm',
  'custom',
] as const satisfies readonly PlaceKind[];

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  balcony: 'Balcony',
  roof: 'Roof',
  dock: 'Dock or marina',
  storefront: 'Storefront',
  warehouse: 'Warehouse',
  parking: 'Parking structure',
  garden: 'Garden',
  farm: 'Farm or field',
  custom: 'Custom',
};

export const PlaceKindSchema = z.enum(PLACE_KINDS);

// ─── area size ────────────────────────────────────────────────────────────────

export type AreaSize = 'small' | 'medium' | 'large';

export const AREA_SIZES = ['small', 'medium', 'large'] as const satisfies readonly AreaSize[];

/** Sizes in things a person can see, not in square feet they would have to measure. */
export const AREA_SIZE_LABELS: Record<AreaSize, string> = {
  small: 'Small — a balcony or a doorway',
  medium: 'Medium — a roof or a storefront',
  large: 'Large — a warehouse, a lot or a field',
};

export const AreaSizeSchema = z.enum(AREA_SIZES);

// ─── session result ───────────────────────────────────────────────────────────

export type SessionResult = 'left' | 'some_left' | 'not_yet' | 'unknown';

export const SESSION_RESULTS = [
  'left',
  'some_left',
  'not_yet',
  'unknown',
] as const satisfies readonly SessionResult[];

/** The four buttons under "Did the birds leave?". */
export const SESSION_RESULT_LABELS: Record<SessionResult, string> = {
  left: 'They left',
  some_left: 'Some left',
  not_yet: 'Not yet',
  /**
   * Distinct from an unreported session: this person watched and could not say.
   * Feedback counts it as reported, and counts it toward nothing.
   */
  unknown: 'I could not tell',
};

export const SessionResultSchema = z.enum(SESSION_RESULTS);

// ─── schedule trigger ─────────────────────────────────────────────────────────

export type ScheduleTrigger = 'time' | 'sunrise' | 'sunset';

export const SCHEDULE_TRIGGERS = [
  'time',
  'sunrise',
  'sunset',
] as const satisfies readonly ScheduleTrigger[];

export const SCHEDULE_TRIGGER_LABELS: Record<ScheduleTrigger, string> = {
  time: 'At a set time',
  sunrise: 'At sunrise',
  sunset: 'At sunset',
};

export const ScheduleTriggerSchema = z.enum(SCHEDULE_TRIGGERS);

/**
 * "30 minutes before sunrise", spelled out. Sunrise and sunset themselves are
 * computed on the device — the row only stores the intent.
 */
export function scheduleTriggerLabel(trigger: ScheduleTrigger, offsetMinutes = 0): string {
  if (trigger === 'time' || offsetMinutes === 0) return SCHEDULE_TRIGGER_LABELS[trigger];
  const when = trigger === 'sunrise' ? 'sunrise' : 'sunset';
  const minutes = Math.abs(offsetMinutes);
  const unit = minutes === 1 ? 'minute' : 'minutes';
  return `${minutes} ${unit} ${offsetMinutes < 0 ? 'before' : 'after'} ${when}`;
}

// ─── inputs ───────────────────────────────────────────────────────────────────

/** The personalization answers, shared by `user_places` and `locations`. */
const placeAnswers = {
  kind: PlaceKindSchema.nullish(),
  target: BirdTargetSchema.nullish(),
  area_size: AreaSizeSchema.nullish(),
  people_nearby: z.boolean().default(true),
  limit_audible: z.boolean().default(false),
  /** Free text in the user's own words — "early morning", "after lunch". */
  birds_active: z.string().trim().max(120).nullish(),
};

/** A solo account's place. Only the name is required; the rest can be skipped. */
export const UserPlaceInput = z.object({
  name: z.string().trim().min(1).max(120),
  ...placeAnswers,
});

/** The same answers, added to a Business location. */
export const LocationPersonalizationInput = z.object(placeAnswers);

export type UserPlaceInput = z.infer<typeof UserPlaceInput>;
export type LocationPersonalizationInput = z.infer<typeof LocationPersonalizationInput>;

export const ReportSessionResultInput = z.object({
  session_id: Uuid,
  result: SessionResultSchema,
});

export type ReportSessionResultInput = z.infer<typeof ReportSessionResultInput>;

/** What `place_feedback()` / `zone_feedback()` return — reported results only. */
export type PlaceFeedback = {
  sessions_total: number;
  sessions_with_result: number;
  left_count: number;
  some_left_count: number;
  not_yet_count: number;
  best_plan_name: string | null;
};
