import { ShieldAlert } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function NoAccess() {
  const t = await getTranslations('admin');
  return (
    <div data-testid="no-access" className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
      <ShieldAlert className="size-10" />
      <p>{t('noAccess')}</p>
    </div>
  );
}
