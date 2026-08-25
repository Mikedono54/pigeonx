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
  /**
   * Tags shout by default. A tag carrying a unit does not, because `18 kHz`
   * uppercased reads `18 KHZ`, and that is not what a kilohertz is called.
   */
  caps?: boolean;
}

/**
 * The one tag in the app: a small bordered mono chip.
 *
 * Nothing here fills. A fill means "you picked this", and only a `Chip` gets
 * to say that. A tag only ever changes the colour of its edge and its word,
 * so a screen full of tags stays quiet.
 */
export function StatusPill({ label, tone = 'idle', dot = false, caps = true }: StatusPillProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  const paint: Record<StatusTone, { fg: string; border: string }> = {
    idle: { fg: c.muted, border: c.border },
    running: { fg: c.link, border: c.link },
    scheduled: { fg: c.text, border: c.border },
    warning: { fg: c.muted, border: c.border },
    danger: { fg: c.danger, border: c.danger },
  };
  const p = paint[tone];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.tag, { borderColor: p.border }]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: p.fg }]} /> : null}
      <Text
        style={[styles.label, caps ? null : styles.exact, { color: p.fg }]}
        numberOfLines={1}
      >
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
    backgroundColor: c.bg,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 5,
  },
  dot: { width: 5, height: 5 },
  label: {
    fontFamily: font.mono.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  /** said exactly as it is written, units and all */
  exact: { textTransform: 'none', letterSpacing: 0.5 },
}));
