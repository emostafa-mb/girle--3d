"""Product photos from the Google Flow clips: an ingredients shot per product, plus the body wash
packshot (Flow's blank bottle with the GIRLÉ print added, as in its film).

Run from the repo root:  python design/flow/photos.py <downloads folder> <body wash label.png>
Writes 4:5 JPEGs to public/products/.
"""
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

downloads, label_path = pathlib.Path(sys.argv[1]), sys.argv[2]
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
# Same geometry as compose_wash.py: the bottle's body centre, radius and print centre.
BOTTLE_X, BOTTLE_R, PRINT_Y, PRINT_W = 640, 100, 430, 150


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


def add_print(rgb):
    label = Image.open(label_path).convert('RGBA')
    label = label.crop(label.getbbox())
    label = label.resize((PRINT_W, round(label.height * PRINT_W / label.width)), Image.LANCZOS)
    art = np.asarray(label).astype(np.float32) / 255
    h, w, _ = art.shape
    xs = np.arange(2 * BOTTLE_R) - BOTTLE_R + 0.5
    theta = np.arcsin(np.clip(xs / BOTTLE_R, -1, 1))
    cols = np.clip(theta * BOTTLE_R + w / 2, 0, w - 1).astype(int)
    valid = np.abs(theta * BOTTLE_R) < w / 2
    layer = np.zeros((h, 2 * BOTTLE_R, 4), np.float32)
    layer[:, valid] = art[:, cols[valid]]
    layer[..., 3] *= np.clip(np.cos(theta), 0, 1) ** 0.6
    y0, x0 = PRINT_Y - h // 2, BOTTLE_X - BOTTLE_R
    region = rgb[y0:y0 + h, x0:x0 + 2 * BOTTLE_R]
    alpha = layer[..., 3:4] * 0.92
    region[:] = region * (1 - alpha) + layer[..., :3] * 255 * alpha
    return rgb


for slug, (clip, t, cx) in INGREDIENTS.items():
    save(crop(frame(clip, t), cx), f'{slug}-detail.jpg')
save(crop(add_print(frame(*WASH_BOTTLE)), BOTTLE_X), 'body-wash-packshot.jpg')
