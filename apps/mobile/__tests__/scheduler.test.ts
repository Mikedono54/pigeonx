import {
  isPlayingAt,
  msUntilEnd,
  nextRun,
  overlap,
  overlappingPairs,
  playingAt,
  runsPastMidnight,
  windowLength,
  type TimeWindow,
} from '../src/core/scheduler';

const SUN = 0;
const MON = 1;
const TUE = 2;
const FRI = 5;
const SAT = 6;

function win(over: Partial<TimeWindow> & { id: string }): TimeWindow {
  return {
    days: [MON, TUE],
    startMinutes: 6 * 60,
    endMinutes: 8 * 60,
    enabled: true,
    ...over,
  };
}

/** A local date, so the test reads the same way the phone does. */
function at(day: number, hour: number, minute = 0): Date {
  // 2026-08-23 is a Sunday, so day 0 lands on the 23rd.
  return new Date(2026, 7, 23 + day, hour, minute, 0, 0);
}

describe('how long a window lasts', () => {
  it('measures a plain one', () => {
    expect(windowLength(win({ id: 'a' }))).toBe(120);
    expect(runsPastMidnight(win({ id: 'a' }))).toBe(false);
  });

  it('measures one that runs past midnight', () => {
    const night = win({ id: 'n', startMinutes: 22 * 60, endMinutes: 6 * 60 });
    expect(windowLength(night)).toBe(8 * 60);
    expect(runsPastMidnight(night)).toBe(true);
  });

  it('calls a window with no length no window at all', () => {
    const none = win({ id: 'z', startMinutes: 600, endMinutes: 600 });
    expect(windowLength(none)).toBe(0);
    expect(isPlayingAt(none, at(MON, 10))).toBe(false);
  });
});

describe('what should be playing', () => {
  const morning = win({ id: 'm' });

  it('plays inside its own hours', () => {
    expect(isPlayingAt(morning, at(MON, 6, 0))).toBe(true);
    expect(isPlayingAt(morning, at(MON, 7, 59))).toBe(true);
  });

  it('stops the minute it ends', () => {
    expect(isPlayingAt(morning, at(MON, 8, 0))).toBe(false);
    expect(isPlayingAt(morning, at(MON, 5, 59))).toBe(false);
  });

  it('stays quiet on a day it was not asked about', () => {
    expect(isPlayingAt(morning, at(SUN, 7))).toBe(false);
  });

  it('stays quiet when it is switched off', () => {
    expect(isPlayingAt(win({ id: 'off', enabled: false }), at(MON, 7))).toBe(false);
  });

  it('keeps going past midnight into the next morning', () => {
    const night = win({
      id: 'n',
      days: [FRI],
      startMinutes: 22 * 60,
      endMinutes: 6 * 60,
    });
    expect(isPlayingAt(night, at(FRI, 23))).toBe(true);
    expect(isPlayingAt(night, at(SAT, 2))).toBe(true);
    expect(isPlayingAt(night, at(SAT, 6))).toBe(false);
    expect(isPlayingAt(night, at(FRI, 21, 59))).toBe(false);
  });

  it('wraps from Saturday night into Sunday morning', () => {
    const night = win({
      id: 'n',
      days: [SAT],
      startMinutes: 23 * 60,
      endMinutes: 60,
    });
    expect(isPlayingAt(night, at(SAT, 23, 30))).toBe(true);
    expect(isPlayingAt(night, at(SUN + 7, 0, 30))).toBe(true);
  });
});

describe('two times over the same minute', () => {
  const long = win({ id: 'long', startMinutes: 6 * 60, endMinutes: 12 * 60 });
  const short = win({ id: 'short', startMinutes: 9 * 60, endMinutes: 10 * 60 });

  it('gives it to the one that just started', () => {
    expect(playingAt([long, short], at(MON, 9, 30))?.id).toBe('short');
  });

  it('goes back to the other one when the short one ends', () => {
    expect(playingAt([long, short], at(MON, 11))?.id).toBe('long');
  });

  it('answers with nothing when nothing is on', () => {
    expect(playingAt([long, short], at(MON, 5))).toBeNull();
    expect(playingAt([], at(MON, 9))).toBeNull();
  });

  it('breaks a dead tie the same way every time', () => {
    const a = win({ id: 'aaa' });
    const b = win({ id: 'bbb' });
    expect(playingAt([a, b], at(MON, 7))?.id).toBe('aaa');
    expect(playingAt([b, a], at(MON, 7))?.id).toBe('aaa');
  });
});

describe('finding times that fight', () => {
  it('spots two that cover the same minute', () => {
    expect(
      overlap(
        win({ id: 'a', startMinutes: 6 * 60, endMinutes: 9 * 60 }),
        win({ id: 'b', startMinutes: 8 * 60, endMinutes: 10 * 60 }),
      ),
    ).toBe(true);
  });

  it('lets one start exactly where the other stops', () => {
    expect(
      overlap(
        win({ id: 'a', startMinutes: 6 * 60, endMinutes: 8 * 60 }),
        win({ id: 'b', startMinutes: 8 * 60, endMinutes: 10 * 60 }),
      ),
    ).toBe(false);
  });

  it('leaves different days alone', () => {
    expect(overlap(win({ id: 'a', days: [MON] }), win({ id: 'b', days: [TUE] }))).toBe(false);
  });

  it('catches a night one running into the next morning', () => {
    expect(
      overlap(
        win({ id: 'night', days: [MON], startMinutes: 22 * 60, endMinutes: 7 * 60 }),
        win({ id: 'morning', days: [TUE], startMinutes: 6 * 60, endMinutes: 8 * 60 }),
      ),
    ).toBe(true);
  });

  it('catches Saturday night running into Sunday', () => {
    expect(
      overlap(
        win({ id: 'sat', days: [SAT], startMinutes: 23 * 60, endMinutes: 2 * 60 }),
        win({ id: 'sun', days: [SUN], startMinutes: 60, endMinutes: 3 * 60 }),
      ),
    ).toBe(true);
  });

  it('lists every pair that fights, and no others', () => {
    const a = win({ id: 'a', startMinutes: 6 * 60, endMinutes: 9 * 60 });
    const b = win({ id: 'b', startMinutes: 8 * 60, endMinutes: 10 * 60 });
    const c = win({ id: 'c', startMinutes: 18 * 60, endMinutes: 20 * 60 });
    const pairs = overlappingPairs([a, b, c]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].map((w) => w.id)).toEqual(['a', 'b']);
  });

  it('ignores a time that is switched off', () => {
    const a = win({ id: 'a', startMinutes: 6 * 60, endMinutes: 9 * 60 });
    const off = win({
      id: 'off',
      startMinutes: 7 * 60,
      endMinutes: 8 * 60,
      enabled: false,
    });
    expect(overlappingPairs([a, off])).toHaveLength(0);
  });
});

describe('what is next', () => {
  it('finds later today', () => {
    const run = nextRun([win({ id: 'm' })], at(MON, 5));
    expect(run?.window.id).toBe('m');
    expect(run?.at.getHours()).toBe(6);
    expect(run?.at.getDate()).toBe(at(MON, 6).getDate());
  });

  it('rolls on to the next day it runs', () => {
    const run = nextRun([win({ id: 'm' })], at(MON, 9));
    expect(run?.at.getDate()).toBe(at(TUE, 6).getDate());
  });

  it('rolls on to next week when there is only one day', () => {
    const run = nextRun([win({ id: 'm', days: [MON] })], at(MON, 9));
    expect(run?.at.getDate()).toBe(at(MON + 7, 6).getDate());
  });

  it('picks the soonest of several', () => {
    const early = win({ id: 'early', startMinutes: 6 * 60, endMinutes: 7 * 60 });
    const late = win({ id: 'late', startMinutes: 18 * 60, endMinutes: 19 * 60 });
    expect(nextRun([late, early], at(MON, 5))?.window.id).toBe('early');
    expect(nextRun([late, early], at(MON, 8))?.window.id).toBe('late');
  });

  it('skips what is switched off and what has no days', () => {
    expect(
      nextRun([win({ id: 'off', enabled: false }), win({ id: 'none', days: [] })], at(MON, 5)),
    ).toBeNull();
  });

  it('answers with nothing when there is nothing set', () => {
    expect(nextRun([], at(MON, 5))).toBeNull();
  });
});

describe('how long is left', () => {
  it('counts down to the end', () => {
    expect(msUntilEnd(win({ id: 'm' }), at(MON, 7, 30))).toBe(30 * 60_000);
  });

  it('counts across midnight', () => {
    const night = win({
      id: 'n',
      days: [FRI],
      startMinutes: 22 * 60,
      endMinutes: 6 * 60,
    });
    expect(msUntilEnd(night, at(FRI, 23))).toBe(7 * 60 * 60_000);
  });

  it('is nothing when it is not playing', () => {
    expect(msUntilEnd(win({ id: 'm' }), at(MON, 12))).toBe(0);
  });
});
