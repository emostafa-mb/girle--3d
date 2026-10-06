import type { Locale } from '@/core/i18n/locales';
import type { Localized } from '@/core/i18n/localize';

/** Per-client defaults. Edit when setting up a new client; admin Settings override these at runtime. */
export const brand: {
  name: Localized;
  primaryColor: string;
  radius: number;
  defaultLocale: Locale;
  enabledLocales: readonly Locale[];
  currency: string;
} = {
  name: { en: 'My Store', ar: 'متجري' },
  primaryColor: '#e8590c',
  radius: 0.75,
  defaultLocale: 'en',
  enabledLocales: ['en', 'ar'],
  currency: 'EGP',
};
