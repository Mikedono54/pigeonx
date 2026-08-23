import React from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { icon, space, themed, useTheme, useThemedStyles } from '../theme';
import { Touchable } from './Touchable';

export interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** pinned to the bottom, under the scrolling part */
  footer?: React.ReactNode;
}

/**
 * One panel that slides up from the bottom. Every picker in the app uses it.
 * A blue rule across the top says this is the thing you are looking at now.
 */
export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.rule} />
          <View style={styles.head}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Touchable onPress={onClose} accessibilityLabel="Close" style={styles.close}>
              <X size={icon.md} color={c.ink} strokeWidth={icon.stroke} />
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

const sheet = themed((c, t) => ({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: c.scrim,
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: c.bg,
    borderTopWidth: 1,
    borderColor: c.ink,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    gap: space.md,
  },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 4,
    backgroundColor: c.accent,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
  },
  title: { ...t.heading, flex: 1 },
  close: { width: 44, alignItems: 'flex-end' },
  body: { gap: space.lg, paddingBottom: space.sm },
}));
