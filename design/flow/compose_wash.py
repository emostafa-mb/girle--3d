"""Body wash scroll film from two Google Flow clips.

clip 1 (fruit falls, splashes, swirls) dissolves into clip 2 (close-ups, gel vortex, bottle reveal);
the GIRLÉ print wraps onto Flow's blank bottle once it holds still.

Run from the repo root:
  python design/flow/compose_wash.py <clip1.mp4> <clip2.mp4> <label.png> public/films/body-wash
"""
import math
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

clip1, clip2, label_path, out_dir = sys.argv[1:5]
FRAMES = 150
CUT1, DISSOLVE, START2 = 6.5, 0.6, 2.0  # seconds: clip 1 until CUT1, then fade into clip 2 from START2
# Clip 2's bottle stands still from 8.3 s: body centre x, radius, and the print's vertical centre (1280x720 frame).
BOTTLE_X, BOTTLE_R, PRINT_Y, PRINT_W = 640, 100, 430, 150
WRAP_FROM, WRAP_TO = 8.5, 9.3  # clip 2 seconds over which the print wraps round to the front


class Clip:
    def __init__(self, path):
        self.cap = cv2.VideoCapture(path)
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.n = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.duration = self.n / self.fps

    def at(self, t):
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, min(self.n - 1, max(0, round(t * self.fps))))
        ok, frame = self.cap.read()
        if not ok:
            raise RuntimeError(f'cannot read frame at {t}s')
        return frame.astype(np.float32)


def print_layer():
    """The label art (black ink on transparent) trimmed to its content and sized for the bottle."""
    im = Image.open(label_path).convert('RGBA')
    im = im.crop(im.getbbox())
    scale = PRINT_W / im.width
    im = im.resize((PRINT_W, round(im.height * scale)), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255.0


def wrap(label, offset):
    """Project flat label art onto the bottle's cylinder; `offset` (px of arc) turns it round the side."""
    h, w, _ = label.shape
    out = np.zeros((h, 2 * BOTTLE_R, 4), np.float32)
    xs = np.arange(2 * BOTTLE_R) - BOTTLE_R + 0.5
    theta = np.arcsin(np.clip(xs / BOTTLE_R, -1, 1))
    arc = theta * BOTTLE_R - offset + w / 2  # position on the flat label
    valid = (arc >= 0) & (arc < w - 1)
    cols = np.clip(arc, 0, w - 1).astype(int)
    out[:, valid] = label[:, cols[valid]]
    out[..., 3] *= np.clip(np.cos(theta), 0, 1) ** 0.6  # thins out towards the silhouette
    return out


def ease(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def main():
    a, b = Clip(clip1), Clip(clip2)
    total = CUT1 + DISSOLVE + (b.duration - (START2 + DISSOLVE))
    label = print_layer()
    out = pathlib.Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('f*.webp'):
        old.unlink()
    size = 0
    for i in range(FRAMES):
        t = i / (FRAMES - 1) * total
        if t < CUT1:
            frame = a.at(t)
        elif t < CUT1 + DISSOLVE:
            k = ease((t - CUT1) / DISSOLVE)
            frame = a.at(t) * (1 - k) + b.at(START2 + (t - CUT1)) * k
        else:
            tb = START2 + (t - CUT1)
            frame = b.at(tb)
            if tb >= WRAP_FROM:
                k = ease((tb - WRAP_FROM) / (WRAP_TO - WRAP_FROM))
                layer = wrap(label, offset=(1 - k) * -math.pi * BOTTLE_R * 0.9)
                h = layer.shape[0]
                y0, x0 = PRINT_Y - h // 2, BOTTLE_X - BOTTLE_R
                region = frame[y0:y0 + h, x0:x0 + 2 * BOTTLE_R]
                alpha = layer[..., 3:4] * 0.92
                ink = layer[..., :3][..., ::-1] * 255  # RGB -> BGR
                region[:] = region * (1 - alpha) + ink * alpha
        rgb = cv2.cvtColor(np.clip(frame, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB)
        path = out / f'f{i + 1:03d}.webp'
        Image.fromarray(rgb).save(path, 'WEBP', quality=78, method=6)
        size += path.stat().st_size
    print(f'{FRAMES} frames, {total:.1f}s of film, {size // 1024} KB')


main()
