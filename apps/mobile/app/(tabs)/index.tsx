import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowUpRight,
  CalendarClock,
  Play,
  Square,
  Waves,
} from 'lucide-react-native';

import {
  Banner,
  Button,
  Card,
  Screen,
  SectionHeader,
  StatusPill,
} from '../../src/components';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useElapsed } from '../../src/hooks/useElapsed';
import {
  EFFECTIVENESS_COPY,
  OUTPUT_LABEL,
  describeParams,
  effectiveForOutput,
} from '../../src/core/profiles';
import { useAccount } from '../../src/state/useAccount';
import { useHistory } from '../../src/state/useHistory';
import { useProfiles } from '../../src/state/useProfiles';
import { useSchedules, formatMinutes } from '../../src/state/useSchedules';
import { formatElapsed, useSession } from '../../src/state/useSession';
import { color, font, gradient, radius, space } from '../../src/theme/tokens';
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
    let best: { label: string; at: Date } | null = null;
    for (const s of schedules) {
      if (!s.enabled || s.days.length === 0) continue;
      for (let offset = 0; offset < 8; offset++) {
        const d = new Date(now);
        d.setDate(now.getDate() + offset);
        if (!s.days.includes(d.getDay())) continue;
        d.setHours(Math.floor(s.startMinutes / 60), s.startMinutes % 60, 0, 0);
        if (d.getTime() <= now.getTime()) continue;
        if (!best || d < best.at) best = { label: s.name, at: d };
        break;
      }
    }
    return best;
  }, [schedules]);

  const reach = profile ? effectiveForOutput(profile, output) : 'full';

  const onPrimary = useCallback(() => {
    if (running) {
      void stop();
      return;
    }
    router.navigate('/deterrent');
    void start();
  }, [running, start, stop]);

  const statusLabel = running
    ? formatElapsed(elapsed)
    : nextSchedule
      ? `Scheduled ${formatMinutes(
          nextSchedule.at.getHours() * 60 + nextSchedule.at.getMinutes()
        )}`
      : 'Idle';

  return (
    <Screen
      title="My space"
      subtitle={
        running
          ? 'Running now — audio keeps going with the screen off.'
          : 'One tap starts your last profile.'
      }
      bottomInset={100}
    >
      {error ? (
        <View style={{ marginBottom: space.md }}>
          <Banner
            title="Audio could not start"
            body={error}
            onRetry={() => void start()}
          />
        </View>
      ) : null}

      {hitPlanCap && !running ? (
        <View style={{ marginBottom: space.md }}>
          <Banner
            tone="info"
            title="Run stopped at the Free 15-minute cap"
            body="Pro removes the cap and lets sessions run as long as you need."
            retryLabel="See Pro"
            onRetry={() => router.push('/paywall')}
          />
        </View>
      ) : null}

      <Card active={running} padded={false} style={styles.hero}>
        <LinearGradient
          colors={
            running
              ? ['rgba(45,212,191,0.20)', 'rgba(59,130,246,0.06)']
              : ['rgba(27,39,66,0.9)', 'rgba(21,31,54,0.6)']
          }
          start={gradient.brandStart}
          end={gradient.brandEnd}
          style={styles.heroWash}
        />
        <View style={styles.heroBody}>
          <View style={styles.heroTop}>
            <View style={{ gap: 6, flex: 1 }}>
              <Text style={styles.heroLabel}>Active profile</Text>
              <Text style={type.heading} numberOfLines={1}>
                {profile?.name ?? 'No profile selected'}
              </Text>
              <Text style={styles.heroMeta}>
                {profile ? describeParams(profile) : '—'} ·{' '}
                {OUTPUT_LABEL[output]}
              </Text>
            </View>
            <StatusPill
              label={statusLabel}
              tone={running ? 'running' : nextSchedule ? 'scheduled' : 'idle'}
              mono={running}
            />
          </View>

          <View style={styles.reachRow}>
            <Waves
              size={15}
              color={
                reach === 'full'
                  ? color.success
                  : reach === 'partial'
                    ? color.warning
                    : color.danger
              }
              strokeWidth={2.2}
            />
            <Text style={styles.reachText}>
              {EFFECTIVENESS_COPY[reach].title} on {OUTPUT_LABEL[output]}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.statRow}>
        <Stat label="Runs today" value={String(todayCount)} />
        <Stat
          label="Next reminder"
          value={
            nextSchedule
              ? formatMinutes(
                  nextSchedule.at.getHours() * 60 + nextSchedule.at.getMinutes()
                )
              : '—'
          }
        />
        <Stat label="Plan" value={plan === 'free' ? 'Free' : plan.toUpperCase()} />
      </View>

      {!nextSchedule ? (
        <Card
          onPress={() => router.navigate('/schedules')}
          style={styles.linkCard}
          accessibilityLabel="Set up a schedule"
        >
          <CalendarClock size={18} color={color.blue} strokeWidth={2.1} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.linkTitle}>Set up a schedule</Text>
            <Text style={styles.linkBody}>
              Dawn and dusk are when birds settle. A reminder puts the start one
              tap away.
            </Text>
          </View>
          <ArrowUpRight size={16} color={color.fgSubtle} strokeWidth={2.2} />
        </Card>
      ) : null}

      {plan === 'free' ? (
        <View style={{ marginTop: space.lg }}>
          <SectionHeader
            title="Get the whole system"
            subtitle="Pro unlocks every profile, the builder, and unlimited run time."
          />
          <Card onPress={() => router.push('/paywall')} accessibilityLabel="Upgrade to Pro">
            <View style={styles.upsell}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.upsellTitle}>PigeonX Pro · $4.99/mo</Text>
                <Text style={styles.linkBody}>
                  Distress and predator calls, custom profiles, schedules and
                  full history.
                </Text>
              </View>
              <ArrowUpRight size={18} color={color.accent} strokeWidth={2.3} />
            </View>
          </Card>
        </View>
      ) : null}

      <View style={styles.dock}>
        <Button
          label={running ? 'Stop' : 'Start deterrent'}
          variant={running ? 'danger' : 'gradient'}
          size="lg"
          onPress={onPrimary}
          icon={
            running ? (
              <Square size={17} color={color.danger} strokeWidth={2.6} />
            ) : (
              <Play size={18} color={color.onAccent} strokeWidth={2.6} />
            )
          }
          accessibilityHint={
            running
              ? 'Stops the current run'
              : 'Starts your last profile on the Deterrent tab'
          }
        />
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: space.md },
  heroWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroBody: { padding: space.md, gap: space.md },
  heroTop: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  heroLabel: {
    fontFamily: font.body.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  heroMeta: {
    fontFamily: font.body.regular,
    fontSize: 13,
    color: color.fgMuted,
  },
  reachRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reachText: {
    fontFamily: font.body.medium,
    fontSize: 13,
    color: color.fgMuted,
  },
  statRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  stat: {
    flex: 1,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: space.md - 2,
    paddingHorizontal: space.sm + 2,
    gap: 3,
  },
  statValue: {
    fontFamily: font.mono.medium,
    fontSize: 20,
    color: color.fg,
  },
  statLabel: {
    fontFamily: font.body.regular,
    fontSize: 11,
    color: color.fgSubtle,
  },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  linkTitle: {
    fontFamily: font.body.semibold,
    fontSize: 14,
    color: color.fg,
  },
  linkBody: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 19,
    color: color.fgMuted,
  },
  upsell: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  upsellTitle: {
    fontFamily: font.heading.semibold,
    fontSize: 15,
    color: color.fg,
  },
  dock: { marginTop: space.xl },
});
