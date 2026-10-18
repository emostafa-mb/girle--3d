"""Film endings from Flow clips of the two flavours side by side, with blank packaging: once the bottles
settle, the real GIRLÉ print (with the flavour name) wraps round onto each one, as on the first body
wash ending. The bottles are tracked against the clip's last frame, so a slow camera move carries the
print with it.

Run from the repo root:  python design/flow/compose_ending.py <product|brand> <downloads> <label folder> <out folder>
<label folder> holds the flavour prints from design/packshots/labels.py. Writes <out folder>/f001.webp ...
"""
import math
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

FRAMES = 72

# clip, (from, to) seconds used, (wrap starts, wrap ends) in clip seconds, and per bottle:
# (label artwork, (centre x, radius, print centre y, print width)) measured on the clip's last frame.
ENDINGS = {
    'body-wash': ('Cosmetics_commercial_with_swirli…_20261017225627.mp4', (2.0, 8.0), (3.6, 4.6), [
        ('wash-blueberry-white.png', (522, 78, 390, 116)),
        ('wash-marshmallow.png', (775, 78, 390, 116)),
    ]),
    'body-scrub': ('Cosmetics_jars_with_sugar_scrub_20261017225700.mp4', (2.5, 8.0), (5.2, 6.2), [
        ('scrub-blueberry-white.png', (446, 164, 392, 200)),
        ('scrub-marshmallow.png', (842, 165, 392, 200)),
    ]),
    'body-lotion': ('Cosmetics_bottles_in_studio_20261017225716.mp4', (2.0, 8.0), (4.6, 5.6), [
        ('lotion-blueberry.png', (545, 80, 380, 116)),
        ('lotion-marshmallow.png', (754, 78, 380, 116)),
    ]),
    # the home film: the four products land in a row on the right, two in each flavour
    'brand': ('Cosmetics_products_dropping_in_s…_20261017225856.mp4', (2.0, 8.0), (5.0, 6.0), [
        ('wash-blueberry-white.png', (485, 75, 390, 112)),
        ('scrub-blueberry-white.png', (681, 118, 472, 118)),
        ('lotion-marshmallow.png', (905, 90, 390, 130)),
        ('splash-marshmallow.png', (1115, 52, 420, 80)),
    ]),
    'body-splash': ('Cosmetics_bottles_with_splash_an…_20261017225748.mp4', (2.0, 8.0), (6.2, 7.2), [
        ('splash-blueberry-white.png', (526, 66, 430, 98)),
        ('splash-marshmallow.png', (767, 66, 430, 98)),
    ]),
}


def ease(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def read_all(path):
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(f)
    return frames, fps


def track(frames, first, bottles):
    """Each bottle's offset from its place in the last frame, smoothed by a quadratic fit over time."""
    ref = cv2.cvtColor(frames[-1], cv2.COLOR_BGR2GRAY).astype(np.float32)
    out = []
    for _, (cx, r, cy, _w) in bottles:
        x0, x1 = int(cx - 1.3 * r), int(cx + 1.3 * r)
        y0, y1 = int(cy - 1.6 * r), int(cy + 1.6 * r)
        win = cv2.createHanningWindow((x1 - x0, y1 - y0), cv2.CV_32F)
        idx, dxs, dys = [], [], []
        for i in range(first, len(frames)):
            g = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY).astype(np.float32)
            (dx, dy), _ = cv2.phaseCorrelate(ref[y0:y1, x0:x1], g[y0:y1, x0:x1], win)
            idx.append(i), dxs.append(dx), dys.append(dy)
        fx, fy = np.polyfit(idx, dxs, 2), np.polyfit(idx, dys, 2)
        out.append(lambda i, fx=fx, fy=fy: (float(np.polyval(fx, i)), float(np.polyval(fy, i))))
    return out


def label(path, width):
    im = Image.open(path).convert('RGBA')
    im = im.crop(im.getbbox())
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def wrap(art, radius, offset):
    """Project flat label art onto a cylinder of `radius`; `offset` (px of arc) turns it round the side."""
    a = np.asarray(art).astype(np.float32) / 255
    h, w, _ = a.shape
    xs = np.arange(2 * radius) - radius + 0.5
    theta = np.arcsin(np.clip(xs / radius, -1, 1))
    arc = theta * radius - offset + w / 2
    valid = (arc >= 0) & (arc < w - 1)
    layer = np.zeros((h, 2 * radius, 4), np.float32)
    layer[:, valid] = a[:, np.clip(arc, 0, w - 1).astype(int)[valid]]
    layer[..., 3] *= np.clip(np.cos(theta), 0, 1) ** 0.6
    return layer


def main():
    product, downloads, labels, out = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]), pathlib.Path(sys.argv[4])
    clip, (t0, t1), (w0, w1), bottles = ENDINGS[product]
    frames, fps = read_all(downloads / clip)
    first = int(w0 * fps) - 1
    paths = track(frames, first, bottles)
    arts = [label(labels / name, w) for name, (_, _, _, w) in bottles]
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('f*.webp'):
        old.unlink()
    for n in range(FRAMES):
        t = t0 + n / (FRAMES - 1) * (t1 - t0)
        i = min(len(frames) - 1, round(t * fps))
        rgb = cv2.cvtColor(frames[i], cv2.COLOR_BGR2RGB).astype(np.float32)
        k = ease((t - w0) / (w1 - w0))
        if t >= w0:
            for art, path, (_, (cx, r, cy, _w)) in zip(arts, paths, bottles):
                dx, dy = path(max(i, first))
                layer = wrap(art, r, (1 - k) * -math.pi * r * 0.9)
                h = layer.shape[0]
                x, y = int(round(cx + dx)) - r, int(round(cy + dy)) - h // 2
                region = rgb[y:y + h, x:x + 2 * r]
                alpha = layer[..., 3:4] * 0.92
                region[:] = region * (1 - alpha) + layer[..., :3] * 255 * alpha
        Image.fromarray(rgb.clip(0, 255).astype(np.uint8)).save(out / f'f{n + 1:03d}.webp', 'WEBP', quality=80, method=6)
    print(f'{product}: {FRAMES} ending frames from {clip[:28]}…')


main()
