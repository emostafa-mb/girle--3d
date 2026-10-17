"""Film endings from the flavour packshots (public/products/<product>-<flavour>-packshot.jpg), which carry
the real GIRLÉ print.

  python design/flow/ending.py <product> <out folder>   one product, in the spirit of the body wash
      ending: the Blueberry bottle slowly pushes in, then a soft wipe hands over to Marshmallow. Each 4:5
      packshot sits sharp in the middle of the 16:9 frame over a blurred spread of its own studio.
  python design/flow/ending.py brand <out folder>       the home ending: the four products rise into a
      2x2 grid on the right (the reveal text sits on the left), then each wipes to its other flavour.

Run from the repo root. Writes <out folder>/f001.webp ... (FRAMES).
"""
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

FRAMES = 60
SIZE = (1280, 720)
PUSH = 0.06  # how far each packshot pushes in while it is on screen
CROSS = (0.42, 0.62)  # the part of the ending where Blueberry hands over to Marshmallow
STUDIO = (233, 165, 183)  # --studio, the stage colour round the film
PRODUCTS = ('body-wash', 'body-scrub', 'body-lotion', 'body-splash')  # routine order


def ease(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def plate(still):
    """The packshot sharp in the middle of a 16:9 frame, feathered into a blurred cover of itself."""
    w, h = SIZE
    cover = still.resize((w, round(still.height * w / still.width)), Image.LANCZOS)
    top = (cover.height - h) // 2
    back = cover.crop((0, top, w, top + h)).filter(ImageFilter.GaussianBlur(28))
    sharp = still.resize((round(still.width * h / still.height), h), Image.LANCZOS)
    feather = 70
    ramp = np.clip(np.minimum(np.arange(sharp.width), np.arange(sharp.width)[::-1]) / feather, 0, 1)
    mask = Image.fromarray((np.tile(ramp, (h, 1)) * 255).astype(np.uint8))
    back.paste(sharp, ((w - sharp.width) // 2, 0), mask)
    return back


def wipe(a, b, k, edge=220):
    """b slides over a from right to left behind a soft vertical edge; k runs 0..1."""
    w = a.shape[1]
    x = (1 - k) * (w + edge) - edge
    m = np.clip((np.arange(w) - x) / edge, 0, 1)[None, :, None]
    return a * (1 - m) + b * m


def pushed(img, amount):
    """Scale about the centre and crop back to the frame."""
    w, h = img.size
    s = 1 + amount
    big = img.resize((round(w * s), round(h * s)), Image.LANCZOS)
    x, y = (big.width - w) // 2, (big.height - h) // 2
    return np.asarray(big.crop((x, y, x + w, y + h))).astype(np.float32)


def tile(product, flavor, size):
    """A crop of the packshot round the bottle, filling a grid cell."""
    im = Image.open(f'public/products/{product}-{flavor}-packshot.jpg').convert('RGB')
    w, h = size
    ch = round(im.width * h / w)
    cy = min(max(650, ch // 2), im.height - ch // 2)  # the bottles stand a little below centre
    return np.asarray(im.crop((0, cy - ch // 2, im.width, cy + ch // 2)).resize(size, Image.LANCZOS)).astype(np.float32)


def rounded(size, r):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255)
    return np.asarray(m).astype(np.float32)[..., None] / 255


def brand(out):
    w, h = SIZE
    gap, x0, y0 = 10, 468, 28
    cw, chh = (w - x0 - 22 - gap) // 2, (h - 2 * y0 - gap) // 2
    cells = [(x0 + (i % 2) * (cw + gap), y0 + (i // 2) * (chh + gap)) for i in range(4)]
    flavors = ('blueberry', 'marshmallow')
    sets = [[tile(p, flavors[(i + s) % 2], (cw, chh)) for i, p in enumerate(PRODUCTS)] for s in (0, 1)]
    mask = rounded((cw, chh), 26)
    shade = np.linspace(0.97, 1.06, h)[:, None, None]  # the studio lightens towards the floor
    stage = np.clip(np.ones((h, w, 3), np.float32) * np.array(STUDIO, np.float32) * shade, 0, 255)
    for i in range(FRAMES):
        t = i / (FRAMES - 1)
        frame = stage.copy()
        for n, (cx, cy) in enumerate(cells):
            rise = ease((t - n * 0.07) / 0.3)  # each tile rises in turn
            swap = ease((t - 0.55 - n * 0.06) / 0.2)  # then wipes to the other flavour in turn
            art = wipe(sets[0][n], sets[1][n], swap, edge=120)
            dy = round((1 - rise) * 90)
            top, bottom = cy + dy, min(cy + dy + chh, h)
            if bottom <= top:
                continue
            a = mask[: bottom - top] * rise
            region = frame[top:bottom, cx:cx + cw]
            region[:] = region * (1 - a) + art[: bottom - top] * a
        Image.fromarray(frame.astype(np.uint8)).save(out / f'f{i + 1:03d}.webp', 'WEBP', quality=82, method=6)
    print(f'brand: {FRAMES} ending frames')


def main():
    product, out = sys.argv[1], pathlib.Path(sys.argv[2])
    if product == 'brand':
        out.mkdir(parents=True, exist_ok=True)
        for old in out.glob('f*.webp'):
            old.unlink()
        return brand(out)
    plates = [plate(Image.open(f'public/products/{product}-{f}-packshot.jpg').convert('RGB')) for f in ('blueberry', 'marshmallow')]
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('f*.webp'):
        old.unlink()
    for i in range(FRAMES):
        t = i / (FRAMES - 1)
        k = ease((t - CROSS[0]) / (CROSS[1] - CROSS[0]))
        first = pushed(plates[0], PUSH * min(t / CROSS[1], 1))
        second = pushed(plates[1], PUSH * max((t - CROSS[0]) / (1 - CROSS[0]), 0))
        frame = wipe(first, second, k)
        Image.fromarray(frame.astype(np.uint8)).save(out / f'f{i + 1:03d}.webp', 'WEBP', quality=82, method=6)
    print(f'{product}: {FRAMES} ending frames')


main()
