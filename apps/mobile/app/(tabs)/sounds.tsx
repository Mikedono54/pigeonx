import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Music4, Plus, Trash2 } from 'lucide-react-native';

import {
  AudibleChip,
  AudibleSheet,
  Button,
  CreditsSheet,
  dockClearance,
  ListRow,
  LockBadge,
  Pigeon,
  Screen,
  SectionHeader,
  StatusPill,
  Touchable,
  useToast,
} from '../../src/components';
import {
  AUDIBLE_BAND_TOP_HZ,
  AUDIBLE_LABEL,
  SYSTEM_PROFILES,
  audibleState,
  findSystemProfile,
  peakFreqHz,
  pitchLabel,
  sourceTag,
  type AudibleState,
  type AudioProfile,
  type OutputKind,
} from '../../src/core/profiles';
import { recommendPlan } from '../../src/core/protectionPlans';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { usePlacesHome } from '../../src/state/usePlacesHome';
import { useProfiles } from '../../src/state/useProfiles';
import { useSession } from '../../src/state/useSession';

/**
 * The catalogue, in the three groups a person actually sorts it into: is it a
 * real bird, is it made by the app, and can anything I own even play it.
 *
 * A sound is in exactly one group. The 22 kHz tone leads with the fact that it
 * needs hardware, because that matters more than how it was made.
 */
const RECORDINGS = SYSTEM_PROFILES.filter((p) => p.kind === 'sample');
const SPEAKER_ONLY = SYSTEM_PROFILES.filter(
  (p) => p.kind !== 'sample' && peakFreqHz(p) > AUDIBLE_BAND_TOP_HZ,
);
const GENERATED = SYSTEM_PROFILES.filter(
  (p) => p.kind !== 'sample' && peakFreqHz(p) <= AUDIBLE_BAND_TOP_HZ,
);
import { icon, space, themed, useTheme, useThemedStyles } from '../../src/theme';

export default function SoundsScreen() {
  const styles = useThemedStyles(sheet);
  const insets = useSafeAreaInsets();
  const ent = useEntitlement();
  const [audible, setAudible] = useState<AudibleState | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const toast = useToast();
  const saved = useProfiles((s) => s.saved);
  const remove = useProfiles((s) => s.remove);
  const setProfile = useSession((s) => s.setProfile);
  const activeId = useSession((s) => s.profileId);
  // Whether a sound can be heard depends on what is playing it, so the rows
  // answer for the speaker this person actually picked.
  const output = useSession((s) => s.output);
  const place = usePlacesHome((s) => s.active());

  /**
   * What this place would be offered if it were being set up today.
   *
   * Not a claim that these work better. It is the same opening offer the
   * questions make, kept in front of somebody who skipped them or has changed
   * their mind about who is nearby.
   */
  const recommended = useMemo(() => {
    if (!place) return [];
    return recommendPlan(place.target, place.limitAudible, output)
      .soundIds.map((id) => findSystemProfile(id))
      .filter((p) => p !== undefined);
  }, [output, place]);

  const savedLimit = ent.limit('savedProfiles');

  const makeYourOwn = useCallback(() => {
    if (!ent.guard('profiles.builder')) return;
    if (savedLimit != null && saved.length >= savedLimit) {
      ent.guard('profiles.saved.unlimited');
      return;
    }
    router.push('/make-a-sound');
  }, [ent, saved.length, savedLimit]);

  const pick = useCallback(
    (p: AudioProfile) => {
      if (p.minPlan !== 'free' && !ent.guard('profiles.all')) return;
      setProfile(p.id);
      toast.show(`${p.name} is ready.`);
      router.navigate('/');
    },
    [ent, setProfile, toast]
  );

  return (
    <Screen
      title="Sounds"
      scroll={false}
      dock={
        <Button
          label="Make your own"
          variant="secondary"
          size="lg"
          onPress={makeYourOwn}
          icon={Plus}
          accessibilityHint="Pro plan"
        />
      }
    >
      <ScrollView
        // without this the list lays out at its full height inside a screen
        // that does not scroll, and everything past the fold is unreachable
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        // the dock is pinned, so the last sound needs its height under it
        contentContainerStyle={{ paddingBottom: dockClearance(insets.bottom) }}
      >
        {recommended.length > 0 && place ? (
          <View style={styles.first}>
            <SectionHeader title={`Recommended for ${place.name}`} />
            <View style={styles.list}>
              {recommended.map((p) => (
                <SoundRow
                  key={p.id}
                  sound={p}
                  output={output}
                  active={p.id === activeId}
                  locked={p.minPlan !== 'free' && !ent.can('profiles.all')}
                  onPress={() => pick(p)}
                  onAudible={setAudible}
                />
              ))}
            </View>
          </View>
        ) : null}

        {(
          [
            ['Natural recordings', RECORDINGS],
            ['Generated tones', GENERATED],
            ['Needs a PigeonX speaker', SPEAKER_ONLY],
          ] as const
        ).map(([title, group], i) => (
          <View key={title} style={i === 0 && recommended.length === 0 ? styles.first : styles.section}>
            <SectionHeader title={title} />
            <View style={styles.list}>
              {group.map((p) => (
                <SoundRow
                  key={p.id}
                  sound={p}
                  output={output}
                  active={p.id === activeId}
                  locked={p.minPlan !== 'free' && !ent.can('profiles.all')}
                  onPress={() => pick(p)}
                  onAudible={setAudible}
                />
              ))}
            </View>
          </View>
        ))}

        {saved.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Your own" />
            <View style={styles.list}>
              {saved.map((p) => (
                <SoundRow
                  key={p.id}
                  sound={p}
                  output={output}
                  active={p.id === activeId}
                  onPress={() => pick(p)}
                  onAudible={setAudible}
                  onDelete={() => {
                    remove(p.id);
                    toast.show('Sound deleted.');
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* the recordings are somebody's work, and the credit sits with them */}
        <View style={styles.credits}>
          <ListRow
            icon={Music4}
            title="Credits"
            meta="Who recorded the bird calls"
            onPress={() => setCreditsOpen(true)}
          />
        </View>
      </ScrollView>

      <AudibleSheet state={audible} onClose={() => setAudible(null)} />
      <CreditsSheet open={creditsOpen} onClose={() => setCreditsOpen(false)} />
    </Screen>
  );
}

/**
 * One sound.
 *
 * The bird on the left says what the sound is like without a word: it leans
 * away from the pitches nothing can play, and opens its beak for a call.
 *
 * Three tags under the name, in the order a person asks the questions: what
 * pitch is it, where did it come from, and will anybody hear it.
 */
function SoundRow({
  sound,
  output,
  active,
  locked = false,
  onPress,
  onDelete,
  onAudible,
}: {
  sound: AudioProfile;
  /** what will play it, which decides whether 22 kHz comes out at all */
  output: OutputKind;
  active: boolean;
  locked?: boolean;
  onPress: () => void;
  onDelete?: () => void;
  /** opens the one panel on this screen that says who can hear a sound */
  onAudible?: (state: AudibleState) => void;
}) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const pitch = pitchLabel(sound);
  const source = sourceTag(sound);
  const heard = audibleState(sound, output);

  const pose =
    sound.kind === 'sample' ? 'call' : heard === 'speaker_only' ? 'lean' : 'sit';

  return (
    <Touchable
      onPress={onPress}
      feel="offset"
      accessibilityLabel={`${sound.name}. ${sound.description}. ${source}, ${pitch}. ${
        AUDIBLE_LABEL[heard]
      }.${locked ? ' Needs Pro.' : ''}`}
      accessibilityState={{ selected: active }}
      style={styles.press}
    >
      <View style={[styles.row, active ? styles.rowActive : null]}>
        <View style={styles.bird}>
          <Pigeon
            size={30}
            pose={pose}
            color={active ? c.accent : c.ink}
            holeColor={active ? c.surface : c.card}
          />
        </View>
        <View style={styles.rowText}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>
              {sound.name}
            </Text>
            {locked ? <LockBadge plan={sound.minPlan} /> : null}
          </View>
          <Text style={styles.desc} numberOfLines={2}>
            {sound.description}
          </Text>
          <View style={styles.tags}>
            <StatusPill label={pitch} tone={active ? 'scheduled' : 'idle'} caps={false} />
            <StatusPill label={source} tone="idle" />
            <AudibleChip state={heard} onPress={onAudible} />
          </View>
        </View>
        {onDelete ? (
          <Touchable
            onPress={onDelete}
            accessibilityLabel={`Delete ${sound.name}`}
            style={styles.delete}
          >
            <Trash2 size={icon.md} color={c.danger} strokeWidth={icon.stroke} />
          </Touchable>
        ) : null}
      </View>
    </Touchable>
  );
}

const sheet = themed((c, t) => ({
  /** the list takes what the screen has left, and scrolls inside it */
  scroll: { flex: 1 },
  first: { marginTop: 0 },
  section: { marginTop: space.lg },
  credits: { marginTop: space.lg, borderWidth: 1, borderColor: c.border },
  list: { borderWidth: 1, borderColor: c.border },
  press: { minHeight: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm + 4,
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.sm + 4,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.card,
    marginTop: -1,
  },
  rowActive: { backgroundColor: c.surface },
  bird: { width: 44, paddingTop: 2, alignItems: 'center' },
  rowText: { flex: 1, gap: 5 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { ...t.heading, flexShrink: 1 },
  desc: { ...t.bodySmall },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  delete: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
