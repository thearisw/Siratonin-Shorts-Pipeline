// Faces: original simple cartoon faces drawn on a canvas, swapped per shot (house list: happy, smirk, sad, worried, shocked, sleeping, crying, creepy grin + morph steps).
import { canvasTex } from './core.js';

export const FACE_KINDS = ['happy', 'smirk', 'sad', 'worried', 'shocked', 'scream', 'sleeping', 'crying', 'blink', 'grin1', 'grin2', 'grin3', 'void', 'crayon1', 'crayon2', 'crayon3'];

export function drawFace(g, kind, extra = {}) {
  const S = 256; g.clearRect(0, 0, S, S);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const ink = extra.ink || '#141414';
  const eye = (x, y, rx, ry) => {
    g.fillStyle = ink; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.35, ry * 0.25, 0, 0, Math.PI * 2); g.fill();
  };
  const line = (pts, w = 10) => { g.strokeStyle = ink; g.lineWidth = w; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); };
  const arc = (x, y, r, a0, a1, w = 10) => { g.strokeStyle = ink; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, a0 * Math.PI, a1 * Math.PI); g.stroke(); };
  const smile = () => arc(128, 140, 42, 0.18, 0.82);
  const bigEyes = () => {
    g.fillStyle = '#fff'; g.strokeStyle = ink; g.lineWidth = 6;
    for (const x of [86, 170]) { g.beginPath(); g.ellipse(x, 104, 24, 30, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = ink; g.beginPath(); g.arc(x, 108, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; }
  };
  const mouthHole = (y, rx, ry) => {
    g.fillStyle = '#2a0d0d'; g.beginPath(); g.ellipse(128, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d8545a'; g.beginPath(); g.ellipse(128, y + ry * 0.55, rx * 0.62, ry * 0.32, 0, 0, Math.PI * 2); g.fill();
  };
  const tear = (x, y) => { g.fillStyle = '#7ec8ff'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 12, y + 26, x, y + 34); g.quadraticCurveTo(x - 12, y + 26, x, y); g.fill(); };
  switch (kind) {
    case 'blink': line([[70, 108], [106, 108]], 9); line([[150, 108], [186, 108]], 9); smile(); break;
    case 'happy': eye(88, 104, 14, 22); eye(168, 104, 14, 22); smile(); break;
    case 'smirk': eye(88, 104, 14, 20); eye(168, 104, 14, 20); line([[62, 76], [106, 80]], 8); line([[150, 74], [194, 66]], 8);
      g.strokeStyle = ink; g.lineWidth = 10; g.beginPath(); g.moveTo(96, 158); g.quadraticCurveTo(140, 168, 170, 140); g.stroke(); break;
    case 'sad': eye(88, 110, 13, 19); eye(168, 110, 13, 19); line([[64, 80], [106, 72]], 8); line([[150, 72], [192, 80]], 8); arc(128, 196, 34, 1.2, 1.8); break;
    case 'worried': eye(88, 110, 14, 20); eye(168, 110, 14, 20); line([[62, 82], [108, 68]], 9); line([[148, 68], [194, 82]], 9); arc(128, 200, 30, 1.22, 1.78, 9); break;
    case 'shocked': bigEyes(); line([[58, 58], [106, 50]], 9); line([[150, 50], [198, 58]], 9); mouthHole(178, 24, 32); break;
    case 'scream': bigEyes(); line([[58, 50], [106, 62]], 9); line([[150, 62], [198, 50]], 9); mouthHole(186, 40, 48); break;
    case 'sleeping': arc(88, 100, 16, 0.1, 0.9, 8); arc(168, 100, 16, 0.1, 0.9, 8); g.fillStyle = ink; g.beginPath(); g.ellipse(128, 168, 10, 8, 0, 0, 7); g.fill(); break;
    case 'crying': line([[72, 108], [104, 100]], 9); line([[152, 100], [184, 108]], 9); line([[64, 80], [106, 72]], 8); line([[150, 72], [192, 80]], 8);
      tear(84, 118); tear(172, 118); mouthHole(186, 26, 18); break;
    case 'grin1': eye(88, 100, 13, 22); eye(168, 100, 13, 22); arc(128, 118, 66, 0.15, 0.85, 9); break;
    case 'grin2': eye(88, 92, 11, 24); eye(168, 92, 11, 24);
      g.fillStyle = '#1a0606'; g.beginPath(); g.moveTo(34, 130); g.quadraticCurveTo(128, 240, 222, 130); g.quadraticCurveTo(128, 175, 34, 130); g.fill();
      g.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { const x = 52 + i * 19; g.fillRect(x, 140 + Math.sin(i / 8 * Math.PI) * 18, 10, 12); } break;
    case 'grin3': g.fillStyle = ink; g.beginPath(); g.arc(88, 84, 16, 0, 7); g.arc(168, 84, 16, 0, 7); g.fill();
      g.fillStyle = '#120303'; g.beginPath(); g.ellipse(128, 168, 96, 70, 0, 0, 7); g.fill();
      g.fillStyle = '#f4f0e0'; for (let i = 0; i < 12; i++) { const a = Math.PI * (0.05 + i / 11 * 0.9); g.beginPath(); g.moveTo(128 + Math.cos(a) * 92, 168 - Math.sin(a) * 66); g.lineTo(128 + Math.cos(a) * 70, 168 - Math.sin(a) * 46); g.lineTo(128 + Math.cos(a + 0.12) * 90, 168 - Math.sin(a + 0.12) * 64); g.fill(); } break;
    // crayon twist (Crayons, 2026-11-09): the face as a 6-year-old draws it. Wax strokes, scribble eyes, a red smile that runs off the head.
    case 'crayon1': case 'crayon2': case 'crayon3': {
      const step = kind === 'crayon1' ? 1 : kind === 'crayon2' ? 2 : 3;
      let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const wax = (pts, col, w) => { for (let pass = 0; pass < 3; pass++) { g.strokeStyle = col; g.globalAlpha = pass ? 0.5 : 0.95; g.lineWidth = w * (pass ? 0.6 : 1); g.beginPath();
        pts.forEach(([x, y], i) => { const jx = x + (r() - 0.5) * 5, jy = y + (r() - 0.5) * 5; i ? g.lineTo(jx, jy) : g.moveTo(jx, jy); }); g.stroke(); } g.globalAlpha = 1; };
      const scrib = (cx, cy, rad) => { const pts = []; for (let i = 0; i < 46; i++) { const a = i * 0.9, rr = rad * (0.25 + 0.75 * ((i * 7) % 10) / 10); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 1.1]); } wax(pts, '#111111', 7); };
      const er = step === 1 ? 20 : step === 2 ? 28 : 32;
      scrib(86, 100, er); scrib(170, 100, er);
      const arcPts = (cx, cy, rx, ry, a0, a1, n = 22) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
      if (step === 1) wax(arcPts(128, 138, 58, 40, 0.12 * Math.PI, 0.88 * Math.PI), '#e01a1a', 12);
      else if (step === 2) { wax(arcPts(128, 120, 132, 72, 0.08 * Math.PI, 0.92 * Math.PI), '#e01a1a', 14); wax(arcPts(128, 126, 126, 64, 0.1 * Math.PI, 0.9 * Math.PI), '#e01a1a', 9); }
      else { const top = arcPts(128, 112, 134, 40, 0.06 * Math.PI, 0.94 * Math.PI), bot = arcPts(128, 120, 134, 110, 0.94 * Math.PI, 0.06 * Math.PI, 26);
        g.fillStyle = '#c01010'; g.beginPath(); [...top, ...bot].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
        for (let i = 0; i < 26; i++) { const y = 150 + i * 3.6, half = 120 * Math.sqrt(Math.max(0, 1 - ((y - 170) / 62) ** 2)); wax([[128 - half, y], [128 + half, y + 3]], '#8a0808', 4); }
        wax(top, '#e01a1a', 12); wax(bot, '#e01a1a', 10); }
      break; }
    case 'void': g.fillStyle = '#000'; g.beginPath(); g.ellipse(128, 128, 120, 120, 0, 0, 7); g.fill(); break;
  }
  if (extra.talk && MOUTHS[kind]) { const [cx, cy, rx, ry, mood] = MOUTHS[kind]; eraseMouth(g, cx, cy, rx, ry); openMouth(g, cx, cy, rx, extra.talk, mood, ink); }
  if (extra.lashes && !['shocked', 'scream', 'void', 'grin3'].includes(kind)) { line([[72, 84], [64, 76]], 5); line([[184, 84], [192, 76]], 5); }
  if (extra.mustache && kind !== 'void') { g.fillStyle = extra.mustacheColor || '#4a2c17'; g.beginPath(); g.ellipse(108, 136, 26, 11, 0.25, 0, Math.PI * 2); g.ellipse(148, 136, 26, 11, -0.25, 0, Math.PI * 2); g.fill(); }
  if (extra.cheeks && kind !== 'void') { g.fillStyle = 'rgba(240,120,120,0.35)'; g.beginPath(); g.arc(60, 150, 16, 0, 7); g.arc(196, 150, 16, 0, 7); g.fill(); }
  if (extra.glasses && kind !== 'void') { g.strokeStyle = '#222'; g.lineWidth = 6; g.beginPath(); g.arc(88, 106, 30, 0, 7); g.moveTo(198, 106); g.arc(168, 106, 30, 0, 7); g.moveTo(118, 104); g.lineTo(138, 104); g.stroke(); }
}

// ---------------------------------------------------------------- talking mouths (Aris, 2026-11-09: mouths move when people talk)
// Every face gets two talk variants, '<face>#1' (half open) and '<face>#2' (open): the drawn mouth is erased and an open one is
// drawn in its place. Drawn faces use the table below; image faces (models/faces/*.png) find their mouth automatically
// (talkVariants). c.talk(level) in chars.js shows them; kit/talk.js drives the level from the word timings.
// kind: [centre x, centre y, erase rx, erase ry, mood]  (mood 'smile' = open D-shaped smile, 'o' = round, 'hole' = keep the hole, resize it)
const MOUTHS = {
  happy: [128, 172, 52, 24, 'smile'], blink: [128, 172, 52, 24, 'smile'], smirk: [135, 150, 52, 27, 'smile'], grin1: [128, 166, 78, 38, 'smile'],
  sad: [128, 172, 42, 17, 'o'], worried: [128, 178, 38, 16, 'o'], sleeping: [128, 168, 14, 12, 'o'],
  shocked: [128, 178, 28, 36, 'hole'], scream: [128, 186, 44, 52, 'hole'], crying: [128, 186, 30, 22, 'hole'],
};
function eraseMouth(g, cx, cy, rx, ry) {
  g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore();
}
/** Draw an open mouth centred at (cx, cy), about 2*rx wide. level 1 = half open, 2 = open. */
export function openMouth(g, cx, cy, rx, level, mood = 'smile', ink = '#141414') {
  const w = Math.min(rx * 0.85, 34), dark = '#2a0d0d', tongue = '#d8545a';
  g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = 5;
  if (mood === 'smile') {   // flat-ish top, round bottom; deeper when more open
    const h = level === 1 ? w * 0.42 : w * 0.8, top = cy - h * 0.35;
    g.beginPath(); g.moveTo(cx - w, top); g.quadraticCurveTo(cx, top + h * 0.18, cx + w, top); g.quadraticCurveTo(cx + w * 0.9, top + h * 1.3, cx, top + h * 1.3);
    g.quadraticCurveTo(cx - w * 0.9, top + h * 1.3, cx - w, top); g.closePath();
    g.fillStyle = dark; g.fill(); g.save(); g.clip();
    g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, top + h * 1.25, w * 0.55, h * 0.45, 0, 0, Math.PI * 2); g.fill(); g.restore();
    g.stroke();
  } else {   // round 'o' (sad, worried) or the existing hole resized (shocked, scream, crying)
    const ry = mood === 'hole' ? rx * (level === 1 ? 0.55 : 1.05) : w * (level === 1 ? 0.35 : 0.65), ox = mood === 'hole' ? rx * 0.78 : w * 0.6;
    g.fillStyle = dark; g.beginPath(); g.ellipse(cx, cy, ox, ry, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.clip(); g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + ry * 0.7, ox * 0.62, ry * 0.4, 0, 0, Math.PI * 2); g.fill(); g.restore();
    if (mood !== 'hole') g.stroke();
  }
}
/** Talk variants for an image face (a loaded texture): {'#1': tex, '#2': tex}. Finds the mouth as the opaque pixels below the eyes
 *  (y 132-215, x 72-184 on the 256 canvas), erases it so the skin under the face plane shows, and draws an open smile there. */
export function talkVariants(tex) {
  const img = tex.image, S = 256, out = {};
  const probe = document.createElement('canvas'); probe.width = probe.height = S; const pg = probe.getContext('2d'); pg.drawImage(img, 0, 0, S, S);
  const d = pg.getImageData(0, 0, S, S).data; let x0 = S, x1 = 0, y0 = S, y1 = 0;
  for (let y = 132; y < 216; y++) for (let x = 72; x < 185; x++) if (d[(y * S + x) * 4 + 3] > 90) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const found = x1 >= x0, cx = found ? (x0 + x1) / 2 : 128, cy = found ? (y0 + y1) / 2 : 160;
  const rx = found ? Math.max(18, (x1 - x0) / 2 + 4) : 24, ry = found ? Math.max(10, (y1 - y0) / 2 + 4) : 12;
  for (const level of [1, 2]) out['#' + level] = canvasTex(S, g => { g.drawImage(img, 0, 0, S, S); if (found) g.clearRect(x0 - 4, y0 - 4, x1 - x0 + 9, y1 - y0 + 9); openMouth(g, cx, cy + 4, Math.min(rx, 30), level, 'smile'); });
  return out;
}

const cache = new Map();
/** All face textures for one look (extra = {lashes, mustache, cheeks, glasses}). Cached, so many characters can share them. */
export function faceSet(extra = {}) {
  const k = JSON.stringify(extra);
  if (!cache.has(k)) { const set = {}; for (const f of FACE_KINDS) {
    set[f] = canvasTex(256, g => drawFace(g, f, extra));
    if (MOUTHS[f]) for (const l of [1, 2]) set[f + '#' + l] = canvasTex(256, g => drawFace(g, f, { ...extra, talk: l }));
  } cache.set(k, set); }
  return cache.get(k);
}
