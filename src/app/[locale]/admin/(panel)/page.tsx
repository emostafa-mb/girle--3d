import { getTranslations } from 'next-intl/server';
import { NoAccess } from '@/components/admin/no-access';
import { can, requireAdmin } from '@/server/session';

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const admin = await requireAdmin(locale);
  if (!can(admin, 'dashboard.read')) return <NoAccess />;
  const t = await getTranslations('admin');
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold" data-testid="admin-welcome">
        {t('welcome', { name: admin.name })}
      </h1>
      <p className="text-muted-foreground">{t('overviewSoon')}</p>
    </div>
  );
}
