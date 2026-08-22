import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';

import {
  Button,
  LockBadge,
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
import { color, font, space } from '../../src/theme/tokens';

export default function SoundsScreen() {
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
    <Screen
      title="Sounds"
      subtitle="Tap one. It goes back to Home ready to play."
      scroll={false}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
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
            <SectionHeader title="Your own" />
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
          onPress={makeYourOwn}
          icon={<Plus size={16} color={color.ink} strokeWidth={1.75} />}
          accessibilityHint="Pro plan"
        />
      </View>
    </Screen>
  );
}

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
  const pitch = soundPitch(sound);
  const heard = guestsMayHear(sound);

  return (
    <Touchable
      onPress={onPress}
      accessibilityLabel={`${sound.name}. ${sound.description} ${pitch} pitch.${
        heard ? ` ${AUDIBLE_TAG}.` : ''
      }${locked ? ' Needs Pro.' : ''}`}
      accessibilityState={{ selected: active }}
      style={styles.press}
    >
      <View style={[styles.row, active ? styles.rowActive : null]}>
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
            <Trash2 size={18} color={color.danger} strokeWidth={1.75} />
          </Touchable>
        ) : null}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: space.md },
  section: { marginTop: space.lg },
  list: { borderWidth: 1, borderColor: color.border },
  press: { minHeight: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.sm + 4,
    borderTopWidth: 1,
    borderTopColor: color.border,
    marginTop: -1,
  },
  rowActive: { backgroundColor: color.surface },
  rowText: { flex: 1, gap: 5 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: {
    fontFamily: font.heading.semibold,
    fontSize: 16,
    letterSpacing: -0.3,
    color: color.ink,
  },
  desc: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.fgMuted,
  },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  delete: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: { marginTop: space.md },
});
