import { getLocale, getTranslations } from 'next-intl/server';
import { Wordmark } from '@/components/brand/logo';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { localize } from '@/core/i18n/localize';
import { Link } from '@/i18n/navigation';
import { getCurrentCustomer } from '@/server/session';
import { getStoreSettings } from '@/server/store';

export async function SiteHeader() {
  const [locale, t, settings, customer] = await Promise.all([
    getLocale(),
    getTranslations('nav'),
    getStoreSettings(),
    getCurrentCustomer(),
  ]);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md" data-testid="store-name">
          <Wordmark className="h-7 sm:h-8" />
          <span className="sr-only">{localize(settings.storeName, locale)}</span>
        </Link>
        <nav aria-label={t('main')} className="flex items-center gap-5 text-sm font-medium">
          <Link href="/shop" className="hover:underline hover:underline-offset-4">
            {t('shop')}
          </Link>
          <Link href="/#routine" className="hidden hover:underline hover:underline-offset-4 sm:inline">
            {t('routine')}
          </Link>
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          {customer ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/account" data-testid="account-link">
                {t('account')}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="rounded-full px-3.5">
              <Link href="/auth/signin">{t('signIn')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
