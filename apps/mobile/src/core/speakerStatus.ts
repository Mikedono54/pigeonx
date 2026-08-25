/**
 * What the app can honestly say about a speaker.
 *
 * There is no health check, no battery reading and no ping. What the phone
 * knows is which speakers it has a record of and which one this place was
 * told to play through, so those are the only three answers here. A Bluetooth
 * speaker gets no answer at all, because the phone routes to whatever is
 * paired at the moment and the app is not told which one that is. Saying
 * "Connected" there would be a guess dressed up as a fact.
 */

import type { OutputKind } from './profiles';

export type SpeakerStatus = 'this_phone' | 'connected' | 'offline';

export const SPEAKER_STATUS_LABEL: Record<SpeakerStatus, string> = {
  this_phone: 'This phone',
  connected: 'Connected',
  offline: 'Offline',
};

export interface SpeakerStatusInputs {
  output: OutputKind;
  /** the speaker this place was told to play through, when it has one */
  deviceId: string | null;
  /** every speaker this phone has a record of */
  knownIds: string[];
}

/**
 * The status line for one output, or null when the app has nothing to say.
 *
 * A place playing out of the phone is always fine. A place pointed at a
 * speaker of its own is fine while the phone still has that speaker, and
 * offline once it does not. A place pointed at PigeonX hardware with no
 * speaker paired yet is offline too, because there is nothing there to play.
 */
export function speakerStatus({
  output,
  deviceId,
  knownIds,
}: SpeakerStatusInputs): SpeakerStatus | null {
  if (output === 'phone') return 'this_phone';
  if (output === 'bt_speaker') return null;
  if (deviceId) return knownIds.includes(deviceId) ? 'connected' : 'offline';
  return knownIds.length > 0 ? 'connected' : 'offline';
}

/* ── a speaker a business keeps ───────────────────────────────────────────── */

/**
 * What the account says about one speaker in a building.
 *
 * A business speaker is not the phone's own output. It is a row the account
 * holds, and that row says one of three things: it was last heard from and it
 * answered, it was last heard from and it did not, or nobody has heard from it
 * at all. The third is the honest answer for hardware that has never reported
 * in, and it is the one a new speaker starts on. None of the three is a guess.
 */
export type FleetStatus = 'online' | 'offline' | 'unknown';

export const FLEET_STATUS_LABEL: Record<FleetStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  unknown: 'Not known yet',
};

/** Reads the account's word for it, and refuses to invent one. */
export function fleetStatus(value: unknown): FleetStatus {
  return value === 'online' || value === 'offline' ? value : 'unknown';
}

/** True when Home should drop into Needs attention over this speaker. */
export function speakerMissing(inputs: SpeakerStatusInputs): boolean {
  return speakerStatus(inputs) === 'offline';
}

/** The one line under a speaker that is gone: what to do, in one move. */
export function reconnectLine(name: string | null): string {
  return name
    ? `Reconnect ${name} in your phone settings.`
    : 'Reconnect your speaker in your phone settings.';
}
