import { describe, expect, it } from 'vitest';
import { tokens } from './tokens.js';
import { tailwindPreset } from './tailwind-preset.js';

const HEX = /^#[0-9A-F]{6}$/;

describe('tokens', () => {
  it('uses the approved base palette', () => {
    expect(tokens.color.background).toBe('#0B1220');
    expect(tokens.color.surface).toBe('#111A2E');
    expect(tokens.color.card).toBe('#151F36');
    expect(tokens.color.elevated).toBe('#1B2742');
    expect(tokens.color.border).toBe('#243049');
  });

  it('uses the approved foreground + accent palette', () => {
    expect(tokens.color.fg).toBe('#F1F5F9');
    expect(tokens.color.fgMuted).toBe('#8B97AD');
    expect(tokens.color.fgSubtle).toBe('#5B6881');
    expect(tokens.color.accentTeal).toBe('#2DD4BF');
    expect(tokens.color.accentBlue).toBe('#3B82F6');
    expect(tokens.color.accent).toBe('#22D3EE');
    expect(tokens.color.onAccent).toBe('#06121F');
    expect(tokens.color.success).toBe('#34D399');
    expect(tokens.color.warning).toBe('#FBBF24');
    expect(tokens.color.danger).toBe('#F87171');
  });

  it('exposes every color as a 7-character uppercase hex', () => {
    for (const [name, value] of Object.entries(tokens.color)) {
      expect(value.length, name).toBe(7);
      expect(value, name).toMatch(HEX);
    }
  });

  it('defines the brand gradient', () => {
    expect(tokens.gradient.brand).toBe('linear-gradient(135deg,#2DD4BF 0%,#3B82F6 100%)');
  });

  it('defines the font families', () => {
    expect(tokens.font.display).toContain('Outfit');
    expect(tokens.font.body).toContain('Inter');
    expect(tokens.font.mono).toContain('JetBrains Mono');
    expect(tokens.font.weight.display).toEqual([600, 700]);
    expect(tokens.font.weight.body).toEqual([400, 500, 600]);
    expect(tokens.font.weight.mono).toEqual([500]);
  });

  it('defines radii', () => {
    expect(tokens.radius).toEqual({ sm: 8, md: 12, lg: 16, xl: 24, pill: 999 });
  });

  it('defines a 4-based spacing scale', () => {
    expect(tokens.space[1]).toBe(4);
    expect(tokens.space[2]).toBe(8);
    expect(tokens.space[4]).toBe(16);
    expect(tokens.space[6]).toBe(24);
    for (const value of Object.values(tokens.space)) {
      expect(value % 4).toBe(0);
    }
  });
});

describe('tailwindPreset', () => {
  const colors = tailwindPreset.theme.extend.colors;

  it('exposes semantic color names', () => {
    expect(colors.accent).toBe('#22D3EE');
    expect(colors.bg).toBe(tokens.color.background);
    expect(colors.surface).toBe(tokens.color.surface);
    expect(colors.card).toBe(tokens.color.card);
    expect(colors.elevated).toBe(tokens.color.elevated);
    expect(colors.border).toBe(tokens.color.border);
    expect(colors.fg).toBe(tokens.color.fg);
    expect(colors['fg-muted']).toBe(tokens.color.fgMuted);
    expect(colors['fg-subtle']).toBe(tokens.color.fgSubtle);
    expect(colors.teal).toBe(tokens.color.accentTeal);
    expect(colors.blue).toBe(tokens.color.accentBlue);
    expect(colors['on-accent']).toBe(tokens.color.onAccent);
    expect(colors.success).toBe(tokens.color.success);
    expect(colors.warning).toBe(tokens.color.warning);
    expect(colors.danger).toBe(tokens.color.danger);
  });

  it('every preset color is a 7-character hex', () => {
    for (const [name, value] of Object.entries(colors)) {
      expect(value, name).toMatch(HEX);
    }
  });

  it('maps fonts, radii, spacing and the brand gradient', () => {
    const extend = tailwindPreset.theme.extend;
    expect(extend.fontFamily.display[0]).toBe('Outfit');
    expect(extend.fontFamily.body[0]).toBe('Inter');
    expect(extend.fontFamily.mono[0]).toBe('JetBrains Mono');
    expect(extend.borderRadius.lg).toBe('16px');
    expect(extend.borderRadius.pill).toBe('999px');
    expect(extend.backgroundImage['gradient-brand']).toBe(tokens.gradient.brand);
  });
});
