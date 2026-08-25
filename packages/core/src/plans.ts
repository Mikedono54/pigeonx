import { z } from 'zod';
import { BirdTargetSchema, ScheduleTriggerSchema, type BirdTarget } from './places.js';
import { OUTPUT_KINDS, type OutputKind } from './profiles.js';
import { TimeOfDay, Uuid } from './schemas.js';

/**
 * Protection plans: which sounds run, in what order, for how long.
 *
 * `recommendPlan` is the app's opening offer, not a verdict. The spec is blunt
 * about this — recommendations are recommendations, never guaranteed results —
 * so every plan here is two sounds the user can see, rename, reorder or throw
 * away, and nothing claims one is more effective than another.
 */

export type PlanRecommendation = {
  name: string;
  /** System profile slugs, in rotation order. Map with `SYSTEM_PROFILE_UUIDS`. */
  soundSlugs: string[];
  sessionMinutes: number;
  randomizeOrder: true;
};

/** The spec's default session length, for every recommendation. */
export const DEFAULT_SESSION_MINUTES = 15;

/**
 * Two sounds for the birds at hand.
 *
 * `limitAudible` is the whole second half of the matrix: a balcony over a café
 * cannot run a recorded hawk call, so the quiet variant drops every `sample`
 * profile and rotates tones and sweeps instead. Crows are the one case where the
 * output matters — 22 kHz is only reachable on PigeonX hardware, and offering it
 * on a phone would be the "ultrasonic parity" claim the spec forbids.
 */
export function recommendPlan(
  target: BirdTarget,
  limitAudible: boolean,
  output: OutputKind,
): PlanRecommendation {
  const plan = (name: string, soundSlugs: string[]): PlanRecommendation => ({
    name,
    soundSlugs,
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

    // Starlings and small mixed flocks behave the same way and get the same
    // rotation; only the onboarding word differs.
    case 'starlings':
    case 'mixed_small':
      return limitAudible
        ? plan('Quiet Mixed Flock Plan', ['sys_sweep_15_19k', 'sys_random_pulse'])
        : plan('Mixed Flock Rotation', ['sys_distress_pigeon', 'sys_sweep_15_19k']);

    case 'corvids':
      return limitAudible
        ? plan('Quiet Corvid Plan', [
            'sys_random_pulse',
            output === 'pigeonx_emitter' ? 'sys_max_22k' : 'sys_pulse_16k',
          ])
        : plan('Corvid Rotation', ['sys_predator_hawk', 'sys_predator_falcon']);

    case 'unsure':
      return limitAudible
        ? plan('Quiet Starter Plan', ['sys_sweep_15_19k', 'sys_random_pulse'])
        : plan('Starter Rotation', ['sys_distress_pigeon', 'sys_random_pulse']);
  }
}

// ─── protection_plans input ───────────────────────────────────────────────────

/**
 * 1 = Monday … 7 = Sunday, matching `protection_plans.days`. Note this is *not*
 * the 0–6 the `schedules` tables use: a plan's active days are shown to a person
 * as a week that starts on Monday, and the column was specified that way.
 */
export const PlanWeekday = z.number().int().min(1).max(7);

export const ProtectionPlanInput = z
  .object({
    owner_user_id: Uuid.nullish(),
    owner_org_id: Uuid.nullish(),
    user_place_id: Uuid.nullish(),
    zone_id: Uuid.nullish(),
    name: z.string().trim().min(1).max(120),
    target: BirdTargetSchema.default('unsure'),
    /** `audio_profiles.id`s in rotation order. Not a foreign key — see the migration. */
    sound_ids: z.array(Uuid).max(20).default([]),
    randomize_order: z.boolean().default(true),
    interval_seconds: z.number().int().min(0).max(86400).default(0),
    session_minutes: z.number().int().min(1).max(1440).default(DEFAULT_SESSION_MINUTES),
    output: z.enum(OUTPUT_KINDS).default('phone'),
    volume: z.number().min(0).max(1).default(0.85),
    quiet_start: TimeOfDay.nullish(),
    quiet_end: TimeOfDay.nullish(),
    days: z.array(PlanWeekday).min(1).max(7).default([1, 2, 3, 4, 5, 6, 7]),
    starts_on: z.iso.date().nullish(),
    ends_on: z.iso.date().nullish(),
  })
  .refine((p) => Boolean(p.owner_user_id) !== Boolean(p.owner_org_id), {
    message: 'A plan belongs to exactly one owner — a person or an organization',
    path: ['owner_user_id'],
  })
  .refine((p) => !p.starts_on || !p.ends_on || p.ends_on >= p.starts_on, {
    message: 'A plan cannot end before it starts',
    path: ['ends_on'],
  });

export type ProtectionPlanInput = z.infer<typeof ProtectionPlanInput>;

/** A schedule row's trigger fields, on both `schedules` and `user_schedules`. */
export const ScheduleTriggerInput = z.object({
  trigger: ScheduleTriggerSchema.default('time'),
  plan_id: Uuid.nullish(),
  offset_minutes: z.number().int().min(-720).max(720).default(0),
  quiet_start: TimeOfDay.nullish(),
  quiet_end: TimeOfDay.nullish(),
});

export type ScheduleTriggerInput = z.infer<typeof ScheduleTriggerInput>;
