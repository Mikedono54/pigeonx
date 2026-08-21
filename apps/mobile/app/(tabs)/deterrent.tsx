import { useCallback, useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Cpu,
  Ear,
  Play,
  Plus,
  Smartphone,
  Speaker,
  Square,
  TestTube,
} from 'lucide-react-native';

import {
  Banner,
  Button,
  Card,
  Chip,
  EffectiveRangeMeter,
  LockBadge,
  Screen,
  SectionHeader,
  Slider,
  SpectrumBars,
  StatusPill,
  Touchable,
  useToast,
} from '../../src/components';
import { PLACEHOLDER_NOTICE } from '../../src/audio/samples';
import {
  OUTPUT_LABEL,
  describeParams,
  formatHz,
  guestsMayHear,
  type AudioProfile,
  type OutputKind,
  type PulseParams,
  type SweepParams,
  type ToneParams,
} from '../../src/core/profiles';
import { useElapsed } from '../../src/hooks/useElapsed';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useAccount } from '../../src/state/useAccount';
import { useProfiles } from '../../src/state/useProfiles';
import {
  formatElapsed,
  useSession,
  type DurationChoice,
} from '../../src/state/useSession';
import { color, font, radius, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

const DURATIONS: { value: DurationChoice; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
  { value: null, label: 'No limit' },
];

const OUTPUT_ICON = {
  phone: Smartphone,
  bt_speaker: Speaker,
  pigeonx_emitter: Cpu,
  simulated: TestTube,
} as const;

export default function DeterrentScreen() {
  const ent = useEntitlement();
  const toast = useToast();

  const allProfiles = useProfiles((s) => s.all)();
  const byId = useProfiles((s) => s.byId);

  const profileId = useSession((s) => s.profileId);
  const output = useSession((s) => s.output);
  const volume = useSession((s) => s.volume);
  const duration = useSession((s) => s.duration);
  const engineState = useSession((s) => s.engineState);
  const startedAt = useSession((s) => s.startedAt);
  const error = useSession((s) => s.error);
  const setProfile = useSession((s) => s.setProfile);
  const setOutput = useSession((s) => s.setOutput);
  const setVolume = useSession((s) => s.setVolume);
  const setDuration = useSession((s) => s.setDuration);
  const setParam = useSession((s) => s.setParam);
  const start = useSession((s) => s.start);
  const stop = useSession((s) => s.stop);

  const devices = useAccount((s) => s.devices);
  const addSimulatedDevice = useAccount((s) => s.addSimulatedDevice);

  const profile = byId(profileId);
  const running = engineState === 'running';
  const busy = engineState === 'loading';
  const elapsed = useElapsed(startedAt);

  const outputs = useMemo<OutputKind[]>(
    () => ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'],
    []
  );

  const pickProfile = useCallback(
    (p: AudioProfile) => {
      if (p.minPlan !== 'free' && !ent.can('profiles.all')) {
        ent.guard('profiles.all');
        return;
      }
      setProfile(p.id);
    },
    [ent, setProfile]
  );

  const pickDuration = useCallback(
    (d: DurationChoice) => {
      if (d === null && !ent.guard('session.unlimited')) return;
      setDuration(d);
    },
    [ent, setDuration]
  );

  const pickOutput = useCallback(
    (o: OutputKind) => {
      if (o === 'bt_speaker' && !ent.can('bluetooth.remember')) {
        // Free users can still route to Bluetooth; only *remembering* a
        // speaker is Pro. Route now, nudge later.
        toast.show('Connect the speaker in Control Center, then come back');
      }
      if (o === 'pigeonx_emitter' && devices.length === 0) {
        const d = addSimulatedDevice();
        setOutput('simulated', d.id);
        toast.show('No hardware paired — added a simulated device', 'success');
        return;
      }
      setOutput(o, o === 'simulated' ? (devices[0]?.id ?? null) : null);
    },
    [addSimulatedDevice, devices, ent, setOutput, toast]
  );

  const onPrimary = useCallback(() => {
    if (running) void stop();
    else void start();
  }, [running, start, stop]);

  return (
    <Screen
      title="Deterrent"
      subtitle="Pick a sound, pick where it plays, watch what comes out."
      bottomInset={120}
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

      {/* ---- profile picker ---- */}
      <SectionHeader
        title="Sound profile"
        actionLabel="Manage"
        onAction={() => router.push('/profiles')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        style={styles.railWrap}
      >
        {allProfiles.map((p) => {
          const locked = p.minPlan !== 'free' && !ent.can('profiles.all');
          const selected = p.id === profileId;
          return (
            <Touchable
              key={p.id}
              onPress={() => pickProfile(p)}
              haptic="selection"
              accessibilityLabel={`${p.name}. ${p.description}${
                locked ? '. Pro feature' : ''
              }`}
              accessibilityState={{ selected }}
              style={styles.railItem}
            >
              <View
                style={[
                  styles.profileCard,
                  selected && styles.profileCardActive,
                  locked && styles.profileCardLocked,
                ]}
              >
                <View style={styles.profileTop}>
                  <Text style={styles.profileHz}>{describeParams(p)}</Text>
                  {locked ? <LockBadge plan={p.minPlan} compact /> : null}
                </View>
                <Text style={styles.profileName} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={styles.profileDesc} numberOfLines={2}>
                  {p.description}
                </Text>
                {p.kind === 'sample' ? (
                  <Text style={styles.placeholder}>{PLACEHOLDER_NOTICE}</Text>
                ) : null}
              </View>
            </Touchable>
          );
        })}

        <Touchable
          onPress={() => {
            if (ent.guard('profiles.builder')) router.push('/profiles/new');
          }}
          accessibilityLabel="Build a custom profile"
          style={styles.railItem}
        >
          <View style={[styles.profileCard, styles.profileCardGhost]}>
            <Plus size={20} color={color.fgMuted} strokeWidth={2.2} />
            <Text style={styles.profileName}>Build your own</Text>
            <Text style={styles.profileDesc}>
              Set the frequency, timing and randomisation yourself.
            </Text>
            {!ent.can('profiles.builder') ? <LockBadge plan="pro" /> : null}
          </View>
        </Touchable>
      </ScrollView>

      {/* ---- live meter ---- */}
      <Card active={running} style={styles.meterCard}>
        <View style={styles.meterHead}>
          <View style={{ gap: 3, flex: 1 }}>
            <Text style={styles.meterLabel}>
              {running ? 'Playing now' : 'Ready'}
            </Text>
            <Text style={type.subheading} numberOfLines={1}>
              {profile?.name ?? 'No profile'}
            </Text>
          </View>
          <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
        </View>

        <SpectrumBars active={running} height={116} />

        <View style={styles.badges}>
          {profile && guestsMayHear(profile) ? (
            <View style={styles.guestBadge}>
              <Ear size={13} color={color.warning} strokeWidth={2.3} />
              <Text style={styles.guestText}>Guests may hear this</Text>
            </View>
          ) : (
            <StatusPill label="Above most hearing" tone="idle" dot={false} />
          )}
        </View>
      </Card>

      {/* ---- controls ---- */}
      {profile && profile.kind !== 'sample' ? (
        <Card style={styles.controls}>
          {profile.kind === 'tone' || profile.kind === 'pulse' ? (
            <Slider
              label="Frequency"
              min={8000}
              max={25000}
              step={100}
              value={(profile.params as ToneParams | PulseParams).freqHz}
              readout={formatHz(
                (profile.params as ToneParams | PulseParams).freqHz
              )}
              onChange={(v) => setParam('freqHz', v)}
              accessibilityHint="Higher is less audible to people but harder for speakers to reproduce"
            />
          ) : null}

          {profile.kind === 'sweep' ? (
            <Slider
              label="Sweep speed"
              min={0.1}
              max={4}
              step={0.1}
              value={(profile.params as SweepParams).rateHz}
              readout={`${(profile.params as SweepParams).rateHz.toFixed(
                1
              )} Hz`}
              onChange={(v) => setParam('rateHz', v)}
            />
          ) : null}

          <Slider
            label="Volume"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            readout={`${Math.round(volume * 100)}%`}
            onChange={setVolume}
          />
        </Card>
      ) : null}

      {/* ---- duration ---- */}
      <SectionHeader
        title="Run for"
        subtitle={
          ent.can('session.unlimited')
            ? undefined
            : 'Free runs stop automatically after 15 minutes.'
        }
      />
      <View style={styles.chipRow}>
        {DURATIONS.map((d) => (
          <Chip
            key={String(d.value)}
            label={d.label}
            selected={duration === d.value}
            locked={d.value === null && !ent.can('session.unlimited')}
            onPress={() => pickDuration(d.value)}
          />
        ))}
      </View>

      {/* ---- output ---- */}
      <View style={{ marginTop: space.lg }}>
        <SectionHeader title="Output" />
        <View style={{ gap: space.sm }}>
          {outputs.map((o) => {
            const Icon = OUTPUT_ICON[o];
            const selected = output === o;
            const hint = outputHint(o, devices.length);
            return (
              <Card
                key={o}
                active={selected}
                onPress={() => pickOutput(o)}
                accessibilityLabel={`${OUTPUT_LABEL[o]}. ${hint}`}
              >
                <View style={styles.outputRow}>
                  <View style={styles.outputIcon}>
                    <Icon
                      size={19}
                      color={selected ? color.teal : color.fgMuted}
                      strokeWidth={2.1}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.outputTitle}>{OUTPUT_LABEL[o]}</Text>
                    <Text style={styles.outputHint}>{hint}</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        {output === 'bt_speaker' ? (
          <View style={{ marginTop: space.sm }}>
            <Banner
              tone="info"
              title="Bluetooth is routed by the system"
              body="Connect the speaker in Control Center or Settings, then everything PigeonX plays goes to it."
              retryLabel="Open Settings"
              onRetry={() => void Linking.openSettings()}
            />
          </View>
        ) : null}
      </View>

      {/* ---- effective range ---- */}
      {profile ? (
        <Card style={{ marginTop: space.lg }}>
          <EffectiveRangeMeter profile={profile} output={output} />
        </Card>
      ) : null}

      <View style={styles.dock}>
        <Button
          label={running ? `Stop · ${formatElapsed(elapsed)}` : 'Start'}
          variant={running ? 'danger' : 'gradient'}
          size="lg"
          loading={busy}
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
              ? 'Stops playback and closes the notification'
              : 'Starts playback on the selected output'
          }
        />
      </View>
    </Screen>
  );
}

function outputHint(o: OutputKind, deviceCount: number): string {
  switch (o) {
    case 'phone':
      return 'Available now · honest ceiling around 18 kHz';
    case 'bt_speaker':
      return 'System route · Bluetooth codecs top out near 19 kHz';
    case 'pigeonx_emitter':
      return deviceCount > 0
        ? 'Paired hardware · up to 25 kHz'
        : 'None paired — tap to add a simulated device';
    case 'simulated':
      return 'Dry run · logs a session without making a sound';
  }
}

const styles = StyleSheet.create({
  railWrap: { marginHorizontal: -space.md, marginBottom: space.lg },
  rail: { paddingHorizontal: space.md, gap: space.sm },
  railItem: { minHeight: 0 },
  profileCard: {
    width: 176,
    minHeight: 148,
    padding: space.md - 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    gap: 5,
  },
  profileCardActive: {
    borderColor: color.teal,
    backgroundColor: color.elevated,
    shadowColor: color.teal,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  profileCardLocked: { opacity: 0.72 },
  profileCardGhost: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
  },
  profileHz: {
    fontFamily: font.mono.medium,
    fontSize: 12,
    color: color.teal,
    letterSpacing: 0.3,
  },
  profileName: {
    fontFamily: font.heading.semibold,
    fontSize: 15,
    color: color.fg,
  },
  profileDesc: {
    fontFamily: font.body.regular,
    fontSize: 12,
    lineHeight: 17,
    color: color.fgMuted,
  },
  placeholder: {
    marginTop: 'auto',
    fontFamily: font.body.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  meterCard: { gap: space.md, marginBottom: space.lg },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meterLabel: {
    fontFamily: font.body.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  timer: {
    fontFamily: font.mono.medium,
    fontSize: 26,
    color: color.fg,
    letterSpacing: 1,
  },
  badges: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.30)',
  },
  guestText: {
    fontFamily: font.body.semibold,
    fontSize: 12,
    color: color.warning,
  },
  controls: { gap: space.md, marginBottom: space.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  outputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  outputIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outputTitle: {
    fontFamily: font.body.semibold,
    fontSize: 15,
    color: color.fg,
  },
  outputHint: {
    fontFamily: font.body.regular,
    fontSize: 12,
    lineHeight: 18,
    color: color.fgMuted,
  },
  dock: { marginTop: space.xl },
});
