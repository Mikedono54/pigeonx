import React, { createContext, useCallback, useContext, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, radius, space } from '../theme/tokens';

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
          <Animated.View
            key={t.id}
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(160)}
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              t.tone === 'success' && { borderColor: 'rgba(52,211,153,0.4)' },
              t.tone === 'danger' && { borderColor: 'rgba(248,113,113,0.4)' },
            ]}
          >
            <Text style={styles.text}>{t.text}</Text>
          </Animated.View>
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
    backgroundColor: color.elevated,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  text: {
    color: color.fg,
    fontFamily: font.body.medium,
    fontSize: 14,
    textAlign: 'center',
  },
});
