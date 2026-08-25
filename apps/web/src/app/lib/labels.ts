/**
 * The words the dashboard says out loud.
 *
 * These mirror the labels in `@pigeonx/core` (places.ts, plans.ts, profiles.ts).
 * The web app keeps its own copy for the same reason `types.ts` does: the
 * dashboard is a browser bundle and should not pull a schema library across the
 * wire to print nine nouns. The wording is the contract. If core changes a
 * label, change it here in the same commit.
 *
 * The rule from the spec holds everywhere below: say the exact thing, in the
 * words the person already has. The database stores `corvids`; the person on
 * the roof is looking at crows and jays.
 */

/* ── target species ────────────────────────────────────────────────────── */

export type BirdTarget =
  | 'pigeons'
  | 'gulls'
  | 'starlings'
  | 'corvids'
  | 'mixed_small'
  | 'unsure';

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
  /** A real answer, not a shrug. */
  unsure: 'Not sure',
};

export function targetLabel(target: BirdTarget | null): string {
  return target ? BIRD_TARGET_LABELS[target] : 'No target bird yet';
}

/* ── place kind ────────────────────────────────────────────────────────── */

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

export function kindLabel(kind: PlaceKind | null): string {
  return kind ? PLACE_KIND_LABELS[kind] : 'No kind set';
}

/* ── area size ─────────────────────────────────────────────────────────── */

export type AreaSize = 'small' | 'medium' | 'large';

export const AREA_SIZES = ['small', 'medium', 'large'] as const satisfies readonly AreaSize[];

export const AREA_SIZE_LABELS: Record<AreaSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

/** Sizes in things a person can see, not in square feet they would measure. */
export const AREA_SIZE_HINTS: Record<AreaSize, string> = {
  small: 'A balcony or a doorway',
  medium: 'A roof or a storefront',
  large: 'A warehouse, a lot or a field',
};

/* ── session result ────────────────────────────────────────────────────── */

export type SessionResult = 'left' | 'some_left' | 'not_yet' | 'unknown';

export const SESSION_RESULTS = [
  'left',
  'some_left',
  'not_yet',
  'unknown',
] as const satisfies readonly SessionResult[];

/** The four buttons under "Did the birds leave?", in the app's own words. */
export const SESSION_RESULT_LABELS: Record<SessionResult, string> = {
  left: 'They left',
  some_left: 'Some left',
  not_yet: 'Not yet',
  /** Someone watched and could not say. Different from nobody answering. */
  unknown: 'Could not tell',
};

/* ── schedule trigger ──────────────────────────────────────────────────── */

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

/* ── output ────────────────────────────────────────────────────────────── */

export type OutputKind = 'phone' | 'bt_speaker' | 'pigeonx_emitter' | 'simulated';

export const OUTPUT_KINDS = [
  'phone',
  'bt_speaker',
  'pigeonx_emitter',
  'simulated',
] as const satisfies readonly OutputKind[];

export const OUTPUT_LABELS: Record<OutputKind, string> = {
  phone: 'A phone',
  bt_speaker: 'Bluetooth speaker',
  pigeonx_emitter: 'PigeonX speaker',
  simulated: 'Test speaker',
};

/** The highest pitch each kind of speaker can actually put in the air. */
export const OUTPUT_CEILING_HZ: Record<OutputKind, number> = {
  phone: 20000,
  bt_speaker: 19000,
  pigeonx_emitter: 25000,
  simulated: 25000,
};

/* ── audible status ────────────────────────────────────────────────────── */

/**
 * `speaker_only` is not a fourth guess about ears. It is the honest answer for
 * 22 kHz out of a phone: the question of hearing it never comes up, because
 * nothing comes out.
 */
export type AudibleState = 'audible' | 'maybe' | 'inaudible' | 'speaker_only';

export const AUDIBLE_LABELS: Record<AudibleState, string> = {
  audible: 'Audible',
  maybe: 'May be audible',
  inaudible: 'Typically inaudible',
  speaker_only: 'Needs a PigeonX speaker',
};

/** Under 15 kHz everyone hears it. Above 20 kHz no phone reaches it at all. */
export const AUDIBLE_BAND_LOW_HZ = 15000;
export const AUDIBLE_BAND_TOP_HZ = 20000;

/* ── plan weekdays ─────────────────────────────────────────────────────── */

/**
 * `protection_plans.days` counts 1 = Monday through 7 = Sunday. Note this is
 * not the 0 to 6 that `schedules.days` uses; both columns were specified that
 * way and neither is going to change under us.
 */
export const PLAN_DAY_BOXES = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
] as const;

/* ── money ─────────────────────────────────────────────────────────────── */

export const PRICE_PER_LOCATION = 29;

/** The one price sentence, printed the same way everywhere it appears. */
export const PRICE_LINE = '$29/month per location';

/** And the one sentence for everybody bigger than that. */
export const PORTFOLIO_LINE =
  'Managing a larger portfolio? Contact us for custom pricing.';
