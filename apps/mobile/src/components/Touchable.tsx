import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TouchableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** press-in scale; 1 disables the effect */
  scaleTo?: number;
  haptic?: false | 'light' | 'medium' | 'selection';
  children?: React.ReactNode;
}

/**
 * The single press primitive: 44pt minimum target, scale-to-0.97 feedback and
 * a light haptic. Honours the OS "reduce motion" setting.
 */
export function Touchable({
  style,
  scaleTo = 0.97,
  haptic = 'light',
  onPressIn,
  onPress,
  disabled,
  children,
  ...rest
}: TouchableProps) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (e) => {
      if (!reduced && scaleTo !== 1) {
        scale.value = withTiming(scaleTo, { duration: 90 });
      }
      if (haptic === 'selection') void Haptics.selectionAsync();
      else if (haptic)
        void Haptics.impactAsync(
          haptic === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light
        );
      onPressIn?.(e);
    },
    [haptic, onPressIn, reduced, scale, scaleTo]
  );

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 140 });
  }, [scale]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      hitSlop={6}
      style={[styles.base, animatedStyle, style, disabled && styles.disabled]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 44, justifyContent: 'center' },
  disabled: { opacity: 0.45 },
});
