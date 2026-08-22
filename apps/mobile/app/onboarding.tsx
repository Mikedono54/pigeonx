import { useCallback, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bird, Ear, Speaker } from 'lucide-react-native';

import { Button, SignInSheet } from '../src/components';
import { useAccount } from '../src/state/useAccount';
import { color, font, space } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

const PAGES = [
  {
    icon: Bird,
    title: 'Birds leave',
    lines: [
      'PigeonX plays sounds birds do not like.',
      'You press Start.',
      'Birds leave.',
    ],
  },
  {
    icon: Speaker,
    title: 'Pick where it plays',
    lines: [
      'Pick where it plays: this phone, a Bluetooth speaker, or a PigeonX speaker.',
      'PigeonX speakers reach the highest pitches.',
    ],
  },
  {
    icon: Ear,
    title: 'Some people can hear it',
    lines: [
      'Some sounds are very high.',
      'Some people can hear them.',
      'We mark those.',
    ],
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [signInOpen, setSignInOpen] = useState(false);

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

  const last = page === PAGES.length - 1;

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
        {PAGES.map(({ icon: Icon, title, lines }) => (
          <ScrollView
            key={title}
            style={{ width }}
            contentContainerStyle={[
              styles.page,
              { paddingTop: insets.top + space.xl },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconBox}>
              <Icon size={24} color={color.ink} strokeWidth={1.75} />
            </View>
            <Text style={type.display}>{title}</Text>
            <View style={styles.lines}>
              {lines.map((l) => (
                <Text key={l} style={styles.line}>
                  {l}
                </Text>
              ))}
            </View>
          </ScrollView>
        ))}
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}
      >
        <View style={styles.dots}>
          {PAGES.map((p, i) => (
            <View
              key={p.title}
              style={[styles.dot, i === page ? styles.dotActive : null]}
            />
          ))}
        </View>

        {last ? (
          <View style={styles.footerActions}>
            <Button
              label="Let's go"
              size="lg"
              onPress={finish}
              accessibilityHint="Starts using PigeonX on this phone, free"
            />
            <Button
              label="Sign in"
              variant="secondary"
              onPress={() => setSignInOpen(true)}
            />
          </View>
        ) : (
          <Button label="Next" size="lg" onPress={() => goTo(page + 1)} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  pager: { flex: 1 },
  page: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: space.md,
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
  lines: { gap: space.sm },
  line: {
    fontFamily: font.body.regular,
    fontSize: 17,
    lineHeight: 25,
    color: color.fg,
  },
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
});
