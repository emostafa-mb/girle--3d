import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { starterProducts } from '@/brand/catalog';
import { BRAND_FILM_REVEAL, BRAND_FILM_WINDOWS, filmFrames } from '@/brand/films';
import { ProductCard } from '@/components/store/product-card';
import { ScrollFilm } from '@/components/store/scroll-film';
import { Button } from '@/components/ui/button';
import { localize } from '@/core/i18n/localize';
import { Link } from '@/i18n/navigation';
import { getStoreSettings } from '@/server/store';

export default async function HomePage() {
  const [locale, t, tf, settings] = await Promise.all([
    getLocale(),
    getTranslations('home'),
    getTranslations('film'),
    getStoreSettings(),
  ]);
  // Arabic copy uses Arabic-Indic digits, matching prices and sizes.
  const num = (n: number) => n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en');
  return (
    <>
      <ScrollFilm
        {...filmFrames('brand')}
        intro={{ title: t('heroTitle'), hint: tf('brandHint') }}
        captions={starterProducts.map((p, i) => ({
          from: BRAND_FILM_WINDOWS[i][0],
          to: BRAND_FILM_WINDOWS[i][1],
          title: localize(p.name, locale),
          body: localize(p.stepNote, locale),
          marker: num(p.step),
        }))}
        reveal={{
          at: BRAND_FILM_REVEAL,
          title: t('lineTitle'),
          body: t('heroSubtitle'),
          action: (
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-11 rounded-full bg-ink px-5 text-sm text-white hover:bg-ink/85 sm:h-12 sm:px-6 sm:text-base">
                <Link href="/shop">{t('shopCta')}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full border-ink bg-transparent px-5 text-sm text-ink hover:bg-ink/10 sm:h-12 sm:px-6 sm:text-base dark:border-ink dark:bg-transparent dark:hover:bg-ink/10"
              >
                <Link href="#routine">{t('routineCta')}</Link>
              </Button>
            </div>
          ),
        }}
        labels={{ steps: tf('brandSteps') }}
        portraitZoom={1.5}
        portraitFocusEnd={0.62}
      />

      <section aria-labelledby="line-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="mb-10">
          <h2 id="line-title" className="font-display text-4xl sm:text-5xl">
            {t('lineTitle')}
          </h2>
          <p className="mt-3 text-muted-foreground">{t('lineIntro')}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {starterProducts.map((p) => (
            <ProductCard
              key={p.slug}
              product={p}
              locale={locale}
              currency={settings.currency}
              sizes="(min-width: 1024px) 25vw, 50vw"
            />
          ))}
        </div>
      </section>

      <section id="routine" aria-labelledby="routine-title" className="scroll-mt-16 bg-petal">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:py-28">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[2rem] bg-studio">
            <Image src="/brand/lineup.jpg" alt="" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
          </div>
          <div>
            <h2 id="routine-title" className="font-display text-4xl sm:text-5xl">
              {t('routineTitle')}
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">{t('routineIntro')}</p>
            <ol className="mt-8 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">
              {starterProducts.map((p) => (
                <li key={p.slug}>
                  <Link href={`/products/${p.slug}`} className="group flex items-center gap-5 py-4">
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-full bg-bubblegum font-display text-xl text-ink"
                    >
                      {num(p.step)}
                    </span>
                    <span className="flex-1">
                      <span className="block text-lg font-semibold group-hover:underline">{localize(p.name, locale)}</span>
                      <span className="block text-sm text-muted-foreground">{localize(p.stepNote, locale)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
