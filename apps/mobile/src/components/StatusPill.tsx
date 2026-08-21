import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font } from '../theme/tokens';

export type StatusTone = 'idle' | 'running' | 'scheduled' | 'warning' | 'danger';

const TONE: Record<StatusTone, { fg: string; bg: string; border: string }> = {
  idle: { fg: color.fgMuted, bg: color.surface, border: color.border },
  running: { fg: color.onAccent, bg: color.accent, border: color.accent },
  scheduled: { fg: color.ink, bg: color.background, border: color.ink },
  warning: { fg: color.warning, bg: color.background, border: color.warning },
  danger: { fg: color.danger, bg: color.background, border: color.danger },
};

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
  /** legacy leading marker, now a small square */
  dot?: boolean;
  /** kept for callers; every tag renders in the mono face */
  mono?: boolean;
}

/**
 * A square status tag with a mono label: IDLE, RUNNING 12:40, SCHEDULED 6:00 PM.
 */
export function StatusPill({ label, tone = 'idle', dot = false }: StatusPillProps) {
  const t = TONE[tone];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.tag, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: t.fg }]} /> : null}
      <Text style={[styles.label, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 0,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 0 },
  label: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
