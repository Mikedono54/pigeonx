import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Play, Square } from 'lucide-react-native';

import {
  Banner,
  Button,
  Chip,
  ListRow,
  Screen,
  Sheet,
  Slider,
  SpeakerReach,
  SpectrumBars,
  Touchable,
  useToast,
} from '../../src/components';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useElapsed } from '../../src/hooks/useElapsed';
import {
  SPEAKER_HINT,
  SPEAKER_LABEL,
  formatHz,
  peakFreqHz,
  pitchWord,
  soundPitch,
  type OutputKind,
  type PulseParams,
  type SweepParams,
  type ToneParams,
} from '../../src/core/profiles';
import { useAccount } from '../../src/state/useAccount';
import { useProfiles } from '../../src/state/useProfiles';
import { formatElapsed, useSession } from '../../src/state/useSession';
import type { DurationChoice } from '../../src/state/useSession';
import { color, font, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

const HOW_LONG: { value: DurationChoice; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: null, label: 'Until I stop' },
];

const SPEAKERS: OutputKind[] = [
  'phone',
  'bt_speaker',
  'pigeonx_emitter',
  'simulated',
];

const BLUETOOTH_NOTE =
  "Connect a Bluetooth speaker in your phone's settings first, then it plays there.";

export default function HomeScreen() {
  const ent = useEntitlement();
  const toast = useToast();
  const [speakerOpen, setSpeakerOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const profileId = useSession((s) => s.profileId);
  const playsOn = useSession((s) => s.output);
  const duration = useSession((s) => s.duration);
  const engineState = useSession((s) => s.engineState);
  const startedAt = useSession((s) => s.startedAt);
  const error = useSession((s) => s.error);
  const hitPlanCap = useSession((s) => s.hitPlanCap);
  const setPlaysOn = useSession((s) => s.setOutput);
  const setDuration = useSession((s) => s.setDuration);
  const start = useSession((s) => s.start);
  const stop = useSession((s) => s.stop);

  const byId = useProfiles((s) => s.byId);
  const sound = byId(profileId);

  const speakers = useAccount((s) => s.devices);
  const addTestSpeaker = useAccount((s) => s.addSimulatedDevice);

  const elapsed = useElapsed(startedAt);
  const playing = engineState === 'running';
  const busy = engineState === 'loading';

  const pickSpeaker = useCallback(
    (o: OutputKind) => {
      if (o === 'pigeonx_emitter' && speakers.length === 0) {
        const d = addTestSpeaker();
        setPlaysOn('simulated', d.id);
        toast.show('PigeonX speakers are not out yet. Added a test speaker.');
        setSpeakerOpen(false);
        return;
      }
      setPlaysOn(o, o === 'simulated' ? (speakers[0]?.id ?? null) : null);
      setSpeakerOpen(false);
    },
    [addTestSpeaker, setPlaysOn, speakers, toast]
  );

  const pickHowLong = useCallback(
    (d: DurationChoice) => {
      if (d === null && !ent.guard('session.unlimited')) return;
      setDuration(d);
    },
    [ent, setDuration]
  );

  const onBigButton = useCallback(() => {
    if (playing) void stop();
    else void start();
  }, [playing, start, stop]);

  return (
    <Screen
      header={
        <View style={styles.statusBlock}>
          <Text style={type.display}>
            {playing ? `Playing ${formatElapsed(elapsed)}` : 'Off'}
          </Text>
          <Text style={type.body}>
            {playing
              ? 'You can lock the phone. The sound keeps going.'
              : 'Press Start. Birds leave.'}
          </Text>
        </View>
      }
      scroll={false}
    >
      {error ? (
        <View style={styles.banner}>
          <Banner
            title="That didn't work"
            body={error}
            onRetry={() => void start()}
          />
        </View>
      ) : null}

      {hitPlanCap && !playing ? (
        <View style={styles.banner}>
          <Banner
            tone="info"
            title="Stopped after 15 minutes"
            body="Free stops the sound after 15 minutes. Pro plays as long as you like."
            retryLabel="See Pro"
            onRetry={() => router.push('/paywall')}
          />
        </View>
      ) : null}

      <View style={styles.list}>
        <ListRow
          title={
            sound
              ? `Sound: ${sound.name}, ${soundPitch(sound).toLowerCase()} pitch`
              : 'Sound: none picked yet'
          }
          meta="Tap to change"
          onPress={() => router.navigate('/sounds')}
          accessibilityLabel={`Sound, ${sound?.name ?? 'none picked yet'}. Tap to change.`}
        />
        <ListRow
          title={`Plays on: ${SPEAKER_LABEL[playsOn]}`}
          meta={SPEAKER_HINT[playsOn]}
          onPress={() => setSpeakerOpen(true)}
          accessibilityLabel={`Plays on ${SPEAKER_LABEL[playsOn]}. Tap to change.`}
        />
      </View>

      {playsOn === 'bt_speaker' ? (
        <Touchable
          onPress={() => void Linking.openSettings()}
          accessibilityLabel="Open your phone settings to connect a speaker"
          style={styles.note}
        >
          <Text style={styles.noteText}>{BLUETOOTH_NOTE}</Text>
        </Touchable>
      ) : null}

      <View style={styles.howLong}>
        <Text style={styles.fieldLabel}>How long</Text>
        <View style={styles.chipRow}>
          {HOW_LONG.map((d) => (
            <Chip
              key={String(d.value)}
              label={d.label}
              selected={duration === d.value}
              locked={d.value === null && !ent.can('session.unlimited')}
              onPress={() => pickHowLong(d.value)}
            />
          ))}
        </View>
      </View>

      {playing ? (
        <View style={styles.meter}>
          <Text style={styles.fieldLabel}>Sound playing</Text>
          <SpectrumBars active height={72} />
        </View>
      ) : null}

      <View style={styles.spacer} />

      <Touchable
        onPress={() => setAdjustOpen(true)}
        accessibilityLabel="Adjust the pitch and the loudness"
        style={styles.adjust}
      >
        <Text style={styles.adjustText}>Adjust</Text>
      </Touchable>

      <Button
        label={playing ? 'Stop' : 'Start'}
        variant={playing ? 'danger' : 'primary'}
        size="lg"
        loading={busy}
        onPress={onBigButton}
        icon={
          playing ? (
            <Square size={16} color={color.danger} strokeWidth={1.75} />
          ) : (
            <Play size={16} color={color.onAccent} strokeWidth={1.75} />
          )
        }
        accessibilityHint={
          playing ? 'Stops the sound' : 'Plays the sound shown above'
        }
      />

      <Sheet
        open={speakerOpen}
        title="Where should it play?"
        onClose={() => setSpeakerOpen(false)}
      >
        <View style={styles.list}>
          {SPEAKERS.map((o) => (
            <ListRow
              key={o}
              title={SPEAKER_LABEL[o]}
              meta={SPEAKER_HINT[o]}
              selected={playsOn === o}
              chevron={false}
              onPress={() => pickSpeaker(o)}
            />
          ))}
        </View>
        <Text style={styles.sheetNote}>{BLUETOOTH_NOTE}</Text>
      </Sheet>

      <AdjustSheet open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

/** Pitch and loudness. Kept behind one link so Home stays simple. */
function AdjustSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const profileId = useSession((s) => s.profileId);
  const playsOn = useSession((s) => s.output);
  const volume = useSession((s) => s.volume);
  const setVolume = useSession((s) => s.setVolume);
  const setParam = useSession((s) => s.setParam);
  const byId = useProfiles((s) => s.byId);
  const sound = byId(profileId);

  const hasPitch = sound?.kind === 'tone' || sound?.kind === 'pulse';
  const isSweep = sound?.kind === 'sweep';

  const [hz, setHz] = useState(() =>
    sound ? peakFreqHz(sound) : 17000
  );
  const [rate, setRate] = useState(() =>
    isSweep ? (sound.params as SweepParams).rateHz : 0.5
  );

  useEffect(() => {
    if (!sound) return;
    setHz(peakFreqHz(sound));
    if (sound.kind === 'sweep') setRate((sound.params as SweepParams).rateHz);
  }, [sound]);

  const changeHz = useCallback(
    (v: number) => {
      setHz(v);
      setParam('freqHz', v);
    },
    [setParam]
  );

  const changeRate = useCallback(
    (v: number) => {
      setRate(v);
      setParam('rateHz', v);
    },
    [setParam]
  );

  const shown = sound
    ? {
        ...sound,
        params: hasPitch
          ? ({ ...(sound.params as ToneParams | PulseParams), freqHz: hz })
          : sound.params,
      }
    : null;

  return (
    <Sheet open={open} title="Adjust" onClose={onClose}>
      {hasPitch ? (
        <View style={styles.field}>
          <Slider
            label="Pitch"
            min={8000}
            max={25000}
            step={100}
            value={hz}
            readout={pitchWord(hz)}
            onChange={changeHz}
            accessibilityHint="Higher pitches are harder for people to hear and harder for speakers to play"
          />
          <Text style={styles.mono}>{formatHz(hz)}</Text>
        </View>
      ) : null}

      {isSweep ? (
        <Slider
          label="How fast it rises and falls"
          min={0.1}
          max={4}
          step={0.1}
          value={rate}
          readout={rate < 1 ? 'Slow' : rate < 2.5 ? 'Medium' : 'Fast'}
          onChange={changeRate}
        />
      ) : null}

      <Slider
        label="Loudness"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        readout={`${Math.round(volume * 100)}%`}
        onChange={setVolume}
      />

      {shown ? <SpeakerReach profile={shown} output={playsOn} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  statusBlock: { gap: 4 },
  banner: { marginBottom: space.sm },
  list: { borderWidth: 1, borderColor: color.border },
  note: { minHeight: 40, justifyContent: 'center', marginTop: space.sm },
  noteText: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.accent,
  },
  howLong: { marginTop: space.md, gap: space.sm },
  fieldLabel: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  meter: { marginTop: space.md, gap: space.sm },
  spacer: { flex: 1, minHeight: space.md },
  adjust: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  adjustText: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.accent,
  },
  sheetNote: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.fgMuted,
  },
  field: { gap: space.xs },
  mono: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: color.fgSubtle,
  },
});
