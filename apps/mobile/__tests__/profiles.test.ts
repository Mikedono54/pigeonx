import {
  SYSTEM_PROFILES,
  OUTPUT_CEILING_HZ,
  effectiveForOutput,
  findSystemProfile,
  guestsMayHear,
  lowFreqHz,
  peakFreqHz,
  type AudioProfile,
} from '../src/core/profiles';

const get = (id: string): AudioProfile => {
  const p = findSystemProfile(id);
  if (!p) throw new Error(`missing profile ${id}`);
  return p;
};

describe('system catalogue', () => {
  it('ships the nine profiles the spec calls for, three of them free', () => {
    expect(SYSTEM_PROFILES).toHaveLength(9);
    expect(SYSTEM_PROFILES.filter((p) => p.minPlan === 'free')).toHaveLength(3);
    expect(SYSTEM_PROFILES.every((p) => p.isSystem)).toBe(true);
  });

  it('has unique ids', () => {
    const ids = SYSTEM_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('peakFreqHz / lowFreqHz', () => {
  it('reads a tone straight off its frequency', () => {
    expect(peakFreqHz(get('sys_pigeon_18k'))).toBe(18000);
    expect(lowFreqHz(get('sys_pigeon_18k'))).toBe(18000);
  });

  it('takes the top and bottom of a sweep', () => {
    const sweep = get('sys_sweep_15_19k');
    expect(peakFreqHz(sweep)).toBe(19000);
    expect(lowFreqHz(sweep)).toBe(15000);
  });

  it('uses the carrier frequency of a pulse', () => {
    expect(peakFreqHz(get('sys_pulse_16k'))).toBe(16000);
  });
});

describe('guestsMayHear()', () => {
  it('is false below the 17 kHz threshold', () => {
    expect(guestsMayHear(get('sys_pulse_16k'))).toBe(false);
  });

  it('is false exactly at 17 kHz and true above it', () => {
    expect(guestsMayHear(get('sys_gull_17k'))).toBe(false);
    expect(guestsMayHear(get('sys_pigeon_18k'))).toBe(true);
    expect(guestsMayHear(get('sys_random_pulse'))).toBe(true);
  });

  it('is always true for recorded calls', () => {
    expect(guestsMayHear(get('sys_distress_pigeon'))).toBe(true);
    expect(guestsMayHear(get('sys_predator_hawk'))).toBe(true);
  });
});

describe('effectiveForOutput()', () => {
  it('is full when the peak sits under the output ceiling', () => {
    expect(effectiveForOutput(get('sys_pigeon_18k'), 'phone')).toBe('full');
    expect(effectiveForOutput(get('sys_gull_17k'), 'phone')).toBe('full');
  });

  it('is none when even the lowest tone is out of reach', () => {
    expect(effectiveForOutput(get('sys_max_22k'), 'phone')).toBe('none');
    expect(effectiveForOutput(get('sys_max_22k'), 'bt_speaker')).toBe('none');
  });

  it('is partial when a sweep straddles the ceiling', () => {
    const sweep = get('sys_sweep_15_19k'); // 15k → 19k
    expect(effectiveForOutput(sweep, 'phone')).toBe('partial'); // 18k ceiling
    expect(effectiveForOutput(sweep, 'bt_speaker')).toBe('full'); // 19k ceiling
  });

  it('reaches everything on PigeonX hardware and the simulator', () => {
    for (const p of SYSTEM_PROFILES) {
      expect(effectiveForOutput(p, 'pigeonx_emitter')).toBe('full');
      expect(effectiveForOutput(p, 'simulated')).toBe('full');
    }
  });

  it('always plays recorded calls in full, on any output', () => {
    const call = get('sys_predator_falcon');
    expect(effectiveForOutput(call, 'phone')).toBe('full');
    expect(effectiveForOutput(call, 'bt_speaker')).toBe('full');
  });

  it('encodes the physics ceilings from the spec', () => {
    expect(OUTPUT_CEILING_HZ.phone).toBe(18000);
    expect(OUTPUT_CEILING_HZ.bt_speaker).toBe(19000);
    expect(OUTPUT_CEILING_HZ.pigeonx_emitter).toBe(25000);
    expect(OUTPUT_CEILING_HZ.simulated).toBe(25000);
  });
});
