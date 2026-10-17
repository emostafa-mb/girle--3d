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
const FLOW_FILMS: Record<string, { count: number; reveal: number; stages: FilmStage[] }> = {
  'body-wash': {
    count: 150,
    reveal: 0.95,
    stages: [
      {
        from: 0.04,
        to: 0.27,
        title: { en: 'The fruit', ar: 'الفاكهة' },
        body: {
          en: 'Inspired by strawberry, raspberry, pink grapefruit and aloe.',
          ar: 'مستوحى من الفراولة والتوت والجريب فروت الوردي والألوفيرا.',
        },
      },
      {
        from: 0.29,
        to: 0.56,
        title: { en: 'The blend', ar: 'الخلطة' },
        body: { en: 'Swirled together into a glossy pink gel.', ar: 'تمتزج معاً في جل وردي لامع.' },
      },
      {
        from: 0.58,
        to: 0.84,
        title: { en: 'The texture', ar: 'القوام' },
        body: { en: 'A gel that whips into soft, airy foam.', ar: 'جل يتحول إلى رغوة ناعمة وخفيفة.' },
      },
      {
        from: 0.86,
        to: 0.95,
        title: { en: 'The finish', ar: 'اللمسة الأخيرة' },
        body: {
          en: 'In a clear bottle with a flip cap. Start every shower here.',
          ar: 'في عبوة شفافة بغطاء قلّاب. ابدئي به كل استحمام.',
        },
      },
    ],
  },
};
FLOW_FILMS['body-butter'] = {
  count: 150,
  reveal: 0.95,
  stages: [
    {
      from: 0.03,
      to: 0.3,
      title: { en: 'The butters', ar: 'الزبدة' },
      body: {
        en: 'Inspired by shea and cocoa butter, rose petals and rosehip oil.',
        ar: 'مستوحاة من زبدة الشيا والكاكاو وبتلات الورد وزيت ثمر الورد.',
      },
    },
    {
      from: 0.32,
      to: 0.58,
      title: { en: 'The whip', ar: 'الخفق' },
      body: { en: 'Melted, then whipped into a soft pink butter.', ar: 'تُذاب ثم تُخفق لتصبح زبدة وردية ناعمة.' },
    },
    {
      from: 0.6,
      to: 0.8,
      title: { en: 'The jar', ar: 'البرطمان' },
      body: { en: 'Piped into a wide jar and closed with a screw lid.', ar: 'تُملأ في برطمان واسع وتُغلق بغطاء محكم.' },
    },
    {
      from: 0.83,
      to: 0.94,
      title: { en: 'The finish', ar: 'اللمسة الأخيرة' },
      body: {
        en: 'Printed with the GIRLÉ G. For the spots that dry out first.',
        ar: 'مطبوع عليه شعار GIRLÉ. للمناطق التي تجف أولاً.',
      },
    },
  ],
};
FLOW_FILMS['body-lotion'] = {
  count: 150,
  reveal: 0.96,
  stages: [
    {
      from: 0.03,
      to: 0.25,
      title: { en: 'The ingredients', ar: 'المكونات' },
      body: {
        en: 'Inspired by coconut, sweet almond, vanilla and shea.',
        ar: 'مستوحى من جوز الهند واللوز الحلو والفانيليا والشيا.',
      },
    },
    {
      from: 0.27,
      to: 0.62,
      title: { en: 'The blend', ar: 'الخلطة' },
      body: {
        en: 'Coconut milk and almond oil, swirled into a silky lotion.',
        ar: 'حليب جوز الهند وزيت اللوز يمتزجان في لوشن حريري.',
      },
    },
    {
      from: 0.66,
      to: 0.86,
      title: { en: 'The bottle', ar: 'العبوة' },
      body: { en: 'Poured into a soft white bottle with a flip cap.', ar: 'يُسكب في عبوة بيضاء ناعمة بغطاء قلّاب.' },
    },
    {
      from: 0.88,
      to: 0.95,
      title: { en: 'The finish', ar: 'اللمسة الأخيرة' },
      body: {
        en: 'Printed with the GIRLÉ G. Right after the shower, on damp skin.',
        ar: 'مطبوع عليه شعار GIRLÉ. بعد الاستحمام مباشرة على بشرة رطبة.',
      },
    },
  ],
};
FLOW_FILMS['body-mist'] = {
  count: 150,
  reveal: 0.95,
  stages: [
    {
      from: 0.03,
      to: 0.27,
      title: { en: 'The notes', ar: 'النفحات' },
      body: { en: 'Inspired by peony, rose, lychee and pear.', ar: 'مستوحى من البيوني والورد والليتشي والكمثرى.' },
    },
    {
      from: 0.29,
      to: 0.52,
      title: { en: 'The essence', ar: 'الخلاصة' },
      body: { en: 'Gathered into a light, clear pink mist.', ar: 'تجتمع في رذاذ وردي خفيف وشفاف.' },
    },
    {
      from: 0.55,
      to: 0.82,
      title: { en: 'The bottle', ar: 'العبوة' },
      body: {
        en: 'A fine-mist pump under a clear cap, ready for your bag.',
        ar: 'بخاخ رذاذ ناعم تحت غطاء شفاف، جاهز لحقيبتك.',
      },
    },
    {
      from: 0.85,
      to: 0.94,
      title: { en: 'The finish', ar: 'اللمسة الأخيرة' },
      body: {
        en: 'Printed with the GIRLÉ G. The last step, and any time after.',
        ar: 'مطبوع عليه شعار GIRLÉ. الخطوة الأخيرة، ومتى شئتِ بعدها.',
      },
    },
  ],
};
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
    { en: 'Poured into a clear bottle, so you always see how much is left.', ar: 'يُسكب في عبوة شفافة لتعرفي دائماً كم تبقّى.' },
    { en: 'A flip cap you can open with wet hands.', ar: 'غطاء قلّاب يُفتح بسهولة بيدين مبللتين.' },
    { en: 'Printed with the GIRLÉ G. Start every shower here.', ar: 'مطبوع عليه شعار GIRLÉ. ابدئي به كل استحمام.' },
  ],
  'body-lotion': [
    { en: 'Light, silky drops that sink in fast.', ar: 'قطرات خفيفة وناعمة يمتصها الجلد بسرعة.' },
    { en: 'Poured into a soft white bottle.', ar: 'يُسكب في عبوة بيضاء ناعمة.' },
    { en: 'A flip cap for one-handed use.', ar: 'غطاء قلّاب يُستخدم بيد واحدة.' },
    { en: 'Printed with the GIRLÉ G. Right after the shower, on damp skin.', ar: 'مطبوع عليه شعار GIRLÉ. بعد الاستحمام مباشرة على بشرة رطبة.' },
  ],
  'body-butter': [
    { en: 'Whipped, rich and soft.', ar: 'مخفوقة، غنية وناعمة.' },
    { en: 'Piped into a wide clear jar you can scoop from.', ar: 'تُملأ في برطمان شفاف واسع يسهل الأخذ منه.' },
    { en: 'A screw lid that closes tight between uses.', ar: 'غطاء محكم يُغلق جيداً بين الاستخدامات.' },
    { en: 'Printed with the GIRLÉ G. For the spots that dry out first.', ar: 'مطبوع عليه شعار GIRLÉ. للمناطق التي تجف أولاً.' },
  ],
  'body-mist': [
    { en: 'A fine, even mist.', ar: 'رذاذ ناعم ومتساوٍ.' },
    { en: 'A light, clear formula in a clear bottle.', ar: 'تركيبة خفيفة وشفافة في عبوة شفافة.' },
    { en: 'A fine-mist pump under a clear cap, ready for your bag.', ar: 'بخاخ رذاذ ناعم تحت غطاء شفاف، جاهز لحقيبتك.' },
    { en: 'Printed with the GIRLÉ G. The last step, and any time after.', ar: 'مطبوع عليه شعار GIRLÉ. الخطوة الأخيرة، ومتى شئتِ بعدها.' },
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
