"""Product photos: an ingredients shot per product from its Flow clip, the body wash packshot
(Flow's blank bottle), and packshots from blank-packaging stills made in Gemini/Flow (stills/).
The GIRLÉ print is added to every packshot here, so the logo is always the real one.

Run from the repo root:  python design/flow/photos.py <downloads folder> <label folder>
<label folder> holds the print artwork from design/packshots/labels.py (wash.png, lotion.png, ...).
Writes JPEGs to public/products/.
"""
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

downloads, labels = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
OUT = pathlib.Path('public/products')
W, H = 576, 720  # a 4:5 window out of the 1280x720 frame

# product slug -> (clip, second, centre x of the crop)
INGREDIENTS = {
    'body-wash': ('Fruit_pieces_and_oil_splash_20261017201611.mp4', 3.4, 640),
    'body-lotion': ('Coconut_milk_and_oil_swirl_20261017203607.mp4', 3.0, 830),
    'body-butter': ('Ingredients_whipping_into_pink_b…_20261017203443.mp4', 2.5, 600),
    'body-mist': ('Fruits_and_petals_drifting_20261017204030.mp4', 3.6, 640),
}
WASH_BOTTLE = ('Fruit_and_oil_blending_20261017201620.mp4', 9.95)
# Same geometry as compose_wash.py: the bottle's body centre x, radius, print centre y and print width.
WASH_GEOMETRY = (640, 100, 430, 150)
# Stills with blank packaging (design/flow/stills/<slug>.jpg) -> label and the same geometry, in pixels.
STILLS = {
    'body-lotion': ('lotion.png', (448, 103, 723, 150)),
    'body-butter': ('butter.png', (447, 215, 782, 200)),
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


for slug, (clip, t, cx) in INGREDIENTS.items():
    save(crop(frame(clip, t), cx), f'{slug}-detail.jpg')
save(crop(add_print(frame(*WASH_BOTTLE), 'wash.png', WASH_GEOMETRY), WASH_GEOMETRY[0]), 'body-wash-packshot.jpg')
for slug, (label_file, geometry) in STILLS.items():
    still = pathlib.Path(__file__).parent / 'stills' / f'{slug}.jpg'
    if still.exists():
        rgb = np.asarray(Image.open(still).convert('RGB')).astype(np.float32)
        save(add_print(rgb, label_file, geometry), f'{slug}-packshot.jpg')
