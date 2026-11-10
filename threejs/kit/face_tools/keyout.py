# Make a key colour (white background, baked-in skin) transparent; un-mix anti-aliased edges from that colour.
# Only the region connected to the image border is removed, so enclosed areas (eye whites) stay opaque.
# python -I keyout.py in.png out.png R G B [tol]   (SOFT=1 for soft blush gradients; needs numpy, pillow, scipy)
import os, sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out = sys.argv[1], sys.argv[2]; key = np.array(list(map(float, sys.argv[3:6]))); tol = float(sys.argv[6]) if len(sys.argv) > 6 else 28
im = np.asarray(Image.open(src).convert('RGB')).astype(float); H, W, _ = im.shape
near = np.abs(im - key).max(2) < tol
lab, n = nd.label(near)
border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
bg = np.isin(lab, list(border))
ring = nd.binary_dilation(bg, iterations=3) & ~bg
a = np.ones((H, W)); a[bg] = 0
# alpha of a pixel mixed between key and its ink colour: assume ink is as far from key as possible along each channel
d = np.abs(im - key); span = np.where(im >= key, 255 - key, key); span[span < 1] = 1
ar = (d / span).max(2)
if os.environ.get('SOFT'):  # soft paint (blush gradients): un-mix every pixel from the key colour, not just the edge ring
    ring = np.ones((H, W), bool)
    a = np.clip((ar - 0.04) / 0.96 * 1.25, 0, 1)
else:
    a[ring] = np.clip(ar[ring] * 1.25, 0, 1)
rgb = im.copy(); m = ring & (a > 0.02)
rgb[m] = np.clip((im[m] - key * (1 - a[m, None])) / a[m, None], 0, 255)
Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), 'RGBA').save(out)
print('removed', bg.mean().round(3), 'enclosed key areas kept', n - len(border))
