/**
 * How far apart two colours are.
 *
 * Used by the tests that keep every pair of words and background at 4.5 to 1
 * or better, in both palettes. The maths is the WCAG one, no more.
 */

/** Turns "#RRGGBB" into three numbers from 0 to 255. */
export function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a colour this can read: ${hex}`);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** How much light a colour throws, from 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** The ratio between two colours. 21 is black on white. 1 is the same colour. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** Body text needs 4.5. Big text and shapes need 3. */
export function meetsAA(a: string, b: string, large = false): boolean {
  return contrastRatio(a, b) >= (large ? 3 : 4.5);
}
