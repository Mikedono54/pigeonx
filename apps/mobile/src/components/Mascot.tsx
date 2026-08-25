import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  MASCOT_CALL_CYCLE_MS,
  MASCOT_LABEL,
  MASCOT_WALK_MS,
  type MascotPose,
} from '../core/mascot';
import { space, themed, useTheme, useThemedStyles } from '../theme';
import { Pigeon, type PigeonPose } from './Pigeon';

export interface MascotProps {
  pose: MascotPose;
  size?: number;
  /** the bird itself */
  color?: string;
  /** the eye and the gap in an open beak */
  holeColor?: string;
  beakColor?: string;
  /** the clock and the speaker beside it */
  markColor?: string;
  /** the edge on a speaker that is gone */
  warningColor?: string;
}

/** Which drawing each state of the bird uses. */
const POSE: Record<MascotPose, PigeonPose> = {
  calm: 'sit',
  ready: 'ready',
  calling: 'call',
  waiting: 'sit',
  offline: 'sit',
  leaving: 'walk',
};

/** Three lines, each starting a fifth of a cycle after the one before it. */
const LINES = [0, 1, 2];
const LINE_STAGGER = 0.18;

/**
 * The bird, in the state the app is actually in.
 *
 * The pose says what is happening and a small marker beside it says what it
 * is happening to: a clock for a session set for later, a speaker with a
 * warning edge for one that is gone, three stepping lines while a sound is
 * coming out. The lines are the only thing here that moves on its own, and
 * they stop the moment the sound does. A person who has asked their phone for
 * less movement gets none of it.
 */
export function Mascot({
  pose,
  size = 44,
  color,
  holeColor,
  beakColor,
  markColor,
  warningColor,
}: MascotProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const reduced = useReducedMotion();

  const mark = markColor ?? c.muted;
  const warn = warningColor ?? c.warning;

  const leaving = pose === 'leaving';
  const calling = pose === 'calling';

  const walk = useSharedValue(0);
  const step = useSharedValue(0);

  useEffect(() => {
    if (!leaving) {
      cancelAnimation(walk);
      walk.value = 0;
      return;
    }
    walk.value = withTiming(1, {
      duration: MASCOT_WALK_MS,
      easing: reduced ? Easing.linear : Easing.out(Easing.quad),
    });
    return () => cancelAnimation(walk);
  }, [leaving, reduced, walk]);

  useEffect(() => {
    if (!calling || reduced) {
      cancelAnimation(step);
      step.value = 0;
      return;
    }
    step.value = withRepeat(
      withTiming(1, { duration: MASCOT_CALL_CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(step);
  }, [calling, reduced, step]);

  const going = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1 - walk.value };
    return {
      opacity: 1 - walk.value * 0.85,
      transform: [{ translateX: walk.value * size }],
    };
  }, [reduced, size]);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="image"
      accessibilityLabel={MASCOT_LABEL[pose]}
    >
      <Animated.View style={going}>
        <Pigeon
          size={size}
          pose={POSE[pose]}
          color={color}
          holeColor={holeColor}
          beakColor={beakColor}
        />
      </Animated.View>

      {/* The lines are the sound. No sound, no lines, and none at all for
          somebody who asked their phone to stop moving things about. */}
      {calling && !reduced ? (
        <View style={styles.lines}>
          {LINES.map((i) => (
            <SoundLine key={i} index={i} step={step} color={color ?? c.ink} />
          ))}
        </View>
      ) : null}

      {pose === 'waiting' ? <ClockMark color={mark} /> : null}
      {pose === 'offline' ? <OfflineSpeaker color={mark} edge={warn} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */

/** One square cornered arc, stepping outward from the beak. */
function SoundLine({
  index,
  step,
  color,
}: {
  index: number;
  step: SharedValue<number>;
  color: string;
}) {
  const styles = useThemedStyles(sheet);

  const style = useAnimatedStyle(() => {
    const phase = (step.value - index * LINE_STAGGER + 1) % 1;
    // Each line fades up over the first third of its turn and back down over
    // the rest, so the three of them read as one thing moving outward.
    const level = phase < 0.34 ? phase / 0.34 : Math.max(0, 1 - (phase - 0.34) / 0.5);
    return { opacity: level * 0.9 };
  }, [index]);

  const height = 8 + index * 6;

  return (
    <Animated.View
      style={[styles.line, { height, borderColor: color, marginLeft: index === 0 ? 0 : 3 }, style]}
    />
  );
}

/** A square clock: a box with two hands in it. */
function ClockMark({ color }: { color: string }) {
  const styles = useThemedStyles(sheet);
  return (
    <View style={[styles.clock, { borderColor: color }]}>
      <View style={[styles.handUp, { backgroundColor: color }]} />
      <View style={[styles.handAcross, { backgroundColor: color }]} />
    </View>
  );
}

/** A speaker with a warning edge and a line struck through it. */
function OfflineSpeaker({ color, edge }: { color: string; edge: string }) {
  const styles = useThemedStyles(sheet);
  return (
    <View style={[styles.speaker, { borderColor: edge }]}>
      <View style={[styles.cone, { backgroundColor: color }]} />
      <View style={[styles.cut, { backgroundColor: edge }]} />
    </View>
  );
}

const sheet = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  lines: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  line: {
    width: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
  },
  clock: { width: 14, height: 14, borderWidth: 1, marginBottom: 4 },
  handUp: { position: 'absolute', left: 6, top: 2, width: 1, height: 5 },
  handAcross: { position: 'absolute', left: 6, top: 6, width: 4, height: 1 },
  speaker: {
    width: 14,
    height: 18,
    borderWidth: 1,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cone: { width: 6, height: 6 },
  cut: {
    position: 'absolute',
    left: -2,
    top: 8,
    width: 18,
    height: 1,
    transform: [{ rotate: '-40deg' }],
  },
}));

export default Mascot;
