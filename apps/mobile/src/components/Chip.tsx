import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { color, font, space } from '../theme/tokens';
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

export function Chip({
  label,
  selected = false,
  locked = false,
  onPress,
  accessibilityLabel,
  compact = false,
}: ChipProps) {
  return (
    <Touchable
      onPress={onPress}
      haptic="selection"
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
          <Lock size={11} color={selected ? color.onAccent : color.warning} strokeWidth={1.75} />
        ) : null}
        <Text style={[styles.label, selected ? styles.labelSelected : null]}>
          {label}
        </Text>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  press: { minHeight: 44, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space.sm + 4,
    height: 34,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  compact: { paddingHorizontal: 10, height: 30 },
  selected: { borderColor: color.accent, backgroundColor: color.accent },
  label: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgMuted,
  },
  labelSelected: { color: color.onAccent },
});
