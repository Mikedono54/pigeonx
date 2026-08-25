/**
 * What a place a business looks after says on its card.
 *
 * The Places tab for a business is a list of buildings, read the way a person
 * reads the lights in their house: the name, what it is protecting against and
 * how, when it last ran, and whether the speakers are there.
 *
 * Every line below is derived from something the account actually holds: a
 * plan attached to an area, a schedule pointing at one, a session that really
 * started, a speaker row that really said offline. Nothing here fills a gap
 * with a guess. When the app does not know, the line says so or is not shown.
 */

import { clockTime } from './homeState';
import { BIRD_TARGET_LABELS, type BirdTarget } from './personalization';
import { FLEET_STATUS_LABEL, type FleetStatus } from './speakerStatus';
import { dayHeading } from './timeline';

/** How a place is being looked after right now. */
export type ProtectionMode = 'schedule' | 'manual' | 'attention';

export const PROTECTION_MODE_LINE: Record<ProtectionMode, string> = {
  schedule: 'Schedule active',
  manual: 'Protected manually',
  attention: 'Needs attention',
};

export interface AreaSpeaker {
  id: string;
  name: string;
  status: FleetStatus;
}

export interface AreaState {
  id: string;
  name: string;
  /** the protection plan attached to this area, when one is */
  planName: string | null;
}

export interface PlaceState {
  id: string;
  name: string;
  /** the birds this building is protecting against, when somebody said */
  target: BirdTarget | null;
  areas: AreaState[];
  speakers: AreaSpeaker[];
  /** an enabled schedule points at one of its areas */
  scheduled: boolean;
  /** when a session last started here. null when none ever has. */
  lastSessionAt: number | null;
  /**
   * False until the plans for this business have been read.
   *
   * An area with no plan and an area whose plan has not loaded look identical
   * from here, and only one of them is a problem. Until this is true, nothing
   * counts an area as unprotected.
   */
  plansKnown: boolean;
}

/** The two things that can actually be wrong, counted. */
export interface Attention {
  speakersOffline: number;
  areasWithoutPlan: number;
}

export const NO_ATTENTION: Attention = { speakersOffline: 0, areasWithoutPlan: 0 };

export function attentionIn(place: PlaceState): Attention {
  return {
    speakersOffline: place.speakers.filter((s) => s.status === 'offline').length,
    areasWithoutPlan: place.plansKnown
      ? place.areas.filter((a) => a.planName === null).length
      : 0,
  };
}

export function anything(a: Attention): boolean {
  return a.speakersOffline > 0 || a.areasWithoutPlan > 0;
}

/** Every place's trouble, added up for the top of the screen. */
export function rollUp(places: PlaceState[]): Attention {
  return places.reduce<Attention>((sum, place) => {
    const a = attentionIn(place);
    return {
      speakersOffline: sum.speakersOffline + a.speakersOffline,
      areasWithoutPlan: sum.areasWithoutPlan + a.areasWithoutPlan,
    };
  }, NO_ATTENTION);
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * "1 speaker offline · 2 areas with no plan", or nothing at all.
 *
 * A count and the plain word for what it is. No severity, no exclamation, and
 * no line whatsoever when there is nothing to say.
 */
export function attentionLine(a: Attention): string | null {
  const parts: string[] = [];
  if (a.speakersOffline > 0) {
    parts.push(`${count(a.speakersOffline, 'speaker', 'speakers')} offline`);
  }
  if (a.areasWithoutPlan > 0) {
    parts.push(`${count(a.areasWithoutPlan, 'area', 'areas')} with no plan`);
  }
  return parts.length === 0 ? null : parts.join(' · ');
}

/**
 * Trouble first, because it is the one thing that stops the next session.
 * Then a schedule, because that is what will happen next on its own. Then
 * manual, which is the honest name for a place somebody has to press play on.
 */
export function protectionMode(place: PlaceState): ProtectionMode {
  if (anything(attentionIn(place))) return 'attention';
  if (place.scheduled) return 'schedule';
  return 'manual';
}

/** "Pigeons · Schedule active", or just the second half when nobody said. */
export function statusLine(place: PlaceState): string {
  const mode = PROTECTION_MODE_LINE[protectionMode(place)];
  const target = place.target ? BIRD_TARGET_LABELS[place.target] : null;
  return target ? `${target} · ${mode}` : mode;
}

/** "Last session: Today at 8:14 AM". */
export function lastSessionLine(at: number | null, now: number | Date = Date.now()): string {
  if (at === null) return 'No sessions yet';
  return `Last session: ${dayHeading(at, now)} at ${clockTime(new Date(at))}`;
}

/**
 * "Roof Speaker · Online" when there is one of them, and a count with what is
 * wrong with it when there are more.
 *
 * A building with no speakers of its own is not broken. Somebody plays through
 * their phone, and the line says exactly that instead of reading as a fault.
 */
export function speakerLine(speakers: AreaSpeaker[]): string {
  if (speakers.length === 0) return 'No speakers yet';
  if (speakers.length === 1) {
    return `${speakers[0].name} · ${FLEET_STATUS_LABEL[speakers[0].status]}`;
  }

  const offline = speakers.filter((s) => s.status === 'offline').length;
  const online = speakers.filter((s) => s.status === 'online').length;
  const head = count(speakers.length, 'speaker', 'speakers');

  if (offline > 0) return `${head} · ${offline} offline`;
  if (online > 0) return `${head} · ${online} online`;
  return head;
}

/** "3 areas", for the line under a place. */
export function areaLine(areas: AreaState[]): string {
  if (areas.length === 0) return 'No areas yet';
  return count(areas.length, 'area', 'areas');
}
