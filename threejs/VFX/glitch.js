// Glitch VFX: a 2D post pass on the finished frame (picture + caption), for "the world is breaking" moments
// (fourth-wall video, scripts/fourth_wall_review.md B.1-2). Reusable in any video. Deterministic: everything is seeded by
// the frame number and a seed, never Math.random(), so the GPU render workers all draw the same glitch on the same frame.
//
//   import { glitchTrack, glitchWords, loadWords, hudText } from '../../VFX/glitch.js';
//   const G = glitchTrack([
//     { at: 1.85, dur: 0.45, kind: 'cut' },                 // hook cut off: hard glitch, then black
//     { at: 9.40, dur: 0.30 },                              // "your... dog": a normal hit
//     { at: 21.1, dur: 0.40, kind: 'static', stutter: 0.1 } // "pine-": static + picture loops 0.1 s
//   ]);
//   export async function setup() {
//     const words = glitchWords(await loadWords('fourth_wall'), [{ match: 'pine-', type: true }]);
//     return { shots, words, timeMap: G.timeMap, post: (ctx, t) => { G.post(ctx, t); hudText(ctx, t, { at: 95, dur: 3, text: 'CODE 2: BREACHED CONTAINMENT. AREA 45' }); } };
//   }
//
// Director hooks used (kit/director.js): `post(ctx, t)` runs AFTER the caption is drawn (so the caption glitches too);
// `timeMap(t)` remaps the 3D picture's time only (freeze / stutter), captions and audio keep real time.
//
// Event kinds (all take at, dur, k = strength 0..1, seed):
//   'hit'    (default) slice displacement + RGB split + scanlines + a few displaced blocks, flickering on/off
//   'soft'   small RGB split + scanlines + 1-2 thin slices: an "almost nothing" unease glitch (deja vu beats)
//   'static' TV static over the frame + RGB split + rolling bar
//   'black'  black frame with a couple of static lines (a dropped signal)
//   'cut'    a 'hit' for the first 60%, then 'black' (the cut-off hook)
// Extra per event: stutter: 'freeze' (hold the picture at `at`) or a number (loop that many seconds of picture), tint: '#ff2a2a'.
import { W, H } from '../kit/core.js';

const FPS = 30;

/** Deterministic hash of integers -> [0, 1). */
export function hash(a, b = 0, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------- offscreen buffers (made once) ----------
let buf = null, chan = null, noiseTiles = null;
function canvas(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function grab(ctx) {
  if (!buf) buf = canvas();
  const b = buf.getContext('2d'); b.globalCompositeOperation = 'copy'; b.drawImage(ctx.canvas, 0, 0); b.globalCompositeOperation = 'source-over';
  return buf;
}
function noise(i) {
  if (!noiseTiles) {
    noiseTiles = [];
    for (let n = 0; n < 4; n++) {
      const c = canvas(270, 480), x = c.getContext('2d'), img = x.createImageData(270, 480);
      for (let p = 0; p < 270 * 480; p++) { const v = hash(p, n, 7) * 255 | 0; img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = v; img.data[p * 4 + 3] = 255; }
      x.putImageData(img, 0, 0); noiseTiles.push(c);
    }
  }
  return noiseTiles[i % noiseTiles.length];
}

// ---------- building blocks (each works on the current frame in ctx) ----------
/** Horizontal slice displacement: n bands shifted sideways by up to `amt` x frame width. */
export function slices(ctx, f, seed, n = 8, amt = 0.08) {
  const src = grab(ctx);
  for (let i = 0; i < n; i++) {
    const y = hash(f, seed, i * 3) * H, h = 8 + hash(f, seed, i * 3 + 1) * H * 0.09;
    const dx = (hash(f, seed, i * 3 + 2) - 0.5) * 2 * amt * W;
    ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
    ctx.drawImage(src, 0, y, W, h, dx - Math.sign(dx) * W, y, W, h);   // wrap the part that slid off
  }
}
/** RGB split: red and blue copies pushed apart by `px` pixels (the classic chromatic glitch). Caption included. */
export function rgbSplit(ctx, px = 12, dy = 0) {
  const src = grab(ctx);
  if (!chan) chan = [canvas(), canvas(), canvas()];
  const cols = ['#f00', '#0f0', '#00f'], off = [[-px, -dy], [0, 0], [px, dy]];
  chan.forEach((c, i) => { const x = c.getContext('2d'); x.globalCompositeOperation = 'copy'; x.drawImage(src, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = cols[i]; x.fillRect(0, 0, W, H); });
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
  chan.forEach((c, i) => ctx.drawImage(c, off[i][0], off[i][1]));
  ctx.restore();
}
/** Dark scanlines every `gap` px. */
export function scanlines(ctx, alpha = 0.18, gap = 4) {
  ctx.save(); ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < H; y += gap) ctx.fillRect(0, y, W, gap / 2);
  ctx.restore();
}
/** A few rectangles of the picture copied to the wrong place, some tinted cyan/magenta (datamosh blocks). */
export function blocks(ctx, f, seed, n = 6) {
  const src = grab(ctx);
  for (let i = 0; i < n; i++) {
    const r = k => hash(f, seed + 101, i * 7 + k);
    const w = W * (0.1 + r(0) * 0.45), h = H * (0.015 + r(1) * 0.05), x = r(2) * (W - w), y = r(3) * (H - h);
    const dx = (r(4) - 0.5) * W * 0.3, dy = (r(5) - 0.5) * 40;
    ctx.drawImage(src, x, y, w, h, x + dx, y + dy, w, h);
    if (r(6) > 0.55) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.45; ctx.fillStyle = r(6) > 0.78 ? '#00e5ff' : '#ff2bd6'; ctx.fillRect(x + dx, y + dy, w, h); ctx.restore(); }
  }
}
/** TV static over the frame at `alpha`, plus a brighter rolling bar. */
export function staticNoise(ctx, f, alpha = 0.6, seed = 0) {
  const tile = noise(f + seed);
  ctx.save(); ctx.globalAlpha = alpha;
  const ox = -hash(f, seed, 1) * 270, oy = -hash(f, seed, 2) * 480;
  for (let y = oy; y < H; y += 480) for (let x = ox; x < W; x += 270) ctx.drawImage(tile, x, y);
  ctx.globalAlpha = alpha * 0.5; ctx.fillStyle = '#fff';
  const by = ((f * 37 + seed * 91) % 60) / 60 * H; ctx.fillRect(0, by, W, 30 + hash(f, seed, 3) * 60);
  ctx.restore();
}
/** Full black with a few thin static lines (a dropped signal). */
export function blackFrame(ctx, f, seed = 0) {
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const tile = noise(f + seed);
  for (let i = 0; i < 3; i++) { const y = hash(f, seed, 40 + i) * H; ctx.globalAlpha = 0.35 + hash(f, seed, 50 + i) * 0.4; ctx.drawImage(tile, 0, 0, 270, 4, 0, y, W, 3 + hash(f, seed, 60 + i) * 8); }
  ctx.restore();
}

/**
 * One glitch frame of a given kind and strength k (0..1). f = frame number (the look changes every frame, which is the point;
 * it is not an oscillation, so the 30 fps vibration rule doesn't apply). Order: displacement first, colour split last,
 * so the caption tears and splits with the picture.
 */
export function glitchFrame(ctx, t, o = {}) {
  const k = o.k ?? 1, seed = o.seed ?? 1, f = Math.floor(t * FPS + 1e-4), kind = o.kind || 'hit';
  if (k <= 0) return;
  if (kind === 'black') { blackFrame(ctx, f, seed); return; }
  if (kind === 'soft') {
    if (hash(f, seed, 9) > 0.5) slices(ctx, f, seed, 2, 0.03 * k);
    rgbSplit(ctx, Math.round(4 + 6 * k)); scanlines(ctx, 0.1 * k); return;
  }
  slices(ctx, f, seed, Math.round(4 + 10 * k), 0.04 + 0.1 * k);
  blocks(ctx, f, seed, Math.round(2 + 6 * k));
  if (kind === 'static') staticNoise(ctx, f, 0.35 + 0.4 * k, seed);
  rgbSplit(ctx, Math.round(6 + 22 * k * (0.5 + hash(f, seed, 11))), Math.round((hash(f, seed, 12) - 0.5) * 8 * k));
  scanlines(ctx, 0.12 + 0.12 * k);
  if (o.tint) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.35 * k; ctx.fillStyle = o.tint; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

/**
 * A list of glitch events -> { post(ctx, t), timeMap(t), at(t) }.
 * The strength flickers frame to frame (some frames clean, some torn) and the last 30% of each event tails off,
 * which reads as a broken signal rather than a filter.
 */
export function glitchTrack(events) {
  const ev = events.map((e, i) => ({ dur: 0.3, k: 1, kind: 'hit', seed: i * 13 + 5, ...e }));
  const live = t => ev.filter(e => t >= e.at && t < e.at + e.dur);
  function strength(e, t) {
    const u = (t - e.at) / e.dur, f = Math.floor(t * FPS + 1e-4);
    const tail = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
    const on = u < 0.12 ? 1 : hash(f, e.seed, 77) > 0.3 ? 1 : 0.25;   // always hit hard on the first frames
    return e.k * tail * on;
  }
  return {
    events: ev,
    at: t => live(t).reduce((m, e) => Math.max(m, strength(e, t)), 0),
    post(ctx, t) {
      for (const e of live(t)) {
        const u = (t - e.at) / e.dur;
        const kind = e.kind === 'cut' ? (u < 0.6 ? 'hit' : 'black') : e.kind;
        glitchFrame(ctx, t, { k: strength(e, t), seed: e.seed, kind, tint: e.tint });
      }
    },
    timeMap(t) {
      for (const e of live(t)) {
        if (e.stutter === 'freeze') return e.at;
        if (typeof e.stutter === 'number') return e.at + ((t - e.at) % e.stutter);
      }
      return t;
    },
  };
}

// ---------- captions ----------
/** Load a video's captions.json (for `words:` in setup(), so glitchWords can edit it). */
export async function loadWords(video) {
  const r = await fetch(new URL(`../videos/${video}/captions.json`, import.meta.url));
  return r.json();
}
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$';
const clean = w => w.toLowerCase().replace(/[^a-z0-9-]/g, '');
/**
 * Caption glitches, written into the word list (kit/captions.js draws them as normal words, the post pass tears them).
 * Each edit: { match: 'pine-' (caption word, lower case, punctuation ignored), n: 0 (which occurrence), i: index (instead of match),
 *   show: 'PINE-'        replace the text
 *   cut: 0.5             keep only that fraction of the letters + '-', the word ends early (mid-word cut)
 *   end: 0.25            the word disappears this many seconds after it starts (hard cut; next word unchanged)
 *   type: true           reveal letter by letter over the word ("P" "PI" "PIN" "PINE-"), each step pops: a stutter
 *   scramble: 0.2        the first 0.2 s show random glyphs before the real word (seeded)
 *   repeat: 2            stutter the whole word n times ("YOUR YOUR YOUR") within its time }
 * Returns a new word list.
 */
export function glitchWords(words, edits) {
  let out = words.map(w => ({ ...w }));
  edits.forEach((ed, ei) => {
    let idx = ed.i;
    if (idx == null) { let seen = 0; idx = out.findIndex(w => clean(w.w) === clean(ed.match) && seen++ === (ed.n || 0)); }
    if (idx < 0 || !out[idx]) { console.warn('glitchWords: no word ' + (ed.match ?? ed.i)); return; }
    const w = out[idx];
    let text = ed.show ?? w.w;
    if (ed.cut != null) { const letters = text.replace(/[^A-Za-z0-9]/g, ''); text = letters.slice(0, Math.max(1, Math.round(letters.length * ed.cut))) + '-'; }
    const s = w.s, e = ed.end != null ? s + ed.end : w.e;
    const parts = [];
    let t0 = s;
    if (ed.scramble) {
      const steps = Math.max(1, Math.round(ed.scramble / 0.05));
      for (let k = 0; k < steps; k++) {
        const g = Array.from(text, (ch, j) => /[A-Za-z0-9]/.test(ch) ? GLYPHS[Math.floor(hash(ei, k, j) * GLYPHS.length)] : ch).join('');
        parts.push({ ...w, w: g, s: t0, e: t0 + 0.05 }); t0 += 0.05;
      }
    }
    if (ed.type) {
      const n = text.length, span = Math.max(0.05, e - t0);
      for (let k = 1; k <= n; k++) parts.push({ ...w, w: text.slice(0, k), s: t0 + span * (k - 1) / n, e: t0 + span * k / n });
    } else if (ed.repeat) {
      const span = (e - t0) / ed.repeat;
      for (let k = 0; k < ed.repeat; k++) parts.push({ ...w, w: text, s: t0 + span * k, e: t0 + span * (k + 1) });
    } else parts.push({ ...w, w: text, s: t0, e });
    // a hard end: put an empty word right after, so drawCaption doesn't hold the word for its usual 0.45 s tail
    if (ed.end != null || ed.cut != null) parts.push({ ...w, w: ' ', s: e, e: e + 0.01, blank: true });
    out.splice(idx, 1, ...parts);
  });
  return out;
}

// ---------- on-screen text panels (intercom codes, subject labels, fake signs) ----------
/**
 * A 2D text panel that types on, blinks and glitches. o: { at, dur, text, x 0.5, y 0.3 (fractions of the frame), size 60,
 * color '#ff3b3b', bg 'rgba(0,0,0,0.65)', rate 40 (letters per second, 0 = all at once), blink true, glitch 0.25, seed }.
 * Keep it inside the centre band (y 0.12-0.6): the bottom 25% is app UI and the caption sits at ~0.67.
 */
export function hudText(ctx, t, o) {
  const at = o.at ?? 0, dur = o.dur ?? 3;
  if (t < at || t >= at + dur) return;
  const lt = t - at, f = Math.floor(t * FPS + 1e-4), seed = o.seed ?? 3;
  const size = o.size || 60, rate = o.rate ?? 40;
  const lines = String(o.text).split('\n');
  const total = lines.join('\n').length, shown = rate ? Math.min(total, Math.floor(lt * rate)) : total;
  let left = shown;
  const vis = lines.map(l => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 1; return s; });
  ctx.save();
  ctx.font = `800 ${size}px "Courier New", "Consolas", monospace`;
  const lw = Math.max(...lines.map(l => ctx.measureText(l).width)), lh = size * 1.25;
  const pw = Math.min(W * 0.92, lw + size * 1.2), ph = lh * lines.length + size * 0.8;
  const cx = W * (o.x ?? 0.5), cy = H * (o.y ?? 0.3);
  const jx = hash(f, seed, 1) < (o.glitch ?? 0.25) ? (hash(f, seed, 2) - 0.5) * 30 : 0;
  ctx.translate(cx + jx, cy);
  ctx.fillStyle = o.bg || 'rgba(0,0,0,0.65)'; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  ctx.strokeStyle = o.color || '#ff3b3b'; ctx.lineWidth = 4; ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
  const blinkOff = (o.blink ?? true) && shown >= total && Math.floor(lt / 0.5) % 2 === 1;   // 1 Hz blink once typed
  if (!blinkOff) {
    ctx.fillStyle = o.color || '#ff3b3b'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.shadowColor = o.color || '#ff3b3b'; ctx.shadowBlur = 18;
    vis.forEach((l, i) => ctx.fillText(l + (i === vis.length - 1 && shown < total && f % 2 ? '_' : ''), -lw / 2, -ph / 2 + size * 0.4 + lh * (i + 0.5)));
  }
  ctx.restore();
}

/** Red alarm wash over the 2D frame between at and until: a slow pulse (period `period` s, never faster than ~0.5 s). */
export function alarmWash(ctx, t, o = {}) {
  const at = o.at ?? 0, until = o.until ?? 1e9; if (t < at || t >= until) return;
  const p = Math.max(0.5, o.period ?? 0.9), u = ((t - at) % p) / p;
  const k = (o.k ?? 0.32) * Math.pow(Math.sin(Math.PI * u), 2);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = k; ctx.fillStyle = o.color || '#ff1a1a'; ctx.fillRect(0, 0, W, H); ctx.restore();
}
