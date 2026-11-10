# Shoes world digest (auto-extracted for shots agents; read this instead of world_sets.js)
```js
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
// ---- cams (verbatim) ----
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
export const PORCH_CAMS = {
  steps: C(pw(0, 1.6, 5.2), 16, 25, 10, 34),
  stepsLow: P(pw(1.4, 0.45, 13.6), pw(0, 1.0, 6.2), 33),
  door: P(pw(0, 7.6, 15), pw(0, 6.2, -3.8), 36),
  doorInside: P(pw(0, 8.2, -20), pw(0, 5.0, 5), 36),
  yard: P(pw(13, 7, 30), pw(0, 4, 4), 38),
  wide: P(pw(-9, 13, 44), pw(0, 9, -6), 40),
};
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
export const BEDS_CAMS = {
  leoRoom: P(bw_(-6, 8.5, 13.5), bw_(-18, 3, -9), 40),
  underBed: P(bw_(-18.5, 0.9, -3.8), bw_(-19, 0.8, -11.5), 34),
  leoBedTop: C(bw_(-19, 6.0, -10), 15, 20, 8, 34),
  maxRoom: P(bw_(5, 8, 13.5), bw_(15, 2.5, -10), 40),
  maxBedClose: P(bw_(17, 7.5, -0.6), bw_(15, 3.0, -13.2), 32),
  maxDoor: P(bw_(-18.8, 6.5, 13.5), bw_(0, 4, 6.5), 36),
};
export const NURSERY_CAMS = {
  crib: P(nw(1.5, 8.2, 4.5), nw(0, 2.6, -12), 34),
  cribTop: P(nw(0.4, 10.2, -8.6), nw(0, 2.0, -12.2), 34),
  closet: P(nw(-4.5, 6.5, 2.5), nw(13, 4.5, -3), 36),
  room: P(nw(-12.5, 8.5, 14), nw(3, 3, -7), 40),
  // extras (outdoors: call snowfall.setOn(true) in the shot)
  outside: P(nw(-48, 7, 13), nw(-18, 5, 0), 38),
  prints: P(nw(-24, 8.5, 15), nw(-42, 0.4, 0), 38),
};
export const WOODS_CAMS = {
  edge: P(ww(3, 6.5, 30), ww(0, 4.5, -4), 38),
  trail: P(ww(1.5, 5.2, 21), ww(0.5, 0.3, 5), 34),
  clearing: P(ww(3, 6, -17), ww(0, 3.5, -40), 38),
  deep: P(ww(-1, 6, -47), ww(4, 5, -76), 40),
};
export const CLOCK_CAMS = {
  clock: P(ck.center.clone().add(V(0, 0.3, 22)), ck.center.clone(), 34),
  clockClose: P(ck.center.clone().add(V(0.4, 0.6, 8.5)), ck.center.clone().add(V(0, 0.5, 0)), 33),
};
// ---- marks / facing per set, in file order: street, porch, home, beds, nursery, woods (verbatim lines) ----
229:  marks: {
230-    ruizPorch: RUIZ.front.clone(), halePorch: HALE.front.clone(), lilyPorch: LILY.front.clone(),
231-    chapelBoard: sw(0, 0.09, -200), crowdSpot: sw(0, 0.09, 22), cocoaStand: sw(-17.5, 0.05, 12),
234:  facing: { ruizPorch: RUIZ.facing, halePorch: HALE.facing, lilyPorch: LILY.facing, chapelBoard: Math.PI, crowdSpot: 0, cocoaStand: Math.PI / 2, streetMid: Math.PI, streetFar: Math.PI },
235-};
236-const sm = street.marks, up = (m, y) => m.clone().add(V(0, y, 0));
328:    marks: { steps: w(0, 0, 7.8), topStep: w(0, 2.5, 3.0), mat: w(0, 3.17, -2.4), doorway: w(0, 3.03, -4.3), yard: w(6, 0, 18), gate: w(0, 0, 33), hall: w(0, 3.03, -10) },
329:    facing: { steps: Math.PI, topStep: Math.PI, mat: Math.PI, doorway: Math.PI, yard: Math.PI, gate: Math.PI, hall: 0 },
330-  };
331-})();
398:    marks: { hallDoor: w(14, 0.03, 13.5), stairsTop: w(23, 10, -12), stairsBottom: w(23, 0.03, 10), armchair: w(-22, 0, -8),
399-      fireplace: w(-14, 0.02, -12), window: w(-17, 0.02, 13.6) },
400:    facing: { hallDoor: Math.PI, stairsTop: 0, stairsBottom: Math.PI, armchair: 0.5, fireplace: 0, window: 0 },
401-    seatY: 2.0,
402-  };
459:    marks: { leoBed: w(-19, 3.1, -10.5), underBed: w(-19, 0.02, -11.5), leoFloor: w(-15.4, 0.02, -9.5), maxBed: w(15, 2.5, -11.5), maxDoor: w(0, 0.03, 6.5), leoDoor: w(-6, 0.02, 13.8) },
460:    facing: { leoBed: 0, underBed: 0, leoFloor: -Math.PI / 2, maxBed: 0, maxDoor: -Math.PI / 2, leoDoor: 0 },
461-  };
462-})();
521:    marks: { crib: w(0, 2.0, -12.0), closet: w(10.5, 0.02, -3), closetInside: w(14.4, 0.02, -3), window: w(-13.6, 0.02, 0), door: w(10, 0.02, 13.6),
522-      outsideWindow: w(-18.5, 0, 0) },
523:    facing: { crib: 0, closet: Math.PI / 2, closetInside: -Math.PI / 2, window: -Math.PI / 2, door: Math.PI, outsideWindow: -Math.PI / 2 },
524-  };
525-})();
563:    marks: { edge: w(0, 0, -4), clearing: w(0, 0, -40), trailStart: w(0, 0, 24), trailEnd: w(4, 0, -72) },
564:    facing: { edge: Math.PI, clearing: Math.PI, trailStart: Math.PI, trailEnd: Math.PI },
565-  };
566-})();
// ---- footwear API ----
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
// ---- world_cast.js ----
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
  for (const [i, a] of c.arms.entries()) { a.rotation.x = -1.25; a.rotation.z = (i ? -0.85 : 0.85) + Math.sin(t * 47 + i) * 0.04; }
  c.body.position.x = Math.sin(t * 53) * 0.03; c.body.rotation.z = Math.sin(t * 41) * 0.025;
  c.neck.rotation.x = 0.18 + Math.sin(t * 37) * 0.03;
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
    a.rotation.x = 0.85 + Math.sin(t * 23 + i * 2) * 0.03;
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
```
