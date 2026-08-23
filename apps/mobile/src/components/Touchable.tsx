import React, { useCallback, useState } from 'react';
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
 *
 * Pressable takes a style written as a function, `({ pressed }) => ...`, and
 * hands it the finger. We cannot use it. NativeWind swaps every Pressable for
 * a wrapper of its own, and that wrapper flattens the style prop: a function
 * comes out the far side as an empty object, so the whole thing loses its
 * size, its fill and its border on a real phone. So we keep the finger here
 * and hand Pressable a plain list of styles instead.
 */
export function Touchable({
  style,
  haptic = 'light',
  feel = 'fade',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  ...rest
}: TouchableProps) {
  const [pressed, setPressed] = useState(false);

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (e) => {
      setPressed(true);
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

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (e) => {
      setPressed(false);
      onPressOut?.(e);
    },
    [onPressOut]
  );

  const down = pressed && !disabled;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.base,
        style,
        down && feel === 'fade' ? styles.faded : null,
        down && feel === 'offset' ? styles.stepped : null,
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
