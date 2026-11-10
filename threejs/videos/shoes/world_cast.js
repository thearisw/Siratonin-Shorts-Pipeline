// Shoes — cast (cast agent). Slugs per PLAN.md "Cast". Nobody has a home: hidden by default, every shot places who it shows.
// Built facing +Z. Arms: x<0 = forward/up, x>0 = behind; arms[0] right (z<0 = out), arms[1] left (z>0 = out). Body x<0 = lean back.
import { loadChar } from '../../kit/models.js';

export const [leo, max, mom, gran, ruiz, hale, lilyMom, lily, ortiz] = await Promise.all([
  'narrator_boy', 'spiky_kid', 'mom_brown', 'grandma', 'mom_pink', 'grandpa', 'mom_green', 'little_sister_b', 'dad_red',
].map(s => loadChar(s)));

export const crowd = await Promise.all([
  'friend_boy_blue', 'neighbor_shades', 'builder', 'cap_boy', 'blonde_girl', 'dad_blue',
].map(s => loadChar(s)));

max.root.scale.setScalar(0.85);   // little brother, 8
lily.root.scale.setScalar(0.45);  // baby

// Speakers (captions.json names). Everyone else has no speaker, so narration never moves their mouth.
// Leo's line-86 whisper: call leo.talk(1|2) manually in that shot.
max.speaker = 'MAX';
gran.speaker = 'GRAN';

const sm = k => k * k * (3 - 2 * k);

// scared: place c anywhere; hands up near the chest/face, leaning back, head pulled back. Shot sets the face (worried/shocked/scream).
export function scared(c, k = 1) {
  for (const [i, a] of c.arms.entries()) { a.rotation.x = -1.9 * k; a.rotation.z = (i ? -0.55 : 0.55) * k; }
  c.body.rotation.x = -0.14 * k; c.neck.rotation.x = -0.12 * k;
}

// shiver: place c standing; arms wrapped round himself, fast small tremble (cold or fear). t = seconds.
export function shiver(c, t) {
  for (const [i, a] of c.arms.entries()) { a.rotation.x = -1.25; a.rotation.z = (i ? -0.85 : 0.85) + Math.sin(t * 11 + i) * 0.07; }
  c.body.position.x = Math.sin(t * 13) * 0.05; c.body.rotation.z = Math.sin(t * 9) * 0.04;
  c.neck.rotation.x = 0.18 + Math.sin(t * 8) * 0.05;
}

// sleepInBed: place root at the mattress top (y = mattress height - 0.5, lie lifts the body 0.5); head points to -Z of rotY, face up. Eyes sleeping.
export function sleepInBed(c) {
  c.pose.lie(1);
  c.arms[0].rotation.z = -0.08; c.arms[1].rotation.z = 0.08;
  c.setFace('sleeping');
}

// knit: place root at the armchair seat front (sit lowers the body 0.95); hands together in front of the lap with small needle motions.
export function knit(c, t) {
  c.pose.sit(1);
  const n = Math.sin(t * 9);
  c.arms[0].rotation.x = -0.95 + n * 0.09; c.arms[0].rotation.z = 0.42;
  c.arms[1].rotation.x = -0.95 - n * 0.09; c.arms[1].rotation.z = -0.42;
  c.neck.rotation.x = 0.32 + Math.sin(t * 1.3) * 0.03;
}

// possessedWalk: being PULLED, not walking. Stiff legs that hold at each extreme then snap through, body leaning back,
// head tipped back, arms trailing behind and twitching, no arm swing, almost no bob. Place c at the start mark facing the way
// he goes; returns the distance covered at time t (studs, ~1.3/s): root += forward * possessedWalk(c, lt).
export function possessedWalk(c, t) {
  const p = t * 1.8, s = Math.sin(p);
  const leg = Math.sign(s) * Math.pow(Math.abs(s), 0.35) * 0.62;
  c.legs[0].rotation.x = leg; c.legs[1].rotation.x = -leg;
  c.body.rotation.x = -0.3; c.body.position.y = Math.abs(Math.cos(p)) * 0.03;
  for (const [i, a] of c.arms.entries()) {
    a.rotation.x = 0.85 + Math.sin(t * 9 + i * 2) * 0.04;
    a.rotation.z = (i ? 0.28 : -0.28);
  }
  c.neck.rotation.x = -0.28; c.neck.rotation.z = Math.sin(t * 0.7) * 0.08;
  return t * 1.3;
}

// grabFrame: place c facing the door/window frame ~1.2 in front of it; both arms forward-up gripping, leaning in.
export function grabFrame(c, k = 1) {
  for (const [i, a] of c.arms.entries()) { a.rotation.x = -2.0 * k; a.rotation.z = (i ? -0.28 : 0.28) * k; }
  c.body.rotation.x = 0.08 * k;
}

// carry: both hands together in front at chest height; put the shoes ~1.0 in front of the chest (parent them to c.root or place in world).
export function carry(c, k = 1) {
  for (const [i, a] of c.arms.entries()) { a.rotation.x = -1.15 * k; a.rotation.z = (i ? -0.5 : 0.5) * k; }
}

// throwArm: right-arm overhead throw, t = 0..1 (0-0.45 wind up behind the head, 0.45-0.6 snap forward = release, then follow-through).
export function throwArm(c, t) {
  t = Math.min(1, Math.max(0, t));
  const wind = sm(Math.min(1, t / 0.45)), snap = sm(Math.min(1, Math.max(0, (t - 0.45) / 0.15)));
  const a = c.arms[0];
  a.rotation.x = -3.4 * wind + (3.4 - 1.0) * snap;  // up behind the head, then forward to -1.0
  a.rotation.z = -0.2 * wind;
  c.body.rotation.x = -0.15 * wind + 0.35 * snap;
  c.arms[1].rotation.x = -0.6 * wind;
}

// hug: place a first; b is moved in front of a facing it (closes from 2.4 to 1.3 apart as k goes 0..1), both arms around each other.
export function hug(a, b, k = 1) {
  const r = a.root.rotation.y, d = 2.4 - 1.1 * k, p = a.root.position;
  b.place(p.x + Math.sin(r) * d, p.y, p.z + Math.cos(r) * d, r + Math.PI);
  a.pose.hug(k); b.pose.hug(k);
  a.body.rotation.x = 0.06 * k; b.body.rotation.x = 0.06 * k;
}
