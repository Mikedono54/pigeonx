/**
 * PigeonX design tokens — the single source of truth for both apps.
 * Web consumes these through `tailwindPreset`; mobile through NativeWind.
 */

export const color = {
  /** App canvas. */
  background: '#0B1220',
  /** Panels sitting on the canvas. */
  surface: '#111A2E',
  /** Content cards. */
  card: '#151F36',
  /** Raised surfaces: sheets, popovers, active rows. */
  elevated: '#1B2742',
  /** Hairlines and card outlines. */
  border: '#243049',
  /** Primary text. */
  fg: '#F1F5F9',
  /** Secondary text, labels. */
  fgMuted: '#8B97AD',
  /** Tertiary text, disabled, placeholder. */
  fgSubtle: '#5B6881',
  /** Brand teal — gradient start, charts, active state. */
  accentTeal: '#2DD4BF',
  /** Brand blue — gradient end. */
  accentBlue: '#3B82F6',
  /** Call-to-action fill. */
  accent: '#22D3EE',
  /** Text/icon color on top of `accent`. */
  onAccent: '#06121F',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
} as const;

export type ColorToken = keyof typeof color;

export const font = {
  display: ['Outfit', 'system-ui', 'sans-serif'],
  body: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
  weight: {
    display: [600, 700],
    body: [400, 500, 600],
    mono: [500],
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
    '4xl': 48,
  },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** 4-based spacing scale. `space[n] === n * 4` px. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const gradient = {
  brand: 'linear-gradient(135deg,#2DD4BF 0%,#3B82F6 100%)',
  /** Endpoints, for native gradient APIs that take a color array. */
  brandStops: [color.accentTeal, color.accentBlue],
} as const;

export const tokens = { color, font, radius, space, gradient } as const;

export type Tokens = typeof tokens;
