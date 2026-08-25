import {
  ESTIMATED_NOTE,
  FALLBACK_SUNRISE_MINUTES,
  FALLBACK_SUNSET_MINUTES,
  dayOfYear,
  solarMinutes,
  solarStart,
  sunTimes,
  wrapMinutes,
} from '../src/core/sun';

/**
 * Sunrise worked out on the phone, checked against a city anybody can look up.
 *
 * The timezone is handed in rather than read off the machine, so the suite
 * gives the same answer wherever it runs. San Francisco keeps daylight time
 * from March to the start of November, so the offset follows that.
 */

const SF = { latitude: 37.7749, longitude: -122.4194 };
const PST = 480;
const PDT = 420;

/** The offset San Francisco is actually on in a given month. */
function offsetFor(month: number): number {
  return month >= 2 && month <= 9 ? PDT : PST;
}

describe('dayOfYear()', () => {
  it('counts the first of January as one', () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
  });

  it('counts the last day of a leap year as three hundred and sixty six', () => {
    expect(dayOfYear(new Date(2024, 11, 31))).toBe(366);
  });
});

describe('sunrise in a city you can look up', () => {
  it('always falls between five and eight in the morning, all year round', () => {
    for (let month = 0; month < 12; month++) {
      for (const day of [1, 15]) {
        const at = new Date(2026, month, day);
        const minutes = solarMinutes('sunrise', at, SF, offsetFor(month));
        expect(minutes).not.toBeNull();
        expect(minutes!).toBeGreaterThanOrEqual(5 * 60);
        expect(minutes!).toBeLessThanOrEqual(8 * 60);
      }
    }
  });

  it('rises earliest around midsummer and latest in the depth of winter', () => {
    const june = solarMinutes('sunrise', new Date(2026, 5, 21), SF, PDT)!;
    const december = solarMinutes('sunrise', new Date(2026, 11, 21), SF, PST)!;
    expect(june).toBeLessThan(december);
  });

  it('sets in the evening, and after it rose', () => {
    for (let month = 0; month < 12; month++) {
      const at = new Date(2026, month, 15);
      const { sunrise, sunset } = sunTimes(at, SF, offsetFor(month));
      expect(sunset!).toBeGreaterThan(sunrise!);
      expect(sunset!).toBeGreaterThanOrEqual(16 * 60);
      expect(sunset!).toBeLessThanOrEqual(21 * 60);
    }
  });

  it('puts the shortest day in December and the longest in June', () => {
    const short = sunTimes(new Date(2026, 11, 21), SF, PST);
    const long = sunTimes(new Date(2026, 5, 21), SF, PDT);
    expect(long.sunset! - long.sunrise!).toBeGreaterThan(short.sunset! - short.sunrise!);
  });
});

describe('places where the sun does not bother', () => {
  it('says nothing rather than inventing a sunrise inside the polar night', () => {
    const svalbard = { latitude: 78.22, longitude: 15.63 };
    expect(solarMinutes('sunrise', new Date(2026, 11, 21), svalbard, -60)).toBeNull();
  });
});

describe('when nobody has said where the place is', () => {
  it('falls back to half past six, and says the time is an estimate', () => {
    const answer = solarStart('sunrise', new Date(2026, 5, 21), null);
    expect(answer.minutes).toBe(FALLBACK_SUNRISE_MINUTES);
    expect(answer.estimated).toBe(true);
  });

  it('falls back to half past seven in the evening', () => {
    expect(solarStart('sunset', new Date(2026, 5, 21), null).minutes).toBe(
      FALLBACK_SUNSET_MINUTES,
    );
  });

  it('stops calling it an estimate once there is a real position', () => {
    const answer = solarStart('sunrise', new Date(2026, 5, 21), SF, PDT);
    expect(answer.estimated).toBe(false);
    expect(answer.minutes).toBeGreaterThan(5 * 60);
  });

  it('falls back inside a polar night rather than leaving a schedule with no time', () => {
    const svalbard = { latitude: 78.22, longitude: 15.63 };
    const answer = solarStart('sunrise', new Date(2026, 11, 21), svalbard, -60);
    expect(answer.minutes).toBe(FALLBACK_SUNRISE_MINUTES);
    expect(answer.estimated).toBe(true);
  });

  it('says out loud that it is estimating', () => {
    expect(ESTIMATED_NOTE).toContain('Estimated');
    expect(ESTIMATED_NOTE).not.toMatch(/[–—]/);
  });
});

describe('an offset that runs off the end of the day', () => {
  it('comes back round onto the clock face', () => {
    expect(wrapMinutes(-30)).toBe(1410);
    expect(wrapMinutes(1500)).toBe(60);
    expect(wrapMinutes(390)).toBe(390);
  });
});
