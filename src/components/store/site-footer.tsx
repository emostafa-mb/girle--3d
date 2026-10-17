import { getLocale, getTranslations } from 'next-intl/server';
import { starterProducts } from '@/brand/catalog';
import { Wordmark } from '@/components/brand/logo';
import { localize } from '@/core/i18n/localize';
import { Link } from '@/i18n/navigation';
import { getStoreSettings } from '@/server/store';

export async function SiteFooter() {
  const [locale, t, tn, settings] = await Promise.all([
    getLocale(),
    getTranslations('footer'),
    getTranslations('nav'),
    getStoreSettings(),
  ]);
  const storeName = localize(settings.storeName, locale);
  return (
    <footer className="bg-ink text-white dark:border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-16 pb-10 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
        <p className="max-w-xs text-lg text-white/80">{t('tagline')}</p>
        <nav aria-label={t('shop')} className="text-sm">
          <h2 className="mb-3 font-semibold">{t('shop')}</h2>
          <ul className="space-y-2 text-white/75">
            {starterProducts.map((p) => (
              <li key={p.slug}>
                <Link href={`/products/${p.slug}`} className="hover:text-white hover:underline">
                  {localize(p.name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t('account')} className="text-sm">
          <h2 className="mb-3 font-semibold">{t('account')}</h2>
          <ul className="space-y-2 text-white/75">
            <li>
              <Link href="/account" className="hover:text-white hover:underline">
                {tn('account')}
              </Link>
            </li>
            <li>
              <Link href="/auth/signin" className="hover:text-white hover:underline">
                {tn('signIn')}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6" dir="ltr">
        <Wordmark className="h-auto w-full text-bubblegum" />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-white/60 sm:px-6">
        {t('rights', { year: new Date().getFullYear(), storeName })}
      </div>
    </footer>
  );
}
