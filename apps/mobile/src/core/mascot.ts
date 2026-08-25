/**
 * What the bird is doing, and why.
 *
 * The mascot is a state indicator, not decoration. Every pose here answers a
 * question a person already has: is anything running, is anything about to
 * run, is something wrong. Nothing it does is invented, so there is one pose
 * per thing the app actually knows, and no pose for a mood.
 */

import type { HomeState } from './homeState';

export type MascotPose =
  /** nothing is set and nothing is running */
  | 'calm'
  /** a sound and a speaker are both picked, so the bird watches the button */
  | 'ready'
  /** a sound is coming out right now */
  | 'calling'
  /** a session is set for later, so the bird stands by a clock */
  | 'waiting'
  /** the speaker for this place is gone, and the bird is looking at it */
  | 'offline'
  /** a session just ended, and the bird walks off the block */
  | 'leaving';

export interface MascotInputs {
  /** the state Home is already showing */
  state: HomeState;
  /** a sound and an output are both picked, so Start would do something */
  ready: boolean;
  /** a session ended in the last moment or two */
  finishing?: boolean;
}

/**
 * One pose, from what Home is already saying.
 *
 * Playing wins, because a person can hear it. A speaker that is gone comes
 * next, for the same reason Home puts it over a session that is coming: it is
 * the thing standing between now and the next sound. The walk off is brief
 * and only ever happens on the way back to a resting state, so it sits under
 * both of those and over the rest.
 */
export function mascotPose({ state, ready, finishing = false }: MascotInputs): MascotPose {
  if (state === 'active') return 'calling';
  if (state === 'attention') return 'offline';
  if (finishing) return 'leaving';
  if (state === 'scheduled') return 'waiting';
  return ready ? 'ready' : 'calm';
}

/** What a screen reader says about the bird, when the bird is worth saying. */
export const MASCOT_LABEL: Record<MascotPose, string> = {
  calm: 'Nothing is playing',
  ready: 'Ready to start',
  calling: 'Playing',
  waiting: 'Waiting for the next session',
  offline: 'The speaker is not connected',
  leaving: 'The session is over',
};

/** How long the walk off takes. A fade of the same length under reduced motion. */
export const MASCOT_WALK_MS = 400;

/** One full step of the sound lines, in milliseconds. */
export const MASCOT_CALL_CYCLE_MS = 800;
