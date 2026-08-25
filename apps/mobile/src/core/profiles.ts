/**
 * PigeonX bird sounds.
 *
 * NOTE: temporary duplicate of `packages/core/profiles.ts`. When core ships,
 * this file becomes a re-export. Keep the shape identical.
 *
 * Physics this file encodes (spec section 3):
 *  - phone speakers stop near 18 kHz, Bluetooth near 19 kHz, PigeonX 25 kHz
 *  - anything above 17 kHz is audible to many people under 30
 *
 * Every string in here is read by a person. Clear, specific and professional,
 * never a code word. See docs/mobile-glossary.md before you add one.
 */

import type { Plan } from './entitlements';

export type ProfileKind = 'tone' | 'sweep' | 'pulse' | 'sample';

export interface ToneParams {
  freqHz: number;
}
export interface SweepParams {
  startHz: number;
  endHz: number;
  /** rises and falls per second */
  rateHz: number;
}
export interface PulseParams {
  freqHz: number;
  onMs: number;
  offMs: number;
  /** 0 to 100: how much the on/off timing wanders, so it is harder to predict */
  randomizePct: number;
}
export interface SampleParams {
  /** key into SAMPLE_ASSETS */
  asset: SampleAsset;
  /** quiet gap between plays, ms */
  gapMs: number;
  randomizePct: number;
}

export type ProfileParams = ToneParams | SweepParams | PulseParams | SampleParams;

export type SampleAsset = 'distress_pigeon' | 'predator_hawk' | 'predator_falcon' | 'alarm_generic';

export interface AudioProfile {
  id: string;
  name: string;
  description: string;
  kind: ProfileKind;
  params: ProfileParams;
  minPlan: Plan;
  isSystem: boolean;
  /** when this sound last changed on this phone. Built-in sounds never do. */
  updatedAt?: number;
  /** the id the account gave this sound, once it has one */
  remoteId?: string | null;
}

export const SYSTEM_PROFILES: AudioProfile[] = [
  {
    id: 'sys_pigeon_18k',
    name: 'High-frequency deterrent',
    description: 'Steady 18 kHz tone',
    kind: 'tone',
    params: { freqHz: 18000 },
    minPlan: 'free',
    isSystem: true,
  },
  {
    id: 'sys_pulse_16k',
    name: 'Unpredictable beeps',
    description: 'Harder for birds to predict',
    kind: 'pulse',
    params: { freqHz: 16000, onMs: 400, offMs: 600, randomizePct: 20 },
    minPlan: 'free',
    isSystem: true,
  },
  {
    id: 'sys_sweep_15_19k',
    name: 'Variable pitch sweep',
    description: 'Continuously shifts frequency',
    kind: 'sweep',
    params: { startHz: 15000, endHz: 19000, rateHz: 0.5 },
    minPlan: 'free',
    isSystem: true,
  },
  {
    id: 'sys_gull_17k',
    name: 'Gull deterrent',
    description: 'Steady tone for roofs and docks',
    kind: 'tone',
    params: { freqHz: 17000 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_random_pulse',
    name: 'Randomized beeps',
    description: 'Random timing for long sessions',
    kind: 'pulse',
    params: { freqHz: 17500, onMs: 250, offMs: 900, randomizePct: 60 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_distress_pigeon',
    name: 'Pigeon distress call',
    description: 'Real pigeon distress recording',
    kind: 'sample',
    params: { asset: 'distress_pigeon', gapMs: 8000, randomizePct: 40 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_predator_hawk',
    name: 'Red-tailed hawk scream',
    description: 'Real red-tailed hawk recording',
    kind: 'sample',
    params: { asset: 'predator_hawk', gapMs: 15000, randomizePct: 50 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_predator_falcon',
    name: 'Peregrine alarm call',
    description: 'Real peregrine falcon recording',
    kind: 'sample',
    params: { asset: 'predator_falcon', gapMs: 15000, randomizePct: 50 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_max_22k',
    name: 'Maximum frequency',
    description: '22 kHz. Needs a PigeonX speaker',
    kind: 'tone',
    params: { freqHz: 22000 },
    minPlan: 'pro',
    isSystem: true,
  },
];

export function findSystemProfile(id: string): AudioProfile | undefined {
  return SYSTEM_PROFILES.find((p) => p.id === id);
}

/**
 * The ids the account gives the nine built-in sounds.
 *
 * NOTE: mirror of `SYSTEM_PROFILE_UUIDS` in `packages/core/src/profiles.ts`,
 * which is what the seed rows are written with. `remoteSoundId()` prefers what
 * the account actually reports; this map is the fallback for a phone that has
 * never reached the account, so a plan made offline still points at the right
 * sounds once it goes up.
 */
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

/** The built-in sound one of those ids belongs to. */
export function systemProfileByUuid(uuid: string): AudioProfile | undefined {
  const id = Object.keys(SYSTEM_PROFILE_UUIDS).find((k) => SYSTEM_PROFILE_UUIDS[k] === uuid);
  return id ? findSystemProfile(id) : undefined;
}

/** Nominal top pitch of a bird call. Calls are ordinary audible audio. */
export const SAMPLE_PEAK_HZ = 8000;
/** Nominal lowest pitch of a bird call. */
export const SAMPLE_LOW_HZ = 500;

export function peakFreqHz(p: AudioProfile): number {
  switch (p.kind) {
    case 'tone':
      return (p.params as ToneParams).freqHz;
    case 'pulse':
      return (p.params as PulseParams).freqHz;
    case 'sweep': {
      const s = p.params as SweepParams;
      return Math.max(s.startHz, s.endHz);
    }
    case 'sample':
      return SAMPLE_PEAK_HZ;
  }
}

export function lowFreqHz(p: AudioProfile): number {
  switch (p.kind) {
    case 'tone':
      return (p.params as ToneParams).freqHz;
    case 'pulse':
      return (p.params as PulseParams).freqHz;
    case 'sweep': {
      const s = p.params as SweepParams;
      return Math.min(s.startHz, s.endHz);
    }
    case 'sample':
      return SAMPLE_LOW_HZ;
  }
}

/**
 * The pitch of a sound, said the only honest way: as the number itself.
 *
 * Words like LOW, HIGH and VERY HIGH told a person nothing they could check,
 * and they flattened 15 kHz and 22 kHz into the same shrug. A generated sound
 * says what it generates. A recording of a bird says the range a bird sings
 * in, because a call is a spread of pitches and not one number.
 */
export function pitchLabel(p: AudioProfile): string {
  if (p.kind === 'sample') return 'Low frequency';
  const low = lowFreqHz(p);
  const high = peakFreqHz(p);
  if (low === high) return formatHz(high);
  return `${formatHz(low).replace(' kHz', '')} to ${formatHz(high)}`;
}

/**
 * Where a sound comes from. Two words on a card, so nobody has to guess
 * whether they are about to hear a bird or a synthesiser.
 */
export function sourceTag(p: AudioProfile): string {
  return p.kind === 'sample' ? 'Natural recording' : 'Generated tone';
}

/**
 * The band where a generated sound stops being a promise.
 *
 * Under 15 kHz every phone plays it and nearly everybody hears it. From 15 to
 * 20 kHz both halves wobble: phone speakers roll off around 18 kHz and hearing
 * at the top of the band falls away with age. Above 20 kHz no phone reaches it
 * at all.
 */
export const AUDIBLE_BAND_LOW_HZ = 15000;
export const AUDIBLE_BAND_TOP_HZ = 20000;

/**
 * What we are willing to say about whether a person will hear this.
 *
 * `speaker_only` is not a fourth guess about ears. It is the honest answer for
 * 22 kHz on a phone: the question of hearing it never comes up, because
 * nothing comes out.
 */
export type AudibleState = 'audible' | 'maybe' | 'inaudible' | 'speaker_only';

export const AUDIBLE_LABEL: Record<AudibleState, string> = {
  audible: 'Audible',
  maybe: 'May be audible',
  inaudible: 'Typically inaudible',
  speaker_only: 'Needs a PigeonX speaker',
};

/** What each of those four words means, one tap away from the tag. */
export const AUDIBLE_EXPLAINER: Record<AudibleState, string> = {
  audible: 'This sound sits inside human hearing. People nearby will hear it.',
  maybe:
    'This sound sits between 15 and 20 kHz. Phone speakers roll off near the top of that, and hearing up there falls away with age, so some people nearby will hear it and some will not.',
  inaudible:
    'At 22 kHz most people hear nothing at all. A PigeonX speaker is what plays it.',
  speaker_only:
    'This sound is higher than the speaker you picked can play. A PigeonX speaker plays it.',
};

/**
 * Whether a person nearby will hear this sound, out of this speaker.
 *
 * The output matters for one sound only, and it matters absolutely: 22 kHz is
 * typically inaudible when a PigeonX speaker plays it, and simply silent when
 * a phone tries to.
 */
export function audibleState(p: AudioProfile, output: OutputKind): AudibleState {
  if (p.kind === 'sample') return 'audible';
  const peak = peakFreqHz(p);
  if (peak > AUDIBLE_BAND_TOP_HZ) {
    return OUTPUT_CEILING_HZ[output] >= peak ? 'inaudible' : 'speaker_only';
  }
  if (peak >= AUDIBLE_BAND_LOW_HZ) return 'maybe';
  return 'audible';
}

/**
 * True when people nearby may hear this sound at all: every recording, and
 * every generated sound up to the top of the wobbly band.
 */
export function guestsMayHear(p: AudioProfile): boolean {
  return p.kind === 'sample' || peakFreqHz(p) <= AUDIBLE_BAND_TOP_HZ;
}

export type OutputKind = 'phone' | 'bt_speaker' | 'pigeonx_emitter' | 'simulated';

export const OUTPUT_CEILING_HZ: Record<OutputKind, number> = {
  phone: 18000,
  bt_speaker: 19000,
  pigeonx_emitter: 25000,
  simulated: 25000,
};

/** What each speaker is called on screen. */
export const SPEAKER_LABEL: Record<OutputKind, string> = {
  phone: 'This phone',
  bt_speaker: 'Bluetooth speaker',
  pigeonx_emitter: 'PigeonX speaker',
  simulated: 'Test speaker',
};

/** One line telling you what each speaker is good for. */
export const SPEAKER_HINT: Record<OutputKind, string> = {
  phone: '',
  bt_speaker: 'Plays out of a speaker you already paired.',
  pigeonx_emitter: 'Plays the highest sounds. Not out yet.',
  simulated: 'Pretend speaker. Lets you try the whole app.',
};

export type Effectiveness = 'full' | 'partial' | 'none';

/**
 * How much of a sound this speaker can really play.
 * Bird calls are ordinary audible audio, so every speaker plays them whole.
 */
export function effectiveForOutput(p: AudioProfile, output: OutputKind): Effectiveness {
  if (p.kind === 'sample') return 'full';
  const ceiling = OUTPUT_CEILING_HZ[output];
  const peak = peakFreqHz(p);
  if (peak <= ceiling) return 'full';
  if (lowFreqHz(p) <= ceiling) return 'partial';
  return 'none';
}

/** The question the reach meter answers. */
export const REACH_QUESTION = 'Will this speaker play it?';

export const EFFECTIVENESS_COPY: Record<Effectiveness, { title: string }> = {
  full: { title: 'Yes' },
  partial: { title: 'Partly' },
  none: { title: 'No' },
};

/** One sentence saying why the answer is what it is. */
export function reachSentence(p: AudioProfile, output: OutputKind): string {
  const level = effectiveForOutput(p, output);
  if (level === 'full') return 'This speaker plays the whole sound.';
  if (level === 'partial') {
    return output === 'phone'
      ? 'Phone speakers play the low part. The top is lost.'
      : 'This speaker plays the low part. The top is lost.';
  }
  return output === 'phone'
    ? "Phone speakers can't play sounds this high. Use a PigeonX speaker."
    : "This speaker can't play sounds this high. Use a PigeonX speaker.";
}

/** Small mono readout. Only the Adjust sheet shows a number. */
export function formatHz(hz: number): string {
  if (hz >= 1000) {
    const k = hz / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)} kHz`;
  }
  return `${Math.round(hz)} Hz`;
}

export const KIND_LABEL: Record<ProfileKind, string> = {
  tone: 'Steady sound',
  sweep: 'Rising and falling sound',
  pulse: 'Beeping sound',
  sample: 'Bird call',
};

export function defaultParamsFor(kind: ProfileKind): ProfileParams {
  switch (kind) {
    case 'tone':
      return { freqHz: 17000 };
    case 'sweep':
      return { startHz: 15000, endHz: 19000, rateHz: 0.5 };
    case 'pulse':
      return { freqHz: 17000, onMs: 400, offMs: 600, randomizePct: 20 };
    case 'sample':
      return { asset: 'distress_pigeon', gapMs: 8000, randomizePct: 40 };
  }
}
