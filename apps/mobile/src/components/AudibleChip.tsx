import React from 'react';
import { Text, View } from 'react-native';

import { AUDIBLE_EXPLAINER, AUDIBLE_LABEL, type AudibleState } from '../core/profiles';
import { font, space, themed, useThemedStyles } from '../theme';
import { Sheet } from './Sheet';
import { Touchable } from './Touchable';

/** What the app says when someone asks what the tag means. */
export const AUDIBLE_TITLE = 'Will people hear it?';

export interface AudibleChipProps {
  /** which of the four things we are willing to say about this sound */
  state: AudibleState;
  /** opens the explainer. Every chip on a screen opens the same one. */
  onPress?: (state: AudibleState) => void;
}

/**
 * The one place yellow is allowed on a row.
 *
 * A small dot and a short label, on the same bordered chip every other tag
 * uses. The dot is only yellow when somebody might actually hear the sound;
 * a sound nothing can play is a plain fact, not a warning. It is tappable,
 * because a warning nobody can question is just decoration.
 */
export function AudibleChip({ state, onPress }: AudibleChipProps) {
  const styles = useThemedStyles(sheet);
  const warn = state === 'audible' || state === 'maybe';

  const body = (
    <View style={styles.tag}>
      <View style={[styles.dot, warn ? styles.dotWarn : styles.dotQuiet]} />
      <Text style={styles.label}>{AUDIBLE_LABEL[state]}</Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Touchable
      onPress={() => onPress(state)}
      haptic="selection"
      accessibilityLabel={`${AUDIBLE_LABEL[state]}. ${AUDIBLE_EXPLAINER[state]}`}
      accessibilityHint="Explains who can hear this sound"
      style={styles.press}
    >
      {body}
    </Touchable>
  );
}

/** The panel every audible chip on a screen opens. One per screen. */
export function AudibleSheet({
  state,
  onClose,
}: {
  /** the sound whose tag was tapped, or null when nothing is open */
  state: AudibleState | null;
  onClose: () => void;
}) {
  const styles = useThemedStyles(sheet);
  return (
    <Sheet open={state != null} title={AUDIBLE_TITLE} onClose={onClose}>
      {state ? (
        <>
          <Text style={styles.heading}>{AUDIBLE_LABEL[state]}</Text>
          <Text style={styles.body}>{AUDIBLE_EXPLAINER[state]}</Text>
        </>
      ) : null}
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
  dot: { width: 6, height: 6 },
  dotWarn: { backgroundColor: c.warning },
  dotQuiet: { backgroundColor: c.muted },
  label: {
    fontFamily: font.mono.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.text,
  },
  heading: { ...t.subheading },
  body: { ...t.body, color: c.text, marginBottom: space.sm },
}));
