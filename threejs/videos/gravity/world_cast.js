// Crush Gravity: cast + gravity poses. Names match world_index.js (chars + api).
import { loadChar } from '../../kit/models.js';

export const [hero, rose, hale, ...kids] = await Promise.all(
  ['narrator_boy', 'black_shirt_girl', 'suit_man', 'friend_boy', 'cap_boy', 'plaid_boy', 'blonde_girl', 'school_girl', 'spiky_kid'].map(s => loadChar(s)));
hero.speaker = 'ME';      // line 19 only; narration never moves his mouth
rose.speaker = 'ROSE';
hale.speaker = 'HALE';
rose.defaultFace = 'tsundere_hmph_girl'; rose.setFace('tsundere_hmph_girl');   // her resting face (reset() returns to it every frame)
export const cast = { hero, rose, hale, kids };

/** Floating (k 0..1): body tilted, arms out drifting, legs dangling, slow bob and slow yaw sway (all < 2 rad/s). Caller sets root height. */
export function floatPose(c, k = 1, t = 0, seed = 0) {
  const s = seed * 1.7;
  c.body.position.y = Math.sin(t * 1.6 + s) * 0.25 * k;
  c.body.rotation.x = (0.15 + Math.sin(t * 0.9 + s) * 0.08) * k;
  c.body.rotation.z = Math.sin(t * 0.7 + s * 1.3) * 0.12 * k;
  c.body.rotation.y = Math.sin(t * 0.5 + s) * 0.3 * k;
  c.arms[0].rotation.z = (-1.1 + Math.sin(t * 1.3 + s) * 0.25) * k;
  c.arms[1].rotation.z = (1.1 + Math.sin(t * 1.1 + s + 1) * 0.25) * k;
  for (const [i, a] of c.arms.entries()) a.rotation.x = Math.sin(t * 0.9 + s + i * 2) * 0.2 * k;
  c.legs[0].rotation.x = (0.25 + Math.sin(t * 1.4 + s) * 0.2) * k;
  c.legs[1].rotation.x = (-0.15 + Math.sin(t * 1.2 + s + 2) * 0.2) * k;
  c.legs[0].rotation.z = 0.12 * k; c.legs[1].rotation.z = -0.12 * k;
}

/** Pressed to the ceiling. Place the root at (x, CEIL.room, z), then call with k=1.
 *  mode 'flat' (default): lying face-down with the back on the ceiling, body reaches ~5.2 toward +Z from the mark, face looks at the floor.
 *  mode 'hang': upside down, feet on the ceiling, head hanging ~5.2 below (also for Hale upside down in the sky). */
export function ceilingPose(c, k = 1, mode = 'flat') {
  if (mode === 'hang') {
    c.body.rotation.z = Math.PI * k;
    c.arms[0].rotation.z = 0.5 * k; c.arms[1].rotation.z = -0.5 * k;
    return;
  }
  c.body.rotation.x = 1.57 * k; c.body.position.y = -0.75 * k;
  c.arms[0].rotation.z = -1.2 * k; c.arms[1].rotation.z = 1.2 * k;
  c.legs[0].rotation.z = 0.15 * k; c.legs[1].rotation.z = -0.15 * k;
}

/** Crushed by heavy gravity: hips bent, body low and leaning, shoulders down, head low. */
export function heavyPose(c, k = 1) {
  for (const l of c.legs) l.rotation.x = -0.5 * k;
  c.body.position.y = -0.35 * k; c.body.rotation.x = 0.3 * k;
  c.neck.rotation.x = 0.45 * k;
  c.arms[0].rotation.z = 0.1 * k; c.arms[1].rotation.z = -0.1 * k;
  for (const a of c.arms) a.rotation.x = 0.2 * k;
}

/** Rose's tsundere pose: arms crossed, chin up, head turned a little away. */
export function armsCrossed(c, k = 1) {
  for (const [i, a] of c.arms.entries()) { a.rotation.x = -1.25 * k; a.rotation.z = (i ? -1.0 : 1.0) * k; }
  c.neck.rotation.y = 0.3 * k; c.neck.rotation.x = -0.12 * k;
}
