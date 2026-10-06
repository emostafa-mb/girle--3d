import { describe, expect, it } from 'vitest';
import { brand } from '@/brand/brand.config';
import { defaultSettings, readSettings } from './schema';

describe('readSettings', () => {
  it('returns brand defaults for empty or non-object input', () => {
    expect(readSettings({})).toEqual(defaultSettings);
    expect(readSettings(null)).toEqual(defaultSettings);
    expect(readSettings('garbage')).toEqual(defaultSettings);
    expect(readSettings([1, 2])).toEqual(defaultSettings);
    expect(defaultSettings.storeName).toEqual(brand.name);
  });

  it('keeps valid stored values', () => {
    const s = readSettings({ primaryColor: '#123456', currency: 'USD', defaultLocale: 'ar' });
    expect(s.primaryColor).toBe('#123456');
    expect(s.currency).toBe('USD');
    expect(s.defaultLocale).toBe('ar');
  });

  it('replaces each invalid field with its default without discarding valid ones', () => {
    const s = readSettings({
      primaryColor: 'not-a-colour',
      defaultLocale: 'fr',
      enabledLocales: [],
      radius: 99,
      currency: 'usd',
      contactEmail: 'shop@example.com',
    });
    expect(s.primaryColor).toBe(defaultSettings.primaryColor);
    expect(s.defaultLocale).toBe(defaultSettings.defaultLocale);
    expect(s.enabledLocales).toEqual(defaultSettings.enabledLocales);
    expect(s.radius).toBe(defaultSettings.radius);
    expect(s.currency).toBe(defaultSettings.currency);
    expect(s.contactEmail).toBe('shop@example.com');
  });
});
