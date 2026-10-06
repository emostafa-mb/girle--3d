import { getLocale, getTranslations } from 'next-intl/server';
import { localize } from '@/core/i18n/localize';
import { getStoreSettings } from '@/server/store';

export async function SiteFooter() {
  const [locale, t, settings] = await Promise.all([getLocale(), getTranslations('footer'), getStoreSettings()]);
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground">
        {t('rights', { year: new Date().getFullYear(), storeName: localize(settings.storeName, locale) })}
      </div>
    </footer>
  );
}
