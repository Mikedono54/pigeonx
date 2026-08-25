import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

/**
 * NativeWind swaps every View, Text and Pressable for a wrapper of its own on
 * a phone. Jest skips that step, so these tests load it by hand and render the
 * way the phone does.
 */
require('react-native-css-interop/dist/runtime/components');

import { ThemeProvider } from '../src/theme';

/** An iPhone SE: the shortest screen the app has to fit, and no home bar. */
const SE_INSETS = { top: 20, bottom: 0, left: 0, right: 0 };
/** A phone with a home indicator, where the bottom inset is real. */
const HOME_BAR_INSETS = { top: 59, bottom: 34, left: 0, right: 0 };

/** What the phone leaves us at the edges. Each test sets it before painting. */
const mockInsets = { current: SE_INSETS };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets.current,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), navigate: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

/** An iPhone SE in points, for anything that measures the window itself. */
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 375, height: 667, scale: 2, fontScale: 1 }),
}));

import Paywall from '../app/paywall';
import Sounds from '../app/(tabs)/sounds';
import MakeASound from '../app/make-a-sound';
import { DOCK_HEIGHT, Sheet } from '../src/components';

interface Node {
  type: string;
  props: Record<string, unknown>;
  children: (Node | string)[] | null;
}

/** Every style on a node, whether it came as one object or a pile of them. */
function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  if (style && typeof style === 'object') return style as Record<string, unknown>;
  return {};
}

function nodes(root: Node | string | null): Node[] {
  if (!root || typeof root === 'string') return [];
  return [root, ...(root.children ?? []).flatMap(nodes)];
}

/** The one scrolling part of a screen. */
function scrollOf(root: Node | string | null): Node {
  const found = nodes(root).find((n) => n.type === 'RCTScrollView');
  if (!found) throw new Error('this screen does not scroll at all');
  return found;
}

/** Every word a person can read under this node. */
function words(root: Node | string | null): string[] {
  if (!root) return [];
  if (typeof root === 'string') return [root];
  return (root.children ?? []).flatMap(words);
}

/**
 * Every style between the root and the first node holding `text`, so a test
 * can ask what is sitting on top of what.
 */
function stylesAbove(
  node: Node | string | null,
  text: string,
  above: Record<string, unknown>[] = []
): Record<string, unknown>[] | null {
  if (!node || typeof node === 'string') return null;
  const here = [...above, flat(node.props.style)];
  for (const child of node.children ?? []) {
    if (typeof child === 'string') {
      if (child.includes(text)) return here;
      continue;
    }
    const found = stylesAbove(child, text, here);
    if (found) return found;
  }
  return null;
}

/** One screen, painted the way the phone paints it, as plain nodes. */
async function paint(node: React.ReactElement): Promise<Node> {
  const view = await render(<ThemeProvider>{node}</ThemeProvider>);
  return view.toJSON() as unknown as Node;
}

const HERO_TITLE = 'Get more sounds and schedules';

describe('the plans screen, on the shortest phone we support', () => {
  beforeEach(() => {
    mockInsets.current = SE_INSETS;
  });

  it('puts the blue hero inside the scroll, so it goes away when you scroll', async () => {
    const tree = await paint(<Paywall />);
    expect(words(scrollOf(tree))).toContain(HERO_TITLE);
  });

  it('never floats the hero over anything', async () => {
    const tree = await paint(<Paywall />);
    const path = stylesAbove(tree, HERO_TITLE);
    expect(path).not.toBeNull();
    for (const style of path!) {
      expect(style.position).not.toBe('absolute');
    }
  });

  it('lets the scroll take the room it is given, instead of running off the end', async () => {
    const tree = await paint(<Paywall />);
    expect(flat(scrollOf(tree).props.style).flex).toBe(1);
  });

  it('keeps every price and every buy button inside the scrolling part', async () => {
    const tree = await paint(<Paywall />);
    const said = words(scrollOf(tree));
    for (const line of [
      'Free',
      'Pro',
      'Business',
      '$29/month per location',
      'Get Pro',
      'Set up Business on the web',
      'Managing a larger portfolio? Contact us for custom pricing.',
    ]) {
      expect(said).toContain(line);
    }
  });

  it('pins one compact bar and nothing else', async () => {
    const tree = await paint(<Paywall />);
    const inside = words(scrollOf(tree));
    const everything = words(tree);
    const pinned = everything.filter((w) => !inside.includes(w));
    // one word, and the close button carries no words at all
    expect(pinned).toEqual(['Plans']);
  });

  it('leaves the home indicator its room at the bottom of the scroll', async () => {
    mockInsets.current = HOME_BAR_INSETS;
    const tree = await paint(<Paywall />);
    const pad = flat(scrollOf(tree).props.contentContainerStyle).paddingBottom;
    expect(typeof pad).toBe('number');
    expect(pad as number).toBeGreaterThanOrEqual(HOME_BAR_INSETS.bottom);
  });
});

describe('the sounds screen, above a phone with a home indicator', () => {
  beforeEach(() => {
    mockInsets.current = HOME_BAR_INSETS;
  });

  it('scrolls inside the room the screen has, so the last card is reachable', async () => {
    const tree = await paint(<Sounds />);
    expect(flat(scrollOf(tree).props.style).flex).toBe(1);
  });

  it('leaves the whole dock, and the home indicator, under the last card', async () => {
    const tree = await paint(<Sounds />);
    const pad = flat(scrollOf(tree).props.contentContainerStyle).paddingBottom as number;
    expect(pad).toBeGreaterThanOrEqual(DOCK_HEIGHT + HOME_BAR_INSETS.bottom);
  });

  it('says the pitch as a number, and where the sound came from', async () => {
    const said = words(scrollOf(await paint(<Sounds />)));
    expect(said).toContain('18 kHz');
    expect(said).toContain('15 to 19 kHz');
    expect(said).toContain('22 kHz');
    expect(said).toContain('Low frequency');
    expect(said).toContain('Natural recording');
    expect(said).toContain('Generated tone');
    for (const word of ['Low', 'High', 'Very high', 'Low pitch', 'High pitch']) {
      expect(said).not.toContain(word);
    }
  });

  it('names the birds the way the recordist named them', async () => {
    const said = words(scrollOf(await paint(<Sounds />)));
    expect(said).toContain('Red-tailed hawk scream');
    expect(said).toContain('Peregrine alarm call');
    expect(said).toContain('Pigeon distress call');
    expect(said).not.toContain('Hawk call');
    expect(said).not.toContain('Falcon call');
  });

  it('never calls 22 kHz audible or inaudible while a phone is playing it', async () => {
    const said = words(scrollOf(await paint(<Sounds />)));
    expect(said).toContain('Needs a PigeonX speaker');
    expect(said).not.toContain('Typically inaudible');
  });

  it('credits the recordings from the bottom of the list', async () => {
    const said = words(scrollOf(await paint(<Sounds />)));
    expect(said).toContain('Credits');
    expect(said).toContain('Who recorded the bird calls');
  });
});

describe('make your own, above a phone with a home indicator', () => {
  beforeEach(() => {
    mockInsets.current = HOME_BAR_INSETS;
  });

  it('scrolls inside the room the screen has, and clears its own dock', async () => {
    const tree = await paint(<MakeASound />);
    const scroll = scrollOf(tree);
    expect(flat(scroll.props.style).flex).toBe(1);
    const pad = flat(scroll.props.contentContainerStyle).paddingBottom as number;
    expect(pad).toBeGreaterThanOrEqual(DOCK_HEIGHT + HOME_BAR_INSETS.bottom);
  });
});

describe('a panel that slides up, above a home indicator', () => {
  beforeEach(() => {
    mockInsets.current = HOME_BAR_INSETS;
  });

  it('gives way so its footer and the home indicator both keep their room', async () => {
    const tree = await paint(
      <Sheet open title="Long panel" onClose={() => {}} footer={<Text>Save it</Text>}>
        {Array.from({ length: 40 }, (_, i) => (
          <Text key={i}>{`line ${i}`}</Text>
        ))}
      </Sheet>
    );

    const scroll = scrollOf(tree);
    expect(flat(scroll.props.style).flexShrink).toBe(1);
    // the footer sits under the scrolling part, never inside it
    expect(words(scroll)).not.toContain('Save it');
    expect(words(tree)).toContain('Save it');

    const panel = nodes(tree).find((n) => flat(n.props.style).maxHeight === '90%');
    expect(panel).toBeDefined();
    expect(flat(panel!.props.style).paddingBottom as number).toBeGreaterThanOrEqual(
      HOME_BAR_INSETS.bottom
    );
  });
});
