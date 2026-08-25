import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import {
  SPEAKER_STATUS_LABEL,
  speakerStatus,
  type SpeakerStatus,
} from '../core/speakerStatus';
import {
  SPEAKER_LABEL,
  audibleState,
  formatHz,
  peakFreqHz,
  sourceTag,
  type SweepParams,
} from '../core/profiles';
import { useAccount } from '../state/useAccount';
import { useProfiles } from '../state/useProfiles';
import { formatCountdown, useSession } from '../state/useSession';
import { font, space, themed, useTheme, useThemedStyles } from '../theme';
import { AudibleChip, AudibleSheet } from './AudibleChip';
import { Slider } from './Slider';

/**
 * The live control surface.
 *
 * While a sound is coming out, Home stops being a set of pickers and becomes
 * the thing that is happening: what is playing, where it is playing, what is
 * coming after it and the two knobs worth having a finger on. Nothing here
 * navigates anywhere. Everything reads from the session, so the screen and
 * the sound can never disagree.
 */
export function ActiveSession() {
  const styles = useThemedStyles(sheet);

  const profileId = useSession((s) => s.profileId);
  const output = useSession((s) => s.output);
  const deviceId = useSession((s) => s.deviceId);
  const volume = useSession((s) => s.volume);
  const setVolume = useSession((s) => s.setVolume);
  const setParam = useSession((s) => s.setParam);
  const planName = useSession((s) => s.planName);
  const rotationAt = useSession((s) => s.rotationAt);
  const rotation = useSession((s) => s.rotation);
  const gapUntil = useSession((s) => s.gapUntil);
  const paused = useSession((s) => s.paused);

  const speakers = useAccount((s) => s.devices);
  const sound = useProfiles((s) => s.byId)(profileId);

  const [explaining, setExplaining] = useState<ReturnType<typeof audibleState> | null>(null);

  const status = speakerStatus({ output, deviceId, knownIds: speakers.map((d) => d.id) });
  const heard = sound ? audibleState(sound, output) : null;
  const worthSaying = heard === 'audible' || heard === 'maybe';

  // Both read the rotation, so they are worked out again every time the
  // rotation moves on and never in between.
  const { upNext, comingUp } = useMemo(() => {
    const store = useSession.getState();
    return { upNext: store.upNext(), comingUp: store.comingUp() };
  }, [rotationAt, rotation]);

  return (
    <View style={styles.wrap}>
      <View style={styles.list}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.overline}>{planName ? 'Playing now' : 'Sound'}</Text>
            <Text style={styles.title} numberOfLines={1}>
              {sound?.name ?? 'No sound'}
            </Text>
            {sound ? <Text style={styles.meta}>{sourceTag(sound)}</Text> : null}
          </View>
          {worthSaying && heard ? (
            <AudibleChip state={heard} onPress={setExplaining} />
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.overline}>Plays on</Text>
            <Text style={styles.title} numberOfLines={1}>
              {SPEAKER_LABEL[output]}
            </Text>
            <ConnectionLine status={status} />
          </View>
        </View>

        {upNext ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.overline}>Up next</Text>
                <Text style={styles.title} numberOfLines={1}>
                  {upNext}
                </Text>
                {comingUp.length > 0 ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    Then {comingUp.join(', ')}
                  </Text>
                ) : (
                  <Text style={styles.meta} numberOfLines={1}>
                    {rotation.length} sounds, round and round
                  </Text>
                )}
              </View>
            </View>
          </>
        ) : null}
      </View>

      {gapUntil ? <GapLine until={gapUntil} paused={paused} /> : null}

      <View style={styles.knobs}>
        {sound && sound.kind !== 'sample' ? (
          <PitchKnob
            key={sound.id}
            kind={sound.kind}
            startHz={peakFreqHz(sound)}
            startRate={
              sound.kind === 'sweep' ? (sound.params as SweepParams).rateHz : 0.5
            }
            onChange={setParam}
          />
        ) : null}

        <Slider
          label="Loudness"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          readout={paused ? 'Held' : `${Math.round(volume * 100)}%`}
          onChange={setVolume}
        />
      </View>

      <AudibleSheet state={explaining} onClose={() => setExplaining(null)} />
    </View>
  );
}

/* ------------------------------------------------------------------ */

/** "Connected", "Offline", "This phone", or nothing the app can vouch for. */
function ConnectionLine({ status }: { status: SpeakerStatus | null }) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  if (!status) {
    return <Text style={styles.meta}>Whichever speaker your phone is paired with</Text>;
  }

  // The row above already says "This phone". Saying it twice is not a status.
  if (status === 'this_phone') return null;

  return (
    <View style={styles.connection}>
      <View
        style={[
          styles.mark,
          { backgroundColor: status === 'offline' ? c.warning : c.success },
        ]}
      />
      <Text style={styles.meta}>{SPEAKER_STATUS_LABEL[status]}</Text>
    </View>
  );
}

/** "Next sound in 0:20", counting down through the silence. */
function GapLine({ until, paused }: { until: number; paused: boolean }) {
  const styles = useThemedStyles(sheet);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused) return;
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(tick);
  }, [paused]);

  const left = Math.max(0, until - now);
  return <Text style={styles.gap}>Next sound in {formatCountdown(left)}</Text>;
}

/**
 * The one thing about a generated sound worth reaching for mid session.
 *
 * A recording has no pitch to move, so this never appears over one. A sweep
 * has two ends rather than a pitch, so it offers the speed instead.
 */
function PitchKnob({
  kind,
  startHz,
  startRate,
  onChange,
}: {
  kind: string;
  startHz: number;
  startRate: number;
  onChange: (key: string, value: number) => void;
}) {
  const [hz, setHz] = useState(startHz);
  const [rate, setRate] = useState(startRate);

  const changeHz = useCallback(
    (v: number) => {
      setHz(v);
      onChange('freqHz', v);
    },
    [onChange],
  );

  const changeRate = useCallback(
    (v: number) => {
      setRate(v);
      onChange('rateHz', v);
    },
    [onChange],
  );

  if (kind === 'sweep') {
    return (
      <Slider
        label="How fast it rises and falls"
        min={0.1}
        max={4}
        step={0.1}
        value={rate}
        readout={rate < 1 ? 'Slow' : rate < 2.5 ? 'Medium' : 'Fast'}
        onChange={changeRate}
      />
    );
  }

  return (
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
  );
}

const sheet = themed((c, t) => ({
  wrap: { gap: space.md },
  list: { borderWidth: 1, borderColor: c.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    minHeight: 56,
  },
  rowText: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: c.border },
  overline: { ...t.overline },
  title: { ...t.subheading },
  meta: { ...t.bodySmall },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mark: { width: 6, height: 6 },
  gap: {
    fontFamily: font.mono.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: c.text,
  },
  knobs: { gap: space.md },
}));

export default ActiveSession;
