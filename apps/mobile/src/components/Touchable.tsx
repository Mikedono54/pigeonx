import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export interface TouchableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  haptic?: false | 'light' | 'medium' | 'selection';
  children?: React.ReactNode;
}

/**
 * The single press primitive: 44pt minimum target, opacity feedback and a
 * light haptic. No scale, no bounce, so nothing moves under a finger.
 */
export function Touchable({
  style,
  haptic = 'light',
  onPressIn,
  onPress,
  disabled,
  children,
  ...rest
}: TouchableProps) {
  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (e) => {
      if (haptic === 'selection') void Haptics.selectionAsync();
      else if (haptic)
        void Haptics.impactAsync(
          haptic === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light
        );
      onPressIn?.(e);
    },
    [haptic, onPressIn]
  );

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={handlePressIn}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        style,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 44, justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
});
