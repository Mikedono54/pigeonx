import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronDown,
  ListMusic,
  Music,
  Play,
  Plus,
  SlidersHorizontal,
  Speaker,
  Square,
} from 'lucide-react-native';

import {
  Banner,
  BlockButton,
  Chip,
  ListRow,
  ResultSheet,
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
  HOME_ATTENTION_LINE,
  HOME_OFF_LINE,
  homeState,
  nextSessionLine,
} from '../../src/core/homeState';
import {
  BIRD_TARGET_LABELS,
  summaryLine,
  tallyResults,
  type SessionResult,
} from '../../src/core/personalization';
import {
  AUDIBLE_LABEL,
  SPEAKER_HINT,
  SPEAKER_LABEL,
  audibleState,
  formatHz,
  peakFreqHz,
  pitchLabel,
  type OutputKind,
  type PulseParams,
  type SweepParams,
  type ToneParams,
} from '../../src/core/profiles';
import { sessionRecorder } from '../../src/services/sessionRecorder';
import { useAccount } from '../../src/state/useAccount';
import { useHistory } from '../../src/state/useHistory';
import { usePlacesHome, type HomePlace } from '../../src/state/usePlacesHome';
import { useProfiles } from '../../src/state/useProfiles';
import { describePlan, useProtectionPlans } from '../../src/state/useProtectionPlans';
import { useSchedules } from '../../src/state/useSchedules';
import { formatElapsed, useSession } from '../../src/state/useSession';
import type { DurationChoice } from '../../src/state/useSession';
import { space, themed, useTheme, useThemedStyles } from '../../src/theme';

const HOW_LONG: { value: DurationChoice; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: null, label: 'Until I stop' },
];

const SPEAKERS: OutputKind[] = ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'];

const BLUETOOTH_NOTE = 'Pair it in your phone settings first.';

/**
 * The share of the screen the state block takes.
 *
 * A proportion and not a number of points, so the block reads as the top of
 * the phone on a small one and on a large one alike. It gives way, though:
 * the controls under it get the room they need first, and the block takes
 * what is left. On a short phone that is less than the share it asked for,
 * and the alternative is a Start button somebody has to scroll to find.
 */
const STATE_BLOCK_SHARE = 0.4;
const STATE_BLOCK_MIN = 200;

/** What the stack under the block needs: three rows, the chips, and Start. */
const CONTROLS_MIN = 368;

export default function HomeScreen() {
  const styles = useThemedStyles(sheet);
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const ent = useEntitlement();
  // What the tab bar leaves us. Measured, because guessing the bar's height
  // is how the Start button ends up half a thumb off the bottom.
  const [frame, setFrame] = useState(0);
  const toast = useToast();
  const [speakerOpen, setSpeakerOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [playsOpen, setPlaysOpen] = useState(false);

  const profileId = useSession((s) => s.profileId);
  const playsOn = useSession((s) => s.output);
  const duration = useSession((s) => s.duration);
  const engineState = useSession((s) => s.engineState);
  const startedAt = useSession((s) => s.startedAt);
  const error = useSession((s) => s.error);
  const hitPlanCap = useSession((s) => s.hitPlanCap);
  const soundOverride = useSession((s) => s.soundOverride);
  const livePlanName = useSession((s) => s.planName);
  const rotationAt = useSession((s) => s.rotationAt);
  const setPlaysOn = useSession((s) => s.setOutput);
  const setDuration = useSession((s) => s.setDuration);
  const usePlanAgain = useSession((s) => s.usePlanAgain);
  const start = useSession((s) => s.start);
  const stop = useSession((s) => s.stop);

  const byId = useProfiles((s) => s.byId);
  const sound = byId(profileId);

  const speakers = useAccount((s) => s.devices);
  const deviceId = useSession((s) => s.deviceId);
  const addTestSpeaker = useAccount((s) => s.addSimulatedDevice);
  const schedules = useSchedules((s) => s.schedules);
  const nextUp = useSchedules((s) => s.nextUp);

  const places = usePlacesHome((s) => s.places);
  const activePlaceId = usePlacesHome((s) => s.activeId);
  const setActivePlace = usePlacesHome((s) => s.setActive);
  const canAddPlace = usePlacesHome((s) => s.canAdd);
  const place = usePlacesHome((s) => s.active());

  const plans = useProtectionPlans((s) => s.plans);
  const activeByPlace = useProtectionPlans((s) => s.activeByPlace);
  const plan = useMemo(() => {
    const id = place ? activeByPlace[place.id] : undefined;
    return id ? plans.find((p) => p.id === id) : undefined;
  }, [activeByPlace, place, plans]);

  const entries = useHistory((s) => s.entries);
  const pending = useHistory((s) => s.entries.find((e) => e.endedAt !== null && !e.resultAsked));
  const markAsked = useHistory((s) => s.markAsked);

  const elapsed = useElapsed(startedAt);
  const playing = engineState === 'running';
  const busy = engineState === 'loading';

  /** What this Start will run: the place's plan, unless somebody said not this time. */
  const runsPlan = plan !== undefined && !soundOverride;

  // A time a person already set, close enough to say out loud.
  const [minute, setMinute] = useState(() => Date.now());
  useEffect(() => {
    if (schedules.length === 0) return;
    const tick = setInterval(() => setMinute(Date.now()), 60_000);
    return () => clearInterval(tick);
  }, [schedules.length]);

  const nextAt = useMemo(() => {
    void minute;
    return nextUp()?.at ?? null;
  }, [minute, nextUp]);

  /**
   * The speaker this place plays through is gone.
   *
   * We have no live speaker health, so this is the only version of it we can
   * say honestly: you picked a speaker of your own, and the phone no longer
   * has it. A place playing out of the phone is never in this state.
   */
  const speakerMissing = useMemo(() => {
    if (playsOn === 'phone' || playsOn === 'bt_speaker') return false;
    if (deviceId) return !speakers.some((d) => d.id === deviceId);
    return speakers.length === 0;
  }, [deviceId, playsOn, speakers]);

  const state = homeState({ playing, speakerMissing, nextAt });

  /** One line of counting, from what this person told us about this place. */
  const reported = useMemo(() => {
    if (!place) return null;
    return summaryLine(
      tallyResults(entries.filter((e) => e.placeId === place.id).map((e) => e.result)),
    );
  }, [entries, place]);

  const upNextName = useMemo(() => {
    void rotationAt;
    return useSession.getState().upNext();
  }, [rotationAt]);

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
    [addTestSpeaker, setPlaysOn, speakers, toast],
  );

  const pickHowLong = useCallback(
    (d: DurationChoice) => {
      if (d === null && !ent.guard('session.unlimited')) return;
      setDuration(d);
    },
    [ent, setDuration],
  );

  const onBigButton = useCallback(() => {
    if (playing) void stop();
    else void start({ plan: runsPlan ? plan : null });
  }, [plan, playing, runsPlan, start, stop]);

  const addPlace = useCallback(() => {
    setPlacesOpen(false);
    if (!canAddPlace()) {
      ent.guard('places.multiple');
      return;
    }
    router.push('/place-setup');
  }, [canAddPlace, ent]);

  const answer = useCallback(
    (result: SessionResult) => {
      if (!pending) return;
      void sessionRecorder.report(pending.id, result);
    },
    [pending],
  );

  const room = frame || windowHeight - 90;
  const blockHeight = Math.max(
    STATE_BLOCK_MIN,
    Math.min(Math.round(room * STATE_BLOCK_SHARE), room - CONTROLS_MIN),
  );

  const headline = playing
    ? formatElapsed(elapsed)
    : state === 'attention'
      ? 'Check speaker'
      : state === 'scheduled'
        ? 'Ready'
        : 'Off';

  const line = playing
    ? (upNextName ? `Up next: ${upNextName}` : 'You can lock the phone. The sound keeps going.')
    : state === 'attention'
      ? HOME_ATTENTION_LINE
      : state === 'scheduled' && nextAt
        ? nextSessionLine(nextAt, new Date(minute))
        : HOME_OFF_LINE;

  return (
    <View style={styles.root} onLayout={(e) => setFrame(e.nativeEvent.layout.height)}>
      <StatusBar style={playing || dark ? 'light' : 'dark'} />

      <StateBlock
        state={playing ? 'playing' : state === 'attention' ? 'attention' : state === 'scheduled' ? 'soon' : 'off'}
        label={playing ? (livePlanName ?? 'Playing') : undefined}
        headline={headline}
        clock={playing}
        line={line}
        topInset={insets.top}
        height={Math.max(180, blockHeight - insets.top)}
        header={
          place ? (
            <Touchable
              onPress={() => setPlacesOpen(true)}
              accessibilityLabel={`${place.name}. ${BIRD_TARGET_LABELS[place.target]}, ${SPEAKER_LABEL[playsOn]}. Tap to switch place.`}
              style={styles.placePress}
            >
              <View style={styles.placeRow}>
                <View style={styles.placeText}>
                  <Text
                    style={[styles.placeName, { color: playing ? c.playOn : c.muted }]}
                    numberOfLines={1}
                  >
                    {place.name}
                  </Text>
                  <Text
                    style={[styles.placeMeta, { color: playing ? c.playOn : c.text }]}
                    numberOfLines={1}
                  >
                    {BIRD_TARGET_LABELS[place.target]} · {SPEAKER_LABEL[playsOn]}
                  </Text>
                </View>
                <ChevronDown size={18} color={playing ? c.playOn : c.muted} strokeWidth={2} />
              </View>
            </Touchable>
          ) : null
        }
      >
        {playing ? <SpectrumBars active height={44} color={c.playOn} peakColor={c.energy} /> : null}
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
        ) : reported && state === 'off' ? (
          <Text style={styles.reported}>{reported}</Text>
        ) : null}

        <View style={styles.list}>
          {runsPlan && plan ? (
            <ListRow
              icon={ListMusic}
              title={plan.name}
              meta={describePlan(plan)}
              onPress={() => setPlaysOpen(true)}
              accessibilityLabel={`Protection plan, ${plan.name}. ${describePlan(plan)}. Tap to change what plays.`}
            />
          ) : (
            <ListRow
              icon={Music}
              title={sound ? sound.name : 'No sound picked yet'}
              meta={
                sound
                  ? `${pitchLabel(sound)}. ${AUDIBLE_LABEL[audibleState(sound, playsOn)]}`
                  : undefined
              }
              onPress={() => (plan ? setPlaysOpen(true) : router.navigate('/sounds'))}
              accessibilityLabel={`Sound, ${sound?.name ?? 'none picked yet'}. Tap to change.`}
            />
          )}
          <ListRow
            icon={Speaker}
            title={SPEAKER_LABEL[playsOn]}
            meta={SPEAKER_HINT[playsOn]}
            onPress={() => setSpeakerOpen(true)}
            accessibilityLabel={`Plays on ${SPEAKER_LABEL[playsOn]}. Tap to change.`}
          />
          <ListRow
            icon={SlidersHorizontal}
            title="Pitch and loudness"
            onPress={() => setAdjustOpen(true)}
            accessibilityLabel="Pitch and loudness. Tap to change."
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

        {runsPlan ? null : (
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
        )}

        <View style={styles.spacer} />

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

      <Sheet open={placesOpen} title="Your places" onClose={() => setPlacesOpen(false)}>
        <View style={styles.list}>
          {places.map((p) => (
            <PlaceRow
              key={p.id}
              place={p}
              selected={p.id === activePlaceId}
              onPress={() => {
                setActivePlace(p.id);
                setPlacesOpen(false);
              }}
            />
          ))}
          <ListRow
            icon={Plus}
            title="Add a place"
            meta={canAddPlace() ? undefined : 'Pro keeps more than one'}
            onPress={addPlace}
          />
        </View>
      </Sheet>

      <Sheet open={playsOpen} title="What should Start play?" onClose={() => setPlaysOpen(false)}>
        <View style={styles.list}>
          {plan ? (
            <ListRow
              icon={ListMusic}
              title={plan.name}
              meta={describePlan(plan)}
              selected={runsPlan}
              chevron={false}
              onPress={() => {
                usePlanAgain();
                setPlaysOpen(false);
              }}
            />
          ) : null}
          <ListRow
            icon={Music}
            title={sound ? sound.name : 'Pick one sound'}
            meta="One sound, this time only"
            selected={!runsPlan}
            chevron={false}
            onPress={() => {
              setPlaysOpen(false);
              router.navigate('/sounds');
            }}
          />
        </View>
      </Sheet>

      <Sheet open={speakerOpen} title="Where should it play?" onClose={() => setSpeakerOpen(false)}>
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

      <ResultSheet
        open={pending !== undefined && !playing}
        sessionName={pending?.planName ?? pending?.profileName}
        placeName={pending?.placeName}
        onAnswer={answer}
        onClose={() => pending && markAsked(pending.id)}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */

/** One place in the switcher: what it is for, and when it last ran. */
function PlaceRow({
  place,
  selected,
  onPress,
}: {
  place: HomePlace;
  selected: boolean;
  onPress: () => void;
}) {
  const last = useHistory((s) => s.entries.find((e) => e.placeId === place.id));

  const when = last
    ? `Last played ${new Date(last.startedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })}`
    : 'Nothing has played here yet';

  return (
    <ListRow
      title={place.name}
      meta={`${BIRD_TARGET_LABELS[place.target]}. ${when}`}
      selected={selected}
      chevron={false}
      onPress={onPress}
    />
  );
}

/** Pitch and loudness. Kept behind one row so Home stays simple. */
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
  const [rate, setRate] = useState(() => (isSweep ? (sound.params as SweepParams).rateHz : 0.5));

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
    [setParam],
  );

  const changeRate = useCallback(
    (v: number) => {
      setRate(v);
      setParam('rateHz', v);
    },
    [setParam],
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
    <Sheet open={open} title="Pitch and loudness" onClose={onClose}>
      {hasPitch ? (
        <View style={styles.field}>
          <Slider
            label="Pitch"
            min={8000}
            max={25000}
            step={100}
            value={hz}
            readout={formatHz(hz)}
            onChange={changeHz}
            accessibilityHint="Higher pitches are harder for people to hear and harder for speakers to play"
          />
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
  /** the one line the app says back about what somebody reported */
  reported: { ...t.bodySmall, marginBottom: space.sm },
  list: { borderWidth: 1, borderColor: c.border },
  note: { minHeight: 40, justifyContent: 'center', marginTop: space.md },
  noteText: { ...t.bodySmall, color: c.link },
  howLong: { marginTop: space.md, gap: space.sm },
  fieldLabel: { ...t.overline },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  /** the only slack on the screen, and it sits above the one big button */
  spacer: { flex: 1, minHeight: 0 },
  sheetNote: { ...t.bodySmall },
  field: { gap: space.xs },

  placePress: { minHeight: 0 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 },
  placeText: { flex: 1, gap: 1 },
  placeName: { ...t.overline },
  placeMeta: { ...t.bodySmall },
}));
