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
import { color } from '../theme/tokens';

export interface SpectrumBarsProps {
  height?: number;
  /** dims the bars when nothing is playing */
  active?: boolean;
  bins?: number;
}

/**
 * The live bars you see while a sound plays. Reads straight from the engine
 * instead of React state, so 16 frames a second never re-render a screen.
 */
export function SpectrumBars({
  height = 110,
  active = true,
  bins = SPECTRUM_BINS,
}: SpectrumBarsProps) {
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

  const indices = useMemo(
    () => Array.from({ length: bins }, (_, i) => i),
    [bins]
  );

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
}: {
  index: number;
  levels: SharedValue<number[]>;
  height: number;
  active: boolean;
  reduced: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const raw = levels.value[index] ?? 0;
    const target = Math.max(2, raw * height);
    return {
      height: reduced ? target : withTiming(target, { duration: 90 }),
      opacity: active ? 0.45 + raw * 0.55 : 0.16,
    };
  }, [active, height, index, reduced]);

  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  bar: {
    flex: 1,
    borderRadius: 0,
    minHeight: 2,
    backgroundColor: color.accent,
  },
});
