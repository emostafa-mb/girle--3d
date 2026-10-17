import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

describe('formatMoney', () => {
  it('formats minor units as whole currency in English', () => {
    expect(formatMoney(32000, 'EGP', 'en')).toBe('EGP 320');
  });
  it('keeps piastres when the amount has them', () => {
    expect(formatMoney(32050, 'EGP', 'en')).toBe('EGP 320.50');
  });
  it('uses Arabic digits and the local symbol for Arabic', () => {
    const text = formatMoney(32000, 'EGP', 'ar');
    expect(text).toContain('٣٢٠');
    expect(text).toContain('ج.م');
    expect(text).not.toContain('EGP');
  });
});
