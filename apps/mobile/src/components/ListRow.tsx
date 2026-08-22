import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import { color, font, space } from '../theme/tokens';
import { Touchable } from './Touchable';

export interface ListRowProps {
  title: string;
  /** one plain line under the title */
  meta?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  /** shows a tick instead of a chevron */
  selected?: boolean;
  /** hides the chevron on rows that go nowhere */
  chevron?: boolean;
  /** tags, locks, switches */
  right?: React.ReactNode;
  accessibilityLabel?: string;
  /** children render under the title block, for tags */
  children?: React.ReactNode;
}

/** One tappable line in a bordered list. */
export function ListRow({
  title,
  meta,
  icon,
  onPress,
  selected = false,
  chevron = true,
  right,
  accessibilityLabel,
  children,
}: ListRowProps) {
  const body = (
    <View style={styles.row}>
      {icon}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {children}
      </View>
      {right}
      {selected ? (
        <Check size={18} color={color.accent} strokeWidth={2} />
      ) : onPress && chevron ? (
        <ChevronRight size={16} color={color.fgSubtle} strokeWidth={1.75} />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Touchable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? `${title}. ${meta ?? ''}`.trim()}
      accessibilityState={{ selected }}
      style={styles.press}
    >
      {body}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  press: { minHeight: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    minHeight: 60,
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.sm + 2,
    borderTopWidth: 1,
    borderTopColor: color.border,
    marginTop: -1,
  },
  text: { flex: 1, gap: 3 },
  title: {
    fontFamily: font.heading.semibold,
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.3,
    color: color.ink,
  },
  meta: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 17,
    color: color.fgMuted,
  },
});
