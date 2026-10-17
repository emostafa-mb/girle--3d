"""Convert rendered film frames (films/<name>/fNNN.png) to WebP for the storefront.
Run: python publish_films.py <render folder> <repo root> [name ...]"""
import os
import sys
from PIL import Image

src, root = sys.argv[1], sys.argv[2]
slugs = {'wash': 'body-wash', 'lotion': 'body-lotion', 'butter': 'body-butter', 'mist': 'body-mist', 'brand': 'brand'}
for name in sys.argv[3:] or slugs:
    d = os.path.join(src, 'films', name)
    if not os.path.isdir(d):
        continue
    out = os.path.join(root, 'public', 'films', slugs[name])
    os.makedirs(out, exist_ok=True)
    total = 0
    for f in sorted(os.listdir(d)):
        if f.endswith('.png'):
            target = os.path.join(out, f[:-4] + '.webp')
            Image.open(os.path.join(d, f)).convert('RGB').save(target, 'WEBP', quality=80, method=6)
            total += os.path.getsize(target)
    print(name, len(os.listdir(out)), 'frames', total // 1024, 'KB')
