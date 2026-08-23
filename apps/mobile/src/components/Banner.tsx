import React from 'react';
import { Text, View } from 'react-native';
import { Info, TriangleAlert } from 'lucide-react-native';

import { font, icon, space, themed, useTheme, useThemedStyles } from '../theme';
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

/**
 * Something to say, said in place. The app never stops a person with a box
 * they have to dismiss. A bar of colour down the left says how loud it is.
 */
export function Banner({
  tone = 'error',
  title,
  body,
  retryLabel = 'Try again',
  onRetry,
  onDismiss,
}: BannerProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const mark = tone === 'error' ? c.danger : tone === 'warning' ? c.warning : c.accent;
  const Icon = tone === 'info' ? Info : TriangleAlert;

  return (
    <View accessibilityLiveRegion="polite" style={styles.wrap}>
      <View style={[styles.mark, { backgroundColor: mark }]} />
      <Icon size={icon.md} color={mark} strokeWidth={icon.stroke} style={styles.icon} />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      {onRetry ? (
        <Touchable onPress={onRetry} accessibilityLabel={retryLabel} style={styles.action}>
          <Text style={styles.actionText}>{retryLabel}</Text>
        </Touchable>
      ) : null}
      {onDismiss && !onRetry ? (
        <Touchable onPress={onDismiss} accessibilityLabel="Dismiss" style={styles.action}>
          <Text style={styles.actionText}>Dismiss</Text>
        </Touchable>
      ) : null}
    </View>
  );
}

const sheet = themed((c, t) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm + 2,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingVertical: space.sm + 4,
    paddingRight: space.sm + 4,
    paddingLeft: space.md,
  },
  mark: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  icon: { marginTop: 1 },
  text: { flex: 1, gap: 2 },
  title: { ...t.subheading },
  body: { ...t.bodySmall, color: c.text },
  action: { minHeight: 44, justifyContent: 'center', paddingLeft: space.xs },
  actionText: {
    fontFamily: font.body.semibold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: c.link,
  },
}));
