import fs from 'node:fs';
import path from 'node:path';

import {
  AUDIBLE_EXPLAINER,
  AUDIBLE_LABEL,
  EFFECTIVENESS_COPY,
  KIND_LABEL,
  SPEAKER_HINT,
  SPEAKER_LABEL,
  REACH_QUESTION,
  SYSTEM_PROFILES,
  audibleState,
  pitchLabel,
  reachSentence,
  sourceTag,
  findSystemProfile,
} from '../src/core/profiles';
import { FEATURE_LABEL, PLAN_LABEL, PRICES } from '../src/core/entitlements';
import { ROLE_HINT, ROLE_LABEL, ROLE_POWERS, WHO_CAN_DO_WHAT } from '../src/core/team';
import { liveLabel } from '../src/core/places';
import { plainMessage } from '../src/services/supabase';
import { describeLinkProblem } from '../src/services/auth';
import {
  describeDays,
  describeSchedule,
  SCHEDULE_LOCKED_LINE,
} from '../src/state/useSchedules';
import { SAMPLE_LABEL, SAMPLE_SHORT, SOUND_CREDITS } from '../src/audio/samples';
import {
  AREA_SIZE_HINT,
  AREA_SIZE_LABELS,
  BIRD_TARGET_LABELS,
  NO_RESULT_LINE,
  PLACE_KIND_DEFAULT_NAME,
  PLACE_KIND_LABELS,
  SESSION_RESULT_LABELS,
  SESSION_RESULT_LINE,
  summaryLine,
} from '../src/core/personalization';
import { HOME_ATTENTION_LINE, HOME_OFF_LINE, nextSessionLine } from '../src/core/homeState';
import { recommendPlan } from '../src/core/protectionPlans';
import { MASCOT_LABEL } from '../src/core/mascot';
import {
  FLEET_STATUS_LABEL,
  SPEAKER_STATUS_LABEL,
  reconnectLine,
} from '../src/core/speakerStatus';
import {
  attentionLine,
  lastSessionLine,
  PROTECTION_MODE_LINE,
  speakerLine,
} from '../src/core/businessPlaces';
import { TRIGGER_LABEL } from '../src/core/scheduleTimeline';
import { ESTIMATED_NOTE } from '../src/core/sun';
import {
  PLAN_BLOCK_TITLE,
  describePlanDays,
  planBlock,
  quietHoursLine,
} from '../src/core/planWindow';

/**
 * Code words a person should never have to read. See docs/mobile-glossary.md.
 *
 * The register is precise product language now, so words like frequency,
 * deterrent and session are ours to use. What stays out is the naming inside
 * the app: the things a person has no way to know about.
 */
const BANNED =
  /\b(profile|emitter|zone|entitlement|sandbox|simulated|tier|gate|RPC|sync|queue|config|invalid|null|undefined)\b/i;

const DASHES = /[–—]/;

/** A section that counts itself: "01 STATE", "02 HOW LONG". */
const INDEX_LABEL = /^0\d\s/;

function checkString(s: string): void {
  expect(s).not.toMatch(BANNED);
  expect(s).not.toMatch(DASHES);
  expect(s).not.toMatch(INDEX_LABEL);
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

  it('names every sound the way the sounds screen shows it', () => {
    const named = Object.fromEntries(SYSTEM_PROFILES.map((p) => [p.id, p.name]));
    expect(named.sys_pigeon_18k).toBe('High-frequency deterrent');
    expect(named.sys_pulse_16k).toBe('Unpredictable beeps');
    expect(named.sys_sweep_15_19k).toBe('Variable pitch sweep');
    expect(named.sys_gull_17k).toBe('Gull deterrent');
    expect(named.sys_random_pulse).toBe('Randomized beeps');
    expect(named.sys_distress_pigeon).toBe('Pigeon distress call');
    expect(named.sys_predator_hawk).toBe('Red-tailed hawk scream');
    expect(named.sys_predator_falcon).toBe('Peregrine alarm call');
    expect(named.sys_max_22k).toBe('Maximum frequency');
  });

  it('reads the way the sounds screen shows them', () => {
    const said = Object.fromEntries(SYSTEM_PROFILES.map((p) => [p.id, p.description]));
    expect(said.sys_pigeon_18k).toBe('Steady 18 kHz tone');
    expect(said.sys_pulse_16k).toBe('Harder for birds to predict');
    expect(said.sys_sweep_15_19k).toBe('Continuously shifts frequency');
    expect(said.sys_gull_17k).toBe('Steady tone for roofs and docks');
    expect(said.sys_random_pulse).toBe('Random timing for long sessions');
    expect(said.sys_distress_pigeon).toBe('Real pigeon distress recording');
    expect(said.sys_predator_hawk).toBe('Real red-tailed hawk recording');
    expect(said.sys_predator_falcon).toBe('Real peregrine falcon recording');
    expect(said.sys_max_22k).toBe('22 kHz. Needs a PigeonX speaker');
  });

  it('keeps the ids, so a sound someone already picked still loads', () => {
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
});

describe('the recordings are real', () => {
  it('never calls a bird call a stand-in', () => {
    for (const s of [
      ...SYSTEM_PROFILES.map((p) => p.name),
      ...SYSTEM_PROFILES.map((p) => p.description),
      ...Object.values(SAMPLE_LABEL),
      ...Object.values(SAMPLE_SHORT),
    ]) {
      expect(s).not.toMatch(/stand.?in/i);
    }
  });

  it('credits every recording it plays', () => {
    expect(SOUND_CREDITS).toHaveLength(4);
    for (const credit of SOUND_CREDITS) {
      checkString(credit.title);
      expect(credit.lines.length).toBeGreaterThan(0);
      for (const line of credit.lines) checkString(line);
    }
  });
});

describe('pitchLabel()', () => {
  const label = (id: string) => pitchLabel(findSystemProfile(id)!);

  it('says the number a generated sound generates', () => {
    expect(label('sys_pigeon_18k')).toBe('18 kHz');
    expect(label('sys_pulse_16k')).toBe('16 kHz');
    expect(label('sys_gull_17k')).toBe('17 kHz');
    expect(label('sys_max_22k')).toBe('22 kHz');
  });

  it('says both ends of a sweep', () => {
    expect(label('sys_sweep_15_19k')).toBe('15 to 19 kHz');
  });

  it('says a range for a recording, because a call is not one number', () => {
    expect(label('sys_distress_pigeon')).toBe('Low frequency');
    expect(label('sys_predator_hawk')).toBe('Low frequency');
  });

  it('never falls back on a word that says nothing', () => {
    for (const p of SYSTEM_PROFILES) {
      expect(pitchLabel(p)).not.toMatch(/^(Low|High|Very high)$/);
      expect(pitchLabel(p)).not.toMatch(/\bvery high\b/i);
    }
  });
});

describe('sourceTag()', () => {
  it('says whether a bird or a synthesiser made it', () => {
    expect(sourceTag(findSystemProfile('sys_predator_hawk')!)).toBe('Natural recording');
    expect(sourceTag(findSystemProfile('sys_pigeon_18k')!)).toBe('Generated tone');
  });
});

describe('audibleState()', () => {
  const state = (id: string, output: Parameters<typeof audibleState>[1] = 'phone') =>
    audibleState(findSystemProfile(id)!, output);

  it('calls every recording audible, because everybody hears a bird', () => {
    expect(state('sys_distress_pigeon')).toBe('audible');
    expect(state('sys_predator_hawk')).toBe('audible');
    expect(state('sys_predator_falcon')).toBe('audible');
  });

  it('hedges inside the band where phones and ears both wobble', () => {
    expect(state('sys_pulse_16k')).toBe('maybe');
    expect(state('sys_gull_17k')).toBe('maybe');
    expect(state('sys_pigeon_18k')).toBe('maybe');
    expect(state('sys_sweep_15_19k')).toBe('maybe');
    expect(state('sys_random_pulse')).toBe('maybe');
  });

  it('never calls 22 kHz audible or inaudible on a phone', () => {
    expect(state('sys_max_22k', 'phone')).toBe('speaker_only');
    expect(state('sys_max_22k', 'bt_speaker')).toBe('speaker_only');
    expect(AUDIBLE_LABEL[state('sys_max_22k', 'phone')]).toBe('Needs a PigeonX speaker');
    expect(AUDIBLE_LABEL[state('sys_max_22k', 'phone')]).not.toMatch(/audible/i);
  });

  it('says typically inaudible only when a PigeonX speaker plays it', () => {
    expect(state('sys_max_22k', 'pigeonx_emitter')).toBe('inaudible');
    expect(AUDIBLE_LABEL.inaudible).toBe('Typically inaudible');
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
      ...Object.values(ROLE_POWERS),
      ...Object.values(AUDIBLE_LABEL),
      REACH_QUESTION,
    ]) {
      checkString(s);
    }
  });

  it('marks a sound people can hear with one short label', () => {
    expect(AUDIBLE_LABEL.audible).toBe('Audible');
    expect(AUDIBLE_LABEL.maybe).toBe('May be audible');
  });

  it('says what each of those labels means, one tap away', () => {
    for (const line of Object.values(AUDIBLE_EXPLAINER)) {
      checkString(line);
      expect(line.length).toBeGreaterThan(20);
    }
    expect(AUDIBLE_EXPLAINER.audible).toBe(
      'This sound sits inside human hearing. People nearby will hear it.',
    );
  });
});

describe('no section counts itself out loud', () => {
  it('never labels anything "01 something"', () => {
    for (const s of [
      ...SYSTEM_PROFILES.map((p) => p.name),
      ...Object.values(SPEAKER_LABEL),
      ...Object.values(KIND_LABEL),
      ...Object.values(SAMPLE_LABEL),
      ...Object.values(FEATURE_LABEL),
      ...Object.values(PLAN_LABEL),
      ...Object.values(ROLE_LABEL),
      ...Object.values(AUDIBLE_LABEL),
      REACH_QUESTION,
    ]) {
      expect(s).not.toMatch(INDEX_LABEL);
    }
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

  it('names each role the way the whole product names it', () => {
    expect(ROLE_LABEL.owner).toBe('Owner');
    expect(ROLE_LABEL.manager).toBe('Manager');
    expect(ROLE_LABEL.staff).toBe('Staff');
  });

  it('says who can do what in one sheet, in three plain sentences', () => {
    expect(WHO_CAN_DO_WHAT).toBe('Who can do what');
    for (const line of Object.values(ROLE_POWERS)) checkString(line);
    expect(Object.values(ROLE_POWERS).join(' ')).toBe(
      'Staff can start and stop sounds. Managers can change plans and schedules. Owners manage the team and billing.',
    );
  });
});

describe('describeSchedule()', () => {
  it('reads like a sentence', () => {
    expect(
      describeSchedule({
        days: [1, 2, 3, 4, 5],
        startMinutes: 18 * 60,
        endMinutes: 22 * 60,
        profileName: 'High-frequency deterrent',
      }),
    ).toBe('Weekdays, 6:00 PM to 10:00 PM, High-frequency deterrent');
  });

  it('names groups of days in words', () => {
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(describeDays([0, 6])).toBe('Weekends');
    expect(describeDays([])).toBe('No days picked');
  });
});

/**
 * Every line a person can read, swept for a promise we cannot keep.
 *
 * The claims are the kind that creep back in one screen at a time, so this
 * reads the source rather than a list somebody has to remember to update.
 */
describe('nothing the app says is a promise we cannot keep', () => {
  const root = path.join(__dirname, '..');

  function sources(dir: string, found: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) sources(full, found);
      else if (/\.tsx?$/.test(entry.name)) found.push(full);
    }
    return found;
  }

  const files = [...sources(path.join(root, 'app')), ...sources(path.join(root, 'src'))];

  const CLAIMS: [RegExp, string][] = [
    [/most effective/i, 'no sound is the most effective one'],
    [/works? best/i, 'nothing works best'],
    [/prevents? habituation/i, 'randomised timing does not prevent habituation'],
    [/(cannot|can not|can't|never) (learn|adapt|predict|get used to)/i, 'birds are not promised to fail'],
    [/guarantee/i, 'nothing is guaranteed'],
  ];

  it('reads every screen and finds no claim', () => {
    expect(files.length).toBeGreaterThan(20);
    const offences: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (const [claim, why] of CLAIMS) {
        const hit = text.match(claim);
        if (hit) offences.push(`${path.relative(root, file)}: "${hit[0]}" (${why})`);
      }
    }
    expect(offences).toEqual([]);
  });

  it('has no LOW, HIGH or VERY HIGH pitch tag left anywhere', () => {
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      expect(text).not.toMatch(/pitchWord|soundPitch|PitchWord/);
      expect(text).not.toMatch(/'Very high'/);
    }
  });

  it('prices a location the way the business page does', () => {
    const paywall = fs.readFileSync(path.join(root, 'app/paywall.tsx'), 'utf8');
    expect(paywall).toContain('/month per location');
    expect(paywall).toContain('Managing a larger portfolio? Contact us for custom pricing.');
    expect(paywall).not.toMatch(/a month for each place/);
    expect(PRICES.business.monthly.label).toBe('$29');
    expect(PRICES.business.monthly.period).toBe('month per location');
  });

  it('says randomised timing makes a pattern harder to predict, and no more', () => {
    const said = Object.fromEntries(SYSTEM_PROFILES.map((p) => [p.id, p.description]));
    expect(said.sys_pulse_16k).toBe('Harder for birds to predict');
  });
});


describe('the words the app says about itself while it works', () => {
  it('keeps every one of them clean', () => {
    const quiet = { quietStart: '22:00', quietEnd: '07:00', days: [1], startsOn: null, endsOn: null };
    for (const s of [
      ...Object.values(MASCOT_LABEL),
      ...Object.values(SPEAKER_STATUS_LABEL),
      ...Object.values(FLEET_STATUS_LABEL),
      ...Object.values(PROTECTION_MODE_LINE),
      SCHEDULE_LOCKED_LINE,
      attentionLine({ speakersOffline: 1, areasWithoutPlan: 2 })!,
      lastSessionLine(new Date(2026, 7, 25, 8, 14).getTime(), new Date(2026, 7, 25, 12, 0)),
      speakerLine([{ id: 's1', name: 'Roof Speaker', status: 'offline' }]),
      ...Object.values(TRIGGER_LABEL),
      ...Object.values(PLAN_BLOCK_TITLE),
      ESTIMATED_NOTE,
      reconnectLine('Living Room Speaker'),
      reconnectLine(null),
      quietHoursLine(quiet)!,
      describePlanDays([1, 2, 3, 4, 5]),
      planBlock(quiet, new Date(2026, 7, 25, 23, 30))!.line,
    ]) {
      checkString(s);
    }
  });

  it('never promises a schedule it cannot keep when it is estimating the sun', () => {
    expect(ESTIMATED_NOTE).toMatch(/estimated/i);
    expect(ESTIMATED_NOTE).not.toMatch(/exact|precise/i);
  });

  it('says only what it knows about a speaker', () => {
    expect(Object.values(SPEAKER_STATUS_LABEL)).toEqual(['This phone', 'Connected', 'Offline']);
  });
});

describe('the words a place is described in', () => {
  it('keeps every one of them clean', () => {
    for (const s of [
      ...Object.values(BIRD_TARGET_LABELS),
      ...Object.values(PLACE_KIND_LABELS),
      ...Object.values(PLACE_KIND_DEFAULT_NAME),
      ...Object.values(AREA_SIZE_LABELS),
      ...Object.values(AREA_SIZE_HINT),
      ...Object.values(SESSION_RESULT_LABELS),
      ...Object.values(SESSION_RESULT_LINE),
      NO_RESULT_LINE,
      HOME_OFF_LINE,
      HOME_ATTENTION_LINE,
      nextSessionLine(new Date('2026-08-26T07:00:00'), new Date('2026-08-25T18:00:00')),
    ]) {
      checkString(s);
    }
  });

  it('never says corvid to a person, however the row is stored', () => {
    for (const target of ['pigeons', 'gulls', 'starlings', 'corvids', 'mixed_small', 'unsure'] as const) {
      for (const quiet of [true, false]) {
        expect(recommendPlan(target, quiet, 'phone').name).not.toMatch(/corvid/i);
      }
    }
    for (const label of Object.values(BIRD_TARGET_LABELS)) {
      expect(label).not.toMatch(/corvid/i);
    }
    expect(BIRD_TARGET_LABELS.corvids).toBe('Crows or jays');
  });

  it('names every recommended plan in plain words', () => {
    for (const target of ['pigeons', 'gulls', 'starlings', 'corvids', 'mixed_small', 'unsure'] as const) {
      for (const quiet of [true, false]) {
        checkString(recommendPlan(target, quiet, 'phone').name);
      }
    }
  });

  it('says only what a person told it, and never a rate or a trend', () => {
    const line = summaryLine({ withResult: 7, left: 3, someLeft: 2, notYet: 1, unknown: 1 });
    expect(line).toBe('You reported improvement after 5 of 7 sessions.');
    expect(line).not.toMatch(/%|percent|success|effective/i);
    checkString(line!);
  });
});
