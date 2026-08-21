import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Building2,
  Cpu,
  LayoutGrid,
  Plus,
  Radio,
  TestTube,
  Trash2,
  Users,
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
import { color, font, gradient, radius, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function ZonesScreen() {
  const ent = useEntitlement();
  const unlocked = ent.can('zones');

  return unlocked ? <ZonesUnlocked /> : <ZonesTeaser />;
}

/* ------------------------------------------------------------------ */

function ZonesUnlocked() {
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
      subtitle="Locations, the areas inside them, and what plays where."
      bottomInset={80}
    >
      <SectionHeader
        title="My location"
        subtitle="Add more locations from the web dashboard."
      />

      <Card style={{ gap: space.md }}>
        <View style={styles.locHead}>
          <View style={styles.locIcon}>
            <Building2 size={19} color={color.teal} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.subheading}>Main property</Text>
            <Text style={styles.muted}>1 zone · {devices.length} device{devices.length === 1 ? '' : 's'}</Text>
          </View>
          <StatusPill
            label={running ? 'Running' : 'Idle'}
            tone={running ? 'running' : 'idle'}
          />
        </View>

        <View style={styles.zoneRow}>
          <LayoutGrid size={16} color={color.fgMuted} strokeWidth={2.1} />
          <Text style={styles.zoneName}>Patio</Text>
          <Text style={styles.muted}>Manual</Text>
        </View>
      </Card>

      <View style={{ marginTop: space.lg }}>
        <SectionHeader
          title="Devices"
          subtitle="BLE provisioning for real hardware lands with the emitter."
        />
        {devices.length === 0 ? (
          <Card style={styles.emptyDevices}>
            <Cpu size={22} color={color.fgSubtle} strokeWidth={2} />
            <Text style={styles.muted}>
              No devices yet. A simulated device lets you walk the whole flow
              before hardware exists.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: space.sm }}>
            {devices.map((d) => (
              <Card key={d.id}>
                <View style={styles.deviceRow}>
                  <View style={styles.locIcon}>
                    <TestTube size={18} color={color.blue} strokeWidth={2.1} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.zoneName}>{d.name}</Text>
                    <Text style={styles.muted}>
                      Simulated · paired{' '}
                      {new Date(d.pairedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Touchable
                    onPress={() => setOutput('simulated', d.id)}
                    accessibilityLabel={`Use ${d.name} as the output`}
                    style={styles.iconButton}
                  >
                    <Radio size={17} color={color.teal} strokeWidth={2.2} />
                  </Touchable>
                  <Touchable
                    onPress={() => removeDevice(d.id)}
                    accessibilityLabel={`Remove ${d.name}`}
                    style={styles.iconButton}
                  >
                    <Trash2 size={17} color={color.danger} strokeWidth={2.2} />
                  </Touchable>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ marginTop: space.md }}>
          <Button
            label="Add simulated device"
            variant="outline"
            onPress={addDevice}
            icon={<Plus size={17} color={color.fg} strokeWidth={2.4} />}
          />
        </View>
      </View>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

const TEASER_ZONES = [
  { name: 'Rooftop terrace', status: 'Running 12:40', tone: 'running' as const },
  { name: 'Loading dock', status: 'Scheduled 6:00 PM', tone: 'scheduled' as const },
  { name: 'Guest patio', status: 'Idle', tone: 'idle' as const },
];

function ZonesTeaser() {
  return (
    <Screen
      title="Zones"
      subtitle="Run several areas from one account, each with its own profile and schedule."
      bottomInset={80}
    >
      <View style={styles.teaserWrap}>
        <View style={styles.teaserStack} pointerEvents="none">
          {TEASER_ZONES.map((z) => (
            <Card key={z.name} style={styles.teaserCard}>
              <View style={styles.teaserRow}>
                <View style={styles.locIcon}>
                  <LayoutGrid size={18} color={color.fgMuted} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.zoneName}>{z.name}</Text>
                  <Text style={styles.muted}>Pigeon Guard 18k · Patio speaker</Text>
                </View>
                <StatusPill label={z.status} tone={z.tone} />
              </View>
            </Card>
          ))}
        </View>
        <LinearGradient
          colors={['rgba(11,18,32,0)', 'rgba(11,18,32,0.92)', color.background]}
          style={styles.teaserFade}
          pointerEvents="none"
        />
      </View>

      <Card elevated style={{ gap: space.md }}>
        <LinearGradient
          colors={gradient.brand}
          start={gradient.brandStart}
          end={gradient.brandEnd}
          style={styles.badge}
        >
          <Building2 size={22} color={color.onAccent} strokeWidth={2.2} />
        </LinearGradient>

        <Text style={type.heading}>Zones are a Business feature</Text>
        <Text style={styles.body}>
          Group a property into zones, assign a device and profile to each, and
          watch live status from the phone or the web dashboard. Staff can start
          a run without touching billing.
        </Text>

        <View style={{ gap: space.sm }}>
          <Perk icon={LayoutGrid} text="Unlimited zones per location" />
          <Perk icon={Cpu} text="Devices that run schedules unattended" />
          <Perk icon={Users} text="Up to 5 team members with roles" />
        </View>

        <Button
          label="Upgrade to Business"
          variant="gradient"
          size="lg"
          onPress={() =>
            router.push({ pathname: '/paywall', params: { tab: 'business' } })
          }
        />
      </Card>
    </Screen>
  );
}

function Perk({
  icon: Icon,
  text,
}: {
  icon: typeof LayoutGrid;
  text: string;
}) {
  return (
    <View style={styles.perk}>
      <Icon size={15} color={color.teal} strokeWidth={2.2} />
      <Text style={styles.perkText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 19,
    color: color.fgMuted,
  },
  body: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 21,
    color: color.fgMuted,
  },
  locHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  locIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingTop: space.md,
  },
  zoneName: {
    fontFamily: font.body.semibold,
    fontSize: 15,
    color: color.fg,
    flex: 1,
  },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDevices: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.lg,
  },
  teaserWrap: { marginBottom: space.lg },
  teaserStack: { gap: space.sm, opacity: 0.55 },
  teaserCard: {},
  teaserRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  teaserFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  perkText: {
    fontFamily: font.body.medium,
    fontSize: 14,
    color: color.fg,
    flex: 1,
  },
});
