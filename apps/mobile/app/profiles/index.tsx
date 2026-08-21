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
  describeParams,
  guestsMayHear,
  type AudioProfile,
} from '../../src/core/profiles';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useProfiles } from '../../src/state/useProfiles';
import { useSession } from '../../src/state/useSession';
import { SYSTEM_PROFILES } from '../../src/core/profiles';
import { color, font, space } from '../../src/theme/tokens';

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
            <ChevronLeft size={22} color={color.fg} strokeWidth={2.2} />
          </Touchable>
          <Text style={styles.headTitle}>Profiles</Text>
        </View>
      }
      bottomInset={80}
    >
      <SectionHeader
        title="Yours"
        subtitle={
          savedLimit == null
            ? `${saved.length} saved`
            : `Free saves ${savedLimit} custom profile`
        }
      />

      {saved.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="No custom profiles yet"
            body="Set the frequency, pulse timing and randomisation yourself, preview it for five seconds, then save."
            actionLabel="Build one"
            onAction={openBuilder}
          />
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
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

      <View style={{ marginTop: space.md }}>
        <Button
          label="Build a profile"
          variant="outline"
          onPress={openBuilder}
          icon={<Plus size={17} color={color.fg} strokeWidth={2.4} />}
        />
      </View>

      <View style={{ marginTop: space.xl }}>
        <SectionHeader
          title="System profiles"
          subtitle="Tuned starting points. Duplicate one by building your own."
        />
        <View style={{ gap: space.sm }}>
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
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name}
            </Text>
            {locked ? <LockBadge plan={profile.minPlan} compact /> : null}
          </View>
          <Text style={styles.desc} numberOfLines={2}>
            {profile.description}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{KIND_LABEL[profile.kind]}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaMono}>{describeParams(profile)}</Text>
          </View>
          <View style={styles.pills}>
            {guestsMayHear(profile) ? (
              <StatusPill label="Guests may hear" tone="warning" dot={false} />
            ) : null}
            {profile.kind === 'sample' ? (
              <StatusPill label={PLACEHOLDER_NOTICE} tone="idle" dot={false} />
            ) : null}
          </View>
        </View>
        {onDelete ? (
          <Touchable
            onPress={onDelete}
            accessibilityLabel={`Delete ${profile.name}`}
            style={styles.delete}
          >
            <Trash2 size={17} color={color.danger} strokeWidth={2.2} />
          </Touchable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headTitle: {
    fontFamily: font.heading.bold,
    fontSize: 26,
    color: color.fg,
    letterSpacing: -0.4,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { fontFamily: font.heading.semibold, fontSize: 16, color: color.fg },
  desc: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 19,
    color: color.fgMuted,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: font.body.medium, fontSize: 12, color: color.fgSubtle },
  metaDot: { color: color.fgSubtle, fontSize: 12 },
  metaMono: { fontFamily: font.mono.medium, fontSize: 12, color: color.teal },
  pills: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  delete: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
