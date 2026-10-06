import { describe, expect, it } from 'vitest';
import { safeLocale } from './locales';

describe('safeLocale', () => {
  it('keeps supported locales', () => {
    expect(safeLocale('en')).toBe('en');
    expect(safeLocale('ar')).toBe('ar');
  });
  it.each(['//evil.com', '%2Fevil.com', ''])('falls back to default for %j', (v) => {
    expect(safeLocale(v)).toBe('en');
  });
});
