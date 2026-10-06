import { getLocale, getTranslations } from 'next-intl/server';
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
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight" data-testid="store-name">
          {localize(settings.storeName, locale)}
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            {t('home')}
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
            <Button asChild variant="outline" size="sm">
              <Link href="/auth/signin">{t('signIn')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
