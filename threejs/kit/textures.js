// Roblox-style surface materials (Aris, 2026-11-09: "textures on things", not flat coloured primitives).
// Each material is a tileable canvas texture drawn in light greys, tinted by the material colour, the way Roblox's
// own materials work (a red Brick part = red bricks with tinted mortar). Same canvas doubles as a bump map.
//
//   import { tmat, tbox, tplane } from '../../kit/textures.js';
//   const wall = tbox(20, 10, 0.6, tmat('brick', { color: 0xb5553c }));   // a 20x10 stud brick wall, bricks stay brick-sized
//   const lawn = tplane(80, 80, tmat('grass'));                           // flat on the ground (already rotated)
//
// Materials: brick, concrete, sidewalk, asphalt, grass, woodplanks, wood, siding, shingles, slate, cobblestone,
// fabric, metal, diamondplate, plastic, glass, tiles. `tile` = studs per texture repeat (defaults below).
// tbox / tplane / tileUV give geometry UVs in studs, so one material can go on any size of part without stretching.
import { THREE, rng } from './core.js';

const SIZE = 512;
const cache = new Map();

// base colours (Roblox-ish defaults) and studs per repeat
const DEF = {
  brick:        { color: 0xb0553e, tile: 4,  rough: 0.95, bump: 0.6 },
  concrete:     { color: 0xb8b4ac, tile: 8,  rough: 0.95, bump: 0.25 },
  sidewalk:     { color: 0xc4c1ba, tile: 6,  rough: 0.95, bump: 0.35 },
  asphalt:      { color: 0x55575c, tile: 8,  rough: 1.0,  bump: 0.2 },
  grass:        { color: 0x5f9e45, tile: 8,  rough: 1.0,  bump: 0.3 },
  woodplanks:   { color: 0xa8784c, tile: 6,  rough: 0.9,  bump: 0.4 },
  wood:         { color: 0x9a6a40, tile: 4,  rough: 0.9,  bump: 0.2 },
  siding:       { color: 0xe8e2d4, tile: 4,  rough: 0.9,  bump: 0.5 },
  shingles:     { color: 0x5a4a44, tile: 4,  rough: 1.0,  bump: 0.6 },
  slate:        { color: 0x6f7378, tile: 8,  rough: 0.95, bump: 0.45 },
  cobblestone:  { color: 0x8e8a84, tile: 6,  rough: 1.0,  bump: 0.6 },
  fabric:       { color: 0x8a6a5a, tile: 2,  rough: 1.0,  bump: 0.2 },
  metal:        { color: 0x9aa0a6, tile: 4,  rough: 0.45, metal: 0.6, bump: 0.1 },
  diamondplate: { color: 0xa4a9ae, tile: 3,  rough: 0.4,  metal: 0.7, bump: 0.5 },
  plastic:      { color: 0xcccccc, tile: 8,  rough: 0.7,  bump: 0 },
  tiles:        { color: 0xdedad2, tile: 4,  rough: 0.6,  bump: 0.4 },
  glass:        { color: 0x9fc3dd, tile: 8,  rough: 0.08, metal: 0.1, bump: 0 },
};

// ---------- drawing helpers ----------
const g2 = v => { const c = Math.max(0, Math.min(255, v | 0)); return `rgb(${c},${c},${c})`; };
function noise(ctx, w, h, r, n, base, amp, size = 2) {
  for (let i = 0; i < n; i++) { ctx.fillStyle = g2(base + (r() - 0.5) * amp); ctx.fillRect(r() * w, r() * h, size, size); }
}
function blotches(ctx, w, h, r, n, base, amp, rad) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = rad * (0.4 + r());
    for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {   // wrap so it tiles
      ctx.fillStyle = g2(base + (r() - 0.5) * amp); ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(x + ox, y + oy, rr, 0, 7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

const DRAW = {
  brick(ctx, w, h, r) {
    ctx.fillStyle = g2(205); ctx.fillRect(0, 0, w, h);                // mortar
    const rows = 8, cols = 4, bh = h / rows, bw = w / cols, m = 5;
    for (let y = 0; y < rows; y++) for (let x = -1; x < cols; x++) {
      const ox = (y % 2) * bw / 2, v = 238 + (r() - 0.5) * 44;
      ctx.fillStyle = g2(v); ctx.fillRect(x * bw + ox + m / 2, y * bh + m / 2, bw - m, bh - m);
      ctx.fillStyle = g2(v - 26); ctx.fillRect(x * bw + ox + m / 2, y * bh + bh - m / 2 - 4, bw - m, 4);   // shade under each brick
    }
    noise(ctx, w, h, r, 9000, 225, 50);
  },
  concrete(ctx, w, h, r) { ctx.fillStyle = g2(225); ctx.fillRect(0, 0, w, h); blotches(ctx, w, h, r, 60, 225, 50, 40); noise(ctx, w, h, r, 14000, 222, 40); },
  sidewalk(ctx, w, h, r) {
    DRAW.concrete(ctx, w, h, r);
    ctx.fillStyle = g2(150); ctx.fillRect(0, 0, w, 4); ctx.fillRect(0, 0, 4, h);     // slab joints (one per tile)
  },
  asphalt(ctx, w, h, r) { ctx.fillStyle = g2(200); ctx.fillRect(0, 0, w, h); noise(ctx, w, h, r, 26000, 200, 90, 2); blotches(ctx, w, h, r, 30, 200, 40, 50); },
  grass(ctx, w, h, r) {
    ctx.fillStyle = g2(215); ctx.fillRect(0, 0, w, h); blotches(ctx, w, h, r, 50, 215, 50, 45);
    ctx.lineWidth = 2;
    for (let i = 0; i < 5000; i++) {
      const x = r() * w, y = r() * h, l = 4 + r() * 8; ctx.strokeStyle = g2(200 + (r() - 0.5) * 90);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 4, y - l); ctx.stroke();
    }
  },
  woodplanks(ctx, w, h, r) {
    const n = 6, ph = h / n;
    for (let i = 0; i < n; i++) {
      const v = 225 + (r() - 0.5) * 40; ctx.fillStyle = g2(v); ctx.fillRect(0, i * ph, w, ph);
      ctx.strokeStyle = g2(v - 30); ctx.lineWidth = 1.5;
      for (let k = 0; k < 7; k++) { const y = i * ph + 6 + r() * (ph - 12); ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 8, w * 0.7, y + (r() - 0.5) * 8, w, y); ctx.stroke(); }
      ctx.fillStyle = g2(120); ctx.fillRect(0, i * ph, w, 3);                                 // seam
      const cut = r() * w; ctx.fillRect(cut, i * ph, 3, ph);                                   // board end
    }
  },
  wood(ctx, w, h, r) {
    ctx.fillStyle = g2(225); ctx.fillRect(0, 0, w, h); ctx.lineWidth = 2;
    for (let k = 0; k < 40; k++) { const y = r() * h; ctx.strokeStyle = g2(225 - 15 - r() * 30); ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.33, y + (r() - 0.5) * 14, w * 0.66, y + (r() - 0.5) * 14, w, y); ctx.stroke(); }
  },
  siding(ctx, w, h, r) {
    const n = 8, bh = h / n;
    for (let i = 0; i < n; i++) {
      const gr = ctx.createLinearGradient(0, i * bh, 0, (i + 1) * bh); gr.addColorStop(0, g2(212)); gr.addColorStop(0.25, g2(240)); gr.addColorStop(1, g2(232));
      ctx.fillStyle = gr; ctx.fillRect(0, i * bh, w, bh); ctx.fillStyle = g2(160); ctx.fillRect(0, i * bh, w, 3);
    }
    noise(ctx, w, h, r, 3000, 232, 18);
  },
  shingles(ctx, w, h, r) {
    ctx.fillStyle = g2(110); ctx.fillRect(0, 0, w, h);
    const rows = 8, cols = 6, sh = h / rows, sw = w / cols;
    for (let y = 0; y < rows; y++) for (let x = -1; x < cols; x++) {
      const ox = (y % 2) * sw / 2; ctx.fillStyle = g2(215 + (r() - 0.5) * 50);
      ctx.fillRect(x * sw + ox + 2, y * sh + 2, sw - 4, sh - 3);
      ctx.fillStyle = g2(160); ctx.fillRect(x * sw + ox + 2, y * sh + sh - 7, sw - 4, 5);
    }
    noise(ctx, w, h, r, 9000, 200, 60);
  },
  slate(ctx, w, h, r) {
    ctx.fillStyle = g2(200); ctx.fillRect(0, 0, w, h); blotches(ctx, w, h, r, 80, 205, 70, 55);
    ctx.strokeStyle = g2(120); ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) { ctx.beginPath(); let x = r() * w, y = r() * h; ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 160; y += (r() - 0.5) * 160; ctx.lineTo(x, y); } ctx.stroke(); }
  },
  cobblestone(ctx, w, h, r) {
    ctx.fillStyle = g2(120); ctx.fillRect(0, 0, w, h);
    const n = 7, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      ctx.fillStyle = g2(215 + (r() - 0.5) * 50); const ox = (y % 2) * s / 2;
      ctx.beginPath(); ctx.ellipse((x * s + ox + s / 2) % w, y * s + s / 2, s * 0.44, s * 0.42, r(), 0, 7); ctx.fill();
    }
    noise(ctx, w, h, r, 8000, 200, 50);
  },
  fabric(ctx, w, h, r) {
    ctx.fillStyle = g2(225); ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 4) { ctx.fillStyle = g2(205); ctx.fillRect(i, 0, 2, h); ctx.fillRect(0, i, w, 2); }
    noise(ctx, w, h, r, 6000, 225, 30);
  },
  metal(ctx, w, h, r) { ctx.fillStyle = g2(225); ctx.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { ctx.fillStyle = g2(225 + (r() - 0.5) * 40); ctx.fillRect(0, r() * h, w, 1); } },
  diamondplate(ctx, w, h, r) {
    DRAW.metal(ctx, w, h, r); const n = 8, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      ctx.save(); ctx.translate(x * s + s / 2, y * s + s / 2); ctx.rotate((x + y) % 2 ? 0.8 : -0.8);
      ctx.fillStyle = g2(250); ctx.fillRect(-s * 0.32, -4, s * 0.64, 8); ctx.fillStyle = g2(170); ctx.fillRect(-s * 0.32, 3, s * 0.64, 3); ctx.restore();
    }
  },
  plastic(ctx, w, h, r) { ctx.fillStyle = g2(240); ctx.fillRect(0, 0, w, h); noise(ctx, w, h, r, 2500, 240, 10); },
  tiles(ctx, w, h, r) {
    ctx.fillStyle = g2(170); ctx.fillRect(0, 0, w, h); const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { ctx.fillStyle = g2(240 + (r() - 0.5) * 16); ctx.fillRect(x * s + 3, y * s + 3, s - 6, s - 6); }
  },
  glass(ctx, w, h, r) {
    ctx.fillStyle = g2(225); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = g2(255); ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(w * 0.15, h); ctx.lineTo(w * 0.35, h); ctx.lineTo(w * 0.75, 0); ctx.lineTo(w * 0.55, 0); ctx.fill();   // streak
    ctx.globalAlpha = 1;
  },
};

function canvasFor(name) {
  const key = 'c:' + name;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = SIZE;
  DRAW[name](c.getContext('2d'), SIZE, SIZE, rng(11 + name.length * 7));
  cache.set(key, c); return c;
}
function texFor(name, srgb) {
  const key = (srgb ? 't:' : 'b:') + name;
  if (cache.has(key)) return cache.get(key);
  const t = new THREE.CanvasTexture(canvasFor(name));
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t); return t;
}

/**
 * A Roblox-style material. opts: color, tile (studs per repeat), roughness, metalness, plus any MeshStandardMaterial field.
 * Materials are cached by name+opts, so calling tmat('brick') everywhere is cheap.
 */
export function tmat(name, opts = {}) {
  const d = DEF[name]; if (!d) throw new Error('tmat: no material ' + name + ' (have ' + Object.keys(DEF).join(', ') + ')');
  const key = 'm:' + name + JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);
  const { color = d.color, tile = d.tile, ...extra } = opts;
  const m = new THREE.MeshStandardMaterial({
    color, map: texFor(name, true), roughness: d.rough, metalness: d.metal || 0,
    ...(d.bump ? { bumpMap: texFor(name, false), bumpScale: d.bump } : {}),
    ...(name === 'glass' ? { transparent: true, opacity: 0.55, depthWrite: false } : {}),
    ...extra,
  });
  m.userData.tile = tile; m.name = 'tmat_' + name;
  cache.set(key, m); return m;
}

/**
 * Rescale a geometry's UVs so 1 texture repeat = `tile` studs. Works on BoxGeometry (per face) and on planar geometry.
 * Call after building the geometry, before scaling the mesh.
 */
export function tileUV(geo, tile = 4) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    // project on the face plane: walls use horizontal + y so bricks stay level
    if (ay >= ax && ay >= az) uv.setXY(i, x / tile, z / tile);
    else if (ax >= az) uv.setXY(i, z / tile, y / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
  uv.needsUpdate = true; return geo;
}

/** A textured box part (w, h, d in studs), centred like core.box. */
export function tbox(w, h, d, mat) {
  const geo = tileUV(new THREE.BoxGeometry(w, h, d), mat.userData?.tile || 4);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
}

/** A textured ground plane, already lying flat (y up). */
export function tplane(w, d, mat) {
  const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2); tileUV(geo, mat.userData?.tile || 4);
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; return m;
}

/** Wedge (Roblox WedgePart): w x h x d, slope rises toward -Z. Textured with world-scale UVs. */
export function twedge(w, h, d, mat) {
  const s = new THREE.Shape(); s.moveTo(-d / 2, -h / 2); s.lineTo(d / 2, -h / 2); s.lineTo(-d / 2, h / 2); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2); geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals(); tileUV(geo, mat.userData?.tile || 4);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
}

export const MATERIALS = Object.keys(DEF);
