import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { starterProducts } from '@/brand/catalog';
import { ProductCard } from '@/components/store/product-card';
import { getStoreSettings } from '@/server/store';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shop' });
  return { title: t('title'), description: t('intro') };
}

export default async function ShopPage() {
  const [locale, t, tp, settings] = await Promise.all([
    getLocale(),
    getTranslations('shop'),
    getTranslations('product'),
    getStoreSettings(),
  ]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <h1 className="font-display text-5xl sm:text-6xl">{t('title')}</h1>
      <p className="mt-3 text-muted-foreground">{t('intro')}</p>
      <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
        {starterProducts.map((p) => (
          <ProductCard
            key={p.slug}
            product={p}
            locale={locale}
            currency={settings.currency}
            sizes="(min-width: 1024px) 25vw, 50vw"
            badge3d={tp('viewer.badge')}
          />
        ))}
      </div>
    </div>
  );
}
