// Sets: reusable locations. Each builder places its set at an origin and returns handles (marks, lights).
// Put sets far apart (e.g. x = 0, -200, +200) so each shot only sees its own set.
import { THREE, scene, std, rbox, box, canvasTex, emissive, V, rng } from './core.js';
import { loadProp } from './models.js';
import { tmat, tplane } from './textures.js';
import { makeHouse, makeCar } from './buildings.js';

/** add mesh m to parent at (x, y, z) and return the mesh */
export function at(parent, m, x = 0, y = 0, z = 0) { m.position.set(x, y, z); parent.add(m); return m; }

/**
 * Suburban street at night: road along -Z, houses both sides, 12 streetlights, woods at the far end.
 * Returns { porches: [{side, z, door: Vector3 (spot in front of the door), facing}], lamps: [PointLight], woodsZ }.
 */
export function buildStreet(origin = V(0, 0, 0), o = {}) {
  const g = new THREE.Group(); g.position.copy(origin); scene.add(g);
  const add = m => { g.add(m); return m; };
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std(o.grass ?? 0x243d24))); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  const road = add(new THREE.Mesh(new THREE.PlaneGeometry(9, 260), std(0x2a2c31, { roughness: 0.95 }))); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.05, -60); road.receiveShadow = true; road.material.polygonOffset = true; road.material.polygonOffsetFactor = -1;
  for (const sx of [-1, 1]) add(box(2.6, 0.25, 260, std(0x6d6f75))).position.set(sx * 5.8, 0.12, -60);
  for (let z = 40; z > -180; z -= 6) { const d = add(box(0.3, 0.03, 2.6, std(0xd8c66a, { roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }))); d.position.set(0, 0.08, z); d.castShadow = false; }

  const houseCols = o.houseCols || [0xc98a6a, 0x8ea7c2, 0xd9cf9e, 0x9cb48a, 0xb48aa3, 0xc2b2a0];
  const porches = [], windows = [];
  const winMat = emissive(0xffc56a, 1.6, 0x221a10), darkWin = emissive(0x1a2440, 0.4, 0x0b0f1a);
  const makeHouse = (side, z, ci) => {
    const h = new THREE.Group(); g.add(h);
    const bodyH = 7, bodyD = 9, frontX = -side * bodyD / 2;
    at(h, box(bodyD, bodyH, 11, std(houseCols[ci % houseCols.length])), 0, bodyH / 2, 0);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 7.6, 4.2, 4, 1), std(0x4a2e2a)); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 1.25); roof.position.y = bodyH + 2.1; roof.castShadow = true; h.add(roof);
    for (const [wz, wy, lit] of [[-3.2, 4.6, (ci % 3) !== 1], [3.2, 4.6, true], [3.2, 1.9, ci % 2 === 0]]) {
      const w = box(0.1, 1.8, 2.0, lit ? winMat : darkWin); w.castShadow = false; w.position.set(frontX - side * 0.06, wy, wz); h.add(w); windows.push(w);
      at(h, box(0.14, 0.16, 2.3, std(0xeeeeee)), frontX - side * 0.08, wy - 0.98, wz);
    }
    at(h, box(0.15, 3.0, 1.7, std(0x5b3524)), frontX - side * 0.08, 1.5, 0);
    at(h, box(2.2, 0.3, 3.6, std(0x8a8a8a)), frontX - side * 1.1, 0.15, 0);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.3), emissive(0xffd28a, 3, 0xffe0a0)); lamp.position.set(frontX - side * 0.25, 3.5, 1.25); h.add(lamp);
    const pl = new THREE.PointLight(0xffc78a, 14, 9, 2); pl.position.set(frontX - side * 1.0, 3.6, 1.0); h.add(pl);
    h.position.set(side * 18.5, 0, z);
    const bush = rbox(2.4, 1.6, 2.4, std(0x1f4a24), 0.6); bush.position.set(side * 13.2, 0.8, z + 4.2); g.add(bush);
    // door mark: where a character stands on the step, facing the road
    porches.push({ side, z, door: origin.clone().add(V(side * (18.5 - 5.4), 0.3, z - 0.9)), facing: side > 0 ? -Math.PI / 2 : Math.PI / 2, porchLight: pl, house: h });
  };
  let hi = 0;
  for (let z = 0; z >= -80; z -= 16) { makeHouse(1, z, hi++); makeHouse(-1, z - 8, hi++); }

  const lamps = [];
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) {
    const z = 4 - i * 16 - (sx > 0 ? 8 : 0);
    at(g, box(0.3, 8, 0.3, std(0x2c3036, { metalness: 0.4, roughness: 0.5 })), sx * 5.6, 4, z);
    at(g, box(1.6, 0.22, 0.22, std(0x2c3036)), sx * 5.0, 7.9, z);
    const headMat = emissive(0xffcf86, 4, 0xffe2a8);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.6), headMat); head.position.set(sx * 4.3, 7.72, z); g.add(head);
    const pl = new THREE.PointLight(0xffbf78, 60, 20, 1.8); pl.position.set(sx * 4.3, 7.3, z); g.add(pl);
    // lamp.setOn(false) turns one streetlight dark (countdown device)
    lamps.push({ light: pl, head, z, side: sx, setOn(on) { pl.intensity = on ? 60 : 0; headMat.emissiveIntensity = on ? 4 : 0; headMat.color.set(on ? 0xffe2a8 : 0x222222); } });
  }

  const r = rng(3), trunk = std(0x3b2a1e), leafA = std(0x17351d), leafB = std(0x1d4024);
  for (let i = 0; i < 140; i++) {
    const x = (r() - 0.5) * 90, z = -100 - r() * 60;
    if (Math.abs(x) < 3.2 && z > -112) continue;   // a clear path where something can walk out
    const h = 6 + r() * 6, lw = 3 + r() * 2.2;
    at(g, box(0.8, h, 0.8, trunk), x, h / 2, z);
    at(g, rbox(lw, 2.4, lw, r() > 0.5 ? leafA : leafB, 0.4), x, h, z);
    at(g, rbox(lw * 0.68, 2.0, lw * 0.68, leafB, 0.35), x, h + 1.9, z);
  }
  for (let i = 0; i < 30; i++) {
    const sx = r() > 0.5 ? 1 : -1, x = sx * (27 + r() * 14), z = 10 - r() * 110, h = 6 + r() * 4;
    at(g, box(0.8, h, 0.8, trunk), x, h / 2, z);
    at(g, rbox(3.6, 2.6, 3.6, leafA, 0.4), x, h, z);
  }
  return { group: g, porches, lamps, windows, woodsZ: -100 };
}

/**
 * Bedroom / hallway interior (open front, toward +Z) with a night window in the back wall and a door on the right wall.
 * Returns { center, doorMark (stand here to reach the door), windowCenter, lamp }.
 */
export function buildRoom(origin = V(-200, 0, 0), o = {}) {
  const g = new THREE.Group(); g.position.copy(origin); scene.add(g);
  at(g, box(14, 0.3, 14, std(o.floor ?? 0x7a5236, { roughness: 0.7 })), 0, -0.15, 0);
  const wallMat = std(o.wall ?? 0xd8cdb4);
  at(g, box(14, 10, 0.4, wallMat), 0, 5, -5.2);
  at(g, box(0.4, 10, 14, wallMat), -6, 5, 0);
  at(g, box(0.4, 10, 14, wallMat), 6, 5, 0);
  at(g, box(14, 0.4, 14, wallMat), 0, 10, 0);
  const night = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.2), new THREE.MeshBasicMaterial({ color: o.windowColor ?? 0x1a2c58 }));
  night.position.set(1.6, 5.4, -4.98); g.add(night);
  const fr = std(0xf4f1ea);
  for (const [w, h, x, y] of [[3.9, 0.25, 1.6, 7.05], [3.9, 0.25, 1.6, 3.75], [0.25, 3.5, -0.2, 5.4], [0.25, 3.5, 3.4, 5.4], [0.16, 3.2, 1.6, 5.4], [3.6, 0.16, 1.6, 5.4]]) at(g, box(w, h, 0.3, fr), x, y, -4.85);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.35, 24), new THREE.MeshBasicMaterial({ color: 0xeef2ff })); moon.position.set(2.5, 6.4, -4.97); g.add(moon);
  at(g, box(0.2, 6.2, 3.0, std(0x6b3f27)), 5.78, 3.1, 0.5);
  for (const y of [4.5, 1.8]) at(g, box(0.08, 1.8, 2.2, std(0x5a331f)), 5.65, y, 0.5);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), std(0xd9b24a, { metalness: 0.8, roughness: 0.3 })); knob.position.set(5.6, 3.0, -0.6); g.add(knob);
  at(g, box(0.08, 0.08, 0.9, std(0xb8b8b8, { metalness: 0.8, roughness: 0.3 })), 5.62, 4.4, -0.4);
  const lamp = new THREE.PointLight(0xffb070, 30, 22, 1.6); lamp.position.set(-3.8, 5.6, 1.5); g.add(lamp);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 0.9, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb36a, emissiveIntensity: 1.5, side: THREE.DoubleSide }));
  shade.position.set(-3.8, 4.7, -3.6); g.add(shade);
  at(g, box(0.15, 4.2, 0.15, std(0x333333)), -3.8, 2.1, -3.6);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3, 32), std(0x8c2f3a)); rug.rotation.x = -Math.PI / 2; rug.position.y = 0.06; rug.material.polygonOffset = true; rug.material.polygonOffsetFactor = -2; rug.receiveShadow = true; g.add(rug);
  const blue = new THREE.PointLight(0x5c7cff, 10, 14, 1.5); blue.position.set(1.6, 5.4, -3.5); g.add(blue);
  return { group: g, center: origin.clone(), doorMark: origin.clone().add(V(2.9, 0, 0.4)), windowCenter: origin.clone().add(V(1.6, 5.4, -5)), lamp };
}

/** Wall clock insert on a brick wall. Returns { center (clock face), set(h, m) }. */
export function buildClock(origin = V(200, 0, 0)) {
  const g = new THREE.Group(); g.position.copy(origin); scene.add(g);
  const brick = canvasTex(256, (c, w, h) => {
    c.fillStyle = '#6b2f2a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a1a18'; c.lineWidth = 4;
    for (let r = 0; r < 8; r++) { c.beginPath(); c.moveTo(0, r * 32); c.lineTo(w, r * 32); c.stroke(); for (let k = 0; k < 5; k++) { const x = (k * 64 + (r % 2) * 32) % w; c.beginPath(); c.moveTo(x, r * 32); c.lineTo(x, r * 32 + 32); c.stroke(); } }
  });
  brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(4, 4);
  at(g, box(16, 16, 1, std(0xffffff, { map: brick })), 0, 8, -0.6);
  const faceTex = canvasTex(512, c => {
    c.fillStyle = '#f4ecd6'; c.beginPath(); c.arc(256, 256, 250, 0, 7); c.fill();
    c.fillStyle = '#1c1c1c'; c.font = 'bold 64px Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(String(i), 256 + Math.sin(a) * 190, 256 - Math.cos(a) * 190); }
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 232 : 222; c.lineWidth = i % 5 ? 3 : 7; c.strokeStyle = '#1c1c1c'; c.beginPath(); c.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); c.lineTo(256 + Math.sin(a) * 244, 256 - Math.cos(a) * 244); c.stroke(); }
  });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.5, 64), std(0x1e1e22, { metalness: 0.6, roughness: 0.4 })); rim.rotation.x = Math.PI / 2; rim.position.set(0, 8, 0); g.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(3.05, 64), new THREE.MeshStandardMaterial({ map: faceTex, emissive: 0xfff2d0, emissiveMap: faceTex, emissiveIntensity: 0.35 })); face.position.set(0, 8, 0.26); g.add(face);
  const handMat = std(0x111111, { roughness: 0.4 });
  const hourP = new THREE.Group(); hourP.position.set(0, 8, 0.32); g.add(hourP); at(hourP, box(0.22, 1.7, 0.08, handMat), 0, 0.75, 0);
  const minP = new THREE.Group(); minP.position.set(0, 8, 0.4); g.add(minP); at(minP, box(0.14, 2.5, 0.08, handMat), 0, 1.1, 0);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 24), handMat); hub.rotation.x = Math.PI / 2; hub.position.set(0, 8, 0.46); g.add(hub);
  const cl = new THREE.PointLight(0xffd59a, 30, 14, 1.6); cl.position.set(0, 12, 4); g.add(cl);
  return { group: g, center: origin.clone().add(V(0, 8, 0)), hourP, minP,
    set(h, m) { minP.rotation.z = -m / 60 * Math.PI * 2; hourP.rotation.z = -((h % 12) + m / 60) / 12 * Math.PI * 2; } };
}

/**
 * Roblox-scale suburb street built from the textured house GLBs (models/props) + road tiles + streetlights + trees + parked cars.
 * Use this instead of buildStreet / hand-made box houses (Aris, 2026-11-09). 1 stud = 1 unit, so the cast stands at true Roblox scale.
 * Road runs along Z through the origin, 40 wide (asphalt + sidewalks, top at y 0.05). Houses face the road on both sides.
 * opts: houses (slugs, left side first then right; default all four), perSide (2), cars (3), carColors, day (true: porch lights off),
 *       grass colour. Lots are 65-100 studs long, so 2 per side = ~190 studs of street; the ground stays under 290 (Z-fight rule).
 * Returns { group, houses: [{slug, group, side, z, front (Vector3 on the sidewalk in front of the lot), facing}], cars, lamps, roadY, curbX }.
 */
export async function buildPropStreet(origin = V(0, 0, 0), o = {}) {
  const g = new THREE.Group(); g.position.copy(origin); scene.add(g); g.updateMatrixWorld(true);
  const per = o.perSide ?? 2;
  const slugs = o.houses ?? ['house_brick', 'house_purple', 'house_grey', 'house_green'];
  const ROAD = 20.1, GAP = 0.6;
  // place houses: rotate so the front faces the road, then slide each lot so its inner edge meets the sidewalk
  const houses = []; const zEnd = { '-1': 0, '1': 0 }; let len = 0;
  for (let i = 0; i < per * 2; i++) {
    const side = i < per ? -1 : 1, slug = slugs[i % slugs.length];
    const h = await loadProp(slug, { parent: g });
    const front = h.userData.prop.front || '-z';             // which local side faces the street (see props.json)
    const faceX = -side;                                      // world direction toward the road
    h.rotation.y = front === '+z' ? faceX * Math.PI / 2 : -faceX * Math.PI / 2;
    h.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(h); const gw = g.matrixWorld.clone().invert(); b.applyMatrix4(gw);
    const lotLen = b.max.z - b.min.z, z0 = zEnd[side];
    h.position.z += z0 - b.max.z;                             // stack lots from z 0 toward -z
    h.position.x += side < 0 ? (-ROAD - GAP) - b.max.x : (ROAD + GAP) - b.min.x;
    zEnd[side] = z0 - lotLen - 2; len = Math.max(len, -zEnd[side]);
    const cz = z0 - lotLen / 2;
    houses.push({ slug, group: h, side, z: cz, front: origin.clone().add(V(side * (ROAD - 3), 0.05, cz)), facing: side < 0 ? Math.PI / 2 : -Math.PI / 2 });
  }
  // road tiles every 50 along z, sunk so the slab top sits at y 0.05
  const tiles = Math.ceil((len + 40) / 50);
  for (let k = 0; k < tiles; k++) await loadProp('road_straight', { parent: g, x: 0, y: -5.05, z: 25 - k * 50 });
  // ground under everything, a hair below the lots' own lawns
  const groundLen = Math.min(280, tiles * 50 + 20), ground = tplane(280, groundLen, tmat('grass', o.grass != null ? { color: o.grass } : {}));
  ground.position.set(0, -0.06, 25 - tiles * 25); g.add(ground);
  // streetlights on both sidewalks, trees between lots
  const lamps = [];
  for (let z = 0; z > -len; z -= 60) for (const sx of [-1, 1]) {
    const l = await loadProp('streetlight', { parent: g, x: sx * (ROAD - 2), y: 0.05, z: z - (sx > 0 ? 30 : 0), rotY: sx > 0 ? Math.PI : 0 });
    const pl = new THREE.PointLight(0xffc98a, o.day === false ? 160 : 0, 50, 1.6); pl.position.set(sx * (ROAD - 6), 20, z - (sx > 0 ? 30 : 0)); g.add(pl);
    lamps.push({ prop: l, light: pl, setOn(on) { pl.intensity = on ? 160 : 0; } });
  }
  // parked cars along the curbs, nose toward -z on the right, +z on the left (drive on the right)
  const cars = [], cols = o.carColors ?? [0xc8352f, 0x2d5bd0, 0xeeeeee, 0x2f8a4a, 0x222428];
  for (let i = 0; i < (o.cars ?? 3); i++) {
    const side = i % 2 ? 1 : -1, c = makeCar({ color: cols[i % cols.length] });
    c.position.set(side * 10.5, 0.05, -18 - i * 34); c.rotation.y = side > 0 ? Math.PI : 0; g.add(c); cars.push(c);
  }
  return { group: g, houses, cars, lamps, roadY: 0.05, curbX: ROAD - 4.5, length: len };
}
