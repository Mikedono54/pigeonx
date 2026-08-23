import React from 'react';
import { Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import { font, icon, space, themed, useTheme, useThemedStyles } from '../theme';
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
export function Disclosure({ label, open, onToggle, summary, children }: DisclosureProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
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
        <Icon size={icon.md} color={c.ink} strokeWidth={icon.stroke} />
      </Touchable>
      {open ? <View style={styles.panel}>{children}</View> : null}
    </View>
  );
}

const sheet = themed((c, t) => ({
  wrap: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.sm + 4,
  },
  label: { ...t.subheading, flex: 1 },
  summary: {
    fontFamily: font.mono.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.muted,
  },
  panel: {
    borderTopWidth: 1,
    borderTopColor: c.border,
    padding: space.md,
    gap: space.md,
  },
}));
