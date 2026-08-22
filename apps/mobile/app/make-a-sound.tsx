import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Play, Square, X } from 'lucide-react-native';

import {
  Banner,
  Button,
  Card,
  Segmented,
  Slider,
  SpeakerReach,
  SpectrumBars,
  StatusPill,
  Touchable,
  useToast,
} from '../src/components';
import { getEngine } from '../src/audio';
import { PLACEHOLDER_NOTICE, SAMPLE_LABEL } from '../src/audio/samples';
import {
  AUDIBLE_TAG,
  KIND_LABEL,
  formatHz,
  guestsMayHear,
  pitchWord,
  type AudioProfile,
  type ProfileKind,
  type PulseParams,
  type SampleAsset,
  type SampleParams,
  type SweepParams,
  type ToneParams,
} from '../src/core/profiles';
import { useEntitlement } from '../src/hooks/useEntitlement';
import { useProfiles } from '../src/state/useProfiles';
import { useSession } from '../src/state/useSession';
import { color, font, space } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

const PREVIEW_MS = 5000;

export default function MakeASound() {
  const insets = useSafeAreaInsets();
  const ent = useEntitlement();
  const toast = useToast();
  const save = useProfiles((s) => s.save);
  const setProfile = useSession((s) => s.setProfile);
  const output = useSession((s) => s.output);
  const somethingPlaying = useSession((s) => s.engineState) === 'running';

  const [name, setName] = useState('My sound');
  const [kind, setKind] = useState<ProfileKind>('pulse');
  const [freqHz, setFreqHz] = useState(17500);
  const [startHz, setStartHz] = useState(15000);
  const [endHz, setEndHz] = useState(19000);
  const [rateHz, setRateHz] = useState(0.5);
  const [onMs, setOnMs] = useState(400);
  const [offMs, setOffMs] = useState(700);
  const [randomizePct, setRandomizePct] = useState(35);
  const [gapMs, setGapMs] = useState(8000);
  const [asset, setAsset] = useState<SampleAsset>('distress_pigeon');
  const [previewing, setPreviewing] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draft = buildDraft({
    name,
    kind,
    freqHz,
    startHz,
    endHz,
    rateHz,
    onMs,
    offMs,
    randomizePct,
    gapMs,
    asset,
  });

  const stopPreview = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPreviewing(false);
    await getEngine().stop();
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const preview = useCallback(async () => {
    if (somethingPlaying) {
      toast.show('Stop the sound on Home first.', 'danger');
      return;
    }
    if (previewing) {
      await stopPreview();
      return;
    }
    setFailed(false);
    const engine = getEngine();
    try {
      engine.setDurationLimitMs(PREVIEW_MS);
      await engine.load(draft);
      await engine.start(output);
      if (engine.getState() !== 'running') {
        setFailed(true);
        return;
      }
      setPreviewing(true);
      timer.current = setTimeout(() => {
        setPreviewing(false);
        timer.current = null;
      }, PREVIEW_MS);
    } catch {
      setFailed(true);
    }
  }, [draft, output, previewing, somethingPlaying, stopPreview, toast]);

  const onSave = useCallback(async () => {
    if (!ent.guard('profiles.builder')) return;
    await stopPreview();
    const saved = save({
      name: name.trim() || 'My sound',
      description: describeDraft(draft),
      kind,
      params: draft.params,
    });
    setProfile(saved.id);
    toast.show('Saved. It is ready on Home.', 'success');
    router.back();
  }, [draft, ent, kind, name, save, setProfile, stopPreview, toast]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.head}>
        <Text style={type.heading}>Make your own</Text>
        <Touchable
          onPress={() => {
            void stopPreview();
            router.back();
          }}
          accessibilityLabel="Close"
          style={styles.close}
        >
          <X size={20} color={color.ink} strokeWidth={1.75} />
        </Touchable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: space.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {failed ? (
          <Banner
            title="Nothing played"
            body="That didn't work. Try again."
            onRetry={preview}
          />
        ) : null}

        <Card style={styles.previewCard}>
          <SpectrumBars active={previewing} height={92} />
          <View style={styles.tags}>
            <StatusPill
              label={previewing ? 'Playing' : 'Ready'}
              tone={previewing ? 'running' : 'idle'}
            />
            {guestsMayHear(draft) ? (
              <StatusPill label={AUDIBLE_TAG} tone="warning" />
            ) : null}
          </View>
          <Button
            label={previewing ? 'Stop' : 'Hear 5 seconds'}
            variant="secondary"
            onPress={preview}
            icon={
              previewing ? (
                <Square size={16} color={color.ink} strokeWidth={1.75} />
              ) : (
                <Play size={16} color={color.ink} strokeWidth={1.75} />
              )
            }
          />
        </Card>

        <Field label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="My sound"
            placeholderTextColor={color.fgSubtle}
            style={styles.input}
            accessibilityLabel="Name your sound"
          />
        </Field>

        <Field label="What kind of sound">
          <Segmented
            value={kind}
            onChange={setKind}
            accessibilityLabel="What kind of sound"
            options={(['tone', 'pulse', 'sweep', 'sample'] as ProfileKind[]).map(
              (k) => ({ value: k, label: SHORT_KIND[k] })
            )}
          />
          <Text style={styles.note}>{KIND_HINT[kind]}</Text>
        </Field>

        <Card style={styles.previewCard}>
          {kind === 'tone' || kind === 'pulse' ? (
            <View style={styles.field}>
              <Slider
                label="Pitch"
                min={8000}
                max={25000}
                step={100}
                value={freqHz}
                readout={pitchWord(freqHz)}
                onChange={setFreqHz}
                accessibilityHint="Higher pitches are harder for people to hear and harder for speakers to play"
              />
              <Text style={styles.mono}>{formatHz(freqHz)}</Text>
            </View>
          ) : null}

          {kind === 'sweep' ? (
            <>
              <View style={styles.field}>
                <Slider
                  label="Starts at"
                  min={8000}
                  max={24000}
                  step={100}
                  value={startHz}
                  readout={pitchWord(startHz)}
                  onChange={setStartHz}
                />
                <Text style={styles.mono}>{formatHz(startHz)}</Text>
              </View>
              <View style={styles.field}>
                <Slider
                  label="Ends at"
                  min={8000}
                  max={25000}
                  step={100}
                  value={endHz}
                  readout={pitchWord(endHz)}
                  onChange={setEndHz}
                />
                <Text style={styles.mono}>{formatHz(endHz)}</Text>
              </View>
              <Slider
                label="How fast it rises and falls"
                min={0.1}
                max={4}
                step={0.1}
                value={rateHz}
                readout={rateHz < 1 ? 'Slow' : rateHz < 2.5 ? 'Medium' : 'Fast'}
                onChange={setRateHz}
              />
            </>
          ) : null}

          {kind === 'pulse' ? (
            <>
              <Slider
                label="How long each beep lasts"
                min={50}
                max={2000}
                step={10}
                value={onMs}
                readout={`${(onMs / 1000).toFixed(1)} sec`}
                onChange={setOnMs}
              />
              <Slider
                label="Quiet gap between beeps"
                min={50}
                max={4000}
                step={10}
                value={offMs}
                readout={`${(offMs / 1000).toFixed(1)} sec`}
                onChange={setOffMs}
              />
            </>
          ) : null}

          {kind === 'sample' ? (
            <>
              <Field label="Which call">
                <Segmented
                  value={asset}
                  onChange={setAsset}
                  accessibilityLabel="Which call"
                  options={(
                    [
                      'distress_pigeon',
                      'predator_hawk',
                      'predator_falcon',
                    ] as SampleAsset[]
                  ).map((a) => ({
                    value: a,
                    label: SAMPLE_LABEL[a].replace(' call', ''),
                  }))}
                />
              </Field>
              <Text style={styles.note}>
                {PLACEHOLDER_NOTICE}. Real recordings replace it before launch.
              </Text>
              <Slider
                label="Quiet gap between calls"
                min={2000}
                max={60000}
                step={500}
                value={gapMs}
                readout={`${Math.round(gapMs / 1000)} sec`}
                onChange={setGapMs}
              />
            </>
          ) : null}

          {kind !== 'tone' ? (
            <Slider
              label="Mix up the timing"
              min={0}
              max={100}
              step={5}
              value={randomizePct}
              readout={`${Math.round(randomizePct)}%`}
              onChange={setRandomizePct}
              accessibilityHint="Turn this up so birds cannot learn the pattern"
            />
          ) : null}

          <SpeakerReach profile={draft} output={output} />
        </Card>

        <Text style={styles.note}>{describeDraft(draft)}</Text>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + space.md }]}>
        <Button label="Save this sound" size="lg" onPress={onSave} />
      </View>
    </View>
  );
}

/** Short names for the four kinds, so all four fit on one row. */
const SHORT_KIND: Record<ProfileKind, string> = {
  tone: 'Steady',
  pulse: 'Beeping',
  sweep: 'Up and down',
  sample: 'Bird call',
};

const KIND_HINT: Record<ProfileKind, string> = {
  tone: 'One pitch that never changes.',
  pulse: 'One pitch that beeps on and off.',
  sweep: 'A pitch that slides up and down.',
  sample: 'A real bird call, played again and again.',
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function buildDraft(v: {
  name: string;
  kind: ProfileKind;
  freqHz: number;
  startHz: number;
  endHz: number;
  rateHz: number;
  onMs: number;
  offMs: number;
  randomizePct: number;
  gapMs: number;
  asset: SampleAsset;
}): AudioProfile {
  const params =
    v.kind === 'tone'
      ? ({ freqHz: v.freqHz } satisfies ToneParams)
      : v.kind === 'sweep'
        ? ({
            startHz: v.startHz,
            endHz: v.endHz,
            rateHz: v.rateHz,
          } satisfies SweepParams)
        : v.kind === 'pulse'
          ? ({
              freqHz: v.freqHz,
              onMs: v.onMs,
              offMs: v.offMs,
              randomizePct: v.randomizePct,
            } satisfies PulseParams)
          : ({
              asset: v.asset,
              gapMs: v.gapMs,
              randomizePct: v.randomizePct,
            } satisfies SampleParams);

  return {
    id: 'draft',
    name: v.name,
    description: '',
    kind: v.kind,
    params,
    minPlan: 'pro',
    isSystem: false,
  };
}

/** One plain line describing the sound, saved with it and shown in the list. */
function describeDraft(p: AudioProfile): string {
  switch (p.kind) {
    case 'tone': {
      const q = p.params as ToneParams;
      return `${KIND_LABEL.tone}. ${pitchWord(q.freqHz)} pitch.`;
    }
    case 'pulse': {
      const q = p.params as PulseParams;
      return `Beeps for ${(q.onMs / 1000).toFixed(1)} sec, then rests for ${(
        q.offMs / 1000
      ).toFixed(1)} sec. ${pitchWord(q.freqHz)} pitch.`;
    }
    case 'sweep': {
      const q = p.params as SweepParams;
      return `Slides from ${pitchWord(q.startHz).toLowerCase()} to ${pitchWord(
        q.endHz
      ).toLowerCase()} pitch, again and again.`;
    }
    case 'sample': {
      const q = p.params as SampleParams;
      return `${SAMPLE_LABEL[q.asset]} every ${Math.round(q.gapMs / 1000)} sec.`;
    }
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: space.md, gap: space.md },
  previewCard: { gap: space.md },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  field: { gap: space.xs },
  fieldLabel: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
    paddingHorizontal: space.sm + 4,
    color: color.ink,
    fontFamily: font.body.medium,
    fontSize: 16,
  },
  note: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.fgMuted,
  },
  mono: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: color.fgSubtle,
  },
  dock: {
    paddingHorizontal: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.background,
  },
});
