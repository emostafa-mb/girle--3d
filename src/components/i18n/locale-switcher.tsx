'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const next = locale === 'ar' ? 'en' : 'ar';
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      data-testid="locale-switch"
      onClick={() => startTransition(() => router.replace(pathname, { locale: next }))}
    >
      {t('switchTo')}
    </Button>
  );
}
