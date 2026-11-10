// Reusable house interior: 1-4 rooms side by side, open toward +Z (camera side), doorways between them, textured walls, night windows,
// lamps, and furniture by room kind. Built from parts (no downloads). Scale = Roblox studs (a character is ~5.2 tall).
//
//   import { buildHouseInterior } from '../../kit/interiors.js';
//   const hi = buildHouseInterior(V(-300, 0, 0), { rooms: [
//     { name: 'living',  kind: 'living' },                       // armchair + sofa + rug + lamp
//     { name: 'leo',     kind: 'bedroom' },                      // bed (space under it), nightstand, rug
//     { name: 'nursery', kind: 'nursery' },                      // crib, closet with doors, rug
//     { name: 'hall',    kind: 'hall', wall: 0xcfc3a8 },         // table + coat rack
//   ] });
//   hi.rooms.leo.marks.bed / .underBed / .floor / .window / .doorway / .front   -> world Vector3 (y = surface)
//   hi.rooms.leo.facing.bed ...                                                  -> rotY for a character standing/lying there
//   hi.rooms.leo.cams.wide / .close                                              -> [pos, look, fov] (PIPELINE §3 distances, camera outside the open front)
//   hi.rooms.nursery.closet.setOpen(k)   hi.setLit(true|false)   hi.index        -> flat { 'room.mark': [x,y,z] } for the video's world_index.js
// Per room opts: name, kind ('living'|'bedroom'|'nursery'|'hall'), wall (colour), floor (colour), w (28), d (22).
// Indoor light: after setLook() cut sky fill ~0.5x and key ~0.35x (PIPELINE §3) and let these lamps light the room.
import { THREE, scene, std, V } from './core.js';
import { tmat, tbox } from './textures.js';

const add = (p, m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); p.add(m); return m; };
const T = 0.5, H = 12;

function bed(w = 9, d = 13, blanket = 0x3b5ea6) {            // headboard toward -Z; mattress top y ~3.1, free space under (y 0.4..1.4)
  const g = new THREE.Group(), wood = tmat('wood', { color: 0x7a4a2c });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, tbox(0.6, 1.4, 0.6, wood), sx * (w / 2 - 0.3), 0.7, sz * (d / 2 - 0.3));
  add(g, tbox(w, 0.5, d, wood), 0, 1.6, 0);
  add(g, tbox(w, 3.4, 0.5, wood), 0, 2.5, -d / 2 + 0.25);
  add(g, tbox(w - 0.6, 1.0, d - 1.0, tmat('fabric', { color: 0xe9e4da })), 0, 2.35, 0.2);
  add(g, tbox(w - 0.4, 0.5, d * 0.62, tmat('fabric', { color: blanket })), 0, 3.0, 2.0);
  add(g, tbox(w * 0.7, 0.6, 2.6, tmat('fabric', { color: 0xf4f1ea })), 0, 3.0, -d / 2 + 2.2);
  return g;
}
function crib() {
  const g = new THREE.Group(), wood = tmat('wood', { color: 0xd8c7a0 });
  add(g, tbox(7, 0.4, 11, wood), 0, 1.6, 0); add(g, tbox(6.4, 0.6, 10.4, tmat('fabric', { color: 0xf1ecff })), 0, 2.1, 0);
  for (const sx of [-1, 1]) add(g, tbox(0.4, 4.2, 11, wood), sx * 3.5, 3.6, 0);
  for (const sz of [-1, 1]) add(g, tbox(7, 4.2, 0.4, wood), 0, 3.6, sz * 5.5);
  for (let i = -2; i <= 2; i++) for (const sz of [-1, 1]) add(g, tbox(0.15, 3.4, 0.15, wood), i * 1.3, 3.5, sz * 5.4);
  for (let i = -3; i <= 3; i++) for (const sx of [-1, 1]) add(g, tbox(0.15, 3.4, 0.15, wood), sx * 3.4, 3.5, i * 1.5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, tbox(0.5, 1.6, 0.5, wood), sx * 3.3, 0.8, sz * 5.2);
  return g;
}
function closet(w = 7, h = 9, d = 3) {                          // doors on the +Z face, hinged at the outer edges; setOpen(0..1)
  const g = new THREE.Group(), body = tmat('wood', { color: 0x9b7a55 }), doors = [];
  add(g, tbox(w, h, d, body), 0, h / 2, 0);
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * w / 2, 0, d / 2 + 0.05); g.add(pivot);
    add(pivot, tbox(w / 2 - 0.1, h - 0.4, 0.3, tmat('wood', { color: 0xb08c63 })), -s * (w / 4), h / 2, 0.15);
    add(pivot, tbox(0.3, 0.6, 0.3, std(0xd9b24a, { metalness: 0.8, roughness: 0.3 })), -s * 0.4, h / 2, 0.45);
    doors.push([pivot, s]);
  }
  g.userData.setOpen = k => { for (const [p, s] of doors) p.rotation.y = s * k * 1.9; };   // swing out toward +Z
  return g;
}
function armchair() {
  const g = new THREE.Group(), f = tmat('fabric', { color: 0x8a3b3b });
  add(g, tbox(5, 1.6, 5, f), 0, 1.2, 0); add(g, tbox(5, 3.6, 1.2, f), 0, 3.0, -2.2);
  for (const s of [-1, 1]) add(g, tbox(1.0, 2.6, 5, f), s * 2.5, 2.2, 0);
  return g;
}
function sofa() {
  const g = new THREE.Group(), f = tmat('fabric', { color: 0x4d6a58 });
  add(g, tbox(10, 1.6, 4.4, f), 0, 1.2, 0); add(g, tbox(10, 3.4, 1.0, f), 0, 2.9, -1.7);
  for (const s of [-1, 1]) add(g, tbox(1.0, 2.6, 4.4, f), s * 5, 2.2, 0);
  return g;
}

export function buildHouseInterior(origin = V(-300, 0, 0), o = {}) {
  const specs = o.rooms ?? [{ name: 'room', kind: 'living' }];
  const n = specs.length, RW = specs.map(r => r.w ?? 28), D = Math.max(...specs.map(r => r.d ?? 22)), total = RW.reduce((a, b) => a + b, 0);
  const g = new THREE.Group(); g.position.copy(origin); scene.add(g); g.updateMatrixWorld(true);
  const W3 = (x, y, z) => origin.clone().add(V(x, y, z));
  const wallOf = r => tmat('plastic', { color: r.wall ?? 0xd8cdb4, roughness: 1 });
  const lamps = [], lit = [], rooms = {}, index = {};
  add(g, tbox(total + T * 2, 0.6, D + T, tmat('concrete')), 0, -0.3, 0);
  if (o.ceiling !== false) add(g, tbox(total + T * 2, 0.5, D + T, tmat('plastic', { color: 0xe6e0d2, roughness: 1 })), 0, H + 0.25, 0);
  add(g, tbox(T, H, D, wallOf(specs[0])), -total / 2 - T / 2, H / 2, 0);
  add(g, tbox(T, H, D, wallOf(specs[n - 1])), total / 2 + T / 2, H / 2, 0);

  let x0 = -total / 2;
  specs.forEach((r, i) => {
    const w = RW[i], cx = x0 + w / 2, wm = wallOf(r), kind = r.kind ?? 'living';
    add(g, tbox(w, 0.2, D, tmat('woodplanks', r.floor != null ? { color: r.floor } : {})), cx, 0.1, 0);                  // floor top y 0.2
    add(g, tbox(w, H, T, wm), cx, H / 2, -D / 2 - T / 2);                                                                 // back wall
    if (i < n - 1) {                                                                                                      // divider with a doorway (7 wide, 8.5 tall) at z -4
      const dz = -4, dw = 7, dh = 8.5, zf = D / 2, zb = -D / 2;
      add(g, tbox(T, H, (dz - dw / 2) - zb, wm), x0 + w, H / 2, zb + ((dz - dw / 2) - zb) / 2);
      add(g, tbox(T, H, zf - (dz + dw / 2), wm), x0 + w, H / 2, (dz + dw / 2) + (zf - (dz + dw / 2)) / 2);
      add(g, tbox(T, H - dh, dw, wm), x0 + w, dh + (H - dh) / 2, dz);
    }
    // window in the back wall (night + moon) with a frame
    const wx = cx + w * 0.22, fr = tmat('plastic', { color: 0xf4f1ea, roughness: 0.6 });
    add(g, new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.8), new THREE.MeshBasicMaterial({ color: r.windowColor ?? 0x1a2c58 })), wx, 6.2, -D / 2 + 0.02);
    for (const [bw, bh, bx, by] of [[4.8, 0.3, 0, 4.15], [4.8, 0.3, 0, -4.15], [0.3, 4.4, -2.25, 0], [0.3, 4.4, 2.25, 0]]) add(g, tbox(bw, bh, 0.3, fr), wx + bx, 6.2 + by, -D / 2 + 0.15);
    add(g, tbox(0.2, 3.8, 0.3, fr), wx, 6.2, -D / 2 + 0.15); add(g, tbox(4.4, 0.2, 0.3, fr), wx, 6.2, -D / 2 + 0.15);
    add(g, new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshBasicMaterial({ color: 0xeef2ff })), wx + 1.0, 7.4, -D / 2 + 0.03);
    // lamp light + shade
    const lamp = new THREE.PointLight(0xffb070, 30, 24, 1.6); lamp.position.set(cx - w * 0.28, 7.2, -D / 2 + 5); g.add(lamp); lamps.push(lamp);
    const shade = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 0.9, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb36a, emissiveIntensity: 1.5, side: THREE.DoubleSide })), cx - w * 0.28, 4.9, -D / 2 + 1.6);
    add(g, tbox(0.15, 4.6, 0.15, tmat('metal', { color: 0x333333 })), cx - w * 0.28, 2.3, -D / 2 + 1.6); lit.push(shade);
    const rug = add(g, new THREE.Mesh(new THREE.CircleGeometry(Math.min(w, D) * 0.2, 28), tmat('fabric', { color: r.rug ?? 0x8c2f3a })), cx, 0.26, 3); rug.rotation.x = -Math.PI / 2;

    const marks = { floor: V(cx, 0.2, 2), window: V(wx, 0.2, -D / 2 + 4), front: V(cx, 0.2, D / 2 - 2), doorway: V(x0 + w, 0.2, -4) };
    const facing = { floor: 0, window: 0, front: Math.PI, doorway: -Math.PI / 2 };
    const room = { name: r.name, kind, center: V(cx, 0, 0), group: g };
    if (kind === 'bedroom') {
      const b = add(g, bed(), cx - w * 0.22, 0.2, -D / 2 + 7.5); add(g, tbox(2.4, 2.4, 2.4, tmat('wood', { color: 0x6b3f27 })), cx - w * 0.22 + 6.2, 1.4, -D / 2 + 1.6);
      marks.bed = V(cx - w * 0.22, 3.5, -D / 2 + 7); marks.underBed = V(cx - w * 0.22, 0.2, -D / 2 + 8); marks.bedSide = V(cx - w * 0.22 + 6, 0.2, -D / 2 + 8);
      facing.bed = 0; facing.underBed = 0; facing.bedSide = -Math.PI / 2; room.bed = b;
    } else if (kind === 'nursery') {
      const c = add(g, crib(), cx - w * 0.18, 0.2, -D / 2 + 7.5), cl = add(g, closet(), cx + w * 0.3, 0.2, -D / 2 + 1.7);
      marks.crib = V(cx - w * 0.18, 2.4, -D / 2 + 7.5); marks.closet = V(cx + w * 0.3, 0.2, -D / 2 + 6); marks.closetInside = V(cx + w * 0.3, 0.2, -D / 2 + 1.7);
      facing.crib = 0; facing.closet = Math.PI; facing.closetInside = 0; room.crib = c; room.closet = { group: cl, setOpen: k => cl.userData.setOpen(k) };
    } else if (kind === 'living') {
      const a = add(g, armchair(), cx - w * 0.3, 0.2, -D / 2 + 4.5); a.rotation.y = 0.5; add(g, sofa(), cx + w * 0.12, 0.2, -D / 2 + 3.6);
      marks.armchair = V(cx - w * 0.3, 2.0, -D / 2 + 4.5); marks.sofa = V(cx + w * 0.12, 1.9, -D / 2 + 3.6); facing.armchair = 0.5; facing.sofa = 0;
    } else {   // hall
      add(g, tbox(7, 0.5, 2.8, tmat('wood', { color: 0x7a4a2c })), cx + w * 0.2, 3.0, -D / 2 + 1.8);
      for (const s of [-1, 1]) add(g, tbox(0.4, 3.0, 0.4, tmat('wood', { color: 0x7a4a2c })), cx + w * 0.2 + s * 3.2, 1.5, -D / 2 + 1.8);
      marks.table = V(cx + w * 0.2, 0.2, -D / 2 + 5); facing.table = Math.PI;
    }
    const wp = marks => Object.fromEntries(Object.entries(marks).map(([k, p]) => [k, W3(p.x, p.y, p.z)]));
    room.marks = wp(marks); room.facing = facing; room.lamp = lamp;
    const look = W3(cx, 4.2, -2);   // PIPELINE §3: wide >= 25 at fov 38, close >= 15 at fov 34 (camera outside the open front)
    room.cams = { wide: [W3(cx + 3, 9, D / 2 + 22), look, 38], close: [W3(cx + 2, 6.5, D / 2 + 8), W3(cx, 4.2, -4), 34] };
    for (const [k, p] of Object.entries(room.marks)) index[r.name + '.' + k] = [+p.x.toFixed(1), +p.y.toFixed(2), +p.z.toFixed(1)];
    rooms[r.name] = room; x0 += w;
  });
  return { group: g, rooms, index, setLit(on) { for (const l of lamps) l.intensity = on ? 30 : 0; for (const s of lit) s.material.emissiveIntensity = on ? 1.5 : 0.1; } };
}
