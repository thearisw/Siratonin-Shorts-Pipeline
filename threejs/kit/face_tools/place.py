# fit a cut-out face into the 256x256 layout of the existing girl faces (eyes ~140 px wide, centred x~145, eye line y~100)
# python -I place.py cut.png models/faces/<name>.png eye_x0 eye_x1 eye_y [span=140]   (eye coords in the source; writes <name>_prev.png on skin to check)
import sys, numpy as np
from PIL import Image
src, out, eye_x0, eye_x1, eye_y = sys.argv[1], sys.argv[2], *map(float, sys.argv[3:6])
im = Image.open(src).convert('RGBA')
SPAN = float(sys.argv[6]) if len(sys.argv) > 6 else 140.0
s = SPAN / (eye_x1 - eye_x0)
im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
cx, cy = (eye_x0 + eye_x1) / 2 * s, eye_y * s
canvas = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
canvas.alpha_composite(im, (round(145 - cx), round(100 - cy)))
canvas.save(out)
prev = Image.new('RGBA', (256, 256), (240, 200, 170, 255)); prev.alpha_composite(canvas); prev.resize((384, 384)).save(out.replace('.png', '_prev.png'))
