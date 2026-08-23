import { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Share2, Trash2, UserPlus, Users } from 'lucide-react-native';

import {
  Button,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  Segmented,
  Sheet,
  Touchable,
  useToast,
} from '../src/components';
import { looksLikeEmail } from '../src/services/auth';
import {
  inviteTeammate,
  listTeam,
  removeTeammate,
  ROLE_HINT,
  ROLE_LABEL,
  type Teammate,
} from '../src/services/business';
import { useAccount, type TeamRole } from '../src/state/useAccount';
import { color, font, space } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

export default function TeamScreen() {
  const toast = useToast();
  const orgId = useAccount((s) => s.activeOrgId);
  const orgName = useAccount((s) => s.activeOrgName);
  const myRole = useAccount((s) => s.activeOrgRole);
  const myUserId = useAccount((s) => s.userId);

  const [team, setTeam] = useState<Teammate[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const owner = myRole === 'owner';

  const load = useCallback(async () => {
    if (!orgId) return;
    setTeam(await listTeam(orgId, myUserId));
  }, [myUserId, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const drop = useCallback(
    async (mate: Teammate) => {
      if (!orgId) return;
      const result = await removeTeammate(orgId, mate.userId);
      toast.show(result.message, result.ok ? 'success' : 'danger');
      if (result.ok) await load();
    },
    [load, orgId, toast],
  );

  const share = useCallback(async () => {
    if (!link) return;
    try {
      await Share.share({ message: link });
    } catch {
      toast.show("That didn't work. Try again.", 'danger');
    }
  }, [link, toast]);

  return (
    <Screen
      header={
        <View style={styles.headRow}>
          <Touchable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.back}>
            <ChevronLeft size={22} color={color.ink} strokeWidth={1.75} />
          </Touchable>
          <Text style={type.title}>Your team</Text>
        </View>
      }
    >
      <Text style={styles.lede}>
        {orgName
          ? `Everyone who helps look after ${orgName}.`
          : 'Everyone who helps look after your places.'}
      </Text>

      {team.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<Users size={20} color={color.fgMuted} strokeWidth={1.75} />}
            title="It is just you"
            body="Invite someone by email. They get a link that puts them on your team."
            actionLabel="Invite by email"
            onAction={() => setInviteOpen(true)}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {team.map((mate) => (
            <View key={mate.id} style={styles.row}>
              <View style={styles.grow}>
                <Text style={styles.name} numberOfLines={1}>
                  {mate.label}
                </Text>
                <Text style={styles.meta}>{ROLE_LABEL[mate.role]}</Text>
              </View>
              {owner && !mate.you ? (
                <Touchable
                  onPress={() => void drop(mate)}
                  accessibilityLabel={`Take ${mate.label} off the team`}
                  style={styles.iconButton}
                >
                  <Trash2 size={16} color={color.danger} strokeWidth={1.75} />
                </Touchable>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {link ? (
        <View style={styles.linkBlock}>
          <SectionHeader title="Send them this link" />
          <Text style={styles.link} numberOfLines={2}>
            {link}
          </Text>
          <Button
            label="Send it"
            onPress={() => void share()}
            icon={<Share2 size={14} color={color.onAccent} strokeWidth={1.75} />}
          />
        </View>
      ) : null}

      <View style={styles.action}>
        <Button
          label="Invite by email"
          size="lg"
          onPress={() => setInviteOpen(true)}
          icon={<UserPlus size={16} color={color.onAccent} strokeWidth={1.75} />}
        />
      </View>

      <InviteSheet
        open={inviteOpen}
        orgId={orgId}
        onClose={() => setInviteOpen(false)}
        onInvited={(made) => {
          setLink(made);
          setInviteOpen(false);
          void load();
        }}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

function InviteSheet({
  open,
  orgId,
  onClose,
  onInvited,
}: {
  open: boolean;
  orgId: string | null;
  onClose: () => void;
  onInvited: (link: string) => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('staff');
  const [busy, setBusy] = useState(false);

  const send = useCallback(async () => {
    if (!orgId) return;
    setBusy(true);
    try {
      const result = await inviteTeammate(orgId, email, role);
      toast.show(result.message, result.ok ? 'success' : 'danger');
      if (result.ok && result.value) {
        setEmail('');
        onInvited(result.value);
      }
    } finally {
      setBusy(false);
    }
  }, [email, onInvited, orgId, role, toast]);

  return (
    <Sheet
      open={open}
      title="Invite by email"
      onClose={onClose}
      footer={
        <Button
          label="Make the link"
          size="lg"
          loading={busy}
          disabled={!looksLikeEmail(email)}
          onPress={() => void send()}
        />
      }
    >
      <View style={styles.field}>
        <Text style={styles.hint}>Type their email. You get a link to send them.</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="them@example.com"
          placeholderTextColor={color.fgSubtle}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          inputMode="email"
          style={styles.input}
          accessibilityLabel="Their email"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>What they can do</Text>
        <Segmented
          value={role}
          onChange={setRole}
          accessibilityLabel="What they can do"
          options={[
            { value: 'staff', label: 'Play sounds' },
            { value: 'manager', label: 'Set things up' },
          ]}
        />
        <Text style={styles.hint}>{ROLE_HINT[role]}</Text>
      </View>
    </Sheet>
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
  lede: {
    fontFamily: font.body.regular,
    fontSize: 15,
    lineHeight: 21,
    color: color.fg,
  },
  list: { marginTop: space.md, borderWidth: 1, borderColor: color.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  grow: { flex: 1, gap: 2 },
  name: {
    fontFamily: font.heading.semibold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: color.ink,
  },
  meta: {
    fontFamily: font.body.regular,
    fontSize: 13,
    color: color.fgMuted,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBlock: { marginTop: space.lg, gap: space.sm },
  link: {
    fontFamily: font.mono.medium,
    fontSize: 12,
    lineHeight: 18,
    color: color.ink,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.sm + 4,
  },
  action: { marginTop: space.xl },
  field: { gap: space.sm },
  fieldLabel: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  hint: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 19,
    color: color.fgMuted,
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
});
