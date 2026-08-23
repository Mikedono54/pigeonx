import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

/**
 * On a phone, NativeWind swaps every View, Text and Pressable for a wrapper of
 * its own. Jest skips that step, so these tests load it by hand and render the
 * way the phone does. Without this the styles below all look fine in a test
 * and vanish on the device.
 */
require('react-native-css-interop/dist/runtime/components');

import { Button } from '../src/components/Button';
import { Segmented } from '../src/components/Segmented';
import { Touchable } from '../src/components/Touchable';
import { darkPalette, ThemeProvider, type ThemePreference } from '../src/theme';

/** The phone's own setting, which `useColorScheme` reads. */
let mockSystemScheme: 'light' | 'dark' = 'dark';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockSystemScheme,
}));

/** Every style on a node, whether it came as one object or a pile of them. */
function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  if (style && typeof style === 'object') return style as Record<string, unknown>;
  return {};
}

async function paint(node: React.ReactElement) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe('a pressed thing keeps its styles', () => {
  /**
   * NativeWind swaps every Pressable for a wrapper of its own, and that
   * wrapper flattens the `style` prop. A style written as a function comes
   * out as `{}`, so the whole thing loses its size on a real phone. Hand
   * Pressable a plain style and nothing is lost.
   */
  it('keeps the style it was handed', async () => {
    const view = await paint(
      <Touchable style={{ flex: 1, minHeight: 12, backgroundColor: '#123456' }}>
        <Text>press me</Text>
      </Touchable>
    );

    const style = flat((view.toJSON() as any).props.style);
    expect(style.flex).toBe(1);
    expect(style.minHeight).toBe(12);
    expect(style.backgroundColor).toBe('#123456');
  });
});

describe('the block button, painted at night', () => {
  it('paints the face in the accent, not the shadow', async () => {
    const view = await paint(<Button label="Start" testID="start" />);
    const tree = view.toJSON() as any;

    const shadow = tree.children[0];
    const face = tree.children[1].children[0];

    expect(flat(face.props.style).backgroundColor).toBe(darkPalette.accent);
    expect(flat(shadow.props.style).backgroundColor).toBe(darkPalette.shadow);
  });

  it('never paints the shadow in ink, which is near white at night', async () => {
    const view = await paint(<Button label="Start" />);
    const shadow = (view.toJSON() as any).children[0];

    expect(flat(shadow.props.style).backgroundColor).not.toBe(darkPalette.ink);
    expect(flat(shadow.props.style).backgroundColor).toBe('#000000');
  });

  it('gives the face its own height, so the shadow never sizes the button', async () => {
    const view = await paint(<Button label="Start" size="md" />);
    const tree = view.toJSON() as any;
    const face = flat(tree.children[1].children[0].props.style);

    expect(face.position).not.toBe('absolute');
    expect(face.height).toBe(48);
  });

  it('sits the shadow behind the face, four points down and right', async () => {
    const view = await paint(<Button label="Start" />);
    const shadow = flat((view.toJSON() as any).children[0].props.style);

    expect(shadow.position).toBe('absolute');
    expect(shadow.left).toBe(shadow.top);
    expect(shadow.right).toBe(0);
    expect(shadow.bottom).toBe(0);
  });
});

describe('the three ways it can look', () => {
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  it('shows all three words', async () => {
    const view = await paint(
      <Segmented options={options} value="system" onChange={() => {}} />
    );

    expect(view.getByText('Light')).toBeTruthy();
    expect(view.getByText('Dark')).toBeTruthy();
    expect(view.getByText('System')).toBeTruthy();
  });

  it('gives each word an equal share of the bar', async () => {
    const view = await paint(
      <Segmented options={options} value="system" onChange={() => {}} />
    );

    const bar = view.toJSON() as any;
    expect(bar.children).toHaveLength(3);
    for (const segment of bar.children) {
      expect(flat(segment.props.style).flex).toBe(1);
    }
  });

  it('fills the one you picked with the accent', async () => {
    const view = await paint(
      <Segmented options={options} value="dark" onChange={() => {}} />
    );

    const [light, dark] = (view.toJSON() as any).children;
    expect(flat(dark.props.style).backgroundColor).toBe(darkPalette.accent);
    expect(flat(light.props.style).backgroundColor).toBeUndefined();
  });
});

describe('a plain view is left alone', () => {
  it('renders children', async () => {
    const view = await paint(
      <View>
        <Text>hello</Text>
      </View>
    );
    expect(view.getByText('hello')).toBeTruthy();
  });
});
