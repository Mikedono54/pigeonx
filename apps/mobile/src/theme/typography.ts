import { TextStyle } from 'react-native';
import { font } from './tokens';
import type { Palette } from './themes';

export type TypeVariant =
  | 'display'
  | 'state'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodySmall'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'overline'
  | 'mono'
  | 'monoLarge'
  | 'timer';

export type TypeScale = Record<TypeVariant, TextStyle>;

/**
 * The type scale, painted in one palette.
 *
 * Two faces do the talking. Inter Tight, very heavy and tight, says the state
 * of things. JetBrains Mono counts: clocks, kHz, tags. Inter at 17 carries
 * every sentence, because 17 is the size a person reads standing up.
 */
export function makeType(c: Palette): TypeScale {
  return {
    display: {
      fontFamily: font.heading.extrabold,
      fontSize: 36,
      lineHeight: 39,
      letterSpacing: -1.4,
      color: c.ink,
    },
    /** The one line that says what the app is doing right now. */
    state: {
      fontFamily: font.heading.extrabold,
      fontSize: 44,
      lineHeight: 46,
      letterSpacing: -2,
      color: c.ink,
    },
    title: {
      fontFamily: font.heading.extrabold,
      fontSize: 28,
      lineHeight: 31,
      letterSpacing: -1.1,
      color: c.ink,
    },
    heading: {
      fontFamily: font.heading.bold,
      fontSize: 20,
      lineHeight: 25,
      letterSpacing: -0.6,
      color: c.ink,
    },
    subheading: {
      fontFamily: font.heading.bold,
      fontSize: 16,
      lineHeight: 21,
      letterSpacing: -0.35,
      color: c.ink,
    },
    body: {
      fontFamily: font.body.medium,
      fontSize: 17,
      lineHeight: 24,
      letterSpacing: -0.2,
      color: c.muted,
    },
    bodySmall: {
      fontFamily: font.body.regular,
      fontSize: 14,
      lineHeight: 20,
      color: c.muted,
    },
    bodyStrong: {
      fontFamily: font.body.semibold,
      fontSize: 17,
      lineHeight: 24,
      letterSpacing: -0.2,
      color: c.text,
    },
    label: {
      fontFamily: font.body.medium,
      fontSize: 14,
      lineHeight: 19,
      color: c.text,
    },
    caption: {
      fontFamily: font.body.regular,
      fontSize: 13,
      lineHeight: 18,
      color: c.muted,
    },
    /** The one small-caps label a section is allowed: "HOW LONG". */
    overline: {
      fontFamily: font.mono.bold,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: c.muted,
    },
    mono: {
      fontFamily: font.mono.medium,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: c.text,
    },
    monoLarge: {
      fontFamily: font.mono.bold,
      fontSize: 34,
      letterSpacing: -1,
      color: c.ink,
    },
    /** The clock on a playing block, and in Speaker mode. */
    timer: {
      fontFamily: font.mono.bold,
      fontSize: 52,
      lineHeight: 56,
      letterSpacing: -2.5,
      color: c.ink,
    },
  };
}

export default makeType;
