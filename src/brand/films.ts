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

/**
 * Home film (design/flow compose.py 'brand' --video, played as public/films/brand.mp4): products dropping,
 * one Flow moment per product, then the four products landing, printed. Windows are fractions of its 21 s.
 */
export const BRAND_FILM_WINDOWS = [
  [0.15, 0.3],
  [0.3, 0.45],
  [0.45, 0.59],
  [0.59, 0.76],
] as const;
/** The closing words come up as the four products land. */
export const BRAND_FILM_REVEAL = 0.76;

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

/** Endings from design/flow/compose_ending.py: both flavours side by side, the real prints wrapping on. */
const BOTH: Localized = { en: 'Two flavours', ar: 'نكهتان' };

FLOW_FILMS['body-wash'] = flavorFilm(
  0.94,
  [
    0.03,
    0.36,
    {
      en: 'A deep pink gel with juicy blueberry that foams into rich bubbles.',
      ar: 'جل وردي داكن بالتوت الأزرق يتحول إلى رغوة غنية.',
    },
  ],
  [
    0.4,
    0.7,
    {
      en: 'A soft blush gel, sweet as marshmallow, with a gentle foam.',
      ar: 'جل وردي فاتح بحلاوة المارشميلو ورغوة لطيفة.',
    },
  ],
  [
    0.74,
    0.92,
    BOTH,
    {
      en: 'Blueberry or Marshmallow, in a clear bottle with a flip cap. Start every shower here.',
      ar: 'التوت الأزرق أو المارشميلو، في عبوة شفافة بغطاء قلّاب. ابدئي بها كل استحمام.',
    },
  ],
);
FLOW_FILMS['body-scrub'] = flavorFilm(
  0.95,
  [
    0.03,
    0.37,
    {
      en: 'Blueberry and sugar crystals in a glittering deep pink scrub.',
      ar: 'التوت الأزرق مع بلورات السكر في مقشّر وردي داكن لامع.',
    },
  ],
  [
    0.4,
    0.71,
    { en: 'Marshmallow and fine sugar in a soft blush scrub.', ar: 'المارشميلو مع السكر الناعم في مقشّر وردي فاتح.' },
  ],
  [
    0.75,
    0.84,
    { en: 'The jar', ar: 'البرطمان' },
    { en: 'A wide jar with a screw lid that closes tight.', ar: 'برطمان واسع بغطاء محكم الإغلاق.' },
  ],
  [
    0.87,
    0.94,
    BOTH,
    {
      en: 'Blueberry or Marshmallow. Two or three times a week, after washing.',
      ar: 'التوت الأزرق أو المارشميلو. مرتين أو ثلاث مرات أسبوعياً بعد الغسول.',
    },
  ],
);
FLOW_FILMS['body-lotion'] = flavorFilm(
  0.94,
  [
    0.03,
    0.36,
    { en: 'A creamy deep pink lotion with a blueberry scent.', ar: 'لوشن كريمي وردي داكن برائحة التوت الأزرق.' },
  ],
  [
    0.4,
    0.7,
    { en: 'A silky blush lotion, soft and sweet as marshmallow.', ar: 'لوشن حريري وردي فاتح، ناعم وحلو كالمارشميلو.' },
  ],
  [
    0.74,
    0.92,
    BOTH,
    {
      en: 'Blueberry or Marshmallow, in a soft white bottle. Right after the shower, on damp skin.',
      ar: 'التوت الأزرق أو المارشميلو، في عبوة بيضاء ناعمة. بعد الاستحمام مباشرة على بشرة رطبة.',
    },
  ],
);
FLOW_FILMS['body-splash'] = flavorFilm(
  0.96,
  [0.03, 0.33, { en: 'A juicy blueberry splash in a clear deep pink.', ar: 'سبلاش التوت الأزرق بلون وردي داكن شفاف.' }],
  [0.36, 0.61, { en: 'A sweet marshmallow splash in a clear blush pink.', ar: 'سبلاش المارشميلو بلون وردي فاتح شفاف.' }],
  [
    0.65,
    0.84,
    { en: 'The bottle', ar: 'العبوة' },
    { en: 'A spray pump under a clear cap, ready for your bag.', ar: 'بخاخ تحت غطاء شفاف، جاهز لحقيبتك.' },
  ],
  [
    0.87,
    0.95,
    BOTH,
    {
      en: 'Blueberry or Marshmallow. Spray it on last, and any time after.',
      ar: 'التوت الأزرق أو المارشميلو. رشّيه في النهاية ومتى شئتِ.',
    },
  ],
);
const FILM_COUNTS: Record<string, number> = {
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

/** Where each product film's ending (both flavours side by side) starts, from design/flow/compose.py. */
const ENDING_AT: Record<string, number> = { 'body-wash': 0.7, 'body-scrub': 0.72, 'body-lotion': 0.7, 'body-splash': 0.62 };

export function productFilmEnding(slug: string): number {
  return ENDING_AT[slug] ?? 0.7;
}

export function productFilmReveal(slug: string): number {
  return FLOW_FILMS[slug]?.reveal ?? PRODUCT_FILM_REVEAL;
}
