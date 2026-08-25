/**
 * What a person told us about their place.
 *
 * NOTE: mirror of `packages/core/src/places.ts`. Mobile does not build the
 * workspace package, so the types and the keys are copied here by hand and
 * must not drift. Two label maps read differently on purpose, and both are
 * marked below: the app never prints a dash, and the app asks its question in
 * the words the owner spec wrote.
 *
 * Every label here is the only wording a screen may use. The database stores
 * `corvids` because that is what the species group is called. The person on
 * the balcony is looking at crows and jays and has never used that word.
 */

// ─── target species ───────────────────────────────────────────────────────────

export type BirdTarget = 'pigeons' | 'gulls' | 'starlings' | 'corvids' | 'mixed_small' | 'unsure';

export const BIRD_TARGETS: BirdTarget[] = [
  'pigeons',
  'gulls',
  'starlings',
  'corvids',
  'mixed_small',
  'unsure',
];

export const BIRD_TARGET_LABELS: Record<BirdTarget, string> = {
  pigeons: 'Pigeons',
  gulls: 'Gulls',
  starlings: 'Starlings',
  corvids: 'Crows or jays',
  mixed_small: 'Small mixed birds',
  /** A real answer, not a shrug. Not sure gets the starter rotation. */
  unsure: 'Not sure',
};

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

export const PLACE_KINDS: PlaceKind[] = [
  'balcony',
  'roof',
  'dock',
  'storefront',
  'warehouse',
  'parking',
  'garden',
  'farm',
  'custom',
];

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

/** What the name field starts out saying, so nobody has to invent one. */
export const PLACE_KIND_DEFAULT_NAME: Record<PlaceKind, string> = {
  balcony: 'Balcony',
  roof: 'Roof',
  dock: 'Dock',
  storefront: 'Storefront',
  warehouse: 'Warehouse',
  parking: 'Parking',
  garden: 'Garden',
  farm: 'Field',
  custom: 'My space',
};

// ─── area size ────────────────────────────────────────────────────────────────

export type AreaSize = 'small' | 'medium' | 'large';

export const AREA_SIZES: AreaSize[] = ['small', 'medium', 'large'];

/**
 * Core writes these three as one line each with a dash in the middle. The app
 * never prints a dash, so the size and the example are two strings here and
 * two lines on the card.
 */
export const AREA_SIZE_LABELS: Record<AreaSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

/** Sizes in things you can see, not in square feet you would have to measure. */
export const AREA_SIZE_HINT: Record<AreaSize, string> = {
  small: 'A balcony',
  medium: 'A patio',
  large: 'A roof or yard',
};

// ─── what happened ────────────────────────────────────────────────────────────

export type SessionResult = 'left' | 'some_left' | 'not_yet' | 'unknown';

export const SESSION_RESULTS: SessionResult[] = ['left', 'some_left', 'not_yet', 'unknown'];

/**
 * The four buttons under "Did the birds leave?", worded as answers to that
 * question. Core stores the same four keys and words them as statements.
 */
export const SESSION_RESULT_LABELS: Record<SessionResult, string> = {
  left: 'Yes',
  some_left: 'Some left',
  not_yet: 'Not yet',
  /**
   * Not the same as saying nothing: this person watched and could not say.
   * It counts as reported, and it counts toward nothing.
   */
  unknown: 'I could not tell',
};

/** The same four answers, read back later in History as a line about a session. */
export const SESSION_RESULT_LINE: Record<SessionResult, string> = {
  left: 'Most birds left',
  some_left: 'Some birds left',
  not_yet: 'Birds stayed',
  unknown: 'Could not tell',
};

/** What a session with nothing reported says in History. */
export const NO_RESULT_LINE = 'No result reported';

export function resultLine(result: SessionResult | null | undefined): string {
  return result ? SESSION_RESULT_LINE[result] : NO_RESULT_LINE;
}

// ─── what the app is willing to say back ──────────────────────────────────────

/**
 * Under three reports there is nothing worth saying, so the app says nothing.
 * A line built on one or two answers reads like a finding and is not one.
 */
export const MIN_REPORTS_FOR_SUMMARY = 3;

export interface ResultTally {
  /** sessions where a person answered, including "I could not tell" */
  withResult: number;
  left: number;
  someLeft: number;
  notYet: number;
  unknown: number;
}

export function tallyResults(results: (SessionResult | null | undefined)[]): ResultTally {
  const tally: ResultTally = { withResult: 0, left: 0, someLeft: 0, notYet: 0, unknown: 0 };
  for (const r of results) {
    if (!r) continue;
    tally.withResult += 1;
    if (r === 'left') tally.left += 1;
    else if (r === 'some_left') tally.someLeft += 1;
    else if (r === 'not_yet') tally.notYet += 1;
    else tally.unknown += 1;
  }
  return tally;
}

/**
 * One line of counting, and no more than that.
 *
 * It says how many times this person said the birds moved, out of the times
 * they answered at all. It is not a rate, not a trend and not a finding. Under
 * three answers it says nothing, because a line built on two is a story.
 */
export function summaryLine(tally: ResultTally): string | null {
  if (tally.withResult < MIN_REPORTS_FOR_SUMMARY) return null;
  const improved = tally.left + tally.someLeft;
  return `You reported improvement after ${improved} of ${tally.withResult} sessions.`;
}
