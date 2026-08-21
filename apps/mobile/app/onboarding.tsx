import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Bird,
  Ear,
  Radio,
  Smartphone,
  Speaker,
  Cpu,
  X,
} from 'lucide-react-native';

import { Banner, Button, Card, Touchable, useToast } from '../src/components';
import { OUTPUT_LABEL, type OutputKind } from '../src/core/profiles';
import { getSupabase, isSupabaseConfigured } from '../src/services/supabase';
import { useAccount } from '../src/state/useAccount';
import { useSession } from '../src/state/useSession';
import { color, font, gradient, radius, space } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

const OUTPUTS: { kind: OutputKind; icon: typeof Smartphone; hint: string }[] = [
  {
    kind: 'phone',
    icon: Smartphone,
    hint: 'Works right now. Honest ceiling around 18 kHz.',
  },
  {
    kind: 'bt_speaker',
    icon: Speaker,
    hint: 'Louder and better placed. Bluetooth codecs top out near 19 kHz.',
  },
  {
    kind: 'pigeonx_emitter',
    icon: Cpu,
    hint: 'Reaches 25 kHz and runs schedules unattended. Coming soon.',
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [signInOpen, setSignInOpen] = useState(false);

  const output = useSession((s) => s.output);
  const setOutput = useSession((s) => s.setOutput);
  const completeOnboarding = useAccount((s) => s.completeOnboarding);
  const continueAsGuest = useAccount((s) => s.continueAsGuest);

  const goTo = useCallback(
    (next: number) => {
      scroller.current?.scrollTo({ x: next * width, animated: true });
      setPage(next);
    },
    [width]
  );

  const finish = useCallback(() => {
    continueAsGuest();
    completeOnboarding();
    router.replace('/');
  }, [completeOnboarding, continueAsGuest]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(45,212,191,0.16)', 'rgba(11,18,32,0)']}
        style={[styles.wash, { height: 320 }]}
      />

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        style={{ flex: 1 }}
      >
        <Page width={width} top={insets.top}>
          <IconBadge>
            <Bird size={26} color={color.onAccent} strokeWidth={2.2} />
          </IconBadge>
          <Text style={type.display}>Keep birds off your space</Text>
          <Text style={styles.lede}>
            PigeonX plays deterrent audio — high-frequency tones, randomised
            sweeps and recorded alarm calls — through whatever speaker you point
            it at, and logs every run so you can see what is actually working.
          </Text>
          <Card style={styles.note} elevated>
            <Text style={styles.noteTitle}>Built as a system, not a gadget</Text>
            <Text style={styles.noteBody}>
              Profiles, schedules, zones and history all connect. Start on your
              phone today; add hardware to the same account later.
            </Text>
          </Card>
        </Page>

        <Page width={width} top={insets.top}>
          <IconBadge>
            <Ear size={26} color={color.onAccent} strokeWidth={2.2} />
          </IconBadge>
          <Text style={type.display}>What this can and cannot do</Text>
          <Honest
            good
            text="Randomised, varied sound beats a single steady tone. Birds habituate to anything predictable."
          />
          <Honest
            good
            text="Distress and predator calls have the best evidence behind them. They are audible — that is the trade-off."
          />
          <Honest
            text="Phone speakers roll off around 18 kHz and Bluetooth around 19 kHz. We show you exactly where your output stops."
          />
          <Honest text="Plenty of people under 30 hear 15–18 kHz. Anything above 17 kHz gets a “guests may hear this” badge." />
          <Honest text="iOS will not run background timers, so phone schedules are reminders with one-tap start. Hardware runs them unattended." />
        </Page>

        <Page width={width} top={insets.top}>
          <IconBadge>
            <Radio size={26} color={color.onAccent} strokeWidth={2.2} />
          </IconBadge>
          <Text style={type.display}>Pick your output</Text>
          <Text style={styles.lede}>
            You can change this any time on the Deterrent tab.
          </Text>
          <View style={{ gap: space.sm, width: '100%' }}>
            {OUTPUTS.map(({ kind, icon: Icon, hint }) => {
              const selected = output === kind;
              return (
                <Card
                  key={kind}
                  active={selected}
                  onPress={() => setOutput(kind)}
                  accessibilityLabel={`${OUTPUT_LABEL[kind]}. ${hint}`}
                >
                  <View style={styles.outputRow}>
                    <View style={styles.outputIcon}>
                      <Icon
                        size={20}
                        color={selected ? color.teal : color.fgMuted}
                        strokeWidth={2.1}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.outputTitle}>
                        {OUTPUT_LABEL[kind]}
                      </Text>
                      <Text style={styles.outputHint}>{hint}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </Page>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        {page < 2 ? (
          <Button
            label="Continue"
            variant="gradient"
            size="lg"
            onPress={() => goTo(page + 1)}
          />
        ) : (
          <View style={{ gap: space.sm }}>
            <Button
              label="Continue as guest"
              variant="gradient"
              size="lg"
              onPress={finish}
              accessibilityHint="Uses PigeonX on this phone only, on the Free plan"
            />
            <Button
              label="Sign in"
              variant="outline"
              size="md"
              onPress={() => setSignInOpen(true)}
            />
          </View>
        )}
      </View>

      <SignInSheet
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => {
          setSignInOpen(false);
          completeOnboarding();
          router.replace('/');
        }}
      />
    </View>
  );
}

function Page({
  width,
  top,
  children,
}: {
  width: number;
  top: number;
  children: React.ReactNode;
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={[styles.page, { paddingTop: top + space.xl }]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient
      colors={gradient.brand}
      start={gradient.brandStart}
      end={gradient.brandEnd}
      style={styles.badge}
    >
      {children}
    </LinearGradient>
  );
}

function Honest({ text, good = false }: { text: string; good?: boolean }) {
  return (
    <View style={styles.honest}>
      <View
        style={[
          styles.honestDot,
          { backgroundColor: good ? color.teal : color.warning },
        ]}
      />
      <Text style={styles.honestText}>{text}</Text>
    </View>
  );
}

function SignInSheet({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn: () => void;
}) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const setSession = useAccount((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const configured = isSupabaseConfigured();

  const submit = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (err) throw new Error(err.message);
      setSent(true);
      toast.show('Magic link sent — check your email', 'success');
      setSession({ userId: 'pending', email: email.trim() });
      onSignedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the link');
    } finally {
      setBusy(false);
    }
  }, [email, onSignedIn, setSession, toast]);

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}
          >
            <View style={styles.sheetHead}>
              <Text style={type.heading}>Sign in</Text>
              <Touchable
                onPress={onClose}
                accessibilityLabel="Close sign in"
                style={styles.close}
              >
                <X size={20} color={color.fgMuted} strokeWidth={2.2} />
              </Touchable>
            </View>

            {configured ? (
              <>
                <Text style={styles.sheetBody}>
                  We will email you a magic link. No password to remember.
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={color.fgSubtle}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  inputMode="email"
                  style={styles.input}
                  accessibilityLabel="Email address"
                />
                {error ? (
                  <Banner title="Could not send the link" body={error} onRetry={submit} />
                ) : null}
                <Button
                  label={sent ? 'Link sent' : 'Send magic link'}
                  variant="gradient"
                  size="lg"
                  loading={busy}
                  disabled={email.trim().length < 5}
                  onPress={submit}
                />
              </>
            ) : (
              <>
                <Text style={styles.sheetBody}>
                  Sign-in opens when accounts go live. Everything on this phone
                  keeps working in the meantime, and your history moves across
                  when you create an account.
                </Text>
                <Button label="Got it" variant="outline" onPress={onClose} />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  wash: { position: 'absolute', top: 0, left: 0, right: 0 },
  page: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: space.md,
  },
  badge: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  lede: {
    fontFamily: font.body.regular,
    fontSize: 15,
    lineHeight: 23,
    color: color.fgMuted,
  },
  note: { marginTop: space.sm, gap: 6 },
  noteTitle: {
    fontFamily: font.heading.semibold,
    fontSize: 15,
    color: color.fg,
  },
  noteBody: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 21,
    color: color.fgMuted,
  },
  honest: { flexDirection: 'row', gap: space.sm + 2, alignItems: 'flex-start' },
  honestDot: { width: 7, height: 7, borderRadius: 4, marginTop: 8 },
  honestText: {
    flex: 1,
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 22,
    color: color.fgMuted,
  },
  outputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  outputIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outputTitle: {
    fontFamily: font.body.semibold,
    fontSize: 15,
    color: color.fg,
  },
  outputHint: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 19,
    color: color.fgMuted,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.background,
  },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.border,
  },
  dotActive: { backgroundColor: color.teal, width: 20 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(6,10,20,0.72)',
  },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.md,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: { width: 44, alignItems: 'flex-end' },
  sheetBody: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 21,
    color: color.fgMuted,
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    paddingHorizontal: space.md,
    color: color.fg,
    fontFamily: font.body.medium,
    fontSize: 16,
  },
});
