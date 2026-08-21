import { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Play, Square } from 'lucide-react-native';

import {
  Banner,
  Button,
  Chip,
  Disclosure,
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
import {
  EFFECTIVENESS_COPY,
  OUTPUT_LABEL,
  describeParams,
  effectiveForOutput,
  formatHz,
  guestsMayHear,
  peakFreqHz,
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
import { color, font, space } from '../../src/theme/tokens';

const DURATIONS: { value: DurationChoice; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
  { value: null, label: 'No limit' },
];

const OUTPUTS: OutputKind[] = [
  'phone',
  'bt_speaker',
  'pigeonx_emitter',
  'simulated',
];

/** Short labels so all four outputs sit on one row. */
const OUTPUT_SHORT: Record<OutputKind, string> = {
  phone: 'Phone',
  bt_speaker: 'Bluetooth',
  pigeonx_emitter: 'PigeonX',
  simulated: 'Test',
};

export default function DeterrentScreen() {
  const ent = useEntitlement();
  const toast = useToast();
  const [tuning, setTuning] = useState(false);

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

  const reach = useMemo(
    () => (profile ? effectiveForOutput(profile, output) : 'full'),
    [output, profile]
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
      if (o === 'pigeonx_emitter' && devices.length === 0) {
        const d = addSimulatedDevice();
        setOutput('simulated', d.id);
        toast.show('No hardware paired. Added a test device.', 'success');
        return;
      }
      setOutput(o, o === 'simulated' ? (devices[0]?.id ?? null) : null);
    },
    [addSimulatedDevice, devices, setOutput, toast]
  );

  const onPrimary = useCallback(() => {
    if (running) void stop();
    else void start();
  }, [running, start, stop]);

  const reachTint =
    reach === 'full'
      ? color.success
      : reach === 'partial'
        ? color.warning
        : color.danger;

  return (
    <Screen
      title="Sound"
      headerRight={
        <StatusPill
          label={running ? `Running ${formatElapsed(elapsed)}` : 'Ready'}
          tone={running ? 'running' : 'idle'}
        />
      }
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

      <SectionHeader
        index="01"
        title="Profile"
        actionLabel="All"
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
              accessibilityLabel={`${p.name}. ${describeParams(p)}${
                locked ? '. Pro only' : ''
              }`}
              accessibilityState={{ selected }}
              style={styles.railPress}
            >
              <View
                style={[
                  styles.profileCard,
                  selected ? styles.profileCardActive : null,
                ]}
              >
                <View style={styles.profileTop}>
                  <Text
                    style={[
                      styles.profileHz,
                      selected ? styles.profileHzActive : null,
                    ]}
                    numberOfLines={1}
                  >
                    {describeParams(p)}
                  </Text>
                  {locked ? <LockBadge plan={p.minPlan} compact /> : null}
                </View>
                <Text
                  style={[
                    styles.profileName,
                    selected ? styles.profileNameActive : null,
                  ]}
                  numberOfLines={2}
                >
                  {p.name}
                </Text>
              </View>
            </Touchable>
          );
        })}
      </ScrollView>

      <SectionHeader index="02" title="Output" />
      <View style={styles.chipRow}>
        {OUTPUTS.map((o) => (
          <Chip
            key={o}
            label={OUTPUT_SHORT[o]}
            selected={output === o}
            onPress={() => pickOutput(o)}
            accessibilityLabel={OUTPUT_LABEL[o]}
          />
        ))}
      </View>
      {output === 'bt_speaker' ? (
        <Touchable
          onPress={() => void Linking.openSettings()}
          accessibilityLabel="Open Settings to connect a speaker"
          style={styles.note}
        >
          <Text style={styles.noteText}>
            Connect the speaker in Settings first
          </Text>
        </Touchable>
      ) : null}

      <View style={styles.meter}>
        <SpectrumBars active={running} height={96} />
        <View style={styles.readout}>
          <Text style={[styles.readoutMain, { color: reachTint }]}>
            {profile ? formatHz(peakFreqHz(profile)) : 'No profile'} ·{' '}
            {EFFECTIVENESS_COPY[reach].title}
          </Text>
          {profile && guestsMayHear(profile) ? (
            <StatusPill label="Guests may hear" tone="warning" />
          ) : null}
        </View>
      </View>

      <SectionHeader
        index="03"
        title="Run for"
        subtitle={
          ent.can('session.unlimited') ? undefined : 'Free stops at 15 minutes.'
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

      <View style={styles.spacer} />

      <View style={styles.tune}>
        <Disclosure
          label="Tune"
          open={tuning}
          onToggle={() => setTuning((v) => !v)}
          summary={`${Math.round(volume * 100)}%`}
        >
          {profile && (profile.kind === 'tone' || profile.kind === 'pulse') ? (
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
              accessibilityHint="Higher pitches are harder for people to hear and harder for speakers to play"
            />
          ) : null}

          {profile && profile.kind === 'sweep' ? (
            <Slider
              label="Sweep speed"
              min={0.1}
              max={4}
              step={0.1}
              value={(profile.params as SweepParams).rateHz}
              readout={`${(profile.params as SweepParams).rateHz.toFixed(1)} Hz`}
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

          {profile ? (
            <EffectiveRangeMeter profile={profile} output={output} />
          ) : null}
        </Disclosure>
      </View>

      <Button
        label={running ? 'Stop' : 'Start'}
        variant={running ? 'danger' : 'primary'}
        size="lg"
        loading={busy}
        onPress={onPrimary}
        icon={
          running ? (
            <Square size={16} color={color.danger} strokeWidth={1.75} />
          ) : (
            <Play size={16} color={color.onAccent} strokeWidth={1.75} />
          )
        }
        accessibilityHint={
          running
            ? 'Stops playback and clears the notification'
            : 'Plays the chosen profile on the chosen output'
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: space.sm },
  railWrap: { marginHorizontal: -space.md, marginBottom: space.md },
  rail: { paddingHorizontal: space.md },
  railPress: { minHeight: 0 },
  profileCard: {
    width: 146,
    height: 74,
    padding: space.sm + 2,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
    justifyContent: 'space-between',
    marginRight: -1,
  },
  profileCardActive: { backgroundColor: color.ink, borderColor: color.ink },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
  },
  profileHz: {
    flex: 1,
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    color: color.accent,
  },
  profileHzActive: { color: color.onAccent },
  profileName: {
    fontFamily: font.heading.semibold,
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: -0.3,
    color: color.ink,
  },
  profileNameActive: { color: color.onAccent },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  note: { minHeight: 28, justifyContent: 'center' },
  noteText: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.accent,
  },
  meter: { marginVertical: space.md, gap: space.sm },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  readoutMain: {
    flex: 1,
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  spacer: { flex: 1, minHeight: space.md },
  tune: { marginBottom: space.sm },
});
