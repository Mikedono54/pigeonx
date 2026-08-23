import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { font, icon as iconToken, offset, space, themed, useTheme, useThemedStyles } from '../theme';
import type { IconType } from './icon';
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
  /** the drawing itself, for example `Plus`. Never a finished element. */
  icon?: IconType;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 56 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: 15, md: 17, lg: 19 };
const ICON: Record<ButtonSize, number> = {
  sm: iconToken.sm,
  md: iconToken.md,
  lg: iconToken.md,
};

/**
 * Square, flat, one accent, and a hard slab of ink behind it.
 *
 * Primary is a solid accent block. Secondary is the page with an ink edge.
 * Both sit on their shadow and step into it when a finger lands. Ghost is a
 * word on its own, for the thing you probably do not want.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  full = true,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const busy = loading || disabled;
  const height = HEIGHT[size];
  const solid = variant !== 'ghost';

  const face =
    variant === 'primary'
      ? { backgroundColor: c.accent, borderColor: c.accent }
      : variant === 'danger'
        ? { backgroundColor: c.bg, borderColor: c.danger }
        : variant === 'secondary'
          ? { backgroundColor: c.bg, borderColor: c.ink }
          : null;

  const fg =
    variant === 'primary'
      ? c.accentOn
      : variant === 'danger'
        ? c.danger
        : variant === 'ghost'
          ? c.link
          : c.ink;

  return (
    <View
      style={[
        solid ? styles.slot : styles.slotFlat,
        { height: height + (solid ? offset.small : 0) },
        full ? styles.full : styles.hug,
        style,
      ]}
    >
      {solid ? <View style={styles.shadow} /> : null}
      <Touchable
        onPress={busy ? undefined : onPress}
        disabled={busy}
        haptic={variant === 'primary' ? 'medium' : 'light'}
        feel={solid ? 'offset' : 'fade'}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: busy, busy: loading }}
        testID={testID}
        style={styles.press}
      >
        <View style={[styles.face, solid ? styles.bordered : null, face]}>
          {loading ? (
            <ActivityIndicator color={fg} size="small" />
          ) : (
            <View style={styles.row}>
              {Icon ? (
                <Icon size={ICON[size]} color={fg} strokeWidth={iconToken.stroke} />
              ) : null}
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: fg, fontSize: FONT_SIZE[size] },
                  Icon ? styles.afterIcon : null,
                ]}
              >
                {label}
              </Text>
            </View>
          )}
        </View>
      </Touchable>
    </View>
  );
}

const sheet = themed((c) => ({
  slot: { paddingRight: offset.small, paddingBottom: offset.small },
  slotFlat: {},
  full: { width: '100%' },
  hug: { alignSelf: 'flex-start' },
  shadow: {
    position: 'absolute',
    left: offset.small,
    top: offset.small,
    right: 0,
    bottom: 0,
    backgroundColor: c.ink,
  },
  press: { flex: 1, minHeight: 0 },
  face: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  bordered: { borderWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.heading.bold,
    letterSpacing: -0.4,
  },
  afterIcon: { marginLeft: space.sm },
}));
