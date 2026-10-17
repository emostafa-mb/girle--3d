import type { Locale } from './locales';

export type Localized = Partial<Record<Locale, string>>;

function nonBlank(v: string | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function localize(
  value: Localized | null | undefined,
  locale: string,
  fallback: Locale = 'en',
): string {
  if (!value) return '';
  const requested = (value as Record<string, string | undefined>)[locale];
  if (nonBlank(requested)) return requested;
  if (nonBlank(value[fallback])) return value[fallback];
  return Object.values(value).find(nonBlank) ?? '';
}
