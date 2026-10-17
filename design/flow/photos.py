"""Product photos per flavour: a packshot from a blank-packaging still made in Gemini/Flow (stills/), with
the real GIRLÉ print wrapped onto it, and an ingredients shot from the flavour's Flow clip.

Run from the repo root:  python design/flow/photos.py <downloads folder> <label folder>
<label folder> holds the print artwork from design/packshots/labels.py (wash-blueberry.png, ...).
Writes public/products/<product>-<flavour>-packshot.jpg and -detail.jpg.
"""
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

downloads, labels = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
STILLS = pathlib.Path(__file__).parent / 'stills'
OUT = pathlib.Path('public/products')
W, H = 576, 720  # a 4:5 window out of the 1280x720 frame

# <product>-<flavour> -> (clip, second, centre x of the crop)
DETAILS = {
    'body-wash-blueberry': ('Blueberries_and_gel_ribbon_swirling_20261017220747.mp4', 1.6, 640),
    'body-wash-marshmallow': ('Gel_ribbon_and_marshmallows_boun…_20261017220830.mp4', 4.2, 640),
    'body-scrub-blueberry': ('Blueberries_and_sugar_tumbling_20261017220926.mp4', 4.5, 640),
    'body-scrub-marshmallow': ('Marshmallows_and_sugar_forming_s…_20261017221126.mp4', 6.0, 640),
    'body-lotion-blueberry': ('Blueberries_and_lotion_swirling_20261017221342.mp4', 1.2, 640),
    'body-lotion-marshmallow': ('Creamy_lotion_swirls_and_marshma…_20261017221351.mp4', 3.0, 640),
    'body-splash-blueberry': ('Blueberries_dropping_into_liquid_20261017221417.mp4', 3.0, 640),
    'body-splash-marshmallow': ('Marshmallows_splash_into_pink_li…_20261017221433.mp4', 2.9, 640),
}

# stills/<product>-<flavour>.jpg -> (label artwork, (bottle centre x, radius, print centre y, print width)) in
# the still's pixels. White ink where the contents are dark.
PACKSHOTS = {
    'body-wash-blueberry': ('wash-blueberry-white.png', (448, 125, 470, 170)),
    'body-wash-marshmallow': ('wash-marshmallow.png', (447, 112, 520, 160)),
    'body-scrub-blueberry': ('scrub-blueberry-white.png', (447, 257, 700, 260)),
    'body-scrub-marshmallow': ('scrub-marshmallow.png', (447, 242, 680, 240)),
    'body-lotion-blueberry': ('lotion-blueberry.png', (447, 115, 690, 160)),
    'body-lotion-marshmallow': ('lotion-marshmallow.png', (447, 114, 700, 160)),
    'body-splash-blueberry': ('splash-blueberry-white.png', (448, 97, 700, 140)),
    'body-splash-marshmallow': ('splash-marshmallow.png', (449, 91, 710, 132)),
}


def frame(clip, t):
    cap = cv2.VideoCapture(str(downloads / clip))
    cap.set(cv2.CAP_PROP_POS_FRAMES, round(t * cap.get(cv2.CAP_PROP_FPS)))
    ok, bgr = cap.read()
    if not ok:
        raise RuntimeError(f'cannot read {clip} at {t}s')
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32)


def crop(rgb, cx):
    x0 = int(min(max(cx - W // 2, 0), rgb.shape[1] - W))
    return rgb[:H, x0:x0 + W]


def save(rgb, name):
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(OUT / name, quality=90, optimize=True, progressive=True)
    print('wrote', name)


def add_print(rgb, label_file, geometry):
    """Wrap the label artwork round a cylindrical bottle body facing the camera."""
    cx, radius, print_y, print_w = geometry
    label = Image.open(labels / label_file).convert('RGBA')
    label = label.crop(label.getbbox())
    label = label.resize((print_w, round(label.height * print_w / label.width)), Image.LANCZOS)
    art = np.asarray(label).astype(np.float32) / 255
    h, w, _ = art.shape
    xs = np.arange(2 * radius) - radius + 0.5
    theta = np.arcsin(np.clip(xs / radius, -1, 1))
    cols = np.clip(theta * radius + w / 2, 0, w - 1).astype(int)
    valid = np.abs(theta * radius) < w / 2
    layer = np.zeros((h, 2 * radius, 4), np.float32)
    layer[:, valid] = art[:, cols[valid]]
    layer[..., 3] *= np.clip(np.cos(theta), 0, 1) ** 0.6
    y0, x0 = print_y - h // 2, cx - radius
    region = rgb[y0:y0 + h, x0:x0 + 2 * radius]
    alpha = layer[..., 3:4] * 0.92
    region[:] = region * (1 - alpha) + layer[..., :3] * 255 * alpha
    return rgb


for name, (clip, t, cx) in DETAILS.items():
    save(crop(frame(clip, t), cx), f'{name}-detail.jpg')
for name, (label_file, geometry) in PACKSHOTS.items():
    rgb = np.asarray(Image.open(STILLS / f'{name}.jpg').convert('RGB')).astype(np.float32)
    save(add_print(rgb, label_file, geometry), f'{name}-packshot.jpg')
