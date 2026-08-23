import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { space, themed, useThemedStyles } from '../theme';
import { Touchable } from './Touchable';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** swaps the page for the quiet grey block */
  elevated?: boolean;
  /** marks the one thing that is live right now: an ink edge and a blue rule */
  active?: boolean;
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

/** A square block with a hairline round it. Nothing floats. */
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
  const styles = useThemedStyles(sheet);

  const body = (
    <View
      style={[
        styles.card,
        elevated ? styles.elevated : null,
        padded ? styles.padded : null,
        active ? styles.active : null,
        style,
      ]}
      testID={testID}
    >
      {active ? <View style={styles.rule} /> : null}
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

const sheet = themed((c) => ({
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  elevated: { backgroundColor: c.surface },
  padded: { padding: space.md },
  active: { borderColor: c.ink },
  rule: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: c.accent,
  },
  press: { minHeight: 0 },
}));
