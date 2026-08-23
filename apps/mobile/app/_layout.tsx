import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, router, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';

import * as Linking from 'expo-linking';

import { ToastProvider, useToast } from '../src/components';
import { configureAudioSession } from '../src/audio';
import { completeSignInFromUrl } from '../src/services/auth';
import { acceptInvite, refreshBusiness } from '../src/services/business';
import { askForMoveUp } from '../src/services/guestMigration';
import {
  ACTION_START_NOW,
  ACTION_STOP,
  configureNotifications,
} from '../src/services/notifications';
import { sessionRecorder } from '../src/services/sessionRecorder';
import { getSupabase } from '../src/services/supabase';
import { attachSync } from '../src/services/sync';
import { color } from '../src/theme/tokens';
import { useAccount } from '../src/state/useAccount';
import { useSession } from '../src/state/useSession';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* the splash may already be gone on a fast reload */
});

/** Sub-screens slide in. Nothing fades or scales. */
const STACK_ANIMATION = 'slide_from_right' as const;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InterTight_600SemiBold,
    InterTight_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_500Medium,
  });

  const [hydrated, setHydrated] = useState(
    () => useAccount.persist.hasHydrated?.() ?? false
  );

  useEffect(() => {
    if (hydrated) return;
    const unsub = useAccount.persist.onFinishHydration?.(() =>
      setHydrated(true)
    );
    if (useAccount.persist.hasHydrated?.()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  const ready = (fontsLoaded || !!fontError) && hydrated;

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    void configureAudioSession();
    void configureNotifications();
    const detachEngine = useSession.getState().attach();
    const detachSync = attachSync();
    return () => {
      detachEngine();
      detachSync();
    };
  }, []);

  useNotificationActions();
  useQueueFlush();
  useOnboardingGate(ready);

  if (!ready) return <View style={styles.root} />;

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <AccountWatch />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: color.background },
              animation: STACK_ANIMATION,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="onboarding"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen
              name="paywall"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="history" />
            <Stack.Screen name="for-businesses" />
            <Stack.Screen name="team" />
            <Stack.Screen
              name="speaker"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen
              name="make-a-sound"
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="deterrent" options={{ animation: 'none' }} />
            <Stack.Screen name="profiles" options={{ animation: 'none' }} />
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Watches who is signed in.
 *
 * Two things arrive from outside the app: the link a person taps in their
 * email, and the word from the server that a sign-in worked. Both land here,
 * so every screen can just read `useAccount`.
 */
function AccountWatch() {
  const toast = useToast();
  const setSession = useAccount((s) => s.setSession);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    const { data } = sb.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setSession({
          userId: session.user.id,
          email: session.user.email ?? null,
        });
        if (event === 'SIGNED_IN') {
          void askForMoveUp();
          void refreshBusiness();
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        void refreshBusiness();
      }
    });

    void sb.auth.getSession().then(({ data: current }) => {
      if (current.session?.user) {
        setSession({
          userId: current.session.user.id,
          email: current.session.user.email ?? null,
        });
        void refreshBusiness();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    let alive = true;

    const handle = async (url: string | null) => {
      const result = await completeSignInFromUrl(url);
      if (result?.message && alive) {
        toast.show(result.message, result.ok ? 'success' : 'danger');
      }

      // A link that puts someone on a team carries a token instead.
      const token = inviteToken(url);
      if (!token) return;
      const joined = await acceptInvite(token);
      if (!alive) return;
      toast.show(joined.message, joined.ok ? 'success' : 'danger');
      if (joined.ok) await refreshBusiness();
    };

    void Linking.getInitialURL().then((url) => void handle(url));
    const sub = Linking.addEventListener('url', ({ url }) => void handle(url));

    return () => {
      alive = false;
      sub.remove();
    };
  }, [toast]);

  return null;
}

/** Pulls the join token out of an invite link. */
function inviteToken(url: string | null | undefined): string | null {
  if (!url || !url.includes('token=')) return null;
  const match = /[?&#]token=([^&#]+)/.exec(url);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Sends new people to the welcome screens, once. */
function useOnboardingGate(ready: boolean) {
  const onboarded = useAccount((s) => s.onboarded);
  const segments = useSegments();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!ready || !navState?.key) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboarded && !inOnboarding) router.replace('/onboarding');
    if (onboarded && inOnboarding) router.replace('/');
  }, [navState?.key, onboarded, ready, segments]);
}

/** Wires the reminder Stop and Play now buttons to the sound. */
function useNotificationActions() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const action = response.actionIdentifier;
        const data = response.notification.request.content.data as {
          kind?: string;
          profileId?: string;
        };

        if (action === ACTION_STOP || data?.kind === 'running') {
          void useSession.getState().stop();
          return;
        }
        if (action === ACTION_START_NOW || data?.kind === 'schedule') {
          router.navigate('/');
          void useSession.getState().start({
            profileId: data?.profileId,
            source: 'schedule',
          });
        }
      }
    );
    return () => sub.remove();
  }, []);
}

/** Retries any writes that are still waiting when the app comes back. */
function useQueueFlush() {
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    void sessionRecorder.flush();
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        void sessionRecorder.flush();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
});
