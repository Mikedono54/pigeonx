import React from 'react';
import { Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';

import { PLAN_LABEL, type Plan } from '../core/entitlements';
import { font, themed, useTheme, useThemedStyles } from '../theme';

export interface LockBadgeProps {
  plan: Plan;
  /** the lock on its own, for tight corners */
  compact?: boolean;
}

/**
 * Says which plan opens a thing: a plain lock and the plan name, in muted ink.
 *
 * A locked row is not a warning, so nothing here is yellow. Yellow belongs to
 * the audible tag and to real trouble.
 */
export function LockBadge({ plan, compact = false }: LockBadgeProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const label = PLAN_LABEL[plan];

  return (
    <View
      style={[styles.badge, compact ? styles.compact : null]}
      accessibilityRole="text"
      accessibilityLabel={`Needs ${label}`}
    >
      <Lock size={12} color={c.muted} strokeWidth={2} />
      {compact ? null : <Text style={styles.text}>{label}</Text>}
    </View>
  );
}

const sheet = themed((c) => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.border,
  },
  compact: { paddingHorizontal: 4 },
  text: {
    color: c.muted,
    fontFamily: font.mono.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
}));
