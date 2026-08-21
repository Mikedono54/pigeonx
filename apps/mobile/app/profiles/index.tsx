import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';

import {
  Button,
  Card,
  EmptyState,
  LockBadge,
  Screen,
  SectionHeader,
  StatusPill,
  Touchable,
  useToast,
} from '../../src/components';
import { PLACEHOLDER_NOTICE } from '../../src/audio/samples';
import {
  KIND_LABEL,
  SYSTEM_PROFILES,
  describeParams,
  guestsMayHear,
  type AudioProfile,
} from '../../src/core/profiles';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useProfiles } from '../../src/state/useProfiles';
import { useSession } from '../../src/state/useSession';
import { color, font, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function ProfilesScreen() {
  const ent = useEntitlement();
  const toast = useToast();
  const saved = useProfiles((s) => s.saved);
  const remove = useProfiles((s) => s.remove);
  const setProfile = useSession((s) => s.setProfile);
  const activeId = useSession((s) => s.profileId);

  const savedLimit = ent.limit('savedProfiles');

  const openBuilder = () => {
    if (!ent.guard('profiles.builder')) return;
    if (savedLimit != null && saved.length >= savedLimit) {
      ent.guard('profiles.saved.unlimited');
      return;
    }
    router.push('/profiles/new');
  };

  const pick = (p: AudioProfile) => {
    if (p.minPlan !== 'free' && !ent.guard('profiles.all')) return;
    setProfile(p.id);
    toast.show(`${p.name} selected`);
    router.back();
  };

  return (
    <Screen
      header={
        <View style={styles.headRow}>
          <Touchable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            style={styles.back}
          >
            <ChevronLeft size={22} color={color.ink} strokeWidth={1.75} />
          </Touchable>
          <Text style={type.title}>Profiles</Text>
        </View>
      }
    >
      <SectionHeader
        index="01"
        title="Yours"
        subtitle={
          savedLimit == null
            ? `${saved.length} saved`
            : `Free saves ${savedLimit} of your own`
        }
      />

      {saved.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="None built yet"
            body="Set the frequency, the pulse timing and the randomisation, hear five seconds of it, then save."
            actionLabel="Build one"
            onAction={openBuilder}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {saved.map((p) => (
            <ProfileRow
              key={p.id}
              profile={p}
              active={p.id === activeId}
              onPress={() => pick(p)}
              onDelete={() => {
                remove(p.id);
                toast.show('Profile deleted');
              }}
            />
          ))}
        </View>
      )}

      <View style={styles.action}>
        <Button
          label="Build a profile"
          variant="secondary"
          onPress={openBuilder}
          icon={<Plus size={16} color={color.ink} strokeWidth={1.75} />}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          index="02"
          title="Built in"
          subtitle="Starting points. Copy one by building your own."
        />
        <View style={styles.list}>
          {SYSTEM_PROFILES.map((p) => (
            <ProfileRow
              key={p.id}
              profile={p}
              active={p.id === activeId}
              locked={p.minPlan !== 'free' && !ent.can('profiles.all')}
              onPress={() => pick(p)}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

function ProfileRow({
  profile,
  active,
  locked = false,
  onPress,
  onDelete,
}: {
  profile: AudioProfile;
  active: boolean;
  locked?: boolean;
  onPress: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card active={active} onPress={onPress} accessibilityLabel={profile.name}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name}
            </Text>
            {locked ? <LockBadge plan={profile.minPlan} compact /> : null}
          </View>
          <Text style={styles.desc} numberOfLines={2}>
            {profile.description}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {KIND_LABEL[profile.kind]} · {describeParams(profile)}
          </Text>
          {guestsMayHear(profile) || profile.kind === 'sample' ? (
            <View style={styles.tags}>
              {guestsMayHear(profile) ? (
                <StatusPill label="Guests may hear" tone="warning" />
              ) : null}
              {profile.kind === 'sample' ? (
                <StatusPill label={PLACEHOLDER_NOTICE} tone="idle" />
              ) : null}
            </View>
          ) : null}
        </View>
        {onDelete ? (
          <Touchable
            onPress={onDelete}
            accessibilityLabel={`Delete ${profile.name}`}
            style={styles.delete}
          >
            <Trash2 size={18} color={color.danger} strokeWidth={1.75} />
          </Touchable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  back: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  list: { gap: space.sm },
  action: { marginTop: space.md },
  section: { marginTop: space.xl },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  rowText: { flex: 1, gap: 4 },
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
  meta: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    color: color.fgSubtle,
  },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  delete: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
