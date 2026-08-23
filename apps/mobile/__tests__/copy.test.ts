import {
  AUDIBLE_TAG,
  EFFECTIVENESS_COPY,
  KIND_LABEL,
  SPEAKER_HINT,
  SPEAKER_LABEL,
  REACH_QUESTION,
  SYSTEM_PROFILES,
  pitchWord,
  reachSentence,
  soundPitch,
  findSystemProfile,
} from '../src/core/profiles';
import { FEATURE_LABEL, PLAN_LABEL } from '../src/core/entitlements';
import { ROLE_HINT, ROLE_LABEL } from '../src/services/business';
import { liveLabel } from '../src/core/places';
import { plainMessage } from '../src/services/supabase';
import { describeLinkProblem } from '../src/services/auth';
import { describeDays, describeSchedule } from '../src/state/useSchedules';
import { PLACEHOLDER_NOTICE } from '../src/audio/samples';

/** Words a person should never have to read. See docs/mobile-glossary.md. */
const BANNED =
  /\b(profile|deterrent|deterrence|session|output|emitter|zone|frequency|entitlement|sandbox|simulated|tier|gate|RPC|sync|queue|config|invalid|null)\b/i;

const DASHES = /[–—]/;

function checkString(s: string): void {
  expect(s).not.toMatch(BANNED);
  expect(s).not.toMatch(DASHES);
}

describe('sound names and descriptions', () => {
  it('use plain words only', () => {
    for (const p of SYSTEM_PROFILES) {
      checkString(p.name);
      checkString(p.description);
    }
  });

  it('describes every sound in six words or fewer', () => {
    for (const p of SYSTEM_PROFILES) {
      expect(p.description.split(' ').length).toBeLessThanOrEqual(6);
    }
  });

  it('names the sounds we have not recorded yet in one word', () => {
    expect(PLACEHOLDER_NOTICE).toBe('Stand-in');
    checkString(PLACEHOLDER_NOTICE);
  });

  it('reads the way the sounds screen shows them', () => {
    const said = Object.fromEntries(SYSTEM_PROFILES.map((p) => [p.id, p.description]));
    expect(said.sys_pigeon_18k).toBe('Steady high sound');
    expect(said.sys_pulse_16k).toBe('Beeps birds cannot predict');
    expect(said.sys_sweep_15_19k).toBe('Slides up and down');
    expect(said.sys_distress_pigeon).toBe('Scared pigeon call');
    expect(said.sys_predator_hawk).toBe('Hawk cry');
    expect(said.sys_predator_falcon).toBe('Falcon cry');
  });
});

describe('pitchWord()', () => {
  it('turns a number into a word a ten-year-old reads', () => {
    expect(pitchWord(12000)).toBe('Low');
    expect(pitchWord(14999)).toBe('Low');
    expect(pitchWord(15000)).toBe('High');
    expect(pitchWord(18000)).toBe('High');
    expect(pitchWord(19000)).toBe('Very high');
    expect(pitchWord(22000)).toBe('Very high');
  });

  it('calls a bird call low, because you can hear it', () => {
    expect(soundPitch(findSystemProfile('sys_predator_hawk')!)).toBe('Low');
  });
});

describe('will this speaker play it?', () => {
  it('asks the question in words', () => {
    expect(REACH_QUESTION).toBe('Will this speaker play it?');
  });

  it('answers Yes, Partly or No', () => {
    expect(EFFECTIVENESS_COPY.full.title).toBe('Yes');
    expect(EFFECTIVENESS_COPY.partial.title).toBe('Partly');
    expect(EFFECTIVENESS_COPY.none.title).toBe('No');
  });

  it('says why a phone cannot play the highest sound', () => {
    const sentence = reachSentence(findSystemProfile('sys_max_22k')!, 'phone');
    expect(sentence).toContain("Phone speakers can't play sounds this high");
    checkString(sentence);
  });

  it('says the whole sound plays when it does', () => {
    const sentence = reachSentence(findSystemProfile('sys_pigeon_18k')!, 'pigeonx_emitter');
    expect(sentence).toBe('This speaker plays the whole sound.');
  });
});

describe('labels people read', () => {
  it('says nothing under This phone, because the name says it', () => {
    expect(SPEAKER_HINT.phone).toBe('');
  });

  it('names each speaker in plain words', () => {
    expect(SPEAKER_LABEL.phone).toBe('This phone');
    expect(SPEAKER_LABEL.bt_speaker).toBe('Bluetooth speaker');
    expect(SPEAKER_LABEL.pigeonx_emitter).toBe('PigeonX speaker');
    expect(SPEAKER_LABEL.simulated).toBe('Test speaker');
  });

  it('keeps every label clean', () => {
    for (const s of [
      ...Object.values(SPEAKER_LABEL),
      ...Object.values(SPEAKER_HINT),
      ...Object.values(KIND_LABEL),
      ...Object.values(FEATURE_LABEL),
      ...Object.values(PLAN_LABEL),
      ...Object.values(ROLE_LABEL),
      ...Object.values(ROLE_HINT),
      AUDIBLE_TAG,
      REACH_QUESTION,
    ]) {
      checkString(s);
    }
  });

  it('warns about sounds people can hear', () => {
    expect(AUDIBLE_TAG).toBe('People can hear it');
  });
});

describe('what a person reads when something goes wrong', () => {
  it('says what happened and what to do next', () => {
    expect(plainMessage({ message: 'Network request failed' })).toBe(
      'Your phone is not online. Try again in a minute.',
    );
    expect(plainMessage({ code: 'PGRST202' })).toBe('This part is not ready yet. Try again later.');
    expect(plainMessage({ message: 'new row violates row-level security' })).toBe(
      'You do not have permission to do that.',
    );
    expect(plainMessage(null)).toBe("That didn't work. Try again.");
  });

  it('keeps every line clean', () => {
    for (const line of [
      plainMessage({ message: 'Network request failed' }),
      plainMessage({ code: 'PGRST202' }),
      plainMessage({ message: 'duplicate key value' }),
      plainMessage({ message: 'rate limit exceeded' }),
      plainMessage(null),
      describeLinkProblem('Token has expired'),
      describeLinkProblem('boom'),
    ]) {
      checkString(line);
    }
  });
});

describe('what an area row says', () => {
  it('reads as words, not as a state', () => {
    expect(liveLabel(undefined)).toBe('Off');
    expect(liveLabel({ playing: true, startedAt: 0 }, 12 * 60_000 + 40_000)).toBe('Playing 12:40');
  });

  it('names each teammate in plain words', () => {
    expect(ROLE_LABEL.staff).toBe('Teammate');
    expect(ROLE_LABEL.owner).toBe('Owner');
  });
});

describe('describeSchedule()', () => {
  it('reads like a sentence', () => {
    expect(
      describeSchedule({
        days: [1, 2, 3, 4, 5],
        startMinutes: 18 * 60,
        endMinutes: 22 * 60,
        profileName: 'Pigeon sound',
      }),
    ).toBe('Weekdays, 6:00 PM to 10:00 PM, Pigeon sound');
  });

  it('names groups of days in words', () => {
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(describeDays([0, 6])).toBe('Weekends');
    expect(describeDays([])).toBe('No days picked');
  });
});
