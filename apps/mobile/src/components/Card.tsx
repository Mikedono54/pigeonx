import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, space } from '../theme/tokens';
import { Touchable } from './Touchable';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** swaps white for the grey surface */
  elevated?: boolean;
  /** marks the one thing that is live right now: ink border, accent rule */
  active?: boolean;
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({
  children,
  style,
  elevated = false,
  active = false,
  padded = true,
  onPress,
  accessibilityLabel,
  testID,
}: CardProps) {
  const body = (
    <View
      style={[
        styles.card,
        elevated ? { backgroundColor: color.surface } : null,
        padded ? { padding: space.md } : null,
        active ? styles.active : null,
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );

  if (!onPress) return body;
  return (
    <Touchable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={styles.press}
    >
      {body}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.card,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: color.border,
  },
  active: { borderColor: color.ink },
  press: { minHeight: 0 },
});
