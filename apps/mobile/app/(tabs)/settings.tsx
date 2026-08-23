import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Building2,
  History,
  LogIn,
  LogOut,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react-native';

import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  Disclosure,
  ListRow,
  Screen,
  SectionHeader,
  SignInSheet,
  Touchable,
  useToast,
} from '../../src/components';
import { deleteMyAccount, signOut as signOutOfAccount } from '../../src/services/auth';
import { PLAN_LABEL, PLAN_ORDER, type Plan } from '../../src/core/entitlements';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useAccount } from '../../src/state/useAccount';
import { useHistory } from '../../src/state/useHistory';
import { color, font, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

/** The three things we always say out loud. */
const HONEST_FACTS = [
  'Phones cannot play the highest sounds. A PigeonX speaker can.',
  'Some sounds are very high. Some people can hear them. We mark those.',
  'Bird alarm calls work best. They are not quiet. Everyone nearby hears them.',
];

export default function SettingsScreen() {
  const ent = useEntitlement();
  const toast = useToast();
  const [devOpen, setDevOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const email = useAccount((s) => s.email);
  const guest = useAccount((s) => s.guest);
  const setPlan = useAccount((s) => s.setPlan);
  const setSession = useAccount((s) => s.setSession);
  const addTestSpeaker = useAccount((s) => s.addSimulatedDevice);
  const resetOnboarding = useAccount((s) => s.resetOnboarding);

  const entries = useHistory((s) => s.entries);

  const free = ent.plan === 'free';

  const signOut = useCallback(async () => {
    const result = await signOutOfAccount();
    setSession(null);
    toast.show(result.message, result.ok ? 'default' : 'danger');
  }, [setSession, toast]);

  const removeAccount = useCallback(async () => {
    setDeleting(true);
    try {
      const result = await deleteMyAccount();
      setSession(null);
      setDeleteOpen(false);
      toast.show(result.message, result.ok ? 'default' : 'danger');
    } finally {
      setDeleting(false);
    }
  }, [setSession, toast]);

  return (
    <Screen title="Settings">
      <SectionHeader title="Your plan" />
      <Card style={styles.planCard}>
        <Text style={type.heading}>PigeonX {PLAN_LABEL[ent.plan]}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {guest
            ? 'On this phone only'
            : `Signed in as ${email ?? 'your account'}`}
        </Text>
      </Card>
      <View style={styles.upgrade}>
        <Button
          label={free ? 'Upgrade' : 'Change plan'}
          variant={free ? 'primary' : 'secondary'}
          onPress={() => router.push('/paywall')}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.rows}>
          <ListRow
            icon={<History size={18} color={color.ink} strokeWidth={1.75} />}
            title="History"
            meta={
              entries.length === 0
                ? 'What played and when'
                : `What played and when. ${entries.length} so far.`
            }
            onPress={() => router.push('/history')}
          />
          <ListRow
            icon={<Building2 size={18} color={color.ink} strokeWidth={1.75} />}
            title="For businesses"
            meta="Run a roof, a patio and a dock from one phone."
            onPress={() =>
              ent.can('zones')
                ? router.navigate('/places')
                : router.push('/for-businesses')
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Help" />
        <View style={styles.facts}>
          {HONEST_FACTS.map((f) => (
            <Text key={f} style={styles.fact}>
              {f}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.rows}>
          {guest ? (
            <ListRow
              icon={<LogIn size={18} color={color.ink} strokeWidth={1.75} />}
              title="Sign in"
              meta="Keep your sounds when you change phones."
              onPress={() => setSignInOpen(true)}
            />
          ) : (
            <>
              <ListRow
                icon={<LogOut size={18} color={color.ink} strokeWidth={1.75} />}
                title="Sign out"
                meta={`Signed in as ${email ?? 'your account'}`}
                chevron={false}
                onPress={() => void signOut()}
              />
              <ListRow
                icon={
                  <Trash2 size={18} color={color.danger} strokeWidth={1.75} />
                }
                title="Delete my account"
                meta="This takes away your account and everything in it."
                chevron={false}
                onPress={() => setDeleteOpen(true)}
              />
            </>
          )}
        </View>
      </View>

      {__DEV__ ? (
        <View style={styles.section}>
          <Disclosure
            label="Developer"
            open={devOpen}
            onToggle={() => setDevOpen((v) => !v)}
            summary={PLAN_LABEL[ent.plan]}
          >
            <View style={styles.chipRow}>
              {PLAN_ORDER.map((p: Plan) => (
                <Chip
                  key={p}
                  label={PLAN_LABEL[p]}
                  selected={ent.plan === p}
                  compact
                  onPress={() => {
                    setPlan(p);
                    toast.show(`Test mode: plan set to ${PLAN_LABEL[p]}`);
                  }}
                />
              ))}
            </View>
            <Button
              label="Add a test speaker"
              variant="secondary"
              size="sm"
              onPress={() => {
                const d = addTestSpeaker();
                toast.show(`${d.name} added.`, 'success');
              }}
              icon={<Plus size={14} color={color.ink} strokeWidth={1.75} />}
            />
            <Button
              label="Show the welcome screens again"
              variant="ghost"
              size="sm"
              onPress={() => {
                resetOnboarding();
                router.replace('/onboarding');
              }}
              icon={<RotateCcw size={14} color={color.ink} strokeWidth={1.75} />}
            />
          </Disclosure>
        </View>
      ) : null}

      <Touchable
        onPress={() => router.push('/paywall')}
        accessibilityLabel="See the plans"
        style={styles.footerLink}
      >
        <Text style={styles.footerLinkText}>See what each plan gives you</Text>
      </Touchable>

      <SignInSheet
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => setSignInOpen(false)}
      />

      <ConfirmSheet
        open={deleteOpen}
        title="Delete my account"
        body="This takes away your account, your sounds, your times and what played. You cannot get it back. What is on this phone stays until you delete the app."
        confirmLabel="Yes, delete it"
        cancelLabel="Keep my account"
        danger
        busy={deleting}
        onConfirm={() => void removeAccount()}
        onClose={() => setDeleteOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  planCard: { gap: 4 },
  upgrade: { marginTop: space.sm },
  section: { marginTop: space.lg },
  rows: { borderWidth: 1, borderColor: color.border },
  meta: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 17,
    color: color.fgMuted,
  },
  facts: { gap: space.sm },
  fact: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 20,
    color: color.fg,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  footerLink: {
    marginTop: space.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  footerLinkText: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.accent,
  },
});
