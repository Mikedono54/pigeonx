import React from 'react';
import { ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, themed, useThemedStyles } from '../theme';
import { Dock, DOCK_HEIGHT } from './Dock';

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Scrolls on sub-screens. Tab screens pass false and fit one screen. */
  scroll?: boolean;
  /** extra bottom padding so nothing hides behind the tab bar */
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
  /** the right hand slot in the title row, usually a status tag */
  headerRight?: React.ReactNode;
  /**
   * The one action the screen is built around, pinned along the bottom.
   *
   * A scrolling screen makes room for it on its own. A screen that lays out
   * its own list passes `dockClearance(insets.bottom)` to that list instead,
   * so the list runs under the dock rather than stopping short of it.
   */
  dock?: React.ReactNode;
}

/**
 * The frame every screen sits in: safe areas top and bottom, one gutter, one
 * title. Sub-screens scroll. Tab screens do not, so the thing you came to
 * press is always in the same place.
 */
export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  bottomInset = 0,
  contentStyle,
  header,
  headerRight,
  dock,
}: ScreenProps) {
  const styles = useThemedStyles(sheet);
  const insets = useSafeAreaInsets();

  const head =
    title || header ? (
      <View style={styles.head}>
        {title ? (
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {headerRight}
          </View>
        ) : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {header}
      </View>
    ) : null;

  // A docked scrolling screen leaves the dock's whole height under its last
  // line. A docked fixed screen leaves nothing at all, because its own list
  // runs under the dock and stopping short would only waste the room.
  const bottom = dock
    ? scroll
      ? insets.bottom + space.md + bottomInset + DOCK_HEIGHT + space.md
      : 0
    : insets.bottom + space.md + bottomInset;

  const padding = {
    paddingTop: insets.top + space.sm,
    paddingBottom: bottom,
    paddingHorizontal: space.md,
  };

  const body = !scroll ? (
    <View style={[styles.root, padding, contentStyle]}>
      {head}
      {children}
    </View>
  ) : (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.measure, padding, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {head}
      {children}
    </ScrollView>
  );

  if (!dock) return body;

  return (
    <View style={styles.root}>
      {body}
      <Dock>{dock}</Dock>
    </View>
  );
}

const sheet = themed((c, t) => ({
  root: { flex: 1, backgroundColor: c.bg },
  /** long text stops widening on a tablet, so a line stays readable */
  measure: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  head: { marginBottom: space.md, gap: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  title: { ...t.title, flexShrink: 1 },
  subtitle: { ...t.bodySmall },
}));
