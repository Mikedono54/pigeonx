import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion, space, themed, useTheme, useThemedStyles } from '../theme';
import { Pigeon } from './Pigeon';

export type BlockState = 'off' | 'playing' | 'soon' | 'attention';

export interface StateBlockProps {
  state: BlockState;
  /** the small mono line at the top: "PLAYING", "STARTS 6:00 PM". Off says
   *  nothing, because the headline under it already says Off. */
  label?: string;
  /** the one big thing on the screen */
  headline: string;
  /** true when the headline is a clock and should be set in the mono face */
  clock?: boolean;
  /** one short line under it, when there is anything worth saying */
  line?: string;
  /** the bars, drawn along the floor of the block while a sound plays */
  children?: React.ReactNode;
  /** room for the status bar, so the block can run to the top of the phone */
  topInset?: number;
  /** how tall the block stands. Home hands it a share of the screen. */
  height?: number;
  /**
   * The place switcher, sitting along the top of the block.
   *
   * Home puts it here rather than above the block, because which place you are
   * looking after is part of the state and not a title over it.
   */
  header?: React.ReactNode;
}

/**
 * The state of the app, as a block of colour you can read across a roof.
 *
 * Off is paper with a bird standing on it. Playing is deep blue with the
 * clock counting and the bird gone. The bird hops and flies off when a sound
 * starts, and lands again when it stops. If a person has asked their phone
 * for less movement, it just fades.
 */
export function StateBlock({
  state,
  label,
  headline,
  clock = false,
  line,
  children,
  topInset = 0,
  height = 224,
  header,
}: StateBlockProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const reduced = useReducedMotion();

  const playing = state === 'playing';
  const fill = useSharedValue(playing ? 1 : 0);
  const flight = useSharedValue(playing ? 1 : 0);
  const breath = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(playing ? 1 : 0, { duration: motion.state });
  }, [fill, playing]);

  useEffect(() => {
    if (reduced) {
      flight.value = withTiming(playing ? 1 : 0, { duration: motion.quick });
      return;
    }
    if (playing) {
      flight.value = withDelay(
        60,
        withTiming(1, {
          duration: motion.flight,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      flight.value = withSpring(0, motion.spring);
    }
  }, [flight, playing, reduced]);

  useEffect(() => {
    if (playing && !reduced) {
      breath.value = withRepeat(
        withSequence(
          withTiming(1, { duration: motion.breath / 2 }),
          withTiming(0, { duration: motion.breath / 2 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(breath);
      breath.value = 0;
    }
    return () => cancelAnimation(breath);
  }, [breath, playing, reduced]);

  const block = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      fill.value,
      [0, 1],
      [c.surface, c.play]
    ),
  }));

  const pulse = useAnimatedStyle(() => ({
    opacity: fill.value * (0.2 + breath.value * 0.5),
  }));

  const bird = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1 - flight.value, transform: [] };
    return {
      opacity: interpolate(flight.value, [0, 0.2, 1], [1, 1, 0]),
      transform: [
        { translateX: interpolate(flight.value, [0, 0.2, 1], [0, 0, 96]) },
        { translateY: interpolate(flight.value, [0, 0.2, 1], [0, -10, -74]) },
        { rotate: `${interpolate(flight.value, [0, 1], [0, -20])}deg` },
      ],
    };
  });

  const on = playing ? c.playOn : c.ink;
  const under = playing ? c.playOn : c.muted;
  const soon = state === 'soon';
  // A speaker that is gone gets the same rule along the floor as a session
  // coming up, painted in the warning colour. It is a fact to fix, not an
  // alarm, so nothing else on the block changes.
  const attention = state === 'attention';

  return (
    <Animated.View
      style={[
        styles.block,
        { height: height + topInset, paddingTop: space.md + topInset },
        block,
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.pulse, pulse]} />

      {header}

      {label ? (
        <View style={styles.head}>
          <Text style={[styles.label, { color: playing ? c.playOn : c.muted }]}>
            {label}
          </Text>
          {soon || attention ? (
            <View style={[styles.soon, attention ? { backgroundColor: c.warning } : null]} />
          ) : null}
        </View>
      ) : null}

      <Text
        style={[
          clock ? styles.clock : styles.headline,
          { color: on },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {headline}
      </Text>

      {line ? (
        <Text style={[styles.line, { color: under }]} numberOfLines={2}>
          {line}
        </Text>
      ) : null}

      {soon || attention ? (
        <View
          style={[styles.soonRule, attention ? { backgroundColor: c.warning } : null]}
        />
      ) : null}

      <View style={styles.floor}>
        <Animated.View style={bird}>
          <Pigeon
            size={44}
            pose={playing ? 'fly' : 'sit'}
            color={playing ? c.playOn : c.ink}
            holeColor={playing ? c.play : c.surface}
            beakColor={c.energy}
          />
        </Animated.View>
        <View style={styles.bars}>{children}</View>
      </View>
    </Animated.View>
  );
}

const sheet = themed((c, t) => ({
  block: {
    height: 224,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    overflow: 'hidden',
  },
  pulse: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: c.playOn,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { ...t.overline },
  soon: { width: 22, height: 4, backgroundColor: c.energy },
  soonRule: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: c.energy,
  },
  headline: { ...t.state, marginTop: 2, minHeight: 52 },
  clock: { ...t.timer, marginTop: 2, minHeight: 52 },
  line: { ...t.body, marginTop: 4 },
  floor: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
    marginTop: space.sm,
  },
  bars: { flex: 1, justifyContent: 'flex-end' },
}));

export default StateBlock;
