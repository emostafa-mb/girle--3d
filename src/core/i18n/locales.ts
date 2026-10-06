export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

const RTL_LOCALES: readonly string[] = ['ar'];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale);
}
