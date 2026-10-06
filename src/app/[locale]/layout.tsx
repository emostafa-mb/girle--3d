import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { isRtl } from '@/core/i18n/locales';
import { localize } from '@/core/i18n/localize';
import { buildThemeCss } from '@/core/theme/palette';
import { routing } from '@/i18n/routing';
import { getStoreSettings } from '@/server/store';
import '../globals.css';

export const dynamic = 'force-dynamic';

const latin = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-latin' });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
});

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const name = localize((await getStoreSettings()).storeName, locale);
  return { title: { default: name, template: `%s · ${name}` } };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const settings = await getStoreSettings();

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
      className={`${latin.variable} ${arabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style id="brand-theme" dangerouslySetInnerHTML={{ __html: buildThemeCss(settings) }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
