import { describe, expect, it } from 'vitest';
import { FREE_SYSTEM_PROFILE_IDS, PLANS } from './entitlements.js';
import {
  AudioProfileSchema,
  effectiveForOutput,
  guestsMayHear,
  OUTPUT_CEILING_HZ,
  OUTPUT_KINDS,
  peakFreqHz,
  SYSTEM_PROFILES,
  SYSTEM_PROFILE_UUIDS,
  systemProfile,
  type AudioProfile,
} from './profiles.js';

const byId = (id: string): AudioProfile => {
  const p = SYSTEM_PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`no system profile ${id}`);
  return p;
};

describe('SYSTEM_PROFILES', () => {
  it('contains the nine shipped profiles with the expected ids', () => {
    expect(SYSTEM_PROFILES.map((p) => p.id)).toEqual([
      'sys_pigeon_18k',
      'sys_pulse_16k',
      'sys_sweep_15_19k',
      'sys_gull_17k',
      'sys_random_pulse',
      'sys_distress_pigeon',
      'sys_predator_hawk',
      'sys_predator_falcon',
      'sys_max_22k',
    ]);
  });

  it('every system profile validates against the schema', () => {
    for (const p of SYSTEM_PROFILES) {
      const parsed = AudioProfileSchema.safeParse(p);
      expect(parsed.success, `${p.id}: ${parsed.success ? '' : parsed.error.message}`).toBe(true);
    }
  });

  it('every system profile is flagged isSystem with no owner', () => {
    for (const p of SYSTEM_PROFILES) {
      expect(p.isSystem, p.id).toBe(true);
      expect(p.ownerUserId ?? null, p.id).toBeNull();
      expect(p.ownerOrgId ?? null, p.id).toBeNull();
      expect(PLANS).toContain(p.minPlan);
    }
  });

  it('has a deterministic uuid for every profile, and no extras', () => {
    expect(Object.keys(SYSTEM_PROFILE_UUIDS).sort()).toEqual(SYSTEM_PROFILES.map((p) => p.id).sort());
    const uuids = Object.values(SYSTEM_PROFILE_UUIDS);
    expect(new Set(uuids).size).toBe(9);
    for (const u of uuids) {
      expect(u).toMatch(/^00000000-0000-0000-0000-0000000000(0[1-9])$/);
    }
    expect(SYSTEM_PROFILE_UUIDS['sys_pigeon_18k']).toBe('00000000-0000-0000-0000-000000000001');
    expect(SYSTEM_PROFILE_UUIDS['sys_max_22k']).toBe('00000000-0000-0000-0000-000000000009');
  });

  it('systemProfile() looks profiles up by slug id and by uuid', () => {
    expect(systemProfile('sys_gull_17k')?.name).toBe(byId('sys_gull_17k').name);
    expect(systemProfile('00000000-0000-0000-0000-000000000004')?.id).toBe('sys_gull_17k');
    expect(systemProfile('nope')).toBeUndefined();
  });

  it('the free tier profiles are exactly the free-plan system profiles', () => {
    const freeIds = SYSTEM_PROFILES.filter((p) => p.minPlan === 'free').map((p) => p.id);
    expect(freeIds.sort()).toEqual([...FREE_SYSTEM_PROFILE_IDS].sort());
  });

  it('carries the expected params', () => {
    const pigeon = byId('sys_pigeon_18k');
    expect(pigeon.kind).toBe('tone');
    if (pigeon.kind === 'tone') expect(pigeon.params.freqHz).toBe(18000);

    const gull = byId('sys_gull_17k');
    if (gull.kind === 'tone') expect(gull.params.freqHz).toBe(17000);

    const max = byId('sys_max_22k');
    if (max.kind === 'tone') expect(max.params.freqHz).toBe(22000);

    const sweep = byId('sys_sweep_15_19k');
    expect(sweep.kind).toBe('sweep');
    if (sweep.kind === 'sweep') {
      expect(sweep.params.fromHz).toBe(15000);
      expect(sweep.params.toHz).toBe(19000);
    }

    const random = byId('sys_random_pulse');
    if (random.kind === 'pulse') expect(random.params.randomizePct).toBe(60);

    expect(byId('sys_distress_pigeon').kind).toBe('sample');
    expect(byId('sys_predator_hawk').kind).toBe('sample');
    expect(byId('sys_predator_falcon').kind).toBe('sample');
  });
});

describe('AudioProfileSchema', () => {
  it('rejects an out-of-range tone frequency', () => {
    const bad = { ...byId('sys_pigeon_18k'), params: { freqHz: 30000, gain: 0.8 } };
    expect(AudioProfileSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a gain above 1', () => {
    const bad = { ...byId('sys_pigeon_18k'), params: { freqHz: 18000, gain: 1.4 } };
    expect(AudioProfileSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown sample asset', () => {
    const bad = {
      ...byId('sys_distress_pigeon'),
      params: { asset: 'car_alarm', gapMs: 1000, randomizePct: 10, gain: 0.9 },
    };
    expect(AudioProfileSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown kind', () => {
    const bad = { ...byId('sys_pigeon_18k'), kind: 'laser' };
    expect(AudioProfileSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a user-owned custom profile', () => {
    const ok = AudioProfileSchema.safeParse({
      id: 'usr_abc',
      name: 'Patio 16k pulse',
      description: 'Custom',
      kind: 'pulse',
      params: { freqHz: 16000, onMs: 200, offMs: 800, randomizePct: 25, gain: 0.7 },
      minPlan: 'pro',
      isSystem: false,
      ownerUserId: '11111111-1111-1111-1111-111111111111',
    });
    expect(ok.success).toBe(true);
  });
});

describe('peakFreqHz()', () => {
  it('is the tone frequency for tones', () => {
    expect(peakFreqHz(byId('sys_pigeon_18k'))).toBe(18000);
    expect(peakFreqHz(byId('sys_max_22k'))).toBe(22000);
  });

  it('is the higher endpoint for sweeps', () => {
    expect(peakFreqHz(byId('sys_sweep_15_19k'))).toBe(19000);
  });

  it('is the carrier for pulses', () => {
    expect(peakFreqHz(byId('sys_pulse_16k'))).toBe(16000);
  });

  it('is 8000 for samples', () => {
    expect(peakFreqHz(byId('sys_distress_pigeon'))).toBe(8000);
  });
});

describe('guestsMayHear()', () => {
  it('flags energy above 17 kHz', () => {
    expect(guestsMayHear(byId('sys_pigeon_18k'))).toBe(true);
    expect(guestsMayHear(byId('sys_sweep_15_19k'))).toBe(true);
  });

  it('does not flag a 16 kHz pulse', () => {
    expect(guestsMayHear(byId('sys_pulse_16k'))).toBe(false);
  });

  it('does not flag exactly 17 kHz', () => {
    expect(guestsMayHear(byId('sys_gull_17k'))).toBe(false);
  });

  it('always flags samples, which are plainly audible', () => {
    expect(guestsMayHear(byId('sys_distress_pigeon'))).toBe(true);
    expect(guestsMayHear(byId('sys_predator_hawk'))).toBe(true);
  });
});

describe('effectiveForOutput()', () => {
  it('declares the honest ceilings per output', () => {
    expect(OUTPUT_CEILING_HZ).toEqual({
      phone: 18000,
      bt_speaker: 19000,
      pigeonx_emitter: 25000,
      simulated: 25000,
    });
    expect(Object.keys(OUTPUT_CEILING_HZ).sort()).toEqual([...OUTPUT_KINDS].sort());
  });

  it('is full when the whole profile fits under the ceiling', () => {
    expect(effectiveForOutput(byId('sys_pigeon_18k'), 'phone')).toBe('full');
    expect(effectiveForOutput(byId('sys_pulse_16k'), 'phone')).toBe('full');
    expect(effectiveForOutput(byId('sys_distress_pigeon'), 'phone')).toBe('full');
  });

  it('is none when nothing the profile emits survives', () => {
    expect(effectiveForOutput(byId('sys_max_22k'), 'phone')).toBe('none');
    expect(effectiveForOutput(byId('sys_max_22k'), 'bt_speaker')).toBe('none');
    expect(effectiveForOutput(byId('sys_max_22k'), 'pigeonx_emitter')).toBe('full');
  });

  it('is partial when a sweep is clipped by the ceiling', () => {
    expect(effectiveForOutput(byId('sys_sweep_15_19k'), 'phone')).toBe('partial');
    expect(effectiveForOutput(byId('sys_sweep_15_19k'), 'bt_speaker')).toBe('full');
  });

  it('every system profile plays fully on PigeonX hardware', () => {
    for (const p of SYSTEM_PROFILES) {
      expect(effectiveForOutput(p, 'pigeonx_emitter'), p.id).toBe('full');
    }
  });
});
