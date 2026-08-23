import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { X } from 'lucide-react-native';

import { Button, Segmented, Touchable, useToast } from '../src/components';
import {
  FEATURE_LABEL,
  PLAN_LABEL,
  PRICES,
  requiredPlan,
  type Feature,
} from '../src/core/entitlements';
import {
  BUSINESS_BILLING_URL,
  createPurchases,
  LISTED_PRICES,
  PRIVACY_URL,
  TERMS_URL,
  type ProductId,
  type PurchasePrices,
} from '../src/services/purchases';
import { useAccount } from '../src/state/useAccount';
import { color, font, space } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

const FREE_LINES = [
  'Three sounds',
  'Play for up to 15 minutes at a time',
  'The last 7 days of what played',
];

const PRO_LINES = [
  'All the sounds, including bird alarm calls',
  'Make your own sounds',
  'Schedules',
  'No time limit',
];

const BUSINESS_LINES = [
  'Places',
  'Areas',
  'Speakers',
  'Your team, up to five people',
  'Web dashboard',
];

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ feature?: string }>();
  const setPlan = useAccount((s) => s.setPlan);
  const plan = useAccount((s) => s.plan);

  const [term, setTerm] = useState<'monthly' | 'yearly'>('yearly');
  const [busy, setBusy] = useState(false);
  const [prices, setPrices] = useState<PurchasePrices>(LISTED_PRICES);

  const feature = params.feature as Feature | undefined;
  const purchases = useMemo(() => createPurchases(setPlan), [setPlan]);
  const live = purchases.isLive();

  // Real money, in the money this person's store uses.
  useEffect(() => {
    let alive = true;
    void purchases.prices().then((found) => {
      if (!alive) return;
      setPrices({
        monthly: found.monthly ?? LISTED_PRICES.monthly,
        yearly: found.yearly ?? LISTED_PRICES.yearly,
      });
    });
    return () => {
      alive = false;
    };
  }, [purchases]);

  const monthly = prices.monthly ?? LISTED_PRICES.monthly ?? '';
  const yearly = prices.yearly ?? LISTED_PRICES.yearly ?? '';

  const buy = useCallback(
    async (product: ProductId) => {
      setBusy(true);
      try {
        const result = await purchases.purchase(product);
        if (result.message) {
          toast.show(result.message, result.ok ? 'success' : 'danger');
        }
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
        <Text style={type.title}>Get more sounds and schedules</Text>
        {feature ? (
          <Text style={styles.why}>
            {FEATURE_LABEL[feature]} comes with{' '}
            {PLAN_LABEL[requiredPlan(feature)]}.
          </Text>
        ) : null}

        <PlanCard
          name="Free"
          price="$0"
          note="What you have now"
          lines={FREE_LINES}
          current={plan === 'free'}
        />

        <PlanCard
          name="Pro"
          price={term === 'yearly' ? `${yearly} a year` : `${monthly} a month`}
          note="For one person and one phone"
          lines={PRO_LINES}
          current={plan === 'pro'}
        >
          <Segmented
            value={term}
            onChange={setTerm}
            accessibilityLabel="How often you pay"
            options={[
              { value: 'yearly', label: `${yearly} a year` },
              { value: 'monthly', label: `${monthly} a month` },
            ]}
          />
          <Button
            label="Get Pro"
            size="lg"
            loading={busy}
            onPress={() => buy(term === 'yearly' ? 'pro_yearly' : 'pro_monthly')}
          />
        </PlanCard>

        <PlanCard
          name="Business"
          price={`${PRICES.business.monthly.label} a month for each place`}
          note="For a team looking after buildings"
          lines={BUSINESS_LINES}
          current={plan === 'business' || plan === 'enterprise'}
        >
          <Button
            label="Set up Business on the web"
            size="lg"
            variant="secondary"
            onPress={() => void Linking.openURL(BUSINESS_BILLING_URL)}
            accessibilityHint="Opens PigeonX in your browser"
          />
        </PlanCard>

        <View style={styles.talk}>
          <Text style={styles.talkText}>
            More buildings than that? We will build a price around them.
          </Text>
          <Button
            label="Talk to us"
            variant="secondary"
            onPress={() =>
              void Linking.openURL(
                'mailto:hello@pigeonx.org?subject=PigeonX%20for%20my%20buildings'
              )
            }
          />
        </View>

        <Button
          label="Bring back what I paid for"
          variant="ghost"
          size="sm"
          onPress={async () => {
            const r = await purchases.restore();
            if (r.message) toast.show(r.message, r.ok ? 'success' : 'danger');
          }}
        />

        <View style={styles.legal}>
          <Touchable
            onPress={() => void Linking.openURL(TERMS_URL)}
            accessibilityLabel="Read the rules"
            style={styles.legalLink}
          >
            <Text style={styles.legalText}>The rules</Text>
          </Touchable>
          <Touchable
            onPress={() => void Linking.openURL(PRIVACY_URL)}
            accessibilityLabel="Read what we do with your information"
            style={styles.legalLink}
          >
            <Text style={styles.legalText}>What we keep</Text>
          </Touchable>
        </View>

        {live ? (
          <Text style={styles.fine}>
            You pay through your phone's store. It renews until you stop it.
          </Text>
        ) : (
          <Text style={styles.fine}>
            Test mode. No money moves and no store is connected yet.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function PlanCard({
  name,
  price,
  note,
  lines,
  current,
  children,
}: {
  name: string;
  price: string;
  note: string;
  lines: string[];
  current: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.card, current ? styles.cardCurrent : null]}>
      <View style={styles.cardHead}>
        <Text style={type.heading}>{name}</Text>
        {current ? <Text style={styles.current}>You have this</Text> : null}
      </View>
      <Text style={styles.price}>{price}</Text>
      <Text style={styles.note}>{note}</Text>
      <View style={styles.lines}>
        {lines.map((t) => (
          <Text key={t} style={styles.line}>
            {t}
          </Text>
        ))}
      </View>
      {children}
    </View>
  );
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
  close: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: space.md, gap: space.md },
  why: {
    fontFamily: font.body.regular,
    fontSize: 15,
    lineHeight: 21,
    color: color.fg,
  },
  card: {
    borderWidth: 1,
    borderColor: color.border,
    padding: space.md,
    gap: space.sm,
  },
  cardCurrent: { borderColor: color.ink },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  current: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  price: {
    fontFamily: font.heading.bold,
    fontSize: 24,
    letterSpacing: -0.8,
    color: color.ink,
  },
  note: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.fgMuted,
  },
  lines: { gap: 6, marginVertical: space.xs },
  line: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 20,
    color: color.fg,
  },
  talk: {
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingTop: space.md,
    gap: space.sm,
  },
  talkText: {
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
  legal: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.lg,
  },
  legalLink: { minHeight: 44, justifyContent: 'center' },
  legalText: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.accent,
  },
});
