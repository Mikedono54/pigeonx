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
import { color, radius } from '../theme/tokens';

export interface SpectrumBarsProps {
  height?: number;
  /** dims the whole meter when nothing is running */
  active?: boolean;
  bins?: number;
}

/**
 * Live spectrum. Reads from the engine directly rather than through React
 * state so 16 fps of frames never re-renders a screen.
 */
export function SpectrumBars({
  height = 132,
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
      accessibilityLabel={
        active ? 'Live frequency meter' : 'Frequency meter, idle'
      }
    >
      {indices.map((i) => (
        <Bar
          key={i}
          index={i}
          total={bins}
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
  total,
  levels,
  height,
  active,
  reduced,
}: {
  index: number;
  total: number;
  levels: SharedValue<number[]>;
  height: number;
  active: boolean;
  reduced: boolean;
}) {
  // low frequencies teal, high frequencies blue — the same brand ramp
  const t = index / Math.max(1, total - 1);
  const tint = mix(color.teal, color.blue, t);

  const style = useAnimatedStyle(() => {
    const raw = levels.value[index] ?? 0;
    const target = Math.max(3, raw * height);
    return {
      height: reduced ? target : withTiming(target, { duration: 90 }),
      opacity: active ? 0.35 + raw * 0.65 : 0.18,
    };
  }, [active, height, index, reduced]);

  return (
    <Animated.View style={[styles.bar, { backgroundColor: tint }, style]} />
  );
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t));
  const g = Math.round((((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t));
  const bl = Math.round(((pa & 255) * (1 - t) + (pb & 255) * t));
  return `rgb(${r}, ${g}, ${bl})`;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 3,
  },
  bar: {
    flex: 1,
    borderRadius: radius.sm / 2,
    minHeight: 3,
  },
});
