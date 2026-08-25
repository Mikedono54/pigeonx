import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Building,
  ChevronLeft,
  Fence,
  Home,
  Layers,
  Anchor,
  Store,
  Sprout,
  Tractor,
  Warehouse,
} from 'lucide-react-native';

import {
  AudibleChip,
  BlockButton,
  Button,
  Dock,
  dockClearance,
  ListRow,
  StatusPill,
  TargetGlyph,
  TextField,
  Touchable,
  useToast,
} from '../src/components';
import type { IconType } from '../src/components/icon';
import {
  AREA_SIZE_HINT,
  AREA_SIZE_LABELS,
  AREA_SIZES,
  BIRD_TARGETS,
  BIRD_TARGET_LABELS,
  PLACE_KINDS,
  PLACE_KIND_DEFAULT_NAME,
  PLACE_KIND_LABELS,
  type AreaSize,
  type BirdTarget,
  type PlaceKind,
} from '../src/core/personalization';
import {
  SPEAKER_HINT,
  SPEAKER_LABEL,
  audibleState,
  findSystemProfile,
  pitchLabel,
  type OutputKind,
} from '../src/core/profiles';
import { recommendPlan } from '../src/core/protectionPlans';
import { useAccount } from '../src/state/useAccount';
import { usePlacesHome, type HomePlace } from '../src/state/usePlacesHome';
import { useProtectionPlans } from '../src/state/useProtectionPlans';
import { useSession } from '../src/state/useSession';
import { icon, space, themed, useTheme, useThemedStyles } from '../src/theme';

/**
 * Eight questions and an offer.
 *
 * One question a screen, every one of them skippable, and every skip lands on
 * an answer the app can actually work with rather than a hole. Somebody who
 * taps Skip eight times ends up with a place called My space, a starter
 * rotation and a working Start button, which is the same thing they had
 * before this screen existed.
 *
 * The same flow adds a place later and edits one, because a place is only ever
 * these eight answers.
 */

const KIND_ICON: Record<PlaceKind, IconType> = {
  balcony: Home,
  roof: Layers,
  dock: Anchor,
  storefront: Store,
  warehouse: Warehouse,
  parking: Building,
  garden: Sprout,
  farm: Tractor,
  custom: Fence,
};

/** The three speakers a person can pick before our own hardware exists. */
const OUTPUTS: OutputKind[] = ['phone', 'bt_speaker', 'pigeonx_emitter'];

type Step = 'target' | 'kind' | 'size' | 'people' | 'quiet' | 'output' | 'when' | 'name' | 'plan';

interface Answers {
  target: BirdTarget;
  kind: PlaceKind;
  areaSize: AreaSize | null;
  peopleNearby: boolean;
  limitAudible: boolean;
  output: OutputKind;
  birdsActive: string;
  name: string;
  /** false while the name is still whatever the kind called it */
  named: boolean;
}

export default function PlaceSetup() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ placeId?: string }>();

  const editing = usePlacesHome((s) => (params.placeId ? s.byId(params.placeId) : undefined));
  const add = usePlacesHome((s) => s.add);
  const update = usePlacesHome((s) => s.update);
  const setActivePlace = usePlacesHome((s) => s.setActive);
  const adopt = useProtectionPlans((s) => s.adoptRecommendation);
  const sessionOutput = useSession((s) => s.output);
  const setOutput = useSession((s) => s.setOutput);
  const markPlaceAsked = useAccount((s) => s.markPlaceAsked);

  const [answers, setAnswers] = useState<Answers>(() => ({
    target: editing?.target ?? 'unsure',
    kind: editing?.kind ?? 'custom',
    areaSize: editing?.areaSize ?? null,
    peopleNearby: editing?.peopleNearby ?? true,
    limitAudible: editing?.limitAudible ?? false,
    output: sessionOutput === 'simulated' ? 'phone' : sessionOutput,
    birdsActive: editing?.birdsActive ?? '',
    name: editing?.name ?? PLACE_KIND_DEFAULT_NAME.custom,
    named: editing !== undefined,
  }));

  // The quiet question only makes sense while somebody is standing there.
  const steps = useMemo<Step[]>(
    () =>
      (
        [
          'target',
          'kind',
          'size',
          'people',
          answers.peopleNearby ? 'quiet' : null,
          'output',
          'when',
          'name',
          'plan',
        ] as (Step | null)[]
      ).filter((s): s is Step => s !== null),
    [answers.peopleNearby],
  );

  const [at, setAt] = useState(0);
  const step = steps[Math.min(at, steps.length - 1)];

  const set = useCallback((patch: Partial<Answers>) => {
    setAnswers((a) => {
      const next = { ...a, ...patch };
      // The name follows what the place is, right up until somebody types one.
      if (patch.kind && !next.named) next.name = PLACE_KIND_DEFAULT_NAME[patch.kind];
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    if (at > 0) {
      setAt((n) => n - 1);
      return;
    }
    // Backing out of the first question is an answer too: we asked, and this
    // person would rather get on with it. The default place is already there.
    markPlaceAsked();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [at, markPlaceAsked]);

  const goOn = useCallback(() => {
    setAt((n) => Math.min(n + 1, steps.length - 1));
  }, [steps.length]);

  /** What the place is, once the questions are done. Not saved yet. */
  const draft = useMemo(
    () => ({
      name: answers.name,
      kind: answers.kind,
      target: answers.target,
      areaSize: answers.areaSize,
      peopleNearby: answers.peopleNearby,
      limitAudible: answers.peopleNearby ? answers.limitAudible : false,
      birdsActive: answers.birdsActive,
    }),
    [answers],
  );

  const offer = useMemo(
    () => recommendPlan(draft.target, draft.limitAudible, answers.output),
    [answers.output, draft.limitAudible, draft.target],
  );

  const save = useCallback((): HomePlace => {
    if (editing) {
      update(editing.id, draft);
      setActivePlace(editing.id);
      return { ...editing, ...draft, birdsActive: draft.birdsActive || null };
    }
    return add(draft);
  }, [add, draft, editing, setActivePlace, update]);

  const finish = useCallback(
    (withPlan: boolean) => {
      const place = save();
      setOutput(answers.output);
      if (withPlan) {
        adopt(place, answers.output);
        toast.show(`${offer.name} is looking after ${place.name}.`);
      } else {
        toast.show(`${place.name} is ready.`);
      }
      markPlaceAsked();
      if (!withPlan) {
        router.replace('/sounds');
        return;
      }
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
    [adopt, answers.output, markPlaceAsked, offer.name, save, setOutput, toast],
  );

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}>
        <Touchable onPress={goBack} accessibilityLabel="Go back" style={styles.back}>
          <ChevronLeft size={icon.lg} color={c.ink} strokeWidth={icon.stroke} />
        </Touchable>
        <View style={styles.dots}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.dot, i <= at ? styles.dotDone : null]} />
          ))}
        </View>
        {step === 'plan' ? (
          <View style={styles.back} />
        ) : (
          <Touchable onPress={goOn} accessibilityLabel="Skip this question" style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </Touchable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: dockClearance(insets.bottom) }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'target' ? (
          <Question title="Which birds are causing the problem?" hint="Pick the closest one.">
            <View style={styles.tiles}>
              {BIRD_TARGETS.map((t) => (
                <Tile
                  key={t}
                  label={BIRD_TARGET_LABELS[t]}
                  selected={answers.target === t}
                  onPress={() => set({ target: t })}
                >
                  <TargetGlyph target={t} size={30} />
                </Tile>
              ))}
            </View>
          </Question>
        ) : null}

        {step === 'kind' ? (
          <Question title="What are you protecting?">
            <View style={styles.tiles}>
              {PLACE_KINDS.map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <Tile
                    key={k}
                    label={PLACE_KIND_LABELS[k]}
                    selected={answers.kind === k}
                    onPress={() => set({ kind: k })}
                  >
                    <Icon
                      size={icon.lg}
                      color={answers.kind === k ? c.accent : c.ink}
                      strokeWidth={icon.stroke}
                    />
                  </Tile>
                );
              })}
            </View>
          </Question>
        ) : null}

        {step === 'size' ? (
          <Question title="How big is it?">
            <View style={styles.rows}>
              {AREA_SIZES.map((s) => (
                <ListRow
                  key={s}
                  title={AREA_SIZE_LABELS[s]}
                  meta={AREA_SIZE_HINT[s]}
                  selected={answers.areaSize === s}
                  chevron={false}
                  onPress={() => set({ areaSize: s })}
                />
              ))}
            </View>
          </Question>
        ) : null}

        {step === 'people' ? (
          <Question
            title="Are people usually nearby?"
            hint="Neighbours, guests, staff, anyone within earshot."
          >
            <YesNo
              value={answers.peopleNearby}
              onChange={(v) => set({ peopleNearby: v })}
              yes="Yes, people are around"
              no="No, it is out of the way"
            />
          </Question>
        ) : null}

        {step === 'quiet' ? (
          <Question
            title="Should the sounds stay quiet for people?"
            hint="Bird calls and hawk calls are audible. Quiet plans leave them out."
          >
            <YesNo
              value={answers.limitAudible}
              onChange={(v) => set({ limitAudible: v })}
              yes="Yes, keep it quiet"
              no="No, audible sounds are fine"
            />
          </Question>
        ) : null}

        {step === 'output' ? (
          <Question title="Where will it play?">
            <View style={styles.rows}>
              {OUTPUTS.map((o) => (
                <ListRow
                  key={o}
                  title={SPEAKER_LABEL[o]}
                  meta={o === 'pigeonx_emitter' ? 'Not out yet' : SPEAKER_HINT[o]}
                  selected={answers.output === o}
                  chevron={false}
                  onPress={() => set({ output: o })}
                />
              ))}
            </View>
          </Question>
        ) : null}

        {step === 'when' ? (
          <Question title="When do the birds show up?" hint="In your own words. You can leave it blank.">
            <TextField
              label="When"
              value={answers.birdsActive}
              onChangeText={(birdsActive) => set({ birdsActive })}
              placeholder="Early morning"
              maxLength={120}
              returnKeyType="done"
            />
          </Question>
        ) : null}

        {step === 'name' ? (
          <Question title="What should we call it?">
            <TextField
              label="Name"
              value={answers.name}
              onChangeText={(name) => set({ name, named: true })}
              placeholder={PLACE_KIND_DEFAULT_NAME[answers.kind]}
              maxLength={40}
              returnKeyType="done"
            />
          </Question>
        ) : null}

        {step === 'plan' ? (
          <Question
            title="Here is your starting plan"
            hint="A starting point, not a promise. Adjust anytime."
          >
            <PlanOffer
              name={offer.name}
              soundIds={offer.soundIds}
              minutes={offer.sessionMinutes}
              output={answers.output}
              place={answers.name}
            />
          </Question>
        ) : null}
      </ScrollView>

      <Dock>
        {step === 'plan' ? (
          <View style={styles.finish}>
            <BlockButton label="Use this plan" onPress={() => finish(true)} />
            <Button label="Pick sounds myself" variant="ghost" onPress={() => finish(false)} />
          </View>
        ) : (
          <BlockButton label="Next" onPress={goOn} />
        )}
      </Dock>
    </View>
  );
}

/* ------------------------------------------------------------------ */

function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(sheet);
  return (
    <View style={styles.question}>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.answers}>{children}</View>
    </View>
  );
}

/** One square in the grid: a drawing, a word, and an accent edge when picked. */
function Tile({
  label,
  selected,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(sheet);
  return (
    <Touchable
      onPress={onPress}
      haptic="selection"
      feel="fade"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={styles.tilePress}
    >
      <View style={[styles.tile, selected ? styles.tileOn : null]}>
        <View style={styles.tileArt}>{children}</View>
        <Text style={[styles.tileLabel, selected ? styles.tileLabelOn : null]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Touchable>
  );
}

function YesNo({
  value,
  onChange,
  yes,
  no,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  yes: string;
  no: string;
}) {
  const styles = useThemedStyles(sheet);
  return (
    <View style={styles.rows}>
      <ListRow title={yes} selected={value} chevron={false} onPress={() => onChange(true)} />
      <ListRow title={no} selected={!value} chevron={false} onPress={() => onChange(false)} />
    </View>
  );
}

/**
 * The offer, as the card it will become.
 *
 * Every sound in the rotation is named and tagged, so nobody agrees to a plan
 * without knowing whether the people downstairs are about to hear a hawk.
 */
export function PlanOffer({
  name,
  soundIds,
  minutes,
  output,
  place,
}: {
  name: string;
  soundIds: string[];
  minutes: number;
  output: OutputKind;
  place?: string;
}) {
  const styles = useThemedStyles(sheet);
  const sounds = soundIds.map((id) => findSystemProfile(id)).filter((p) => p !== undefined);

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardName}>{name}</Text>
        {place ? <Text style={styles.cardFor}>{place}</Text> : null}
      </View>

      <View style={styles.rotation}>
        {sounds.map((s) => (
          <View key={s.id} style={styles.rotationRow}>
            <View style={styles.rotationMark} />
            <View style={styles.rotationText}>
              <Text style={styles.rotationName} numberOfLines={1}>
                {s.name}
              </Text>
              <View style={styles.rotationTags}>
                <StatusPill label={pitchLabel(s)} caps={false} />
                <AudibleChip state={audibleState(s, output)} />
              </View>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.cardFoot}>
        {sounds.length} sounds in rotation. {minutes} minute sessions on {SPEAKER_LABEL[output]}.
      </Text>
    </View>
  );
}

const sheet = themed((c, t) => ({
  root: { flex: 1, backgroundColor: c.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  skip: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  skipText: { ...t.bodyStrong, fontSize: 15, color: c.link },
  dots: { flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center' },
  dot: { flex: 1, maxWidth: 28, height: 3, backgroundColor: c.border },
  dotDone: { backgroundColor: c.accent },

  scroll: { flex: 1 },
  body: { paddingHorizontal: space.md, paddingTop: space.sm },
  question: { gap: space.sm },
  title: { ...t.title },
  hint: { ...t.bodySmall },
  answers: { marginTop: space.md },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tilePress: { minHeight: 0, flexGrow: 1, flexBasis: '30%' },
  tile: {
    minHeight: 104,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: space.sm,
    gap: space.xs,
    justifyContent: 'space-between',
  },
  tileOn: { borderColor: c.accent, backgroundColor: c.surface },
  tileArt: { flex: 1, justifyContent: 'center' },
  tileLabel: { ...t.label, fontSize: 14, color: c.text },
  tileLabelOn: { color: c.ink },

  rows: { borderWidth: 1, borderColor: c.border },

  card: {
    borderWidth: 1,
    borderColor: c.ink,
    backgroundColor: c.card,
    padding: space.md,
    gap: space.md,
  },
  cardHead: { gap: 2 },
  cardName: { ...t.heading },
  cardFor: { ...t.overline },
  rotation: { gap: space.sm },
  rotationRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  rotationMark: { width: 10, height: 3, marginTop: 10, backgroundColor: c.accent },
  rotationText: { flex: 1, gap: 4 },
  rotationName: { ...t.subheading },
  rotationTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cardFoot: { ...t.bodySmall, borderTopWidth: 1, borderTopColor: c.border, paddingTop: space.sm },

  finish: { gap: space.sm },
}));
