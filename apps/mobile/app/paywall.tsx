import { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Sparkles, X } from 'lucide-react-native';

import {
  Button,
  Card,
  Segmented,
  Touchable,
  useToast,
} from '../src/components';
import {
  FEATURE_LABEL,
  PRICES,
  requiredPlan,
  type Feature,
} from '../src/core/entitlements';
import { createSandboxPurchases, type ProductId } from '../src/services/purchases';
import { useAccount } from '../src/state/useAccount';
import { color, font, gradient, radius, space } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

type Tab = 'pro' | 'business' | 'enterprise';

const PRO_PERKS = [
  'Every system profile, including distress and predator calls',
  'Build your own profiles — frequency, timing, randomisation',
  'Unlimited saved profiles and unlimited run time',
  'Schedule reminders with one-tap start',
  'Remembered Bluetooth speakers',
  'Full session history, not just the last 7 days',
];

const BUSINESS_PERKS = [
  'Locations, zones and devices',
  'Schedules that a device runs unattended',
  'Up to 5 team members with roles',
  'Web dashboard with live zone status',
];

const ENTERPRISE_PERKS = [
  'Multi-location overview across the whole portfolio',
  'Analytics and CSV export',
  'Unlimited team members',
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
        <View style={{ flex: 1 }} />
        <Touchable
          onPress={() => router.back()}
          accessibilityLabel="Close"
          style={styles.close}
        >
          <X size={20} color={color.fgMuted} strokeWidth={2.2} />
        </Touchable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + space.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={gradient.brand}
          start={gradient.brandStart}
          end={gradient.brandEnd}
          style={styles.badge}
        >
          <Sparkles size={22} color={color.onAccent} strokeWidth={2.3} />
        </LinearGradient>

        <Text style={type.display}>
          {feature ? FEATURE_LABEL[feature] : 'Unlock the whole system'}
        </Text>
        <Text style={styles.lede}>
          {feature
            ? `${FEATURE_LABEL[feature]} is part of ${planName(
                requiredPlan(feature)
              )}. Everything you have set up stays exactly where it is.`
            : 'Profiles, schedules, zones and history all connect. Pick the tier that matches how much you are covering.'}
        </Text>

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
                note="Two months free"
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

            <Perks items={PRO_PERKS} />

            <Button
              label={`Start Pro · ${
                term === 'yearly'
                  ? PRICES.pro.yearly.label
                  : PRICES.pro.monthly.label
              }`}
              variant="gradient"
              size="lg"
              loading={busy}
              onPress={() =>
                buy(term === 'yearly' ? 'pro_yearly' : 'pro_monthly')
              }
            />
            <Text style={styles.fine}>
              Sandbox mode — no payment is taken and no store SDK is running.
              Purchases go live when the RevenueCat keys land.
            </Text>
          </>
        ) : null}

        {tab === 'business' ? (
          <>
            <Card style={styles.bigPrice}>
              <Text style={styles.bigPriceValue}>
                {PRICES.business.monthly.label}
              </Text>
              <Text style={styles.bigPricePeriod}>
                per {PRICES.business.monthly.period}
              </Text>
            </Card>
            <Perks items={BUSINESS_PERKS} />
            <Button
              label="Set up on the web"
              variant="gradient"
              size="lg"
              onPress={() => void Linking.openURL('https://pigeonx.org/app')}
              accessibilityHint="Opens the PigeonX dashboard in your browser"
            />
            <Text style={styles.fine}>
              Business is billed per location through the web dashboard, so
              multiple people can manage the same property.
            </Text>
          </>
        ) : null}

        {tab === 'enterprise' ? (
          <>
            <Card style={styles.bigPrice}>
              <Text style={styles.bigPriceValue}>Let&apos;s talk</Text>
              <Text style={styles.bigPricePeriod}>
                Priced on portfolio size
              </Text>
            </Card>
            <Perks items={ENTERPRISE_PERKS} />
            <Button
              label="Contact sales"
              variant="gradient"
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
  note,
  selected,
  onPress,
}: {
  title: string;
  price: string;
  period: string;
  note?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Touchable
      onPress={onPress}
      haptic="selection"
      accessibilityLabel={`${title}, ${price} ${period}`}
      accessibilityState={{ selected }}
      style={{ flex: 1 }}
    >
      <View style={[styles.priceCard, selected && styles.priceCardSelected]}>
        <Text style={styles.priceTitle}>{title}</Text>
        <Text style={styles.priceValue}>{price}</Text>
        <Text style={styles.pricePeriod}>{period}</Text>
        {note ? <Text style={styles.priceNote}>{note}</Text> : null}
      </View>
    </Touchable>
  );
}

function Perks({ items }: { items: string[] }) {
  return (
    <View style={styles.perks}>
      {items.map((t) => (
        <View key={t} style={styles.perk}>
          <View style={styles.check}>
            <Check size={12} color={color.teal} strokeWidth={3} />
          </View>
          <Text style={styles.perkText}>{t}</Text>
        </View>
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
    ? 'PigeonX Business'
    : plan === 'enterprise'
      ? 'PigeonX Enterprise'
      : 'PigeonX Pro';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: { flexDirection: 'row', paddingHorizontal: space.md },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: space.lg, gap: space.md },
  badge: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lede: {
    fontFamily: font.body.regular,
    fontSize: 15,
    lineHeight: 23,
    color: color.fgMuted,
    marginBottom: space.xs,
  },
  priceRow: { flexDirection: 'row', gap: space.sm },
  priceCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    padding: space.md,
    gap: 2,
    minHeight: 118,
  },
  priceCardSelected: {
    borderColor: color.teal,
    backgroundColor: color.elevated,
    shadowColor: color.teal,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  priceTitle: {
    fontFamily: font.body.medium,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  priceValue: {
    fontFamily: font.heading.bold,
    fontSize: 24,
    color: color.fg,
    letterSpacing: -0.4,
  },
  pricePeriod: {
    fontFamily: font.body.regular,
    fontSize: 12,
    color: color.fgMuted,
  },
  priceNote: {
    marginTop: 4,
    fontFamily: font.body.semibold,
    fontSize: 11,
    color: color.teal,
  },
  bigPrice: { alignItems: 'center', gap: 2, paddingVertical: space.lg },
  bigPriceValue: {
    fontFamily: font.heading.bold,
    fontSize: 34,
    color: color.fg,
    letterSpacing: -0.6,
  },
  bigPricePeriod: {
    fontFamily: font.body.regular,
    fontSize: 13,
    color: color.fgMuted,
  },
  perks: { gap: space.sm + 2, marginVertical: space.sm },
  perk: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(45,212,191,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  perkText: {
    flex: 1,
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 21,
    color: color.fg,
  },
  fine: {
    fontFamily: font.body.regular,
    fontSize: 12,
    lineHeight: 18,
    color: color.fgSubtle,
    textAlign: 'center',
  },
});
