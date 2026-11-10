// Core: renderer, scene, camera, post-processing and small helpers shared by every video.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export { THREE };
export const W = 1080, H = 1920;   // vertical 9:16

export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(45, W / H, 0.5, 1000)   // near 0.5: keeps depth precision (no z-fighting on floors);
scene.add(camera);
// soft fill light that rides on the camera; aim() sets its strength per shot so faces read in the dark
export const fill = new THREE.PointLight(0xfff0e0, 0, 40, 1.2);
fill.position.set(1.5, 1.0, 0); camera.add(fill);

export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
export const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.6, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- math / easing ----------
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOut = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
export const easeIn = k => Math.pow(clamp(k, 0, 1), 3);
export const easeInOut = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const vlerp = (a, b, k) => a.clone().lerp(b, k);
/** seeded random, so every render is identical */
export function rng(seed = 1) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ---------- materials / meshes ----------
export function std(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra }); }
export function rbox(w, h, d, mat, r = 0.08, seg = 3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
export function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
export function canvasTex(size, draw, w = size) {
  const c = document.createElement('canvas'); c.width = w; c.height = size;
  draw(c.getContext('2d'), w, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function emissive(color, intensity = 2, base = 0x111111) {
  return new THREE.MeshStandardMaterial({ color: base, emissive: color, emissiveIntensity: intensity });
}

// ---------- camera ----------
/** Place the camera: position, look-at point, vertical fov, roll (rad), fill light strength. */
export function aim(pos, look, fov = 45, roll = 0, fillI = 0) {
  fill.intensity = fillI;
  camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix();
  camera.lookAt(look); camera.rotateZ(roll);
}
/** Deterministic hand-held shake offset; add it to the camera position. */
// frequencies stay under ~20 rad/s: at 30 fps anything faster aliases into random buzzing (Shoes 2026-11-09: shivering characters "vibrated")
export const shake = (t, amt) => V(Math.sin(t * 17.1) * amt + Math.sin(t * 11.3) * amt * 0.6, Math.sin(t * 19.3) * amt * 0.8, 0);
/**
 * Camera framing helper: put the camera `dist` away from `target` in direction `dir` (from target toward camera),
 * at the given fov. Frame width at the target ≈ dist * tan(fov/2) * 2 * 9/16.
 * Rule of thumb at fov 32: head+shoulders ≈ dist 9, waist-up ≈ 14, full body (5 tall) ≈ 18.
 */
export function orbit(target, dist, yawDeg = 0, pitchDeg = 0) {
  const y = THREE.MathUtils.degToRad(yawDeg), p = THREE.MathUtils.degToRad(pitchDeg);
  return target.clone().add(V(Math.sin(y) * Math.cos(p) * dist, Math.sin(p) * dist, Math.cos(y) * Math.cos(p) * dist));
}
