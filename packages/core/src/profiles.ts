import { z } from 'zod';
import { PLANS, type Plan } from './entitlements.js';

/**
 * Audio profile model — shared by the mobile engine, the web dashboard and the
 * `audio_profiles` table. `params` is stored as jsonb; the schemas below are the
 * contract that keeps the column honest.
 */

export type ProfileKind = 'tone' | 'sweep' | 'pulse' | 'sample';

export const PROFILE_KINDS = [
  'tone',
  'sweep',
  'pulse',
  'sample',
] as const satisfies readonly ProfileKind[];

/** Deterrence energy lives between 1 kHz and 25 kHz; anything else is a bug. */
const freqHz = z.number().min(1000).max(25000);
const gain = z.number().min(0).max(1);
const randomizePct = z.number().min(0).max(100);
/** Postgres `uuid` semantics: any hex UUID shape, no RFC version/variant policing. */
const uuid = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID',
  );

export const SAMPLE_ASSETS = [
  'distress_pigeon',
  'predator_hawk',
  'predator_falcon',
  'synth_chirp',
] as const;

export type SampleAsset = (typeof SAMPLE_ASSETS)[number];

/** Samples are recorded calls; their spectral peak is treated as 8 kHz. */
export const SAMPLE_PEAK_HZ = 8000;

export const ToneParams = z.object({ freqHz, gain });
export const SweepParams = z.object({
  fromHz: freqHz,
  toHz: freqHz,
  rateHz: z.number().min(0.05).max(10),
  gain,
});
export const PulseParams = z.object({
  freqHz,
  onMs: z.number().min(20).max(5000),
  offMs: z.number().min(20).max(10000),
  randomizePct,
  gain,
});
export const SampleParams = z.object({
  asset: z.enum(SAMPLE_ASSETS),
  gapMs: z.number().min(0).max(60000),
  randomizePct,
  gain,
});

export type ToneParams = z.infer<typeof ToneParams>;
export type SweepParams = z.infer<typeof SweepParams>;
export type PulseParams = z.infer<typeof PulseParams>;
export type SampleParams = z.infer<typeof SampleParams>;

const PlanSchema = z.enum(PLANS);

const base = {
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  minPlan: PlanSchema,
  isSystem: z.boolean(),
  ownerUserId: uuid.nullish(),
  ownerOrgId: uuid.nullish(),
};

export const AudioProfileSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('tone'), params: ToneParams }),
  z.object({ ...base, kind: z.literal('sweep'), params: SweepParams }),
  z.object({ ...base, kind: z.literal('pulse'), params: PulseParams }),
  z.object({ ...base, kind: z.literal('sample'), params: SampleParams }),
]);

export type AudioProfile = z.infer<typeof AudioProfileSchema>;

/** The stable UUIDs the `audio_profiles` seed rows use, keyed by slug id. */
export const SYSTEM_PROFILE_UUIDS: Record<string, string> = {
  sys_pigeon_18k: '00000000-0000-0000-0000-000000000001',
  sys_pulse_16k: '00000000-0000-0000-0000-000000000002',
  sys_sweep_15_19k: '00000000-0000-0000-0000-000000000003',
  sys_gull_17k: '00000000-0000-0000-0000-000000000004',
  sys_random_pulse: '00000000-0000-0000-0000-000000000005',
  sys_distress_pigeon: '00000000-0000-0000-0000-000000000006',
  sys_predator_hawk: '00000000-0000-0000-0000-000000000007',
  sys_predator_falcon: '00000000-0000-0000-0000-000000000008',
  sys_max_22k: '00000000-0000-0000-0000-000000000009',
};

export const SYSTEM_PROFILES: AudioProfile[] = [
  {
    id: 'sys_pigeon_18k',
    name: 'Pigeon 18 kHz',
    description: 'Steady 18 kHz tone. The default starting point for pigeons on a phone speaker.',
    kind: 'tone',
    params: { freqHz: 18000, gain: 0.8 },
    minPlan: 'free',
    isSystem: true,
  },
  {
    id: 'sys_pulse_16k',
    name: 'Pulse 16 kHz',
    description:
      'Gated 16 kHz tone, 200 ms on / 800 ms off. Quieter to guests than the 18 kHz tone.',
    kind: 'pulse',
    params: { freqHz: 16000, onMs: 200, offMs: 800, randomizePct: 0, gain: 0.8 },
    minPlan: 'free',
    isSystem: true,
  },
  {
    id: 'sys_sweep_15_19k',
    name: 'Sweep 15–19 kHz',
    description: 'Slow sweep across 15–19 kHz so birds cannot settle into one frequency.',
    kind: 'sweep',
    params: { fromHz: 15000, toHz: 19000, rateHz: 0.25, gain: 0.8 },
    minPlan: 'free',
    isSystem: true,
  },
  {
    id: 'sys_gull_17k',
    name: 'Gull 17 kHz',
    description: 'Steady 17 kHz tone tuned for gulls and larger shorebirds.',
    kind: 'tone',
    params: { freqHz: 17000, gain: 0.85 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_random_pulse',
    name: 'Randomized pulse',
    description: 'Pulsed 16.5 kHz with 60% timing randomization to prevent habituation.',
    kind: 'pulse',
    params: { freqHz: 16500, onMs: 150, offMs: 600, randomizePct: 60, gain: 0.85 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_distress_pigeon',
    name: 'Pigeon distress call',
    description:
      'Recorded pigeon distress call on a 20 s cycle. Audible to people — best away from seating.',
    kind: 'sample',
    params: { asset: 'distress_pigeon', gapMs: 20000, randomizePct: 30, gain: 0.9 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_predator_hawk',
    name: 'Hawk call',
    description: 'Red-tailed hawk call on a 30 s cycle. Audible to people.',
    kind: 'sample',
    params: { asset: 'predator_hawk', gapMs: 30000, randomizePct: 40, gain: 0.9 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_predator_falcon',
    name: 'Falcon call',
    description: 'Peregrine falcon call on a 30 s cycle. Audible to people.',
    kind: 'sample',
    params: { asset: 'predator_falcon', gapMs: 30000, randomizePct: 40, gain: 0.9 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_max_22k',
    name: 'Max 22 kHz',
    description:
      'Steady 22 kHz tone. Requires PigeonX hardware — phone and Bluetooth speakers cannot reproduce it.',
    kind: 'tone',
    params: { freqHz: 22000, gain: 0.9 },
    minPlan: 'pro',
    isSystem: true,
  },
];

const BY_ID = new Map<string, AudioProfile>();
for (const p of SYSTEM_PROFILES) {
  BY_ID.set(p.id, p);
  const seeded = SYSTEM_PROFILE_UUIDS[p.id];
  if (seeded) BY_ID.set(seeded, p);
}

/** Look up a system profile by its slug id or by its seeded UUID. */
export function systemProfile(idOrUuid: string): AudioProfile | undefined {
  return BY_ID.get(idOrUuid);
}

/** The highest frequency this profile actually emits. */
export function peakFreqHz(p: AudioProfile): number {
  switch (p.kind) {
    case 'tone':
      return p.params.freqHz;
    case 'pulse':
      return p.params.freqHz;
    case 'sweep':
      return Math.max(p.params.fromHz, p.params.toHz);
    case 'sample':
      return SAMPLE_PEAK_HZ;
  }
}

/** The lowest frequency this profile emits — what survives a hard roll-off. */
export function lowFreqHz(p: AudioProfile): number {
  switch (p.kind) {
    case 'tone':
    case 'pulse':
      return p.params.freqHz;
    case 'sweep':
      return Math.min(p.params.fromHz, p.params.toHz);
    case 'sample':
      return SAMPLE_PEAK_HZ;
  }
}

/** Above 17 kHz is audible to plenty of people under 30; samples always are. */
export function guestsMayHear(p: AudioProfile): boolean {
  return peakFreqHz(p) > 17000 || p.kind === 'sample';
}

export type OutputKind = 'phone' | 'bt_speaker' | 'pigeonx_emitter' | 'simulated';

export const OUTPUT_KINDS = [
  'phone',
  'bt_speaker',
  'pigeonx_emitter',
  'simulated',
] as const satisfies readonly OutputKind[];

/** Honest reproduction ceilings — see spec §3. */
export const OUTPUT_CEILING_HZ: Record<OutputKind, number> = {
  phone: 18000,
  bt_speaker: 19000,
  pigeonx_emitter: 25000,
  simulated: 25000,
};

/**
 * How much of the profile the chosen output can actually reproduce.
 * `partial` means part of the emitted band is above the ceiling (a clipped sweep).
 */
export function effectiveForOutput(p: AudioProfile, o: OutputKind): 'full' | 'partial' | 'none' {
  const ceiling = OUTPUT_CEILING_HZ[o];
  if (peakFreqHz(p) <= ceiling) return 'full';
  if (lowFreqHz(p) <= ceiling) return 'partial';
  return 'none';
}

/** Profiles this plan is allowed to run. */
export function systemProfilesForPlan(plan: Plan): AudioProfile[] {
  const rank = PLANS.indexOf(plan);
  return SYSTEM_PROFILES.filter((p) => PLANS.indexOf(p.minPlan) <= rank);
}
