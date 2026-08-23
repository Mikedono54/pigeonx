import React from 'react';
import { ActivityIndicator, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  font,
  icon as iconToken,
  offset,
  space,
  themed,
  useTheme,
  useThemedStyles,
} from '../theme';
import type { IconType } from './icon';
import { Touchable } from './Touchable';

export type BlockTone = 'accent' | 'ink' | 'danger' | 'plain';

export interface BlockButtonProps {
  label: string;
  onPress?: () => void;
  tone?: BlockTone;
  /** the big one on Home is 64pt tall. Everything else is 56. */
  tall?: boolean;
  loading?: boolean;
  disabled?: boolean;
  /** the drawing itself, for example `Play`. Never a finished element. */
  icon?: IconType;
  /** one short line under the label */
  hint?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * The tactile block.
 *
 * A square face with a solid slab of ink sitting four points down and right of
 * it. Press it and the face steps into the slab, so it reads like a real
 * button going down. Nothing around it moves. No blur, no glow, no corner.
 */
export function BlockButton({
  label,
  onPress,
  tone = 'accent',
  tall = false,
  loading = false,
  disabled = false,
  icon: Icon,
  hint,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: BlockButtonProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const busy = loading || disabled;

  const face =
    tone === 'accent'
      ? { backgroundColor: c.accent, borderColor: c.accent }
      : tone === 'ink'
        ? { backgroundColor: c.ink, borderColor: c.ink }
        : tone === 'danger'
          ? { backgroundColor: c.danger, borderColor: c.danger }
          : { backgroundColor: c.bg, borderColor: c.ink };

  const fg = tone === 'plain' ? c.ink : tone === 'ink' ? c.inkOn : c.accentOn;

  return (
    <View style={[styles.slot, tall ? styles.slotTall : null, style]}>
      <View style={styles.shadow} />
      <Touchable
        onPress={busy ? undefined : onPress}
        disabled={busy}
        haptic="medium"
        feel="offset"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: busy, busy: loading }}
        testID={testID}
        style={styles.press}
      >
        <View style={[styles.face, face]}>
          {loading ? (
            <ActivityIndicator color={fg} size="small" />
          ) : (
            <>
              <View style={styles.row}>
                {Icon ? (
                  <Icon size={iconToken.lg} color={fg} strokeWidth={iconToken.stroke} />
                ) : null}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    tall ? styles.labelTall : null,
                    { color: fg },
                    Icon ? styles.labelAfterIcon : null,
                  ]}
                >
                  {label}
                </Text>
              </View>
              {hint ? (
                <Text numberOfLines={1} style={[styles.hint, { color: fg }]}>
                  {hint}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </Touchable>
    </View>
  );
}

const sheet = themed((c) => ({
  slot: {
    height: 56 + offset.rest,
    paddingRight: offset.rest,
    paddingBottom: offset.rest,
  },
  slotTall: { height: 64 + offset.rest },
  shadow: {
    position: 'absolute',
    left: offset.rest,
    top: offset.rest,
    right: 0,
    bottom: 0,
    backgroundColor: c.ink,
  },
  press: { flex: 1, minHeight: 0 },
  face: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.heading.extrabold,
    fontSize: 19,
    letterSpacing: -0.4,
  },
  labelTall: { fontSize: 22, letterSpacing: -0.6 },
  labelAfterIcon: { marginLeft: space.sm },
  hint: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
}));

export default BlockButton;
