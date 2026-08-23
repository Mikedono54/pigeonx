import { describe, expect, it } from 'vitest';
import { isoWeekStart, lastCompleteWeekStart, weeklyReportEmail } from './reports.js';

describe('isoWeekStart', () => {
  it('returns the Monday of the week a date falls in', () => {
    // 2026-08-23 is a Sunday, so its ISO week began Monday 2026-08-17.
    expect(isoWeekStart(new Date('2026-08-23T12:00:00Z'))).toBe('2026-08-17');
    expect(isoWeekStart(new Date('2026-08-17T00:00:00Z'))).toBe('2026-08-17');
    expect(isoWeekStart(new Date('2026-08-19T23:59:59Z'))).toBe('2026-08-17');
  });

  it('treats Sunday as the end of a week, not the start', () => {
    expect(isoWeekStart(new Date('2026-08-16T09:00:00Z'))).toBe('2026-08-10');
  });

  it('crosses a month and a year boundary', () => {
    expect(isoWeekStart(new Date('2026-09-02T00:00:00Z'))).toBe('2026-08-31');
    expect(isoWeekStart(new Date('2027-01-01T00:00:00Z'))).toBe('2026-12-28');
  });
});

describe('lastCompleteWeekStart', () => {
  it('is the Monday before the current week', () => {
    expect(lastCompleteWeekStart(new Date('2026-08-23T12:00:00Z'))).toBe('2026-08-10');
    expect(lastCompleteWeekStart(new Date('2026-08-17T00:00:00Z'))).toBe('2026-08-10');
  });

  it('never returns a week that has not finished', () => {
    const now = new Date('2026-08-19T08:00:00Z');
    const start = lastCompleteWeekStart(now);
    const end = new Date(`${start}T00:00:00Z`).getTime() + 7 * 86_400_000;
    expect(end).toBeLessThanOrEqual(now.getTime());
  });
});

describe('weeklyReportEmail', () => {
  const data = {
    week_start: '2026-08-10',
    week_end: '2026-08-16',
    location_name: 'Harbor Hotel',
    sessions: 24,
    total_minutes: 312.5,
    zones_active: 3,
  };

  it('names the place and the week in the subject', () => {
    expect(weeklyReportEmail(data).subject).toBe('Harbor Hotel: week of Aug 10, 2026');
  });

  it('reports runs, run time and areas in plain words', () => {
    const { body } = weeklyReportEmail(data);
    expect(body).toContain('24 runs');
    expect(body).toContain('5 hours 13 minutes');
    expect(body).toContain('3 areas');
  });

  it('uses singular wording for a single run, hour and area', () => {
    const { body } = weeklyReportEmail({
      ...data,
      sessions: 1,
      total_minutes: 61,
      zones_active: 1,
    });
    expect(body).toContain('1 run');
    expect(body).not.toContain('1 runs');
    expect(body).toContain('1 hour 1 minute');
    expect(body).toContain('1 area');
  });

  it('says so plainly when nothing ran', () => {
    const { body } = weeklyReportEmail({ ...data, sessions: 0, total_minutes: 0, zones_active: 0 });
    expect(body).toContain('Nothing ran at Harbor Hotel');
  });

  it('drops the hours when there are none', () => {
    expect(weeklyReportEmail({ ...data, total_minutes: 45 }).body).toContain('45 minutes');
  });

  it('uses no em dashes anywhere', () => {
    const { subject, body } = weeklyReportEmail(data);
    expect(subject).not.toMatch(/[—–]/);
    expect(body).not.toMatch(/[—–]/);
  });
});
