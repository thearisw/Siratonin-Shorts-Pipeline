// Footwear + footprints: empty shoes that walk by themselves, and footprint trails pressed into snow.
// Low-poly, rounded (rbox) Roblox-ish parts. Scale is Roblox studs (a character is ~5.2 tall, legs ~1 wide).
//
//   import { makeShoes, makeFootprints } from '../../kit/footwear.js';
//   const s = makeShoes('sneakers');           // kinds: sneakers | slippers | boots | baby | bigboots
//   s.place(x, y, z, rotY)  or s.place(vec3, rotY)   // root on the ground, toes toward local +Z; resets the pair to standing
//   s.walk(t, speed)        // stiff creepy walk along local +Z: one shoe lifts, steps, pause. ~0.9 stud per step. Returns distance walked
//   s.stepUp(t, speed, o)   // climb stairs along local +Z. o = { rise 0.6, run 1.2, n 5 (treads incl. the deck), d0 0.6 (mark -> first riser), lift 0.1 (snow on treads) }
//   s.hide(); s.show(); s.root; s.shoes [right, left]; s.worldPos() (centre of the pair, world)
//   const p = makeFootprints([V(..), V(..), ...], { bare: true, scale: 1 });   // points = world path (y = surface height)
//   p.reveal(k)  (0..1 along the trail, shows it); p.hide(); p.show()
import { THREE, scene, std, rbox, canvasTex, clamp, easeInOut, V } from './core.js';

const put = (p, m, x, y, z) => { m.position.set(x, y, z); p.add(m); return m; };

function shoe(kind) {
  const g = new THREE.Group();
  if (kind === 'sneakers') {
    const red = std(0xc8282c), white = std(0xe8e6e0, { roughness: 1 }), dark = std(0x2a2426);
    put(g, rbox(0.8, 0.22, 1.55, white, 0.08), 0, 0.11, 0);
    put(g, rbox(0.72, 0.5, 1.15, red, 0.18), 0, 0.46, -0.12);
    put(g, rbox(0.7, 0.32, 0.55, white, 0.14), 0, 0.35, 0.48);
    put(g, rbox(0.77, 0.09, 0.8, white, 0.04), 0, 0.4, -0.15);            // side stripe
    put(g, rbox(0.46, 0.06, 0.5, dark, 0.03), 0, 0.715, -0.3);            // opening
    put(g, rbox(0.44, 0.2, 0.36, red, 0.08), 0, 0.68, 0.12);             // tongue
    for (let i = 0; i < 3; i++) put(g, rbox(0.5, 0.05, 0.07, white, 0.02), 0, 0.73 - i * 0.04, 0.02 + i * 0.13);
    put(g, rbox(0.3, 0.3, 0.12, white, 0.05), 0, 0.62, -0.72);           // heel tab
  } else if (kind === 'slippers') {
    const pink = std(0xff8fc0, { roughness: 1 }), pale = std(0xf6c8da, { roughness: 1 }), fluff = std(0xffe2ef, { roughness: 1 });
    put(g, rbox(0.82, 0.18, 1.5, pale, 0.08), 0, 0.09, 0);
    put(g, rbox(0.84, 0.44, 0.95, pink, 0.21), 0, 0.37, 0.22);
    put(g, rbox(0.86, 0.14, 0.3, fluff, 0.07), 0, 0.5, -0.2);            // fuzzy rim
    put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), fluff), 0, 0.62, 0.42);   // pompom
  } else if (kind === 'boots' || kind === 'bigboots') {
    const big = kind === 'bigboots';
    const body = big ? std(0x222326) : std(0x7a4a26), sole = std(big ? 0x121212 : 0x2a1e16), toe = std(big ? 0x34353a : 0x5e3618);
    put(g, rbox(0.88, 0.26, 1.62, sole, 0.08), 0, 0.13, 0);
    put(g, rbox(0.8, 0.55, 1.4, body, 0.18), 0, 0.5, 0);
    put(g, rbox(0.8, 0.4, 0.46, toe, 0.15), 0, 0.42, 0.55);
    put(g, rbox(0.78, 1.05, 0.88, body, 0.15), 0, 1.12, -0.3);
    if (big) {
      put(g, rbox(0.98, 0.34, 1.02, std(0xd8d2c4, { roughness: 1 }), 0.15), 0, 1.72, -0.3);   // fur cuff
      put(g, rbox(0.12, 0.35, 0.1, std(0xc23a2a), 0.04), 0, 1.75, -0.84);                     // pull tab
    } else {
      put(g, rbox(0.84, 0.18, 0.92, std(0x4a2c14), 0.07), 0, 1.66, -0.3);                      // collar
      const lace = std(0xc9a352);
      for (let i = 0; i < 4; i++) put(g, rbox(0.5, 0.05, 0.07, lace, 0.02), 0, 0.82 + i * 0.2, 0.15 - i * 0.04);
    }
  } else if (kind === 'baby') {
    const white = std(0xf0eee8, { roughness: 1 }), blue = std(0x9cc4e8, { roughness: 1 });
    put(g, rbox(0.82, 0.2, 1.3, white, 0.08), 0, 0.1, 0);
    put(g, rbox(0.78, 0.55, 1.1, white, 0.25), 0, 0.42, -0.05);
    put(g, rbox(0.84, 0.13, 0.3, blue, 0.06), 0, 0.55, 0.12);           // velcro strap
  } else throw new Error('makeShoes: unknown kind ' + kind);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

const SCALE = { sneakers: 1, slippers: 1, boots: 1.08, baby: 0.45, bigboots: 1.12 };

/** A pair of shoes (Group under .root). kinds: sneakers (Max), slippers (pink fuzzy), boots (brown work), baby (tiny white), bigboots (black snow boots). o: { scale, parent } */
export function makeShoes(kind, o = {}) {
  const sc = (o.scale ?? 1) * (SCALE[kind] ?? 1), gap = 0.5;
  const root = new THREE.Group(); root.name = 'shoes_' + kind; (o.parent || scene).add(root);
  const inner = new THREE.Group(); inner.scale.setScalar(sc); root.add(inner);
  const R = shoe(kind), L = shoe(kind); inner.add(R, L);
  const shoes = [R, L];
  const stand = () => { R.position.set(-gap, 0, 0); L.position.set(gap, 0, 0); for (const s of shoes) s.rotation.set(0, 0, 0); };
  stand(); root.visible = false;
  const P = (speed) => 0.8 / (speed || 1);
  const api = {
    root, shoes, kind,
    place(x, y, z, rotY = 0) {
      if (x && x.isVector3) { rotY = y ?? 0; root.position.copy(x); } else root.position.set(x, y, z);
      root.rotation.set(0, rotY, 0); stand(); root.visible = true; return api;
    },
    hide() { root.visible = false; return api; },
    show() { root.visible = true; return api; },
    /** stiff walk along local +Z; each step one shoe hops 1.8 forward (pair centre 0.9), then a short pause. Returns centre distance (studs, root space). */
    walk(t, speed = 1) {
      t = Math.max(0, t); const p = P(speed), i = Math.floor(t / p), u = clamp((t - i * p) / (p * 0.6), 0, 1), e = easeInOut(u);
      const zOf = (s, m) => s === 0 ? (m === 0 ? 0 : 0.9 + (m - 1) * 1.8) : m * 1.8;
      const done = [Math.ceil(i / 2), Math.floor(i / 2)], mover = i % 2;
      let zc = 0;
      for (let s = 0; s < 2; s++) {
        const m = done[s], sh = shoes[s];
        if (s === mover) { sh.position.set(s ? gap : -gap, 0.35 * Math.sin(Math.PI * u), zOf(s, m) + (zOf(s, m + 1) - zOf(s, m)) * e); sh.rotation.set(0.18 * Math.sin(Math.PI * u), 0, 0); }
        else { sh.position.set(s ? gap : -gap, 0, zOf(s, m)); sh.rotation.set(0, 0, 0); }
        zc += sh.position.z / 2;
      }
      return zc * sc;
    },
    /** climb stairs along local +Z from a mark on the ground in front of the first riser: right shoe up a tread, left joins it, repeat. */
    stepUp(t, speed = 1, so = {}) {
      const rise = so.rise ?? 0.6, run = so.run ?? 1.2, n = so.n ?? 5, d0 = so.d0 ?? 0.6, lift = so.lift ?? 0.1;
      t = Math.max(0, t); const p = P(speed) * 1.1, i = Math.min(Math.floor(t / p), 2 * n), u = i >= 2 * n ? 0 : clamp((t - i * p) / (p * 0.6), 0, 1), e = easeInOut(u);
      const tz = k => (k === 0 ? 0 : d0 + (k - 0.5) * run) / sc, ty = k => (k === 0 ? 0 : lift + k * rise) / sc;   // inner is scaled
      const done = [Math.ceil(i / 2), Math.floor(i / 2)], mover = i % 2;
      for (let s = 0; s < 2; s++) {
        const m = Math.min(done[s], n), sh = shoes[s], x = s ? gap : -gap;
        if (s === mover && i < 2 * n) {
          sh.position.set(x, ty(m) + (ty(m + 1) - ty(m)) * e + 0.4 / sc * Math.sin(Math.PI * u), tz(m) + (tz(m + 1) - tz(m)) * e);
          sh.rotation.set(0.18 * Math.sin(Math.PI * u), 0, 0);
        } else { sh.position.set(x, ty(m), tz(m)); sh.rotation.set(0, 0, 0); }
      }
    },
    worldPos() { root.updateMatrixWorld(true); const c = R.position.clone().add(L.position).multiplyScalar(0.5); return inner.localToWorld(c); },
  };
  return api;
}

// ---------- footprints ----------
const printTex = {};
function footTex(bare) {
  const k = bare ? 'bare' : 'sole'; if (printTex[k]) return printTex[k];
  // canvas top = heel (back, -Z), bottom = toes (front, +Z); drawn as a RIGHT foot (big toe at canvas right = +X = the inner side); the left foot is the mirrored instance
  printTex[k] = canvasTex(256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const fillA = '#7f90aa', fillB = '#9aa9c0';
    const grad = c.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.55, w * 0.7); grad.addColorStop(0, fillA); grad.addColorStop(1, fillB);
    c.fillStyle = grad;
    if (bare) {
      c.beginPath(); c.ellipse(w * 0.5, h * 0.24, w * 0.2, h * 0.16, 0, 0, 7); c.fill();                 // heel
      c.beginPath(); c.ellipse(w * 0.52, h * 0.47, w * 0.17, h * 0.2, 0.08, 0, 7); c.fill();             // arch
      c.beginPath(); c.ellipse(w * 0.5, h * 0.67, w * 0.27, h * 0.12, 0, 0, 7); c.fill();                // ball
      const toes = [[0.69, 0.83, 0.085], [0.55, 0.87, 0.065], [0.43, 0.86, 0.058], [0.33, 0.83, 0.052], [0.25, 0.79, 0.046]];
      for (const [x, y, r] of toes) { c.beginPath(); c.arc(w * x, h * y, w * r, 0, 7); c.fill(); }
    } else {
      c.beginPath(); c.ellipse(w * 0.5, h * 0.3, w * 0.24, h * 0.2, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(w * 0.5, h * 0.68, w * 0.3, h * 0.24, 0, 0, 7); c.fill();
      c.fillStyle = '#6d7d96'; for (let y = 0.15; y < 0.9; y += 0.08) c.fillRect(w * 0.28, h * y, w * 0.44, h * 0.025);
    }
  });
  return printTex[k];
}

/**
 * A trail of footprints along a world-space path (points: Vector3[], y = the surface they sit on; the trail is lifted 0.03).
 * o: { bare (true), scale (1; 1.5 = big grown-up feet), stride (1.5 * scale), parent }
 * Returns { mesh, count, reveal(k), hide(), show() }; hidden until reveal/show.
 */
export function makeFootprints(points, o = {}) {
  const sc = o.scale ?? 1, stride = o.stride ?? 1.5 * sc, lat = 0.38 * sc;
  const segs = []; let total = 0;
  for (let i = 1; i < points.length; i++) { const a = points[i - 1], b = points[i], l = Math.hypot(b.x - a.x, b.z - a.z); segs.push({ a, b, l, s0: total }); total += l; }
  const N = Math.max(1, Math.floor(total / stride));
  const geo = new THREE.PlaneGeometry(0.62 * sc, 1.35 * sc); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ map: footTex(o.bare !== false), alphaTest: 0.4, roughness: 1, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.InstancedMesh(geo, mat, N); mesh.receiveShadow = true; mesh.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const d = (i + 0.5) * stride; let sg = segs[segs.length - 1];
    for (const s of segs) if (d <= s.s0 + s.l) { sg = s; break; }
    const k = sg.l ? (d - sg.s0) / sg.l : 0, dx = sg.b.x - sg.a.x, dz = sg.b.z - sg.a.z, yaw = Math.atan2(dx, dz);
    const side = i % 2 ? 1 : -1;                                   // -1 right foot (at -X of the walker), +1 left
    const nx = Math.cos(yaw), nz = -Math.sin(yaw);                 // walker's local +X in world
    const jit = Math.sin(i * 12.9898) * 0.06;
    const pos = V(sg.a.x + dx * k + nx * lat * side, sg.a.y + (sg.b.y - sg.a.y) * k + 0.03, sg.a.z + dz * k + nz * lat * side);
    q.setFromAxisAngle(up, yaw + jit);
    m4.compose(pos, q, V(side > 0 ? -1 : 1, 1, 1));               // left foot = mirrored right
    mesh.setMatrixAt(i, m4);
  }
  mesh.instanceMatrix.needsUpdate = true; mesh.visible = false;
  (o.parent || scene).add(mesh);
  const api = {
    mesh, count: N,
    reveal(k = 1) { mesh.count = Math.max(0, Math.min(N, Math.ceil(clamp(k, 0, 1) * N))); mesh.visible = mesh.count > 0; return api; },
    hide() { mesh.visible = false; return api; },
    show() { return api.reveal(1); },
  };
  return api;
}
