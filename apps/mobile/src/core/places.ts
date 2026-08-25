/**
 * Places, areas and speakers.
 *
 * A place is a building. An area is one part of it, like a roof or a patio.
 * A speaker sits in an area and plays the sound there.
 *
 * The same three words describe what is on one phone and what a business
 * keeps in its account, so a screen never has to know which one it is looking
 * at.
 */

import type { BirdTarget } from './personalization';
import type { FleetStatus } from './speakerStatus';

export interface Speaker {
  id: string;
  name: string;
  /**
   * What the account says about it: online, offline, or nobody has heard from
   * it yet. Only a speaker a business keeps has one, because only that one is
   * a row somewhere that reports in.
   */
  status?: FleetStatus;
}

export interface Area {
  id: string;
  name: string;
  /** speakers kept on this phone */
  speakerIds: string[];
  /** speakers the business keeps in its account */
  speakers?: Speaker[];
}

export interface Place {
  id: string;
  name: string;
  areas: Area[];
  /** the birds this building is protecting against, when somebody answered */
  target?: BirdTarget | null;
  /** true when a sound people can hear would be a problem here */
  limitAudible?: boolean;
}

/** Whether an area is playing right now, and since when. */
export interface LiveInfo {
  playing: boolean;
  startedAt: number | null;
}

export type LiveByArea = Record<string, LiveInfo>;

export function speakersIn(area: Area): number {
  return area.speakers ? area.speakers.length : area.speakerIds.length;
}

export function speakerCount(place: Place): number {
  return place.areas.reduce((sum, a) => sum + speakersIn(a), 0);
}

/** "1 area, 2 speakers" */
export function describePlace(place: Place): string {
  const areas = place.areas.length;
  const speakers = speakerCount(place);
  return `${areas} area${areas === 1 ? '' : 's'}, ${speakers} speaker${speakers === 1 ? '' : 's'}`;
}

/** mm:ss, the way a running sound reads everywhere else in the app. */
export function elapsedClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** What an area row says on the right: "Playing 12:40" or "Off". */
export function liveLabel(info: LiveInfo | undefined, now = Date.now()): string {
  if (!info?.playing) return 'Off';
  if (info.startedAt == null) return 'Playing';
  return `Playing ${elapsedClock(now - info.startedAt)}`;
}

export type LiveTone = 'running' | 'idle';

export function liveTone(info: LiveInfo | undefined): LiveTone {
  return info?.playing ? 'running' : 'idle';
}
