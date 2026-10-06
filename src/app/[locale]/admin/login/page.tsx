import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminLoginForm } from '@/components/admin/admin-login-form';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentAdmin } from '@/server/session';

export default async function AdminLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (await getCurrentAdmin()) redirect(`/${locale}/admin`);
  const t = await getTranslations('admin');
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-muted/40 px-4">
      <div className="flex gap-1">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>{t('loginTitle')}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
