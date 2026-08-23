import React from 'react';
import Svg, { G, Polygon, Rect } from 'react-native-svg';

import { useTheme } from '../theme';

export type PigeonPose =
  /** standing on the block, wing down */
  | 'sit'
  /** wing up, feet tucked, on its way off the block */
  | 'fly'
  /** tipped back, the way you lean away from a sound that is too high */
  | 'lean'
  /** beak open */
  | 'call';

export interface PigeonProps {
  /** how tall the bird is, in points. It keeps its shape. */
  size?: number;
  pose?: PigeonPose;
  /** the bird itself. Defaults to the strongest ink in the palette. */
  color?: string;
  /** the eye, and the gap in an open beak. Defaults to the page. */
  holeColor?: string;
  /** the beak. Defaults to the orange. */
  beakColor?: string;
  /** say something only when the bird is the only thing on screen */
  accessibilityLabel?: string;
}

const W = 40;
const H = 27;

/**
 * The PigeonX bird.
 *
 * Six flat shapes: a tail, a body, a head, a wing, a beak and one eye. No
 * curves, no shading, nothing that needs a designer to redraw it at another
 * size. It sits on the Off block, and it leaves when a sound starts.
 */
export function Pigeon({
  size = 44,
  pose = 'sit',
  color,
  holeColor,
  beakColor,
  accessibilityLabel,
}: PigeonProps) {
  const { c } = useTheme();
  const ink = color ?? c.ink;
  const hole = holeColor ?? c.bg;
  const beak = beakColor ?? c.energy;

  const flying = pose === 'fly';
  const width = (size / H) * W;

  return (
    <Svg
      width={width}
      height={size}
      viewBox={`0 0 ${W} ${H}`}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
    >
      <G
        transform={pose === 'lean' ? `rotate(-14 ${W / 2} ${H / 2})` : undefined}
      >
        {/* tail */}
        <Polygon points="0,9 9,6 9,16" fill={ink} />
        {/* body */}
        <Polygon points="8,6 24,6 26,20 12,20" fill={ink} />
        {/* head */}
        <Rect x={21} y={0} width={10} height={9} fill={ink} />
        {/* beak */}
        {pose === 'call' ? (
          <>
            <Polygon points="31,1 40,3 31,4" fill={beak} />
            <Polygon points="31,6 40,9 31,7" fill={beak} />
          </>
        ) : (
          <Polygon points="31,2 40,5 31,8" fill={beak} />
        )}
        {/* eye */}
        <Rect x={25} y={3} width={3} height={3} fill={hole} />
        {/* wing */}
        {flying ? (
          <Polygon points="10,10 21,10 14,1" fill={hole} />
        ) : (
          <Polygon points="12,9 24,9 18,18" fill={hole} />
        )}
        {/* feet, only when it is standing on something */}
        {flying ? null : (
          <>
            <Rect x={15} y={20} width={2} height={6} fill={ink} />
            <Rect x={21} y={20} width={2} height={6} fill={ink} />
          </>
        )}
      </G>
    </Svg>
  );
}

export default Pigeon;
