import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Building2,
  ChevronRight,
  Download,
  History,
  Plus,
  RotateCcw,
} from 'lucide-react-native';

import {
  Button,
  Card,
  Chip,
  Disclosure,
  Screen,
  SectionHeader,
  StatusPill,
  Touchable,
  useToast,
} from '../../src/components';
import { PLAN_LABEL, PLAN_ORDER, type Plan } from '../../src/core/entitlements';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useAccount } from '../../src/state/useAccount';
import { useHistory } from '../../src/state/useHistory';
import { color, font, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function AccountScreen() {
  const ent = useEntitlement();
  const toast = useToast();
  const [devOpen, setDevOpen] = useState(false);

  const email = useAccount((s) => s.email);
  const guest = useAccount((s) => s.guest);
  const setPlan = useAccount((s) => s.setPlan);
  const addSimulatedDevice = useAccount((s) => s.addSimulatedDevice);
  const resetOnboarding = useAccount((s) => s.resetOnboarding);

  const entries = useHistory((s) => s.entries);
  const queue = useHistory((s) => s.queue);

  const exportCsv = useCallback(() => {
    if (!ent.guard('analytics.export')) return;
    toast.show('Export ships with the Enterprise dashboard');
  }, [ent, toast]);

  const free = ent.plan === 'free';

  return (
    <Screen
      title="Account"
      headerRight={
        <StatusPill
          label={PLAN_LABEL[ent.plan]}
          tone={free ? 'idle' : 'running'}
        />
      }
      scroll={false}
    >
      <SectionHeader index="01" title="Plan" />
      <Card style={styles.planCard}>
        <Text style={type.heading}>PigeonX {PLAN_LABEL[ent.plan]}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {guest ? 'Guest on this phone' : (email ?? 'Signed in')}
        </Text>
      </Card>

      <View style={styles.section}>
        <SectionHeader index="02" title="Your data" />
      </View>
      <View style={styles.rows}>
        <Row
          icon={<History size={18} color={color.ink} strokeWidth={1.75} />}
          title="Run history"
          meta={
            queue.length > 0
              ? `${entries.length} logged · ${queue.length} waiting to sync`
              : `${entries.length} run${entries.length === 1 ? '' : 's'} logged`
          }
          onPress={() => router.push('/history')}
        />
        <Row
          icon={<Building2 size={18} color={color.ink} strokeWidth={1.75} />}
          title="Organisation"
          meta={
            ent.can('org.multiLocation')
              ? 'Personal'
              : 'Several locations needs Enterprise'
          }
          onPress={() =>
            ent.can('org.multiLocation')
              ? toast.show('Location switching ships with the dashboard')
              : ent.guard('org.multiLocation')
          }
        />
        <Row
          icon={<Download size={18} color={color.ink} strokeWidth={1.75} />}
          title="Export runs"
          meta="CSV, Enterprise only"
          onPress={exportCsv}
        />
      </View>

      {__DEV__ ? (
        <View style={styles.section}>
          <Disclosure
            label="Dev menu"
            open={devOpen}
            onToggle={() => setDevOpen((v) => !v)}
            summary={PLAN_LABEL[ent.plan]}
          >
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
              label="Add test device"
              variant="secondary"
              size="sm"
              onPress={() => {
                const d = addSimulatedDevice();
                toast.show(`${d.name} added`, 'success');
              }}
              icon={<Plus size={14} color={color.ink} strokeWidth={1.75} />}
            />
            <Button
              label="Reset onboarding"
              variant="ghost"
              size="sm"
              onPress={() => {
                resetOnboarding();
                router.replace('/onboarding');
              }}
              icon={<RotateCcw size={14} color={color.ink} strokeWidth={1.75} />}
            />
          </Disclosure>
        </View>
      ) : null}

      <View style={styles.spacer} />

      <Button
        label={free ? 'Upgrade to Pro' : 'Manage plan'}
        variant={free ? 'primary' : 'secondary'}
        size="lg"
        onPress={() => router.push('/paywall')}
      />
    </Screen>
  );
}

function Row({
  icon,
  title,
  meta,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Touchable
      onPress={onPress}
      accessibilityLabel={`${title}. ${meta}`}
      style={styles.row}
    >
      {icon}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <ChevronRight size={16} color={color.fgSubtle} strokeWidth={1.75} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  planCard: { gap: 4 },
  section: { marginTop: space.lg },
  rows: { borderWidth: 1, borderColor: color.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    minHeight: 60,
    paddingHorizontal: space.sm + 4,
    borderTopWidth: 1,
    borderTopColor: color.border,
    marginTop: -1,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: font.heading.semibold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: color.ink,
  },
  meta: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    color: color.fgMuted,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  spacer: { flex: 1, minHeight: space.md },
});
