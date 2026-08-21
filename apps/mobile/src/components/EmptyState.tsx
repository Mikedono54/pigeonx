import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[type.subheading, styles.title]}>{title}</Text>
      <Text style={[type.body, styles.body]}>{body}</Text>
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

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    gap: space.xs,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 0,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', maxWidth: 300 },
  action: { marginTop: space.md, paddingHorizontal: space.lg },
});
