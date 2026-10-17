# Prints the bottle artwork into ./tex. Needs: npm i --prefix fonts @fontsource/shrikhand @fontsource/instrument-sans
# Run: python labels.py <this folder>
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageOps
S = sys.argv[1]
F = os.path.join(S, 'fonts/node_modules/@fontsource')
shr = lambda px: ImageFont.truetype(os.path.join(F, 'shrikhand/files/shrikhand-latin-400-normal.woff'), px)
ins = lambda px, w=600: ImageFont.truetype(os.path.join(F, f'instrument-sans/files/instrument-sans-latin-{w}-normal.woff'), px)

logo = Image.open(os.path.join(S, 'logo.png')).convert('L')
g = logo.crop((326, 296, 766, 802))
g_alpha = ImageOps.invert(g).point(lambda v: 0 if v < 60 else min(255, int((v - 60) * 255 / 120)))

def wordmark(height, ink=(0, 0, 0)):
    """G mark + 'irlé' set in Shrikhand; height = G height in px."""
    gh = height
    gw = int(g_alpha.width * gh / g_alpha.height)
    gm = g_alpha.resize((gw, gh), Image.LANCZOS)
    font = shr(int(gh * 0.80))
    text = 'irlé'
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    W = gw + tw + int(gh * 0.02)
    img = Image.new('RGBA', (W + 20, gh + 20), (0, 0, 0, 0))
    solid = Image.new('RGBA', gm.size, ink + (255,))
    img.paste(solid, (10, 10), gm)
    d = ImageDraw.Draw(img)
    # baseline of 'irlé' sits ~ at 72% of G height (G's bowl bottom)
    asc, desc = font.getmetrics()
    base_y = 10 + int(gh * 0.78)
    d.text((10 + gw - int(gh * 0.10) - bbox[0], base_y - asc), text, font=font, fill=ink + (255,))
    return img.crop(img.getbbox())

def print_band(path, w, h, product, size, ink=(0, 0, 0), flavor=None):
    """Logo, product name, optional flavour, size. Without a flavour this is the Blender bottle print."""
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    wm = wordmark(int(h * 0.40), ink)
    if wm.width > w * 0.36:
        r = w * 0.36 / wm.width
        wm = wm.resize((int(wm.width * r), int(wm.height * r)), Image.LANCZOS)
    img.alpha_composite(wm, ((w - wm.width) // 2, int(h * 0.14)))
    d = ImageDraw.Draw(img)
    lines = [(product, ins(int(h * 0.12), 600), 0.55)]
    if flavor:
        lines = [(product, ins(int(h * 0.11), 600), 0.53), (flavor, ins(int(h * 0.085), 500), 0.69)]
    lines.append((size, ins(int(h * 0.075), 500), 0.84 if flavor else 0.76))
    for text, font, y in lines:
        b = d.textbbox((0, 0), text, font=font)
        d.text(((w - (b[2] - b[0])) // 2, int(h * y)), text, font=font, fill=ink + (255,))
    img.save(path)

out = os.path.join(S, 'tex'); os.makedirs(out, exist_ok=True)
wordmark(600).save(os.path.join(out, 'wordmark.png'))
print_band(os.path.join(out, 'wash.png'), 2400, 1200, 'Body wash', '250 ml')
print_band(os.path.join(out, 'splash.png'), 2400, 1200, 'Body splash', '150 ml')
print_band(os.path.join(out, 'scrub.png'), 2400, 1200, 'Body scrub', '200 g')
print_band(os.path.join(out, 'lotion.png'), 2400, 1200, 'Body lotion', '150 ml')
# flavour prints for the product photos (design/flow/photos.py), in black and in white ink
for key, product, size in (('wash', 'Body wash', '250 ml'), ('scrub', 'Body scrub', '200 g'),
                           ('lotion', 'Body lotion', '150 ml'), ('splash', 'Body splash', '150 ml')):
    for flavor in ('Blueberry', 'Marshmallow'):
        for suffix, ink in (('', (0, 0, 0)), ('-white', (255, 255, 255))):
            print_band(os.path.join(out, f'{key}-{flavor.lower()}{suffix}.png'), 2400, 1200, product, size, ink, flavor)
# preview on pink
for n in ['wordmark', 'wash']:
    im = Image.open(os.path.join(out, n + '.png'))
    bg = Image.new('RGBA', im.size, (244, 177, 195, 255)); bg.alpha_composite(im)
    bg.convert('RGB').save(os.path.join(out, n + '_preview.jpg'))
print('done')
