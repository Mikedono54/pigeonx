import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { Pigeon, StatusPill } from '../src/components';
import { msUntilEnd, nextRun, playingAt, type TimeWindow } from '../src/core/scheduler';
import { useAccount } from '../src/state/useAccount';
import { formatMinutes, useSchedules } from '../src/state/useSchedules';
import { useSession } from '../src/state/useSession';
import {
  darkPalette,
  font,
  space,
  themed,
  useTheme,
  useThemedStyles,
} from '../src/theme';

const KEEP_SCREEN_ON_TAG = 'pigeonx-speaker';
const CHECK_EVERY_MS = 30_000;
const HOLD_TO_LEAVE_MS = 2000;

interface Window extends TimeWindow {
  profileId: string;
  profileName: string;
}

/**
 * Speaker mode.
 *
 * The phone sits in one place with the screen on and runs the times a person
 * set. It checks every thirty seconds, so a call, a lock or a stopped sound
 * only costs half a minute.
 */
export default function SpeakerMode() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const schedules = useSchedules((s) => s.schedules);
  const areaName = useSession((s) => s.zoneName);
  const businessName = useAccount((s) => s.activeOrgName);

  const [now, setNow] = useState(() => new Date());
  const [held, setHeld] = useState(0);
  const runningFor = useRef<string | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const windows = useMemo<Window[]>(
    () =>
      schedules.map((s) => ({
        id: s.id,
        days: s.days,
        startMinutes: s.startMinutes,
        endMinutes: s.endMinutes,
        enabled: s.enabled,
        profileId: s.profileId,
        profileName: s.profileName,
      })),
    [schedules]
  );

  const playing = useMemo(() => playingAt(windows, now), [now, windows]);
  const upNext = useMemo(() => nextRun(windows, now), [now, windows]);

  /** Start what should be playing, stop what should not. */
  const check = useCallback(async () => {
    const at = new Date();
    setNow(at);

    const should = playingAt(windows, at);
    const session = useSession.getState();
    const running = session.engineState === 'running';

    // Stop on the exact minute when the end is closer than the next check.
    if (endTimer.current) clearTimeout(endTimer.current);
    endTimer.current = null;
    if (should) {
      const left = msUntilEnd(should, at);
      if (left > 0 && left < CHECK_EVERY_MS) {
        endTimer.current = setTimeout(() => void check(), left);
      }
    }

    if (!should) {
      if (running && runningFor.current !== null) {
        runningFor.current = null;
        await session.stop();
      }
      return;
    }

    // Already playing the right sound. Nothing to do.
    if (running && runningFor.current === should.id) return;

    if (running) await session.stop();
    runningFor.current = should.id;
    session.setProfile(should.profileId);
    await session.start({ profileId: should.profileId, source: 'schedule' });
  }, [windows]);

  // Keep the screen on and the clock moving.
  useEffect(() => {
    void activateKeepAwakeAsync(KEEP_SCREEN_ON_TAG).catch(() => {});
    return () => {
      try {
        deactivateKeepAwake(KEEP_SCREEN_ON_TAG);
      } catch {
        // we never got to ask
      }
    };
  }, []);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    void check();
    const timer = setInterval(() => void check(), CHECK_EVERY_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
      if (endTimer.current) clearTimeout(endTimer.current);
    };
  }, [check]);

  // Leaving takes a two second hold, so a pocket cannot end the day's times.
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const leave = useCallback(async () => {
    if (runningFor.current !== null) {
      runningFor.current = null;
      await useSession.getState().stop();
    }
    router.back();
  }, []);

  const startHold = useCallback(() => {
    if (holdTimer.current) return;
    const began = Date.now();
    holdTimer.current = setInterval(() => {
      const done = Math.min(1, (Date.now() - began) / HOLD_TO_LEAVE_MS);
      setHeld(done);
      if (done >= 1) {
        if (holdTimer.current) clearInterval(holdTimer.current);
        holdTimer.current = null;
        void leave();
      }
    }, 50);
  }, [leave]);

  const endHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHeld(0);
  }, []);

  const clock = now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const where = areaName ?? businessName ?? 'This phone';

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg },
      ]}
    >
      <StatusBar style="light" />

      <View style={styles.head}>
        <Text style={styles.kicker}>Speaker mode</Text>
        <StatusPill label={playing ? 'Playing' : 'Waiting'} tone={playing ? 'running' : 'idle'} />
      </View>

      <View style={styles.middle}>
        <Text style={styles.clock} accessibilityLabel={`The time is ${clock}`}>
          {clock}
        </Text>
        <Text style={styles.where} numberOfLines={1}>
          {where}
        </Text>
        <Text style={styles.line} numberOfLines={2}>
          {playing
            ? `Playing ${playing.profileName} until ${formatMinutes(playing.endMinutes)}`
            : upNext
              ? `Next at ${formatMinutes(upNext.window.startMinutes)}, ${upNext.window.profileName}`
              : 'No times set yet. Add one on the Schedule screen.'}
        </Text>
      </View>

      <View style={styles.foot}>
        <View style={styles.hintRow}>
          <Pigeon
            size={34}
            pose={playing ? 'fly' : 'sit'}
            color={darkPalette.ink}
            holeColor={night.bg}
            beakColor={c.energy}
          />
          <Text style={styles.hint}>
            Leave this screen open. The phone plays your times on its own.
          </Text>
        </View>
        <Pressable
          onPressIn={startHold}
          onPressOut={endHold}
          accessibilityRole="button"
          accessibilityLabel="Hold to leave"
          accessibilityHint="Hold for two seconds"
          style={styles.leave}
        >
          <View style={[styles.leaveFill, { width: `${held * 100}%` }]} />
          <Text style={styles.leaveText}>{held > 0 ? 'Keep holding' : 'Hold to leave'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Speaker mode is always the dark face, in both palettes: the phone is
 * propped on a shelf all evening and a white screen would light the room.
 */
const night = { bg: '#0A0A0A', dim: '#B9B9B4', edge: '#5F5F5F' } as const;

/** Painted from `night` and the dark palette, whichever face the app is on. */
const sheet = themed((c) => ({
  root: {
    flex: 1,
    backgroundColor: night.bg,
    paddingHorizontal: space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontFamily: font.mono.bold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: darkPalette.muted,
  },
  middle: { flex: 1, justifyContent: 'center', gap: space.sm },
  clock: {
    fontFamily: font.mono.bold,
    fontSize: 76,
    letterSpacing: -4,
    color: darkPalette.playOn,
  },
  where: {
    fontFamily: font.heading.extrabold,
    fontSize: 24,
    letterSpacing: -0.9,
    color: darkPalette.playOn,
  },
  line: {
    fontFamily: font.body.medium,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: night.dim,
  },
  foot: { gap: space.md },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  hint: {
    flex: 1,
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 20,
    color: night.dim,
  },
  leave: {
    height: 60,
    borderWidth: 1,
    borderColor: night.edge,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leaveFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: c.accent,
  },
  leaveText: {
    fontFamily: font.heading.bold,
    fontSize: 17,
    letterSpacing: -0.4,
    color: darkPalette.playOn,
  },
}));
