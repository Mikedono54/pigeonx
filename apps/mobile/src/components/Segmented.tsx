import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { color, font, radius } from '../theme/tokens';
import { Touchable } from './Touchable';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  locked?: boolean;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedProps<T>) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Touchable
            key={o.value}
            onPress={() => onChange(o.value)}
            haptic="selection"
            scaleTo={1}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.locked ? `${o.label}, locked` : o.label}
            style={[styles.item, selected && styles.itemSelected]}
          >
            <View style={styles.row}>
              {o.locked ? (
                <Lock size={11} color={color.warning} strokeWidth={2.5} />
              ) : null}
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {o.label}
              </Text>
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    padding: 4,
    gap: 4,
  },
  item: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSelected: {
    backgroundColor: color.elevated,
    borderWidth: 1,
    borderColor: color.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: {
    fontFamily: font.body.semibold,
    fontSize: 13,
    color: color.fgMuted,
  },
  labelSelected: { color: color.fg },
});
