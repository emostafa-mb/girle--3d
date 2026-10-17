# GIRLÉ packshots

Blender scene behind every product photo on the storefront (`public/products`, `public/brand`).

- `labels.py` prints the bottle artwork (wordmark, product name, size) into `tex/`.
- `scene.py` models the four bottles from the supplier photos, builds the pink studio and renders.
- `girle-packshots.blend` is the saved scene, for tweaking by hand in Blender.

```bash
npm i --prefix fonts @fontsource/shrikhand @fontsource/instrument-sans
python labels.py .
blender -b --factory-startup -P scene.py -- . preview          # quick 30% renders in ./preview
blender -b --factory-startup -P scene.py -- . final hero lineup # full size in ./renders; omit names for all
```

Shot names: `wash|mist|butter|lotion` + `-front|-angle`, `hero`, `hero-rtl`, `lineup`.
Renders are PNG; save them as JPEG (quality ~86) into `public/` under the names the storefront uses.
