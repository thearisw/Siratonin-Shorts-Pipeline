// Director: loads a video's shot list (videos/<name>/shots.js) and exposes window.renderAt(t) for render.js.
// shots.js exports `async function setup()` returning:
//   { shots: [{ s, e, name, f(lt, t) }], words: [{w, s, e}] | null, highlights: {word: colour}, duration,
//     before(t)?: called every frame before the shot (reset props), after(ctx, t)?: draw 2D overlays (fades, text),
//     intro?: true | { dur, tilt, zoom, drop, shake, ... } to open with the drop-in + shake from kit/intro.js,
//     post(ctx, t)?: drawn AFTER the caption (VFX/glitch.js: the caption tears with the picture),
//     timeMap(t)?: remaps the 3D picture's time only (freeze / stutter glitches); captions, overlays and audio keep real time }
// Every frame: all characters reset() (rest pose, back home or hidden) + idle(t), then the active shot's f(localTime, time) places camera, characters and lights.
import { renderer, composer, scene, W, H, THREE } from './core.js';
import { softenAll } from './look.js';
import { ALL_CHARS } from './chars.js';
import { applyTalk, speechBySpeaker } from './talk.js';
import { drawCaption, vignette, parseWords } from './captions.js';
import { applyIntro } from './intro.js';
import { speakersIn, applyFix, clearView, inFrame, CANDIDATES } from './speaker_view.js';

const params = new URLSearchParams(location.search);
const video = params.get('video');
const out = document.createElement('canvas'); out.width = W; out.height = H;
const ctx = out.getContext('2d');

async function main() {
  await document.fonts.load('900 112px Inter').catch(() => {});
  const mod = await import(`../videos/${video}/shots.js`);
  const V = await mod.setup();
  let words = V.words;
  if (!words) { for (const f of ['captions.json', 'word_timings.csv']) { const r = await fetch(new URL(`../videos/${video}/${f}`, import.meta.url)); if (r.ok) { words = parseWords(await r.text()); break; } } }
  words = words || [];
  const speech = speechBySpeaker(V.speech || words);   // talking mouths (kit/talk.js): needs a speaker on each word
  const shots = V.shots.slice().sort((a, b) => a.s - b.s);
  checkCoplanar();

  function pose(shot, t) {
    ALL_CHARS.forEach((c, i) => { c.reset(); c.idle(t, (c.loadOrder ?? i) * 1.7); });   // seed must not depend on load timing (differs per worker)
    if (V.before) V.before(t);
    shot.f(t - shot.s, t);
  }
  // keep the talking character in view (kit/speaker_view.js): decided once per shot from 3 samples, applied every frame
  const fixes = new Map();
  function fixFor(shot) {
    if (fixes.has(shot)) return fixes.get(shot);
    let out = null;
    const end = shot.e ?? (V.duration || shot.s + 1);
    const who = V.speakerCheck === false || shot.speakerCheck === false ? [] : speakersIn(ALL_CHARS, speech, shot.s, end);
    for (const c of who) {
      const samples = [0.15, 0.5, 0.85].map(u => shot.s + (end - shot.s) * u);
      const inShot = samples.filter(tt => { pose(shot, tt); return inFrame(c); });
      if (!inShot.length) continue;   // the speaker isn't in this shot's frame at all (a cutaway): leave it
      const ok = cand => inShot.every(tt => { pose(shot, tt); applyFix(c, cand); return clearView(c, ALL_CHARS); });
      const pick = CANDIDATES.find(ok);
      if (!pick) console.warn('SPEAKER BLOCKED: ' + (shot.name || shot.s));
      else if (pick.yaw || pick.up || pick.near !== 1) { out = { c, fix: pick }; console.log(`speaker view: moved "${shot.name}" ${Math.round(pick.yaw * 180 / Math.PI)} deg${pick.up ? ', higher' : ''}${pick.near !== 1 ? ', ' + pick.near + 'x closer' : ''} to show ${c.speaker}`); }
      break;
    }
    fixes.set(shot, out); return out;
  }
  function update(t) {
    const shot = shots.find(s => t >= s.s && t < s.e) || shots[shots.length - 1];
    const fx = fixFor(shot);
    pose(shot, t);
    if (fx) applyFix(fx.c, fx.fix);
    applyTalk(ALL_CHARS, t, speech);
    return shot.name || '';
  }
  window.poseAt = t => update(t);   // sets up the frame without drawing it (code checks without rendering)
  window.renderAt = (t, opts = {}) => {
    const name = update(V.timeMap ? V.timeMap(t) : t);
    softenAll(scene);
    composer.render();
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(renderer.domElement, 0, 0, W, H);
    if (V.intro) {   // opening drop-in + shake (kit/intro.js): moves the picture and the caption together, vignette stays put
      if (V.after) V.after(ctx, t);
      if (opts.captions !== false) drawCaption(ctx, words, t, V.highlights || {});
      if (V.post) V.post(ctx, t);
      applyIntro(ctx, t, V.intro);
      vignette(ctx);
    } else {
      vignette(ctx);
      if (V.after) V.after(ctx, t);
      if (opts.captions !== false) drawCaption(ctx, words, t, V.highlights || {});
      if (V.post) V.post(ctx, t);
    }
    return { name, data: out.toDataURL('image/jpeg', 0.93) };
  };
  window.DURATION = V.duration || (shots.length ? shots[shots.length - 1].e : 0);
  window.READY = true;
}
main().catch(e => { console.error('director: ' + (e.stack || e)); window.FAILED = String(e); });

// Z-fighting guard: flat horizontal surfaces (planes, thin slabs) whose tops sit at the same height and overlap flicker
// (Fog, 2026-11-09: the camp ground overlapped the schoolyard ground). Printed as a warning by render.js / render_gpu.js.
function checkCoplanar() {
  const flats = [], box = new THREE.Box3();
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible || !o.geometry) return;
    if (o.material && (o.material.polygonOffset || o.material.transparent)) return;
    box.setFromObject(o);
    const h = box.max.y - box.min.y, a = (box.max.x - box.min.x) * (box.max.z - box.min.z);
    if (h < 0.06 && a > 1) flats.push({ o, b: box.clone() });
  });
  const bad = [];
  for (let i = 0; i < flats.length; i++) for (let j = i + 1; j < flats.length; j++) {
    const A = flats[i].b, B = flats[j].b;
    if (Math.abs(A.max.y - B.max.y) > 0.004) continue;
    const ox = Math.min(A.max.x, B.max.x) - Math.max(A.min.x, B.min.x), oz = Math.min(A.max.z, B.max.z) - Math.max(A.min.z, B.min.z);
    if (ox > 0.3 && oz > 0.3) bad.push(`y=${A.max.y.toFixed(3)} overlap ${ox.toFixed(1)}x${oz.toFixed(1)} at (${((A.min.x + A.max.x) / 2).toFixed(0)}, ${((A.min.z + A.max.z) / 2).toFixed(0)}) / (${((B.min.x + B.max.x) / 2).toFixed(0)}, ${((B.min.z + B.max.z) / 2).toFixed(0)})`);
  }
  if (bad.length) console.warn(`Z-FIGHT RISK: ${bad.length} coplanar overlapping surfaces (lift one by 0.02-0.05 or shrink it):\n  ` + bad.slice(0, 12).join('\n  '));
}
