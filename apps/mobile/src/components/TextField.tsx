import React from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { font, space, themed, useTheme, useThemedStyles } from '../theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** the small mono line over the box */
  label?: string;
  /** one plain sentence under the label */
  hint?: string;
}

/**
 * One place to type. Square box, ink edge, the label above it and the reason
 * for it under that. Never a placeholder standing in for a label.
 */
export function TextField({ label, hint, ...rest }: TextFieldProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        placeholderTextColor={c.muted}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const sheet = themed((c, t) => ({
  wrap: { gap: space.sm },
  label: { ...t.overline, color: c.muted },
  hint: { ...t.bodySmall, marginTop: -4 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: c.ink,
    backgroundColor: c.bg,
    paddingHorizontal: space.sm + 4,
    color: c.ink,
    fontFamily: font.body.medium,
    fontSize: 17,
  },
}));
