import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TriangleAlert, Info } from 'lucide-react-native';
import { color, font, space } from '../theme/tokens';
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

const TONE: Record<BannerTone, string> = {
  error: color.danger,
  warning: color.warning,
  info: color.ink,
};

/** Inline error surface. The app never uses blocking alerts for failures. */
export function Banner({
  tone = 'error',
  title,
  body,
  retryLabel = 'Try again',
  onRetry,
  onDismiss,
}: BannerProps) {
  const fg = TONE[tone];
  const Icon = tone === 'info' ? Info : TriangleAlert;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { borderColor: fg }]}
    >
      <Icon size={16} color={fg} strokeWidth={1.75} style={styles.icon} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: fg }]}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      {onRetry ? (
        <Touchable
          onPress={onRetry}
          accessibilityLabel={retryLabel}
          style={styles.action}
        >
          <Text style={styles.actionText}>{retryLabel}</Text>
        </Touchable>
      ) : null}
      {onDismiss && !onRetry ? (
        <Touchable
          onPress={onDismiss}
          accessibilityLabel="Dismiss"
          style={styles.action}
        >
          <Text style={styles.actionText}>Dismiss</Text>
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
    borderRadius: 0,
    backgroundColor: color.background,
    padding: space.sm + 4,
  },
  icon: { marginTop: 2 },
  text: { flex: 1, gap: 2 },
  title: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.fg,
  },
  action: { minHeight: 32, justifyContent: 'center', paddingLeft: space.xs },
  actionText: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.accent,
  },
});
