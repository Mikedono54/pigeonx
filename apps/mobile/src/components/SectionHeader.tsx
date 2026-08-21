import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Touchable } from './Touchable';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={type.heading}>{title}</Text>
        {subtitle ? (
          <Text style={[type.body, styles.subtitle]}>{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Touchable onPress={onAction} accessibilityLabel={actionLabel}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Touchable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: space.sm + 2,
    gap: space.md,
  },
  text: { flex: 1, gap: 2 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  action: {
    color: color.accent,
    fontSize: 14,
    fontFamily: font.body.semibold,
  },
});
