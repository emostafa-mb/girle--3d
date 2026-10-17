import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { findStarterProduct, starterProducts } from '@/brand/catalog';
import { filmFrames, productFilmReveal, productFilmStages } from '@/brand/films';
import { ScrollFilm } from '@/components/store/scroll-film';
import { Button } from '@/components/ui/button';
import { localize } from '@/core/i18n/localize';
import { formatMoney } from '@/core/money';
import { Link } from '@/i18n/navigation';
import { jsonForScript } from '@/lib/json-script';
import { getStoreSettings } from '@/server/store';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = findStarterProduct(slug);
  if (!product) return {};
  return {
    title: localize(product.name, locale),
    description: localize(product.description, locale),
    openGraph: { images: [product.images.front] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const product = findStarterProduct(slug);
  if (!product) notFound();
  const [t, tf, settings] = await Promise.all([getTranslations('product'), getTranslations('film'), getStoreSettings()]);
  const name = localize(product.name, locale);
  // Arabic copy uses Arabic-Indic digits, matching prices and sizes.
  const num = (n: number) => n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en');
  const price = formatMoney(product.price, settings.currency, locale);
  const next = starterProducts.find((p) => p.step === product.step + 1);
  const pairing = next ?? starterProducts[0];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${localize(settings.storeName, locale)} ${name}`,
    description: localize(product.description, locale),
    image: [product.images.front, product.images.detail],
    brand: { '@type': 'Brand', name: localize(settings.storeName, 'en') },
    offers: {
      '@type': 'Offer',
      price: (product.price / 100).toFixed(2),
      priceCurrency: settings.currency,
      availability: 'https://schema.org/PreOrder',
    },
  };

  const stages = productFilmStages(product.slug);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(jsonLd) }} />
      <ScrollFilm
        {...filmFrames(product.slug)}
        intro={{ title: name, hint: tf('hint') }}
        captions={stages.map((st, i) => ({
          from: st.from,
          to: st.to,
          title: localize(st.title, locale),
          body: localize(st.body, locale),
          marker: num(i + 1),
        }))}
        reveal={{
          at: productFilmReveal(product.slug),
          title: name,
          meta: price,
          action: (
            <a
              href="#details"
              className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-base font-medium text-white hover:bg-ink/85"
            >
              {tf('details')}
            </a>
          ),
        }}
        labels={{ steps: tf('steps', { name }) }}
      />
    <div id="details" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-12 sm:px-6 lg:py-20" data-testid="product-details">
      <Link href="/shop" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
        {t('allProducts')}
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:flex-col lg:overflow-visible">
          {[product.images.front, product.images.detail].map((src, i) => (
            <div
              key={src}
              className="relative aspect-[4/5] w-[85%] shrink-0 snap-center overflow-hidden rounded-[2rem] bg-studio sm:w-[70%] lg:w-full"
            >
              <Image
                src={src}
                alt={t('gallery', { name, index: num(i + 1) })}
                fill
                sizes="(min-width: 1024px) 55vw, 85vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-sm font-medium text-muted-foreground">
            {t('step', { step: num(product.step), total: num(starterProducts.length) })}
          </p>
          <h2 className="mt-2 font-display text-5xl leading-none sm:text-6xl">{name}</h2>
          <p className="mt-4 text-lg text-pretty">{localize(product.tagline, locale)}</p>
          <dl className="mt-6 flex items-baseline gap-6">
            <div>
              <dt className="sr-only">{t('price')}</dt>
              <dd className="text-2xl font-semibold tabular-nums" data-testid="product-price">
                {price}
              </dd>
            </div>
            <div className="flex gap-1.5 text-muted-foreground">
              <dt>{t('size')}:</dt>
              <dd>{localize(product.size, locale)}</dd>
            </div>
          </dl>

          <div className="mt-8">
            <Button disabled className="h-12 w-full rounded-full text-base" aria-describedby="ordering-note">
              {t('addToBag')}
            </Button>
            <p id="ordering-note" className="mt-3 text-center text-sm text-muted-foreground">
              {t('orderingSoon')}
            </p>
          </div>

          <p className="mt-10 leading-relaxed text-pretty">{localize(product.description, locale)}</p>

          <h3 className="mt-8 text-lg font-semibold">{t('howTo')}</h3>
          <p className="mt-2 leading-relaxed text-pretty text-muted-foreground">{localize(product.howTo, locale)}</p>

          <h3 className="mt-10 text-lg font-semibold">{next ? t('next') : t('first')}</h3>
          <Link
            href={`/products/${pairing.slug}`}
            className="group mt-3 flex items-center gap-4 rounded-[1.5rem] bg-petal p-3 pe-5"
          >
            <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-studio">
              <Image src={pairing.images.front} alt="" fill sizes="80px" className="object-cover" />
            </span>
            <span className="flex-1">
              <span className="block font-display text-xl group-hover:underline">{localize(pairing.name, locale)}</span>
              <span className="block text-sm text-muted-foreground">{localize(pairing.stepNote, locale)}</span>
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatMoney(pairing.price, settings.currency, locale)}
            </span>
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
