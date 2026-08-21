import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, radius, space } from '../theme/tokens';

export type StatusTone = 'idle' | 'running' | 'scheduled' | 'warning' | 'danger';

const TONE: Record<StatusTone, { fg: string; bg: string; border: string }> = {
  idle: {
    fg: color.fgMuted,
    bg: 'rgba(139,151,173,0.10)',
    border: 'rgba(139,151,173,0.22)',
  },
  running: {
    fg: color.teal,
    bg: 'rgba(45,212,191,0.12)',
    border: 'rgba(45,212,191,0.35)',
  },
  scheduled: {
    fg: color.blue,
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
  },
  warning: {
    fg: color.warning,
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.32)',
  },
  danger: {
    fg: color.danger,
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.32)',
  },
};

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
  /** renders a leading dot; on `running` it reads as a live indicator */
  dot?: boolean;
  mono?: boolean;
}

export function StatusPill({
  label,
  tone = 'idle',
  dot = true,
  mono = false,
}: StatusPillProps) {
  const t = TONE[tone];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.pill, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: t.fg }]} /> : null}
      <Text
        style={[
          styles.label,
          { color: t.fg, fontFamily: mono ? font.mono.medium : font.body.semibold },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: space.xs + 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, letterSpacing: 0.3 },
});
