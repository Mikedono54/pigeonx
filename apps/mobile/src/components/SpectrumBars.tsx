import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { getEngine, SPECTRUM_BINS } from '../audio';
import { useTheme } from '../theme';

export interface SpectrumBarsProps {
  height?: number;
  /** dims the bars when nothing is playing */
  active?: boolean;
  bins?: number;
  /** the bars. Defaults to the brand blue. */
  color?: string;
  /** the top of a loud bar. Defaults to the orange. */
  peakColor?: string;
}

/**
 * The live bars you see while a sound plays.
 *
 * They read straight from the engine instead of React state, so sixteen
 * frames a second never re-render a screen. The tip of a loud bar goes
 * orange: that is the only place the app spends its second colour.
 */
export function SpectrumBars({
  height = 110,
  active = true,
  bins = SPECTRUM_BINS,
  color,
  peakColor,
}: SpectrumBarsProps) {
  const { c } = useTheme();
  const levels = useSharedValue<number[]>(new Array(bins).fill(0));
  const reduced = useReducedMotion();

  useEffect(() => {
    const engine = getEngine();
    const off = engine.onSpectrum((next) => {
      levels.value = next;
    });
    return () => {
      off();
      levels.value = new Array(bins).fill(0);
    };
  }, [bins, levels]);

  const indices = useMemo(() => Array.from({ length: bins }, (_, i) => i), [bins]);

  return (
    <View
      style={[styles.wrap, { height }]}
      accessibilityRole="image"
      accessibilityLabel={active ? 'Sound playing' : 'Nothing playing'}
    >
      {indices.map((i) => (
        <Bar
          key={i}
          index={i}
          levels={levels}
          height={height}
          active={active}
          reduced={reduced}
          color={color ?? c.accent}
          peakColor={peakColor ?? c.energy}
        />
      ))}
    </View>
  );
}

function Bar({
  index,
  levels,
  height,
  active,
  reduced,
  color,
  peakColor,
}: {
  index: number;
  levels: SharedValue<number[]>;
  height: number;
  active: boolean;
  reduced: boolean;
  color: string;
  peakColor: string;
}) {
  const style = useAnimatedStyle(() => {
    const raw = levels.value[index] ?? 0;
    const target = Math.max(2, raw * height);
    return {
      height: reduced ? target : withTiming(target, { duration: 90 }),
      opacity: active ? 0.5 + raw * 0.5 : 0.18,
    };
  }, [active, height, index, reduced]);

  const cap = useAnimatedStyle(() => {
    const raw = levels.value[index] ?? 0;
    return { opacity: active && raw > 0.55 ? 1 : 0 };
  }, [active, index]);

  return (
    <Animated.View style={[styles.bar, { backgroundColor: color }, style]}>
      <Animated.View style={[styles.cap, { backgroundColor: peakColor }, cap]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 3,
  },
  bar: { flex: 1, minHeight: 2 },
  cap: { position: 'absolute', left: 0, right: 0, top: 0, height: 4 },
});
