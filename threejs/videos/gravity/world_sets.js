// Crush Gravity: sets. Built from world_index.js (names and coordinates come from there).
import { THREE, V, clamp, rng, std, canvasTex, emissive, scene } from '../../kit/core.js';
import { setLook, focus, hemi, key } from '../../kit/look.js';
import { tmat, tbox, tplane, twedge } from '../../kit/textures.js';
import { makeBus } from '../../kit/buildings.js';
import { loadProp } from '../../kit/models.js';
import { INDEX } from './world_index.js';

const v3 = a => V(a[0], a[1], a[2]);
const B = (parent, w, h, d, mat, x, y, z) => { const m = tbox(w, h, d, mat); m.position.set(x, y, z); parent.add(m); return m; };
const M = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
const label = (text, w = 512, h = 128, bg = '#ffffff', fg = '#1a1a1a', px = 80) => new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(h, (c, W, H) => {
  c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = fg; c.font = `bold ${px}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W / 2, H / 2 + 4);
}, w) });
const plane = (parent, w, h, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; };

// ---------- marks / cams from the index ----------
function marksFor(prefix, strip) {
  const marks = {}, face = {};
  for (const [n, e] of Object.entries(INDEX.marks)) {
    const [set, name] = n.split('.'); if (!prefix.includes(set)) continue;
    const k = strip ? name : set + '_' + name; marks[k] = v3(e.p); face[k] = e.face ?? 0;
  }
  return { marks, face };
}
function camsFor(prefix, strip) {
  const cams = {};
  for (const [n, e] of Object.entries(INDEX.cams)) {
    const [set, name] = n.split('.'); if (!prefix.includes(set)) continue;
    cams[strip ? name : set + '_' + name] = [v3(e.p), v3(e.look), e.fov];
  }
  return cams;
}

// =====================================================================================
// SCHOOL interior at V(0,0,0): rooms along X, back wall z=-15, open to +Z
// =====================================================================================
export const SCHOOL = V(0, 0, 0);
export const CEIL = { hall: 14, gym: 22, cafe: 16, office: 12 };
export const ROOMS = {
  hall:   { x0: -80, x1: -40, cx: -60, ceil: CEIL.hall },
  gym:    { x0: -40, x1: 10,  cx: -15, ceil: CEIL.gym },
  cafe:   { x0: 10,  x1: 54,  cx: 32,  ceil: CEIL.cafe },
  office: { x0: 54,  x1: 80,  cx: 67,  ceil: CEIL.office },
};
export const school = { ...marksFor(['hall', 'gym', 'cafe', 'office']), rooms: ROOMS };
export const SCHOOL_CAMS = camsFor(['hall', 'gym', 'cafe', 'office']);

const sg = new THREE.Group(); sg.name = 'school'; scene.add(sg);
const ZB = -15, ZF = 15, FLOOR_Z1 = 45, CEIL_Z1 = 22;
const wallMat = {
  hall: tmat('plastic', { color: 0xe6dcc2, roughness: 1 }),
  gym: tmat('brick', { color: 0xd6cfc2 }),
  cafe: tmat('plastic', { color: 0xd3e4cc, roughness: 1 }),
  office: tmat('plastic', { color: 0xdac9a6, roughness: 1 }),
};
const floorMat = {
  hall: tmat('tiles', { color: 0xd6d0c0 }),
  gym: tmat('woodplanks', { color: 0xd09a5e }),
  cafe: tmat('tiles', { color: 0xc4d4da }),
  office: tmat('fabric', { color: 0x5d6d8c }),
};
const ceilMat = tmat('tiles', { color: 0xe8e4da, roughness: 1 });
const metalM = tmat('metal', { color: 0x8a9096 }), whiteM = tmat('plastic', { color: 0xf2f0ea, roughness: 0.6 });
const darkM = std(0x22252a, { roughness: 0.8 });

// floors (extend past the open front so low cameras never see the edge), ceilings, back walls, baseboards, lamps
export const lamps = [];
for (const [name, r] of Object.entries(ROOMS)) {
  const w = r.x1 - r.x0;
  B(sg, w, 0.4, FLOOR_Z1 - ZB, floorMat[name], r.cx, -0.2, (ZB + FLOOR_Z1) / 2);
  B(sg, w + 1, 0.6, CEIL_Z1 - ZB + 1, ceilMat, r.cx, r.ceil + 0.3, (ZB - 1 + CEIL_Z1) / 2);
  if (name !== 'cafe') B(sg, w, r.ceil, 1, wallMat[name], r.cx, r.ceil / 2, ZB - 0.5);
  B(sg, w, 0.6, 0.15, darkM, r.cx, 0.3, ZB + 0.08);
  for (const s of [-1, 1]) {
    const lx = r.cx + s * w / 4;
    for (const lz of [-6, 6]) M(sg, new THREE.BoxGeometry(3, 0.15, 5), emissive(0xfff6e4, 1.2, 0xf4f0e6), lx, r.ceil - 0.08, lz);
    const L = new THREE.PointLight(0xfff0dc, name === 'gym' ? 90 : 60, r.ceil * 3.2, 1.3); L.position.set(lx, r.ceil - 1.5, 0); sg.add(L); lamps.push(L);
  }
}
// side walls / dividers with a doorway (7 wide, 8.5 tall) centred at z=-6; each side painted for its own room
function divider(x, left, right) {
  const h = Math.max(left ? ROOMS[left].ceil : 0, right ? ROOMS[right].ceil : 0);
  for (const [room, off] of [[left, -0.25], [right, 0.25]]) {
    if (!room) continue; const m = wallMat[room], hx = x + off;
    B(sg, 0.5, h, 5.5, m, hx, h / 2, -12.25);
    B(sg, 0.5, h, 17.5, m, hx, h / 2, 6.25);
    B(sg, 0.5, h - 8.5, 7, m, hx, 8.5 + (h - 8.5) / 2, -6);
  }
  B(sg, 1.2, 0.5, 7.6, whiteM, x, 8.6, -6);   // door frame header
}
B(sg, 1, CEIL.hall, 30, wallMat.hall, -80.5, CEIL.hall / 2, 0);
B(sg, 1, CEIL.office, 30, wallMat.office, 80.5, CEIL.office / 2, 0);
divider(-40, 'hall', 'gym'); divider(10, 'gym', 'cafe'); divider(54, 'cafe', 'office');
// grass + trees outside the cafe windows
{ const gr = tplane(240, 140, tmat('grass')); gr.position.set(0, -0.05, -85); sg.add(gr); }

// ---------- hall: lockers on back wall and both side walls, banner ----------
{
  const lockM = tmat('metal', { color: 0x3a66b0, roughness: 0.6 }), ventM = std(0x1d2c48);
  const locker = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; sg.add(g);
    B(g, 1.9, 7, 1.6, lockM, 0, 3.8, 0);
    for (const y of [6.6, 6.3, 6.0]) B(g, 1.2, 0.1, 0.06, ventM, 0, y, 0.82);
    B(g, 0.15, 0.6, 0.12, metalM, 0.6, 3.8, 0.84);
  };
  B(sg, 38, 0.3, 1.8, darkM, -60, 0.15, -14.1);
  for (let x = -76; x <= -44; x += 2) locker(x, -14.2, 0);
  for (let z = -12; z <= 13; z += 2) locker(-78.7, z, Math.PI / 2);
  for (const z of [-12, -1, 1, 3, 5, 7, 9, 11, 13]) locker(-41.3, z, -Math.PI / 2);
  plane(sg, 14, 2.6, label('GO EAGLES!', 512, 96, '#c0392b', '#ffffff', 66), -60, 10.6, -14.95);
  B(sg, 6, 3.5, 0.2, tmat('woodplanks', { color: 0x8a5a34 }), -50, 10.4, -14.9);
  plane(sg, 5.4, 3, label('NO RUNNING', 384, 192, '#f4ecd6', '#333', 52), -50, 10.4, -14.78);
}

// ---------- gym: court lines, hoops, bleachers, wall pads, banner ----------
{
  const lineM = std(0xf4f4f0, { roughness: 0.8 }), lineY = 0.02, x0 = -37, x1 = 7, z0 = -12, z1 = 12;
  M(sg, new THREE.BoxGeometry(x1 - x0, 0.02, 0.3), lineM, (x0 + x1) / 2, lineY, z0);
  M(sg, new THREE.BoxGeometry(x1 - x0, 0.02, 0.3), lineM, (x0 + x1) / 2, lineY, z1);
  for (const x of [x0, x1, -15]) M(sg, new THREE.BoxGeometry(0.3, 0.02, z1 - z0), lineM, x, lineY, 0);
  const ring = M(sg, new THREE.RingGeometry(4, 4.3, 40), lineM, -15, lineY + 0.005, 0); ring.rotation.x = -Math.PI / 2;
  const orange = std(0xe86a1a, { roughness: 0.5 });
  for (const hx of [-32, 2]) {
    B(sg, 0.5, 0.5, 2, metalM, hx, 13, -14);
    B(sg, 6, 4, 0.3, whiteM, hx, 13, -12.9);
    M(sg, new THREE.BoxGeometry(2.2, 1.6, 0.05), std(0xd03a2a), hx, 12.4, -12.72).material.roughness = 0.8;
    M(sg, new THREE.BoxGeometry(1.8, 1.2, 0.06), whiteM, hx, 12.4, -12.7);
    const rim = M(sg, new THREE.TorusGeometry(0.9, 0.08, 8, 20), orange, hx, 11.5, -11.8); rim.rotation.x = Math.PI / 2;
  }
  const benchW = tmat('woodplanks', { color: 0xb07a45 });
  for (const [z, top] of [[-8, 2.7], [-10, 4.0], [-12, 5.2], [-14, 6.4]]) { B(sg, 16, top, 2, benchW, -31, top / 2, z); B(sg, 16, 0.12, 0.2, darkM, -31, top + 0.02, z + 0.95); }
  const pad = tmat('fabric', { color: 0x2f5fa8 });
  B(sg, 31, 5, 0.6, pad, -6.5, 2.5, -14.7);
  plane(sg, 16, 3, label('EAGLES', 512, 96, '#2f5fa8', '#ffd23f', 72), -15, 17.5, -14.95);
}

// ---------- cafe: back wall with 3 open windows, tables, benches ----------
{
  const r = ROOMS.cafe, m = wallMat.cafe, wy0 = 4, wy1 = 11;
  B(sg, 44, wy0, 1, m, r.cx, wy0 / 2, ZB - 0.5);
  B(sg, 44, r.ceil - wy1, 1, m, r.cx, wy1 + (r.ceil - wy1) / 2, ZB - 0.5);
  for (const [a, b] of [[10, 17], [25, 28], [36, 39], [47, 54]]) B(sg, b - a, wy1 - wy0, 1, m, (a + b) / 2, (wy0 + wy1) / 2, ZB - 0.5);
  for (const wx of [21, 32, 43]) {
    for (const [w, h, dx, dy] of [[8.6, 0.4, 0, wy1 - 7.5 + 0.1], [8.6, 0.6, 0, wy0 - 7.5 - 0.1], [0.4, 7.4, -4.1, 0], [0.4, 7.4, 4.1, 0]]) B(sg, w, h, 1.2, whiteM, wx + dx, 7.5 + dy, ZB - 0.5);
  }
  const topM = tmat('plastic', { color: 0xd9c7a0, roughness: 0.9 }), benchM = tmat('plastic', { color: 0x3f6fae, roughness: 0.8 });
  for (const tz of [-6, 3]) {
    B(sg, 20, 0.3, 3.5, topM, 32, 2.45, tz);
    for (const lx of [-9, 0, 9]) B(sg, 0.3, 2.3, 2.6, metalM, 32 + lx, 1.15, tz);
    for (const bz of [tz - 2.4, tz + 2.4]) { B(sg, 20, 0.3, 1.4, benchM, 32, 1.35, bz); for (const lx of [-9, 0, 9]) B(sg, 0.3, 1.2, 1.0, metalM, 32 + lx, 0.6, bz); }
  }
  B(sg, 0.4, 9, 7, tmat('woodplanks', { color: 0x6a4a2e }), 53.4, 6, 8);
  plane(sg, 6, 3, label('LUNCH', 384, 192, '#2e7d4a', '#ffffff', 90), 53.15, 8.5, 8, -Math.PI / 2);
  for (const tx of [14, 50]) M(sg, new THREE.CylinderGeometry(1, 0.9, 3, 14), std(0x3a7a4a, { roughness: 0.8 }), tx, 1.5, 11);
}
await Promise.all([[18, -36], [34, -44], [48, -34], [26, -60], [42, -58]].map(([x, z]) => loadProp('tree', { x, z, parent: sg }).catch(() => null)));

// ---------- office: desk, nameplate, chair, bookshelf, flag ----------
{
  const wood = tmat('woodplanks', { color: 0x7a5030 });
  B(sg, 10, 0.4, 3.4, wood, 67, 2.6, -5);
  B(sg, 10, 2.4, 0.3, wood, 67, 1.2, -3.45);
  for (const s of [-1, 1]) B(sg, 0.3, 2.4, 3.2, wood, 67 + s * 4.85, 1.2, -5);
  B(sg, 3, 0.8, 0.5, std(0x2a2018, { roughness: 0.6 }), 67, 3.2, -3.6);
  plane(sg, 2.8, 0.66, label('MR HALE', 512, 120, '#d8b45a', '#1a1208', 78), 67, 3.2, -3.34);
  B(sg, 1.6, 0.15, 1.1, whiteM, 64, 2.88, -5.4); B(sg, 0.9, 1.0, 0.9, std(0x3a6fb0), 70.5, 3.3, -5.6);
  const chairM = tmat('fabric', { color: 0x222428 });
  B(sg, 2.4, 0.4, 2.2, chairM, 67, 1.4, -8.9); B(sg, 2.4, 3, 0.4, chairM, 67, 3.1, -10.1); B(sg, 0.3, 1.2, 0.3, metalM, 67, 0.6, -8.9);
  B(sg, 6, 9, 1.6, wood, 75, 4.5, -14.1);
  const rb = rng(7), cols = [0xc0392b, 0x2e86c1, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22];
  for (const sy of [1.2, 3.6, 6.0]) { B(sg, 5.6, 0.2, 1.3, wood, 75, sy - 0.1, -13.6); for (let i = 0; i < 9; i++) B(sg, 0.5, 1.4 + rb() * 0.6, 1.0, std(cols[i % 6]), 72.6 + i * 0.6, sy + 0.8, -13.5); }
  B(sg, 0.2, 10, 0.2, metalM, 57.5, 5, -12);
  M(sg, new THREE.PlaneGeometry(3.4, 2.2), std(0x2a4fa0, { side: THREE.DoubleSide }), 59.3, 8.6, -12);
  plane(sg, 7, 1.8, label('PRINCIPAL', 512, 128, '#1f3a6a', '#ffffff', 80), 64, 9.4, -14.95);
}

// ---------- gym floor crack ----------
export const crack = (() => {
  const tex = canvasTex(512, (c, W, H) => {
    const r = rng(11); c.strokeStyle = '#1a120c'; c.lineCap = 'round';
    const branch = (x, y, a, len, w, depth) => {
      let px = x, py = y; const n = 6;
      for (let i = 0; i < n; i++) {
        const nx = px + Math.cos(a) * len / n, ny = py + Math.sin(a) * len / n; a += (r() - 0.5) * 0.9;
        c.lineWidth = w * (1 - i / n) + 1; c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke(); px = nx; py = ny;
        if (depth > 0 && r() < 0.35) branch(px, py, a + (r() - 0.5) * 1.6, len * 0.45, w * 0.6, depth - 1);
      }
    };
    c.fillStyle = 'rgba(20,14,10,0.55)'; c.beginPath(); c.arc(256, 256, 26, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 9; i++) branch(256, 256, i / 9 * Math.PI * 2 + r() * 0.4, 170 + r() * 70, 12, 2);
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), mat); m.rotation.x = -Math.PI / 2; m.position.set(-15, 0.03, 3); m.receiveShadow = true; sg.add(m);
  m.visible = false;
  return { mesh: m, set(k) { k = clamp(k, 0, 1); m.visible = k > 0.01; const s = 0.15 + 0.85 * k; m.scale.set(s, s, 1); }, hide() { m.visible = false; } };
})();

// ---------- cafe trays: sit on the tables; set(t01) flies them out of the back windows ----------
export const trays = (() => {
  const trayM = tmat('plastic', { color: 0xe07a3a, roughness: 0.8 }), r = rng(5);
  const spots = [[24, 3, 21], [30, 3, 32], [33, 3, 32], [38, 3, 43], [25, -6, 21], [39, -6, 43]];
  const items = spots.map(([x, z, wx], i) => {
    const g = new THREE.Group(); sg.add(g);
    B(g, 2.2, 0.15, 1.5, trayM, 0, 0, 0);
    B(g, 0.45, 0.7, 0.45, std(0xf4f4f0), -0.6, 0.42, -0.3);
    M(g, new THREE.SphereGeometry(0.28, 12, 8), std(0xc0392b, { roughness: 0.6 }), 0.55, 0.35, -0.25);
    B(g, 0.9, 0.25, 0.6, std(0xe8c46a), 0.1, 0.2, 0.35);
    const p0 = V(x, 2.68, z), p2 = V(wx + (r() - 0.5) * 3, 7.5 + (r() - 0.5) * 2, -15), p1 = V(x, 9, (z - 15) / 2), p3 = V(wx + (r() - 0.5) * 20, 18 + r() * 8, -55);
    return { g, p0, p1, p2, p3, d: i * 0.07, spin: 1.2 + r() * 1.5 };
  });
  const api = {
    set(t01) {
      for (const it of items) {
        const u = clamp((t01 - it.d) / (1 - 0.35), 0, 1);
        if (u < 0.6) { const s = u / 0.6, a = it.p0.clone().lerp(it.p1, s), b = it.p1.clone().lerp(it.p2, s); it.g.position.copy(a.lerp(b, s)); }
        else it.g.position.copy(it.p2.clone().lerp(it.p3, (u - 0.6) / 0.4));
        it.g.rotation.set(u * it.spin, u * 0.8, u * it.spin * 0.5); it.g.visible = true;
      }
    },
    reset() { api.set(0); },
    hide() { api.set(0); },   // trays are scenery: "hidden" = resting on the tables
  };
  api.reset();
  return api;
})();

// ---------- hall books/papers drifting out of the back lockers ----------
export const books = (() => {
  const g = new THREE.Group(); sg.add(g); g.visible = false; const r = rng(21), cols = [0xc0392b, 0x2e86c1, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22];
  const items = [];
  for (let i = 0; i < 16; i++) {
    const paper = i % 3 === 2;
    const m = paper ? M(g, new THREE.PlaneGeometry(1.1, 1.4), std(0xf2efe6, { side: THREE.DoubleSide, roughness: 1 }), 0, 0, 0)
                    : M(g, new THREE.BoxGeometry(1.0, 1.4, 0.3), std(cols[i % 6], { roughness: 0.8 }), 0, 0, 0);
    items.push({ m, base: V(-74 + i * 1.9, 3.5 + r() * 3, -13), up: 4 + r() * 6, fwd: 2 + r() * 6, rx: (r() - 0.5) * 3, ry: (r() - 0.5) * 3, ph: r() * 6 });
  }
  return {
    set(k, t = 0) {
      k = clamp(k, 0, 1); g.visible = k > 0.01;
      for (const it of items) {
        it.m.position.set(it.base.x + Math.sin(t * 0.8 + it.ph) * 0.4 * k, it.base.y + it.up * k + Math.sin(t * 1.2 + it.ph) * 0.3 * k, it.base.z + it.fwd * k);
        it.m.rotation.set(it.rx * k + Math.sin(t * 0.9 + it.ph) * 0.3 * k, it.ry * k, Math.sin(t * 0.7 + it.ph) * 0.4 * k);
      }
    },
    hide() { g.visible = false; },
  };
})();

export function look_school(p = V(-15, 0, 0)) {
  setLook('day'); hemi.intensity *= 0.5; key.intensity *= 0.35; focus(p);
}

// =====================================================================================
// OUTSIDE at V(300,0,0): grass, brick school with a lifting roof, yard, lot, bus, sign, trees
// =====================================================================================
export const OUTSIDE = V(300, 0, 0);
export const outside = marksFor(['outside'], true);
export const OUTSIDE_CAMS = camsFor(['outside'], true);

const og = new THREE.Group(); og.name = 'outside'; og.position.copy(OUTSIDE); scene.add(og);
{
  const grass = tplane(280, 280, tmat('grass')); grass.position.set(0, 0, 0); og.add(grass);
  const yard = tplane(50, 24.5, tmat('concrete')); yard.position.set(-16, 0.02, 1.75); og.add(yard);
  const walk = tplane(80, 4.5, tmat('sidewalk')); walk.position.set(0, 0.03, -12.75); og.add(walk);
  const lot = tplane(62, 40, tmat('asphalt')); lot.position.set(41, 0.025, 10); og.add(lot);
  const paint = std(0xf4f4f0, { roughness: 0.9 }), ypaint = std(0xf2c230, { roughness: 0.9 });
  for (let x = 14; x <= 70; x += 6) M(og, new THREE.BoxGeometry(0.3, 0.02, 8), paint, x, 0.04, 25);
  M(og, new THREE.BoxGeometry(34, 0.02, 0.3), ypaint, 28, 0.04, 6.5); M(og, new THREE.BoxGeometry(34, 0.02, 0.3), ypaint, 28, 0.04, 17.5);

  // building: hollow walls (so the open top reads when the roof lifts), brick, framed windows, doors, canopy
  const brick = tmat('brick'), cap = tmat('concrete'), H = 20, x0 = -35, x1 = 35, zf = -15, zb = -45;
  B(og, 70, H, 1, brick, 0, H / 2, zf - 0.5); B(og, 70, H, 1, brick, 0, H / 2, zb + 0.5);
  for (const x of [x0 + 0.5, x1 - 0.5]) B(og, 1, H, 30, brick, x, H / 2, (zf + zb) / 2);
  B(og, 71, 1.2, 1.6, cap, 0, 0.6, zf - 0.3);
  for (const [w, d, x, z] of [[71, 1.4, 0, zf - 0.5], [71, 1.4, 0, zb + 0.5], [1.4, 30, x0 + 0.5, -30], [1.4, 30, x1 - 0.5, -30]]) B(og, w, 0.6, d, cap, x, H + 0.3, z);
  B(og, 69, 0.3, 29, cap, 0, 0.15, -30);
  for (const x of [-12, 12]) B(og, 0.6, H - 1, 28, tmat('plastic', { color: 0xe6dcc2, roughness: 1 }), x, (H - 1) / 2, -30);
  const frame = tmat('plastic', { color: 0xf2f2f2, roughness: 0.6 }), pane = std(0x4a6f96, { roughness: 0.15, metalness: 0.3 });
  const win = (x, y) => { M(og, new THREE.BoxGeometry(5, 4.5, 0.15), pane, x, y, zf + 0.06); for (const [w, h, dx, dy] of [[5.6, 0.35, 0, 2.4], [5.8, 0.5, 0, -2.45], [0.35, 4.8, -2.65, 0], [0.35, 4.8, 2.65, 0], [0.2, 4.5, 0, 0]]) B(og, w, h, 0.4, frame, x + dx, y + dy, zf + 0.15); };
  for (const x of [-30, -22, -14, 14, 22, 30]) win(x, 5.5);
  for (const x of [-30, -22, -14, -6, 6, 14, 22, 30]) win(x, 14.5);
  for (const s of [-1, 1]) M(og, new THREE.BoxGeometry(3.4, 7.8, 0.2), std(0x2a3a4a, { roughness: 0.2, metalness: 0.3 }), s * 1.8, 4.1, zf + 0.1);
  B(og, 7.6, 0.4, 0.4, frame, 0, 8.1, zf + 0.2); for (const x of [-3.7, 0, 3.7]) B(og, 0.3, 8, 0.4, frame, x, 4.1, zf + 0.2);
  B(og, 12, 0.8, 5, cap, 0, 9.6, zf + 2.5); for (const s of [-1, 1]) B(og, 0.6, 9.2, 0.6, frame, s * 5.6, 4.6, zf + 4.7);
  plane(og, 11.6, 0.75, label('EAGLE SCHOOL', 1024, 72, '#1f3a6a', '#ffffff', 56), 0, 9.6, zf + 5.02);
  // sign on posts
  const sign = new THREE.Group(); sign.position.set(-22, 0, -9); sign.rotation.y = 0.2; og.add(sign);
  B(sign, 11, 1.4, 1.4, brick, 0, 0.7, 0); for (const s of [-1, 1]) B(sign, 0.5, 3.6, 0.5, tmat('metal', { color: 0x333333 }), s * 4.6, 3.2, 0);
  B(sign, 10, 3.4, 0.5, tmat('plastic', { color: 0x1f3a6a }), 0, 3.6, 0);
  plane(sign, 9.4, 2.8, label('SCHOOL', 512, 160, '#1f3a6a', '#ffd23f', 110), 0, 3.6, 0.26);
  // flagpole
  B(og, 0.3, 18, 0.3, tmat('metal'), -30, 9, -9);
  M(og, new THREE.PlaneGeometry(4, 2.4), std(0xc0392b, { side: THREE.DoubleSide, roughness: 0.9 }), -28, 16.4, -9);
}
await Promise.all([[-55, -25], [-48, -45], [52, -22], [60, -42], [-60, 10], [80, 40], [-40, 40], [20, -70], [-20, -70]].map(([x, z]) => loadProp('tree', { x: 300 + x, z }).catch(() => null)));

// ---------- roof: separate group on top of the school, lifts and tumbles away ----------
export const roof = (() => {
  const g = new THREE.Group(); og.add(g);
  const slate = tmat('slate'), conc = tmat('concrete');
  B(g, 72, 1.2, 32, slate, 0, 0.6, 0);
  for (const [w, d, x, z] of [[72, 0.8, 0, 15.6], [72, 0.8, 0, -15.6], [0.8, 32, 35.6, 0], [0.8, 32, -35.6, 0]]) B(g, w, 1.6, d, conc, x, 2, z);
  for (const x of [-22, 20]) { B(g, 5, 2.4, 4, tmat('metal'), x, 2.4, -6); B(g, 3.6, 0.3, 3.6, darkM, x, 3.7, -6); }
  B(g, 7, 6, 7, tmat('brick'), 0, 4.2, 4);
  const w1 = twedge(7.4, 3, 3.7, tmat('shingles')); w1.position.set(0, 8.7, 5.85); g.add(w1);
  const w2 = twedge(7.4, 3, 3.7, tmat('shingles')); w2.position.set(0, 8.7, 2.15); w2.rotation.y = Math.PI; g.add(w2);
  const clock = M(g, new THREE.CircleGeometry(1.8, 24), std(0xf6f2e6), 0, 5, 7.52);
  const api = {
    group: g,
    setLift(k, t = 0) {
      k = clamp(k, 0, 1);
      g.position.set(Math.sin(t * 0.5) * 2 * k, 20 + k * 60 + Math.sin(t * 1.1) * 0.6 * k, -30 - k * 18);
      g.rotation.set(k * 0.5 + Math.sin(t * 0.7) * 0.06 * k, Math.sin(t * 0.4) * 0.12 * k, -k * 0.35);
    },
    hide() { api.setLift(0); },   // back in place on the school
  };
  api.setLift(0); clock.castShadow = false;
  return api;
})();

// ---------- yellow school bus on the lot (along X, front faces +X) ----------
export const bus = (() => {
  const root = new THREE.Group(); root.position.set(328, 0, 12); root.rotation.y = Math.PI / 2; scene.add(root);
  const tilt = new THREE.Group(); root.add(tilt); const b = makeBus(); tilt.add(b);
  const api = {
    root, model: b,
    setFloat(k, t = 0) {
      k = clamp(k, 0, 1);
      root.position.set(328 + k * 10, k * 45 + Math.sin(t * 1.3) * 0.4 * k, 12 - k * 6);
      tilt.rotation.set(-k * 0.3 + Math.sin(t * 0.8) * 0.04 * k, 0, Math.sin(t * 0.6) * 0.08 * k);
      for (const w of b.userData.wheels) w.rotation.x = t * 1.5 * k;
    },
    hide() { api.setFloat(0); },   // parked on the lot
  };
  return api;
})();

export function look_outside(p = OUTSIDE.clone()) { setLook('day'); focus(p); }

// ---------- happy-gravity motes ----------
export const floatFx = (() => {
  const g = new THREE.Group(); scene.add(g); g.visible = false; const r = rng(3);
  const mat = new THREE.MeshStandardMaterial({ color: 0x332a10, emissive: 0xffe07a, emissiveIntensity: 2.2, transparent: true, opacity: 0.8, depthWrite: false });
  const geo = new THREE.SphereGeometry(0.12, 8, 6), motes = [];
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(geo, mat); g.add(m);
    const a = r() * Math.PI * 2, u = r() * 2 - 1, rr = Math.cbrt(r());
    motes.push({ m, d: V(Math.sqrt(1 - u * u) * Math.cos(a) * rr, u * rr, Math.sqrt(1 - u * u) * Math.sin(a) * rr), ph: r(), s: 0.6 + r() * 0.9 });
  }
  return {
    set(on, center = V(0, 0, 0), radius = 6, t = 0) {
      g.visible = !!on; if (!on) return; g.position.copy(center);
      for (const o of motes) {
        const rise = ((t * 0.12 * o.s + o.ph) % 1) * radius * 0.8;
        o.m.position.set(o.d.x * radius + Math.sin(t * 0.7 + o.ph * 6) * 0.3, o.d.y * radius * 0.6 + rise - radius * 0.3, o.d.z * radius);
        o.m.scale.setScalar(0.7 + 0.5 * Math.sin(t * 1.5 + o.ph * 6) ** 2);
      }
    },
    hide() { g.visible = false; },
  };
})();

/** Call in shots.js before(t): every prop/fx back to its rest state (crack/books/motes invisible, trays on tables, roof on, bus parked). */
export function hideAll() { crack.hide(); trays.hide(); books.hide(); bus.hide(); roof.hide(); floatFx.hide(); }
