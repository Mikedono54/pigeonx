import React from 'react';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';

import {
  radius,
  readPreference,
  resolveTheme,
  THEME_PREFERENCE_LABEL,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
  type ThemePreference,
} from '../src/theme';

/** The phone's own setting, which `useColorScheme` reads. */
let mockSystemScheme: 'light' | 'dark' = 'light';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockSystemScheme,
}));

function Probe() {
  const { name, preference, c, setPreference } = useTheme();
  return (
    <>
      <Text testID="name">{name}</Text>
      <Text testID="preference">{preference}</Text>
      <Text testID="bg">{c.bg}</Text>
      <Text testID="pick" onPress={() => setPreference('dark')}>
        pick dark
      </Text>
    </>
  );
}

async function mount() {
  const view = await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );
  // let the stored choice come back from the phone
  await act(async () => {});
  return view;
}

describe('which palette the app paints in', () => {
  it('follows the choice when a person picks one', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });

  it('follows the phone when the choice is System', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'light')).toBe('light');
  });

  it('paints light when the phone will not say', () => {
    expect(resolveTheme('system', null)).toBe('light');
    expect(resolveTheme('system', undefined)).toBe('light');
  });

  it('reads a saved choice back, and ignores anything else', () => {
    expect(readPreference('dark')).toBe('dark');
    expect(readPreference('light')).toBe('light');
    expect(readPreference('system')).toBe('system');
    expect(readPreference(null)).toBe('system');
    expect(readPreference('purple')).toBe('system');
  });

  it('offers three choices, each with a word next to it', () => {
    expect(THEME_PREFERENCES).toEqual(['light', 'dark', 'system']);
    for (const p of THEME_PREFERENCES) {
      expect(THEME_PREFERENCE_LABEL[p as ThemePreference]).toMatch(/^[A-Z][a-z]+$/);
    }
  });
});

describe('the theme a screen actually gets', () => {
  beforeEach(async () => {
    mockSystemScheme = 'light';
    await AsyncStorage.removeItem(THEME_STORAGE_KEY);
    jest.clearAllMocks();
  });

  it('starts on System and follows the phone', async () => {
    mockSystemScheme = 'dark';
    const view = await mount();
    expect(view.getByTestId('preference')).toHaveTextContent('system');
    expect(view.getByTestId('name')).toHaveTextContent('dark');
    expect(view.getByTestId('bg')).toHaveTextContent('#0B0C10');
  });

  it('opens the way a person left it', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
    mockSystemScheme = 'light';
    const view = await mount();
    expect(view.getByTestId('name')).toHaveTextContent('dark');
    expect(view.getByTestId('bg')).toHaveTextContent('#0B0C10');
  });

  it('keeps the choice on the phone when it changes', async () => {
    const view = await mount();
    expect(view.getByTestId('name')).toHaveTextContent('light');

    await act(async () => {
      view.getByTestId('pick').props.onPress();
    });

    expect(view.getByTestId('name')).toHaveTextContent('dark');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});

describe('corners', () => {
  it('stay square everywhere', () => {
    for (const value of Object.values(radius)) {
      expect(value).toBe(0);
    }
  });
});
