import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';

import {
  Button,
  LockBadge,
  Pigeon,
  Screen,
  SectionHeader,
  StatusPill,
  Touchable,
  useToast,
} from '../../src/components';
import { PLACEHOLDER_NOTICE } from '../../src/audio/samples';
import {
  AUDIBLE_TAG,
  SYSTEM_PROFILES,
  guestsMayHear,
  soundPitch,
  type AudioProfile,
} from '../../src/core/profiles';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useProfiles } from '../../src/state/useProfiles';
import { useSession } from '../../src/state/useSession';
import { icon, space, themed, useTheme, useThemedStyles } from '../../src/theme';

export default function SoundsScreen() {
  const styles = useThemedStyles(sheet);
  const ent = useEntitlement();
  const toast = useToast();
  const saved = useProfiles((s) => s.saved);
  const remove = useProfiles((s) => s.remove);
  const setProfile = useSession((s) => s.setProfile);
  const activeId = useSession((s) => s.profileId);

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
    <Screen title="Sounds" scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.list}>
          {SYSTEM_PROFILES.map((p) => (
            <SoundRow
              key={p.id}
              sound={p}
              active={p.id === activeId}
              locked={p.minPlan !== 'free' && !ent.can('profiles.all')}
              onPress={() => pick(p)}
            />
          ))}
        </View>

        {saved.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader index="02" title="Your own" />
            <View style={styles.list}>
              {saved.map((p) => (
                <SoundRow
                  key={p.id}
                  sound={p}
                  active={p.id === activeId}
                  onPress={() => pick(p)}
                  onDelete={() => {
                    remove(p.id);
                    toast.show('Sound deleted.');
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.action}>
        <Button
          label="Make your own"
          variant="secondary"
          size="lg"
          onPress={makeYourOwn}
          icon={Plus}
          accessibilityHint="Pro plan"
        />
      </View>
    </Screen>
  );
}

/**
 * One sound.
 *
 * The bird on the left says what the sound is like without a word: it leans
 * away from the very high ones, and opens its beak for a call.
 */
function SoundRow({
  sound,
  active,
  locked = false,
  onPress,
  onDelete,
}: {
  sound: AudioProfile;
  active: boolean;
  locked?: boolean;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const pitch = soundPitch(sound);
  const heard = guestsMayHear(sound);

  const pose =
    sound.kind === 'sample' ? 'call' : pitch === 'Very high' ? 'lean' : 'sit';

  return (
    <Touchable
      onPress={onPress}
      feel="offset"
      accessibilityLabel={`${sound.name}. ${sound.description} ${pitch} pitch.${
        heard ? ` ${AUDIBLE_TAG}.` : ''
      }${locked ? ' Needs Pro.' : ''}`}
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
            <StatusPill label={pitch} tone={active ? 'scheduled' : 'idle'} />
            {heard ? <StatusPill label={AUDIBLE_TAG} tone="warning" /> : null}
            {sound.kind === 'sample' ? (
              <StatusPill label={PLACEHOLDER_NOTICE} tone="idle" />
            ) : null}
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
  body: { paddingBottom: space.md },
  section: { marginTop: space.lg },
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
  action: { marginTop: space.md },
}));
