import type { Localized } from '@/core/i18n/localize';

/**
 * Scroll films rendered in design/packshots (`scene.py ... film <name>`): 120 WebP frames each.
 * Stage windows are fractions of the scroll and follow the Blender timeline:
 * texture 1–36, pour 40–80, cap 80–100, finish 98–118 (of 120 frames).
 */
export const FILM_FRAMES = 120;

export type FilmStage = { from: number; to: number; title: Localized; body: Localized };

export const PRODUCT_FILM_WINDOWS = [
  [0.07, 0.3],
  [0.32, 0.65],
  [0.67, 0.82],
  [0.84, 0.93],
] as const;
export const PRODUCT_FILM_REVEAL = 0.94;

/** Home film (design/flow compose.py 'brand'): products dropping, one Flow ingredient moment per product, then the Blender line-up. */
export const BRAND_FILM_WINDOWS = [
  [0.2, 0.33],
  [0.35, 0.5],
  [0.52, 0.66],
  [0.68, 0.82],
] as const;
export const BRAND_FILM_REVEAL = 0.91;

/**
 * Films replaced by Google Flow videos (design/flow): their frame count, caption windows and copy.
 * Captions here say what the video shows; the ingredients must match the real formula or scent.
 */
const FLOW_FILMS: Record<string, { count: number; reveal: number; stages: FilmStage[] }> = {};

/** A product film: the Blueberry clip, the Marshmallow clip, then the packaging (design/flow/compose.py). */
function flavorFilm(
  reveal: number,
  blueberry: [number, number, Localized],
  marshmallow: [number, number, Localized],
  ...packaging: [number, number, Localized, Localized][]
) {
  return {
    count: 150,
    reveal,
    stages: [
      { from: blueberry[0], to: blueberry[1], title: { en: 'Blueberry', ar: 'توت أزرق' }, body: blueberry[2] },
      { from: marshmallow[0], to: marshmallow[1], title: { en: 'Marshmallow', ar: 'مارشميلو' }, body: marshmallow[2] },
      ...packaging.map(([from, to, title, body]) => ({ from, to, title, body })),
    ],
  };
}

const FINISH: Localized = { en: 'The finish', ar: 'اللمسة الأخيرة' };

FLOW_FILMS['body-wash'] = flavorFilm(
  0.96,
  [
    0.03,
    0.42,
    {
      en: 'A deep pink gel with juicy blueberry that foams into rich bubbles.',
      ar: 'جل وردي داكن بالتوت الأزرق يتحول إلى رغوة غنية.',
    },
  ],
  [
    0.46,
    0.82,
    {
      en: 'A soft blush gel, sweet as marshmallow, with a gentle foam.',
      ar: 'جل وردي فاتح بحلاوة المارشميلو ورغوة لطيفة.',
    },
  ],
  [
    0.86,
    0.95,
    FINISH,
    {
      en: 'A clear bottle with a flip cap. Start every shower here.',
      ar: 'عبوة شفافة بغطاء قلّاب. ابدئي بها كل استحمام.',
    },
  ],
);
FLOW_FILMS['body-scrub'] = flavorFilm(
  0.96,
  [
    0.03,
    0.33,
    {
      en: 'Blueberry and sugar crystals in a glittering deep pink scrub.',
      ar: 'التوت الأزرق مع بلورات السكر في مقشّر وردي داكن لامع.',
    },
  ],
  [
    0.37,
    0.66,
    { en: 'Marshmallow and fine sugar in a soft blush scrub.', ar: 'المارشميلو مع السكر الناعم في مقشّر وردي فاتح.' },
  ],
  [
    0.7,
    0.84,
    { en: 'The jar', ar: 'البرطمان' },
    { en: 'A wide jar with a screw lid that closes tight.', ar: 'برطمان واسع بغطاء محكم الإغلاق.' },
  ],
  [
    0.87,
    0.95,
    FINISH,
    {
      en: 'Printed with the GIRLÉ G. Two or three times a week, after washing.',
      ar: 'مطبوع عليه شعار GIRLÉ. مرتين أو ثلاث مرات أسبوعياً بعد الغسول.',
    },
  ],
);
FLOW_FILMS['body-lotion'] = flavorFilm(
  0.96,
  [
    0.03,
    0.37,
    { en: 'A creamy deep pink lotion with a blueberry scent.', ar: 'لوشن كريمي وردي داكن برائحة التوت الأزرق.' },
  ],
  [
    0.42,
    0.74,
    { en: 'A silky blush lotion, soft and sweet as marshmallow.', ar: 'لوشن حريري وردي فاتح، ناعم وحلو كالمارشميلو.' },
  ],
  [
    0.8,
    0.94,
    FINISH,
    {
      en: 'A soft white bottle with a flip cap. Right after the shower, on damp skin.',
      ar: 'عبوة بيضاء ناعمة بغطاء قلّاب. بعد الاستحمام مباشرة على بشرة رطبة.',
    },
  ],
);
FLOW_FILMS['body-splash'] = flavorFilm(
  0.95,
  [0.03, 0.3, { en: 'A juicy blueberry splash in a clear deep pink.', ar: 'سبلاش التوت الأزرق بلون وردي داكن شفاف.' }],
  [0.35, 0.6, { en: 'A sweet marshmallow splash in a clear blush pink.', ar: 'سبلاش المارشميلو بلون وردي فاتح شفاف.' }],
  [
    0.64,
    0.8,
    { en: 'The bottle', ar: 'العبوة' },
    { en: 'A spray pump under a clear cap, ready for your bag.', ar: 'بخاخ تحت غطاء شفاف، جاهز لحقيبتك.' },
  ],
  [
    0.84,
    0.94,
    FINISH,
    {
      en: 'Printed with the GIRLÉ G. Spray it on last, and any time after.',
      ar: 'مطبوع عليه شعار GIRLÉ. رشّيه في النهاية ومتى شئتِ.',
    },
  ],
);
const FILM_COUNTS: Record<string, number> = {
  brand: 150,
  ...Object.fromEntries(Object.entries(FLOW_FILMS).map(([name, film]) => [name, film.count])),
};

export function filmFrames(name: string) {
  const count = FILM_COUNTS[name] ?? FILM_FRAMES;
  return { basePath: `/films/${name}`, count, poster: `/films/${name}/f${String(count).padStart(3, '0')}.webp` };
}

const STAGE_TITLES: Localized[] = [
  { en: 'The texture', ar: 'القوام' },
  { en: 'The pour', ar: 'السكب' },
  { en: 'The cap', ar: 'الغطاء' },
  { en: 'The finish', ar: 'اللمسة الأخيرة' },
];

const STAGE_COPY: Record<string, Localized[]> = {
  'body-wash': [
    { en: 'A pink gel that whips into soft, airy foam.', ar: 'جل وردي يتحول إلى رغوة ناعمة وخفيفة.' },
    {
      en: 'Poured into a clear bottle, so you always see how much is left.',
      ar: 'يُسكب في عبوة شفافة لتعرفي دائماً كم تبقّى.',
    },
    { en: 'A flip cap you can open with wet hands.', ar: 'غطاء قلّاب يُفتح بسهولة بيدين مبللتين.' },
    { en: 'Printed with the GIRLÉ G. Start every shower here.', ar: 'مطبوع عليه شعار GIRLÉ. ابدئي به كل استحمام.' },
  ],
  'body-lotion': [
    { en: 'Light, silky drops that sink in fast.', ar: 'قطرات خفيفة وناعمة يمتصها الجلد بسرعة.' },
    { en: 'Poured into a soft white bottle.', ar: 'يُسكب في عبوة بيضاء ناعمة.' },
    { en: 'A flip cap for one-handed use.', ar: 'غطاء قلّاب يُستخدم بيد واحدة.' },
    {
      en: 'Printed with the GIRLÉ G. Right after the shower, on damp skin.',
      ar: 'مطبوع عليه شعار GIRLÉ. بعد الاستحمام مباشرة على بشرة رطبة.',
    },
  ],
  'body-scrub': [
    { en: 'A whipped sugar scrub, soft and rich.', ar: 'مقشّر سكر مخفوق، ناعم وغني.' },
    { en: 'Piped into a wide clear jar you can scoop from.', ar: 'يُملأ في برطمان شفاف واسع يسهل الأخذ منه.' },
    { en: 'A screw lid that closes tight between uses.', ar: 'غطاء محكم يُغلق جيداً بين الاستخدامات.' },
    {
      en: 'Printed with the GIRLÉ G. For smooth skin, two or three times a week.',
      ar: 'مطبوع عليه شعار GIRLÉ. لبشرة ناعمة، مرتين أو ثلاث مرات أسبوعياً.',
    },
  ],
  'body-splash': [
    { en: 'A fine, even mist.', ar: 'رذاذ ناعم ومتساوٍ.' },
    { en: 'A light, clear formula in a clear bottle.', ar: 'تركيبة خفيفة وشفافة في عبوة شفافة.' },
    {
      en: 'A fine-mist pump under a clear cap, ready for your bag.',
      ar: 'بخاخ رذاذ ناعم تحت غطاء شفاف، جاهز لحقيبتك.',
    },
    {
      en: 'Printed with the GIRLÉ G. The last step, and any time after.',
      ar: 'مطبوع عليه شعار GIRLÉ. الخطوة الأخيرة، ومتى شئتِ بعدها.',
    },
  ],
};

export function productFilmStages(slug: string): FilmStage[] {
  if (FLOW_FILMS[slug]) return FLOW_FILMS[slug].stages;
  const copy = STAGE_COPY[slug] ?? [];
  return PRODUCT_FILM_WINDOWS.map(([from, to], i) => ({ from, to, title: STAGE_TITLES[i], body: copy[i] ?? {} }));
}

export function productFilmReveal(slug: string): number {
  return FLOW_FILMS[slug]?.reveal ?? PRODUCT_FILM_REVEAL;
}
