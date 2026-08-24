import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, LayoutGrid } from 'lucide-react-native';

import {
  Button,
  Screen,
  SectionHeader,
  Sheet,
  StatusPill,
  TextField,
  Touchable,
  useToast,
} from '../src/components';
import { createBusiness, refreshBusiness } from '../src/services/business';
import { useAccount } from '../src/state/useAccount';
import { icon, space, themed, useTheme, useThemedStyles } from '../src/theme';

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
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
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
            <ChevronLeft size={icon.lg} color={c.ink} strokeWidth={icon.stroke} />
          </Touchable>
          <Text style={styles.headTitle}>For businesses</Text>
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
              <LayoutGrid size={icon.sm} color={c.muted} strokeWidth={icon.stroke} />
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
            <View key={t} style={styles.lineRow}>
              <View style={styles.lineMark} />
              <Text style={styles.line}>{t}</Text>
            </View>
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
          size="lg"
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
        <TextField
          label="Name"
          hint="The name your team knows. Like Main Street Property."
          value={name}
          onChangeText={setName}
          placeholder="Main Street Property"
          accessibilityLabel="Business name"
        />
      </Sheet>
    </Screen>
  );
}

const sheet = themed((c, t) => ({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  back: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headTitle: { ...t.title, flex: 1 },
  lede: { ...t.body, color: c.text },
  section: { marginTop: space.lg },
  sample: { borderWidth: 1, borderColor: c.border },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.sm + 4,
  },
  sampleDivider: { borderTopWidth: 1, borderTopColor: c.border },
  areaName: { ...t.subheading, flex: 1 },
  lines: { gap: 10 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  lineMark: { width: 10, height: 3, marginTop: 9, backgroundColor: c.accent },
  line: { ...t.label, flex: 1, fontSize: 15, lineHeight: 21 },
  action: { marginTop: space.xl, gap: space.sm },
}));
