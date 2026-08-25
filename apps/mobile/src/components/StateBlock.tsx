import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { mascotPose, type MascotPose } from '../core/mascot';
import { motion, space, themed, useTheme, useThemedStyles } from '../theme';
import { Mascot } from './Mascot';

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
   * What the bird is doing. Home works this out from the same facts that
   * chose the state, so the two can never disagree.
   */
  pose?: MascotPose;
  /**
   * Bump this number to flash the block once in the playing colour.
   *
   * One flash, a quarter of a second, and only ever after something really
   * happened: a session finishing is the only caller today. Nothing under
   * reduced motion.
   */
  flashKey?: number;
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
 * clock counting and the bird calling. Nothing here moves for its own sake:
 * the block breathes only while a sound is coming out, and flashes only when
 * one has just ended. If a person has asked their phone for less movement, it
 * holds still.
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
  pose,
  flashKey = 0,
  header,
}: StateBlockProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const reduced = useReducedMotion();

  const playing = state === 'playing';
  const fill = useSharedValue(playing ? 1 : 0);
  const breath = useSharedValue(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(playing ? 1 : 0, { duration: motion.state });
  }, [fill, playing]);

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

  useEffect(() => {
    if (flashKey === 0 || reduced) return;
    flash.value = withSequence(
      withTiming(1, { duration: motion.quick / 3 }),
      withTiming(0, { duration: motion.flash })
    );
    return () => cancelAnimation(flash);
  }, [flash, flashKey, reduced]);

  const block = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fill.value, [0, 1], [c.surface, c.play]),
  }));

  const pulse = useAnimatedStyle(() => ({
    opacity: fill.value * (0.2 + breath.value * 0.5),
  }));

  const flashed = useAnimatedStyle(() => ({ opacity: flash.value * 0.85 }));

  const on = playing ? c.playOn : c.ink;
  const under = playing ? c.playOn : c.muted;
  const soon = state === 'soon';
  // A speaker that is gone gets the same rule along the floor as a session
  // coming up, painted in the warning colour. It is a fact to fix, not an
  // alarm, so nothing else on the block changes.
  const attention = state === 'attention';

  const bird =
    pose ??
    mascotPose({
      state: playing ? 'active' : attention ? 'attention' : soon ? 'scheduled' : 'off',
      ready: false,
    });

  return (
    <Animated.View
      style={[
        styles.block,
        { height: height + topInset, paddingTop: space.md + topInset },
        block,
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.pulse, pulse]} />
      <Animated.View
        pointerEvents="none"
        style={[styles.flash, { backgroundColor: c.play }, flashed]}
      />

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
        <Mascot
          pose={bird}
          size={44}
          color={playing ? c.playOn : c.ink}
          holeColor={playing ? c.play : c.surface}
          beakColor={c.energy}
          markColor={playing ? c.playOn : c.muted}
          warningColor={c.warning}
        />
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
  /** the single confirmation flash, painted over the whole block */
  flash: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0 },
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
