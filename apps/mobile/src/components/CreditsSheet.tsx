import React from 'react';
import { Text, View } from 'react-native';

import { SOUND_CREDITS, SOUND_CREDITS_NOTE } from '../audio/samples';
import { space, themed, useThemedStyles } from '../theme';
import { Sheet } from './Sheet';

/** The one title this panel has, wherever it is opened from. */
export const CREDITS_TITLE = 'Sound credits';

/**
 * Who recorded each bird, and what it is licensed under.
 *
 * One panel, opened from Settings and from the bottom of Sounds, so the
 * answer is never more than a tap from the sound it belongs to.
 */
export function CreditsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const styles = useThemedStyles(sheet);
  return (
    <Sheet open={open} title={CREDITS_TITLE} onClose={onClose}>
      <View style={styles.list}>
        {SOUND_CREDITS.map((credit) => (
          <View key={credit.title} style={styles.credit}>
            <Text style={styles.creditTitle}>{credit.title}</Text>
            {credit.lines.map((line) => (
              <Text key={line} style={styles.creditLine}>
                {line}
              </Text>
            ))}
          </View>
        ))}
        <Text style={styles.creditNote}>{SOUND_CREDITS_NOTE}</Text>
      </View>
    </Sheet>
  );
}

const sheet = themed((c, t) => ({
  list: { gap: space.sm + 2, marginBottom: space.sm },
  credit: { gap: 2 },
  creditTitle: { ...t.subheading },
  creditLine: { ...t.bodySmall },
  creditNote: { ...t.caption, marginTop: space.xs },
}));
