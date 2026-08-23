import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, LayoutGrid } from 'lucide-react-native';

import {
  Button,
  Screen,
  SectionHeader,
  Sheet,
  StatusPill,
  Touchable,
  useToast,
} from '../src/components';
import { createBusiness, refreshBusiness } from '../src/services/business';
import { useAccount } from '../src/state/useAccount';
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
  const toast = useToast();
  const signedIn = useAccount((s) => s.userId) !== null;
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const setUp = useCallback(async () => {
    setBusy(true);
    try {
      const result = await createBusiness(name);
      toast.show(result.message, result.ok ? 'success' : 'danger');
      if (!result.ok) return;
      await refreshBusiness();
      setAsking(false);
      setName('');
      router.replace('/places');
    } finally {
      setBusy(false);
    }
  }, [name, toast]);

  return (
    <Screen
      header={
        <View style={styles.headRow}>
          <Touchable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.back}>
            <ChevronLeft size={22} color={color.ink} strokeWidth={1.75} />
          </Touchable>
          <Text style={type.title}>For businesses</Text>
        </View>
      }
    >
      <Text style={styles.lede}>
        Run a roof, a dock and a patio at once. Each one gets its own sound and its own times.
      </Text>

      <View style={styles.section}>
        <SectionHeader title="What it looks like" />
        <View style={styles.sample}>
          {SAMPLE_AREAS.map((a, i) => (
            <View key={a.name} style={[styles.sampleRow, i > 0 ? styles.sampleDivider : null]}>
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
          label="Create a business"
          size="lg"
          onPress={() => {
            if (!signedIn) {
              toast.show('Sign in first, then set up your business.');
              return;
            }
            setAsking(true);
          }}
        />
        <Button
          label="See the Business plan"
          variant="secondary"
          onPress={() => router.push({ pathname: '/paywall', params: { tab: 'business' } })}
        />
      </View>

      <Sheet
        open={asking}
        title="Create a business"
        onClose={() => setAsking(false)}
        footer={
          <Button
            label="Create it"
            size="lg"
            loading={busy}
            disabled={name.trim().length === 0}
            onPress={() => void setUp()}
          />
        }
      >
        <View style={styles.field}>
          <Text style={styles.hint}>The name your team knows. Like Main Street Property.</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Main Street Property"
            placeholderTextColor={color.fgSubtle}
            style={styles.input}
            accessibilityLabel="Business name"
          />
        </View>
      </Sheet>
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
  action: { marginTop: space.xl, gap: space.sm },
  field: { gap: space.sm },
  hint: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 19,
    color: color.fgMuted,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
    paddingHorizontal: space.sm + 4,
    color: color.ink,
    fontFamily: font.body.medium,
    fontSize: 16,
  },
});
