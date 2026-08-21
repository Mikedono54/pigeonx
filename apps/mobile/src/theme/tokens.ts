/**
 * PigeonX design tokens.
 *
 * Flat, light, high contrast. The app gets used on patios and rooftops in
 * daylight, so every surface is white or near-white, every edge is a hairline
 * border, and nothing is defined by a shadow or a glow.
 *
 * NOTE: this file is a temporary duplicate. Once `@pigeonx/core` ships its
 * `tokens.ts`, this module becomes `export * from '@pigeonx/core'`, so the
 * exported shape ({ color, font, radius, space }) must not drift.
 */

export const color = {
  background: '#FFFFFF',
  surface: '#F5F5F3',
  card: '#FFFFFF',
  elevated: '#EDEDEA',
  border: '#E3E3DF',

  /** primary text and the darkest surface the app ever paints */
  ink: '#0A0A0A',
  fg: '#1F1F1F',
  fgMuted: '#5F5F5F',
  fgSubtle: '#8A8A8A',

  /** the one accent. Running state, primary buttons, active meters. */
  accent: '#2B5CFF',
  onAccent: '#FFFFFF',

  success: '#0F8A4B',
  warning: '#B26A00',
  danger: '#C62828',
} as const;

export const font = {
  heading: {
    semibold: 'InterTight_600SemiBold',
    bold: 'InterTight_700Bold',
  },
  body: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
  },
  mono: {
    medium: 'JetBrainsMono_500Medium',
  },
} as const;

/** Square corners everywhere. The keys stay so callers keep compiling. */
export const radius = {
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  pill: 0,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

/** Hairline that separates one surface from the next. */
export const hairline = 1;

export const tokens = { color, font, radius, space } as const;

export type Color = keyof typeof color;
export type Radius = keyof typeof radius;
export type Space = keyof typeof space;

export default tokens;
