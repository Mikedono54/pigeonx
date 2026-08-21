import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { PLAN_LABEL, type Plan } from '../core/entitlements';
import { color, font, radius } from '../theme/tokens';

export interface LockBadgeProps {
  plan: Plan;
  /** icon-only variant for tight corners */
  compact?: boolean;
}

export function LockBadge({ plan, compact = false }: LockBadgeProps) {
  const label = PLAN_LABEL[plan];
  return (
    <View
      style={[styles.badge, compact && styles.compact]}
      accessibilityRole="text"
      accessibilityLabel={`${label} feature, locked`}
    >
      <Lock size={11} color={color.warning} strokeWidth={2.5} />
      {compact ? null : <Text style={styles.text}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.30)',
  },
  compact: { paddingHorizontal: 6 },
  text: {
    color: color.warning,
    fontFamily: font.body.semibold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
