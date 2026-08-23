import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, font } from '../theme/tokens';
import { Button } from './Button';
import { Sheet } from './Sheet';

export interface ConfirmSheetProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** One question, one answer. Used before anything a person cannot undo. */
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Keep it',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button
            label={confirmLabel}
            size="lg"
            loading={busy}
            variant={danger ? 'danger' : 'primary'}
            onPress={onConfirm}
          />
          <Button label={cancelLabel} variant="ghost" onPress={onClose} />
        </>
      }
    >
      <Text style={styles.body}>{body}</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: font.body.regular,
    fontSize: 15,
    lineHeight: 21,
    color: color.fg,
  },
});
