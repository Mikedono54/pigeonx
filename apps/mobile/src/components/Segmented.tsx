import React from 'react';
import { Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';

import { font, themed, useTheme, useThemedStyles } from '../theme';
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

/** Two or three choices in one bar, each the same width. The one you picked
 *  fills with the accent. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedProps<T>) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  return (
    <View style={styles.wrap} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
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
            style={[styles.item, i > 0 ? styles.divider : null, selected ? styles.itemOn : null]}
          >
            <View style={styles.row}>
              {o.locked ? (
                <Lock size={12} color={selected ? c.accentOn : c.muted} strokeWidth={2} />
              ) : null}
              <Text
                numberOfLines={1}
                style={[styles.label, selected ? styles.labelOn : null]}
              >
                {o.label}
              </Text>
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}

const sheet = themed((c) => ({
  wrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: c.ink,
    backgroundColor: c.bg,
  },
  item: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  divider: { borderLeftWidth: 1, borderLeftColor: c.ink },
  itemOn: { backgroundColor: c.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: {
    fontFamily: font.body.semibold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: c.text,
  },
  labelOn: { color: c.accentOn },
}));
