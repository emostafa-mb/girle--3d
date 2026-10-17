"""Stitch Google Flow clips and Blender film frames into one scroll film, with soft dissolves.

Flow is good at ingredients and texture but invents its own packaging and logo, so a film can hand
over to the Blender render (the real bottle, print and G) before Flow's branding shows.

Run from the repo root:  python design/flow/compose.py <film> <downloads folder> <blender frames folder>
<blender frames folder> holds the Blender film's WebP frames (copied out of public/films/<film>
first, because the output replaces them).
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
    'body-butter': [
        (0.0, 10.0, ('video', 'Ingredients_whipping_into_pink_b…_20261017203443.mp4', 0.0, 10.0)),
        (9.4, 13.9, ('video', 'Body_butter_jar_closing_20261017203452.mp4', 0.0, 4.5)),  # before Flow's own label
        (13.3, 16.9, ('frames', 92, 120)),  # the lid settles, the print wraps, the G rises
    ],
    'body-lotion': [
        (0.0, 10.0, ('video', 'Coconut_milk_and_oil_swirl_20261017203607.mp4', 0.0, 10.0)),
        (9.2, 14.4, ('frames', 50, 120)),  # the lotion pours into the real bottle, cap, print, G
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
