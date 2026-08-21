import { TextStyle } from 'react-native';
import { color, font } from './tokens';

type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'index'
  | 'mono'
  | 'monoLarge';

export const type: Record<Variant, TextStyle> = {
  display: {
    fontFamily: font.heading.bold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
    color: color.ink,
  },
  title: {
    fontFamily: font.heading.bold,
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: -0.8,
    color: color.ink,
  },
  heading: {
    fontFamily: font.heading.semibold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: color.ink,
  },
  subheading: {
    fontFamily: font.heading.semibold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: color.ink,
  },
  body: {
    fontFamily: font.body.regular,
    fontSize: 15,
    lineHeight: 21,
    color: color.fgMuted,
  },
  bodyStrong: {
    fontFamily: font.body.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: color.ink,
  },
  label: {
    fontFamily: font.body.medium,
    fontSize: 13,
    lineHeight: 18,
    color: color.fg,
  },
  caption: {
    fontFamily: font.body.regular,
    fontSize: 12,
    lineHeight: 16,
    color: color.fgSubtle,
  },
  /** Section index labels: "01 PROFILE". */
  index: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  mono: {
    fontFamily: font.mono.medium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.ink,
  },
  monoLarge: {
    fontFamily: font.mono.medium,
    fontSize: 40,
    letterSpacing: -0.5,
    color: color.ink,
  },
};

export default type;
