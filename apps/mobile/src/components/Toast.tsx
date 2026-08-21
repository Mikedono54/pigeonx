import React, { createContext, useCallback, useContext, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, space } from '../theme/tokens';

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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();

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
      <View
        pointerEvents="none"
        style={[styles.host, { bottom: insets.bottom + 96 }]}
      >
        {items.map((t) => (
          <View
            key={t.id}
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              t.tone === 'success' ? { backgroundColor: color.success } : null,
              t.tone === 'danger' ? { backgroundColor: color.danger } : null,
            ]}
          >
            <Text style={styles.text}>{t.text}</Text>
          </View>
        ))}
      </View>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    alignItems: 'center',
    gap: space.sm,
  },
  toast: {
    backgroundColor: color.ink,
    borderRadius: 0,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  text: {
    color: color.onAccent,
    fontFamily: font.body.medium,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
