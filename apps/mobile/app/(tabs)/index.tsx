import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Music, Play, Speaker, Square } from 'lucide-react-native';

import {
  Banner,
  BlockButton,
  Chip,
  ListRow,
  Sheet,
  Slider,
  SpeakerReach,
  SpectrumBars,
  StateBlock,
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
import { nextRun } from '../../src/core/scheduler';
import { useAccount } from '../../src/state/useAccount';
import { useProfiles } from '../../src/state/useProfiles';
import { formatMinutes, useSchedules } from '../../src/state/useSchedules';
import { formatElapsed, useSession } from '../../src/state/useSession';
import type { DurationChoice } from '../../src/state/useSession';
import { font, space, themed, useTheme, useThemedStyles } from '../../src/theme';

const HOW_LONG: { value: DurationChoice; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: null, label: 'Until I stop' },
];

const SPEAKERS: OutputKind[] = ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'];

/** Ninety minutes. Any further off and the block stays plain paper. */
const SOON_MS = 90 * 60 * 1000;

const BLUETOOTH_NOTE = 'Pair it in your phone settings first.';

export default function HomeScreen() {
  const styles = useThemedStyles(sheet);
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
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
  const schedules = useSchedules((s) => s.schedules);

  const elapsed = useElapsed(startedAt);
  const playing = engineState === 'running';
  const busy = engineState === 'loading';

  // A time a person already set, close enough to say out loud.
  const [minute, setMinute] = useState(() => Date.now());
  useEffect(() => {
    if (schedules.length === 0) return;
    const tick = setInterval(() => setMinute(Date.now()), 60_000);
    return () => clearInterval(tick);
  }, [schedules.length]);

  const upNext = useMemo(() => {
    const from = new Date(minute);
    const found = nextRun(schedules, from);
    if (!found || found.at.getTime() - from.getTime() > SOON_MS) return null;
    return formatMinutes(found.window.startMinutes);
  }, [minute, schedules]);

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
    <View style={styles.root}>
      <StatusBar style={playing || dark ? 'light' : 'dark'} />

      <StateBlock
        state={playing ? 'playing' : upNext ? 'soon' : 'off'}
        label={playing ? 'Playing' : upNext ? `Starts ${upNext}` : '01  State'}
        headline={playing ? formatElapsed(elapsed) : 'Off'}
        clock={playing}
        line={playing ? 'You can lock the phone. The sound keeps going.' : undefined}
        topInset={insets.top}
      >
        {playing ? (
          <SpectrumBars
            active
            height={44}
            color={c.playOn}
            peakColor={c.energy}
          />
        ) : null}
      </StateBlock>

      <View style={styles.body}>
        {error ? (
          <View style={styles.banner}>
            <Banner title="That didn't work" body={error} onRetry={() => void start()} />
          </View>
        ) : hitPlanCap && !playing ? (
          <View style={styles.banner}>
            <Banner
              tone="info"
              title="Stopped after 15 minutes"
              body="Pro plays as long as you like."
              retryLabel="See Pro"
              onRetry={() => router.push('/paywall')}
            />
          </View>
        ) : null}

        <View style={styles.list}>
          <ListRow
            icon={Music}
            title={sound ? sound.name : 'No sound picked yet'}
            meta={sound ? `${soundPitch(sound)} pitch` : undefined}
            onPress={() => router.navigate('/sounds')}
            accessibilityLabel={`Sound, ${sound?.name ?? 'none picked yet'}. Tap to change.`}
          />
          <ListRow
            icon={Speaker}
            title={SPEAKER_LABEL[playsOn]}
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
          <Text style={styles.fieldLabel}>02  How long</Text>
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

        <View style={styles.spacer} />

        <Touchable
          onPress={() => setAdjustOpen(true)}
          accessibilityLabel="Adjust the pitch and the loudness"
          style={styles.adjust}
        >
          <Text style={styles.adjustText}>Adjust</Text>
        </Touchable>

        <BlockButton
          label={playing ? 'Stop' : 'Start'}
          tone={playing ? 'danger' : 'accent'}
          tall
          loading={busy}
          onPress={onBigButton}
          icon={playing ? Square : Play}
          accessibilityHint={playing ? 'Stops the sound' : 'Plays the sound shown above'}
        />
      </View>

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
    </View>
  );
}

/* ------------------------------------------------------------------ */

/** Pitch and loudness. Kept behind one link so Home stays simple. */
function AdjustSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const styles = useThemedStyles(sheet);
  const profileId = useSession((s) => s.profileId);
  const playsOn = useSession((s) => s.output);
  const volume = useSession((s) => s.volume);
  const setVolume = useSession((s) => s.setVolume);
  const setParam = useSession((s) => s.setParam);
  const byId = useProfiles((s) => s.byId);
  const sound = byId(profileId);

  const hasPitch = sound?.kind === 'tone' || sound?.kind === 'pulse';
  const isSweep = sound?.kind === 'sweep';

  const [hz, setHz] = useState(() => (sound ? peakFreqHz(sound) : 17000));
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

const sheet = themed((c, t) => ({
  root: { flex: 1, backgroundColor: c.bg },
  body: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  banner: { marginBottom: space.sm },
  list: { borderWidth: 1, borderColor: c.border },
  note: { minHeight: 40, justifyContent: 'center', marginTop: space.sm },
  noteText: { ...t.bodySmall, color: c.link },
  howLong: { marginTop: space.md, gap: space.sm },
  fieldLabel: { ...t.overline },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  spacer: { flex: 1, minHeight: space.sm },
  adjust: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  adjustText: { ...t.bodyStrong, fontSize: 15, color: c.link },
  sheetNote: { ...t.bodySmall },
  field: { gap: space.xs },
  mono: { ...t.caption, fontFamily: font.mono.medium, letterSpacing: 0.5 },
}));
