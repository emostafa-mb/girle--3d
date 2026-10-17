import { Store } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { localize } from '@/core/i18n/localize';
import { Link } from '@/i18n/navigation';
import { adminLogoutAction } from '@/server/actions/auth';
import { getStoreSettings } from '@/server/store';

export async function Topbar({ adminName }: { adminName: string }) {
  const [locale, t, settings] = await Promise.all([getLocale(), getTranslations('admin'), getStoreSettings()]);
  return (
    <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
      <span className="font-semibold">{localize(settings.storeName, locale)}</span>
      <div className="ms-auto flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <Store className="size-4" />
            <span className="hidden sm:inline">{t('goToStore')}</span>
          </Link>
        </Button>
        <LocaleSwitcher />
        <ThemeToggle />
        <span className="hidden px-2 text-sm text-muted-foreground sm:inline">{adminName}</span>
        <form action={adminLogoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="outline" size="sm">
            {t('signOut')}
          </Button>
        </form>
      </div>
    </header>
  );
}
