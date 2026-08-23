import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { offset } from '../theme';

export type PressFeel =
  /** the thing dims. The safe default for rows and links. */
  | 'fade'
  /** the thing steps down and right into its own shadow */
  | 'offset'
  /** nothing, for wrappers that hand the feedback to a child */
  | 'none';

export interface TouchableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  haptic?: false | 'light' | 'medium' | 'selection' | 'success';
  feel?: PressFeel;
  children?: React.ReactNode;
}

/**
 * The single press primitive: 44pt minimum target, a haptic on the way down
 * and one of two looks. Nothing around a pressed thing ever moves.
 */
export function Touchable({
  style,
  haptic = 'light',
  feel = 'fade',
  onPressIn,
  onPress,
  disabled,
  children,
  ...rest
}: TouchableProps) {
  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (e) => {
      if (haptic === 'selection') void Haptics.selectionAsync();
      else if (haptic === 'success')
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        pressed && !disabled && feel === 'fade' ? styles.faded : null,
        pressed && !disabled && feel === 'offset' ? styles.stepped : null,
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
  faded: { opacity: 0.72 },
  stepped: {
    transform: [
      { translateX: offset.small },
      { translateY: offset.small },
    ],
  },
  disabled: { opacity: 0.4 },
});
