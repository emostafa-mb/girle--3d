import type { Localized } from '@/core/i18n/localize';

/**
 * GIRLÉ's first line, shown on the storefront until the database-backed catalog (milestone 2)
 * replaces it. Prices are in minor units (piastres). Sizes, prices and copy are starting
 * values for the client to confirm.
 */
/** Every product comes in the same two flavours. The first is the default. */
export const flavors = [
  { id: 'blueberry', name: { en: 'Blueberry', ar: 'توت أزرق' }, swatch: '#b5265e' },
  { id: 'marshmallow', name: { en: 'Marshmallow', ar: 'مارشميلو' }, swatch: '#f6cfd5' },
] as const satisfies readonly { id: string; name: Localized; swatch: string }[];

export type FlavorId = (typeof flavors)[number]['id'];
export type Flavor = (typeof flavors)[number];
export type ProductImages = { front: string; detail: string };

export function findFlavor(id: string | string[] | undefined): Flavor {
  return flavors.find((f) => f.id === id) ?? flavors[0];
}

/** Each flavour has its own packshot and ingredients shot (design/flow/photos.py). */
function flavorImages(slug: string): Record<FlavorId, ProductImages> {
  const images = (flavor: FlavorId): ProductImages => ({
    front: `/products/${slug}-${flavor}-packshot.jpg`,
    detail: `/products/${slug}-${flavor}-detail.jpg`,
  });
  return { blueberry: images('blueberry'), marshmallow: images('marshmallow') };
}

export type StarterProduct = {
  slug: string;
  name: Localized;
  tagline: Localized;
  description: Localized;
  howTo: Localized;
  size: Localized;
  price: number;
  /** Per flavour: front is the packshot, detail the ingredients shot from the product's Flow film. */
  images: Record<FlavorId, ProductImages>;
  /** Position in the daily routine, starting at 1. */
  step: number;
  stepNote: Localized;
};

export const starterProducts: readonly StarterProduct[] = [
  {
    slug: 'body-wash',
    name: { en: 'Body wash', ar: 'غسول الجسم' },
    tagline: { en: 'A pink gel that foams soft and rinses clean.', ar: 'جل وردي برغوة ناعمة يُشطف بسهولة.' },
    description: {
      en: 'A clear pink gel that lathers into a soft foam and rinses off without leaving skin tight. Start every shower here.',
      ar: 'جل وردي شفاف يتحول إلى رغوة ناعمة ويُشطف دون أن يترك بشرتك مشدودة. ابدئي به كل استحمام.',
    },
    howTo: {
      en: 'Work a coin-sized amount between wet hands or a pouf, massage over skin, then rinse.',
      ar: 'ضعي كمية بحجم العملة على يدين مبللتين أو ليفة، دلّكي بشرتك ثم اشطفيها.',
    },
    size: { en: '250 ml', ar: '٢٥٠ مل' },
    price: 32000,
    images: flavorImages('body-wash'),
    step: 1,
    stepNote: { en: 'In the shower', ar: 'أثناء الاستحمام' },
  },
  {
    slug: 'body-scrub',
    name: { en: 'Body scrub', ar: 'مقشّر الجسم' },
    tagline: { en: 'A whipped sugar scrub for smooth skin.', ar: 'مقشّر سكر مخفوق لبشرة ناعمة.' },
    description: {
      en: 'A soft, whipped sugar scrub that buffs away dry, dull skin and leaves it smooth. Use it in the shower two or three times a week.',
      ar: 'مقشّر سكر ناعم ومخفوق يزيل الجلد الجاف الباهت ويتركه ناعماً. استخدميه أثناء الاستحمام مرتين أو ثلاث مرات أسبوعياً.',
    },
    howTo: {
      en: 'On wet skin, massage a small scoop in gentle circles, then rinse. Skip freshly shaved or irritated skin.',
      ar: 'على بشرة مبللة، دلّكي كمية صغيرة بحركات دائرية لطيفة ثم اشطفيها. تجنّبي البشرة الحليقة حديثاً أو المتهيّجة.',
    },
    size: { en: '200 g', ar: '٢٠٠ جم' },
    price: 42000,
    images: flavorImages('body-scrub'),
    step: 2,
    stepNote: { en: 'After washing, two or three times a week', ar: 'بعد الغسول، مرتين أو ثلاث مرات أسبوعياً' },
  },
  {
    slug: 'body-lotion',
    name: { en: 'Body lotion', ar: 'لوشن الجسم' },
    tagline: { en: 'A light daily lotion that sinks in fast.', ar: 'لوشن يومي خفيف يمتصه الجلد بسرعة.' },
    description: {
      en: 'A light, fast-absorbing lotion for every day. Smooth it on after your shower and get dressed straight away, with no sticky layer.',
      ar: 'لوشن خفيف سريع الامتصاص للاستخدام اليومي. ضعيه بعد الاستحمام والبسي ملابسك مباشرة، بلا أي إحساس بالالتصاق.',
    },
    howTo: {
      en: 'Smooth over slightly damp skin after showering, focusing on arms and legs.',
      ar: 'وزّعيه على بشرة رطبة قليلاً بعد الاستحمام، مع التركيز على الذراعين والساقين.',
    },
    size: { en: '150 ml', ar: '١٥٠ مل' },
    price: 35000,
    images: flavorImages('body-lotion'),
    step: 3,
    stepNote: { en: 'Right after, on damp skin', ar: 'بعده مباشرة على بشرة رطبة' },
  },
  {
    slug: 'body-splash',
    name: { en: 'Body splash', ar: 'بودي سبلاش' },
    tagline: { en: 'A light, scented splash to finish.', ar: 'سبلاش خفيف ومعطّر للمسة الأخيرة.' },
    description: {
      en: 'A light, refreshing splash that leaves a soft scent on skin and clothes. Spray it on generously after your lotion, and again whenever you like.',
      ar: 'سبلاش خفيف ومنعش يترك رائحة لطيفة على البشرة والملابس. رشّيه بسخاء بعد اللوشن، ومرة أخرى متى شئتِ.',
    },
    howTo: {
      en: 'Spray generously over skin or clothes from 15–20 cm away. Reapply during the day.',
      ar: 'رشّيه بسخاء على البشرة أو الملابس من مسافة ١٥–٢٠ سم، وجدّديه خلال اليوم.',
    },
    size: { en: '150 ml', ar: '١٥٠ مل' },
    price: 38000,
    images: flavorImages('body-splash'),
    step: 4,
    stepNote: { en: 'Last, and whenever you like', ar: 'في النهاية، ومتى شئتِ' },
  },
];

export function findStarterProduct(slug: string): StarterProduct | undefined {
  return starterProducts.find((p) => p.slug === slug);
}
