import React from 'react';
import { Text, View } from 'react-native';

import { font, themed, useTheme, useThemedStyles } from '../theme';

export type StatusTone = 'idle' | 'running' | 'scheduled' | 'warning' | 'danger';

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
  /** legacy leading marker, now a small square */
  dot?: boolean;
  /** kept for callers; every tag renders in the mono face */
  mono?: boolean;
}

/** A square tag with a small label: OFF, PLAYING 12:40, STARTS 6:00 PM. */
export function StatusPill({ label, tone = 'idle', dot = false }: StatusPillProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  const paint: Record<StatusTone, { fg: string; bg: string; border: string }> = {
    idle: { fg: c.muted, bg: c.surface, border: c.border },
    running: { fg: c.accentOn, bg: c.accent, border: c.accent },
    scheduled: { fg: c.ink, bg: c.bg, border: c.ink },
    warning: { fg: c.text, bg: c.bg, border: c.warning },
    danger: { fg: c.danger, bg: c.bg, border: c.danger },
  };
  const p = paint[tone];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.tag, { backgroundColor: p.bg, borderColor: p.border }]}
    >
      {tone === 'warning' ? <View style={styles.warnMark} /> : null}
      {dot ? <View style={[styles.dot, { backgroundColor: p.fg }]} /> : null}
      <Text style={[styles.label, { color: p.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const sheet = themed((c) => ({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 5,
  },
  dot: { width: 5, height: 5 },
  warnMark: { width: 4, height: 12, backgroundColor: c.warning },
  label: {
    fontFamily: font.mono.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
}));
