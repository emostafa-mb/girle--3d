# GIRLÉ v2: two flavours for every product

Products: Body wash, Body scrub, Body lotion, Body splash (was Body mist).
Flavours on all four: **Blueberry** (deep raspberry pink, like the metodologia scrub reference) and
**Marshmallow** (soft blush, like the OSEA scrub reference).

Make everything with **blank packaging**: GIRLÉ prints (logo, product, flavour, size) are added afterwards
by `photos.py` and the Blender endings, so the logo is always the real one.

## A. Video clips (Flow, Text to Video, 16:9, 8 s): 8 clips

Start every clip prompt with:

> High-end cosmetics commercial, single continuous shot, 8 seconds, 16:9. Seamless soft pink studio
> backdrop. Soft diffused light from the front left, glossy reflections, macro detail, slow motion, slow
> smooth camera move. No text, no people, no hands, no cuts, no bottles, jars or packaging.

| File name | Add this |
|---|---|
| `wash-blueberry.mp4` | Plump fresh blueberries and blueberry halves tumble in slow motion with juicy splashes. A glossy translucent deep raspberry-pink gel ribbon swirls through them and blooms into rich, shiny bubbles that fill the frame. |
| `wash-marshmallow.mp4` | Soft white and pale pink marshmallows bounce and float in slow motion. A glossy translucent soft blush-pink gel ribbon swirls around them with tiny bubbles and fills the frame. |
| `scrub-blueberry.mp4` | Blueberries and sparkling sugar crystals pour and tumble in slow motion. They fold together into a thick, glittering, deep raspberry-pink sugar scrub with a coarse grainy texture, carved into deep swirls. |
| `scrub-marshmallow.mp4` | Soft marshmallows and sparkling sugar crystals tumble in slow motion. They fold together into a thick, glittering, pale blush-pink sugar scrub with a fine grainy texture, swirled into a soft rose shape. |
| `lotion-blueberry.mp4` | Blueberries float in slow motion as a creamy deep raspberry-pink lotion pours in and swirls into thick silky ribbons with a soft sheen. |
| `lotion-marshmallow.mp4` | Soft marshmallows float in slow motion as a creamy pale blush lotion pours in and swirls into thick silky ribbons with a soft sheen. |
| `splash-blueberry.mp4` | Blueberries drop into a clear deep raspberry-pink liquid with a crown splash; a fine sparkling spray of pink droplets drifts through the frame. |
| `splash-marshmallow.mp4` | Marshmallows drop into a clear pale blush-pink liquid with a soft splash; a fine sparkling spray of droplets drifts through the frame. |

## B. Product photos (Gemini or Flow image, portrait 3:4): 8 stills

Upload as references: the current body wash photo (style) and the real photo of that bottle or jar
(shape). Prompt:

> Photorealistic luxury cosmetics product photo, portrait 3:4, in the same style as the reference body
> wash photo: soft pink studio background, soft diffused light, glossy reflective surface. In the centre,
> standing perfectly straight and facing the camera, fully in frame: **[PACKAGING]** filled with
> **[CONTENTS]**. Around it: **[PROPS]**. The packaging is completely blank: no text, no logo, no label,
> no letters.

| File name | [PACKAGING] | [CONTENTS] | [PROPS] |
|---|---|---|---|
| `wash-blueberry.jpg` | a clear round-shouldered plastic bottle with a white flip-top cap | translucent deep raspberry-pink gel | swirling deep pink gel ribbons, fresh blueberries, glossy gel puddles |
| `wash-marshmallow.jpg` | (same bottle) | translucent soft blush-pink gel | swirling blush gel ribbons, soft marshmallows, glossy gel puddles |
| `scrub-blueberry.jpg` | a wide thick-walled clear plastic jar with a white ribbed screw lid | glittering deep raspberry-pink sugar scrub with a grainy texture | swirls of the same scrub, blueberries, sugar crystals on the floor |
| `scrub-marshmallow.jpg` | (same jar) | glittering pale blush sugar scrub with a fine grainy texture | swirls of the same scrub, marshmallows, sugar crystals on the floor |
| `lotion-blueberry.jpg` | an opaque matte-white bottle, short wide cylinder with rounded shoulders and a white flip cap with a wide round disc wider than the neck | (opaque, contents not visible) | thick swirling ribbons of deep raspberry-pink lotion, blueberries, lotion puddles |
| `lotion-marshmallow.jpg` | (same bottle) | (opaque) | thick swirling ribbons of pale blush lotion, marshmallows, lotion puddles |
| `splash-blueberry.jpg` | a slim clear plastic cylinder bottle with a white fine-mist spray pump under a clear overcap | clear deep raspberry-pink liquid | a liquid splash wave, fine spray droplets, blueberries |
| `splash-marshmallow.jpg` | (same bottle) | clear pale blush-pink liquid | a liquid splash wave, fine spray droplets, marshmallows |

## C. What happens on the site
- Each product page gets a flavour picker (Blueberry / Marshmallow); the photos switch with it.
- Each product's film: the Blueberry clip, then the Marshmallow clip, then the Blender ending with both
  flavours side by side (real packaging, prints with the flavour name, the G).
- The home film: one moment per product, then the line-up.
