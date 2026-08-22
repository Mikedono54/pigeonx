import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, LayoutGrid } from 'lucide-react-native';

import { Button, Screen, SectionHeader, StatusPill, Touchable } from '../src/components';
import { color, font, space } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

const SAMPLE_AREAS = [
  { name: 'Roof', status: 'Playing 12:40', tone: 'running' as const },
  { name: 'Loading dock', status: 'Starts 6:00 PM', tone: 'scheduled' as const },
  { name: 'Patio', status: 'Off', tone: 'idle' as const },
];

const WHAT_YOU_GET = [
  'Add every building you look after.',
  'Split each one into areas, like a roof or a patio.',
  'Put a speaker in each area.',
  'Give five people on your team their own sign in.',
  'Watch it all from the web.',
];

export default function ForBusinesses() {
  return (
    <Screen
      header={
        <View style={styles.headRow}>
          <Touchable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            style={styles.back}
          >
            <ChevronLeft size={22} color={color.ink} strokeWidth={1.75} />
          </Touchable>
          <Text style={type.title}>For businesses</Text>
        </View>
      }
    >
      <Text style={styles.lede}>
        Run a roof, a dock and a patio at once. Each one gets its own sound and
        its own times.
      </Text>

      <View style={styles.section}>
        <SectionHeader title="What it looks like" />
        <View style={styles.sample}>
          {SAMPLE_AREAS.map((a, i) => (
            <View
              key={a.name}
              style={[styles.sampleRow, i > 0 ? styles.sampleDivider : null]}
            >
              <LayoutGrid size={16} color={color.fgSubtle} strokeWidth={1.75} />
              <Text style={styles.areaName} numberOfLines={1}>
                {a.name}
              </Text>
              <StatusPill label={a.status} tone={a.tone} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="What you get" />
        <View style={styles.lines}>
          {WHAT_YOU_GET.map((t) => (
            <Text key={t} style={styles.line}>
              {t}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.action}>
        <Button
          label="See the Business plan"
          size="lg"
          onPress={() =>
            router.push({ pathname: '/paywall', params: { tab: 'business' } })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  back: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  lede: {
    fontFamily: font.body.regular,
    fontSize: 15,
    lineHeight: 21,
    color: color.fg,
  },
  section: { marginTop: space.lg },
  sample: { borderWidth: 1, borderColor: color.border },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.sm + 2,
  },
  sampleDivider: { borderTopWidth: 1, borderTopColor: color.border },
  areaName: {
    flex: 1,
    fontFamily: font.heading.semibold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: color.ink,
  },
  lines: { gap: 8 },
  line: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 20,
    color: color.fg,
  },
  action: { marginTop: space.xl },
});
