import React from 'react';
import { Text, View } from 'react-native';
import RNSlider from '@react-native-community/slider';

import { font, space, themed, useTheme, useThemedStyles } from '../theme';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  /** right-hand readout, for example "High", set in the mono face */
  readout?: string;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** One number, moved by a thumb, with the word for it on the right. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  readout,
  disabled,
  accessibilityHint,
}: SliderProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        {readout ? <Text style={styles.readout}>{readout}</Text> : null}
      </View>
      <RNSlider
        style={styles.slider}
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        disabled={disabled}
        onValueChange={onChange}
        onSlidingComplete={onCommit ?? onChange}
        minimumTrackTintColor={c.accent}
        maximumTrackTintColor={c.border}
        thumbTintColor={c.accent}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
    </View>
  );
}

const sheet = themed((c) => ({
  wrap: { gap: space.xs },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  label: {
    flex: 1,
    fontFamily: font.body.semibold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: c.text,
  },
  readout: {
    fontFamily: font.mono.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: c.ink,
  },
  slider: { width: '100%', height: 40 },
}));
