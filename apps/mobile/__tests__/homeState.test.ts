import {
  HOME_ATTENTION_LINE,
  HOME_OFF_LINE,
  clockTime,
  homeState,
  nextSessionLine,
} from '../src/core/homeState';

const AT = (iso: string) => new Date(iso);

describe('the four things Home can be saying', () => {
  const base = { playing: false, speakerMissing: false, nextAt: null };

  it('says Off when nothing is running and nothing is set', () => {
    expect(homeState(base)).toBe('off');
    expect(HOME_OFF_LINE).toBe('Ready when birds appear.');
  });

  it('says a session is coming when one is', () => {
    expect(homeState({ ...base, nextAt: AT('2026-08-26T07:00:00') })).toBe('scheduled');
  });

  it('puts a missing speaker over a session that is coming', () => {
    expect(
      homeState({ ...base, speakerMissing: true, nextAt: AT('2026-08-26T07:00:00') }),
    ).toBe('attention');
    expect(HOME_ATTENTION_LINE).toContain('not connected');
  });

  it('lets what a person can hear win over everything else', () => {
    expect(homeState({ playing: true, speakerMissing: true, nextAt: AT('2026-08-26T07:00:00') })).toBe(
      'active',
    );
  });
});

describe('when the next session is', () => {
  const now = AT('2026-08-25T18:30:00');

  it('names the time on its own for later today', () => {
    expect(nextSessionLine(AT('2026-08-25T21:00:00'), now)).toBe('Next session at 9:00 PM.');
  });

  it('says tomorrow, because that is the word a person uses', () => {
    expect(nextSessionLine(AT('2026-08-26T07:00:00'), now)).toBe(
      'Next session tomorrow at 7:00 AM.',
    );
  });

  it('names the day inside the week', () => {
    expect(nextSessionLine(AT('2026-08-28T07:00:00'), now)).toBe(
      'Next session Friday at 7:00 AM.',
    );
  });

  it('names the date past a week, because a weekday would be ambiguous', () => {
    const line = nextSessionLine(AT('2026-09-05T07:00:00'), now);
    expect(line).toMatch(/^Next session .+ at 7:00 AM\.$/);
    expect(line).not.toContain('Saturday');
  });

  it('reads midnight and noon the way a clock does', () => {
    expect(clockTime(AT('2026-08-25T00:05:00'))).toBe('12:05 AM');
    expect(clockTime(AT('2026-08-25T12:00:00'))).toBe('12:00 PM');
    expect(clockTime(AT('2026-08-25T13:07:00'))).toBe('1:07 PM');
  });

  it('never prints a dash', () => {
    for (const line of [
      HOME_OFF_LINE,
      HOME_ATTENTION_LINE,
      nextSessionLine(AT('2026-08-26T07:00:00'), now),
      nextSessionLine(AT('2026-09-05T07:00:00'), now),
    ]) {
      expect(line).not.toMatch(/[–—]/);
    }
  });
});
