import React from 'react';
import { Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';

import { icon as iconToken, space, themed, useTheme, useThemedStyles } from '../theme';
import type { IconType } from './icon';
import { Touchable } from './Touchable';

export interface ListRowProps {
  title: string;
  /** one plain line under the title */
  meta?: string;
  /** the drawing itself, for example `History` */
  icon?: IconType;
  onPress?: () => void;
  /** shows a tick instead of a chevron */
  selected?: boolean;
  /** hides the chevron on rows that go nowhere */
  chevron?: boolean;
  /** the drawing is painted in this colour instead of the ink */
  iconColor?: string;
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
  icon: Icon,
  onPress,
  selected = false,
  chevron = true,
  iconColor,
  right,
  accessibilityLabel,
  children,
}: ListRowProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  const body = (
    <View style={[styles.row, selected ? styles.rowSelected : null]}>
      {Icon ? (
        <View style={styles.iconBox}>
          <Icon
            size={iconToken.md}
            color={iconColor ?? c.ink}
            strokeWidth={iconToken.stroke}
          />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {children}
      </View>
      {right}
      {selected ? (
        <Check size={iconToken.md} color={c.accent} strokeWidth={iconToken.stroke} />
      ) : onPress && chevron ? (
        <ChevronRight size={iconToken.md} color={c.muted} strokeWidth={iconToken.stroke} />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Touchable
      onPress={onPress}
      feel="offset"
      accessibilityLabel={accessibilityLabel ?? `${title}. ${meta ?? ''}`.trim()}
      accessibilityState={{ selected }}
      style={styles.press}
    >
      {body}
    </Touchable>
  );
}

const sheet = themed((c, t) => ({
  press: { minHeight: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    minHeight: 64,
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.sm + 2,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.card,
    marginTop: -1,
  },
  rowSelected: { backgroundColor: c.surface },
  iconBox: { width: 24, alignItems: 'center' },
  text: { flex: 1, gap: 2 },
  title: { ...t.subheading },
  meta: { ...t.bodySmall },
}));
