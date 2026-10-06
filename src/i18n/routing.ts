import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALES } from '@/core/i18n/locales';

export const routing = defineRouting({ locales: LOCALES, defaultLocale: DEFAULT_LOCALE });
