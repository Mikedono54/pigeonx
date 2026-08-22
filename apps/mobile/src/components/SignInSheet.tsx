import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { useAccount } from '../state/useAccount';
import { color, font, space } from '../theme/tokens';
import { Banner } from './Banner';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

export interface SignInSheetProps {
  open: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
}

/** Email link sign-in. No password to remember. */
export function SignInSheet({ open, onClose, onSignedIn }: SignInSheetProps) {
  const toast = useToast();
  const setSession = useAccount((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState(false);

  const ready = isSupabaseConfigured();

  const submit = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setFailed(false);
    try {
      const { error } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw new Error(error.message);
      setSent(true);
      toast.show('We sent you a link. Check your email.', 'success');
      setSession({ userId: 'pending', email: email.trim() });
      onSignedIn?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [email, onSignedIn, setSession, toast]);

  return (
    <Sheet open={open} title="Sign in" onClose={onClose}>
      {ready ? (
        <>
          <Text style={styles.body}>
            Type your email. We send you a link. No password.
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
            accessibilityLabel="Your email"
          />
          {failed ? (
            <Banner
              title="That didn't work"
              body="Try again."
              onRetry={submit}
            />
          ) : null}
          <Button
            label={sent ? 'Link sent' : 'Send me the link'}
            size="lg"
            loading={busy}
            disabled={email.trim().length < 5}
            onPress={submit}
          />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            Sign in opens later. This phone works now. What you play here moves
            over when you make an account.
          </Text>
          <Button label="Got it" variant="secondary" onPress={onClose} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
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
