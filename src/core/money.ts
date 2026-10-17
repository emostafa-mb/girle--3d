/**
 * Formats an integer amount in minor units (piastres, cents). Whole amounts drop the decimals.
 * English shows the ISO code (EGP 320); Arabic shows the local symbol (٣٢٠ ج.م.).
 */
export function formatMoney(minor: number, currency: string, locale: string): string {
  const whole = minor % 100 === 0;
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency,
    currencyDisplay: locale === 'ar' ? 'symbol' : 'code',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })
    .format(minor / 100)
    .replace(/\u00a0/g, ' ');
}
