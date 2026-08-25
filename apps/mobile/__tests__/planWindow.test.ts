import {
  PLAN_BLOCK_TITLE,
  describePlanDays,
  inQuietHours,
  parseClock,
  parseDay,
  planBlock,
  planDayNumber,
  quietHoursLine,
  toClock,
  type PlanWindow,
} from '../src/core/planWindow';

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

function window(over: Partial<PlanWindow> = {}): PlanWindow {
  return {
    quietStart: null,
    quietEnd: null,
    days: EVERY_DAY,
    startsOn: null,
    endsOn: null,
    ...over,
  };
}

const QUIET = window({ quietStart: '22:00', quietEnd: '07:00' });

describe('reading the times a plan was given', () => {
  it('turns a stored time into minutes and back', () => {
    expect(parseClock('22:00')).toBe(22 * 60);
    expect(parseClock('07:30')).toBe(7 * 60 + 30);
    expect(toClock(22 * 60)).toBe('22:00');
    expect(toClock(7 * 60 + 30)).toBe('07:30');
  });

  it('reads nothing out of nothing, and out of a time that does not exist', () => {
    expect(parseClock(null)).toBeNull();
    expect(parseClock('')).toBeNull();
    expect(parseClock('25:00')).toBeNull();
    expect(parseClock('noon')).toBeNull();
  });

  it('reads a stored day as a local date', () => {
    const day = parseDay('2026-09-01');
    expect(day?.getFullYear()).toBe(2026);
    expect(day?.getMonth()).toBe(8);
    expect(day?.getDate()).toBe(1);
    expect(parseDay('nope')).toBeNull();
  });
});

describe('quiet hours', () => {
  it('counts one window from ten at night to seven in the morning', () => {
    expect(inQuietHours(QUIET, new Date(2026, 7, 25, 23, 30))).toBe(true);
    expect(inQuietHours(QUIET, new Date(2026, 7, 26, 3, 0))).toBe(true);
    expect(inQuietHours(QUIET, new Date(2026, 7, 26, 6, 59))).toBe(true);
  });

  it('lets the plan run outside it', () => {
    expect(inQuietHours(QUIET, new Date(2026, 7, 26, 7, 0))).toBe(false);
    expect(inQuietHours(QUIET, new Date(2026, 7, 26, 12, 0))).toBe(false);
    expect(inQuietHours(QUIET, new Date(2026, 7, 26, 21, 59))).toBe(false);
  });

  it('handles a window that stays inside one day', () => {
    const midday = window({ quietStart: '12:00', quietEnd: '14:00' });
    expect(inQuietHours(midday, new Date(2026, 7, 26, 13, 0))).toBe(true);
    expect(inQuietHours(midday, new Date(2026, 7, 26, 15, 0))).toBe(false);
  });

  it('has no quiet hours when only one end of them was set', () => {
    expect(inQuietHours(window({ quietStart: '22:00' }), new Date(2026, 7, 25, 23, 0))).toBe(
      false,
    );
    expect(quietHoursLine(window({ quietStart: '22:00' }))).toBeNull();
  });

  it('says the hours out loud, in the clock a person reads', () => {
    expect(quietHoursLine(QUIET)).toBe(
      'Quiet hours. This plan stays silent between 10:00 PM and 7:00 AM.',
    );
  });
});

describe('which days a plan runs', () => {
  it('counts Monday as one and Sunday as seven', () => {
    expect(planDayNumber(new Date(2026, 7, 24))).toBe(1);
    expect(planDayNumber(new Date(2026, 7, 30))).toBe(7);
  });

  it('names a group of days the way a person would', () => {
    expect(describePlanDays(EVERY_DAY)).toBe('every day');
    expect(describePlanDays([1, 2, 3, 4, 5])).toBe('on weekdays');
    expect(describePlanDays([6, 7])).toBe('on weekends');
    expect(describePlanDays([1])).toBe('on Monday');
    expect(describePlanDays([1, 4])).toBe('on Monday and Thursday');
    expect(describePlanDays([1, 3, 5])).toBe('on Monday, Wednesday and Friday');
  });
});

describe('why a plan will not start', () => {
  it('lets it start when nothing is in the way', () => {
    expect(planBlock(window(), new Date(2026, 7, 25, 9, 0))).toBeNull();
  });

  it('refuses inside quiet hours, and says which hours those are', () => {
    const block = planBlock(QUIET, new Date(2026, 7, 25, 23, 30));
    expect(block?.reason).toBe('quiet');
    expect(block?.line).toBe(
      'Quiet hours. This plan stays silent between 10:00 PM and 7:00 AM.',
    );
  });

  it('refuses on a day the plan does not run', () => {
    // 30 August 2026 is a Sunday.
    const block = planBlock(window({ days: [1, 2, 3, 4, 5] }), new Date(2026, 7, 30, 9, 0));
    expect(block?.reason).toBe('days');
    expect(block?.line).toBe('This plan does not run today. It runs on weekdays.');
  });

  it('refuses before the plan has started', () => {
    const block = planBlock(window({ startsOn: '2026-09-01' }), new Date(2026, 7, 25, 9, 0));
    expect(block?.reason).toBe('dates');
    expect(block?.line).toMatch(/^This plan starts on .+\.$/);
  });

  it('refuses after the plan has finished', () => {
    const block = planBlock(window({ endsOn: '2026-08-01' }), new Date(2026, 7, 25, 9, 0));
    expect(block?.reason).toBe('dates');
    expect(block?.line).toMatch(/^This plan finished on .+\.$/);
  });

  it('counts the first and last day of the range as inside it', () => {
    const range = window({ startsOn: '2026-08-25', endsOn: '2026-08-25' });
    expect(planBlock(range, new Date(2026, 7, 25, 9, 0))).toBeNull();
  });

  it('puts quiet hours ahead of every other reason, because that one was set on purpose', () => {
    const both = window({
      quietStart: '22:00',
      quietEnd: '07:00',
      days: [1, 2, 3, 4, 5],
    });
    // A Sunday night, inside quiet hours and outside the days.
    expect(planBlock(both, new Date(2026, 7, 30, 23, 0))?.reason).toBe('quiet');
  });

  it('titles every refusal in plain words', () => {
    for (const title of Object.values(PLAN_BLOCK_TITLE)) {
      expect(title).not.toMatch(/[–—]/);
      expect(title.length).toBeGreaterThan(4);
    }
  });
});
