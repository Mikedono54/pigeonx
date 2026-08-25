import { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Building2,
  Ear,
  History,
  ListMusic,
  LogIn,
  LogOut,
  Mail,
  MapPin,
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
  CreditsSheet,
  Sheet,
  SignInSheet,
  useToast,
} from '../../src/components';
import { deleteMyAccount, signOut as signOutOfAccount } from '../../src/services/auth';
import { PLAN_LABEL, PLAN_ORDER, type Plan } from '../../src/core/entitlements';
import { createPurchases, PRIVACY_URL, TERMS_URL } from '../../src/services/purchases';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useAccount } from '../../src/state/useAccount';
import { useHistory } from '../../src/state/useHistory';
import { usePlacesHome } from '../../src/state/usePlacesHome';
import { useProtectionPlans } from '../../src/state/useProtectionPlans';
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
 * Help, and the facts we always say out loud.
 *
 * They used to sit on Settings as a list nobody had asked for. They live
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
      'Switch sounds every few days, so the pattern is harder to predict.',
      'Tell the app what happened afterwards. It only counts what you report.',
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
  {
    id: 'audible',
    title: 'Audible sounds and safety',
    icon: Ear,
    lines: [
      'Bird calls and hawk calls sit inside human hearing. Everyone nearby hears them.',
      'Every sound carries a tag saying who will hear it. Read it before you press Start.',
      'Start at a low volume and raise it only until it carries to where the birds land.',
      'Do not run audible sounds close to where people sleep, work quietly, or eat.',
      'If people are usually nearby, answer yes to the quiet question and the app leaves recordings out.',
    ],
  },
  {
    id: 'placement',
    title: 'Where to put the speaker',
    icon: MapPin,
    lines: [
      'Point it at the ledge, rail or beam the birds actually land on.',
      'High frequencies travel in a straight line. A wall or a parapet in the way stops them.',
      'Closer beats louder. A speaker two metres away at a low volume carries further than a loud one across a yard.',
      'Keep it out of the rain and out of direct sun.',
      'Move it every few days if you can. A sound from one fixed spot is easier to settle around.',
    ],
  },
];

type HelpTopic = 'results' | 'speaker' | 'audible' | 'placement' | 'credits';

export default function SettingsScreen() {
  const styles = useThemedStyles(sheet);
  const { c, preference, setPreference } = useTheme();
  const ent = useEntitlement();
  const toast = useToast();
  const [devOpen, setDevOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState<HelpTopic | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [speakersOpen, setSpeakersOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const email = useAccount((s) => s.email);
  const guest = useAccount((s) => s.guest);
  const setPlan = useAccount((s) => s.setPlan);
  const setSession = useAccount((s) => s.setSession);
  const speakers = useAccount((s) => s.devices);
  const addTestSpeaker = useAccount((s) => s.addSimulatedDevice);
  const removeSpeaker = useAccount((s) => s.removeDevice);
  const resetOnboarding = useAccount((s) => s.resetOnboarding);

  const entries = useHistory((s) => s.entries);
  const places = usePlacesHome((s) => s.places);
  const plans = useProtectionPlans((s) => s.plans);

  const free = ent.plan === 'free';

  const signOut = useCallback(async () => {
    const result = await signOutOfAccount();
    setSession(null);
    toast.show(result.message, result.ok ? 'default' : 'danger');
  }, [setSession, toast]);

  const restore = useCallback(async () => {
    setRestoring(true);
    try {
      const store = createPurchases(setPlan);
      const result = await store.restore();
      if (result.message) toast.show(result.message, result.ok ? 'success' : 'danger');
    } finally {
      setRestoring(false);
    }
  }, [setPlan, toast]);

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
      <SectionHeader title="Account and plan" />
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
      <View style={styles.rowsSpaced}>
        <ListRow
          title="Restore purchases"
          meta={restoring ? 'Checking with the store' : undefined}
          chevron={false}
          onPress={() => void restore()}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Places and speakers" />
        <View style={styles.rows}>
          <ListRow
            icon={MapPin}
            title="My places"
            meta={
              places.length === 1
                ? places[0].name
                : `${places.length} places`
            }
            onPress={() => router.push('/my-places')}
          />
          <ListRow
            icon={Speaker}
            title="Connected speakers"
            meta={
              speakers.length === 0
                ? 'None yet. This phone plays it.'
                : `${speakers.length} speaker${speakers.length === 1 ? '' : 's'}`
            }
            onPress={() => setSpeakersOpen(true)}
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
        <SectionHeader title="Appearance" />
        <Segmented
          value={preference}
          onChange={(next: ThemePreference) => setPreference(next)}
          accessibilityLabel="Appearance"
          options={THEME_PREFERENCES.map((p) => ({
            value: p,
            label: THEME_PREFERENCE_LABEL[p],
          }))}
        />
        <Text style={styles.hint}>System follows your phone.</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Activity" />
        <View style={styles.rows}>
          <ListRow
            icon={History}
            title="Protection history"
            meta={
              entries.length === 0
                ? 'Nothing yet'
                : `${entries.length} session${entries.length === 1 ? '' : 's'}`
            }
            onPress={() => router.push('/history')}
          />
          <ListRow
            icon={ListMusic}
            title="Saved plans"
            meta={
              plans.length === 0
                ? 'None yet'
                : `${plans.length} plan${plans.length === 1 ? '' : 's'}`
            }
            onPress={() => router.push('/plans')}
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
            icon={Music4}
            title="Sound credits"
            meta="Who recorded the bird calls"
            onPress={() => setHelpOpen('credits')}
          />
          <ListRow
            icon={Mail}
            title="Contact support"
            meta={CONTACT_EMAIL}
            chevron={false}
            onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.rows}>
          {guest ? (
            <ListRow
              icon={LogIn}
              title="Sign in"
              meta="Keep your places and sounds"
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

      <View style={styles.legal}>
        <Button
          label="Terms"
          variant="ghost"
          size="sm"
          full={false}
          onPress={() => void Linking.openURL(TERMS_URL)}
        />
        <Button
          label="Privacy"
          variant="ghost"
          size="sm"
          full={false}
          onPress={() => void Linking.openURL(PRIVACY_URL)}
        />
      </View>

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
        open={speakersOpen}
        title="Connected speakers"
        onClose={() => setSpeakersOpen(false)}
      >
        {speakers.length === 0 ? (
          <Text style={styles.hint}>
            Nothing paired yet. This phone plays every sound until something is.
          </Text>
        ) : (
          <View style={styles.rows}>
            {speakers.map((d) => (
              <ListRow
                key={d.id}
                icon={Speaker}
                title={d.name}
                meta={`Added ${new Date(d.pairedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}`}
                chevron={false}
                right={
                  <Button
                    label="Remove"
                    variant="ghost"
                    size="sm"
                    full={false}
                    onPress={() => {
                      removeSpeaker(d.id);
                      toast.show(`${d.name} removed.`);
                    }}
                  />
                }
              />
            ))}
          </View>
        )}
        <Text style={styles.hint}>
          A Bluetooth speaker is paired in your phone settings, then picked on Home.
        </Text>
      </Sheet>

      <CreditsSheet open={helpOpen === 'credits'} onClose={() => setHelpOpen(null)} />

      <SignInSheet
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => setSignInOpen(false)}
      />

      <ConfirmSheet
        open={deleteOpen}
        title="Delete my account"
        body="This takes away your account, your places, your sounds, your times and what played. You cannot get it back. What is on this phone stays until you delete the app."
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
  rowsSpaced: { borderWidth: 1, borderColor: c.border, marginTop: space.sm },
  hint: { ...t.caption },
  answer: { gap: space.sm + 2, marginBottom: space.sm },
  fact: { flexDirection: 'row', gap: space.sm + 2, alignItems: 'flex-start' },
  factMark: { width: 10, height: 3, marginTop: 9, backgroundColor: c.accent },
  factText: { ...t.label, flex: 1, fontSize: 15, lineHeight: 21 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  legal: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.lg,
    marginTop: space.lg,
  },
}));
