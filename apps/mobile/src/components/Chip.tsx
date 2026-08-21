import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { color, font, radius, space } from '../theme/tokens';
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
  mono = false,
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
          compact && styles.compact,
          selected && styles.selected,
        ]}
      >
        {locked ? (
          <Lock size={11} color={color.warning} strokeWidth={2.5} />
        ) : null}
        <Text
          style={[
            styles.label,
            mono && { fontFamily: font.mono.medium },
            selected && styles.labelSelected,
          ]}
        >
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
    paddingHorizontal: space.md - 2,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  compact: { paddingHorizontal: 12, height: 32 },
  selected: {
    borderColor: color.teal,
    backgroundColor: 'rgba(45,212,191,0.12)',
  },
  label: {
    fontFamily: font.body.semibold,
    fontSize: 13,
    color: color.fgMuted,
    letterSpacing: 0.2,
  },
  labelSelected: { color: color.fg },
});
