import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TriangleAlert, Info, RotateCw } from 'lucide-react-native';
import { color, font, radius, space } from '../theme/tokens';
import { Touchable } from './Touchable';

export type BannerTone = 'error' | 'info' | 'warning';

export interface BannerProps {
  tone?: BannerTone;
  title: string;
  body?: string;
  retryLabel?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const TONE = {
  error: { fg: color.danger, bg: 'rgba(248,113,113,0.09)', border: 'rgba(248,113,113,0.32)' },
  warning: { fg: color.warning, bg: 'rgba(251,191,36,0.09)', border: 'rgba(251,191,36,0.30)' },
  info: { fg: color.blue, bg: 'rgba(59,130,246,0.09)', border: 'rgba(59,130,246,0.30)' },
};

/** Inline error surface — the app never uses blocking alerts for failures. */
export function Banner({
  tone = 'error',
  title,
  body,
  retryLabel = 'Try again',
  onRetry,
  onDismiss,
}: BannerProps) {
  const t = TONE[tone];
  const Icon = tone === 'info' ? Info : TriangleAlert;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      <Icon size={18} color={t.fg} strokeWidth={2.2} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: t.fg }]}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      {onRetry ? (
        <Touchable
          onPress={onRetry}
          accessibilityLabel={retryLabel}
          style={styles.retry}
        >
          <RotateCw size={14} color={color.fg} strokeWidth={2.4} />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Touchable>
      ) : null}
      {onDismiss && !onRetry ? (
        <Touchable
          onPress={onDismiss}
          accessibilityLabel="Dismiss"
          style={styles.retry}
        >
          <Text style={styles.retryText}>Dismiss</Text>
        </Touchable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md - 2,
  },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: font.body.semibold, fontSize: 14 },
  body: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.fgMuted,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  retryText: {
    fontFamily: font.body.semibold,
    fontSize: 13,
    color: color.fg,
  },
});
