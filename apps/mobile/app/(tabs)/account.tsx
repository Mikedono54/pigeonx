import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Building2,
  ChevronRight,
  Download,
  FlaskConical,
  History,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  SectionHeader,
  StatusPill,
  Touchable,
  useToast,
} from '../../src/components';
import { PLAN_LABEL, PLAN_ORDER, type Plan } from '../../src/core/entitlements';
import { OUTPUT_LABEL, formatHz } from '../../src/core/profiles';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useAccount } from '../../src/state/useAccount';
import { groupByDay, useHistory } from '../../src/state/useHistory';
import { color, font, gradient, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function AccountScreen() {
  const ent = useEntitlement();
  const toast = useToast();

  const email = useAccount((s) => s.email);
  const guest = useAccount((s) => s.guest);
  const setPlan = useAccount((s) => s.setPlan);
  const addSimulatedDevice = useAccount((s) => s.addSimulatedDevice);
  const resetOnboarding = useAccount((s) => s.resetOnboarding);

  const entries = useHistory((s) => s.entries);
  const queue = useHistory((s) => s.queue);

  const historyDays = ent.limit('historyDays');
  const visible = useMemo(() => {
    if (historyDays == null) return entries;
    const cutoff = Date.now() - historyDays * 24 * 60 * 60 * 1000;
    return entries.filter((e) => e.startedAt >= cutoff);
  }, [entries, historyDays]);

  const days = useMemo(() => groupByDay(visible).slice(0, 7), [visible]);

  const exportCsv = useCallback(() => {
    if (!ent.guard('analytics.export')) return;
    toast.show('Export lands with the Enterprise dashboard');
  }, [ent, toast]);

  return (
    <Screen title="Account" bottomInset={40}>
      {/* ---- plan ---- */}
      <Card padded={false} style={{ marginBottom: space.lg }}>
        <LinearGradient
          colors={
            ent.plan === 'free'
              ? ['rgba(27,39,66,0.9)', 'rgba(21,31,54,0.5)']
              : ['rgba(45,212,191,0.18)', 'rgba(59,130,246,0.06)']
          }
          start={gradient.brandStart}
          end={gradient.brandEnd}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.planBody}>
          <View style={styles.planTop}>
            <View style={{ gap: 4, flex: 1 }}>
              <Text style={styles.planLabel}>Current plan</Text>
              <Text style={type.title}>{PLAN_LABEL[ent.plan]}</Text>
              <Text style={styles.muted}>
                {guest
                  ? 'Guest on this phone — history stays local until you sign in.'
                  : (email ?? 'Signed in')}
              </Text>
            </View>
            <StatusPill
              label={ent.plan === 'free' ? 'Free' : PLAN_LABEL[ent.plan]}
              tone={ent.plan === 'free' ? 'idle' : 'running'}
              dot={false}
            />
          </View>

          {ent.plan === 'free' ? (
            <Button
              label="Upgrade"
              variant="gradient"
              onPress={() => router.push('/paywall')}
              icon={<Sparkles size={17} color={color.onAccent} strokeWidth={2.4} />}
            />
          ) : (
            <Button
              label="Manage plan"
              variant="outline"
              onPress={() => router.push('/paywall')}
            />
          )}
        </View>
      </Card>

      {/* ---- org switcher placeholder ---- */}
      <Card
        onPress={() =>
          ent.can('org.multiLocation')
            ? toast.show('Multi-location switching arrives with the dashboard')
            : ent.guard('org.multiLocation')
        }
        style={styles.linkRow}
        accessibilityLabel="Switch organisation"
      >
        <Building2 size={18} color={color.fgMuted} strokeWidth={2.1} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.linkTitle}>Organisation</Text>
          <Text style={styles.muted}>
            {ent.can('org.multiLocation')
              ? 'Personal · switch when you add locations'
              : 'Multi-location view is an Enterprise feature'}
          </Text>
        </View>
        <ChevronRight size={16} color={color.fgSubtle} strokeWidth={2.2} />
      </Card>

      {/* ---- history ---- */}
      <View style={{ marginTop: space.lg }}>
        <SectionHeader
          title="History"
          subtitle={
            historyDays == null
              ? `${entries.length} run${entries.length === 1 ? '' : 's'} logged`
              : `Free keeps the last ${historyDays} days`
          }
          actionLabel="Export"
          onAction={exportCsv}
        />

        {queue.length > 0 ? (
          <View style={{ marginBottom: space.sm }}>
            <StatusPill
              label={`${queue.length} run${queue.length === 1 ? '' : 's'} waiting to sync`}
              tone="warning"
            />
          </View>
        ) : null}

        {days.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={<History size={22} color={color.fgMuted} strokeWidth={2} />}
              title="No runs yet"
              body="Every start and stop lands here, with the profile, output and peak frequency."
              actionLabel="Start one"
              onAction={() => router.navigate('/deterrent')}
            />
          </Card>
        ) : (
          <View style={{ gap: space.sm }}>
            {days.map((d) => (
              <Card key={d.day}>
                <View style={styles.dayHead}>
                  <Text style={styles.dayLabel}>{d.label}</Text>
                  <Text style={styles.dayTotal}>
                    {d.count} run{d.count === 1 ? '' : 's'} ·{' '}
                    {Math.round(d.totalMs / 60000)} min
                  </Text>
                </View>
                {d.entries.slice(0, 4).map((e) => (
                  <View key={e.id} style={styles.entryRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.entryName} numberOfLines={1}>
                        {e.profileName}
                      </Text>
                      <Text style={styles.entryMeta}>
                        {OUTPUT_LABEL[e.outputKind]} ·{' '}
                        {formatHz(e.peakFreqHz)} ·{' '}
                        {new Date(e.startedAt).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.entryDur}>
                      {e.endedAt
                        ? `${Math.max(
                            1,
                            Math.round((e.endedAt - e.startedAt) / 60000)
                          )}m`
                        : '—'}
                    </Text>
                  </View>
                ))}
                {d.entries.length > 4 ? (
                  <Text style={styles.more}>
                    +{d.entries.length - 4} more
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </View>

      {/* ---- dev menu ---- */}
      {__DEV__ ? (
        <View style={{ marginTop: space.xl }}>
          <SectionHeader
            title="Dev menu"
            subtitle="Development builds only — never shipped to the store."
          />
          <Card style={{ gap: space.md }}>
            <View style={styles.devHead}>
              <FlaskConical size={16} color={color.warning} strokeWidth={2.2} />
              <Text style={styles.devTitle}>Sandbox plan</Text>
            </View>
            <View style={styles.chipRow}>
              {PLAN_ORDER.map((p: Plan) => (
                <Chip
                  key={p}
                  label={PLAN_LABEL[p]}
                  selected={ent.plan === p}
                  compact
                  onPress={() => {
                    setPlan(p);
                    toast.show(`Sandbox: plan set to ${PLAN_LABEL[p]}`);
                  }}
                />
              ))}
            </View>

            <Button
              label="Add simulated device"
              variant="outline"
              size="sm"
              onPress={() => {
                const d = addSimulatedDevice();
                toast.show(`${d.name} added`, 'success');
              }}
              icon={<Plus size={15} color={color.fg} strokeWidth={2.4} />}
            />
            <Button
              label="Reset onboarding"
              variant="ghost"
              size="sm"
              onPress={() => {
                resetOnboarding();
                router.replace('/onboarding');
              }}
              icon={<RotateCcw size={15} color={color.fg} strokeWidth={2.4} />}
            />
          </Card>
        </View>
      ) : null}

      <Touchable
        onPress={exportCsv}
        accessibilityLabel="Export session history as CSV"
        style={styles.footerLink}
      >
        <Download size={14} color={color.fgSubtle} strokeWidth={2.2} />
        <Text style={styles.footerLinkText}>Export session history</Text>
      </Touchable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  planBody: { padding: space.md, gap: space.md },
  planTop: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  planLabel: {
    fontFamily: font.body.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  muted: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 19,
    color: color.fgMuted,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  linkTitle: {
    fontFamily: font.body.semibold,
    fontSize: 14,
    color: color.fg,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
    gap: space.sm,
  },
  dayLabel: {
    fontFamily: font.heading.semibold,
    fontSize: 14,
    color: color.fg,
  },
  dayTotal: {
    fontFamily: font.mono.medium,
    fontSize: 12,
    color: color.fgMuted,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  entryName: {
    fontFamily: font.body.medium,
    fontSize: 13,
    color: color.fg,
  },
  entryMeta: {
    fontFamily: font.body.regular,
    fontSize: 11,
    color: color.fgSubtle,
  },
  entryDur: {
    fontFamily: font.mono.medium,
    fontSize: 13,
    color: color.fgMuted,
  },
  more: {
    marginTop: 6,
    fontFamily: font.body.regular,
    fontSize: 12,
    color: color.fgSubtle,
  },
  devHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  devTitle: {
    fontFamily: font.body.semibold,
    fontSize: 14,
    color: color.fg,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: space.xl,
  },
  footerLinkText: {
    fontFamily: font.body.medium,
    fontSize: 12,
    color: color.fgSubtle,
  },
});
