// Look: sky, stars, moon/sun, fog and the main shadow-casting light, with presets per time of day.
import { THREE, scene, rng, renderer, bloom } from './core.js';

// Flat stylised grade (Aris, 2026-11-08: softer, less shiny, Roblox-like rather than realistic). Set FLAT.on = false for the old filmic look.
// More even light (more sky fill, less hard key), lighter shadows, and bloom that only catches real lights. ACES tone mapping stays
// (Neutral was tried: it darkened the night street and oversaturated skin indoors).
export const FLAT = { on: true, exposure: 1.0, hemi: 1.5, key: 0.9, shadow: 0.55, bloomStrength: 0.35, bloomThreshold: 0.9 };

const skyUniforms = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
  vertexShader: `varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 top; uniform vec3 hor; varying vec3 p; void main(){ float h = clamp(p.y*1.6,0.,1.); gl_FragColor=vec4(mix(hor,top,pow(h,0.6)),1.); }`
}));
scene.add(sky);

const stars = (() => {
  const n = 1400, pos = new Float32Array(n * 3), r = rng(7);
  for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.9 + 0.08); pos.set([Math.sin(ph) * Math.cos(th) * 450, Math.cos(ph) * 450, Math.sin(ph) * Math.sin(th) * 450], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfdcff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true }));
  scene.add(p); return p;
})();
const orb = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 16), new THREE.MeshBasicMaterial({ color: 0xeef2ff, fog: false }));
orb.position.set(-90, 150, -380); scene.add(orb);

export const hemi = new THREE.HemisphereLight(0x5c7cc4, 0x141a26, 0.9); scene.add(hemi);
export const key = new THREE.DirectionalLight(0xa9c1ff, 1.3);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 160 });
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03;
scene.add(key); scene.add(key.target);
scene.fog = new THREE.FogExp2(0x0e1c3a, 0.011);

// Lighting presets (house list: day, sunset, night, bloodmoon, fog, storm). Practical lights (lamps, windows) live in the sets.
export const LOOKS = {
  night:     { top: 0x050a24, hor: 0x2a3f78, fog: 0x14244a, fogD: 0.007, hemiSky: 0x5c7cc4, hemiGround: 0x1a2030, hemiI: 1.9, key: 0xa9c1ff, keyI: 2.6, stars: 1, orb: 0xeef2ff, orbPos: [-90, 150, -380], exposure: 1.3 },  // brightened after Aris found Pineapple too dark (2026-11-08)
  bloodmoon: { top: 0x12030a, hor: 0x3a0d14, fog: 0x2a0a10, fogD: 0.013, hemiSky: 0x8a3040, hemiGround: 0x1a0808, hemiI: 0.8, key: 0xff6a5a, keyI: 1.4, stars: 0.6, orb: 0xff3a2a, orbPos: [-90, 150, -380], exposure: 1.1 },
  day:       { top: 0x3f86e0, hor: 0xbfdcf5, fog: 0xbfd6ea, fogD: 0.004, hemiSky: 0xcfe6ff, hemiGround: 0x5a6b3a, hemiI: 1.2, key: 0xfff1d6, keyI: 2.6, stars: 0, orb: 0xfffbe8, orbPos: [120, 260, -200], exposure: 1.0 },
  sunset:    { top: 0x2a3a78, hor: 0xff9a4a, fog: 0xd88a60, fogD: 0.006, hemiSky: 0xffb07a, hemiGround: 0x3a2a3a, hemiI: 1.0, key: 0xffa45a, keyI: 2.2, stars: 0.15, orb: 0xffd08a, orbPos: [0, 40, -380], exposure: 1.05 },
  fog:       { top: 0x8a96a6, hor: 0xc4ccd4, fog: 0xbcc4cc, fogD: 0.03, hemiSky: 0xd4dce4, hemiGround: 0x5a6060, hemiI: 1.3, key: 0xe8eef4, keyI: 0.8, stars: 0, orb: 0xffffff, orbPos: [0, -500, 0], exposure: 1.0 },
  storm:     { top: 0x2a3038, hor: 0x5a6470, fog: 0x4a525c, fogD: 0.016, hemiSky: 0x8a96a6, hemiGround: 0x2a2e30, hemiI: 1.0, key: 0xb8c4d0, keyI: 0.9, stars: 0, orb: 0xffffff, orbPos: [0, -500, 0], exposure: 1.0 },
};
let keyOffset = new THREE.Vector3(-30, 60, 25);
export function setLook(name) {
  const L = LOOKS[name]; if (!L) throw new Error('unknown look ' + name);
  skyUniforms.top.value.set(L.top); skyUniforms.hor.value.set(L.hor);
  scene.fog.color.set(L.fog); scene.fog.density = L.fogD;
  hemi.color.set(L.hemiSky); hemi.groundColor.set(L.hemiGround); hemi.intensity = L.hemiI * (FLAT.on ? FLAT.hemi : 1);
  key.color.set(L.key); key.intensity = L.keyI * (FLAT.on ? FLAT.key : 1);
  stars.visible = L.stars > 0; stars.material.opacity = L.stars;
  orb.material.color.set(L.orb); orb.position.set(...L.orbPos);
  keyOffset = new THREE.Vector3(...L.orbPos).normalize().multiplyScalar(70);
  if (L.exposure) renderer.toneMappingExposure = L.exposure * (FLAT.on ? FLAT.exposure : 1);
  return L;
}
/** Move the shadow-casting key light to cover the area around `target` (call once per shot). */
export function focus(target) { key.target.position.copy(target); key.position.copy(target).add(keyOffset); }
setLook('night');

// ---------- soft, flat "Roblox plastic" materials (Aris, 2026-11-08: too shiny / realistic) ----------
// Every MeshStandard/Physical material in the scene gets: metalness 0, roughness >= 0.85, and its specular light scaled by SOFT.spec
// (0 = pure matte, 1 = normal three.js shine). Diffuse lighting, shadows, maps and emissive glow are untouched.
// Materials are patched in place (same object), so code that swaps face maps or tints colours keeps working.
// Opt out for a deliberately shiny thing: material.userData.keepShine = true (set it before the first render).
export const SOFT = { spec: { value: 0.12 }, minRough: 0.85, on: true };
const softened = new WeakSet();
function soften(m) {
  if (softened.has(m) || !m.isMeshStandardMaterial || m.userData.keepShine) return;
  softened.add(m);
  m.metalness = 0; m.roughness = Math.max(m.roughness ?? 1, SOFT.minRough); m.metalnessMap = null; m.roughnessMap = null;
  if (m.isMeshPhysicalMaterial) { m.clearcoat = 0; m.sheen = 0; m.specularIntensity = 0.5; }
  m.envMapIntensity = 0;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uSoftSpec = SOFT.spec;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSoftSpec;')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n\treflectedLight.directSpecular *= uSoftSpec;\n\treflectedLight.indirectSpecular *= uSoftSpec;');
  };
  const prevKey = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => prevKey() + '|soft';
  m.needsUpdate = true;
}
/** Patch every material under `root` (cheap after the first pass; the director calls it every frame so late-made props are caught). */
export function softenAll(root = scene) {
  if (FLAT.on) {
    key.shadow.intensity = FLAT.shadow;
    bloom.strength = FLAT.bloomStrength; bloom.threshold = FLAT.bloomThreshold;
  }
  if (!SOFT.on) return;
  root.traverse(o => { const mm = o.material; if (!mm) return; if (Array.isArray(mm)) mm.forEach(soften); else soften(mm); });
}
