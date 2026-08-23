import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  appleSignInAvailable,
  looksLikeEmail,
  sendSignInLink,
  signInWithApple,
} from '../services/auth';
import { isSupabaseConfigured } from '../services/supabase';
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

/** Two ways in: your Apple account, or a link in your email. No password. */
export function SignInSheet({ open, onClose, onSignedIn }: SignInSheetProps) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'apple' | 'email' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [appleReady, setAppleReady] = useState(false);

  const ready = isSupabaseConfigured();

  useEffect(() => {
    let alive = true;
    void appleSignInAvailable().then((ok) => {
      if (alive) setAppleReady(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  const withApple = useCallback(async () => {
    setBusy('apple');
    setProblem(null);
    try {
      const result = await signInWithApple();
      if (result.canceled) return;
      if (!result.ok) {
        setProblem(result.message);
        return;
      }
      toast.show(result.message, 'success');
      onSignedIn?.();
    } finally {
      setBusy(null);
    }
  }, [onSignedIn, toast]);

  const withEmail = useCallback(async () => {
    setBusy('email');
    setProblem(null);
    try {
      const result = await sendSignInLink(email);
      if (!result.ok) {
        setProblem(result.message);
        return;
      }
      setSent(true);
      toast.show(result.message, 'success');
    } finally {
      setBusy(null);
    }
  }, [email, toast]);

  return (
    <Sheet open={open} title="Sign in" onClose={onClose}>
      {ready ? (
        <>
          <Text style={styles.body}>
            Sign in to keep your sounds and your times when you change phones.
          </Text>

          {Platform.OS === 'ios' && appleReady ? (
            <View style={styles.appleWrap}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={0}
                style={styles.appleButton}
                onPress={() => void withApple()}
              />
            </View>
          ) : null}

          <View style={styles.emailBlock}>
            <Text style={styles.label}>Or use your email</Text>
            <TextInput
              value={email}
              onChangeText={(next) => {
                setEmail(next);
                setSent(false);
              }}
              placeholder="you@example.com"
              placeholderTextColor={color.fgSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              inputMode="email"
              style={styles.input}
              accessibilityLabel="Your email"
            />
            <Button
              label={sent ? 'Link sent. Check your email.' : 'Email me a sign-in link'}
              size="lg"
              variant="secondary"
              loading={busy === 'email'}
              disabled={!looksLikeEmail(email) || busy !== null}
              onPress={() => void withEmail()}
            />
          </View>

          {problem ? (
            <Banner
              title="That didn't work"
              body={problem}
              onRetry={() => setProblem(null)}
            />
          ) : null}

          <Text style={styles.fine}>
            You can keep using this phone without signing in.
          </Text>
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
  appleWrap: { marginTop: -space.sm },
  appleButton: { height: 52, width: '100%' },
  emailBlock: { gap: space.sm },
  label: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
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
  fine: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.fgSubtle,
  },
});
