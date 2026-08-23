import React from 'react';
import { Text, View } from 'react-native';

import { space, themed, useThemedStyles } from '../theme';
import { Button } from './Button';
import { Pigeon } from './Pigeon';

export interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** The bird, one line and one button. Nothing else belongs on an empty page. */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const styles = useThemedStyles(sheet);
  return (
    <View style={styles.wrap}>
      <Pigeon size={52} pose="sit" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          full={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const sheet = themed((c, t) => ({
  wrap: {
    alignItems: 'center',
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    gap: space.xs,
    backgroundColor: c.surface,
  },
  title: { ...t.heading, textAlign: 'center', marginTop: space.sm },
  body: { ...t.bodySmall, textAlign: 'center', maxWidth: 300 },
  action: { marginTop: space.md },
}));
