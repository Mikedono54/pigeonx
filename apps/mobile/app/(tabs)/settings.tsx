import { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Building2,
  History,
  LogIn,
  LogOut,
  Mail,
  Music4,
  Plus,
  RadioTower,
  RotateCcw,
  Speaker,
  Target,
  Trash2,
} from 'lucide-react-native';

import {
  Button,
  Chip,
  ConfirmSheet,
  Disclosure,
  ListRow,
  Screen,
  SectionHeader,
  Segmented,
  Sheet,
  SignInSheet,
  useToast,
} from '../../src/components';
import { SOUND_CREDITS, SOUND_CREDITS_NOTE } from '../../src/audio/samples';
import { deleteMyAccount, signOut as signOutOfAccount } from '../../src/services/auth';
import { PLAN_LABEL, PLAN_ORDER, type Plan } from '../../src/core/entitlements';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useAccount } from '../../src/state/useAccount';
import { useHistory } from '../../src/state/useHistory';
import {
  space,
  themed,
  THEME_PREFERENCE_LABEL,
  THEME_PREFERENCES,
  useTheme,
  useThemedStyles,
  type ThemePreference,
} from '../../src/theme';

const CONTACT_EMAIL = 'hello@pigeonx.org';

/**
 * Help, and the three things we always say out loud.
 *
 * The facts used to sit on Settings as a list nobody had asked for. They live
 * inside the answers now, where a person meets them while they are looking
 * for them.
 */
const HELP: { id: HelpTopic; title: string; icon: typeof Target; lines: string[] }[] = [
  {
    id: 'results',
    title: 'Getting the best results',
    icon: Target,
    lines: [
      'Position the speaker close to where the birds land.',
      'Run 15 minute sessions at random times.',
      'Switch sounds every few days, so the birds do not habituate.',
      'Distress calls work best. They are also audible, so people nearby hear them too.',
    ],
  },
  {
    id: 'speaker',
    title: 'Which speaker should I use?',
    icon: Speaker,
    lines: [
      'This phone plays up to 18 kHz.',
      'A Bluetooth speaker plays up to 19 kHz.',
      'A PigeonX speaker plays up to 25 kHz.',
      'Phones cannot reach the highest sounds. A PigeonX speaker can.',
    ],
  },
];

type HelpTopic = 'results' | 'speaker' | 'credits';

export default function SettingsScreen() {
  const styles = useThemedStyles(sheet);
  const { c, preference, setPreference } = useTheme();
  const ent = useEntitlement();
  const toast = useToast();
  const [devOpen, setDevOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState<HelpTopic | null>(null);
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
      <View style={styles.planBlock}>
        <Text style={styles.planName}>PigeonX {PLAN_LABEL[ent.plan]}</Text>
        <Text style={styles.planMeta} numberOfLines={1}>
          {guest ? 'On this phone only' : `Signed in as ${email ?? 'your account'}`}
        </Text>
      </View>
      <View style={styles.upgrade}>
        <Button
          label={free ? 'Upgrade' : 'Change plan'}
          variant={free ? 'primary' : 'secondary'}
          size="lg"
          onPress={() => router.push('/paywall')}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="How it looks" />
        <Segmented
          value={preference}
          onChange={(next: ThemePreference) => setPreference(next)}
          accessibilityLabel="How it looks"
          options={THEME_PREFERENCES.map((p) => ({
            value: p,
            label: THEME_PREFERENCE_LABEL[p],
          }))}
        />
        <Text style={styles.hint}>System follows your phone.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.rows}>
          <ListRow
            icon={History}
            title="History"
            meta={entries.length === 0 ? 'Nothing yet' : `${entries.length} plays`}
            onPress={() => router.push('/history')}
          />
          <ListRow
            icon={RadioTower}
            title="Use this phone as a speaker"
            meta="It plays your schedule on its own"
            onPress={() => {
              if (!ent.guard('schedules.reminder')) return;
              router.push('/speaker');
            }}
          />
          <ListRow
            icon={Building2}
            title="For businesses"
            meta="Manage multiple locations and speakers"
            onPress={() =>
              ent.can('zones') ? router.navigate('/places') : router.push('/for-businesses')
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Help" />
        <View style={styles.rows}>
          {HELP.map((topic) => (
            <ListRow
              key={topic.id}
              icon={topic.icon}
              title={topic.title}
              onPress={() => setHelpOpen(topic.id)}
            />
          ))}
          <ListRow
            icon={Mail}
            title="Contact us"
            meta={CONTACT_EMAIL}
            chevron={false}
            onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="About" />
        <View style={styles.rows}>
          <ListRow
            icon={Music4}
            title="Sound credits"
            meta="Who recorded the bird calls"
            onPress={() => setHelpOpen('credits')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.rows}>
          {guest ? (
            <ListRow
              icon={LogIn}
              title="Sign in"
              meta="Keep your sounds"
              onPress={() => setSignInOpen(true)}
            />
          ) : (
            <>
              <ListRow
                icon={LogOut}
                title="Sign out"
                meta={`Signed in as ${email ?? 'your account'}`}
                chevron={false}
                onPress={() => void signOut()}
              />
              <ListRow
                icon={Trash2}
                iconColor={c.danger}
                title="Delete my account"
                meta="Gone for good"
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
              icon={Plus}
            />
            <Button
              label="Show the welcome screens again"
              variant="ghost"
              size="sm"
              onPress={() => {
                resetOnboarding();
                router.replace('/onboarding');
              }}
              icon={RotateCcw}
            />
          </Disclosure>
        </View>
      ) : null}

      {HELP.map((topic) => (
        <Sheet
          key={topic.id}
          open={helpOpen === topic.id}
          title={topic.title}
          onClose={() => setHelpOpen(null)}
        >
          <View style={styles.answer}>
            {topic.lines.map((line) => (
              <View key={line} style={styles.fact}>
                <View style={styles.factMark} />
                <Text style={styles.factText}>{line}</Text>
              </View>
            ))}
          </View>
        </Sheet>
      ))}

      <Sheet
        open={helpOpen === 'credits'}
        title="Sound credits"
        onClose={() => setHelpOpen(null)}
      >
        <View style={styles.answer}>
          {SOUND_CREDITS.map((credit) => (
            <View key={credit.title} style={styles.credit}>
              <Text style={styles.creditTitle}>{credit.title}</Text>
              {credit.lines.map((line) => (
                <Text key={line} style={styles.creditLine}>
                  {line}
                </Text>
              ))}
            </View>
          ))}
          <Text style={styles.creditNote}>{SOUND_CREDITS_NOTE}</Text>
        </View>
      </Sheet>

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

const sheet = themed((c, t) => ({
  planBlock: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    padding: space.md,
    gap: 2,
  },
  planName: { ...t.title, fontSize: 24, letterSpacing: -0.9 },
  planMeta: { ...t.bodySmall },
  upgrade: { marginTop: space.sm },
  section: { marginTop: space.lg, gap: space.sm },
  rows: { borderWidth: 1, borderColor: c.border },
  hint: { ...t.caption },
  answer: { gap: space.sm + 2, marginBottom: space.sm },
  fact: { flexDirection: 'row', gap: space.sm + 2, alignItems: 'flex-start' },
  factMark: { width: 10, height: 3, marginTop: 9, backgroundColor: c.accent },
  factText: { ...t.label, flex: 1, fontSize: 15, lineHeight: 21 },
  credit: { gap: 2 },
  creditTitle: { ...t.subheading },
  creditLine: { ...t.bodySmall },
  creditNote: { ...t.caption, marginTop: space.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
}));
