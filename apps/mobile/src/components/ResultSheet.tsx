import React from 'react';
import { Text, View } from 'react-native';

import {
  SESSION_RESULTS,
  SESSION_RESULT_LABELS,
  type SessionResult,
} from '../core/personalization';
import { space, themed, useThemedStyles } from '../theme';
import { ListRow } from './ListRow';
import { Sheet } from './Sheet';

/** The one question the app ever asks about a session. */
export const RESULT_QUESTION = 'Did the birds leave?';

export interface ResultSheetProps {
  open: boolean;
  /** what ran, so the question is about something a person remembers */
  sessionName?: string | null;
  placeName?: string | null;
  onAnswer: (result: SessionResult) => void;
  /** waving it away is an answer: we asked, and nobody wants to say */
  onClose: () => void;
}

/**
 * "Did the birds leave?", asked once.
 *
 * Four answers and a way out. Nothing here is optional to close and nothing
 * comes back: closing the panel counts as having been asked, so this is the
 * only time a person sees it for this session. That is the whole reason the
 * summary lines elsewhere in the app are worth anything. They are built from
 * what somebody chose to tell us, not from what we could make them tap.
 */
export function ResultSheet({
  open,
  sessionName,
  placeName,
  onAnswer,
  onClose,
}: ResultSheetProps) {
  const styles = useThemedStyles(sheet);

  const about = [sessionName, placeName].filter(Boolean).join(' at ');

  return (
    <Sheet open={open} title={RESULT_QUESTION} onClose={onClose}>
      {about ? <Text style={styles.about}>{about}</Text> : null}

      <View style={styles.rows}>
        {SESSION_RESULTS.map((r) => (
          <ListRow
            key={r}
            title={SESSION_RESULT_LABELS[r]}
            chevron={false}
            onPress={() => onAnswer(r)}
          />
        ))}
      </View>

      <Text style={styles.note}>
        Answering builds up your own record. We only ever count what you tell us.
      </Text>
    </Sheet>
  );
}

const sheet = themed((c, t) => ({
  about: { ...t.bodySmall, marginTop: -space.sm },
  rows: { borderWidth: 1, borderColor: c.border },
  note: { ...t.caption },
}));

export default ResultSheet;
