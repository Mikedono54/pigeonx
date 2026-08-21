import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { color, font, space } from '../theme/tokens';
import { Touchable } from './Touchable';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 56 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: 11, md: 13, lg: 14 };

/** The label colour each variant paints its text and icons in. */
export function buttonForeground(variant: ButtonVariant = 'primary'): string {
  if (variant === 'primary') return color.onAccent;
  if (variant === 'danger') return color.danger;
  return color.ink;
}

/**
 * Square, flat, one accent. Primary is a solid accent block, secondary is a
 * hairline ink outline, ghost is text on its own.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  trailingIcon,
  full = true,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const isBusy = loading || disabled;
  const height = HEIGHT[size];
  const fg = buttonForeground(variant);

  return (
    <Touchable
      onPress={isBusy ? undefined : onPress}
      disabled={isBusy}
      haptic={variant === 'primary' ? 'medium' : 'light'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isBusy, busy: loading }}
      testID={testID}
      style={full ? styles.full : undefined}
    >
      <View
        style={[
          styles.shell,
          { height },
          full ? styles.full : null,
          variant === 'primary' ? { backgroundColor: color.accent } : null,
          variant === 'secondary'
            ? { borderWidth: 1, borderColor: color.ink }
            : null,
          variant === 'danger'
            ? { borderWidth: 1, borderColor: color.danger }
            : null,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} size="small" />
        ) : (
          <View style={styles.row}>
            {icon}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: fg, fontSize: FONT_SIZE[size] },
                icon ? { marginLeft: space.sm } : null,
              ]}
            >
              {label}
            </Text>
            {trailingIcon ? (
              <View style={{ marginLeft: space.sm }}>{trailingIcon}</View>
            ) : null}
          </View>
        )}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  full: { width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.mono.medium,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
