/**
 * PigeonX audio profiles.
 *
 * NOTE: temporary duplicate of `packages/core/profiles.ts`. When core ships,
 * this file becomes a re-export. Keep the shape identical.
 *
 * Physics constraints this encodes (spec §3):
 *  - phone speakers roll off ~18 kHz, BT codecs ~19 kHz, PigeonX hardware 25 kHz
 *  - anything with energy above 17 kHz is audible to many humans under 30
 */

import type { Plan } from './entitlements';

export type ProfileKind = 'tone' | 'sweep' | 'pulse' | 'sample';

export interface ToneParams {
  freqHz: number;
}
export interface SweepParams {
  startHz: number;
  endHz: number;
  /** sweeps per second */
  rateHz: number;
}
export interface PulseParams {
  freqHz: number;
  onMs: number;
  offMs: number;
  /** 0–100: how much the on/off timing wanders, so birds cannot habituate */
  randomizePct: number;
}
export interface SampleParams {
  /** key into SAMPLE_ASSETS */
  asset: SampleAsset;
  /** silence between plays, ms */
  gapMs: number;
  randomizePct: number;
}

export type ProfileParams =
  | ToneParams
  | SweepParams
  | PulseParams
  | SampleParams;

export type SampleAsset =
  | 'distress_pigeon'
  | 'predator_hawk'
  | 'predator_falcon'
  | 'alarm_generic';

export interface AudioProfile {
  id: string;
  name: string;
  description: string;
  kind: ProfileKind;
  params: ProfileParams;
  minPlan: Plan;
  isSystem: boolean;
}

export const SYSTEM_PROFILES: AudioProfile[] = [
  {
    id: 'sys_pigeon_18k',
    name: 'Pigeon Guard 18k',
    description: 'Pigeons · balconies & ledges',
    kind: 'tone',
    params: { freqHz: 18000 },
    minPlan: 'free',
    isSystem: true,
  },
  {
    id: 'sys_pulse_16k',
    name: 'Pulse 16k',
    description: 'Broad coverage · on-off pulsing so birds do not settle',
    kind: 'pulse',
    params: { freqHz: 16000, onMs: 400, offMs: 600, randomizePct: 20 },
    minPlan: 'free',
    isSystem: true,
  },
  {
    id: 'sys_sweep_15_19k',
    name: 'Sweep 15–19k',
    description: 'Rolls across the band so no single pitch gets ignored',
    kind: 'sweep',
    params: { startHz: 15000, endHz: 19000, rateHz: 0.5 },
    minPlan: 'free',
    isSystem: true,
  },
  {
    id: 'sys_gull_17k',
    name: 'Gull Guard 17k',
    description: 'Gulls · rooftops, docks & patios',
    kind: 'tone',
    params: { freqHz: 17000 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_random_pulse',
    name: 'Random Pulse',
    description: 'Heavily randomised timing for long unattended runs',
    kind: 'pulse',
    params: { freqHz: 17500, onMs: 250, offMs: 900, randomizePct: 60 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_distress_pigeon',
    name: 'Pigeon Distress Call',
    description: 'Flock alarm call · the best-evidenced approach',
    kind: 'sample',
    params: { asset: 'distress_pigeon', gapMs: 8000, randomizePct: 40 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_predator_hawk',
    name: 'Hawk Call',
    description: 'Predator overhead · use sparingly so it stays believable',
    kind: 'sample',
    params: { asset: 'predator_hawk', gapMs: 15000, randomizePct: 50 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_predator_falcon',
    name: 'Falcon Call',
    description: 'Predator overhead · pairs well with the hawk call',
    kind: 'sample',
    params: { asset: 'predator_falcon', gapMs: 15000, randomizePct: 50 },
    minPlan: 'pro',
    isSystem: true,
  },
  {
    id: 'sys_max_22k',
    name: 'Max 22k',
    description: 'Needs PigeonX hardware · above what a phone can reproduce',
    kind: 'tone',
    params: { freqHz: 22000 },
    minPlan: 'pro',
    isSystem: true,
  },
];

export function findSystemProfile(id: string): AudioProfile | undefined {
  return SYSTEM_PROFILES.find((p) => p.id === id);
}

/** Nominal peak frequency for a sample-based profile (bird calls are audible). */
export const SAMPLE_PEAK_HZ = 8000;
/** Nominal lowest frequency for a sample-based profile. */
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

/** True when people nearby are likely to hear this profile. */
export function guestsMayHear(p: AudioProfile): boolean {
  return peakFreqHz(p) > 17000 || p.kind === 'sample';
}

export type OutputKind =
  | 'phone'
  | 'bt_speaker'
  | 'pigeonx_emitter'
  | 'simulated';

export const OUTPUT_CEILING_HZ: Record<OutputKind, number> = {
  phone: 18000,
  bt_speaker: 19000,
  pigeonx_emitter: 25000,
  simulated: 25000,
};

export const OUTPUT_LABEL: Record<OutputKind, string> = {
  phone: 'Phone speaker',
  bt_speaker: 'Bluetooth speaker',
  pigeonx_emitter: 'PigeonX device',
  simulated: 'Simulated device',
};

export type Effectiveness = 'full' | 'partial' | 'none';

/**
 * How much of a profile this output can actually reproduce.
 * Samples are ordinary audible audio — every speaker plays them in full.
 */
export function effectiveForOutput(
  p: AudioProfile,
  output: OutputKind
): Effectiveness {
  if (p.kind === 'sample') return 'full';
  const ceiling = OUTPUT_CEILING_HZ[output];
  const peak = peakFreqHz(p);
  if (peak <= ceiling) return 'full';
  if (lowFreqHz(p) <= ceiling) return 'partial';
  return 'none';
}

export const EFFECTIVENESS_COPY: Record<
  Effectiveness,
  { title: string; detail: string }
> = {
  full: {
    title: 'Full range',
    detail: 'This output can reproduce the whole profile.',
  },
  partial: {
    title: 'Partial range',
    detail:
      'Only the lower part of this profile comes out of this speaker. The top of the sweep is lost.',
  },
  none: {
    title: 'Out of range',
    detail:
      'This speaker cannot produce these frequencies at all. Pick a lower profile or PigeonX hardware.',
  },
};

export function formatHz(hz: number): string {
  if (hz >= 1000) {
    const k = hz / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)} kHz`;
  }
  return `${Math.round(hz)} Hz`;
}

/** Short human summary of a profile's parameters, for cards and lists. */
export function describeParams(p: AudioProfile): string {
  switch (p.kind) {
    case 'tone':
      return formatHz((p.params as ToneParams).freqHz);
    case 'pulse': {
      const q = p.params as PulseParams;
      return `${formatHz(q.freqHz)} · ${q.onMs}/${q.offMs} ms`;
    }
    case 'sweep': {
      const q = p.params as SweepParams;
      return `${formatHz(q.startHz)} → ${formatHz(q.endHz)}`;
    }
    case 'sample': {
      const q = p.params as SampleParams;
      return `Call every ${Math.round(q.gapMs / 1000)} s`;
    }
  }
}

export const KIND_LABEL: Record<ProfileKind, string> = {
  tone: 'Steady tone',
  sweep: 'Sweep',
  pulse: 'Pulse',
  sample: 'Recorded call',
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
