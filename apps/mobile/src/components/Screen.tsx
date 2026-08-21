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
  /** disables the ScrollView for screens that manage their own list */
  scroll?: boolean;
  /** extra bottom padding so content clears the tab bar and any docked CTA */
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
}

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  bottomInset = 0,
  contentStyle,
  header,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const head =
    title || header ? (
      <View style={styles.head}>
        {title ? (
          <>
            <Text style={type.title}>{title}</Text>
            {subtitle ? (
              <Text style={[type.body, styles.subtitle]}>{subtitle}</Text>
            ) : null}
          </>
        ) : null}
        {header}
      </View>
    ) : null;

  const padding = {
    paddingTop: insets.top + space.sm,
    paddingBottom: insets.bottom + space.xl + bottomInset,
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
  head: { marginBottom: space.lg, gap: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
});
