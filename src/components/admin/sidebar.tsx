'use client';

import { useTranslations } from 'next-intl';
import { ADMIN_NAV } from '@/components/admin/nav';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function Sidebar({ allowedKeys }: { allowedKeys: string[] }) {
  const t = useTranslations('admin');
  const pathname = usePathname();
  const items = ADMIN_NAV.filter((i) => allowedKeys.includes(i.key));
  return (
    <aside className="border-b bg-card md:w-60 md:shrink-0 md:border-e md:border-b-0">
      <p className="hidden px-4 pt-6 pb-2 text-xs font-medium uppercase text-muted-foreground md:block">
        {t('sections.main')}
      </p>
      <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col">
        {items.map(({ key, href, icon: Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap',
                active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="size-4" />
              {t(key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
