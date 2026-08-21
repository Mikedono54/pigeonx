import { color, font, gradient, radius, space } from './tokens.js';

const px = (n: number) => `${n}px`;

const borderRadius = Object.fromEntries(
  Object.entries(radius).map(([k, v]) => [k, px(v)]),
) as Record<keyof typeof radius, string>;

const spacing = Object.fromEntries(Object.entries(space).map(([k, v]) => [k, px(v)])) as Record<
  string,
  string
>;

const fontSize = Object.fromEntries(
  Object.entries(font.size).map(([k, v]) => [k, px(v)]),
) as Record<string, string>;

/**
 * Tailwind preset shared by `apps/web` (Tailwind) and `apps/mobile` (NativeWind).
 * Usage: `presets: [tailwindPreset]`.
 */
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        bg: color.background,
        surface: color.surface,
        card: color.card,
        elevated: color.elevated,
        border: color.border,
        fg: color.fg,
        'fg-muted': color.fgMuted,
        'fg-subtle': color.fgSubtle,
        teal: color.accentTeal,
        blue: color.accentBlue,
        accent: color.accent,
        'on-accent': color.onAccent,
        success: color.success,
        warning: color.warning,
        danger: color.danger,
      },
      fontFamily: {
        display: [...font.display],
        body: [...font.body],
        mono: [...font.mono],
      },
      fontSize,
      borderRadius,
      spacing,
      backgroundImage: {
        'gradient-brand': gradient.brand,
      },
    },
  },
} as const;

export type TailwindPreset = typeof tailwindPreset;
