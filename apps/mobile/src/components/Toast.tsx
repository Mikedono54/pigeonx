import React, { createContext, useCallback, useContext, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font, space, themed, useTheme, useThemedStyles } from '../theme';

type ToastTone = 'default' | 'success' | 'danger';

interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

interface ToastApi {
  show: (text: string, tone?: ToastTone) => void;
}

const Ctx = createContext<ToastApi>({ show: () => {} });

export function useToast(): ToastApi {
  return useContext(Ctx);
}

let seq = 0;

/**
 * The short line that slides in over the tab bar and goes away on its own.
 * Always the strongest block in the app, with a bar of colour down the side
 * so the news reads without the words.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  const show = useCallback((text: string, tone: ToastTone = 'default') => {
    const id = ++seq;
    setItems((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + 96 }]}>
        {items.map((t) => (
          <View key={t.id} accessibilityLiveRegion="polite" style={styles.toast}>
            <View
              style={[
                styles.mark,
                {
                  backgroundColor:
                    t.tone === 'success' ? c.success : t.tone === 'danger' ? c.danger : c.accent,
                },
              ]}
            />
            <Text style={styles.text}>{t.text}</Text>
          </View>
        ))}
      </View>
    </Ctx.Provider>
  );
}

const sheet = themed((c) => ({
  host: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    alignItems: 'stretch',
    gap: space.sm,
  },
  toast: {
    backgroundColor: c.ink,
    paddingVertical: 12,
    paddingRight: space.md,
    paddingLeft: space.md + 4,
    maxWidth: '100%',
  },
  mark: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  text: {
    color: c.inkOn,
    fontFamily: font.body.medium,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
}));
