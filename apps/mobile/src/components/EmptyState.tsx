import React from 'react';
import { Text, View } from 'react-native';

import { space, themed, useThemedStyles } from '../theme';
import { Button } from './Button';
import { Pigeon } from './Pigeon';

export interface EmptyStateProps {
  title: string;
  body: string;
  /** one more line, in the person's own words about their own place */
  note?: string;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * Where the block sits.
   *
   * Centred is the default and reads as a page with nothing on it. Left puts
   * the bird, the words and the button on one edge, which is what a screen
   * that is about to have a list on it wants: the empty version and the full
   * version start in the same place.
   */
  align?: 'center' | 'left';
}

/** The bird, one line and one button. Nothing else belongs on an empty page. */
export function EmptyState({
  title,
  body,
  note,
  actionLabel,
  onAction,
  align = 'center',
}: EmptyStateProps) {
  const styles = useThemedStyles(sheet);
  const left = align === 'left';

  return (
    <View style={[styles.wrap, left ? styles.wrapLeft : null]}>
      <Pigeon size={52} pose="sit" />
      <Text style={[styles.title, left ? styles.textLeft : null]}>{title}</Text>
      <Text style={[styles.body, left ? styles.textLeft : null]}>{body}</Text>
      {note ? (
        <Text style={[styles.note, left ? styles.textLeft : null]}>{note}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          full={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const sheet = themed((c, t) => ({
  wrap: {
    alignItems: 'center',
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    gap: space.xs,
    backgroundColor: c.surface,
  },
  wrapLeft: { alignItems: 'flex-start' },
  title: { ...t.heading, textAlign: 'center', marginTop: space.sm },
  body: { ...t.bodySmall, textAlign: 'center', maxWidth: 300 },
  note: { ...t.bodySmall, textAlign: 'center', maxWidth: 300, color: c.text },
  textLeft: { textAlign: 'left' },
  action: { marginTop: space.md },
}));
