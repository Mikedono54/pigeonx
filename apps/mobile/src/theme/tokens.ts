/**
 * PigeonX shape tokens: space, corners, faces, motion.
 *
 * Colour does not live here. Colour lives in `themes.ts` and reaches a screen
 * through `useTheme()`, so the same component works in daylight and at night
 * without a second copy of itself.
 *
 * NOTE: this file is a temporary duplicate. Once `@pigeonx/core` ships its
 * `tokens.ts`, this module becomes `export * from '@pigeonx/core'`, so the
 * exported shape ({ font, radius, space }) must not drift.
 */

export const font = {
  heading: {
    semibold: 'InterTight_600SemiBold',
    bold: 'InterTight_700Bold',
    /** the state line and every title. Heavy on purpose. */
    extrabold: 'InterTight_800ExtraBold',
  },
  body: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
  },
  mono: {
    medium: 'JetBrainsMono_500Medium',
    /** clocks and numbers that have to hold their own */
    bold: 'JetBrainsMono_700Bold',
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

/**
 * The hard offset shadow. No blur, no glow: a solid block of ink sitting down
 * and right of the thing, the way a printed poster casts one.
 */
export const offset = {
  /** how far the shadow sits from the face at rest */
  rest: 4,
  /** how far the face moves when a finger is on it */
  press: 2,
  /** the small version, for rows and chips */
  small: 2,
} as const;

/** How long things take. Short enough to feel like the phone, not a film. */
export const motion = {
  /** a colour or a border changing */
  quick: 150,
  /** a block changing state */
  state: 220,
  /** the bird leaving or landing */
  flight: 500,
  /** the breath on a playing block */
  breath: 1600,
  spring: { damping: 18, stiffness: 180, mass: 0.9 },
} as const;

/** One size for every icon, one weight for every stroke. */
export const icon = {
  sm: 16,
  md: 22,
  lg: 28,
  stroke: 2,
} as const;

export const tokens = { font, radius, space, offset, motion, icon } as const;

export type Radius = keyof typeof radius;
export type Space = keyof typeof space;

export default tokens;
