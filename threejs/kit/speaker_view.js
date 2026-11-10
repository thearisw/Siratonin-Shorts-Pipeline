// Keep the talking character visible (Aris, 2026-11-09, Crayons: a shoulder hid Fern's face while she talked).
// For every shot during which a character with c.speaker talks, the director checks a line of sight from the camera to that
// character's head (rays to several points on the face against everything solid: other characters, walls, props) and checks the camera is in front of the face. If something blocks it, the camera is swung around the speaker's
// head (yaw steps up to ±45°, then the same a little higher, then 0.8x / 0.65x closer) until the face is clear on every sample of the shot. The choice is made
// once per shot from 3 sample times, so the camera never jumps mid-shot. A shot that can't be cleared prints `SPEAKER BLOCKED: <shot>`.
// Opt out per video with `speakerCheck: false` in setup()'s return value, or per shot with `{..., speakerCheck: false}`.
import { THREE, camera, scene } from './core.js';

const ray = new THREE.Raycaster();
export const CANDIDATES = [];
// tried in order: swing first (keeps the distance), then a little higher, then a little closer (0.8x, 0.65x)
for (const near of [1, 0.8, 0.65]) for (const up of [0, 0.22]) for (const y of [0, 12, -12, 22, -22, 32, -32, 45, -45]) CANDIDATES.push({ yaw: y * Math.PI / 180, up, near });

export function headPoint(c) { c.root.updateMatrixWorld(true); const p = c.neck.getWorldPosition(new THREE.Vector3()); p.y += 0.55 * (c.root.scale.y || 1); return p; }
const visibleChar = c => c.root.position.y > -100;
/** speakers (characters) who talk at some time inside [s, e] */
export function speakersIn(chars, by, s, e) {
  return chars.filter(c => c.speaker && by[c.speaker] && by[c.speaker].some(w => w.e > s && w.s < e && !(c.silentLines || []).includes(w.line)));
}
/** move the camera by a candidate {yaw, up} around the speaker's head */
export function applyFix(c, fix) {
  if (!fix || (!fix.yaw && !fix.up && (fix.near ?? 1) === 1)) return;
  const h = headPoint(c), pos = camera.position.clone(), dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const dist = pos.distanceTo(h), look = pos.clone().addScaledVector(dir, dist);
  const rot = (p) => p.sub(h).applyAxisAngle(new THREE.Vector3(0, 1, 0), fix.yaw).add(h);
  const np = rot(pos.clone()); np.y += fix.up * dist; const nl = rot(look.clone());
  if (fix.near && fix.near !== 1) np.lerp(h, 1 - fix.near);
  camera.position.copy(np); camera.lookAt(nl); camera.updateMatrixWorld(true);
}
/** is the speaker's head inside the frame (blocked or not)? */
export function inFrame(c) {
  camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
  const ndc = headPoint(c).project(camera);
  return ndc.z < 1 && Math.abs(ndc.x) < 0.92 && Math.abs(ndc.y) < 0.95;
}
/** is the speaker's head on screen and not hidden behind another character? */
export function clearView(c, chars) {
  camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
  const h = headPoint(c), ndc = h.clone().project(camera);
  if (ndc.z > 1 || Math.abs(ndc.x) > 0.92 || Math.abs(ndc.y) > 0.95) return false;
  const from = camera.position, d = h.clone().sub(from), dist = d.length(); d.normalize();
  const facing = c.neck.getWorldDirection(new THREE.Vector3()); facing.y = 0; facing.normalize();
  if (facing.dot(d) > -0.15) return false;   // the camera must be in front of the face (we see the face, not the back of the head)
  // rays to the middle of the face, both cheeks, the mouth and the top of the head: the whole face must be clear, not just its centre
  const side = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize(), s = (c.root.scale.y || 1);
  const pts = [[0, 0], [0.5, 0], [-0.5, 0], [0, -0.4], [0, 0.45], [0.4, -0.35], [-0.4, -0.35]].map(([x, y]) => h.clone().addScaledVector(side, x * s).add(new THREE.Vector3(0, y * s, 0)));
  chars.forEach(o => o.root.updateMatrixWorld(true));   // frames render out of order: matrices from another frame would be stale
  ray.camera = camera;
  const mine = new Set(); c.root.traverse(o => mine.add(o));
  // anything solid counts as a blocker (other characters, walls, props); the speaker, sprites and see-through things don't
  const solid = i => i.object.visible && !mine.has(i.object) && !i.object.isSprite && !i.object.isPoints && !i.object.isLine &&
    !(i.object.material && (i.object.material.transparent && i.object.material.opacity < 0.5));
  for (const q of pts) {
    const dq = q.clone().sub(from), dl = dq.length(); dq.normalize();
    ray.set(from, dq); ray.near = 0; ray.far = dl - 0.3;
    if (ray.intersectObjects(scene.children, true).some(solid)) return false;
  }
  return true;
}
