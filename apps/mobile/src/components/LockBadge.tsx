import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { PLAN_LABEL, type Plan } from '../core/entitlements';
import { color, font } from '../theme/tokens';

export interface LockBadgeProps {
  plan: Plan;
  /** icon-only variant for tight corners */
  compact?: boolean;
}

export function LockBadge({ plan, compact = false }: LockBadgeProps) {
  const label = PLAN_LABEL[plan];
  return (
    <View
      style={[styles.badge, compact ? styles.compact : null]}
      accessibilityRole="text"
      accessibilityLabel={`${label} feature, locked`}
    >
      <Lock size={10} color={color.warning} strokeWidth={1.75} />
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
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 0,
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: color.warning,
  },
  compact: { paddingHorizontal: 4 },
  text: {
    color: color.warning,
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
