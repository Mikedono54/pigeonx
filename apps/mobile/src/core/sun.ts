/**
 * Sunrise and sunset, worked out on the phone.
 *
 * A schedule that starts at sunrise has to know when sunrise is, and the one
 * honest way to get that without asking a server is to compute it. This is the
 * NOAA general solar position formula: about thirty lines of trigonometry,
 * good to a minute or so, with no network call and no dependency.
 *
 * If a person says no to location, nothing here guesses a latitude. The app
 * falls back to a plain 6:30 and 7:30 and says on screen that it is an
 * estimate, because a wrong sunrise presented as a real one is worse than an
 * estimate that admits it.
 */

export interface Coords {
  latitude: number;
  longitude: number;
}

export type SolarEvent = 'sunrise' | 'sunset';

/** Minutes past midnight, used when nobody has told us where the place is. */
export const FALLBACK_SUNRISE_MINUTES = 6 * 60 + 30;
export const FALLBACK_SUNSET_MINUTES = 19 * 60 + 30;

/** The line a schedule shows when it is running on the fallback times. */
export const ESTIMATED_NOTE =
  'Estimated times. Allow location and the app uses the real sunrise and sunset for this place.';

/** The centre of the sun sits this far below the horizon at the moment we call it. */
const ZENITH_DEGREES = 90.833;

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Which day of the year a date falls on, 1 for the first of January. */
export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getFullYear(), 0, 1);
  const here = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((here - start) / 86_400_000) + 1;
}

/**
 * Minutes past local midnight for sunrise or sunset at these coordinates.
 *
 * `tzOffsetMinutes` follows the same convention as `Date.getTimezoneOffset()`:
 * the minutes you add to local time to get UTC, so eight hours behind UTC is
 * 480. It is a parameter rather than a lookup so a test can ask about a city
 * it is not sitting in.
 *
 * Returns null inside a polar day or night, where the sun does not cross the
 * horizon at all and there is no time to name.
 */
export function solarMinutes(
  event: SolarEvent,
  date: Date,
  coords: Coords,
  tzOffsetMinutes: number = date.getTimezoneOffset(),
): number | null {
  const { latitude, longitude } = coords;
  const n = dayOfYear(date);

  // Fractional year, in radians, taken at the middle of the day.
  const gamma = ((2 * Math.PI) / 365) * (n - 1 + 0.5);

  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = latitude * RAD;
  const cosHa =
    Math.cos(ZENITH_DEGREES * RAD) / (Math.cos(latRad) * Math.cos(decl)) -
    Math.tan(latRad) * Math.tan(decl);

  // Above the arctic circle in summer, or below it in winter, the sun never
  // crosses the horizon and there is nothing to report.
  if (cosHa > 1 || cosHa < -1) return null;

  const ha = Math.acos(cosHa) * DEG;
  const signed = event === 'sunrise' ? ha : -ha;
  const utcMinutes = 720 - 4 * (longitude + signed) - eqTime;
  const local = utcMinutes - tzOffsetMinutes;

  return ((local % 1440) + 1440) % 1440;
}

/** Both times at once, for a screen that shows them together. */
export function sunTimes(
  date: Date,
  coords: Coords,
  tzOffsetMinutes: number = date.getTimezoneOffset(),
): { sunrise: number | null; sunset: number | null } {
  return {
    sunrise: solarMinutes('sunrise', date, coords, tzOffsetMinutes),
    sunset: solarMinutes('sunset', date, coords, tzOffsetMinutes),
  };
}

export interface SolarAnswer {
  /** minutes past local midnight */
  minutes: number;
  /** true when this came from the fallback rather than from a real position */
  estimated: boolean;
}

/**
 * When a schedule that starts at sunrise or sunset starts on a given day.
 *
 * Hands back the fallback and says so whenever there is no position, or the
 * sun does not rise or set there that day.
 */
export function solarStart(
  event: SolarEvent,
  date: Date,
  coords: Coords | null,
  tzOffsetMinutes: number = date.getTimezoneOffset(),
): SolarAnswer {
  const fallback = event === 'sunrise' ? FALLBACK_SUNRISE_MINUTES : FALLBACK_SUNSET_MINUTES;
  if (!coords) return { minutes: fallback, estimated: true };

  const minutes = solarMinutes(event, date, coords, tzOffsetMinutes);
  if (minutes === null) return { minutes: fallback, estimated: true };
  return { minutes, estimated: false };
}

/** Keeps a time on the clock face after an offset has moved it. */
export function wrapMinutes(minutes: number): number {
  return ((Math.round(minutes) % 1440) + 1440) % 1440;
}
