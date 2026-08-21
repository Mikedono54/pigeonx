import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Building2,
  Cpu,
  LayoutGrid,
  Plus,
  Radio,
  Trash2,
} from 'lucide-react-native';

import {
  Button,
  Card,
  Screen,
  SectionHeader,
  StatusPill,
  Touchable,
  useToast,
} from '../../src/components';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useAccount } from '../../src/state/useAccount';
import { useSession } from '../../src/state/useSession';
import { color, font, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function ZonesScreen() {
  const ent = useEntitlement();
  return ent.can('zones') ? <ZonesList /> : <ZonesTeaser />;
}

/* ------------------------------------------------------------------ */

function ZonesList() {
  const toast = useToast();
  const devices = useAccount((s) => s.devices);
  const addSimulatedDevice = useAccount((s) => s.addSimulatedDevice);
  const removeDevice = useAccount((s) => s.removeDevice);
  const setOutput = useSession((s) => s.setOutput);
  const running = useSession((s) => s.engineState) === 'running';

  const addDevice = useCallback(() => {
    const d = addSimulatedDevice();
    toast.show(`${d.name} added`, 'success');
  }, [addSimulatedDevice, toast]);

  return (
    <Screen
      title="Zones"
      headerRight={
        <StatusPill
          label={running ? 'Running' : 'Idle'}
          tone={running ? 'running' : 'idle'}
        />
      }
      scroll={false}
    >
      <SectionHeader index="01" title="Location" />
      <Card style={styles.locCard}>
        <View style={styles.row}>
          <Building2 size={20} color={color.ink} strokeWidth={1.75} />
          <View style={styles.rowText}>
            <Text style={type.subheading}>Main property</Text>
            <Text style={styles.meta}>
              1 zone · {devices.length} device{devices.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
        <View style={styles.zoneRow}>
          <LayoutGrid size={16} color={color.fgMuted} strokeWidth={1.75} />
          <Text style={styles.zoneName}>Patio</Text>
          <Text style={styles.meta}>Manual</Text>
        </View>
      </Card>

      <View style={styles.listHead}>
        <SectionHeader index="02" title="Devices" />
      </View>

      {devices.length === 0 ? (
        <Card style={styles.empty}>
          <Cpu size={20} color={color.fgSubtle} strokeWidth={1.75} />
          <Text style={styles.meta}>
            No devices yet. A test device walks the whole flow before hardware
            arrives.
          </Text>
        </Card>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {devices.map((d) => (
            <Card key={d.id}>
              <View style={styles.row}>
                <Cpu size={20} color={color.ink} strokeWidth={1.75} />
                <View style={styles.rowText}>
                  <Text style={styles.zoneName}>{d.name}</Text>
                  <Text style={styles.meta}>
                    Test device · paired{' '}
                    {new Date(d.pairedAt).toLocaleDateString()}
                  </Text>
                </View>
                <Touchable
                  onPress={() => setOutput('simulated', d.id)}
                  accessibilityLabel={`Play through ${d.name}`}
                  style={styles.iconButton}
                >
                  <Radio size={18} color={color.accent} strokeWidth={1.75} />
                </Touchable>
                <Touchable
                  onPress={() => removeDevice(d.id)}
                  accessibilityLabel={`Remove ${d.name}`}
                  style={styles.iconButton}
                >
                  <Trash2 size={18} color={color.danger} strokeWidth={1.75} />
                </Touchable>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      <View style={styles.spacer} />

      <Button
        label="Add test device"
        variant="secondary"
        onPress={addDevice}
        icon={<Plus size={16} color={color.ink} strokeWidth={1.75} />}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

const SAMPLE_ZONES = [
  { name: 'Rooftop terrace', status: 'Running 12:40', tone: 'running' as const },
  {
    name: 'Loading dock',
    status: 'Scheduled 6:00 PM',
    tone: 'scheduled' as const,
  },
  { name: 'Guest patio', status: 'Idle', tone: 'idle' as const },
];

const BUSINESS_LINES = [
  'Any number of zones per property',
  'Devices that run a window on their own',
  'Five team members with roles',
];

function ZonesTeaser() {
  return (
    <Screen
      title="Zones"
      subtitle="Run several areas from one account, each with its own profile and times."
      scroll={false}
    >
      <SectionHeader index="01" title="What it looks like" />
      <View style={styles.sample}>
        {SAMPLE_ZONES.map((z, i) => (
          <View
            key={z.name}
            style={[styles.sampleRow, i > 0 ? styles.sampleDivider : null]}
          >
            <LayoutGrid size={16} color={color.fgSubtle} strokeWidth={1.75} />
            <Text style={styles.zoneName} numberOfLines={1}>
              {z.name}
            </Text>
            <StatusPill label={z.status} tone={z.tone} />
          </View>
        ))}
      </View>

      <View style={styles.listHead}>
        <SectionHeader index="02" title="Business plan" />
      </View>
      <View style={styles.lines}>
        {BUSINESS_LINES.map((t) => (
          <Text key={t} style={styles.line}>
            {t}
          </Text>
        ))}
      </View>

      <View style={styles.spacer} />

      <Button
        label="Upgrade to Business"
        size="lg"
        onPress={() =>
          router.push({ pathname: '/paywall', params: { tab: 'business' } })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  locCard: { gap: space.sm + 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  rowText: { flex: 1, gap: 2 },
  meta: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    color: color.fgMuted,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingTop: space.sm + 4,
  },
  zoneName: {
    flex: 1,
    fontFamily: font.heading.semibold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: color.ink,
  },
  listHead: { marginTop: space.lg },
  list: { flexGrow: 0 },
  listContent: { gap: space.sm },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sample: { borderWidth: 1, borderColor: color.border },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.sm + 2,
  },
  sampleDivider: { borderTopWidth: 1, borderTopColor: color.border },
  lines: { gap: 6 },
  line: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 20,
    color: color.fg,
  },
  spacer: { flex: 1, minHeight: space.md },
});
