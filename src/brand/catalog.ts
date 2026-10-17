import type { Localized } from '@/core/i18n/localize';

/**
 * GIRLÉ's first line, shown on the storefront until the database-backed catalog (milestone 2)
 * replaces it. Prices are in minor units (piastres). Sizes, prices and copy are starting
 * values for the client to confirm.
 */
export type StarterProduct = {
  slug: string;
  name: Localized;
  tagline: Localized;
  description: Localized;
  howTo: Localized;
  size: Localized;
  price: number;
  images: { front: string; angle: string };
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
    images: { front: '/products/body-wash-front.jpg', angle: '/products/body-wash-angle.jpg' },
    step: 1,
    stepNote: { en: 'In the shower', ar: 'أثناء الاستحمام' },
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
    images: { front: '/products/body-lotion-front.jpg', angle: '/products/body-lotion-angle.jpg' },
    step: 2,
    stepNote: { en: 'Right after, on damp skin', ar: 'بعده مباشرة على بشرة رطبة' },
  },
  {
    slug: 'body-butter',
    name: { en: 'Body butter', ar: 'زبدة الجسم' },
    tagline: { en: 'A whipped butter for dry spots.', ar: 'زبدة مخفوقة للمناطق الجافة.' },
    description: {
      en: 'A rich, whipped butter for the places that dry out first: elbows, knees, heels and hands. A little goes a long way.',
      ar: 'زبدة غنية مخفوقة للمناطق التي تجف أولاً: المرفقين والركبتين والكعبين واليدين. كمية صغيرة تكفي.',
    },
    howTo: {
      en: 'Warm a small scoop between your fingertips and press it into dry areas. Best at night.',
      ar: 'دفّئي كمية صغيرة بين أطراف أصابعك واضغطيها على المناطق الجافة. الأفضل ليلاً.',
    },
    size: { en: '200 ml', ar: '٢٠٠ مل' },
    price: 42000,
    images: { front: '/products/body-butter-front.jpg', angle: '/products/body-butter-angle.jpg' },
    step: 3,
    stepNote: { en: 'On dry spots, best at night', ar: 'على المناطق الجافة، والأفضل ليلاً' },
  },
  {
    slug: 'body-mist',
    name: { en: 'Body mist', ar: 'معطّر الجسم' },
    tagline: { en: 'A fine mist to finish.', ar: 'رذاذ ناعم للمسة الأخيرة.' },
    description: {
      en: 'A fine, even mist that leaves a soft scent on skin, hair and clothes. Small enough for your bag, so you can top up during the day.',
      ar: 'رذاذ ناعم ومتساوٍ يترك رائحة لطيفة على البشرة والشعر والملابس. حجمه يناسب حقيبتك لتجدّديه خلال اليوم.',
    },
    howTo: {
      en: 'Hold 15–20 cm away and spray over skin or clothes. Reapply whenever you like.',
      ar: 'رشّيه من مسافة ١٥–٢٠ سم على البشرة أو الملابس، وكرّريه متى شئتِ.',
    },
    size: { en: '150 ml', ar: '١٥٠ مل' },
    price: 38000,
    images: { front: '/products/body-mist-front.jpg', angle: '/products/body-mist-angle.jpg' },
    step: 4,
    stepNote: { en: 'Last, and whenever you like', ar: 'في النهاية، ومتى شئتِ' },
  },
];

export function findStarterProduct(slug: string): StarterProduct | undefined {
  return starterProducts.find((p) => p.slug === slug);
}
