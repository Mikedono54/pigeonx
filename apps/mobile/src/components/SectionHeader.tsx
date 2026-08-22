import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Touchable } from './Touchable';

export interface SectionHeaderProps {
  title: string;
  /** two digit index, drawn ahead of the title: "01 SOUND" */
  index?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

/** A small label over a hairline rule. */
export function SectionHeader({
  title,
  index,
  subtitle,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>
          {index ? `${index}  ${title}` : title}
        </Text>
        {actionLabel && onAction ? (
          <Touchable
            onPress={onAction}
            accessibilityLabel={actionLabel}
            style={styles.action}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Touchable>
        ) : null}
      </View>
      {subtitle ? (
        <Text style={[type.caption, styles.subtitle]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  title: {
    flex: 1,
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  action: { minHeight: 28, justifyContent: 'center' },
  actionText: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.accent,
  },
  subtitle: { marginTop: 4 },
});
