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
  | 'mono'
  | 'monoLarge';

export const type: Record<Variant, TextStyle> = {
  display: {
    fontFamily: font.heading.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: color.fg,
  },
  title: {
    fontFamily: font.heading.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: color.fg,
  },
  heading: {
    fontFamily: font.heading.semibold,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
    color: color.fg,
  },
  subheading: {
    fontFamily: font.heading.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: color.fg,
  },
  body: {
    fontFamily: font.body.regular,
    fontSize: 15,
    lineHeight: 22,
    color: color.fgMuted,
  },
  bodyStrong: {
    fontFamily: font.body.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: color.fg,
  },
  label: {
    fontFamily: font.body.semibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
    color: color.fg,
  },
  caption: {
    fontFamily: font.body.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    color: color.fgSubtle,
  },
  mono: {
    fontFamily: font.mono.medium,
    fontSize: 14,
    letterSpacing: 0.4,
    color: color.fg,
  },
  monoLarge: {
    fontFamily: font.mono.medium,
    fontSize: 40,
    letterSpacing: 1,
    color: color.fg,
  },
};

export default type;
