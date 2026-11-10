// Models: load characters by slug from models/presets.json. Blocky presets build in code; GLB presets load with GLTFLoader
// and get rigged into the same API as makeChar (root/body/neck/arms/legs/setFace...).
//
// GLB conventions (what the converter writes): one GLB per character, Y-up, feet at origin, facing +Z, no skinning,
// body parts as named nodes. R15 names (Head, UpperTorso, LowerTorso, LeftUpperArm, LeftLowerArm, LeftHand, ... RightFoot)
// or R6 names (Head, Torso, Left Arm, Right Arm, Left Leg, Right Leg). Hierarchy and origins don't matter: on load every
// joint gets a pivot at the joint, computed from the part bounds, and the parts are chained (hand under lower arm under upper arm...).
import { THREE, scene } from './core.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { addCharApi, BLOCKY, MONSTERS, ALL_CHARS } from './chars.js';
import { faceSet, talkVariants } from './faces.js';

const BASE = new URL('../models/', import.meta.url);
let presets = null;
export async function loadPresets() {
  if (!presets) presets = await (await fetch(new URL('presets.json', BASE))).json();
  return presets;
}

const gltfCache = new Map();
const loader = new GLTFLoader();
async function loadGltf(file) {
  if (!gltfCache.has(file)) gltfCache.set(file, loader.loadAsync(new URL(file.replace(/^models\//, ''), BASE).href));
  return gltfCache.get(file);
}
const texLoader = new THREE.TextureLoader();
// Expressive Roblox faces taken from real avatars (Aris, 2026-11-09), transparent PNGs in models/faces/, usable on every swappable head
// next to the drawn kit faces: setFace('girl_slight_smile') / setFace('girl_little_laugh'). These two are the base girl expressions.
// More girl expressions (Aris, 2026-11-09): neutral_droopy_eyes_girl (black_dress_girl's own face), girl_blushing_closed_mouth,
// girl_grinning_face, embarrassed_laugh, tsundere_hmph_girl. Which beat each one suits: formats/crush_format.md.
export const IMAGE_FACES = ['girl_slight_smile', 'girl_little_laugh', 'neutral_droopy_eyes_girl', 'girl_blushing_closed_mouth',
  'girl_grinning_face', 'embarrassed_laugh', 'tsundere_hmph_girl'];
let imageFacesP = null;
function imageFaces() {
  return imageFacesP ||= Promise.all(IMAGE_FACES.map(async k => {
    const t = await texLoader.loadAsync(new URL('faces/' + k + '.png', BASE).href); t.colorSpace = THREE.SRGBColorSpace;
    const tv = talkVariants(t); return [[k, t], [k + '#1', tv['#1']], [k + '#2', tv['#2']]];   // + talking mouths (faces.js)
  })).then(a => Object.fromEntries(a.flat()));
}

const findNode = (rootObj, names) => { for (const n of names) { let hit = null; rootObj.traverse(o => { if (!hit && o.name && o.name.replace(/[_ ]/g, '').toLowerCase() === n.replace(/[_ ]/g, '').toLowerCase()) hit = o; }); if (hit) return hit; } return null; };
const bounds = o => new THREE.Box3().setFromObject(o);
// accessories (hair, hats: nodes named Acc_*) must not count as the head itself
const isAcc = o => { for (let p = o; p; p = p.parent) if (p.name && /^Acc_/i.test(p.name)) return true; return false; };
function bodyMeshes(o) { const out = []; o.traverse(m => { if (m.isMesh && !isAcc(m)) out.push(m); }); return out; }
function partBounds(o) { // the part's own geometry only (expandByObject would pull in child accessories)
  const b = new THREE.Box3();
  for (const m of bodyMeshes(o)) { m.updateWorldMatrix(true, false); if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); }
  return b.isEmpty() ? bounds(o) : b;
}

/** Wrap `part` in a pivot group placed at world point `p`, under `parent`, keeping the part's world transform. */
function pivotAt(part, p, parent) {
  const g = new THREE.Group(); g.name = part.name + '_pivot';
  parent.add(g); g.position.copy(parent.worldToLocal(p.clone())); g.updateMatrixWorld(true);
  g.attach(part);
  return g;
}

/**
 * Load a character by preset slug. opts = {face: 'happy'}.
 * Returns the standard character object; GLB characters also get .parts (name -> node) and .preset.
 */
// Stable order (Crush Gravity, 2026-11-10): ALL_CHARS used to fill in GLB *download* order, which differs per render worker,
// so the director's idle seed (index * 1.7) differed between workers and every standing character jittered frame to frame.
// Each call takes its slot at call time; ALL_CHARS is re-sorted into call order once the character is built.
let LOAD_N = 0;
export async function loadChar(slug, opts = {}) {
  const order = LOAD_N++;
  const c = await loadCharInner(slug, opts);
  c.loadOrder = order;
  ALL_CHARS.sort((a, b) => (a.loadOrder ?? -1) - (b.loadOrder ?? -1));
  return c;
}
async function loadCharInner(slug, opts = {}) {
  const all = await loadPresets();
  let P = all[slug];
  if (!P) throw new Error('No preset ' + slug + ' in models/presets.json');
  if (P.base) { // colour variant: inherits everything from its base preset, then recolours (see recolorTexture)
    if (!all[P.base]) throw new Error(slug + ': unknown base ' + P.base);
    P = { ...all[P.base], ...P, notes: P.notes || all[P.base].notes };
  }
  if (P.builder) {
    const make = BLOCKY[P.builder] || MONSTERS[P.builder];
    if (!make) throw new Error('Unknown builder ' + P.builder);
    const c = make(); c.preset = P; return c;
  }
  const gltf = await loadGltf(P.file);
  const model = gltf.scene.clone(true);
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material = o.material.clone(); o.material.side = THREE.FrontSide; } } });

  // normalise: height, feet on the ground, centred, facing +Z (preset.yaw in degrees fixes a model that faces elsewhere)
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body); scene.add(root);
  body.add(model);
  if (P.yaw) model.rotation.y = THREE.MathUtils.degToRad(P.yaw);
  model.updateMatrixWorld(true);
  let b = bounds(model);
  const s = (P.height || 5.2) / (b.max.y - b.min.y);
  model.scale.multiplyScalar(s); model.updateMatrixWorld(true);
  b = bounds(model);
  model.position.sub(new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2));
  model.updateMatrixWorld(true);

  const N = names => findNode(model, names);
  const parts = {
    head: N(['Head']), torso: N(['UpperTorso', 'Torso']), lowerTorso: N(['LowerTorso']),
    rUA: N(['RightUpperArm', 'Right Arm']), rLA: N(['RightLowerArm']), rH: N(['RightHand']),
    lUA: N(['LeftUpperArm', 'Left Arm']), lLA: N(['LeftLowerArm']), lH: N(['LeftHand']),
    rUL: N(['RightUpperLeg', 'Right Leg']), rLL: N(['RightLowerLeg']), rF: N(['RightFoot']),
    lUL: N(['LeftUpperLeg', 'Left Leg']), lLL: N(['LeftLowerLeg']), lF: N(['LeftFoot']),
  };
  const missing = ['head', 'torso', 'rUA', 'lUA', 'rUL', 'lUL'].filter(k => !parts[k]);
  if (missing.length) console.warn(slug + ': missing parts ' + missing.join(', ') + ' (posing limited)');

  // chain lower limbs under upper limbs so one rotation moves the whole limb
  const chain = (parent, child) => { if (parent && child && child.parent !== parent) parent.attach(child); };
  chain(parts.rLA, parts.rH); chain(parts.rUA, parts.rLA); chain(parts.lLA, parts.lH); chain(parts.lUA, parts.lLA);
  chain(parts.rLL, parts.rF); chain(parts.rUL, parts.rLL); chain(parts.lLL, parts.lF); chain(parts.lUL, parts.lLL);
  model.updateMatrixWorld(true);

  // Roblox limbs touch the torso with coplanar faces (shoulder/hip sides): they z-fight and shimmer on clothes when a limb moves.
  // Push every limb slightly back in depth so the torso always wins where they overlap (Aris, Fog 2026-11-09).
  for (const k of ['rUA', 'rLA', 'rH', 'lUA', 'lLA', 'lH', 'rUL', 'rLL', 'rF', 'lUL', 'lLL', 'lF'])
    if (parts[k]) parts[k].traverse(o => { if (o.isMesh && o.material) { o.material.polygonOffset = true; o.material.polygonOffsetFactor = 1; o.material.polygonOffsetUnits = 2; } });

  // pivots at the joints (from the bounds of each part)
  const top = (o, inset = 0.25) => { const bb = partBounds(o); const sz = bb.getSize(new THREE.Vector3()); return new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y - sz.x * inset, (bb.min.z + bb.max.z) / 2); };
  const empty = () => { const g = new THREE.Group(); body.add(g); return g; };
  let neck = empty(), head = parts.head || neck;
  if (parts.head) { const hb = partBounds(parts.head); neck = pivotAt(parts.head, new THREE.Vector3((hb.min.x + hb.max.x) / 2, hb.min.y, (hb.min.z + hb.max.z) / 2), body); }
  const limb = o => o ? pivotAt(o, top(o, 0.5), body) : empty();
  const arms = [limb(parts.rUA), limb(parts.lUA)];
  const legs = [limb(parts.rUL), limb(parts.lUL)];

  // swappable face: replace the baked face with the no-face head texture and add a face plane
  let faces = null, faceMat = null;
  if (parts.head && P.faceBaked !== false) {
    if (P.faceBaked && P.headNoFace) {
      const tex = await texLoader.loadAsync(new URL(P.headNoFace.replace(/^models\//, ''), BASE).href);
      tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false;
      for (const o of bodyMeshes(parts.head)) if (o.material) { o.material.map = tex; o.material.needsUpdate = true; }
    }
    if (P.faceBaked && P.headNoFace || P.faceSwap) {
      faces = { ...faceSet(P.faceExtra || {}), ...(await imageFaces()) };
      faceMat = new THREE.MeshStandardMaterial({ map: faces[opts.face || P.defaultFace || 'happy'], transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
      const hb = partBounds(parts.head); const w = (hb.max.x - hb.min.x) * (P.faceScale || 0.82);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, w), faceMat);
      const centre = new THREE.Vector3((hb.min.x + hb.max.x) / 2, (hb.min.y + hb.max.y) / 2 + (P.faceLift || 0) * w, hb.max.z + 0.005);
      neck.add(plane); plane.position.copy(neck.worldToLocal(centre));
    }
  }
  if (P.recolor || P.hair) applyRecolor(body, parts.head, P, faceMat); // body: parts were re-parented under joint pivots
  const c = addCharApi({ root, body, neck, head, arms, legs, faces, faceMat, parts, preset: P, kind: 'glb' });
  if (!faces) c.setFace = () => {};
  else c.defaultFace = opts.face || P.defaultFace || 'happy';   // reset() returns to it every frame; change c.defaultFace to give a character another resting face
  return c;
}

// ---------- colour variants ----------
// A preset with "base": "<slug>" reuses that character and recolours its clothes, so one Roblox model gives several side characters.
//   "recolor": {"hue": 120}                    rotate clothing hue by degrees (keeps patterns, shading and white/black)
//   "recolor": {"tint": "#2a6fd6", "light": 1} paint clothing in this colour, keeping its light/dark detail (works on white/grey clothes too)
//   optional "sat" (x saturation), "light" (x lightness), "keep": ["#ffffff"] colours left alone
//   "hair": same fields, applied to accessories (hair, hats)
// Skin is protected automatically: the skin colour is read from the head texture (the face tile of headNoFace is painted skin).
const _recolorCache = new Map();
function rgb2hsl(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; const d = mx - mn;
  if (d > 1e-6) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hsl2rgb(h, s, l) { if (s <= 0) return [l, l, l]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t % 1 + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)]; }
const hexSRGB = s => { const n = parseInt(String(s).replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

function imageCanvas(img) { const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); return [cv, g]; }

/** Skin colour = median of the texels under the head mesh's UVs. */
function headSkin(headPart) {
  if (!headPart) return null;
  for (const m of bodyMeshes(headPart)) {
    const map = m.material && m.material.map; const uv = m.geometry.attributes.uv; if (!map || !map.image || !uv) continue;
    let u0 = 1, v0 = 1, u1 = 0, v1 = 0; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const [, g] = imageCanvas(map.image); const W = map.image.width, H = map.image.height;
    const x0 = Math.max(0, Math.floor(u0 * W)), x1 = Math.min(W, Math.ceil(u1 * W)), y0 = Math.max(0, Math.floor(v0 * H)), y1 = Math.min(H, Math.ceil(v1 * H)); // flipY=false: v down
    if (x1 <= x0 || y1 <= y0) continue;
    const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data; const ch = [[], [], []];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { ch[0].push(d[i]); ch[1].push(d[i + 1]); ch[2].push(d[i + 2]); }
    if (!ch[0].length) continue;
    return ch.map(a => { a.sort((p, q) => p - q); return a[a.length >> 1] / 255; });
  }
  return null;
}

export function recolorTexture(tex, rc, protect = []) {
  const key = tex.uuid + JSON.stringify(rc) + JSON.stringify(protect);
  if (_recolorCache.has(key)) return _recolorCache.get(key);
  const [cv, g] = imageCanvas(tex.image); const id = g.getImageData(0, 0, cv.width, cv.height); const d = id.data;
  const keep = [...protect, ...(rc.keep || []).map(hexSRGB)];
  const tint = rc.tint ? rgb2hsl(...hexSRGB(rc.tint)) : null;
  const dh = (rc.hue || 0) / 360, sm = rc.sat ?? 1, lm = rc.light ?? 1;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
    if (keep.some(k => Math.abs(r - k[0]) < 0.09 && Math.abs(gg - k[1]) < 0.09 && Math.abs(b - k[2]) < 0.09)) continue;
    let [h, s, l] = rgb2hsl(r, gg, b);
    if (tint) { h = tint[0]; s = Math.min(1, tint[1] * sm); l = Math.max(0, Math.min(1, (tint[2] + (l - 0.6) * 0.8) * lm)); } // centre on the tint's lightness, keep the detail
    else { h += dh; s = Math.min(1, s * sm); l = Math.min(1, l * lm); }
    const o = hsl2rgb(h, s, l); d[i] = o[0] * 255; d[i + 1] = o[1] * 255; d[i + 2] = o[2] * 255;
  }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.flipY = tex.flipY; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT;
  t.magFilter = tex.magFilter; t.minFilter = tex.minFilter; t.needsUpdate = true;
  _recolorCache.set(key, t); return t;
}

function applyRecolor(model, headPart, P, skipMat) {
  const skin = headSkin(headPart);
  const protect = skin ? [skin] : [];
  model.traverse(m => {
    if (!m.isMesh || !m.material || m.material === skipMat || !m.material.map || !m.material.map.image) return;
    const acc = isAcc(m);
    const rc = acc ? P.hair : P.recolor;
    if (!rc) return;
    m.material.map = recolorTexture(m.material.map, rc, acc ? [] : protect); m.material.needsUpdate = true;
    if (acc && rc && rc.tint) { m.material.color.set(0xffffff); }
  });
}

// ---------- props: buildings, roads, street furniture (models/props/<slug>.glb, listed in models/props/props.json) ----------
// Converted from Roblox Studio exports by models/props/_work/convert_prop.py at Studio scale (1 stud = 1 unit, same as the cast).
let propList = null;
const PROPS = new URL('../models/props/', import.meta.url);
export async function loadProps() { if (!propList) propList = await (await fetch(new URL('props.json', PROPS))).json(); return propList; }
/** Add a prop to the scene. opts = {x, y, z, rotY (radians), scale, parent}. Returns the Group (move it like any Object3D). */
export async function loadProp(slug, opts = {}) {
  const L = await loadProps(); const P = L[slug];
  if (!P) throw new Error('No prop ' + slug + ' in models/props/props.json');
  const file = new URL(P.file.replace(/^props\//, ''), PROPS).href;
  if (!gltfCache.has(file)) gltfCache.set(file, loader.loadAsync(file));
  const g = (await gltfCache.get(file)).scene.clone(true);
  g.traverse(o => { if (o.isMesh) { o.castShadow = P.castShadow !== false; o.receiveShadow = true; } });
  g.name = slug; g.userData.prop = P;
  g.scale.setScalar((opts.scale ?? 1) * (P.scale ?? 1));
  g.position.set(opts.x || 0, opts.y || 0, opts.z || 0); g.rotation.y = (opts.rotY || 0) + THREE.MathUtils.degToRad(P.yaw || 0);
  (opts.parent || scene).add(g);
  return g;
}
