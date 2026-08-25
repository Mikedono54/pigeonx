/**
 * Protection plans: which sounds run, in what order, for how long.
 *
 * NOTE: mirror of `packages/core/src/plans.ts`. Mobile does not build the
 * workspace package, so `recommendPlan` and the slugs it returns are copied
 * here by hand and must not drift.
 *
 * A recommendation is where a person starts, not a verdict. Every plan here is
 * two sounds they can see, rename, reorder or throw away, and nothing claims
 * one of them does more than another.
 */

import type { BirdTarget } from './personalization';
import type { OutputKind } from './profiles';

export interface PlanRecommendation {
  name: string;
  /** Built-in sound ids, in rotation order. Core calls the same strings slugs. */
  soundIds: string[];
  sessionMinutes: number;
  randomizeOrder: boolean;
}

/** The session length every recommendation opens with. */
export const DEFAULT_SESSION_MINUTES = 15;

/**
 * Two sounds for the birds at hand.
 *
 * `limitAudible` is the whole second half of the matrix: a balcony over a cafe
 * cannot play a recorded hawk call without the people below hearing it, so the
 * quiet variant drops every recording and rotates tones and sweeps instead.
 *
 * Crows are the one case where the speaker matters. 22 kHz only comes out of
 * PigeonX hardware, and offering it on a phone would be a claim about phones
 * we are not willing to make.
 */
export function recommendPlan(
  target: BirdTarget,
  limitAudible: boolean,
  output: OutputKind,
): PlanRecommendation {
  const plan = (name: string, soundIds: string[]): PlanRecommendation => ({
    name,
    soundIds,
    sessionMinutes: DEFAULT_SESSION_MINUTES,
    randomizeOrder: true,
  });

  switch (target) {
    case 'pigeons':
      return limitAudible
        ? plan('Quiet Pigeon Plan', ['sys_pigeon_18k', 'sys_random_pulse'])
        : plan('Pigeon Rotation', ['sys_distress_pigeon', 'sys_predator_hawk']);

    case 'gulls':
      return limitAudible
        ? plan('Quiet Gull Plan', ['sys_gull_17k', 'sys_sweep_15_19k'])
        : plan('Gull Rotation', ['sys_gull_17k', 'sys_predator_falcon']);

    // Starlings and small mixed flocks get the same rotation. Only the word in
    // the question changes.
    case 'starlings':
    case 'mixed_small':
      return limitAudible
        ? plan('Quiet Mixed Flock Plan', ['sys_sweep_15_19k', 'sys_random_pulse'])
        : plan('Mixed Flock Rotation', ['sys_distress_pigeon', 'sys_sweep_15_19k']);

    // Core names these two plans after the species group. A person reads the
    // name on a card, and the glossary is blunt that nobody says "corvid", so
    // the two names here say crow. The stored `target` is unchanged.
    case 'corvids':
      return limitAudible
        ? plan('Quiet Crow Plan', [
            'sys_random_pulse',
            output === 'pigeonx_emitter' ? 'sys_max_22k' : 'sys_pulse_16k',
          ])
        : plan('Crow Rotation', ['sys_predator_hawk', 'sys_predator_falcon']);

    case 'unsure':
      return limitAudible
        ? plan('Quiet Starter Plan', ['sys_sweep_15_19k', 'sys_random_pulse'])
        : plan('Starter Rotation', ['sys_distress_pigeon', 'sys_random_pulse']);
  }
}

/**
 * The order the sounds play in this session.
 *
 * A fixed plan plays the list as written. A randomized plan shuffles it once,
 * at the start, so two sessions in a row do not open the same way. Randomised
 * timing makes a pattern harder to predict, and that is the whole of what it
 * does.
 *
 * `random` is a seam: the tests hand it a counter so the shuffle can be read
 * off the page.
 */
export function rotationOrder(
  soundIds: string[],
  randomizeOrder: boolean,
  random: () => number = Math.random,
): string[] {
  const order = [...soundIds];
  if (!randomizeOrder || order.length < 2) return order;
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Which sound plays in the nth slot of a rotation that keeps going round. */
export function soundAt(order: string[], index: number): string | undefined {
  if (order.length === 0) return undefined;
  return order[index % order.length];
}

/** How long each sound in a rotation gets, in milliseconds. */
export function slotMs(sessionMinutes: number, sounds: number): number {
  if (sounds <= 0) return sessionMinutes * 60_000;
  return Math.max(30_000, Math.round((sessionMinutes * 60_000) / sounds));
}
