import {
  contrastRatio,
  darkPalette,
  lightPalette,
  luminance,
  meetsAA,
  palettes,
  parseHex,
  type Palette,
} from '../src/theme';

/** Words a person reads. Every one of these has to clear 4.5 to 1. */
const READING_PAIRS: [keyof Palette, keyof Palette][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'card'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['muted', 'card'],
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'card'],
  ['inkOn', 'ink'],
  ['accentOn', 'accent'],
  ['playOn', 'play'],
  ['link', 'bg'],
  ['link', 'surface'],
  ['link', 'card'],
  ['danger', 'bg'],
  ['danger', 'surface'],
  ['danger', 'card'],
];

/** Shapes: icons, marks, edges of a block. Three to one is enough. */
const SHAPE_PAIRS: [keyof Palette, keyof Palette][] = [
  ['warning', 'bg'],
  ['warning', 'surface'],
  ['success', 'bg'],
  ['success', 'surface'],
  ['accent', 'bg'],
  ['accent', 'surface'],
];

describe('the maths', () => {
  it('reads a colour', () => {
    expect(parseHex('#FFFFFF')).toEqual([255, 255, 255]);
    expect(parseHex('000')).toEqual([0, 0, 0]);
    expect(() => parseHex('nope')).toThrow();
  });

  it('knows black from white', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 5);
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });

  it('calls 4.5 the line for words and 3 the line for shapes', () => {
    expect(meetsAA('#767676', '#FFFFFF')).toBe(true);
    expect(meetsAA('#8E8E8E', '#FFFFFF')).toBe(false);
    expect(meetsAA('#8E8E8E', '#FFFFFF', true)).toBe(true);
  });
});

describe.each(Object.keys(palettes) as (keyof typeof palettes)[])(
  'the %s palette',
  (name) => {
    const p = palettes[name];

    it.each(READING_PAIRS)('reads %s on %s at 4.5 to 1 or better', (fg, bg) => {
      expect(meetsAA(p[fg], p[bg])).toBe(true);
    });

    it.each(SHAPE_PAIRS)('shows %s on %s at 3 to 1 or better', (fg, bg) => {
      expect(meetsAA(p[fg], p[bg], true)).toBe(true);
    });

    it('keeps its hairlines visible', () => {
      expect(contrastRatio(p.border, p.bg)).toBeGreaterThanOrEqual(1.2);
      expect(contrastRatio(p.border, p.card)).toBeGreaterThanOrEqual(1.2);
    });

    it('holds the same set of colours as the other one', () => {
      expect(Object.keys(p).sort()).toEqual(Object.keys(lightPalette).sort());
    });
  }
);

describe('the two palettes', () => {
  it('are not the same one twice', () => {
    expect(lightPalette.bg).not.toBe(darkPalette.bg);
    expect(luminance(lightPalette.bg)).toBeGreaterThan(luminance(darkPalette.bg));
    expect(luminance(lightPalette.ink)).toBeLessThan(luminance(darkPalette.ink));
  });

  it('keep one brand blue in both', () => {
    expect(lightPalette.accent).toBe('#2B5CFF');
    expect(darkPalette.accent).toBe('#2B5CFF');
  });
});
