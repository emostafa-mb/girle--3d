import { describe, expect, it } from 'vitest';
import { buildThemeCss, contrastRatio, DEFAULT_PRIMARY, normalizeHex, readableForeground } from './palette';

describe('normalizeHex', () => {
  it('accepts 6-digit hex and lower-cases it', () => {
    expect(normalizeHex('#AABBCC')).toBe('#aabbcc');
  });
  it('expands 3-digit hex', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });
  it('falls back for invalid input', () => {
    expect(normalizeHex('red')).toBe(DEFAULT_PRIMARY);
    expect(normalizeHex('#12345g')).toBe(DEFAULT_PRIMARY);
    expect(normalizeHex(undefined)).toBe(DEFAULT_PRIMARY);
    expect(normalizeHex('#fff;}body{display:none')).toBe(DEFAULT_PRIMARY);
  });
});

describe('contrast', () => {
  it('black on white is 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });
  it('picks white text on navy and black text on yellow', () => {
    expect(readableForeground('#000080')).toBe('#ffffff');
    expect(readableForeground('#ffd43b')).toBe('#000000');
  });
});

describe('buildThemeCss', () => {
  it('emits primary, foreground, ring and radius variables for light and dark', () => {
    const css = buildThemeCss({ primaryColor: '#000080', radius: 0.5 });
    expect(css).toContain('html:root,html.dark{');
    expect(css).toContain('--primary:#000080;');
    expect(css).toContain('--primary-foreground:#ffffff;');
    expect(css).toContain('--ring:#000080;');
    expect(css).toContain('--radius:0.5rem;');
  });
  it('keeps a primary that stays readable on the dark background', () => {
    const css = buildThemeCss({ primaryColor: '#f4b1c3', radius: 0.5 });
    expect(css).not.toContain('}html.dark{');
  });
  it('swaps a primary that disappears on the dark background for white in dark mode', () => {
    const css = buildThemeCss({ primaryColor: '#000000', radius: 0.5 });
    expect(css).toContain('--primary:#000000;');
    expect(css).toContain('}html.dark{--primary:#ffffff;--primary-foreground:#000000;--ring:#ffffff;}');
  });
  it('sanitizes bad values instead of emitting broken CSS', () => {
    const css = buildThemeCss({ primaryColor: 'javascript:alert(1)', radius: Number.NaN });
    expect(css).toContain(`--primary:${DEFAULT_PRIMARY};`);
    expect(css).toContain('--radius:0.75rem;');
  });
});
