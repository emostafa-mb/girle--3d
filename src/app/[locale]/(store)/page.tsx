import { getLocale, getTranslations } from 'next-intl/server';
import { localize } from '@/core/i18n/localize';
import { getStoreSettings } from '@/server/store';

export default async function HomePage() {
  const [locale, t, settings] = await Promise.all([getLocale(), getTranslations('home'), getStoreSettings()]);
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
        {t('heroTitle', { storeName: localize(settings.storeName, locale) })}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">{t('heroSubtitle')}</p>
    </section>
  );
}
