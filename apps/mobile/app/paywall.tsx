import { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { X } from 'lucide-react-native';

import { Button, Segmented, Touchable, useToast } from '../src/components';
import {
  FEATURE_LABEL,
  PRICES,
  requiredPlan,
  type Feature,
} from '../src/core/entitlements';
import {
  createSandboxPurchases,
  type ProductId,
} from '../src/services/purchases';
import { useAccount } from '../src/state/useAccount';
import { color, font, space } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

type Tab = 'pro' | 'business' | 'enterprise';

const PRO_LINES = [
  'Every system profile',
  'Distress and predator calls',
  'Build your own profiles',
  'Any number of saved profiles',
  'No run time limit',
  'Reminder times with one-tap start',
  'Remembered Bluetooth speakers',
  'Full run history',
];

const BUSINESS_LINES = [
  'Locations, zones and devices',
  'Devices that run a window on their own',
  'Five team members with roles',
  'Web dashboard with live zone status',
];

const ENTERPRISE_LINES = [
  'Every location in one view',
  'Analytics and CSV export',
  'Any number of team members',
  'Priority support and pilot reporting',
];

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ feature?: string; tab?: string }>();
  const setPlan = useAccount((s) => s.setPlan);

  const feature = params.feature as Feature | undefined;
  const initialTab: Tab =
    params.tab === 'business' || params.tab === 'enterprise'
      ? params.tab
      : feature
        ? tabForPlan(requiredPlan(feature))
        : 'pro';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [term, setTerm] = useState<'monthly' | 'yearly'>('yearly');
  const [busy, setBusy] = useState(false);

  const purchases = useMemo(() => createSandboxPurchases(setPlan), [setPlan]);

  const buy = useCallback(
    async (product: ProductId) => {
      setBusy(true);
      try {
        const result = await purchases.purchase(product);
        toast.show(result.message, result.ok ? 'success' : 'danger');
        if (result.ok) router.back();
      } finally {
        setBusy(false);
      }
    },
    [purchases, toast]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.head}>
        <Text style={styles.kicker}>Plans</Text>
        <Touchable
          onPress={() => router.back()}
          accessibilityLabel="Close"
          style={styles.close}
        >
          <X size={20} color={color.ink} strokeWidth={1.75} />
        </Touchable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + space.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {feature ? (
          <Text style={type.title}>
            {FEATURE_LABEL[feature]} needs {planName(requiredPlan(feature))}
          </Text>
        ) : (
          <Text style={type.title}>Pick a plan</Text>
        )}

        <Segmented
          value={tab}
          onChange={setTab}
          accessibilityLabel="Plan"
          options={[
            { value: 'pro', label: 'Pro' },
            { value: 'business', label: 'Business' },
            { value: 'enterprise', label: 'Enterprise' },
          ]}
        />

        {tab === 'pro' ? (
          <>
            <View style={styles.priceRow}>
              <PriceCard
                title="Yearly"
                price={PRICES.pro.yearly.label}
                period="per year"
                selected={term === 'yearly'}
                onPress={() => setTerm('yearly')}
              />
              <PriceCard
                title="Monthly"
                price={PRICES.pro.monthly.label}
                period="per month"
                selected={term === 'monthly'}
                onPress={() => setTerm('monthly')}
              />
            </View>

            <Lines items={PRO_LINES} />

            <Button
              label="Upgrade to Pro"
              size="lg"
              loading={busy}
              onPress={() =>
                buy(term === 'yearly' ? 'pro_yearly' : 'pro_monthly')
              }
            />
            <Text style={styles.fine}>
              Sandbox mode. No payment is taken and no store SDK is running.
            </Text>
          </>
        ) : null}

        {tab === 'business' ? (
          <>
            <View style={styles.bigPrice}>
              <Text style={styles.bigPriceValue}>
                {PRICES.business.monthly.label}
              </Text>
              <Text style={styles.bigPricePeriod}>
                per {PRICES.business.monthly.period}
              </Text>
            </View>
            <Lines items={BUSINESS_LINES} />
            <Button
              label="Set up Business on the web"
              size="lg"
              onPress={() => void Linking.openURL('https://pigeonx.org/app')}
              accessibilityHint="Opens the PigeonX dashboard in your browser"
            />
            <Text style={styles.fine}>
              Business bills per location on the web, so several people can run
              the same property.
            </Text>
          </>
        ) : null}

        {tab === 'enterprise' ? (
          <>
            <View style={styles.bigPrice}>
              <Text style={styles.bigPriceValue}>By portfolio</Text>
              <Text style={styles.bigPricePeriod}>priced per site count</Text>
            </View>
            <Lines items={ENTERPRISE_LINES} />
            <Button
              label="Talk to us"
              size="lg"
              onPress={() =>
                void Linking.openURL(
                  'mailto:hello@pigeonx.org?subject=PigeonX%20Enterprise'
                )
              }
            />
          </>
        ) : null}

        <Button
          label="Restore purchases"
          variant="ghost"
          size="sm"
          onPress={async () => {
            const r = await purchases.restore();
            toast.show(r.message);
          }}
        />
      </ScrollView>
    </View>
  );
}

function PriceCard({
  title,
  price,
  period,
  selected,
  onPress,
}: {
  title: string;
  price: string;
  period: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Touchable
      onPress={onPress}
      haptic="selection"
      accessibilityLabel={`${title}, ${price} ${period}`}
      accessibilityState={{ selected }}
      style={styles.pricePress}
    >
      <View style={[styles.priceCard, selected ? styles.priceSelected : null]}>
        <Text style={[styles.priceTitle, selected ? styles.inverted : null]}>
          {title}
        </Text>
        <Text style={[styles.priceValue, selected ? styles.inverted : null]}>
          {price}
        </Text>
        <Text style={[styles.pricePeriod, selected ? styles.inverted : null]}>
          {period}
        </Text>
      </View>
    </Touchable>
  );
}

function Lines({ items }: { items: string[] }) {
  return (
    <View style={styles.lines}>
      {items.map((t) => (
        <Text key={t} style={styles.line}>
          {t}
        </Text>
      ))}
    </View>
  );
}

function tabForPlan(plan: string): Tab {
  if (plan === 'business') return 'business';
  if (plan === 'enterprise') return 'enterprise';
  return 'pro';
}

function planName(plan: string): string {
  return plan === 'business'
    ? 'Business'
    : plan === 'enterprise'
      ? 'Enterprise'
      : 'Pro';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
  },
  kicker: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  close: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  body: { paddingHorizontal: space.md, gap: space.md },
  priceRow: { flexDirection: 'row' },
  pricePress: { flex: 1, minHeight: 0, marginLeft: -1 },
  priceCard: {
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
    padding: space.md,
    gap: 2,
    minHeight: 104,
  },
  priceSelected: { borderColor: color.ink, backgroundColor: color.ink },
  priceTitle: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  priceValue: {
    fontFamily: font.heading.bold,
    fontSize: 26,
    letterSpacing: -0.8,
    color: color.ink,
  },
  pricePeriod: {
    fontFamily: font.body.regular,
    fontSize: 12,
    color: color.fgMuted,
  },
  inverted: { color: color.onAccent },
  bigPrice: {
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.lg,
  },
  bigPriceValue: {
    fontFamily: font.heading.bold,
    fontSize: 32,
    letterSpacing: -1,
    color: color.ink,
  },
  bigPricePeriod: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgMuted,
  },
  lines: { gap: 8, marginVertical: space.xs },
  line: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 20,
    color: color.fg,
  },
  fine: {
    fontFamily: font.body.regular,
    fontSize: 12,
    lineHeight: 17,
    color: color.fgSubtle,
    textAlign: 'center',
  },
});
