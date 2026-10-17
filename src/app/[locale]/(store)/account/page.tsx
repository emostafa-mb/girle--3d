import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { customerSignOutAction } from '@/server/actions/auth';
import { requireCustomer } from '@/server/session';

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const customer = await requireCustomer(locale);
  const [t, tn] = await Promise.all([getTranslations('account'), getTranslations('nav')]);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-lg">{t('greeting', { name: customer.name })}</p>
      <form action={customerSignOutAction}>
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" variant="outline">
          {tn('signOut')}
        </Button>
      </form>
    </div>
  );
}
