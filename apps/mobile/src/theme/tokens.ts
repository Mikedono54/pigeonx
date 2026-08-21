/**
 * PigeonX design tokens.
 *
 * NOTE: this file is a temporary duplicate. Once `@pigeonx/core` ships its
 * `tokens.ts`, this module becomes `export * from '@pigeonx/core'` — so the
 * exported shape ({ color, font, radius, space }) must not drift.
 */

export const color = {
  background: '#0B1220',
  surface: '#111A2E',
  card: '#151F36',
  elevated: '#1B2742',
  border: '#243049',

  fg: '#F1F5F9',
  fgMuted: '#8B97AD',
  fgSubtle: '#5B6881',

  teal: '#2DD4BF',
  blue: '#3B82F6',

  accent: '#22D3EE',
  onAccent: '#06121F',

  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
} as const;

/** Brand gradient: 135deg #2DD4BF → #3B82F6 */
export const gradient = {
  brand: ['#2DD4BF', '#3B82F6'] as [string, string],
  /** expo-linear-gradient start/end that reproduces a 135deg CSS gradient */
  brandStart: { x: 0, y: 0 },
  brandEnd: { x: 1, y: 1 },
} as const;

export const font = {
  heading: {
    semibold: 'Outfit_600SemiBold',
    bold: 'Outfit_700Bold',
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

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
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

export const tokens = { color, font, radius, space } as const;

export type Color = keyof typeof color;
export type Radius = keyof typeof radius;
export type Space = keyof typeof space;

export default tokens;
