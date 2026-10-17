# GIRLÉ films in Google Flow

The storefront plays a film as you scroll: the home page (`brand`) and each product page.
They currently use the Blender renders. Any film made here replaces its Blender version.

## How to make each film

1. In Flow, choose **Frames to Video**.
2. Upload the **start** and **end** frames from `frames/` for that film. The end frame keeps
   the GIRLÉ print correct when the film stops on it.
3. Paste the prompt below (shared style + the film's own lines).
4. Settings: **16:9**, the highest quality available (1080p), **8 seconds**.
5. Download the MP4 and save it in `videos/` with the film's name, e.g. `videos/body-wash.mp4`.

Rules that make scroll films work:
- One continuous shot. No cuts, no fades, no text on screen, no hands or people.
- Keep the product in the middle of the frame. The captions sit on the left on computers.
- If a take garbles the logo or the bottle shape, generate again rather than fixing it later.

## Shared style (start every prompt with this)

> High-end cosmetics commercial, single continuous shot, 8 seconds. Seamless bubblegum-pink
> studio backdrop: deeper pink wall, lighter pink floor. Soft diffused light from the front left,
> thin rim lights outlining the product, glossy reflections. Slow, smooth camera move.
> No text, no people, no hands, no cuts.

## body-wash (`frames/body-wash-start.png` → `frames/body-wash-end.png`)

> Iridescent soap bubbles drift slowly in the empty pink studio. A clear round-shouldered plastic
> bottle with a white flip-top cap lowers gently into the centre. The bubbles drift into its neck.
> A glossy ribbon of translucent pink gel spirals down from above and pours into the bottle,
> filling it to the shoulder. The white cap twists on. The camera settles on a front view of the
> bottle with its black "Girlé / Body wash" print, as a large glossy black script letter G rises
> behind it.

## body-lotion (`frames/body-lotion-start.png` → `frames/body-lotion-end.png`)

> Small silky drops of white lotion float in the pink studio. A smooth opaque white bottle with a
> white flip cap lowers into the centre. A creamy white ribbon of lotion spirals down and pours into
> its neck. The cap twists on. The camera settles on a front view with the black "Girlé / Body
> lotion" print, as a large glossy black script letter G rises behind it.

## body-scrub (`frames/body-scrub-start.png` → `frames/body-scrub-end.png`)

> Soft whipped peaks of pale pink body butter float in the pink studio. A wide, thick-walled clear
> jar lowers into the centre. Whipped pink butter swirls down into the jar like piped cream and
> fills it with a soft swirled top. A white ribbed screw lid twists closed. The camera settles on a
> front view with the black "Girlé / Body butter" print, as a large glossy black script letter G
> rises behind it.

## body-mist (`frames/body-mist-start.png` → `frames/body-mist-end.png`)

> Fine pink mist droplets drift and sparkle in the pink studio. A slim clear cylinder bottle lowers
> into the centre. A thin stream of pale pink liquid spirals down and fills it. A white fine-mist
> pump screws on and a clear overcap drops over it. The camera settles on a front view with the
> black "Girlé / Body mist" print, as a large glossy black script letter G rises behind it.

## brand, the home page (`frames/brand-start.png` → `frames/brand-end.png`)

> Bubbles, pink droplets, whipped butter peaks and lotion drops float across the pink studio. One by
> one, four products drop onto the floor in a row and settle with a tiny bounce: a clear bottle of
> pink gel, a white lotion bottle, a clear jar of pink butter, a slim clear mist bottle. The camera
> glides along the row, then pulls back to show all four in a line slightly right of centre, as a
> large glossy black script letter G rises behind them.

## Turning videos into films

Every film is the flavour clips (Blueberry, then Marshmallow) followed by an ending clip: the two
flavours side by side with blank packaging, the camera still for the last seconds (prompts in
FLAVORS.md and the chat that made them). The real prints are added in code, so the logo is always right.

1. `python design/packshots/labels.py <scratch>` prints the label artwork (with flavour names) into `<scratch>/tex`.
2. `python design/flow/compose_ending.py <product|brand> <downloads> <scratch>/tex <ending folder>` wraps the
   prints onto the bottles once they settle. Bottle positions are measured on the clip's last frame and
   listed at the top of the script; the bottles are tracked, so a slow camera move is fine.
3. `python design/flow/compose.py <film> <downloads> <ending folder>` joins the clips and the ending into
   `public/films/<film>`; the segments are listed at the top of the script.
4. `python design/flow/photos.py <downloads> <scratch>/tex` makes the product photos from the blank stills.

Then set the film's caption windows in `src/brand/films.ts` (`FLOW_FILMS`).

## Version 2: the blend (ingredients mixing before the product)

Each film is two 8-second clips joined in Flow's scene builder: clip 1 shows the blend being made
from ingredients, clip 2 extends it into the bottle and ends on the end frame.

**Before publishing:** the ingredients shown must match the real formula or the real scent notes.
The ones below are placeholders typical for each product type; replace them with GIRLÉ's actual
ingredients from the manufacturer.

Shared style for every clip:

> High-end cosmetics commercial, single continuous shot, 8 seconds. Seamless bubblegum-pink studio
> backdrop. Soft diffused light from the front left, glossy reflections, macro detail, slow motion,
> slow smooth camera move. No text, no people, no hands, no cuts.

| Film | Clip 1: the blend | Clip 2: into the bottle |
|---|---|---|
| body-wash | Strawberries, raspberries, pink grapefruit slices and aloe vera leaves fall in slow motion; clear oil drops and juice swirl together into a glossy translucent pink gel | The pink gel spirals down into a clear bottle with a white flip cap; the cap twists on; front view with the black "Girlé / Body wash" print as a black script G rises behind |
| body-lotion | Coconut halves, sweet almonds, vanilla pods and pieces of shea butter float; coconut milk and golden almond oil swirl together into a silky white lotion | The lotion pours into a smooth white bottle; the flip cap twists on; front view with "Girlé / Body lotion" print, black G rises behind |
| body-scrub | Chunks of shea butter and cocoa butter, rose petals and drops of rosehip oil; they melt and whip together into a fluffy pale-pink butter | The whipped butter swirls into a wide clear jar like piped cream; the white ribbed lid closes; front view with "Girlé / Body butter" print, black G rises behind |
| body-mist | Peony and rose petals, lychee halves and pear slices drift; fine droplets rise from them and gather into a pale pink liquid | The liquid fills a slim clear bottle; the mist pump and clear cap go on; front view with "Girlé / Body mist" print, black G rises behind |
