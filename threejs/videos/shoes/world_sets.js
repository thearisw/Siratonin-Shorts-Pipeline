// Shoes: sets (sets agent). Every set at its own origin, 300+ apart. All exteriors are snow.
//
// SHAPES
//   Origins:  STREET, PORCH, HOME, BEDS, NURSERY, WOODS, CLOCK (Vector3, world).
//   Marks:    <set>.marks.<name>  = world Vector3 (stand spot; y = the surface).  <set>.facing.<name> = rotY for a character there
//             (characters are built facing +Z; rotY 0 = facing +Z). Use yawTo(a, b) to face any point.
//   Cams:     <SET>_CAMS.<name> = [pos, look, fov]  (world space, PIPELINE §3 distances).  aim(...cam) or aim(cam[0], cam[1], cam[2], 0, fill).
//   Looks:    look_<set>(name = default) -> setLook + focus (+ lamps, snowfall). Indoor sets cut sky fill 0.5x and key 0.35x; room lamps light them.
//             Exterior looks turn snowfall on for night/bloodmoon, off for sunset/fog/day (shots may override with snowfall.setOn).
//   Props:    board.setCount(n); clock.set(h, m); snowfall.setOn(bool) + snowfall.update(t) (call every frame with the video time);
//             porch.door.setOpen(k) (0 shut .. 1 open inward); nursery.closet.setOpen(k) (both doors swing out);
//             shoes: sneakers (Max), slippers (Ruiz), boots (Hale), babyShoes (Lily), leoBoots (Leo)  -> kit/footwear.js API
//               porch steps match stepUp() defaults: shoes.place(porch.marks.steps, porch.facing.steps); shoes.stepUp(lt, speed)
//             trails: printsRuiz, printsHale (street -> near woods), printsLily (big, nursery window -> trees), printsLeo (porch steps -> gate -> trees),
//               printsWoods (woods set trail) -> .reveal(k) / .show() / .hide();  shovel (Hale's, standing in snow) .show()/.hide()
//   resetProps(): hides every shoe pair, trail and the shovel, shuts the porch door and closet (call in before(t)).
import { THREE, V, std, rbox, canvasTex, emissive, orbit, scene } from '../../kit/core.js';
import { setLook, focus, hemi, key } from '../../kit/look.js';
import { buildPropStreet, buildClock, at } from '../../kit/sets.js';
import { makeHouse, makeCar } from '../../kit/buildings.js';
import { loadProp } from '../../kit/models.js';
import { tmat, tbox, tplane } from '../../kit/textures.js';
import { makeShoes, makeFootprints } from '../../kit/footwear.js';

export const STREET = V(0, 0, 0), PORCH = V(300, 0, 0), HOME = V(-300, 0, 0), BEDS = V(-600, 0, 0),
  NURSERY = V(600, 0, 0), WOODS = V(0, 0, 320), CLOCK = V(0, 0, -600);

export const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const W = o => (x, y, z) => o.clone().add(V(x, y, z));             // set-local -> world
const C = (look, dist, yaw, pitch, fov) => [orbit(look, dist, yaw, pitch), look, fov];
const P = (pos, look, fov) => [pos, look, fov];
const group = o => { const g = new THREE.Group(); g.position.copy(o); scene.add(g); return g; };

// ---------- shared materials ----------
const snowTex = canvasTex(128, (c, w, h) => {
  c.fillStyle = '#f4f6fa'; c.fillRect(0, 0, w, h);
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) { const v = 222 + Math.floor(r() * 33); c.fillStyle = `rgb(${v},${v + 2},${Math.min(255, v + 6)})`; c.fillRect(r() * w, r() * h, 2, 2); }
});
snowTex.wrapS = snowTex.wrapT = THREE.RepeatWrapping;
const SNOW = std(0xdfe7ef, { roughness: 1, map: snowTex }); SNOW.userData.tile = 16;
const SNOWCAP = std(0xdfe7ef, { roughness: 1 });
const paint = c => tmat('plastic', { color: c, roughness: 1 });
const WOOD = tmat('woodplanks'), WOODD = tmat('woodplanks', { color: 0x6b4a32 });

/** snow cap on top of a surface at yTop (lifted 0.02) */
const cap = (p, w, d, x, yTop, z, t = 0.14) => at(p, rbox(w, t, d, SNOWCAP, Math.min(0.06, t / 2)), x, yTop + 0.02 + t / 2, z);
const ground = (p, w, d, x, y, z) => at(p, tplane(w, d, SNOW), x, y, z);

/** snow on a makeHouse roof (both slopes) */
function snowRoof(h) {
  const { w, d, h: tot } = h.userData.size, rh = d * 0.38, H = tot - 1 - rh, over = 1.4, half = d / 2 + over;
  const slope = Math.hypot(half, rh), ang = Math.atan2(rh, half), off = 0.37 + 0.17;
  for (const s of [-1, 1]) {
    const m = rbox(w + 2 * over - 0.3, 0.34, slope - 0.2, SNOWCAP, 0.15); m.rotation.x = s * ang;
    m.position.set(0, 1 + H + rh / 2 + 0.3 + Math.cos(ang) * off, s * half / 2 + s * Math.sin(ang) * off); h.add(m);
  }
}
/** snow caps on a makeCar car (roof, hood, trunk) */
function snowCar(c) {
  cap(c, 6.0, 6.4, 0, 5.5, -0.6, 0.38); cap(c, 6.5, 3.4, 0, 3.3, 5.0, 0.26); cap(c, 6.5, 2.4, 0, 3.3, -5.6, 0.26);
}
/** GLB houses: turn roofs (upward-facing, upper half) and lawns (flat, low, green) into snow. Heuristic per mesh. */
function snowify(root) {
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root), H = bb.max.y - bb.min.y, nm = new THREE.Matrix3(), v = new THREE.Vector3();
  root.traverse(m => {
    if (!m.isMesh || Array.isArray(m.material) || !m.material.color || m.material.transparent) return;
    const n = m.geometry.attributes.normal; if (!n) return;
    m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
    nm.getNormalMatrix(m.matrixWorld); let sy = 0, cnt = 0; const step = Math.max(1, Math.floor(n.count / 400));
    for (let i = 0; i < n.count; i += step) { v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); sy += v.y; cnt++; }
    const up = sy / cnt, col = m.material.color, cy = (b.min.y + b.max.y) / 2 - bb.min.y;
    const green = col.g > col.r * 1.08 && col.g > col.b * 1.02;
    const lawn = up > 0.8 && b.max.y - b.min.y < 1.5 && b.min.y < bb.min.y + 1.5 && green;
    const roof = up > 0.45 && cy > H * 0.5;
    if (lawn || roof) m.material = SNOWCAP;
  });
}

/** Instanced snowy pines (rounded tiers + snow tips). list: [{x, z, h, y?}] in parent space. */
function pines(parent, list) {
  const parts = [[new THREE.CylinderGeometry(0.06, 0.08, 0.24, 6).translate(0, 0.12, 0), std(0x4a3222)]];
  const green = std(0x1d4a32, { roughness: 1 });
  for (const [r, h, y] of [[0.34, 0.4, 0.38], [0.27, 0.34, 0.6], [0.19, 0.3, 0.82]]) {
    parts.push([new THREE.ConeGeometry(r, h, 8).translate(0, y, 0), green]);
    parts.push([new THREE.ConeGeometry(r * 0.72, h * 0.5, 8).translate(0, y + h / 2 - h * 0.25 + 0.012, 0), SNOWCAP]);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0);
  for (const [geo, mat] of parts) {
    const im = new THREE.InstancedMesh(geo, mat, list.length); im.castShadow = true; im.receiveShadow = true;
    list.forEach((p, i) => { q.setFromAxisAngle(up, (p.x * 7.3 + p.z * 3.1) % 6.28); m4.compose(V(p.x, p.y ?? 0, p.z), q, V(p.h, p.h, p.h)); im.setMatrixAt(i, m4); });
    parent.add(im);
  }
}
const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42);

/** axis-aligned wall slab(s) centred on a line, with rectangular holes. axis 'x' = runs along x at z = c; 'z' = runs along z at x = c. holes [{a, b, y0, y1}] along the run. */
function wall(p, axis, c, u0, u1, h, mat, holes = [], T = 0.6) {
  const seg = (a, b, y0, y1) => {
    if (b - a < 0.01 || y1 - y0 < 0.01) return;
    const m = tbox(axis === 'x' ? b - a : T, y1 - y0, axis === 'x' ? T : b - a, mat);
    at(p, m, axis === 'x' ? (a + b) / 2 : c, (y0 + y1) / 2, axis === 'x' ? c : (a + b) / 2);
  };
  let u = u0;
  for (const o of [...holes].sort((A, B) => A.a - B.a)) { seg(u, o.a, 0, h); seg(o.a, o.b, 0, o.y0); seg(o.a, o.b, o.y1, h); u = o.b; }
  seg(u, u1, 0, h);
}
/** glass + trim for a window hole on a wall (axis/c as wall()). */
function windowIn(p, axis, c, a, b, y0, y1) {
  const trim = tmat('plastic', { color: 0xe8e4dc, roughness: 1 }), u = (a + b) / 2, w = b - a, h = y1 - y0;
  const put = (m, du, y, dn = 0) => at(p, m, axis === 'x' ? u + du : c + dn, y, axis === 'x' ? c + dn : u + du);
  const bx = (lw, lh, ln) => axis === 'x' ? tbox(lw, lh, ln, trim) : tbox(ln, lh, lw, trim);
  const glass = axis === 'x' ? tbox(w, h, 0.1, tmat('glass')) : tbox(0.1, h, w, tmat('glass')); put(glass, 0, (y0 + y1) / 2);
  put(bx(w + 0.8, 0.4, 0.9), 0, y1 + 0.2); put(bx(w + 1.2, 0.35, 1.3), 0, y0 - 0.18);
  for (const s of [-1, 1]) put(bx(0.4, h, 0.9), s * (w / 2 + 0.2), (y0 + y1) / 2);
  put(bx(0.18, h, 0.3), 0, (y0 + y1) / 2); put(bx(w, 0.18, 0.3), 0, (y0 + y1) / 2);
}
const lamp = (p, color, I, dist, x, y, z) => at(p, new THREE.PointLight(color, I, dist, 1.6), x, y, z);

// ---------- snowfall (GPU: flakes wrap around the camera, world-stable, deterministic in t) ----------
export const snowfall = (() => {
  const N = 3500, B = 70, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = rnd() * B; pos[i * 3 + 1] = rnd() * B; pos[i * 3 + 2] = rnd() * B; seed[i] = rnd(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const uni = { uTime: { value: 0 }, uBox: { value: B }, uSize: { value: 0.075 }, uColor: { value: new THREE.Color(0xe4ecf6) } };
  const mat = new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime, uBox, uSize; attribute float aSeed; varying float vA;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.6 + aSeed * 31.0) * 0.8, -uTime * (1.6 + aSeed * 1.4), cos(uTime * 0.5 + aSeed * 17.0) * 0.6);
        vec3 rel = mod(p - cameraPosition + 0.5 * uBox, uBox) - 0.5 * uBox; vec3 wp = cameraPosition + rel;
        float d = length(rel); vA = smoothstep(0.5 * uBox, 0.35 * uBox, d) * smoothstep(0.8, 2.2, d) * step(0.0, wp.y);
        vec4 mv = viewMatrix * vec4(wp, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * 3000.0 / max(0.5, -mv.z), 1.0, 16.0);
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main() { float a = smoothstep(0.5, 0.15, length(gl_PointCoord - 0.5)) * vA * 0.85; if (a < 0.01) discard; gl_FragColor = vec4(uColor, a); }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; pts.visible = false; scene.add(pts);
  return { points: pts, setOn(on) { pts.visible = !!on; }, update(t) { uni.uTime.value = t; } };
})();

// =====================================================================================================
// MAIN STREET (STREET): buildPropStreet, 3 houses a side, snow, chapel + population board at the far end (-z), woods at the near end (+z)
// Houses: [0] Ruiz (left, brick), [2] Hale (left, grey with porch), [3] Lily (right, green).
// =====================================================================================================
const st = await buildPropStreet(STREET, { perSide: 3, day: false, cars: 3 });
{
  const g = st.group, w = W(STREET);
  g.traverse(m => { if (m.isMesh && m.geometry.type === 'PlaneGeometry' && m.geometry.parameters.width === 280) m.visible = false; });   // kit grass
  ground(g, 290, 290, 0, -0.06, -87);                      // z +58 .. -232
  at(g, tplane(31, 290, SNOW), 0, 0.09, -100);             // snow over the asphalt (curb to curb), z +45 .. -245
  for (const h of st.houses) snowify(h.group);
  for (const c of st.cars) snowCar(c);
  // porch lanterns at each lot front
  for (const h of st.houses) {
    const lx = h.side * 22.5, lz = h.z + 6;
    at(g, rbox(0.3, 4.2, 0.3, std(0x222428)), lx, 2.1, lz);
    at(g, rbox(0.8, 1.0, 0.8, emissive(0xffd28a, 2.2, 0x333333)), lx, 4.6, lz);
    cap(g, 0.9, 0.9, lx, 5.1, lz, 0.12);
  }
  // woods: tree props across the near end, pines behind them and behind the lots
  for (let x = -126; x <= 126; x += 14) await loadProp('tree', { parent: g, x: x + (rnd() - 0.5) * 5, z: 47 + rnd() * 3, rotY: rnd() * 6, scale: 0.75 + rnd() * 0.3 });
  const pl = [];
  for (let x = -140; x <= 140; x += 6) for (const z of [52, 57]) pl.push({ x: x + (rnd() - 0.5) * 3, z: z + rnd() * 2, h: 18 + rnd() * 12 });
  for (const s of [-1, 1]) for (let z = 40; z > -230; z -= 9) pl.push({ x: s * (132 + rnd() * 10), z: z + rnd() * 4, h: 20 + rnd() * 14 });
  pines(g, pl);
  // chapel at the far end, facing the street (+z)
  const ch = makeHouse({ w: 22, d: 18, floors: 1, floorH: 14, wall: 'siding', color: 0xe2dccf, roofColor: 0x3a3f4a, door: 0x5a2a1a, chimney: false, doorX: 0 });
  ch.position.set(0, 0, -224); g.add(ch); snowRoof(ch); ch.userData.setLit(true);
  const sid = tmat('siding', { color: 0xe2dccf }), roofM = tmat('shingles', { color: 0x3a3f4a });
  at(g, tbox(6, 14, 6, sid), 0, 22, -219);
  cap(g, 6.4, 6.4, 0, 29, -219, 0.2);
  const spire = at(g, new THREE.Mesh(new THREE.ConeGeometry(4.3, 11, 4), roofM), 0, 34.7, -219); spire.rotation.y = Math.PI / 4; spire.castShadow = true;
  const cross = std(0xd8c27a, { roughness: 0.6 });
  at(g, rbox(0.5, 4, 0.5, cross), 0, 42.2, -219); at(g, rbox(2.6, 0.5, 0.5, cross), 0, 43.0, -219);
  at(g, rbox(1.6, 2.2, 0.3, emissive(0xffd9a0, 1.2, 0x332211)), 0, 23, -215.9);          // steeple window
}
// population board in front of the chapel
export const board = (() => {
  const g = st.group, z = -207;
  const tex = canvasTex(320, () => {}, 512);
  for (const x of [-3, 3]) at(g, tbox(0.5, 6.6, 0.5, WOODD), x, 3.3, z);
  at(g, tbox(6.4, 3.9, 0.35, WOODD), 0, 4.6, z);
  const face = at(g, new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3.4),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1, color: 0xd0d0d0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 })), 0, 4.6, z + 0.19);
  at(g, tbox(7.2, 0.3, 1.3, WOODD), 0, 6.75, z); cap(g, 7.0, 1.2, 0, 6.9, z, 0.18);
  let last = null;
  const api = {
    face, center: W(STREET)(0, 4.6, z + 0.2),
    setCount(n) {
      if (n === last) return; last = n;
      const c = tex.image.getContext('2d'), w = 512, h = 320;
      c.fillStyle = '#1f3b2c'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8e0c8'; c.lineWidth = 8; c.strokeRect(12, 12, w - 24, h - 24);
      c.fillStyle = '#efe8d4'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 54px Inter, Arial, sans-serif'; c.fillText('POPULATION', w / 2, 82);
      c.font = 'bold 150px Inter, Arial, sans-serif'; c.fillText(String(n), w / 2, 210);
      tex.needsUpdate = true;
    },
  };
  api.setCount(140);
  return api;
})();
// Ortiz's cocoa stand (left sidewalk near the woods end)
{
  const g = st.group;
  at(g, tbox(2.4, 3.0, 4.2, WOOD), -15, 1.5, 12); cap(g, 2.2, 1.2, -15, 3.0, 13.4, 0.1);
  const pot = at(g, new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.9, 12), std(0x8a8f96, { roughness: 0.6 })), -15, 3.47, 11.2); pot.castShadow = true;
  for (let i = 0; i < 4; i++) at(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.42, 10), std(i % 2 ? 0xd94a3a : 0xf0ece4)), -15.2 + (i % 2) * 0.5, 3.23, 12.2 + Math.floor(i / 2) * 0.5);
  const sign = canvasTex(128, (c, w, h) => { c.fillStyle = '#7a2a20'; c.fillRect(0, 0, w, h); c.fillStyle = '#f6efe0'; c.textAlign = 'center'; c.font = 'bold 44px Arial'; c.fillText('HOT COCOA', w / 2, 52); c.font = 'bold 54px Arial'; c.fillText('$2', w / 2, 108); }, 256);
  const sg = at(g, new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshStandardMaterial({ map: sign, roughness: 1, color: 0xd0d0d0, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: 0.15 })), -13.74, 2.0, 12);
  sg.rotation.y = Math.PI / 2;
}
// Hale's shovel, stuck upright in the snow
export const shovel = (() => {
  const root = new THREE.Group(); st.group.add(root);
  at(root, new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 8), std(0x9a6a3a)), 0, 2.6, 0);
  at(root, rbox(0.8, 0.16, 0.16, std(0x222222)), 0, 4.7, 0);
  at(root, rbox(1.4, 1.5, 0.12, std(0x9a2a22), 0.05), 0, 0.45, 0);
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  root.position.set(-19.0, 0.0, -181.5); root.rotation.set(0, 0.5, 0.12); root.visible = false;
  return { root, show() { root.visible = true; }, hide() { root.visible = false; } };
})();

const RUIZ = st.houses[0], HALE = st.houses[2], LILY = st.houses[3];
const sw = W(STREET);
export const street = {
  group: st.group, houses: st.houses, lamps: st.lamps, cars: st.cars, chapel: sw(0, 0, -224),
  marks: {
    ruizPorch: RUIZ.front.clone(), halePorch: HALE.front.clone(), lilyPorch: LILY.front.clone(),
    chapelBoard: sw(0, 0.09, -200), crowdSpot: sw(0, 0.09, 22), cocoaStand: sw(-17.5, 0.05, 12),
    streetMid: sw(0, 0.09, -90), streetFar: sw(0, 0.09, -190),
  },
  facing: { ruizPorch: RUIZ.facing, halePorch: HALE.facing, lilyPorch: LILY.facing, chapelBoard: Math.PI, crowdSpot: 0, cocoaStand: Math.PI / 2, streetMid: Math.PI, streetFar: Math.PI },
};
const sm = street.marks, up = (m, y) => m.clone().add(V(0, y, 0));
export const STREET_CAMS = {
  wide: P(sw(6, 16, 34), sw(0, 6, -70), 40),
  high: P(sw(40, 70, 30), sw(0, 0, -60), 40),
  lowRoad: P(sw(3, 1.4, 4), sw(0, 3.5, -40), 38),
  board: P(sw(0, 5.0, -190.8), sw(0, 4.6, -206.8), 34),
  crowd: P(sw(5, 7.5, -8), sw(0, 3.5, 24), 40),
  ruizPorch: C(up(sm.ruizPorch, 3.6), 22, 78, 5, 36),
  halePorch: C(up(sm.halePorch, 3.6), 22, 78, 5, 36),
  lilyPorch: C(up(sm.lilyPorch, 3.6), 22, -70, 5, 36),
  // extras
  cocoa: C(up(sm.cocoaStand, 3.6), 16, 90, 6, 34),
  ruizPrints: P(sw(-4, 5.5, -48), sw(-15, 0.3, -30), 36),
  trailToWoods: P(sw(2, 7, -14), sw(-6, 2, 45), 38),
  chapel: P(sw(8, 9, -160), sw(0, 14, -224), 40),
};
export function look_street(name = 'night') {
  setLook(name);
  for (const l of st.lamps) l.setOn(name !== 'day');
  snowfall.setOn(name === 'night' || name === 'bloodmoon');
  focus(sw(0, 0, -40));
}

// =====================================================================================================
// OUR PORCH (PORCH): 2-floor wood-siding house facing +z, raised porch deck (top 3.0), 4 steps (rise 0.6, run 1.2), rail, porch roof,
// open-able front door with a lit hall behind it, snowy yard, stepping-stone path to a picket fence gate (z 34), woods beyond.
// =====================================================================================================
export const porch = await (async () => {
  const g = group(PORCH), w = W(PORCH);
  ground(g, 200, 200, 0, 0, 10);
  const house = makeHouse({ w: 30, d: 20, floors: 2, floorH: 10, wall: 'siding', color: 0x8fa3bd, roofColor: 0x4a3a34, door: 0x7a2e22 });
  house.position.set(0, 2.0, -14); g.add(house); snowRoof(house); house.userData.setLit(true);
  // swap the solid wall block + fixed door for slabs with a real doorway
  house.traverse(m => {
    const p = m.isMesh && m.geometry.parameters; if (!p) return;
    if ((p.width === 30 && p.height === 20 && p.depth === 20) || (p.width === 4 && p.height === 7.6 && p.depth === 0.3) || (p.width === 7 && p.height === 0.9 && p.depth === 3)) m.visible = false;
  });
  const sid = tmat('siding', { color: 0x8fa3bd }), inner = paint(0xc9b896);
  // wall() builds from y 0; move the slabs up 1 so the walls span house y 1..21 (holes in wall space: door y 0..7.6)
  const hw = (axis, c, u0, u1, mat, holes, T) => { const tmp = new THREE.Group(); wall(tmp, axis, c, u0, u1, 20, mat, holes, T); for (const m of [...tmp.children]) { m.position.y += 1; house.add(m); } };
  const dh = [{ a: -2, b: 2, y0: 0, y1: 7.6 }];
  hw('x', 9.75, -15, 15, sid, dh, 0.5); hw('x', 9.375, -14.5, 14.5, inner, dh, 0.25);
  hw('x', -9.75, -15, 15, sid, [], 0.5); hw('x', -9.375, -14.5, 14.5, inner, [], 0.25);
  for (const s of [-1, 1]) { hw('z', s * 14.75, -9.5, 9.5, sid, [], 0.5); hw('z', s * 14.375, -9.25, 9.25, inner, [], 0.25); }
  // hall inside: floor, a few stairs at the back left, lamp
  at(house, tplane(28.5, 18.5, WOOD), 0, 1.03, 0);
  for (let k = 1; k <= 8; k++) at(house, tbox(4, 1.2 * k, 1.3, WOODD), -11, 1 + 0.6 * k, 3 - k * 1.3);
  lamp(house, 0xffd6a0, 70, 30, 0, 8.5, 2);
  at(house, rbox(1.4, 0.4, 1.4, emissive(0xfff0d0, 1.5, 0x333333)), 0, 10.5, 2);
  // the front door (hinge on the left jamb, opens inward)
  const pivot = new THREE.Group(); pivot.position.set(-2, 1, 9.75); house.add(pivot);
  at(pivot, tbox(4, 7.6, 0.3, tmat('woodplanks', { color: 0x7a2e22 })), 2, 3.8, 0);
  at(pivot, new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), std(0xd8b44a)), 3.3, 3.6, 0.25);
  const door = { pivot, setOpen(k) { pivot.rotation.y = Math.max(0, Math.min(1, k)) * 1.6; } };
  // skirt under the raised house, deck, steps, rails, porch roof, mat
  at(g, tbox(30.8, 2.0, 20.8, tmat('concrete', { color: 0x9a948a })), 0, 1.0, -14);
  at(g, tbox(14, 3.0, 6.0, WOOD), 0, 1.5, -0.6); cap(g, 13.4, 5.6, 0, 3.0, -0.6, 0.08);
  for (let k = 1; k <= 4; k++) { const top = 0.6 * k, zc = 2.4 + (4 - k) * 1.2 + 0.6; at(g, tbox(6, top, 1.2, WOOD), 0, top / 2, zc); cap(g, 5.6, 1.0, 0, top, zc + 0.05, 0.08); }
  const post = (x, z, h = 3.0) => at(g, rbox(0.45, h, 0.45, tmat('plastic', { color: 0xe8e4dc, roughness: 1 }), 0.08), x, 3.0 + h / 2, z);
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), along = Math.abs(x1 - x0) > 0.01, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    at(g, tbox(along ? len : 0.3, 0.3, along ? 0.3 : len, tmat('plastic', { color: 0xe8e4dc, roughness: 1 })), cx, 5.85, cz);
    cap(g, along ? len : 0.42, along ? 0.42 : len, cx, 6.0, cz, 0.12);
    const n = Math.floor(len / 0.9);
    for (let i = 1; i < n; i++) { const k = i / n; at(g, tbox(0.18, 2.7, 0.18, tmat('plastic', { color: 0xe8e4dc, roughness: 1 })), x0 + (x1 - x0) * k, 4.35, z0 + (z1 - z0) * k); }
  };
  for (const [x, z] of [[-6.8, -3.4], [6.8, -3.4], [-6.8, 2.2], [6.8, 2.2], [-3.2, 2.2], [3.2, 2.2]]) post(x, z);
  rail(-6.8, -3.4, -6.8, 2.2); rail(6.8, -3.4, 6.8, 2.2); rail(-6.8, 2.2, -3.2, 2.2); rail(3.2, 2.2, 6.8, 2.2);
  for (const x of [-6.8, 6.8]) post(x, 2.2, 9.6);
  at(g, tbox(16, 0.4, 6.8, tmat('shingles', { color: 0x4a3a34 })), 0, 12.8, -0.8); cap(g, 15.6, 6.4, 0, 13.0, -0.8, 0.16);
  at(g, rbox(3.2, 0.05, 2.0, std(0x5a3a26, { roughness: 1 }), 0.02), 0, 3.145, -2.4);       // shoe mat (top 3.17)
  // yard: stepping stones, fence + gate, a snowed car, woods
  for (let z = 9.5; z < 32; z += 3) at(g, rbox(2.2, 0.12, 1.4, tmat('concrete', { color: 0x8a8f99 }), 0.05), -1.6, 0.08, z);
  const pick = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 3.6, 0.25), tmat('plastic', { color: 0xe4e0d8, roughness: 1 }), 200); let n = 0;
  const m4 = new THREE.Matrix4();
  for (let x = -60; x <= 60; x += 1.25) { if (Math.abs(x) < 3.4) continue; m4.makeTranslation(x, 1.8, 34); pick.setMatrixAt(n++, m4); }
  pick.count = n; pick.castShadow = pick.receiveShadow = true; g.add(pick);
  for (const s of [-1, 1]) {
    for (const y of [1.2, 2.8]) at(g, tbox(56.8, 0.3, 0.2, tmat('plastic', { color: 0xe4e0d8, roughness: 1 })), s * 31.8, y, 33.8);
    cap(g, 56.6, 0.4, s * 31.8, 2.95, 33.8, 0.1);
    at(g, rbox(0.6, 4.4, 0.6, tmat('plastic', { color: 0xe4e0d8, roughness: 1 }), 0.1), s * 3.4, 2.2, 34); cap(g, 0.7, 0.7, s * 3.4, 4.4, 34, 0.14);
    const leaf = new THREE.Group(); leaf.position.set(s * 3.1, 0, 34); leaf.rotation.y = s * 0.55; g.add(leaf);
    at(leaf, tbox(2.9, 3.0, 0.2, tmat('plastic', { color: 0xe4e0d8, roughness: 1 })), -s * 1.5, 1.8, 0);
  }
  const car = makeCar({ color: 0x2d5bd0 }); car.position.set(-24, 0, 6); car.rotation.y = 0.1; g.add(car); snowCar(car);
  for (let x = -84; x <= 84; x += 24) await loadProp('tree', { parent: g, x: x + (rnd() - 0.5) * 6, z: 54 + rnd() * 4, rotY: rnd() * 6, scale: 0.7 + rnd() * 0.3 });
  const pl = [];
  for (let x = -95; x <= 95; x += 6) for (let z = 50; z <= 100; z += 7) pl.push({ x: x + (rnd() - 0.5) * 4, z: z + rnd() * 4, h: 14 + rnd() * 14 });
  for (const s of [-1, 1]) for (let z = -60; z < 40; z += 10) pl.push({ x: s * (60 + rnd() * 30), z, h: 16 + rnd() * 12 });
  pines(g, pl);
  return {
    group: g, house, door, stairs: { rise: 0.6, run: 1.2, n: 5, d0: 0.6, lift: 0.1 },
    marks: { steps: w(0, 0, 7.8), topStep: w(0, 2.5, 3.0), mat: w(0, 3.17, -2.4), doorway: w(0, 3.03, -4.3), yard: w(6, 0, 18), gate: w(0, 0, 33), hall: w(0, 3.03, -10) },
    facing: { steps: Math.PI, topStep: Math.PI, mat: Math.PI, doorway: Math.PI, yard: Math.PI, gate: Math.PI, hall: 0 },
  };
})();
const pw = W(PORCH);
export const PORCH_CAMS = {
  steps: C(pw(0, 1.6, 5.2), 16, 25, 10, 34),
  stepsLow: P(pw(1.4, 0.45, 13.6), pw(0, 1.0, 6.2), 33),
  door: P(pw(0, 7.6, 15), pw(0, 6.2, -3.8), 36),
  doorInside: P(pw(0, 8.2, -20), pw(0, 5.0, 5), 36),
  yard: P(pw(13, 7, 30), pw(0, 4, 4), 38),
  wide: P(pw(-9, 13, 44), pw(0, 9, -6), 40),
};
export function look_porch(name = 'night') { setLook(name); snowfall.setOn(name === 'night' || name === 'bloodmoon'); focus(pw(0, 0, 4)); }

// =====================================================================================================
// HOME INSIDE (HOME): living room x -30..4 (ceiling 12) with armchair + fireplace + front window; two-storey hall x 4..26 (ceiling 22)
// with the front door (front wall z 16, x 12..16) and stairs along the right wall (bottom z +8, landing y 10 at the back).
// =====================================================================================================
export const home = (() => {
  const g = group(HOME), w = W(HOME);
  ground(g, 180, 150, -10, -0.05, 20);
  const liv = paint(0xb9a68a), hal = paint(0xa7b3a0);
  wall(g, 'x', -16, -30, 4, 12, liv); wall(g, 'x', -16, 4, 26, 22, hal);
  wall(g, 'x', 16, -30, 4, 12, liv, [{ a: -22, b: -12, y0: 3, y1: 9 }]); wall(g, 'x', 16, 4, 26, 22, hal, [{ a: 12, b: 16, y0: 0, y1: 7.6 }]);
  wall(g, 'z', -30, -16, 16, 12.05, liv); wall(g, 'z', 26, -16, 16, 22.05, hal);
  wall(g, 'z', 4, -16, 16, 22.05, hal, [{ a: -6, b: 6, y0: 0, y1: 9 }]);
  at(g, tbox(34.6, 0.4, 32.6, paint(0xd8d0c2)), -13, 12, 0); at(g, tbox(22.6, 0.4, 32.6, paint(0xd8d0c2)), 15, 22, 0);
  at(g, tplane(34, 32, WOOD), -13, 0.02, 0); at(g, tplane(22, 32, tmat('woodplanks', { color: 0x8a6a4a })), 15, 0.03, 0);
  at(g, tplane(14, 10, tmat('fabric', { color: 0x7a3a3a })), -15, 0.06, -3);                                  // rug
  windowIn(g, 'x', 16, -22, -12, 3, 9);
  for (const x of [-23.2, -10.8]) at(g, rbox(1.4, 8, 0.4, tmat('fabric', { color: 0x5a6a8a }), 0.15), x, 5.6, 15.4);   // curtains
  // fireplace on the back wall
  const brick = tmat('brick', { color: 0x9a4a36 });
  at(g, tbox(2.3, 7.5, 1.6, brick), -17.35, 3.75, -15); at(g, tbox(2.3, 7.5, 1.6, brick), -10.65, 3.75, -15);
  at(g, tbox(4.4, 3.9, 1.6, brick), -14, 5.55, -15); at(g, tbox(4.4, 3.6, 0.2, std(0x110b08)), -14, 1.9, -15.6);
  at(g, tbox(10, 0.3, 2.6, tmat('concrete', { color: 0x6a6460 })), -14, 0.15, -14.2);
  at(g, tbox(10, 0.5, 2.2, WOODD), -14, 7.75, -14.6); at(g, tbox(6, 4.5, 1.2, brick), -14, 10.1, -15.2);
  for (const [x, r] of [[-14.6, 0.3], [-13.4, -0.3]]) { const l = at(g, rbox(2.2, 0.45, 0.45, std(0x4a2a18), 0.15), x, 0.55, -15); l.rotation.y = r; }
  for (const [x, h] of [[-14.5, 1.5], [-13.6, 1.2], [-14.1, 1.8]]) at(g, new THREE.Mesh(new THREE.ConeGeometry(0.45, h, 6), emissive(0xff8a2a, 2.6, 0x441100)), x, 0.8 + h / 2, -15.05);
  lamp(g, 0xff9a4a, 70, 30, -14, 2.2, -12.5);
  // armchair (seat top y 2.0), knitting basket, floor lamp, sofa
  const chair = new THREE.Group(); chair.position.set(-22, 0, -8); chair.rotation.y = 0.5; g.add(chair);
  const fab = tmat('fabric', { color: 0x8a3a46 });
  at(chair, rbox(3.6, 1.0, 3.2, tmat('fabric', { color: 0x5a2630 }), 0.15), 0, 0.5, 0); at(chair, rbox(3.6, 1.0, 3.2, fab, 0.3), 0, 1.5, 0.1);
  at(chair, rbox(3.6, 3.8, 0.9, fab, 0.3), 0, 2.9, -1.6); for (const s of [-1, 1]) at(chair, rbox(0.8, 1.6, 3.2, fab, 0.3), s * 2.2, 2.0, 0);
  at(g, new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.65, 0.9, 10), tmat('fabric', { color: 0xb08a50 })), -19.2, 0.47, -9.8);
  at(g, new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), std(0x6a9ad8)), -19.2, 1.0, -9.8);
  at(g, rbox(0.25, 6.5, 0.25, std(0x222222)), -25.5, 3.25, -11.5);
  at(g, new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 1.2, 12, 1, true), emissive(0xffe0b0, 1.2, 0x554433)), -25.5, 6.9, -11.5);
  lamp(g, 0xffd6a0, 55, 26, -25, 6.6, -10.5);
  at(g, rbox(3.4, 1.8, 10, tmat('fabric', { color: 0x4a5a3a }), 0.3), -27.8, 0.9, 3); at(g, rbox(1.2, 3.6, 10, tmat('fabric', { color: 0x4a5a3a }), 0.3), -29.1, 2.2, 3);
  lamp(g, 0xffe6c8, 45, 40, -13, 10.5, 2);
  // hall: stairs (13 treads rise 10/14, landing top y 10 at z -16..-9.64), rails, front door, upstairs door, lamp
  const run = 17.64 / 13;
  for (let k = 1; k <= 13; k++) { const y = k * 10 / 14; at(g, tbox(5.7, y, run, WOOD), 22.85, y / 2, 8 - (k - 0.5) * run); }
  at(g, tbox(22, 0.6, 6.36, WOOD), 15, 9.7, -12.82);
  const white = tmat('plastic', { color: 0xe8e4dc, roughness: 1 });
  at(g, tbox(15.6, 0.3, 0.3, white), 12, 13.2, -9.8); for (let x = 4.6; x < 20; x += 1.2) at(g, tbox(0.16, 3.0, 0.16, white), x, 11.6, -9.8);
  const sr = at(g, tbox(0.3, 0.3, 20.3, white), 19.9, 8.4, -0.82); sr.rotation.x = Math.atan2(10, 17.64);
  at(g, rbox(0.45, 3.6, 0.45, white, 0.1), 19.9, 1.8, 8.1); at(g, rbox(0.45, 3.6, 0.45, white, 0.1), 19.9, 11.8, -9.7);
  at(g, tbox(4, 7.6, 0.3, tmat('woodplanks', { color: 0x7a2e22 })), 14, 3.8, 16); at(g, new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), std(0xd8b44a)), 15.3, 3.6, 15.75);
  at(g, rbox(3.2, 0.05, 2.0, std(0x5a3a26, { roughness: 1 }), 0.02), 14, 0.07, 13.8);
  at(g, tbox(4, 7.6, 0.25, tmat('woodplanks', { color: 0x5a3a26 })), 10, 13.8, -15.6);
  lamp(g, 0xffe0b0, 110, 45, 15, 19, 2); at(g, rbox(1.6, 0.4, 1.6, emissive(0xfff0d0, 1.5, 0x333333)), 15, 21.6, 2);
  // outside the window: snowy trees
  const pl = []; for (let x = -70; x <= 50; x += 7) for (let z = 34; z <= 70; z += 9) pl.push({ x: x + (rnd() - 0.5) * 4, z: z + rnd() * 4, h: 14 + rnd() * 10 });
  pines(g, pl);
  return {
    group: g,
    marks: { hallDoor: w(14, 0.03, 13.5), stairsTop: w(23, 10, -12), stairsBottom: w(23, 0.03, 10), armchair: w(-22, 0, -8),
      fireplace: w(-14, 0.02, -12), window: w(-17, 0.02, 13.6) },
    facing: { hallDoor: Math.PI, stairsTop: 0, stairsBottom: Math.PI, armchair: 0.5, fireplace: 0, window: 0 },
    seatY: 2.0,
  };
})();
const hw_ = W(HOME);
export const HOME_CAMS = {
  hall: P(hw_(8.5, 7, 14.2), hw_(18, 6, -6), 38),
  stairs: P(hw_(9, 4, 13.5), hw_(22.5, 5.5, -1), 36),
  stairsDown: P(hw_(21.5, 14.8, -14.6), hw_(23, 2.8, 10), 38),
  armchair: C(hw_(-22, 3.6, -8), 15, 35, 8, 34),
  livingWide: P(hw_(2.0, 9.2, 14.2), hw_(-15, 3.8, -6), 40),
  doorFromHall: P(hw_(12.5, 6, -6.5), hw_(14, 4, 15.5), 36),
  // extras
  fireplace: P(hw_(-12, 5.5, 2), hw_(-14, 2.5, -14), 34),
  window: P(hw_(-15, 6.5, -4), hw_(-17, 4.5, 14), 36),
};
function indoor(name, at_) { setLook(name); hemi.intensity *= 0.5; key.intensity *= 0.35; snowfall.setOn(false); focus(at_); }
export function look_home(name = 'night') { indoor(name, hw_(-6, 0, 0)); }

// =====================================================================================================
// BEDROOMS (BEDS): Leo's room x -30..0 (bed against the back wall, space under it, window on the left wall, exit door front-left),
// Max's room x 0..26 (small bed, nightlight, window); partition x 0 with an open doorway z 4..9. Ceiling 11. Beds: long axis z, head at -z.
// =====================================================================================================
export const beds = (() => {
  const g = group(BEDS), w = W(BEDS);
  ground(g, 180, 150, -50, -0.05, 0);
  const lw = paint(0x8fa0b4), mw = paint(0xd6c48e);
  wall(g, 'x', -16, -30, 0, 11, lw); wall(g, 'x', -16, 0, 26, 11, mw, [{ a: 10, b: 16, y0: 4, y1: 8.5 }]);
  wall(g, 'x', 16, -30, 0, 11, lw, [{ a: -8, b: -4, y0: 0, y1: 7.6 }]); wall(g, 'x', 16, 0, 26, 11, mw);
  wall(g, 'z', -30, -16, 16, 11.05, lw, [{ a: -6, b: 2, y0: 3.5, y1: 8.5 }]); wall(g, 'z', 26, -16, 16, 11.05, mw);
  wall(g, 'z', 0, -16, 16, 11.05, lw, [{ a: 4, b: 9, y0: 0, y1: 8 }]);
  at(g, tbox(56.6, 0.4, 32.6, paint(0xd8d0c2)), -2, 11, 0);
  at(g, tplane(30, 32, WOOD), -15, 0.02, 0); at(g, tplane(26, 32, tmat('woodplanks', { color: 0xa07a52 })), 13, 0.03, 0);
  at(g, tplane(9, 7, tmat('fabric', { color: 0x3a4a6a })), -12, 0.06, -2); at(g, tplane(7, 6, tmat('fabric', { color: 0x6a8a4a })), 10, 0.07, -3);
  windowIn(g, 'z', -30, -6, 2, 3.5, 8.5); windowIn(g, 'x', -16, 10, 16, 4, 8.5);
  at(g, tbox(4, 7.6, 0.3, tmat('woodplanks', { color: 0x6b3f26 })), -6, 3.8, 16);
  // Leo's bed (frame top 2.2, mattress top 3.1, open underneath 0..1.8)
  const bed = (cx, cz, bw, bl, legH, cover) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) at(g, rbox(0.5, legH, 0.5, WOODD, 0.08), cx + sx * (bw / 2 - 0.3), legH / 2, cz + sz * (bl / 2 - 0.3));
    at(g, rbox(bw, 0.4, bl, WOODD, 0.1), cx, legH + 0.2, cz);
    at(g, rbox(bw - 0.4, 0.9, bl - 0.4, std(0xcfcac0, { roughness: 1 }), 0.25), cx, legH + 0.85, cz);
    at(g, rbox(bw * 0.65, 0.5, 1.4, std(0xe0dcd4, { roughness: 1 }), 0.22), cx, legH + 1.55, cz - bl / 2 + 1.1);
    at(g, rbox(bw + 0.2, 0.3, bl * 0.6, tmat('fabric', { color: cover }), 0.12), cx, legH + 1.45, cz + bl * 0.18);
    at(g, rbox(bw, 3.4, 0.5, WOODD, 0.12), cx, legH + 1.3, cz - bl / 2 - 0.05);
  };
  bed(-19, -11.5, 5, 7.6, 1.8, 0x2c3e66);
  at(g, rbox(4, 4.5, 2.2, WOODD, 0.12), -27.6, 2.25, 9);                         // dresser
  at(g, rbox(5, 0.4, 2.6, WOOD, 0.08), -8, 3.2, -14.2); at(g, rbox(0.3, 3.0, 2.2, WOODD), -10.3, 1.5, -14.2); at(g, rbox(0.3, 3.0, 2.2, WOODD), -5.7, 1.5, -14.2);   // desk
  at(g, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 0.8, 10, 1, true), emissive(0xffe0b0, 1.2, 0x554433)), -7, 4.4, -14.3);
  lamp(g, 0xffd6a0, 40, 30, -8, 6, -12); lamp(g, 0x9ab4ff, 28, 30, -27, 7, -2);
  // Max's bed + nightlight
  bed(15, -12, 4, 6.4, 1.2, 0x6aa0d8);
  at(g, rbox(0.9, 0.7, 0.2, emissive(0xffd27a, 2.2, 0x443311), 0.08), 19.5, 1.5, -15.6);
  lamp(g, 0xffc880, 18, 18, 19.5, 1.8, -14.4); lamp(g, 0xffe2c0, 18, 34, 13, 9, 0);
  at(g, rbox(1.2, 1.2, 1.2, std(0xd94a3a), 0.15), 8, 0.63, -6); at(g, rbox(1.0, 1.0, 1.0, std(0x3a7ad9), 0.15), 9.3, 0.53, -5.2);
  const pl = []; for (let x = -105; x <= -42; x += 7) for (let z = -50; z <= 50; z += 8) pl.push({ x: x + (rnd() - 0.5) * 4, z: z + rnd() * 4, h: 14 + rnd() * 10 });
  pines(g, pl);
  return {
    group: g,
    marks: { leoBed: w(-19, 3.1, -10.5), underBed: w(-19, 0.02, -11.5), leoFloor: w(-15.4, 0.02, -9.5), maxBed: w(15, 2.5, -11.5), maxDoor: w(0, 0.03, 6.5), leoDoor: w(-6, 0.02, 13.8) },
    facing: { leoBed: 0, underBed: 0, leoFloor: -Math.PI / 2, maxBed: 0, maxDoor: -Math.PI / 2, leoDoor: 0 },
  };
})();
const bw_ = W(BEDS);
export const BEDS_CAMS = {
  leoRoom: P(bw_(-6, 8.5, 13.5), bw_(-18, 3, -9), 40),
  underBed: P(bw_(-18.5, 0.9, -3.8), bw_(-19, 0.8, -11.5), 34),
  leoBedTop: C(bw_(-19, 6.0, -10), 15, 20, 8, 34),
  maxRoom: P(bw_(5, 8, 13.5), bw_(15, 2.5, -10), 40),
  maxBedClose: P(bw_(17, 7.5, -0.6), bw_(15, 3.0, -13.2), 32),
  maxDoor: P(bw_(-18.8, 6.5, 13.5), bw_(0, 4, 6.5), 36),
};
export function look_beds(name = 'night') { indoor(name, bw_(-4, 0, -6)); }

// =====================================================================================================
// NURSERY (NURSERY): Lily's room x/z -16..16, ceiling 11. Crib against the back wall (long axis z), closet on the right wall (doors face -x),
// window on the left wall (outside: snowy yard + trees, where printsLily goes), door on the front wall.
// =====================================================================================================
export const nursery = (() => {
  const g = group(NURSERY), w = W(NURSERY);
  at(g, tplane(99.4, 120, SNOW), -66.3, 0, 0);                                  // yard outside the window side (x < -16.6)
  const pk = paint(0xe3c2c8);
  wall(g, 'x', -16, -16, 16, 11, pk); wall(g, 'x', 16, -16, 16, 11, pk, [{ a: 8, b: 12, y0: 0, y1: 7.6 }]);
  wall(g, 'z', 16, -16, 16, 11.05, pk);
  const win = [{ a: -3, b: 3, y0: 3, y1: 8 }];
  wall(g, 'z', -16, -16, 16, 11.05, pk, win);
  wall(g, 'z', -16.45, -16.6, 16.6, 14, tmat('siding', { color: 0x9fb38f }), win, 0.3);   // exterior face (Lily's green house)
  at(g, tbox(2.4, 0.4, 34.4, tmat('shingles', { color: 0x4a3a34 })), -17.4, 14.1, 0); cap(g, 2.2, 34, -17.4, 14.3, 0, 0.16);
  at(g, tbox(32.6, 0.4, 32.6, paint(0xd8d0c2)), 0, 11, 0);
  at(g, tplane(32, 32, tmat('woodplanks', { color: 0xc8a882 })), 0, 0.02, 0);
  const rug = at(g, new THREE.Mesh(new THREE.CircleGeometry(5, 24).rotateX(-Math.PI / 2), tmat('fabric', { color: 0xf0d8a0 })), 0, 0.05, -2); rug.receiveShadow = true;
  windowIn(g, 'z', -16, -3, 3, 3, 8);
  at(g, tbox(4, 7.6, 0.3, tmat('woodplanks', { color: 0xe0d8cc })), 10, 3.8, 16);
  // crib (mattress top 2.0)
  const cw = std(0xe8e2d8, { roughness: 1 }), cz = -12.3;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) at(g, rbox(0.35, 4.2, 0.35, cw, 0.08), sx * 2.0, 2.1, cz + sz * 3.2);
  for (const sx of [-1, 1]) at(g, rbox(0.3, 0.3, 6.6, cw, 0.1), sx * 2.0, 4.0, cz);
  for (const sz of [-1, 1]) at(g, rbox(4.3, 0.3, 0.3, cw, 0.1), 0, 4.0, cz + sz * 3.2);
  const slat = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6);
  for (let z = -2.7; z <= 2.71; z += 0.6) for (const sx of [-1, 1]) at(g, new THREE.Mesh(slat, cw), sx * 2.0, 2.75, cz + z);
  for (let x = -1.5; x <= 1.51; x += 0.6) at(g, new THREE.Mesh(slat, cw), x, 2.75, cz + 3.2);
  at(g, rbox(3.8, 0.4, 6.2, cw, 0.1), 0, 1.4, cz); at(g, rbox(3.6, 0.4, 6.0, std(0xf2eee8, { roughness: 1 }), 0.15), 0, 1.8, cz);
  at(g, rbox(3.4, 0.15, 3.0, tmat('fabric', { color: 0xf2a6c0 }), 0.06), 0, 2.08, cz + 1.2);
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; at(g, new THREE.Mesh(new THREE.OctahedronGeometry(0.3), emissive(0xffe08a, 0.8, 0x554422)), Math.sin(a) * 1.1, 6.6, cz + Math.cos(a) * 1.1); }
  at(g, rbox(0.15, 4.2, 0.15, std(0xcccccc)), 0, 8.9, cz);
  // closet with two doors (interior x 13..16, z -7..1)
  const cm = tmat('woodplanks', { color: 0xd8d0c4 });
  at(g, tbox(3, 0.3, 8.6, cm), 14.35, 9.15, -3); at(g, tbox(3, 9, 0.3, cm), 14.35, 4.5, -7.15); at(g, tbox(3, 9, 0.3, cm), 14.35, 4.5, 1.15);
  at(g, tbox(0.1, 9, 8, std(0x2a2226)), 15.6, 4.5, -3); at(g, tbox(2.6, 0.2, 8, cm), 14.4, 6.5, -3);
  const doorL = new THREE.Group(); doorL.position.set(12.85, 0, -7); g.add(doorL); at(doorL, tbox(0.25, 8.9, 3.96, cm), 0, 4.5, 2);
  const doorR = new THREE.Group(); doorR.position.set(12.85, 0, 1); g.add(doorR); at(doorR, tbox(0.25, 8.9, 3.96, cm), 0, 4.5, -2);
  for (const [d, z] of [[doorL, 3.5], [doorR, -3.5]]) at(d, new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), std(0xd8b44a)), -0.25, 4.3, z);
  const closet = { doorL, doorR, setOpen(k) { k = Math.max(0, Math.min(1, k)); doorL.rotation.y = -k * 1.7; doorR.rotation.y = k * 1.7; } };
  // lights: nightlight by the crib, moonlight at the window, dim ceiling
  at(g, rbox(0.9, 0.7, 0.2, emissive(0xffd27a, 2.2, 0x443311), 0.08), -6, 1.5, -15.6);
  lamp(g, 0xffc880, 22, 22, -5, 2, -14.4); lamp(g, 0x9ab4ff, 30, 30, -13.5, 7, 0); lamp(g, 0xffe2c0, 25, 40, 0, 9.5, 2);
  const pl = []; for (let x = -110; x <= -64; x += 7) for (let z = -55; z <= 55; z += 7) pl.push({ x: x + (rnd() - 0.5) * 4, z: z + rnd() * 4, h: 14 + rnd() * 12 });
  for (let z = -55; z <= 55; z += 12) if (Math.abs(z) > 20) pl.push({ x: -40 - rnd() * 18, z, h: 12 + rnd() * 8 });
  pines(g, pl);
  return {
    group: g, closet,
    marks: { crib: w(0, 2.0, -12.0), closet: w(10.5, 0.02, -3), closetInside: w(14.4, 0.02, -3), window: w(-13.6, 0.02, 0), door: w(10, 0.02, 13.6),
      outsideWindow: w(-18.5, 0, 0) },
    facing: { crib: 0, closet: Math.PI / 2, closetInside: -Math.PI / 2, window: -Math.PI / 2, door: Math.PI, outsideWindow: -Math.PI / 2 },
  };
})();
const nw = W(NURSERY);
export const NURSERY_CAMS = {
  crib: P(nw(1.5, 8.2, 4.5), nw(0, 2.6, -12), 34),
  cribTop: P(nw(0.4, 10.2, -8.6), nw(0, 2.0, -12.2), 34),
  closet: P(nw(-4.5, 6.5, 2.5), nw(13, 4.5, -3), 36),
  room: P(nw(-12.5, 8.5, 14), nw(3, 3, -7), 40),
  // extras (outdoors: call snowfall.setOn(true) in the shot)
  outside: P(nw(-48, 7, 13), nw(-18, 5, 0), 38),
  prints: P(nw(-24, 8.5, 15), nw(-42, 0.4, 0), 38),
};
export function look_nursery(name = 'night') { indoor(name, nw(0, 0, -4)); }

// =====================================================================================================
// WOODS (WOODS): open snow field (z > 0), tree line from z -8, a clearing at z -40, deep woods beyond; a bare trail runs down the middle.
// =====================================================================================================
const TRAIL = [[0, 24], [2, 6], [-2.5, -14], [0, -40], [4, -72], [2, -100]];
export const woods = await (async () => {
  const g = group(WOODS), w = W(WOODS);
  ground(g, 200, 200, 0, 0, -20);
  const distTrail = (x, z) => {
    let best = 1e9;
    for (let i = 1; i < TRAIL.length; i++) {
      const [ax, az] = TRAIL[i - 1], [bx, bz] = TRAIL[i], dx = bx - ax, dz = bz - az, k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - ax - dx * k, z - az - dz * k));
    }
    return best;
  };
  const free = (x, z) => distTrail(x, z) > 6.5 && Math.hypot(x, z + 40) > 14;
  for (let x = -60; x <= 60; x += 9) { const tx = x + (rnd() - 0.5) * 4, tz = -10 - rnd() * 5; if (free(tx, tz) && Math.abs(tx) > 8) await loadProp('tree', { parent: g, x: tx, z: tz, rotY: rnd() * 6, scale: 0.7 + rnd() * 0.35 }); }
  const pl = [];
  for (let x = -95; x <= 95; x += 6.5) for (let z = -12; z >= -115; z -= 6.5) { const px = x + (rnd() - 0.5) * 4, pz = z + (rnd() - 0.5) * 4; if (free(px, pz)) pl.push({ x: px, z: pz, h: 15 + rnd() * 16 }); }
  for (let z = 0; z <= 60; z += 9) for (const s of [-1, 1]) pl.push({ x: s * (34 + rnd() * 50), z: z + rnd() * 5, h: 12 + rnd() * 12 });
  pines(g, pl);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; at(g, rbox(1.4 + rnd(), 0.9, 1.2, SNOWCAP, 0.4), Math.sin(a) * 11, 0.3, -40 + Math.cos(a) * 11); }   // snow mounds
  lamp(g, 0x7f9cff, 30, 60, 0, 14, -20);
  return {
    group: g,
    marks: { edge: w(0, 0, -4), clearing: w(0, 0, -40), trailStart: w(0, 0, 24), trailEnd: w(4, 0, -72) },
    facing: { edge: Math.PI, clearing: Math.PI, trailStart: Math.PI, trailEnd: Math.PI },
  };
})();
const ww = W(WOODS);
export const WOODS_CAMS = {
  edge: P(ww(3, 6.5, 30), ww(0, 4.5, -4), 38),
  trail: P(ww(1.5, 5.2, 21), ww(0.5, 0.3, 5), 34),
  clearing: P(ww(3, 6, -17), ww(0, 3.5, -40), 38),
  deep: P(ww(-1, 6, -47), ww(4, 5, -76), 40),
};
export function look_woods(name = 'night') { setLook(name); snowfall.setOn(name === 'night' || name === 'bloodmoon'); focus(ww(0, 0, -20)); }

// =====================================================================================================
// CLOCK (CLOCK): kit wall clock insert
// =====================================================================================================
const ck = buildClock(CLOCK);
export const clock = { center: ck.center, group: ck.group, set: (h, m) => ck.set(h, m) };
export const CLOCK_CAMS = {
  clock: P(ck.center.clone().add(V(0, 0.3, 22)), ck.center.clone(), 34),
  clockClose: P(ck.center.clone().add(V(0.4, 0.6, 8.5)), ck.center.clone().add(V(0, 0.5, 0)), 33),
};
export function look_clock(name = 'night') { indoor(name, ck.center); }

// =====================================================================================================
// SHOES + TRAILS (kit/footwear.js). Hidden until a shot places/reveals them.
// =====================================================================================================
export const sneakers = makeShoes('sneakers'), slippers = makeShoes('slippers'), boots = makeShoes('boots'),
  babyShoes = makeShoes('baby'), leoBoots = makeShoes('bigboots');
const RY = 0.09, GY = -0.06;   // street: snow over the road, snow ground
export const printsRuiz = makeFootprints([sw(-15.4, RY, -33.5), sw(-15.2, RY, -28), sw(-15.2, RY, -8), sw(-11, RY, 30), sw(-8, RY, 44.9), sw(-7.6, GY, 45.3), sw(-6, GY, 56)]);
export const printsHale = makeFootprints([sw(-15.4, RY, -184.5), sw(-6, RY, -170), sw(-4, RY, 30), sw(-3, RY, 44.9), sw(-2.8, GY, 45.3), sw(-2, GY, 56)]);
export const printsLily = makeFootprints([nw(-17.2, 0, 0), nw(-24, 0, -3), nw(-34, 0, 2), nw(-46, 0, -2), nw(-60, 0, 1), nw(-72, 0, -2)], { scale: 1.55 });
export const printsLeo = makeFootprints([pw(0.9, 0, 8.4), pw(1.2, 0, 20), pw(0, 0, 33), pw(-4, 0, 44), pw(-10, 0, 60), pw(-14, 0, 75)]);
export const printsWoods = makeFootprints(TRAIL.map(([x, z]) => ww(x, 0, z)));

export function resetProps() {
  for (const s of [sneakers, slippers, boots, babyShoes, leoBoots]) s.hide();
  for (const p of [printsRuiz, printsHale, printsLily, printsLeo, printsWoods]) p.hide();
  shovel.hide(); porch.door.setOpen(0); nursery.closet.setOpen(0);
}
