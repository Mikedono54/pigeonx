import React from 'react';
import { View } from 'react-native';

import type { BirdTarget } from '../core/personalization';
import { space, themed, useTheme, useThemedStyles } from '../theme';
import { Pigeon, type PigeonPose } from './Pigeon';

export interface TargetGlyphProps {
  target: BirdTarget;
  /** how tall the tallest bird stands, in points */
  size?: number;
  color?: string;
  holeColor?: string;
}

/**
 * The six birds, drawn out of the one bird we have.
 *
 * This is the PigeonX glyph in six arrangements, not six species portraits.
 * Drawing a convincing gull and a convincing starling would be inventing
 * detail we do not have, so the tiles say the difference the honest way: how
 * big it stands, whether it is calling, and whether there is one of them or a
 * few. The word underneath is what actually names the bird.
 */
const SHAPE: Record<BirdTarget, { scale: number; pose: PigeonPose }[]> = {
  pigeons: [{ scale: 1, pose: 'sit' }],
  /** the big one on the roof, head back */
  gulls: [{ scale: 1.15, pose: 'call' }],
  /** small, and it does not stay still */
  starlings: [{ scale: 0.72, pose: 'lean' }],
  /** heavy, and looking straight at you */
  corvids: [{ scale: 1.05, pose: 'sit' }],
  /** a few of them, none of them large */
  mixed_small: [
    { scale: 0.5, pose: 'sit' },
    { scale: 0.62, pose: 'call' },
    { scale: 0.44, pose: 'sit' },
  ],
  /** one bird, and no claim about which */
  unsure: [{ scale: 0.85, pose: 'sit' }],
};

export function TargetGlyph({ target, size = 34, color, holeColor }: TargetGlyphProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const ink = color ?? (target === 'unsure' ? c.muted : c.ink);

  return (
    <View style={styles.row}>
      {SHAPE[target].map((bird, i) => (
        <Pigeon
          key={i}
          size={Math.round(size * bird.scale)}
          pose={bird.pose}
          color={ink}
          holeColor={holeColor ?? c.card}
        />
      ))}
    </View>
  );
}

const sheet = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs },
}));

export default TargetGlyph;
