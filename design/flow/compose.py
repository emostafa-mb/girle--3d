"""Stitch Google Flow clips and an ending into one film, with soft dissolves.

Run from the repo root:
  python design/flow/compose.py <film> <downloads folder> <frames folder>
      150 WebP frames into public/films/<film>/ for a scroll-scrubbed film.
  python design/flow/compose.py <film> <downloads folder> <frames folder> --video
      a 24 fps MP4 at public/films/<film>.mp4, plus <film>-start.jpg and <film>-end.jpg posters,
      for a film that plays by itself.
<frames folder> holds the ending's WebP frames from compose_ending.py (render it with enough frames
for 24 fps when making a video).
"""
import pathlib
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image

FRAMES = 150
FPS = 24

# Each segment covers [start, end] seconds of the finished film. Overlapping segments dissolve.
# ('video', file, from_s, to_s) plays a Flow clip; ('frames', 1, None) plays the ending's frames, all of them.
FILMS = {
    # Home: products dropping, one moment per product in routine order, then the four products landing.
    # Every ('frames', ...) ending is from compose_ending.py: a Flow clip with the real prints wrapped on.
    'brand': [
        # opening: products and drops falling (cut before that clip's own G appears)
        (0.0, 3.6, ('video', 'Cosmetics_products_drop_on_floor_20261017205059.mp4', 0.0, 3.6)),
        # one moment per product in routine order, alternating the two flavours
        (3.0, 6.6, ('video', 'Blueberries_and_gel_ribbon_swirling_20261017220747.mp4', 0.6, 4.2)),
        (6.0, 9.6, ('video', 'Marshmallows_and_sugar_forming_s…_20261017221126.mp4', 2.0, 5.6)),
        (9.0, 12.6, ('video', 'Blueberries_and_lotion_swirling_20261017221342.mp4', 0.5, 4.1)),
        (12.0, 15.6, ('video', 'Marshmallows_splash_into_pink_li…_20261017221433.mp4', 1.0, 4.6)),
        (15.0, 21.0, ('frames', 1, None)),
    ],
    # Flavours: the Blueberry clip, then the Marshmallow clip, then the packaging.
    'body-wash': [
        (0.0, 7.6, ('video', 'Blueberries_and_gel_ribbon_swirling_20261017220747.mp4', 0.0, 7.6)),
        (7.0, 14.6, ('video', 'Gel_ribbon_and_marshmallows_boun…_20261017220830.mp4', 0.2, 7.8)),
        (14.0, 20.0, ('frames', 1, None)),
    ],
    'body-scrub': [
        (0.0, 7.6, ('video', 'Blueberries_and_sugar_tumbling_20261017220926.mp4', 0.0, 7.6)),
        (7.0, 14.6, ('video', 'Marshmallows_and_sugar_forming_s…_20261017221126.mp4', 0.2, 7.8)),
        (14.0, 19.5, ('frames', 1, None)),
    ],
    'body-splash': [
        (0.0, 5.5, ('video', 'Blueberries_dropping_into_liquid_20261017221417.mp4', 0.3, 5.8)),
        (4.9, 10.4, ('video', 'Marshmallows_splash_into_pink_li…_20261017221433.mp4', 1.0, 6.5)),
        (9.8, 15.8, ('frames', 1, None)),
    ],
    'body-lotion': [
        (0.0, 7.6, ('video', 'Blueberries_and_lotion_swirling_20261017221342.mp4', 0.0, 7.6)),
        (7.0, 14.6, ('video', 'Creamy_lotion_swirls_and_marshma…_20261017221351.mp4', 0.2, 7.8)),
        (14.0, 20.0, ('frames', 1, None)),
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
    film, downloads, ending_dir = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
    as_video = '--video' in sys.argv[4:]
    segments = FILMS[film]
    clips = {s[2][1]: Clip(downloads / s[2][1]) for s in segments if s[2][0] == 'video'}
    ending = sorted(ending_dir.glob('f*.webp'))
    size = None

    def render(seg, t):
        start, end, src = seg
        k = (t - start) / (end - start)
        if src[0] == 'video':
            return clips[src[1]].at(src[2] + k * (src[3] - src[2]))
        last = src[2] or len(ending)
        n = round(src[1] + k * (last - src[1]))
        im = Image.open(ending[n - 1]).convert('RGB')
        return np.asarray(im.resize(size, Image.LANCZOS) if im.size != size else im).astype(np.float32)

    def frame_at(t):
        nonlocal size
        live = [s for s in segments if s[0] <= t <= s[1]]
        frame = render(live[0], t)
        if size is None:
            size = (frame.shape[1], frame.shape[0])
        if len(live) > 1:  # dissolve across the overlap
            nxt = live[1]
            w = ease((t - nxt[0]) / (live[0][1] - nxt[0]))
            frame = frame * (1 - w) + render(nxt, t) * w
        return np.clip(frame, 0, 255).astype(np.uint8)

    total = max(s[1] for s in segments)
    films = pathlib.Path('public/films')
    if as_video:
        count = round(total * FPS)
        first = frame_at(0)
        h, w = first.shape[:2]
        mp4 = films / f'{film}.mp4'
        enc = subprocess.Popen(
            ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', str(FPS),
             '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p',
             '-movflags', '+faststart', str(mp4)],
            stdin=subprocess.PIPE,
        )
        for i in range(count):
            frame = first if i == 0 else frame_at(i / FPS)
            enc.stdin.write(frame.tobytes())
            if i == count - 1:
                Image.fromarray(frame).save(films / f'{film}-end.jpg', quality=86, optimize=True, progressive=True)
        enc.stdin.close()
        if enc.wait():
            raise RuntimeError('ffmpeg failed')
        Image.fromarray(first).save(films / f'{film}-start.jpg', quality=86, optimize=True, progressive=True)
        print(f'{film}: {count} frames at {FPS} fps, {total:.1f}s, {mp4.stat().st_size // 1024} KB')
        return

    out = films / film
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('f*.webp'):
        old.unlink()
    written = 0
    for i in range(FRAMES):
        path = out / f'f{i + 1:03d}.webp'
        Image.fromarray(frame_at(i / (FRAMES - 1) * total)).save(path, 'WEBP', quality=78, method=6)
        written += path.stat().st_size
    print(f'{film}: {FRAMES} frames, {total:.1f}s of film, {written // 1024} KB')

main()
