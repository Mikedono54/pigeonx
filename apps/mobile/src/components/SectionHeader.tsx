import React from 'react';
import { Text, View } from 'react-native';

import { font, space, themed, useThemedStyles } from '../theme';
import { Touchable } from './Touchable';

export interface SectionHeaderProps {
  title: string;
  /** two digits, drawn ahead of the title: "01 SOUND" */
  index?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

/** A small mono label over a hairline rule, with a blue tick at the start. */
export function SectionHeader({
  title,
  index,
  subtitle,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  const styles = useThemedStyles(sheet);
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.mark} />
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
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const sheet = themed((c, t) => ({
  wrap: {
    marginBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  mark: { width: 10, height: 3, backgroundColor: c.accent },
  title: { ...t.index, flex: 1, color: c.text },
  action: { minHeight: 32, justifyContent: 'center' },
  actionText: {
    fontFamily: font.body.semibold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: c.link,
  },
  subtitle: { ...t.caption, marginTop: 4 },
}));
