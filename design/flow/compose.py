"""Stitch Google Flow clips and Blender film frames into one scroll film, with soft dissolves.

Flow is good at ingredients and texture but invents its own packaging and logo, so a film can hand
over to the Blender render (the real bottle, print and G) before Flow's branding shows.

Run from the repo root:  python design/flow/compose.py <film> <downloads folder> <frames folder>
<frames folder> holds the WebP frames the ('frames', ...) segment plays: an ending from ending.py, or
for body wash the previous film's ending (copied out of public/films/<film> first, because the output
replaces them).
"""
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

FRAMES = 150

# Each segment covers [start, end] seconds of the finished film. Overlapping segments dissolve.
# ('video', file, from_s, to_s) plays a Flow clip; ('frames', from_n, to_n) plays Blender frames.
FILMS = {
    # Home: one ingredient moment per product, in routine order, then the Blender line-up and G.
    'brand': [
        # opening: products and drops falling (cut before that clip's own G appears)
        (0.0, 3.6, ('video', 'Cosmetics_products_drop_on_floor_20261017205059.mp4', 0.0, 3.6)),
        # one moment per product in routine order, alternating the two flavours
        (3.0, 6.6, ('video', 'Blueberries_and_gel_ribbon_swirling_20261017220747.mp4', 0.6, 4.2)),
        (6.0, 9.6, ('video', 'Marshmallows_and_sugar_forming_s…_20261017221126.mp4', 2.0, 5.6)),
        (9.0, 12.6, ('video', 'Blueberries_and_lotion_swirling_20261017221342.mp4', 0.5, 4.1)),
        (12.0, 15.6, ('video', 'Marshmallows_splash_into_pink_li…_20261017221433.mp4', 1.0, 4.6)),
        (15.0, 19.0, ('frames', 1, 60)),  # ending.py brand: the four products, both flavours
    ],
    # Flavours: the Blueberry clip, then the Marshmallow clip, then the packaging.
    'body-wash': [
        (0.0, 7.6, ('video', 'Blueberries_and_gel_ribbon_swirling_20261017220747.mp4', 0.0, 7.6)),
        (7.0, 14.6, ('video', 'Gel_ribbon_and_marshmallows_boun…_20261017220830.mp4', 0.2, 7.8)),
        # the previous film's ending: Flow's bottle with the print wrapped on (compose_wash.py)
        (14.0, 16.8, ('frames', 132, 150)),
    ],
    'body-scrub': [
        (0.0, 7.6, ('video', 'Blueberries_and_sugar_tumbling_20261017220926.mp4', 0.0, 7.6)),
        (7.0, 14.6, ('video', 'Marshmallows_and_sugar_forming_s…_20261017221126.mp4', 0.2, 7.8)),
        (14.0, 18.0, ('video', 'Body_butter_jar_closing_20261017203452.mp4', 0.5, 4.5)),  # before Flow's own label
        (17.4, 21.4, ('frames', 1, 60)),  # ending.py: the Blueberry jar, then Marshmallow
    ],
    'body-splash': [
        (0.0, 5.5, ('video', 'Blueberries_dropping_into_liquid_20261017221417.mp4', 0.3, 5.8)),
        (4.9, 10.4, ('video', 'Marshmallows_splash_into_pink_li…_20261017221433.mp4', 1.0, 6.5)),
        (9.8, 13.6, ('video', 'Filling_bottle_with_pink_liquid_20261017204022.mp4', 2.5, 6.3)),  # before Flow's label
        (13.0, 17.0, ('frames', 1, 60)),  # ending.py: the Blueberry bottle, then Marshmallow
    ],
    'body-lotion': [
        (0.0, 7.6, ('video', 'Blueberries_and_lotion_swirling_20261017221342.mp4', 0.0, 7.6)),
        (7.0, 14.6, ('video', 'Creamy_lotion_swirls_and_marshma…_20261017221351.mp4', 0.2, 7.8)),
        (14.0, 18.0, ('frames', 1, 60)),  # ending.py: the Blueberry bottle, then Marshmallow
    ],
}


class Clip:
    def __init__(self, path):
        self.cap = cv2.VideoCapture(str(path))
        if not self.cap.isOpened():
            raise FileNotFoundError(path)
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.n = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))

    def at(self, t):
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, min(self.n - 1, max(0, round(t * self.fps))))
        ok, frame = self.cap.read()
        if not ok:
            raise RuntimeError(f'cannot read frame at {t}s')
        return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB).astype(np.float32)


def ease(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def main():
    film, downloads, blender_dir = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
    segments = FILMS[film]
    clips = {s[2][1]: Clip(downloads / s[2][1]) for s in segments if s[2][0] == 'video'}
    size = None

    def render(seg, t):
        start, end, src = seg
        k = (t - start) / (end - start)
        if src[0] == 'video':
            return clips[src[1]].at(src[2] + k * (src[3] - src[2]))
        n = round(src[1] + k * (src[2] - src[1]))
        im = Image.open(blender_dir / f'f{n:03d}.webp').convert('RGB')
        return np.asarray(im.resize(size, Image.LANCZOS) if im.size != size else im).astype(np.float32)

    total = max(s[1] for s in segments)
    out = pathlib.Path('public/films') / film
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('f*.webp'):
        old.unlink()
    written = 0
    for i in range(FRAMES):
        t = i / (FRAMES - 1) * total
        live = [s for s in segments if s[0] <= t <= s[1]]
        frame = render(live[0], t)
        if size is None:
            size = (frame.shape[1], frame.shape[0])
        if len(live) > 1:  # dissolve across the overlap
            nxt = live[1]
            w = ease((t - nxt[0]) / (live[0][1] - nxt[0]))
            frame = frame * (1 - w) + render(nxt, t) * w
        path = out / f'f{i + 1:03d}.webp'
        Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8)).save(path, 'WEBP', quality=78, method=6)
        written += path.stat().st_size
    print(f'{film}: {FRAMES} frames, {total:.1f}s of film, {written // 1024} KB')


main()
