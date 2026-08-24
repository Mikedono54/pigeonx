import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { offset, space, themed, useThemedStyles } from '../theme';

/** The face of one large button, the only thing a dock ever holds. */
export const DOCK_ACTION_HEIGHT = 56;

/** How tall a dock stands, before the safe area under it. */
export const DOCK_HEIGHT = space.md + DOCK_ACTION_HEIGHT + offset.rest + space.md;

/**
 * The room a scrolling list has to leave under its last item so the dock can
 * never sit on top of it: the dock itself, the safe area, and one more gutter.
 *
 * Every screen with a dock passes this to its `contentContainerStyle`.
 */
export function dockClearance(bottomInset: number): number {
  return DOCK_HEIGHT + bottomInset + space.md;
}

export interface DockProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one action a screen is built around, pinned to the bottom of it.
 *
 * It is opaque and it has a hairline along the top, so the list reads as
 * running underneath it rather than being cut off by it.
 */
export function Dock({ children, style }: DockProps) {
  const styles = useThemedStyles(sheet);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.dock, { paddingBottom: insets.bottom + space.md }, style]}>
      {children}
    </View>
  );
}

const sheet = themed((c) => ({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.bg,
  },
}));

export default Dock;
