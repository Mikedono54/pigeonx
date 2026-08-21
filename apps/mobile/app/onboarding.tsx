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
import { router } from 'expo-router';
import { Bird, Ear, Radio, Smartphone, Speaker, Cpu, X } from 'lucide-react-native';

import { Banner, Button, Touchable, useToast } from '../src/components';
import { OUTPUT_LABEL, type OutputKind } from '../src/core/profiles';
import { getSupabase, isSupabaseConfigured } from '../src/services/supabase';
import { useAccount } from '../src/state/useAccount';
import { useSession } from '../src/state/useSession';
import { color, font, space } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

const OUTPUTS: { kind: OutputKind; icon: typeof Smartphone; hint: string }[] = [
  { kind: 'phone', icon: Smartphone, hint: 'Reaches about 18 kHz' },
  { kind: 'bt_speaker', icon: Speaker, hint: 'Reaches about 19 kHz' },
  { kind: 'pigeonx_emitter', icon: Cpu, hint: 'Reaches 25 kHz. Not shipping yet.' },
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
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        style={styles.pager}
      >
        <Page width={width} top={insets.top} index="01">
          <IconBox>
            <Bird size={24} color={color.ink} strokeWidth={1.75} />
          </IconBox>
          <Text style={type.display}>Bird control from your phone</Text>
          <Text style={styles.lede}>Pick a profile, start, stop.</Text>
        </Page>

        <Page width={width} top={insets.top} index="02">
          <IconBox>
            <Ear size={24} color={color.ink} strokeWidth={1.75} />
          </IconBox>
          <Text style={type.display}>What it can and can&apos;t do</Text>
          <Text style={styles.lede}>
            Phone speakers play up to about 18 kHz. Bluetooth speakers about 19
            kHz. PigeonX emitters reach 25 kHz. Profiles above 17 kHz may be
            audible to some guests. Audible bird calls are included because they
            work better than ultrasonic alone.
          </Text>
        </Page>

        <Page width={width} top={insets.top} index="03">
          <IconBox>
            <Radio size={24} color={color.ink} strokeWidth={1.75} />
          </IconBox>
          <Text style={type.display}>Pick your output</Text>
          <Text style={styles.lede}>
            Phone, Bluetooth speaker, or a PigeonX emitter. You can change this
            any time.
          </Text>
          <View style={styles.outputs}>
            {OUTPUTS.map(({ kind, icon: Icon, hint }) => {
              const selected = output === kind;
              return (
                <Touchable
                  key={kind}
                  onPress={() => setOutput(kind)}
                  haptic="selection"
                  accessibilityLabel={`${OUTPUT_LABEL[kind]}. ${hint}`}
                  accessibilityState={{ selected }}
                  style={[
                    styles.outputRow,
                    selected ? styles.outputRowSelected : null,
                  ]}
                >
                  <Icon
                    size={20}
                    color={selected ? color.onAccent : color.ink}
                    strokeWidth={1.75}
                  />
                  <View style={styles.outputText}>
                    <Text
                      style={[
                        styles.outputTitle,
                        selected ? styles.outputInverted : null,
                      ]}
                    >
                      {OUTPUT_LABEL[kind]}
                    </Text>
                    <Text
                      style={[
                        styles.outputHint,
                        selected ? styles.outputInverted : null,
                      ]}
                    >
                      {hint}
                    </Text>
                  </View>
                </Touchable>
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
              style={[styles.dot, i === page ? styles.dotActive : null]}
            />
          ))}
        </View>

        {page < 2 ? (
          <Button label="Continue" size="lg" onPress={() => goTo(page + 1)} />
        ) : (
          <View style={styles.footerActions}>
            <Button
              label="Continue as guest"
              size="lg"
              onPress={finish}
              accessibilityHint="Uses PigeonX on this phone only, on the Free plan"
            />
            <Button
              label="Sign in"
              variant="secondary"
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
  index,
  children,
}: {
  width: number;
  top: number;
  index: string;
  children: React.ReactNode;
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={[styles.page, { paddingTop: top + space.lg }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageIndex}>{index} / 03</Text>
      {children}
    </ScrollView>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return <View style={styles.iconBox}>{children}</View>;
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
      toast.show('Link sent. Check your email.', 'success');
      setSession({ userId: 'pending', email: email.trim() });
      onSignedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The link did not send');
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
                <X size={20} color={color.ink} strokeWidth={1.75} />
              </Touchable>
            </View>

            {configured ? (
              <>
                <Text style={styles.sheetBody}>
                  We email you a link. No password.
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
                  <Banner
                    title="The link did not send"
                    body={error}
                    onRetry={submit}
                  />
                ) : null}
                <Button
                  label={sent ? 'Link sent' : 'Send the link'}
                  size="lg"
                  loading={busy}
                  disabled={email.trim().length < 5}
                  onPress={submit}
                />
              </>
            ) : (
              <>
                <Text style={styles.sheetBody}>
                  Sign-in opens when accounts go live. This phone keeps working
                  until then, and your runs move over when you create an account.
                </Text>
                <Button label="Got it" variant="secondary" onPress={onClose} />
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
  pager: { flex: 1 },
  page: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: space.md,
  },
  pageIndex: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    color: color.fgSubtle,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  lede: {
    fontFamily: font.body.regular,
    fontSize: 16,
    lineHeight: 24,
    color: color.fg,
  },
  outputs: { marginTop: space.sm, borderWidth: 1, borderColor: color.border },
  outputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    minHeight: 64,
    paddingHorizontal: space.sm + 4,
    borderTopWidth: 1,
    borderTopColor: color.border,
    marginTop: -1,
  },
  outputRowSelected: { backgroundColor: color.ink, borderTopColor: color.ink },
  outputText: { flex: 1, gap: 2 },
  outputTitle: {
    fontFamily: font.heading.semibold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: color.ink,
  },
  outputHint: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    color: color.fgMuted,
  },
  outputInverted: { color: color.onAccent },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.background,
  },
  footerActions: { gap: space.sm },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 16, height: 3, backgroundColor: color.border },
  dotActive: { backgroundColor: color.ink },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10,10,10,0.45)',
  },
  sheet: {
    backgroundColor: color.background,
    borderTopWidth: 1,
    borderColor: color.ink,
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
    fontSize: 15,
    lineHeight: 21,
    color: color.fg,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
    paddingHorizontal: space.sm + 4,
    color: color.ink,
    fontFamily: font.body.medium,
    fontSize: 16,
  },
});
