// Opening "drop-in": the first frame slams in from slightly above, zoomed and tilted, with motion blur, then settles with a short,
// decaying shake. Copied from the Craftee openings (Not Human Vote, Shadow Tag, Superpower): there it takes ~0.15 s with ~25° of tilt;
// this is a gentler version (Aris: shake must be gentle). Applied in 2D to the finished frame (scene + caption), so it works on any shot.
// Turn it on per video: return `intro: true` (or `intro: { dur, tilt, zoom, drop, shake }`) from setup() in shots.js.
import { W, H } from './core.js';

export const INTRO_DEFAULTS = {
  dur: 0.5,      // total length (s); the frame is untouched after this
  settle: 0.2,   // time for the zoom/tilt/drop to land (ease-out)
  zoom: 0.18,    // extra scale on frame 1 (on top of what the tilt needs to cover the frame)
  tilt: 6,       // degrees of roll on frame 1
  drop: 0.07,    // starts this fraction of the frame height above, moving down
  shake: 0.012,  // shake after landing, fraction of frame height (decays)
  shakeRoll: 0.8,// degrees of roll in the shake (decays)
  blur: 6,       // motion-blur samples per frame while it moves fast
};

const easeOut = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

/** Camera-style transform of the frame at time t: { s, rot (rad), dx, dy (px) }, or null once the intro is over. */
export function introState(t, o = INTRO_DEFAULTS) {
  if (t < 0 || t >= o.dur) return null;
  const k = 1 - easeOut(t / o.settle);                                // 1 -> 0 as it lands
  const decay = Math.exp(-Math.max(0, t - o.settle * 0.5) / 0.1) * Math.min(1, t / (o.settle * 0.5));
  const end = 1 - Math.min(1, Math.max(0, (t - (o.dur - 0.08)) / 0.08));   // fade the shake to exactly 0 at dur
  const rotDeg = o.tilt * k + o.shakeRoll * Math.sin(t * 2 * Math.PI * 6.3 + 0.7) * decay * end;
  const dy = -o.drop * H * k + o.shake * H * Math.sin(t * 2 * Math.PI * 8.1) * decay * end;
  const dx = o.shake * 0.6 * H * Math.sin(t * 2 * Math.PI * 5.2 + 1.9) * decay * end;
  const rot = rotDeg * Math.PI / 180;
  // scale so the tilted, shifted frame still covers the whole picture (no black corners)
  const cover = Math.cos(Math.abs(rot)) + (H / W) * Math.sin(Math.abs(rot)) + 2 * Math.max(Math.abs(dx) / W, Math.abs(dy) / H);
  return { s: Math.max(cover, 1) + o.zoom * k, rot, dx, dy };
}

let tmp = null;
/**
 * Redraw the finished frame on ctx (its canvas is W x H) with the intro transform for time t. fps sets the shutter for the blur.
 * Returns false (and leaves the frame alone) once the intro is over.
 */
export function applyIntro(ctx, t, opts = {}, fps = 30) {
  const o = { ...INTRO_DEFAULTS, ...(opts === true ? {} : opts) };
  if (!introState(t, o)) return false;
  if (!tmp) { tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; }
  const tc = tmp.getContext('2d');
  tc.clearRect(0, 0, W, H); tc.drawImage(ctx.canvas, 0, 0);
  // motion blur: average the transform over a one-frame shutter centred on t (clamped at 0); only while it moves fast
  const n = t < o.settle ? Math.max(1, o.blur) : 1, shutter = 1 / fps;
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++) {
    const ti = n > 1 ? Math.max(0, t + shutter * (i / (n - 1) - 0.5)) : t;
    const st = introState(Math.min(ti, o.dur - 1e-4), o) || { s: 1, rot: 0, dx: 0, dy: 0 };
    ctx.globalAlpha = 1 / (i + 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(W / 2 + st.dx, H / 2 + st.dy); ctx.rotate(st.rot); ctx.scale(st.s, st.s); ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(tmp, 0, 0);
  }
  ctx.restore();
  return true;
}
