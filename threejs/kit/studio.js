// "Behind the set" kit (fourth-wall video, scripts/fourth_wall_review.md B.8-12): the woods path out of town, the painted
// sky wall at the edge of the world (with a door), and the studio / containment area with hundreds of screens.
// Part-built from textured parts (tbox/tmat) so it matches the Roblox look. Reusable: nothing here names a video.
//
//   import { buildWoodsPath, buildSkyWall, buildStudio, makeVial, makeClapper, makeBush, makeMug } from '../../kit/studio.js';
//   const woods  = await buildWoodsPath(V(0, 0, 600), { length: 160, wall: true });   // path from the town edge to the sky wall
//   const studio = await buildStudio(V(600, 0, 0), { featured: [{ img: 'pineapple_2', label: 'F-13' }] });
//   studio.alarm(t, true);                // red beacons spin + red wash lights (call every frame while the alarm is on)
//   woods.wall.door.open(easeOut(k));     // 0 shut .. 1 open; light spills out of the doorway
//
// Every builder returns { group, marks: {name: Vector3 world}, cams: {name: [pos, look, fov]}, ... } like interiors.js,
// all in WORLD coordinates (origin already added). Characters are built facing +Z; marks say which way to face (rotY).
// Lights: the studio adds ~11 lights. Hidden lights cost nothing, so call woods.show(false) / studio.show(false) in before(t)
// and show(true) only in the shots that use the set (fewer lights per frame = faster GPU render).
// Screen images: models/screens/*.jpg, listed in models/screens/screens.json (stills from the channel's own renders).
import { THREE, V, scene, rbox, canvasTex, emissive, rng } from './core.js';
import { tmat, tbox, tplane } from './textures.js';
import { loadProp } from './models.js';

const add = (g, m, x = 0, y = 0, z = 0, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
const group = origin => { const g = new THREE.Group(); g.position.copy(origin); scene.add(g); return g; };
const SCREENS = new URL('../models/screens/', import.meta.url);
const texLoader = new THREE.TextureLoader();
const texCache = new Map();
/** A screen image texture by name (file in models/screens/ without .jpg) or by full URL. */
export function screenTex(name) {
  const url = /[/.]/.test(name) ? name : new URL(name + '.jpg', SCREENS).href;
  if (!texCache.has(url)) { const t = texLoader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(url, t); }
  return texCache.get(url);
}
export async function screenList() {
  try { return (await (await fetch(new URL('screens.json', SCREENS))).json()).screens.map(s => s.name); } catch { return []; }
}
const textTex = (text, o = {}) => canvasTex(o.h || 128, (c, w, h) => {
  c.fillStyle = o.bg || '#101418'; c.fillRect(0, 0, w, h);
  if (o.border) { c.strokeStyle = o.fg || '#fff'; c.lineWidth = h * 0.06; c.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); }
  c.fillStyle = o.fg || '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const lines = String(text).split('\n'), fs = o.size || h * 0.62 / lines.length;
  c.font = `900 ${fs}px "Inter", "Arial Black", sans-serif`;
  lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.1));
}, o.w || 512);

// ---------------------------------------------------------------- small props ----------------------------------------------------------------
/** A low-poly bush: 3-5 lumpy green blobs. ~3 wide, ~2.6 tall at scale 1. Good to hide behind (crouch behind it). */
export function makeBush(seed = 1, scale = 1, color = 0x3f7a35) {
  const g = new THREE.Group(), r = rng(seed * 97 + 3);
  const mats = [tmat('grass', { color }), tmat('grass', { color: 0x356b2d })];
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const s = (1.0 + r() * 0.7) * scale, m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mats[i % 2]);
    m.position.set((r() - 0.5) * 2.2 * scale, s * 0.75, (r() - 0.5) * 1.4 * scale); m.rotation.set(r() * 3, r() * 3, 0);
    m.scale.y = 0.85; m.castShadow = m.receiveShadow = true; g.add(m);
  }
  return g;
}
/** Coffee mug (Roblox scale: ~0.55 tall, fits a hand). Put it in c.arms[0] for holding. */
export function makeMug(color = 0xe8e2d4) {
  const g = new THREE.Group(), mat = tmat('plastic', { color });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.23, 0.55, 14), mat); cup.position.y = 0.275; cup.castShadow = true; g.add(cup);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.6 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.5; g.add(coffee);
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 6, 12, Math.PI), mat); h.rotation.z = -Math.PI / 2; h.position.set(0.27, 0.28, 0); g.add(h);
  return g;
}
/**
 * The vial: small glass bottle of glowing purple liquid with a readable label (default "SIRATONIN") and a black cap.
 * ~0.9 tall. Label faces +Z. Returns the group; `.liquid` (glow: .material.emissiveIntensity) and `.label` for close-ups.
 * For the label insert: camera 2.5-3 away at fov 30, label centred (y ≈ 0.4).
 */
export function makeVial(o = {}) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.35, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide }));
  glass.material.userData.keepShine = true; glass.position.y = 0.4; g.add(glass);
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.55, 18), new THREE.MeshStandardMaterial({ color: o.color ?? 0x8a2be2, emissive: o.color ?? 0x8a2be2, emissiveIntensity: 0.7, roughness: 0.4 }));
  liquid.position.y = 0.3; g.add(liquid); g.liquid = liquid;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.18, 14), tmat('plastic', { color: 0x1b1b1f })); cap.position.y = 0.88; g.add(cap);
  const labelTex = canvasTex(160, (c, w, h) => {
    c.fillStyle = '#f2efe6'; c.fillRect(0, 0, w, h); c.fillStyle = '#5a1a8a'; c.fillRect(0, 0, w, 18); c.fillRect(0, h - 18, w, 18);
    c.fillStyle = '#1a1020'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 62px "Inter", "Arial Black", sans-serif';
    c.fillText(o.label ?? 'SIRATONIN', w / 2, h / 2 - 8); c.font = '700 24px "Inter", Arial, sans-serif'; c.fillText(o.sub ?? 'MEMORY DROPS  ·  10 ml', w / 2, h / 2 + 40);
  }, 512);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.32, 24, 1, true, -Math.PI * 0.45, Math.PI * 0.9), new THREE.MeshStandardMaterial({ map: labelTex, roughness: 1 }));
  label.position.y = 0.36; g.add(label); g.label = label;
  return g;
}
/** Dropper (pipette): rubber bulb + glass tube, ~0.7 long, tip at the bottom. */
export function makeDropper() {
  const g = new THREE.Group();
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), tmat('plastic', { color: 0x222226 })); bulb.scale.y = 1.4; bulb.position.y = 0.6; g.add(bulb);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0xc9b6ff, transparent: true, opacity: 0.6 })); tube.position.y = 0.25; g.add(tube);
  return g;
}
/**
 * Clapperboard (~1.6 x 1.3). Text block like a real slate: o.prod ('IN THIS TOWN'), o.scene, o.take (14), o.roll.
 * `clap.set(k)`: k 1 = arm open (30°), 0 = shut. Board faces +Z.
 */
export function makeClapper(o = {}) {
  const g = new THREE.Group();
  const slate = canvasTex(256, (c, w, h) => {
    c.fillStyle = '#16181b'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8e8e8'; c.lineWidth = 4;
    c.strokeRect(10, 10, w - 20, h - 20); c.beginPath(); c.moveTo(10, 100); c.lineTo(w - 10, 100); c.moveTo(10, 178); c.lineTo(w - 10, 178); c.moveTo(w / 2, 100); c.lineTo(w / 2, h - 10); c.stroke();
    c.fillStyle = '#f0f0f0'; c.textBaseline = 'middle'; c.font = '900 52px "Inter", "Arial Black", sans-serif'; c.textAlign = 'center';
    c.fillText(o.prod ?? 'IN THIS TOWN', w / 2, 56);
    c.font = '700 22px "Inter", Arial, sans-serif'; c.textAlign = 'left';
    c.fillText('SCENE', 24, 120); c.fillText('TAKE', w / 2 + 14, 120); c.fillText('ROLL', 24, 198); c.fillText('DIRECTOR', w / 2 + 14, 198);
    c.font = '900 44px "Inter", "Arial Black", sans-serif';
    c.fillText(String(o.scene ?? '45'), 24, 154); c.fillText(String(o.take ?? 14), w / 2 + 14, 154);
    c.font = '900 30px "Inter", "Arial Black", sans-serif'; c.fillText(String(o.roll ?? 'F-13'), 24, 230); c.fillText(String(o.director ?? 'AREA 45'), w / 2 + 14, 230);
  }, 320);
  const board = add(g, new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.06), [tmat('plastic', { color: 0x16181b }), tmat('plastic', { color: 0x16181b }), tmat('plastic', { color: 0x16181b }), tmat('plastic', { color: 0x16181b }), new THREE.MeshStandardMaterial({ map: slate, roughness: 1 }), tmat('plastic', { color: 0x16181b })]), 0, 0.6, 0);
  board.castShadow = true;
  const stripes = canvasTex(32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#111' : '#eee'; c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 32, 0); c.lineTo(i * 32 + 16, h); c.lineTo(i * 32 - 16, h); c.fill(); } }, 256);
  const stripeMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 1 });
  add(g, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.07), stripeMat), 0, 1.3, 0);
  const hinge = add(g, new THREE.Group(), -0.8, 1.42, 0);
  add(hinge, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.07), stripeMat), 0.8, 0.1, 0);
  g.clap = { set: k => { hinge.rotation.z = THREE.MathUtils.degToRad(30) * Math.max(0, Math.min(1, k)); } };
  g.clap.set(1);
  return g;
}
/** Film camera on a tripod, lens toward +Z, ~6.5 tall. `cam.tally` = red record light (emissiveIntensity). */
export function makeFilmCamera(o = {}) {
  const g = new THREE.Group(), metal = tmat('metal', { color: 0x2a2c30 }), dark = tmat('plastic', { color: 0x141416 });
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.0, 6), metal);
    leg.position.set(Math.sin(a) * 0.9, 2.3, Math.cos(a) * 0.9); leg.rotation.set(Math.cos(a) * 0.36, 0, -Math.sin(a) * 0.36); leg.castShadow = true; g.add(leg);
  }
  add(g, tbox(0.5, 0.35, 0.5, metal), 0, 4.75, 0);
  const body = add(g, rbox(1.2, 1.1, 2.0, dark, 0.1), 0, 5.5, 0);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.9, 16), metal); lens.rotation.x = Math.PI / 2; lens.position.set(0, 5.5, 1.4); g.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.33, 16), new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.2 })); glass.position.set(0, 5.5, 1.86); g.add(glass);
  for (const z of [-0.45, 0.45]) { const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 16), dark); reel.rotation.z = Math.PI / 2; reel.position.set(0, 6.45, z); g.add(reel); }
  const tally = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), emissive(0xff2020, o.rec === false ? 0 : 3)); tally.position.set(0.4, 5.95, 1.0); g.add(tally);
  g.tally = tally; g.head = body;
  return g;
}
/** Studio light on a stand (~8 tall), light head facing +Z with a warm SpotLight. `.light` is the SpotLight, `.on(k)`. */
export function makeStudioLight(o = {}) {
  const g = new THREE.Group(), metal = tmat('metal', { color: 0x2a2c30 });
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 6), metal), 0, 3.5, 0);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3, l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 5), metal); l.position.set(Math.sin(a) * 0.7, 0.3, Math.cos(a) * 0.7); l.rotation.set(Math.cos(a) * 1.1, 0, -Math.sin(a) * 1.1); g.add(l); }
  const head = add(g, tbox(1.6, 1.3, 1.0, metal), 0, 7.4, 0); head.rotation.x = 0.25;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), emissive(o.color ?? 0xfff1d6, 2.5, 0x333333)); face.position.set(0, 0, 0.51); head.add(face);
  const s = new THREE.SpotLight(o.color ?? 0xfff1d6, o.intensity ?? 120, 60, 0.6, 0.6, 1.6); s.position.set(0, 7.4, 0.6); g.add(s);
  const tgt = new THREE.Object3D(); tgt.position.set(0, 2, 12); g.add(tgt); s.target = tgt;
  g.light = s; g.on = k => { s.intensity = (o.intensity ?? 120) * k; face.material.emissiveIntensity = 2.5 * k; };
  return g;
}
/** Director's chair (canvas seat + back, wooden frame), seat top y ≈ 2.4 (sit pose), back text o.text ('DIRECTOR'), faces +Z. */
export function makeDirectorChair(o = {}) {
  const g = new THREE.Group(), wood = tmat('wood', { color: 0x8a5a32 }), cloth = tmat('fabric', { color: o.color ?? 0x1c1c22 });
  for (const x of [-1, 1]) for (const z of [-0.8, 0.8]) add(g, tbox(0.2, 2.3, 0.2, wood), x, 1.15, z).rotation.x = z > 0 ? 0.12 : -0.12;
  add(g, tbox(2.1, 0.12, 1.6, cloth), 0, 2.35, 0);
  for (const x of [-1, 1]) { add(g, tbox(0.2, 2.6, 0.2, wood), x, 3.2, -0.8); add(g, tbox(0.2, 0.15, 1.6, wood), x, 3.2, 0); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 0.06), [cloth, cloth, cloth, cloth, new THREE.MeshStandardMaterial({ map: textTex(o.text ?? 'DIRECTOR', { bg: '#1c1c22', fg: '#f0e6d0' }), roughness: 1 }), new THREE.MeshStandardMaterial({ map: textTex(o.text ?? 'DIRECTOR', { bg: '#1c1c22', fg: '#f0e6d0' }), roughness: 1 })]);
  back.position.set(0, 4.0, -0.82); g.add(back);
  g.seat = V(0, 2.4, 0);
  return g;
}
/** Boom mic: pole on a stand angled forward, furry capsule at the end over +Z. ~9 tall. */
export function makeBoomMic() {
  const g = new THREE.Group(), metal = tmat('metal', { color: 0x2a2c30 });
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 6), metal), 0, 3.5, 0);
  const arm = add(g, new THREE.Group(), 0, 7, 0); arm.rotation.x = 0.35;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 8, 6), metal); pole.rotation.x = Math.PI / 2; pole.position.z = 3; arm.add(pole);
  const fur = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.0, 4, 8), tmat('fabric', { color: 0x6b6b70 })); fur.rotation.x = Math.PI / 2; fur.position.set(0, -0.2, 7.2); arm.add(fur);
  return g;
}
/** Megaphone (for the director), ~1.2 long, bell toward +Z. Put it in a hand. */
export function makeMegaphone() {
  const g = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.15, 1.0, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xf0f0ea, side: THREE.DoubleSide, roughness: 0.9 }));
  bell.rotation.x = Math.PI / 2; bell.position.z = 0.5; g.add(bell);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 16), tmat('plastic', { color: 0xd02020 })); ring.position.z = 1.0; g.add(ring);
  add(g, tbox(0.14, 0.4, 0.2, tmat('plastic', { color: 0x222 })), 0, -0.3, 0.15);
  return g;
}
/** A sign with text (canvas), o: { w 10, h 2.4, bg, fg, glow 0 (emissive strength, e.g. 1.2 for a lit sign), border }. Faces +Z. */
export function makeSign(text, o = {}) {
  const w = o.w ?? 10, h = o.h ?? 2.4, tex = textTex(text, { bg: o.bg ?? '#1a1d22', fg: o.fg ?? '#f2f2f2', w: 1024, h: Math.round(1024 * h / w), border: o.border ?? true });
  const mat = o.glow ? new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: o.glow, roughness: 1 }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2), [tmat('metal'), tmat('metal'), tmat('metal'), tmat('metal'), mat, tmat('metal')]);
  m.castShadow = true; return m;
}
/** Wall intercom speaker: grey box with a round grille and a small lamp (`.lamp`, emissive; light it while the intercom talks). */
export function makeIntercom() {
  const g = new THREE.Group();
  add(g, rbox(1.6, 1.6, 0.4, tmat('metal', { color: 0x6a6e74 }), 0.1), 0, 0, 0);
  const grille = canvasTex(128, (c, w, h) => { c.fillStyle = '#2a2c30'; c.fillRect(0, 0, w, h); c.fillStyle = '#0c0c0e'; for (let y = 10; y < h; y += 14) for (let x = 10; x < w; x += 14) if ((x - 64) ** 2 + (y - 64) ** 2 < 56 ** 2) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); } });
  add(g, new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), new THREE.MeshStandardMaterial({ map: grille, roughness: 1 })), 0, -0.05, 0.21);
  g.lamp = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), emissive(0x40ff60, 0)), 0.6, 0.6, 0.2);
  return g;
}
/**
 * Alarm beacon (red dome on a base) with a rotating red SpotLight. `beacon.set(t, on)`: spins at `speed` rad/s
 * (default 5: a sweep every ~1.2 s, well under the 12 rad/s vibration limit). o.hang (default true) mounts it under a ceiling, dome down.
 */
export function makeBeacon(o = {}) {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 14), tmat('metal', { color: 0x30333a })), 0, 0.15, 0);
  const dome = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), emissive(0xff2a1a, 0, 0x5a0a08)), 0, 0.3, 0);
  const spin = add(g, new THREE.Group(), 0, 0.55, 0);
  const s = o.light === false ? new THREE.Object3D() : new THREE.SpotLight(0xff2a1a, 0, 70, 0.45, 0.5, 1.4); spin.add(s);
  const hang = o.hang ?? true;   // default: hangs from the ceiling, dome down, beam sweeping the room slightly downward
  const tgt = new THREE.Object3D(); tgt.position.set(0, hang ? 3 : -3, 10); spin.add(tgt); if (s.isLight) s.target = tgt;
  if (hang) g.rotation.x = Math.PI;
  const speed = o.speed ?? 5, power = o.intensity ?? 260;
  g.set = (t, on = true) => { spin.rotation.y = (o.phase ?? 0) + t * speed; if (s.isLight) s.intensity = on ? power : 0; dome.material.emissiveIntensity = on ? 2.2 + 0.8 * Math.max(0, Math.sin(t * speed)) : 0; };
  g.set(0, false);
  return g;
}
/** Control desk: metal desk (~8 x 3.2 x 3), keyboard, 2-3 small monitors facing +Z's opposite (the operator sits at +Z, looks to -Z). */
export function makeDesk(o = {}, seed = 1) {
  const g = new THREE.Group(), metal = tmat('metal', { color: 0x3a3e45 }), dark = tmat('plastic', { color: 0x141416 });
  const w = o.w ?? 8;
  add(g, tbox(w, 0.25, 3.2, metal), 0, 3.0, 0);
  add(g, tbox(w, 2.9, 0.2, metal), 0, 1.45, -1.5);
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) add(g, tbox(0.2, 2.9, 3.2, metal), x, 1.45, 0);
  add(g, tbox(2.2, 0.08, 0.7, dark), 0, 3.17, 0.6);
  const imgs = o.images || [], r = rng(seed * 31 + 7), n = o.monitors ?? 2;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (w / n);
    add(g, tbox(0.3, 0.8, 0.3, dark), x, 3.5, -0.9);
    const bez = add(g, tbox(2.4, 1.5, 0.15, dark), x, 4.6, -0.95); bez.rotation.x = -0.08;
    const img = imgs.length ? imgs[Math.floor(r() * imgs.length)] : null;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), img ? screenMat(img) : staticMat(seed + i));
    scr.position.set(0, 0, 0.08); bez.add(scr);
  }
  return g;
}

// ---------------------------------------------------------------- screens ----------------------------------------------------------------
const screenMats = new Map();
/** Emissive-looking screen material (MeshBasic, not lit, dimmed a bit so bloom doesn't blow it out). */
function screenMat(name, dim = 0xc8c8c8) {
  const key = name + dim; if (!screenMats.has(key)) screenMats.set(key, new THREE.MeshBasicMaterial({ map: screenTex(name), color: dim, fog: false }));
  return screenMats.get(key);
}
const staticTexs = [];
function staticMat(seed) {
  if (!staticTexs.length) for (let i = 0; i < 3; i++) staticTexs.push(new THREE.MeshBasicMaterial({ fog: false, color: 0xaaaaaa, map: canvasTex(64, (c, w, h) => {
    const r = rng(i * 11 + 1), img = c.createImageData(w, h);
    for (let p = 0; p < w * h; p++) { const v = (i === 2 ? 20 + r() * 40 : r() * 255) | 0; img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = v; img.data[p * 4 + 3] = 255; }
    c.putImageData(img, 0, 0);
    if (i === 2) { c.fillStyle = '#3a6cff'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 9px Arial'; c.textAlign = 'center'; c.fillText('NO SIGNAL', w / 2, h / 2 + 3); }
  }, 112) }));
  return staticTexs[Math.abs(seed) % 3];
}

/**
 * A wall of screens: cols x rows monitors (16:9, `size` wide) on a metal frame, in the group's XY plane, facing +Z.
 * Images cycle through `images` (seeded shuffle), `staticShare` of them show static / NO SIGNAL. One InstancedMesh per image,
 * so hundreds of screens stay cheap. Returns { group, width, height, slot(c, r) -> local centre }.
 */
export function makeScreenWall(o = {}) {
  const g = new THREE.Group(), cols = o.cols ?? 24, rows = o.rows ?? 8, sw = o.size ?? 3.2, sh = sw * 9 / 16, gap = o.gap ?? 0.35;
  const W = cols * (sw + gap) + gap, Ht = rows * (sh + gap) + gap, y0 = o.y0 ?? 1.5;
  const frame = tbox(W, Ht, 0.4, tmat('metal', { color: 0x202227 })); frame.position.set(0, y0 + Ht / 2, -0.2); g.add(frame);
  const imgs = o.images || [], r = rng(o.seed ?? 5);
  const buckets = new Map();
  const slot = (c, rr) => V(-W / 2 + gap + sw / 2 + c * (sw + gap), y0 + gap + sh / 2 + rr * (sh + gap), 0.02);
  const skip = o.skip || (() => false);
  for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
    if (skip(c, rr)) continue;
    const isStatic = !imgs.length || r() < (o.staticShare ?? 0.15);
    const key = isStatic ? 'static' + Math.floor(r() * 3) : imgs[Math.floor(r() * imgs.length)];
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(slot(c, rr));
  }
  const geo = new THREE.PlaneGeometry(sw, sh), m4 = new THREE.Matrix4();
  for (const [key, list] of buckets) {
    const mat = key.startsWith('static') ? staticMat(+key.slice(6)) : screenMat(key, o.dim ?? 0xb4b4b4);
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, i) => im.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
    im.instanceMatrix.needsUpdate = true; g.add(im);
  }
  return { group: g, width: W, height: Ht, slot };
}

// ---------------------------------------------------------------- the woods path ----------------------------------------------------------------
/**
 * Path from the edge of town into the woods (toward -Z), lined with pine trees and bushes to hide behind.
 * o: { length 160, width 90, wall true (puts buildSkyWall at the far end), sky 'night', seed }.
 * Marks (world): start (town edge, z = origin), bush1..bush4 (crouch spots behind bushes, face -Z), mid, end (in front of the wall door).
 * Cams: follow (behind the walker), side, bushPeek (low, over a bush), wallReveal (low wide looking up at the wall).
 * The path itself is a lifted dirt strip (y 0.03) so nothing is coplanar with the grass.
 */
export async function buildWoodsPath(origin = V(0, 0, 600), o = {}) {
  const L = o.length ?? 160, Wd = o.width ?? 90, g = group(origin), r = rng(o.seed ?? 21);
  const W3 = (x, y, z) => origin.clone().add(V(x, y, z));
  add(g, tplane(Wd, L + 40, tmat('grass', { color: 0x4a6a3a })), 0, 0, -L / 2 + 10);
  const dirt = tmat('concrete', { color: 0x7a5c3e, roughness: 1 });
  // a gently winding path made of short lifted strips
  const pathX = z => Math.sin(z * 0.035) * 4;
  for (let z = 0; z > -L; z -= 8) { const p = add(g, tplane(6.5, 8.4, dirt), pathX(z - 4), 0.03 + ((-z / 8) % 2) * 0.008, z - 4); p.rotation.y = Math.cos((z - 4) * 0.035) * 0.14; }
  // trees: both sides of the path, thicker further out; deterministic
  const trees = [];
  const spots = [];
  for (let i = 0; i < (o.trees ?? 46); i++) {
    const side = i % 2 ? 1 : -1, z = -r() * (L + 10) + 5, x = pathX(z) + side * (7 + r() * (Wd / 2 - 9));
    spots.push([x, z, r() * Math.PI * 2, 0.85 + r() * 0.5]);
  }
  for (let i = 0; i < 26; i++) {   // the tree line along the wall, leaving the middle open for the reveal
    const side = i % 2 ? 1 : -1; spots.push([side * (28 + r() * 150), -L + 6 + r() * 30, r() * Math.PI * 2, 0.9 + r() * 0.5]);
  }
  add(g, tplane(460, 70, tmat('grass', { color: 0x4a6a3a })), 0, -0.15, -L - 12);   // ground under the whole wall (lower: never coplanar)
  for (const [x, z, ry, s] of spots) trees.push(await loadProp('tree', { x: origin.x + x, y: origin.y, z: origin.z + z, rotY: ry, scale: s }));
  // bushes: four hiding spots along the path (alternating sides) + filler bushes
  const marks = {}, bushes = [];
  [0.18, 0.38, 0.58, 0.78].forEach((u, i) => {
    const z = -L * u, side = i % 2 ? 1 : -1, x = pathX(z) + side * 5.2;
    const b = add(g, makeBush(i + 1, 1.2), x, 0, z); bushes.push(b);
    marks['bush' + (i + 1)] = W3(x, 0, z + 2.2);   // stand/crouch here: the bush is between you and the path ahead (-Z)
  });
  for (let i = 0; i < 18; i++) { const z = -r() * L, side = r() > 0.5 ? 1 : -1; add(g, makeBush(10 + i, 0.7 + r() * 0.6), pathX(z) + side * (5 + r() * 12), 0, z); }
  marks.start = W3(pathX(0), 0, 0); marks.mid = W3(pathX(-L / 2), 0, -L / 2); marks.end = W3(0, 0, -L + 8);
  const cams = {
    follow: [W3(pathX(-20) + 2, 6, -8), W3(pathX(-30), 3, -30), 38],
    side: [W3(pathX(-L / 2) + 16, 5, -L / 2 + 6), W3(pathX(-L / 2), 3, -L / 2), 36],
    bushPeek: [W3(pathX(-L * 0.38) + 5.2 + 0.8, 3.6, -L * 0.38 + 7), W3(pathX(-L * 0.5), 3.5, -L * 0.5), 34],
    wallReveal: [W3(0, 2.5, -L + 40), W3(0, 30, -L - 2), 42],
  };
  let wall = null;
  if (o.wall !== false) { wall = buildSkyWall(W3(0, 0, -L - 2), { sky: o.sky ?? 'night' }); Object.assign(cams, wall.cams); }
  const show = on => { g.visible = on; trees.forEach(t => { t.visible = on; }); if (wall) wall.group.visible = on; };
  return { group: g, origin, show, marks: { ...marks, ...(wall ? wall.marks : {}) }, cams, trees, bushes, wall, pathX: z => origin.x + pathX(z - origin.z) };
}

// ---------------------------------------------------------------- the sky wall ----------------------------------------------------------------
const SKIES = {
  night: { top: '#050a24', mid: '#14244a', hor: '#2a3f78', stars: 260, moon: '#eef2ff', cloud: 'rgba(120,140,190,0.55)' },
  sunset: { top: '#2a3a78', mid: '#b0607a', hor: '#ff9a4a', stars: 25, moon: '#ffd08a', cloud: 'rgba(255,190,150,0.75)' },
  day: { top: '#3f86e0', mid: '#7fb4ea', hor: '#bfdcf5', stars: 0, moon: '#fffbe8', cloud: 'rgba(255,255,255,0.9)' },
};
/**
 * The edge of the world: a huge wall painted like the sky (matching kit/look.js colours), with panel seams, rivets,
 * the same single cloud, a painted moon, and a door (8 x 12) whose face carries the painting (so it's invisible until it opens).
 * Facing +Z (the woods side). o: { width 420, height 170, sky 'night'|'sunset'|'day', door x 0 }.
 * Returns { group, door: { open(k), light }, marks: { wallDoor (in front of the door), wallInside (just through it) }, cams }.
 * Behind the door: a short lit corridor (white light spills out as it opens). Back side is grey metal scaffolding (the studio side).
 */
export function buildSkyWall(origin = V(0, 0, 0), o = {}) {
  const Wd = o.width ?? 420, Ht = o.height ?? 170, S = SKIES[o.sky ?? 'night'], g = group(origin), r = rng(77);
  const W3 = (x, y, z) => origin.clone().add(V(x, y, z));
  const tex = canvasTex(1024, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, S.top); gr.addColorStop(0.6, S.mid); gr.addColorStop(1, S.hor);
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let i = 0; i < S.stars; i++) { c.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; const s = r() < 0.1 ? 3 : 2; c.fillRect(r() * w, r() * h * 0.75, s, s); }
    c.fillStyle = S.moon; c.beginPath(); c.arc(w * 0.3, h * 0.22, 44, 0, 7); c.fill();                       // the moon "in the same spot as always"
    c.fillStyle = S.cloud; [[0.62, 0.3, 1], [0.66, 0.28, 0.8], [0.7, 0.31, 0.9]].forEach(([x, y, s]) => { c.beginPath(); c.ellipse(w * x, h * y, 90 * s, 34 * s, 0, 0, 7); c.fill(); });
    c.globalAlpha = 0.07; c.fillStyle = '#000'; for (let i = 0; i < 40; i++) c.fillRect(r() * w, 0, 2 + r() * 6, h);   // brush streaks: it's paint
    c.globalAlpha = 1;
  }, 2560);
  const skyMat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 1 });
  const DX = o.door ?? 0, DW = 8, DH = 12;
  // the painted face in 3 pieces around the doorway, UVs in wall coordinates so the painting is continuous
  const piece = (x0, x1, y0, y1, parent = g, ox = 0) => {
    const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0), uv = geo.attributes.uv, p = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + (x0 + x1) / 2 + Wd / 2) / Wd, (p.getY(i) + (y0 + y1) / 2) / Ht);
    const m = new THREE.Mesh(geo, skyMat); m.position.set((x0 + x1) / 2 - ox, (y0 + y1) / 2, 0.02); m.receiveShadow = true; parent.add(m); return m;
  };
  piece(-Wd / 2, DX - DW / 2, 0, Ht); piece(DX + DW / 2, Wd / 2, 0, Ht); piece(DX - DW / 2, DX + DW / 2, DH, Ht);
  // structure: thick wall behind the painting, with a hole for the doorway
  const metal = tmat('metal', { color: 0x5a5e66 });
  add(g, tbox(DX - DW / 2 + Wd / 2, Ht, 2, metal), (-Wd / 2 + DX - DW / 2) / 2, Ht / 2, -1);
  add(g, tbox(Wd / 2 - DX - DW / 2, Ht, 2, metal), (Wd / 2 + DX + DW / 2) / 2, Ht / 2, -1);
  add(g, tbox(DW, Ht - DH, 2, metal), DX, DH + (Ht - DH) / 2, -1);
  // panel seams + rivets: the tell that it's a wall (subtle from far, obvious up close)
  const seam = new THREE.MeshStandardMaterial({ color: 0x0a0e1a, roughness: 1, transparent: true, opacity: 0.55 });
  const seamX = []; for (let k = -20; k <= 20; k++) { const x = DX + 12 + 24 * k; if (Math.abs(x) < Wd / 2 - 1) seamX.push(x); }   // seams miss the door (it has its own outline)
  for (const x of seamX) add(g, new THREE.Mesh(new THREE.PlaneGeometry(0.22, Ht), seam), x, Ht / 2, 0.06);
  for (let y = 24; y < Ht; y += 24) add(g, new THREE.Mesh(new THREE.PlaneGeometry(Wd, 0.22), seam), 0, y, 0.07);
  const rivet = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshStandardMaterial({ color: 0x3a4460, roughness: 0.9 }), 400);
  let ri = 0; const m4 = new THREE.Matrix4();
  for (const x of seamX.filter(x => Math.abs(x - DX) < 110)) for (let y = 24; y <= 96; y += 24) for (const [ox, oy] of [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]) if (ri < 400) rivet.setMatrixAt(ri++, m4.makeTranslation(x + ox, y + oy, 0.08));
  rivet.count = ri; g.add(rivet);
  // the door: painted face, metal back, a thin outline only visible close up
  const hinge = add(g, new THREE.Group(), DX - DW / 2, 0, 0.05);
  piece(DX - DW / 2, DX + DW / 2, 0, DH, hinge, DX - DW / 2);
  add(hinge, tbox(DW, DH, 0.3, metal), DW / 2, DH / 2, -0.17);
  const outline = new THREE.MeshStandardMaterial({ color: 0x05070e, roughness: 1, transparent: true, opacity: 0.7 });
  add(hinge, new THREE.Mesh(new THREE.PlaneGeometry(0.12, DH), outline), DW - 0.06, DH / 2, 0.03);
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(DW, 0.12), outline), DX, DH, 0.08);
  add(hinge, tbox(0.15, 0.9, 0.2, tmat('metal', { color: 0x8a8e96 })), DW - 0.6, 5.2, 0.1);   // handle
  // corridor behind: white light
  const cor = tmat('concrete', { color: 0xbfc3c8 });
  add(g, tbox(DW + 2, 0.4, 14, cor), DX, -0.2, -8);
  add(g, tbox(1, DH, 14, cor), DX - DW / 2 - 0.5, DH / 2, -8); add(g, tbox(1, DH, 14, cor), DX + DW / 2 + 0.5, DH / 2, -8);
  add(g, tbox(DW + 2, 1, 14, cor), DX, DH + 0.5, -8);
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(DW, DH), emissive(0xf4f8ff, 2.2, 0xffffff)), DX, DH / 2, -14.9);
  const light = new THREE.PointLight(0xeef4ff, 0, 40, 1.4); light.position.set(DX, DH * 0.7, -3); g.add(light);
  const door = { hinge, light, open(k) { k = Math.max(0, Math.min(1, k)); hinge.rotation.y = -k * THREE.MathUtils.degToRad(105); light.intensity = 90 * Math.min(1, k * 3); } };
  door.open(0);
  return {
    group: g, door, width: Wd, height: Ht,
    marks: { wallDoor: W3(DX, 0, 4), wallInside: W3(DX, 0, -6) },
    cams: {
      wallWide: [W3(DX + 10, 4, 60), W3(DX, 26, 0), 42],          // the wall fills the frame: reads as sky until you notice the seams
      wallDoorClose: [W3(DX + 4, 5, 18), W3(DX, 5.5, 0), 34],      // door + seam detail
      wallThrough: [W3(DX + 2, 4.5, 14), W3(DX, 4, -10), 36],      // looking through the open door into the light
    },
  };
}

// ---------------------------------------------------------------- the studio ----------------------------------------------------------------
/**
 * The studio / containment area ("AREA 45 / STUDIO 3"): a big hall, open toward +Z (like interiors.js), ceiling with light strips and
 * a lighting truss. Back wall (-Z) and both side walls are covered in screens (~400). In the middle: two rows of control desks,
 * the director's chair, film cameras on tripods, studio lights, a boom mic, a lab table with the vial, an empty chair for the sleeping
 * Mr Tiller, the entry door from the sky-wall corridor on the left wall, an intercom, AREA 45 signage and alarm beacons.
 *
 * o: { width 120, depth 80, height 36, images [names] (default: all of models/screens/screens.json),
 *      featured [{ img, label }]: up to 4 big screens at eye level in the middle of the back wall (labels under them, e.g. 'F-13'),
 *      sign 'AREA 45  ·  STUDIO 3', take 14 (clapperboard) }
 * Returns { group, marks, cams, featured [mesh], vial, clapper, cameras, lights, beacons, intercom, alarm(t, on), room(k) }.
 *  - alarm(t, on): beacons spin, room lights dim to 35 %, red wash lights on. Call every frame of the alarm shots (it's deterministic in t).
 *  - room(k): scale the white room lights (0..1).
 * Indoor light rule (PIPELINE §3): after setLook(...) cut the sky fill to ~0.5x and the key to ~0.35x; the room lamps light it.
 */
export async function buildStudio(origin = V(600, 0, 0), o = {}) {
  const Wd = o.width ?? 120, D = o.depth ?? 80, Ht = o.height ?? 36, g = group(origin);
  const W3 = (x, y, z) => origin.clone().add(V(x, y, z));
  const images = o.images ?? await screenList();
  const wallM = tmat('concrete', { color: 0x3a3d44 }), floorM = tmat('concrete', { color: 0x4a4d54, roughness: 1 });
  add(g, tbox(Wd + 2, 0.6, D, floorM), 0, -0.3, 0);
  add(g, tplane(Wd - 30, 20, tmat('diamondplate', { color: 0x55585e })), 0, 0.03, 4);   // the work floor in the middle
  add(g, tbox(Wd + 2, 1, D, tmat('metal', { color: 0x24262b })), 0, Ht + 0.5, 0);
  add(g, tbox(Wd, Ht, 1, wallM), 0, Ht / 2, -D / 2 - 0.5);
  add(g, tbox(1, Ht, D, wallM), -Wd / 2 - 0.5, Ht / 2, 0); add(g, tbox(1, Ht, D, wallM), Wd / 2 + 0.5, Ht / 2, 0);
  if (o.front) add(g, tbox(Wd, Ht, 1, wallM), 0, Ht / 2, D / 2 + 0.5);
  // screens: back wall (with a gap in the middle for the featured ones), side walls (the left one leaves room for the door)
  const back = makeScreenWall({ cols: 30, rows: 9, size: 3.4, images, seed: 3, skip: (c, r) => c >= 9 && c <= 20 && r <= 3 });   // gap for the featured screens
  add(g, back.group, 0, 0, -D / 2 + 0.25);
  const left = makeScreenWall({ cols: 20, rows: 9, size: 3.4, images, seed: 9, skip: (c, r) => c >= 3 && c <= 7 && r <= 6 });     // gap for the door, its sign and the intercom
  add(g, left.group, -Wd / 2 + 0.25, 0, 0, Math.PI / 2);
  const right = makeScreenWall({ cols: 20, rows: 9, size: 3.4, images, seed: 15 });
  add(g, right.group, Wd / 2 - 0.25, 0, 0, -Math.PI / 2);
  // featured: big screens with labels (P's own earlier take etc.)
  const feat = (o.featured ?? []).slice(0, 4), featured = [];
  const fw = 7.2, fh = fw * 9 / 16;
  feat.forEach((f, i) => {
    const n = feat.length, x = (i - (n - 1) / 2) * (fw + 1.0), y = 2.6 + fh / 2 + (i % 2 ? 0 : 0);
    add(g, tbox(fw + 0.5, fh + 0.5, 0.4, tmat('plastic', { color: 0x141416 })), x, y, -D / 2 + 0.6);
    const s = add(g, new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), f.img ? screenMat(f.img, 0xd8d8d8) : staticMat(i)), x, y, -D / 2 + 0.82);
    if (f.label) add(g, makeSign(f.label, { w: 3.2, h: 0.9, bg: '#0c0e12', fg: f.color ?? '#ffd23f', glow: 0.9, border: false }), x, y - fh / 2 - 0.85, -D / 2 + 0.75);
    s.name = 'featured_' + i; featured.push(s);
  });
  // signage
  add(g, makeSign(o.sign ?? 'AREA 45  ·  STUDIO 3', { w: 26, h: 3.6, bg: '#101318', fg: '#ff4a3a', glow: 1.1 }), 0, Ht - 3.5, -D / 2 + 0.6);
  add(g, makeSign('RESTRICTED  ·  SUBJECTS F-01 TO F-14', { w: 16, h: 1.6, bg: '#f2c230', fg: '#111111', border: false }), -Wd / 2 + 0.6, 15, 18, Math.PI / 2);
  // entry door (left wall, from the sky-wall corridor) and the intercom next to it
  const doorX = -Wd / 2 + 0.6, doorZ = 18;
  add(g, tbox(0.4, 12.5, 9, tmat('metal', { color: 0x6a6e74 })), doorX, 6.25, doorZ);
  add(g, makeSign('SET ACCESS', { w: 6, h: 1.1, bg: '#101318', fg: '#ffffff', border: false }), doorX + 0.3, 13.6, doorZ, Math.PI / 2);
  const intercom = add(g, makeIntercom(), doorX + 0.3, 11, doorZ - 7, Math.PI / 2);
  // control desks: two rows facing the back wall
  const deskImgs = images.length ? images : [];
  const desks = [];
  [[-30, -22], [-10, -22], [10, -22], [30, -22], [-20, -10], [0, -10], [20, -10]].forEach(([x, z], i) => desks.push(add(g, makeDesk({ images: deskImgs, monitors: i % 2 ? 3 : 2 }, i + 1), x, 0, z)));
  // the "film" side: director's chair, cameras, lights, boom mic around the work floor
  const chair = add(g, makeDirectorChair({ text: 'DIRECTOR' }), 0, 0, 6, Math.PI);   // faces -Z (watching the screens)
  const cameras = [add(g, makeFilmCamera(), -14, 0, 4, Math.PI * 0.92), add(g, makeFilmCamera({ rec: false }), 16, 0, 10, Math.PI * 1.12)];
  const lights = [add(g, makeStudioLight(), -26, 0, 14, Math.PI * 0.85), add(g, makeStudioLight(), 26, 0, 14, Math.PI * 1.15)];
  add(g, makeBoomMic(), 10, 0, 16, Math.PI * 1.05);
  // lab corner (right): table, vials, a chair for the sleeping neighbour
  const lab = tmat('plastic', { color: 0xe8ecef });
  add(g, tbox(10, 0.3, 4, lab), 34, 3.2, 10); for (const [x, z] of [[-4.6, -1.7], [4.6, -1.7], [-4.6, 1.7], [4.6, 1.7]]) add(g, tbox(0.25, 3.1, 0.25, tmat('metal')), 34 + x, 1.55, 10 + z);
  const vial = add(g, makeVial(), 33, 3.35, 10.6); const dropper = add(g, makeDropper(), 34.2, 3.35, 10.8); dropper.rotation.z = 1.4;
  for (let i = 0; i < 5; i++) add(g, makeVial({ label: 'SIRATONIN', sub: 'BATCH ' + (40 + i) }), 36 + i * 0.6, 3.35, 9.2);
  const sleepChair = add(g, new THREE.Group(), 30, 0, 18, -Math.PI / 2);
  add(sleepChair, tbox(2.6, 0.4, 2.4, tmat('plastic', { color: 0x2a3a5a })), 0, 2.2, 0); add(sleepChair, tbox(2.6, 3, 0.3, tmat('plastic', { color: 0x2a3a5a })), 0, 3.8, -1.1);
  for (const x of [-1.1, 1.1]) for (const z of [-1, 1]) add(sleepChair, tbox(0.2, 2.1, 0.2, tmat('metal')), x, 1.05, z);
  const clapper = add(g, makeClapper({ take: o.take ?? 14 }), -4, 3.35, -9); clapper.rotation.x = -0.25;
  // ceiling light strips + a truss
  const strips = [];
  for (let x = -Wd / 2 + 15; x < Wd / 2; x += 30) for (let z = -D / 2 + 12; z < D / 2; z += 24)
    add(g, new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 1.2), emissive(0xeef2ff, 1.4, 0xffffff)), x, Ht - 0.2, z);
  for (const x of [-36, 0, 36]) for (const z of [-18, 12]) {   // 6 lights only: every light costs on every material in the scene
    const p = new THREE.PointLight(0xe8eeff, 130, 70, 1.5); p.position.set(x, Ht - 2, z); g.add(p); strips.push(p);
  }
  const truss = tmat('metal', { color: 0x1a1b1f });
  for (const z of [-4, 14]) add(g, tbox(Wd - 10, 0.6, 0.6, truss), 0, Ht - 6, z);
  // alarm: beacons on the walls + red wash lights (off until alarm())
  const beacons = [];
  [[-40, -20], [0, -20], [40, -20], [-30, 16], [30, 16]].forEach(([x, z], i) => beacons.push(add(g, makeBeacon({ phase: i * 2.1, light: i % 2 === 0 }), x, Ht, z)));   // 3 of 5 carry a light
  const red = [V(-30, 14, 0), V(30, 14, 0), V(0, 14, 20)].map(p => { const l = new THREE.PointLight(0xff2010, 0, 70, 1.4); l.position.copy(p); g.add(l); return l; });
  const room = k => strips.forEach(p => { p.intensity = 130 * k; });
  const alarm = (t, on = true) => {
    beacons.forEach(b => b.set(t, on));
    const pulse = 0.5 + 0.5 * Math.sin(t * (2 * Math.PI / 0.9));   // 0.9 s, same as the siren SFX and VFX alarmWash
    red.forEach(l => { l.intensity = on ? 120 + 160 * pulse : 0; });
    room(on ? 0.35 : 1);
  };
  alarm(0, false);
  g.updateMatrixWorld(true);
  const marks = {
    entry: W3(doorX + 3, 0, doorZ), entryIn: W3(doorX + 8, 0, doorZ),                 // P comes in here (face +X)
    screensView: W3(0, 0, -D / 2 + 14),                                                // P stares at the featured screens (face -Z)
    f13Screen: featured[0] ? featured[0].getWorldPosition(new THREE.Vector3()) : W3(0, 4.6, -D / 2 + 0.8),
    director: W3(0, 0, 6), directorStand: W3(-3, 0, 2),                                // chair seat y 2.4
    labTable: W3(34, 0, 13), vial: W3(33, 3.35, 10.6),
    sleepChair: W3(30, 0, 18),                                                          // Mr Tiller asleep, seat y 2.4 (rotY -PI/2)
    tackle: W3(-6, 0, 12), guard1: W3(-10, 0, 18), guard2: W3(-2, 0, 20),                // where P gets tackled / guards rush from the door
    desk: W3(0, 0, -7),
  };
  const cams = {
    wide: [W3(0, 14, D / 2 - 4), W3(0, 9, -D / 2), 42],                                // establishing: hundreds of screens
    screensUp: [W3(2, 2.5, -D / 2 + 22), W3(0, 10, -D / 2), 40],                       // low, looking up the screen wall
    featured: [W3(1, 4.6, -D / 2 + 15), W3(0, 4.6, -D / 2 + 0.8), 34],                 // the featured row
    overShoulder: [W3(3, 6.5, -D / 2 + 20), W3(0, 4.6, -D / 2 + 1), 34],               // behind P at screensView
    door: [W3(-Wd / 2 + 22, 5, 26), W3(doorX, 5, doorZ), 36],
    director: [W3(0, 5.5, -9), W3(0, 4, 6), 34],                                         // from the desks, looking at the director's chair
    lab: [W3(28, 5.5, 2), W3(34, 3.6, 11), 34],
    alarmWide: [W3(-8, 10, 34), W3(0, 7, -10), 42],
  };
  return { group: g, origin, show: on => { g.visible = on; }, width: Wd, depth: D, height: Ht, marks, cams, featured, vial, dropper, clapper, cameras, lights, beacons, intercom, chair, sleepChair, desks, alarm, room };
}
