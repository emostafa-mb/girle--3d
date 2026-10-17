import Image from 'next/image';
import { flavors, type StarterProduct } from '@/brand/catalog';
import { localize } from '@/core/i18n/localize';
import { formatMoney } from '@/core/money';
import { Link } from '@/i18n/navigation';

type Props = { product: StarterProduct; locale: string; currency: string; sizes: string };

export function ProductCard({ product, locale, currency, sizes }: Props) {
  const name = localize(product.name, locale);
  // the first flavour, turning into the second on hover
  const [first, second] = flavors.map((f) => product.images[f.id].front);
  return (
    <Link href={`/products/${product.slug}`} className="group block rounded-[1.75rem] outline-offset-4" data-testid="product-card">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-studio">
        <Image src={first} alt={name} fill sizes={sizes} className="object-cover" />
        <Image
          src={second}
          alt=""
          fill
          sizes={sizes}
          className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
      </div>
      <div className="mt-4 px-1">
        <h3 className="font-display text-xl leading-tight sm:text-2xl">{name}</h3>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">{localize(product.tagline, locale)}</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden className="flex -space-x-1 rtl:space-x-reverse">
            {flavors.map((f) => (
              <span key={f.id} className="size-4 rounded-full ring-2 ring-background" style={{ backgroundColor: f.swatch }} />
            ))}
          </span>
          {flavors.map((f) => localize(f.name, locale)).join(' · ')}
        </p>
        <p className="mt-2 flex items-baseline gap-2 text-sm">
          <span className="font-semibold tabular-nums">{formatMoney(product.price, currency, locale)}</span>
          <span className="text-muted-foreground">{localize(product.size, locale)}</span>
        </p>
      </div>
    </Link>
  );
}
