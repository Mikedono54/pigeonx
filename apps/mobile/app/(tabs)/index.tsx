import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowUpRight, Play, Square } from 'lucide-react-native';

import { Banner, Button, Card, Screen, StatusPill, Touchable } from '../../src/components';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useElapsed } from '../../src/hooks/useElapsed';
import { OUTPUT_LABEL, describeParams } from '../../src/core/profiles';
import { useHistory } from '../../src/state/useHistory';
import { useProfiles } from '../../src/state/useProfiles';
import { useSchedules, formatMinutes } from '../../src/state/useSchedules';
import { formatElapsed, useSession } from '../../src/state/useSession';
import { color, font, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function HomeScreen() {
  const { plan } = useEntitlement();
  const profileId = useSession((s) => s.profileId);
  const output = useSession((s) => s.output);
  const engineState = useSession((s) => s.engineState);
  const startedAt = useSession((s) => s.startedAt);
  const error = useSession((s) => s.error);
  const hitPlanCap = useSession((s) => s.hitPlanCap);
  const start = useSession((s) => s.start);
  const stop = useSession((s) => s.stop);

  const byId = useProfiles((s) => s.byId);
  const profile = byId(profileId);
  const entries = useHistory((s) => s.entries);
  const schedules = useSchedules((s) => s.schedules);

  const elapsed = useElapsed(startedAt);
  const running = engineState === 'running';

  const todayCount = useMemo(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return entries.filter((e) => e.startedAt >= midnight.getTime()).length;
  }, [entries]);

  const nextSchedule = useMemo(() => {
    const now = new Date();
    let best: Date | null = null;
    for (const s of schedules) {
      if (!s.enabled || s.days.length === 0) continue;
      for (let offset = 0; offset < 8; offset++) {
        const d = new Date(now);
        d.setDate(now.getDate() + offset);
        if (!s.days.includes(d.getDay())) continue;
        d.setHours(Math.floor(s.startMinutes / 60), s.startMinutes % 60, 0, 0);
        if (d.getTime() <= now.getTime()) continue;
        if (!best || d < best) best = d;
        break;
      }
    }
    return best;
  }, [schedules]);

  const nextLabel = nextSchedule
    ? formatMinutes(nextSchedule.getHours() * 60 + nextSchedule.getMinutes())
    : 'None';

  const onPrimary = useCallback(() => {
    if (running) {
      void stop();
      return;
    }
    router.navigate('/deterrent');
    void start();
  }, [running, start, stop]);

  const status = running
    ? { label: `Running ${formatElapsed(elapsed)}`, tone: 'running' as const }
    : nextSchedule
      ? { label: `Scheduled ${nextLabel}`, tone: 'scheduled' as const }
      : { label: 'Idle', tone: 'idle' as const };

  return (
    <Screen
      title="My space"
      subtitle={
        running
          ? 'Audio keeps playing with the screen off.'
          : 'Pick a profile. Start. Stop when service ends.'
      }
      headerRight={<StatusPill label={status.label} tone={status.tone} />}
      scroll={false}
    >
      {error ? (
        <View style={styles.banner}>
          <Banner
            title="Audio did not start"
            body={error}
            onRetry={() => void start()}
          />
        </View>
      ) : null}

      {hitPlanCap && !running ? (
        <View style={styles.banner}>
          <Banner
            tone="info"
            title="Run stopped at 15 minutes"
            body="Free caps every run. Pro runs as long as you leave it on."
            retryLabel="See Pro"
            onRetry={() => router.push('/paywall')}
          />
        </View>
      ) : null}

      <Card
        active={running}
        onPress={() => router.navigate('/deterrent')}
        accessibilityLabel={`Change profile. Now set to ${profile?.name ?? 'none'}`}
        style={styles.profileCard}
      >
        <View style={styles.profileTop}>
          <Text style={styles.kicker}>Profile</Text>
          <ArrowUpRight size={16} color={color.fgSubtle} strokeWidth={1.75} />
        </View>
        <Text style={type.heading} numberOfLines={1}>
          {profile?.name ?? 'Nothing picked yet'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {profile ? describeParams(profile) : 'No profile'} ·{' '}
          {OUTPUT_LABEL[output]}
        </Text>
      </Card>

      <View style={styles.statRow}>
        <Stat label="Runs today" value={String(todayCount)} />
        <Stat label="Next" value={nextLabel} />
      </View>

      {plan === 'free' ? (
        <Touchable
          onPress={() => router.push('/paywall')}
          accessibilityLabel="Upgrade to Pro"
          style={styles.upgrade}
        >
          <Text style={styles.upgradeText} numberOfLines={1}>
            Free stops a run at 15 minutes.
          </Text>
          <Text style={styles.upgradeAction}>Upgrade</Text>
        </Touchable>
      ) : null}

      <View style={styles.spacer} />

      <Button
        label={running ? 'Stop' : 'Start'}
        variant={running ? 'danger' : 'primary'}
        size="lg"
        onPress={onPrimary}
        icon={
          running ? (
            <Square size={16} color={color.danger} strokeWidth={1.75} />
          ) : (
            <Play size={16} color={color.onAccent} strokeWidth={1.75} />
          )
        }
        accessibilityHint={
          running ? 'Stops the run' : 'Starts the profile shown above'
        }
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: space.sm },
  profileCard: { gap: 6 },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  meta: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: color.fgMuted,
  },
  statRow: { flexDirection: 'row', marginTop: -1 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border,
    marginLeft: -1,
    paddingVertical: space.sm + 4,
    paddingHorizontal: space.sm + 4,
    gap: 2,
  },
  statValue: {
    fontFamily: font.mono.medium,
    fontSize: 22,
    letterSpacing: -0.5,
    color: color.ink,
  },
  statLabel: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  upgrade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: color.border,
    paddingHorizontal: 2,
  },
  upgradeText: {
    flex: 1,
    fontFamily: font.body.regular,
    fontSize: 13,
    color: color.fg,
  },
  upgradeAction: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.accent,
  },
  spacer: { flex: 1, minHeight: space.md },
});
