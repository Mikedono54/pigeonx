import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { getSupabase, isMissingOnServer, plainMessage } from './supabase';

/** Where the email link sends you back to. */
export const AUTH_REDIRECT = 'pigeonx://auth';

export interface AuthOutcome {
  ok: boolean;
  /** One short line for the person. Empty means say nothing. */
  message: string;
  /** true when the person backed out on purpose */
  canceled?: boolean;
}

const NOT_READY: AuthOutcome = {
  ok: false,
  message: 'Sign in is not ready yet. This phone still works.',
};

/* ── the link that comes back from an email ───────────────────────────────── */

export type AuthLink =
  | { kind: 'code'; code: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string };

/**
 * Reads the link the email opens. Supabase can hand back a one-time code, a
 * pair of tokens, or a problem, so all three shapes are read here where a test
 * can see them.
 */
export function parseAuthUrl(url: string | null | undefined): AuthLink | null {
  if (!url) return null;

  const parts = new Map<string, string>();
  const collect = (raw: string) => {
    for (const pair of raw.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const key = eq === -1 ? pair : pair.slice(0, eq);
      const value = eq === -1 ? '' : pair.slice(eq + 1);
      if (!parts.has(key)) {
        try {
          parts.set(key, decodeURIComponent(value.replace(/\+/g, ' ')));
        } catch {
          parts.set(key, value);
        }
      }
    }
  };

  const hash = url.indexOf('#');
  if (hash !== -1) collect(url.slice(hash + 1));
  const query = url.indexOf('?');
  if (query !== -1) collect(url.slice(query + 1, hash === -1 ? undefined : hash));

  if (parts.has('error_description') || parts.has('error')) {
    const raw = parts.get('error_description') ?? parts.get('error') ?? '';
    return { kind: 'error', message: describeLinkProblem(raw) };
  }
  const code = parts.get('code');
  if (code) return { kind: 'code', code };

  const accessToken = parts.get('access_token');
  const refreshToken = parts.get('refresh_token');
  if (accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken };
  }
  return null;
}

export function describeLinkProblem(raw: string): string {
  const text = raw.toLowerCase();
  if (text.includes('expired')) {
    return 'That link ran out. Ask for a new one.';
  }
  if (text.includes('already') || text.includes('used')) {
    return 'That link was already used. Ask for a new one.';
  }
  return "That didn't work. Ask for a new link.";
}

/** Finishes a sign-in from the link the person tapped in their email. */
export async function completeSignInFromUrl(
  url: string | null | undefined
): Promise<AuthOutcome | null> {
  const link = parseAuthUrl(url);
  if (!link) return null;
  if (link.kind === 'error') return { ok: false, message: link.message };

  const sb = getSupabase();
  if (!sb) return NOT_READY;

  if (link.kind === 'code') {
    const { error } = await sb.auth.exchangeCodeForSession(link.code);
    if (error) {
      return { ok: false, message: describeLinkProblem(error.message) };
    }
    return { ok: true, message: 'You are signed in.' };
  }

  const { error } = await sb.auth.setSession({
    access_token: link.accessToken,
    refresh_token: link.refreshToken,
  });
  if (error) return { ok: false, message: describeLinkProblem(error.message) };
  return { ok: true, message: 'You are signed in.' };
}

/* ── Apple ────────────────────────────────────────────────────────────────── */

export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

function randomNonce(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signInWithApple(): Promise<AuthOutcome> {
  const sb = getSupabase();
  if (!sb) return NOT_READY;

  try {
    const rawNonce = randomNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    const token = credential.identityToken;
    if (!token) return { ok: false, message: "That didn't work. Try again." };

    const { error } = await sb.auth.signInWithIdToken({
      provider: 'apple',
      token,
      nonce: rawNonce,
    });
    if (error) return { ok: false, message: plainMessage(error) };
    return { ok: true, message: 'You are signed in.' };
  } catch (e) {
    if (wasCanceled(e)) return { ok: false, message: '', canceled: true };
    return { ok: false, message: "That didn't work. Try again." };
  }
}

function wasCanceled(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code ?? '';
  return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
}

/* ── email link ───────────────────────────────────────────────────────────── */

export function looksLikeEmail(value: string): boolean {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export async function sendSignInLink(email: string): Promise<AuthOutcome> {
  const sb = getSupabase();
  if (!sb) return NOT_READY;
  if (!looksLikeEmail(email)) {
    return { ok: false, message: 'Check the email address and try again.' };
  }

  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true, emailRedirectTo: AUTH_REDIRECT },
  });
  if (error) return { ok: false, message: plainMessage(error) };
  return { ok: true, message: 'We sent you a link. Check your email.' };
}

/* ── leaving ──────────────────────────────────────────────────────────────── */

export async function signOut(): Promise<AuthOutcome> {
  const sb = getSupabase();
  if (!sb) return { ok: true, message: 'Signed out.' };
  const { error } = await sb.auth.signOut();
  if (error) return { ok: false, message: plainMessage(error) };
  return { ok: true, message: 'Signed out.' };
}

/**
 * Apple asks every app that has sign-in to let a person delete the account
 * from inside the app. The server does the work; the phone only asks.
 */
export async function deleteMyAccount(): Promise<AuthOutcome> {
  const sb = getSupabase();
  if (!sb) return NOT_READY;

  const { error } = await sb.rpc('delete_my_account');
  if (error && !isMissingOnServer(error)) {
    return { ok: false, message: plainMessage(error) };
  }
  await sb.auth.signOut();
  if (error) {
    return {
      ok: false,
      message: 'We could not finish that. Write to hello@pigeonx.org and we will do it.',
    };
  }
  return { ok: true, message: 'Your account is gone.' };
}
