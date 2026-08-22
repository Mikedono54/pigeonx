import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { color, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Touchable } from './Touchable';

export interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** pinned to the bottom, under the scrolling part */
  footer?: React.ReactNode;
}

/** One panel that slides up from the bottom. Every picker in the app uses it. */
export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}
        >
          <View style={styles.head}>
            <Text style={type.heading}>{title}</Text>
            <Touchable
              onPress={onClose}
              accessibilityLabel="Close"
              style={styles.close}
            >
              <X size={20} color={color.ink} strokeWidth={1.75} />
            </Touchable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {children}
          </ScrollView>

          {footer}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10,10,10,0.45)',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: color.background,
    borderTopWidth: 1,
    borderColor: color.ink,
    padding: space.md,
    gap: space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: { width: 44, alignItems: 'flex-end' },
  body: { gap: space.lg, paddingBottom: space.sm },
});
