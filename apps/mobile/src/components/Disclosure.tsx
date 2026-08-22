import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { color, font, space } from '../theme/tokens';
import { Touchable } from './Touchable';

export interface DisclosureProps {
  label: string;
  open: boolean;
  onToggle: () => void;
  /** short right-hand readout, shown while the panel is closed */
  summary?: string;
  children: React.ReactNode;
}

/** A square row that opens a panel in place. Keeps fine controls out of the way. */
export function Disclosure({
  label,
  open,
  onToggle,
  summary,
  children,
}: DisclosureProps) {
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <View style={styles.wrap}>
      <Touchable
        onPress={onToggle}
        haptic="selection"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        style={styles.row}
      >
        <Text style={styles.label}>{label}</Text>
        {summary && !open ? <Text style={styles.summary}>{summary}</Text> : null}
        <Icon size={16} color={color.ink} strokeWidth={1.75} />
      </Touchable>
      {open ? <View style={styles.panel}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 0,
    backgroundColor: color.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.sm + 4,
  },
  label: {
    flex: 1,
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.ink,
  },
  summary: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: color.fgSubtle,
  },
  panel: {
    borderTopWidth: 1,
    borderTopColor: color.border,
    padding: space.md,
    gap: space.md,
  },
});
