import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, space } from '../theme/tokens';
import { type } from '../theme/typography';

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
}

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  bottomInset = 0,
  contentStyle,
  header,
  headerRight,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const head =
    title || header ? (
      <View style={styles.head}>
        {title ? (
          <View style={styles.titleRow}>
            <Text style={[type.title, styles.title]} numberOfLines={1}>
              {title}
            </Text>
            {headerRight}
          </View>
        ) : null}
        {subtitle ? <Text style={type.body}>{subtitle}</Text> : null}
        {header}
      </View>
    ) : null;

  const padding = {
    paddingTop: insets.top + space.sm,
    paddingBottom: insets.bottom + space.md + bottomInset,
    paddingHorizontal: space.md,
  };

  if (!scroll) {
    return (
      <View style={[styles.root, padding, contentStyle]}>
        {head}
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[padding, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {head}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: { marginBottom: space.md, gap: 6 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  title: { flexShrink: 1 },
});
