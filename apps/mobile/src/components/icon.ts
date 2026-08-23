import type React from 'react';

/**
 * Every picture in the app is one of these: a line drawing from one family,
 * at one of two sizes, at one stroke weight, always next to a word.
 *
 * Components take the drawing itself, not a finished element, so the size,
 * the stroke and the colour are decided in one place instead of at every
 * call. Nothing in the app ever draws a picture some other way.
 */
export type IconType = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;
