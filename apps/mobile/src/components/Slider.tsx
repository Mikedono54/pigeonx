import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import RNSlider from '@react-native-community/slider';
import { color, font, space } from '../theme/tokens';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  /** right-hand readout, for example "17.5 kHz", rendered in the mono face */
  readout?: string;
  disabled?: boolean;
  accessibilityHint?: string;
}

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
        minimumTrackTintColor={color.accent}
        maximumTrackTintColor={color.border}
        thumbTintColor={color.accent}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgMuted,
  },
  readout: {
    fontFamily: font.mono.medium,
    fontSize: 13,
    letterSpacing: 0.5,
    color: color.ink,
  },
  slider: { width: '100%', height: 40 },
});
