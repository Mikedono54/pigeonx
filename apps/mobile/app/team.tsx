import { useCallback, useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, HelpCircle, Share2, Trash2, UserPlus } from 'lucide-react-native';

import {
  Button,
  EmptyState,
  ListRow,
  Screen,
  SectionHeader,
  Segmented,
  Sheet,
  TextField,
  Touchable,
  useToast,
} from '../src/components';
import { ROLE_POWERS, TEAM_ROLES, WHO_CAN_DO_WHAT } from '../src/core/team';
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
import { font, icon, space, themed, useTheme, useThemedStyles } from '../src/theme';

export default function TeamScreen() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const toast = useToast();
  const orgId = useAccount((s) => s.activeOrgId);
  const orgName = useAccount((s) => s.activeOrgName);
  const myRole = useAccount((s) => s.activeOrgRole);
  const myUserId = useAccount((s) => s.userId);

  const [team, setTeam] = useState<Teammate[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [powersOpen, setPowersOpen] = useState(false);
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
    [load, orgId, toast]
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
            <ChevronLeft size={icon.lg} color={c.ink} strokeWidth={icon.stroke} />
          </Touchable>
          <Text style={styles.headTitle}>Your team</Text>
        </View>
      }
    >
      <Text style={styles.lede}>
        {orgName
          ? `Everyone who helps look after ${orgName}.`
          : 'Everyone who helps look after your places.'}
      </Text>

      {team.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            title="It is just you"
            body="Invite someone by email. They get a link that puts them on your team."
            actionLabel="Invite by email"
            onAction={() => setInviteOpen(true)}
          />
        </View>
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
                  <Trash2 size={icon.md} color={c.danger} strokeWidth={icon.stroke} />
                </Touchable>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <View style={styles.powers}>
        <ListRow
          title={WHO_CAN_DO_WHAT}
          meta="Owner, Manager and Staff, in three sentences."
          icon={HelpCircle}
          onPress={() => setPowersOpen(true)}
        />
      </View>

      {link ? (
        <View style={styles.linkBlock}>
          <SectionHeader title="Send them this link" />
          <Text style={styles.link} numberOfLines={2}>
            {link}
          </Text>
          <Button
            label="Send it"
            variant="secondary"
            onPress={() => void share()}
            icon={Share2}
          />
        </View>
      ) : null}

      <View style={styles.action}>
        <Button
          label="Invite by email"
          size="lg"
          onPress={() => setInviteOpen(true)}
          icon={UserPlus}
        />
      </View>

      <Sheet open={powersOpen} title={WHO_CAN_DO_WHAT} onClose={() => setPowersOpen(false)}>
        {TEAM_ROLES.slice()
          .reverse()
          .map((role) => (
            <Text key={role} style={styles.power}>
              {ROLE_POWERS[role]}
            </Text>
          ))}
        <Text style={styles.hint}>
          Everyone on the team sees the same places, the same speakers and the same history.
        </Text>
      </Sheet>

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
  const styles = useThemedStyles(sheet);
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
      <TextField
        label="Their email"
        hint="Type their email. You get a link to send them."
        value={email}
        onChangeText={setEmail}
        placeholder="them@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        inputMode="email"
        accessibilityLabel="Their email"
      />

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

const sheet = themed((c, t) => ({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  back: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headTitle: { ...t.title, flex: 1 },
  lede: { ...t.body, color: c.text },
  empty: { marginTop: space.md },
  list: { marginTop: space.md, borderWidth: 1, borderColor: c.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  grow: { flex: 1, gap: 2 },
  name: { ...t.subheading },
  meta: { ...t.bodySmall },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powers: { marginTop: space.lg, borderWidth: 1, borderColor: c.border },
  power: { ...t.body, color: c.ink },
  linkBlock: { marginTop: space.lg, gap: space.sm },
  link: {
    ...t.caption,
    fontFamily: font.mono.medium,
    color: c.ink,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    padding: space.sm + 4,
  },
  action: { marginTop: space.xl },
  field: { gap: space.sm },
  fieldLabel: { ...t.overline },
  hint: { ...t.bodySmall },
}));
