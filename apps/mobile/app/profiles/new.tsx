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
  SpectrumBars,
  StatusPill,
  Touchable,
  useToast,
} from '../../src/components';
import { getEngine } from '../../src/audio';
import { PLACEHOLDER_NOTICE, SAMPLE_LABEL } from '../../src/audio/samples';
import {
  KIND_LABEL,
  effectiveForOutput,
  formatHz,
  guestsMayHear,
  type AudioProfile,
  type ProfileKind,
  type PulseParams,
  type SampleAsset,
  type SampleParams,
  type SweepParams,
  type ToneParams,
} from '../../src/core/profiles';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useProfiles } from '../../src/state/useProfiles';
import { useSession } from '../../src/state/useSession';
import { color, font, radius, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

const PREVIEW_MS = 5000;

export default function ProfileBuilder() {
  const insets = useSafeAreaInsets();
  const ent = useEntitlement();
  const toast = useToast();
  const save = useProfiles((s) => s.save);
  const setProfile = useSession((s) => s.setProfile);
  const output = useSession((s) => s.output);
  const sessionRunning = useSession((s) => s.engineState) === 'running';

  const [name, setName] = useState('My profile');
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
  const [error, setError] = useState<string | null>(null);
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
    if (sessionRunning) {
      setError('Stop the current run before previewing.');
      return;
    }
    if (previewing) {
      await stopPreview();
      return;
    }
    setError(null);
    const engine = getEngine();
    try {
      engine.setDurationLimitMs(PREVIEW_MS);
      await engine.load(draft);
      await engine.start(output);
      if (engine.getState() !== 'running') {
        setError(engine.getError() ?? 'Preview could not start');
        return;
      }
      setPreviewing(true);
      timer.current = setTimeout(() => {
        setPreviewing(false);
        timer.current = null;
      }, PREVIEW_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview could not start');
    }
  }, [draft, output, previewing, sessionRunning, stopPreview]);

  const onSave = useCallback(async () => {
    if (!ent.guard('profiles.builder')) return;
    await stopPreview();
    const saved = save({
      name: name.trim() || 'My profile',
      description: describeDraft(draft),
      kind,
      params: draft.params,
    });
    setProfile(saved.id);
    toast.show('Profile saved', 'success');
    router.back();
  }, [draft, ent, kind, name, save, setProfile, stopPreview, toast]);

  const reach = effectiveForOutput(draft, output);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.head}>
        <Text style={type.heading}>Build a profile</Text>
        <Touchable
          onPress={() => {
            void stopPreview();
            router.back();
          }}
          accessibilityLabel="Close"
          style={styles.close}
        >
          <X size={20} color={color.fgMuted} strokeWidth={2.2} />
        </Touchable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Banner title="Preview failed" body={error} onRetry={preview} />
        ) : null}

        <Card style={{ gap: space.md }}>
          <SpectrumBars active={previewing} height={92} />
          <View style={styles.pills}>
            <StatusPill
              label={previewing ? 'Previewing' : 'Ready'}
              tone={previewing ? 'running' : 'idle'}
            />
            {guestsMayHear(draft) ? (
              <StatusPill label="Guests may hear" tone="warning" dot={false} />
            ) : null}
            <StatusPill
              label={
                reach === 'full'
                  ? 'Full range here'
                  : reach === 'partial'
                    ? 'Partial range here'
                    : 'Out of range here'
              }
              tone={
                reach === 'full'
                  ? 'running'
                  : reach === 'partial'
                    ? 'warning'
                    : 'danger'
              }
              dot={false}
            />
          </View>
          <Button
            label={previewing ? 'Stop preview' : 'Preview 5 seconds'}
            variant="outline"
            onPress={preview}
            icon={
              previewing ? (
                <Square size={15} color={color.fg} strokeWidth={2.5} />
              ) : (
                <Play size={16} color={color.fg} strokeWidth={2.5} />
              )
            }
          />
        </Card>

        <Field label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="My profile"
            placeholderTextColor={color.fgSubtle}
            style={styles.input}
            accessibilityLabel="Profile name"
          />
        </Field>

        <Field label="Kind">
          <Segmented
            value={kind}
            onChange={setKind}
            accessibilityLabel="Profile kind"
            options={(['tone', 'pulse', 'sweep', 'sample'] as ProfileKind[]).map(
              (k) => ({ value: k, label: KIND_LABEL[k] })
            )}
          />
        </Field>

        <Card style={{ gap: space.md }}>
          {kind === 'tone' || kind === 'pulse' ? (
            <Slider
              label="Frequency"
              min={8000}
              max={25000}
              step={100}
              value={freqHz}
              readout={formatHz(freqHz)}
              onChange={setFreqHz}
            />
          ) : null}

          {kind === 'sweep' ? (
            <>
              <Slider
                label="Sweep from"
                min={8000}
                max={24000}
                step={100}
                value={startHz}
                readout={formatHz(startHz)}
                onChange={setStartHz}
              />
              <Slider
                label="Sweep to"
                min={8000}
                max={25000}
                step={100}
                value={endHz}
                readout={formatHz(endHz)}
                onChange={setEndHz}
              />
              <Slider
                label="Sweep speed"
                min={0.1}
                max={4}
                step={0.1}
                value={rateHz}
                readout={`${rateHz.toFixed(1)} Hz`}
                onChange={setRateHz}
              />
            </>
          ) : null}

          {kind === 'pulse' ? (
            <>
              <Slider
                label="On time"
                min={50}
                max={2000}
                step={10}
                value={onMs}
                readout={`${Math.round(onMs)} ms`}
                onChange={setOnMs}
              />
              <Slider
                label="Off time"
                min={50}
                max={4000}
                step={10}
                value={offMs}
                readout={`${Math.round(offMs)} ms`}
                onChange={setOffMs}
              />
            </>
          ) : null}

          {kind === 'sample' ? (
            <>
              <Field label="Call">
                <Segmented
                  value={asset}
                  onChange={setAsset}
                  accessibilityLabel="Call recording"
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
                {PLACEHOLDER_NOTICE} — licensed recordings replace these before
                launch.
              </Text>
              <Slider
                label="Gap between calls"
                min={2000}
                max={60000}
                step={500}
                value={gapMs}
                readout={`${Math.round(gapMs / 1000)} s`}
                onChange={setGapMs}
              />
            </>
          ) : null}

          {kind !== 'tone' ? (
            <Slider
              label="Randomisation"
              min={0}
              max={100}
              step={5}
              value={randomizePct}
              readout={`${Math.round(randomizePct)}%`}
              onChange={setRandomizePct}
              accessibilityHint="Higher values vary the timing more, so birds cannot get used to the pattern"
            />
          ) : null}
        </Card>

        <Text style={styles.note}>{describeDraft(draft)}</Text>
      </ScrollView>

      <View
        style={[styles.dock, { paddingBottom: insets.bottom + space.md }]}
      >
        <Button label="Save profile" variant="gradient" size="lg" onPress={onSave} />
      </View>
    </View>
  );
}

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

function describeDraft(p: AudioProfile): string {
  switch (p.kind) {
    case 'tone':
      return `Steady ${formatHz((p.params as ToneParams).freqHz)} tone.`;
    case 'pulse': {
      const q = p.params as PulseParams;
      return `${formatHz(q.freqHz)} pulsing ${q.onMs} ms on, ${q.offMs} ms off, ${q.randomizePct}% randomised.`;
    }
    case 'sweep': {
      const q = p.params as SweepParams;
      return `Sweeps ${formatHz(q.startHz)} to ${formatHz(q.endHz)} at ${q.rateHz.toFixed(1)} Hz.`;
    }
    case 'sample': {
      const q = p.params as SampleParams;
      return `${SAMPLE_LABEL[q.asset]} every ${Math.round(q.gapMs / 1000)} s, ${q.randomizePct}% randomised.`;
    }
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  close: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  body: { paddingHorizontal: space.lg, gap: space.md },
  pills: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  fieldLabel: {
    fontFamily: font.body.medium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    paddingHorizontal: space.md,
    color: color.fg,
    fontFamily: font.body.medium,
    fontSize: 16,
  },
  note: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 19,
    color: color.fgMuted,
  },
  dock: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.background,
  },
});
