/**
 * PigeonX palettes.
 *
 * One shape, two fills. Light is the daylight face, the one people use on a
 * roof at noon. Dark is the same app after sundown. Nothing in the app paints
 * a colour of its own: every screen reads these through `useTheme()`.
 *
 * Rules that hold in both:
 *
 * - `text` and `muted` clear 4.5 to 1 on `bg`, `surface` and `card`.
 * - `link` is the accent when it has to be read as words. The brand blue is
 *   too light to read on paper, so light mode darkens it.
 * - `energy` is the orange. It only ever paints a shape: the top of a bar, a
 *   rule, the bird's beak. It is never a word, so its low contrast on white
 *   can never hide something a person needs.
 */

export interface Palette {
  /** the page */
  bg: string;
  /** a quiet block on the page. The Off state block is this colour. */
  surface: string;
  /** a raised block with a border round it */
  card: string;
  /** every hairline */
  border: string;
  /** the strongest ink. Also the surface of an inverted block. */
  ink: string;
  /** words and icons painted on an `ink` block */
  inkOn: string;
  /** body words */
  text: string;
  /** second line words */
  muted: string;
  /** the brand blue, as a fill */
  accent: string;
  /** words on an `accent` fill */
  accentOn: string;
  /** the brand blue, as words. Readable in both. */
  link: string;
  /** the Playing state block */
  play: string;
  /** words on the Playing block */
  playOn: string;
  /** playing energy. Shapes only, never words. */
  energy: string;
  success: string;
  warning: string;
  danger: string;
  /** what sits behind a sheet */
  scrim: string;
}

export const lightPalette: Palette = {
  bg: '#FFFFFF',
  surface: '#F5F5F3',
  card: '#FFFFFF',
  border: '#E3E3DF',
  ink: '#0A0A0A',
  inkOn: '#FFFFFF',
  text: '#1F1F1F',
  muted: '#5F5F5F',
  accent: '#2B5CFF',
  accentOn: '#FFFFFF',
  link: '#1D4ED8',
  play: '#1D4ED8',
  playOn: '#FFFFFF',
  energy: '#F97316',
  success: '#0F8A4B',
  warning: '#B26A00',
  danger: '#C62828',
  scrim: 'rgba(10,10,10,0.55)',
};

export const darkPalette: Palette = {
  bg: '#0B0C10',
  surface: '#15171C',
  card: '#1B1E25',
  border: '#2A2E37',
  ink: '#F5F5F4',
  inkOn: '#0B0C10',
  text: '#E6E6E3',
  muted: '#9A9A96',
  accent: '#2B5CFF',
  accentOn: '#FFFFFF',
  link: '#7EA0FF',
  play: '#2B5CFF',
  playOn: '#FFFFFF',
  energy: '#FB923C',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  scrim: 'rgba(0,0,0,0.66)',
};

/** What a person picked in Settings. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** What the phone is actually painting. */
export type ThemeName = 'light' | 'dark';

export const THEME_PREFERENCES: ThemePreference[] = ['light', 'dark', 'system'];

/** The word next to each choice in Settings. */
export const THEME_PREFERENCE_LABEL: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export const palettes: Record<ThemeName, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};

/** Turns a saved choice plus what the phone is set to into one answer. */
export function resolveTheme(
  preference: ThemePreference,
  system: ThemeName | null | undefined
): ThemeName {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return system === 'dark' ? 'dark' : 'light';
}

/** Reads a saved value back. Anything we do not know falls back to system. */
export function readPreference(raw: string | null | undefined): ThemePreference {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

export const THEME_STORAGE_KEY = 'pigeonx.appearance';
