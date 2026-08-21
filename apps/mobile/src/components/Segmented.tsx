import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { color, font } from '../theme/tokens';
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
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <Touchable
            key={o.value}
            onPress={() => onChange(o.value)}
            haptic="selection"
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.locked ? `${o.label}, locked` : o.label}
            style={[
              styles.item,
              i > 0 ? styles.divider : null,
              selected ? styles.itemSelected : null,
            ]}
          >
            <View style={styles.row}>
              {o.locked ? (
                <Lock
                  size={11}
                  color={selected ? color.onAccent : color.warning}
                  strokeWidth={1.75}
                />
              ) : null}
              <Text style={[styles.label, selected ? styles.labelSelected : null]}>
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  item: {
    flex: 1,
    minHeight: 42,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { borderLeftWidth: 1, borderLeftColor: color.border },
  itemSelected: { backgroundColor: color.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgMuted,
  },
  labelSelected: { color: color.onAccent },
});
