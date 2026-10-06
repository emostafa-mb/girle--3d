import { describe, expect, it } from 'vitest';
import { isLocale, isRtl } from './locales';
import { localize } from './localize';

describe('localize', () => {
  it('returns the requested locale', () => {
    expect(localize({ en: 'Hats', ar: 'قبعات' }, 'ar')).toBe('قبعات');
  });

  it('falls back to English when the Arabic value is missing', () => {
    expect(localize({ en: 'Hats' }, 'ar')).toBe('Hats');
  });

  it('falls back to English when the Arabic value is blank', () => {
    expect(localize({ en: 'Hats', ar: '   ' }, 'ar')).toBe('Hats');
  });

  it('falls back to any non-empty value when English is also missing', () => {
    expect(localize({ ar: 'قبعات' }, 'en')).toBe('قبعات');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(localize(null, 'en')).toBe('');
    expect(localize(undefined, 'en')).toBe('');
    expect(localize({}, 'en')).toBe('');
  });
});

describe('locales', () => {
  it('recognises supported locales only', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });

  it('marks Arabic as right-to-left', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
  });
});
