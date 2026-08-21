import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, radius, space } from '../theme/tokens';
import { Touchable } from './Touchable';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** raises the surface a level and warms the border */
  elevated?: boolean;
  /** soft teal glow — reserve it for the one thing that is live right now */
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
        elevated && { backgroundColor: color.elevated },
        padded && { padding: space.md },
        active && styles.active,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  active: {
    borderColor: color.teal,
    shadowColor: color.teal,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  press: { minHeight: 0 },
});
