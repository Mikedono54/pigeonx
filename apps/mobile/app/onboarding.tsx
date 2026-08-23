import { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import {
  Button,
  Pigeon,
  SignInSheet,
  type PigeonPose,
} from '../src/components';
import { useAccount } from '../src/state/useAccount';
import { space, themed, useTheme, useThemedStyles } from '../src/theme';

type Block = 'accent' | 'paper' | 'ink';

const PAGES: {
  block: Block;
  pose: PigeonPose;
  index: string;
  title: string;
  lines: string[];
}[] = [
  {
    block: 'accent',
    pose: 'sit',
    index: '01',
    title: 'Birds leave',
    lines: ['PigeonX plays sounds birds do not like.', 'You press Start.', 'Birds leave.'],
  },
  {
    block: 'paper',
    pose: 'call',
    index: '02',
    title: 'Pick where it plays',
    lines: [
      'Pick where it plays: this phone, a Bluetooth speaker, or a PigeonX speaker.',
      'PigeonX speakers reach the highest pitches.',
    ],
  },
  {
    block: 'ink',
    pose: 'lean',
    index: '03',
    title: 'Some people can hear it',
    lines: ['Some sounds are very high.', 'We mark sounds people can hear.'],
  },
];

export default function Onboarding() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
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

  const paint = (block: Block) =>
    block === 'accent'
      ? { bg: c.accent, fg: c.accentOn, hole: c.accent }
      : block === 'ink'
        ? { bg: c.ink, fg: c.inkOn, hole: c.ink }
        : { bg: c.surface, fg: c.ink, hole: c.surface };

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
        {PAGES.map(({ block, pose, index, title, lines }) => {
          const p = paint(block);
          return (
            <ScrollView
              key={title}
              style={{ width }}
              contentContainerStyle={styles.page}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.hero,
                  { backgroundColor: p.bg, paddingTop: insets.top + space.lg },
                ]}
              >
                <Text style={[styles.index, { color: p.fg }]}>{index}</Text>
                <Pigeon size={92} pose={pose} color={p.fg} holeColor={p.hole} beakColor={c.energy} />
              </View>

              <View style={styles.words}>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.lines}>
                  {lines.map((l) => (
                    <Text key={l} style={styles.line}>
                      {l}
                    </Text>
                  ))}
                </View>
              </View>
            </ScrollView>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.dots}>
          {PAGES.map((p, i) => (
            <View key={p.title} style={[styles.dot, i === page ? styles.dotActive : null]} />
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
            <Button label="Sign in" variant="ghost" onPress={() => setSignInOpen(true)} />
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

const sheet = themed((c, t) => ({
  root: { flex: 1, backgroundColor: c.bg },
  pager: { flex: 1 },
  page: { paddingBottom: space.xl },
  hero: {
    height: 280,
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },
  index: { ...t.index, letterSpacing: 2 },
  words: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md },
  title: { ...t.display },
  lines: { gap: space.sm },
  line: { ...t.body, color: c.text },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.bg,
  },
  footerActions: { gap: space.sm },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 20, height: 4, backgroundColor: c.border },
  dotActive: { backgroundColor: c.accent },
}));
