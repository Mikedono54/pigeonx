import React from 'react';
import { Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';

import { font, offset, space, themed, useTheme, useThemedStyles } from '../theme';
import { Touchable } from './Touchable';

export interface ChipProps {
  label: string;
  selected?: boolean;
  locked?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  mono?: boolean;
  compact?: boolean;
}

/**
 * One choice out of a few. Square, hairline, and it steps into a small shadow
 * when a finger lands on it.
 */
export function Chip({
  label,
  selected = false,
  locked = false,
  onPress,
  accessibilityLabel,
  compact = false,
}: ChipProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  return (
    <View style={styles.slot}>
      <View style={[styles.shadow, selected ? styles.shadowOn : null]} />
      <Touchable
        onPress={onPress}
        haptic="selection"
        feel="offset"
        accessibilityLabel={
          accessibilityLabel ?? (locked ? `${label}, locked` : label)
        }
        accessibilityState={{ selected }}
        style={styles.press}
      >
        <View
          style={[
            styles.chip,
            compact ? styles.compact : null,
            selected ? styles.selected : null,
          ]}
        >
          {locked ? (
            <Lock
              size={12}
              color={selected ? c.accentOn : c.warning}
              strokeWidth={2}
            />
          ) : null}
          <Text style={[styles.label, selected ? styles.labelSelected : null]}>
            {label}
          </Text>
        </View>
      </Touchable>
    </View>
  );
}

const sheet = themed((c) => ({
  slot: { paddingRight: offset.small, paddingBottom: offset.small },
  shadow: {
    position: 'absolute',
    left: offset.small,
    top: offset.small,
    right: 0,
    bottom: 0,
    backgroundColor: c.border,
  },
  shadowOn: { backgroundColor: c.shadow },
  press: { minHeight: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm + 4,
    height: 38,
    borderWidth: 1,
    borderColor: c.ink,
    backgroundColor: c.bg,
  },
  compact: { paddingHorizontal: 10, height: 34 },
  selected: { borderColor: c.accent, backgroundColor: c.accent },
  label: {
    fontFamily: font.body.semibold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: c.text,
  },
  labelSelected: { color: c.accentOn },
}));
