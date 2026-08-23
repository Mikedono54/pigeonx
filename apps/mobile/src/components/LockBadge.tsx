import React from 'react';
import { Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';

import { PLAN_LABEL, type Plan } from '../core/entitlements';
import { font, icon, themed, useTheme, useThemedStyles } from '../theme';

export interface LockBadgeProps {
  plan: Plan;
  /** the lock on its own, for tight corners */
  compact?: boolean;
}

/** Says which plan opens a thing. A lock, then the word. */
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
      <Lock size={12} color={c.warning} strokeWidth={icon.stroke} />
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
    borderColor: c.warning,
  },
  compact: { paddingHorizontal: 4 },
  text: {
    color: c.text,
    fontFamily: font.mono.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
}));
