import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  palettes,
  readPreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Palette,
  type ThemeName,
  type ThemePreference,
} from './themes';
import { makeType, type TypeScale } from './typography';

export interface Theme {
  /** what the phone is painting right now */
  name: ThemeName;
  /** what the person picked in Settings */
  preference: ThemePreference;
  /** the colours */
  c: Palette;
  /** the type scale, already painted in those colours */
  t: TypeScale;
  dark: boolean;
  setPreference: (next: ThemePreference) => void;
}

function build(name: ThemeName): { c: Palette; t: TypeScale } {
  const c = palettes[name];
  return { c, t: makeType(c) };
}

const BUILT: Record<ThemeName, { c: Palette; t: TypeScale }> = {
  light: build('light'),
  dark: build('dark'),
};

const Ctx = createContext<Theme>({
  name: 'light',
  preference: 'system',
  c: BUILT.light.c,
  t: BUILT.light.t,
  dark: false,
  setPreference: () => {},
});

/**
 * Holds the one answer every screen asks: which colours am I painting in?
 *
 * A person picks Light, Dark or System in Settings. System follows the phone.
 * The choice is kept, so the app opens the way they left it.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setStored] = useState<ThemePreference>('system');
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        loaded.current = true;
        setStored(readPreference(raw));
      })
      .catch(() => {
        loaded.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setStored(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
      // the phone would not keep it. The app still looks right until it closes.
    });
  }, []);

  const name = resolveTheme(preference, system === 'dark' ? 'dark' : 'light');

  const value = useMemo<Theme>(
    () => ({
      name,
      preference,
      c: BUILT[name].c,
      t: BUILT[name].t,
      dark: name === 'dark',
      setPreference,
    }),
    [name, preference, setPreference]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Theme {
  return useContext(Ctx);
}

/** Shorthand for the two things almost every component needs. */
export function useColors(): Palette {
  return useContext(Ctx).c;
}

type AnyStyles = StyleSheet.NamedStyles<Record<string, unknown>>;
type SheetFactory<T> = (c: Palette, t: TypeScale) => T;

const cache = new WeakMap<SheetFactory<never>, Partial<Record<ThemeName, unknown>>>();

/**
 * Marks a function as a stylesheet recipe.
 *
 * It does nothing at run time. It is here so the styles inside keep their
 * exact types, the way they do inside `StyleSheet.create`.
 */
export function themed<T extends StyleSheet.NamedStyles<T> | AnyStyles>(
  factory: (c: Palette, t: TypeScale) => T & AnyStyles
): SheetFactory<T> {
  return factory;
}

/**
 * Builds a stylesheet once per palette instead of once per render.
 *
 * Pass a recipe made with `themed()`. The answer is kept, so switching to
 * dark costs one build and nothing after that.
 */
export function useThemedStyles<T>(factory: SheetFactory<T>): T {
  const { name, c, t } = useTheme();
  return useMemo(() => {
    const key = factory as unknown as SheetFactory<never>;
    let byTheme = cache.get(key);
    if (!byTheme) {
      byTheme = {};
      cache.set(key, byTheme);
    }
    const hit = byTheme[name] as T | undefined;
    if (hit) return hit;
    const made = StyleSheet.create(factory(c, t) as AnyStyles) as T;
    byTheme[name] = made;
    return made;
  }, [c, factory, name, t]);
}

export default ThemeProvider;
