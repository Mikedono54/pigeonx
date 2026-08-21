import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { color, gradient, radius, space } from '../theme/tokens';
import { font } from '../theme/tokens';
import { Touchable } from './Touchable';

export type ButtonVariant = 'primary' | 'gradient' | 'outline' | 'ghost' | 'danger';
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

const HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 58 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: 14, md: 15, lg: 17 };

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
  const fg =
    variant === 'gradient' || variant === 'primary'
      ? color.onAccent
      : variant === 'danger'
        ? color.danger
        : color.fg;

  const inner = (
    <View style={[styles.row, { height }]}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
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
        </>
      )}
    </View>
  );

  const shell: StyleProp<ViewStyle> = [
    styles.shell,
    { height, borderRadius: size === 'lg' ? radius.lg : radius.md },
    full ? styles.full : null,
    variant === 'primary' && { backgroundColor: color.accent },
    variant === 'outline' && {
      borderWidth: 1,
      borderColor: color.border,
      backgroundColor: color.card,
    },
    variant === 'ghost' && { backgroundColor: 'transparent' },
    variant === 'danger' && {
      borderWidth: 1,
      borderColor: 'rgba(248,113,113,0.35)',
      backgroundColor: 'rgba(248,113,113,0.08)',
    },
    style,
  ];

  return (
    <Touchable
      onPress={isBusy ? undefined : onPress}
      disabled={isBusy}
      haptic={variant === 'gradient' ? 'medium' : 'light'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isBusy, busy: loading }}
      testID={testID}
      style={full ? styles.full : undefined}
    >
      {variant === 'gradient' ? (
        <View style={[shell, styles.glow]}>
          <LinearGradient
            colors={gradient.brand}
            start={gradient.brandStart}
            end={gradient.brandEnd}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: size === 'lg' ? radius.lg : radius.md },
            ]}
          />
          {inner}
        </View>
      ) : (
        <View style={shell}>{inner}</View>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  full: { width: '100%' },
  glow: {
    shadowColor: color.teal,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.body.semibold,
    letterSpacing: 0.2,
  },
});
