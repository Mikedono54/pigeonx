import React from 'react';
import { Text, View } from 'react-native';

import { AUDIBLE_TAG } from '../core/profiles';
import { font, space, themed, useThemedStyles } from '../theme';
import { Sheet } from './Sheet';
import { Touchable } from './Touchable';

/** What the app says when someone asks what the tag means. */
export const AUDIBLE_TITLE = 'Audible sounds';
export const AUDIBLE_EXPLAINER =
  'This sound is within human hearing range. Guests nearby may hear it.';

export interface AudibleChipProps {
  /** opens the explainer. Every chip on a screen opens the same one. */
  onPress?: () => void;
}

/**
 * The one place yellow is allowed on a row.
 *
 * A small dot and one word, on the same bordered chip every other tag uses.
 * It is tappable, because a warning nobody can question is just decoration.
 */
export function AudibleChip({ onPress }: AudibleChipProps) {
  const styles = useThemedStyles(sheet);

  const body = (
    <View style={styles.tag}>
      <View style={styles.dot} />
      <Text style={styles.label}>{AUDIBLE_TAG}</Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Touchable
      onPress={onPress}
      haptic="selection"
      accessibilityLabel={`${AUDIBLE_TAG}. ${AUDIBLE_EXPLAINER}`}
      accessibilityHint="Explains what audible means"
      style={styles.press}
    >
      {body}
    </Touchable>
  );
}

/** The panel every audible chip on a screen opens. One per screen. */
export function AudibleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const styles = useThemedStyles(sheet);
  return (
    <Sheet open={open} title={AUDIBLE_TITLE} onClose={onClose}>
      <Text style={styles.body}>{AUDIBLE_EXPLAINER}</Text>
    </Sheet>
  );
}

const sheet = themed((c, t) => ({
  press: { minHeight: 0, alignSelf: 'flex-start' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bg,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 5,
  },
  dot: { width: 6, height: 6, backgroundColor: c.warning },
  label: {
    fontFamily: font.mono.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.text,
  },
  body: { ...t.body, color: c.text, marginBottom: space.sm },
}));
