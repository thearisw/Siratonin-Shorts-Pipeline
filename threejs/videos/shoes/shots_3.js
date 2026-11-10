// Shoes — shots 3 (90.523 -> 123.6): 11:58-12:00, relief hug, twist walk, re-read flashes, doorframe, Max, kicker.
import { V, lerp, clamp, easeOut, aim, orbit, shake } from '../../kit/core.js';

const R2D = 180 / Math.PI;
// rotate a [pos, look, fov] cam around its look point (yaw deg), push in, easeOut
function tc(c, lt, dur, push = 0.04, yaw = 0, fill = 2, look = null) {
  const k = easeOut(lt / dur), L = look || c[1], d = c[0].clone().sub(c[1]), a = yaw * k / R2D;
  const x = d.x * Math.cos(a) + d.z * Math.sin(a), z = -d.x * Math.sin(a) + d.z * Math.cos(a);
  aim(L.clone().add(V(x, d.y, z).multiplyScalar(1 - push * k)), L, c[2], 0, fill);
}
// orbit around a target, push in + small yaw drift, easeOut
function oc(tg, dist, yaw, pitch, fov, lt, dur, push = 0.04, dy = 2, fill = 2, off = null) {
  const k = easeOut(lt / dur), p = orbit(tg, dist * (1 - push * k), yaw + dy * k, pitch);
  if (off) p.add(off);
  aim(p, tg, fov, 0, fill);
}
const headOf = (c, up = 0.8) => { c.root.updateMatrixWorld(true); return c.neck.getWorldPosition(V()).add(V(0, up * c.root.scale.y, 0)); };
const fwd = r => V(Math.sin(r), 0, Math.cos(r));

export function part(W) {
  const { PORCH, HOME, BEDS, NURSERY, porch, home, beds, nursery, street, clock, snowfall,
    leoBoots, slippers, boots, babyShoes, printsLeo, leo, max, gran, ruiz, hale, lilyMom, lily,
    STREET_CAMS, PORCH_CAMS, HOME_CAMS, BEDS_CAMS, NURSERY_CAMS, CLOCK_CAMS,
    look_porch, look_home, look_beds, look_nursery, look_street, look_clock,
    sleepInBed, knit, possessedWalk, grabFrame, carry, hug, yawTo } = W;
  const pw = (x, y, z) => PORCH.clone().add(V(x, y, z)), hw = (x, y, z) => HOME.clone().add(V(x, y, z)), bw = (x, y, z) => BEDS.clone().add(V(x, y, z));
  const BM = 'bloodmoon';

  // Max asleep in his bed (root lowered 0.5 * scale for lie)
  const maxAsleep = () => { const m = beds.marks.maxBed; max.place(m.x, m.y - 0.43, m.z, beds.facing.maxBed); sleepInBed(max); };
  // hug spot in Max's room: Leo faces +X, Max in his arms
  const hugSpot = (k = 1) => { const p = bw(13, 0, -5); leo.place(p.x, p.y, p.z, Math.PI / 2); hug(leo, max, k); };
  // twist walk in Max's room: from the hug spot toward the doorway
  const walkStart = bw(13, 0, -5), walkYaw = yawTo(walkStart, beds.marks.maxDoor);
  const walkLeo = tt => { const d = possessedWalk(leo, tt); const p = walkStart.clone().add(fwd(walkYaw).multiplyScalar(d)); leo.place(p.x, p.y, p.z, walkYaw); possessedWalk(leo, tt); };
  // barefoot in the yard: Leo walks +Z from the steps, prints revealed up to him (trail ~69 long, starts z 8.4)
  const yardLeo = (tt, z0) => {
    const z = z0 + possessedWalk(leo, tt); leo.place(PORCH.x + 0.6, 0, PORCH.z + z, 0); possessedWalk(leo, tt);
    printsLeo.reveal(clamp((z - 8.4 - 0.8) / 69, 0.001, 1)); return z;
  };
  // doorframe: Leo faces the house (PI), pulled out backward one step at a time (global time)
  const pullZ = t => { if (t < 112.4) return -3.1; const n = Math.min((t - 112.4) / 0.5, 5.5), i = Math.floor(n); return -3.1 + i + easeOut(clamp((n - i) / 0.5, 0, 1)); };
  const pullLeo = (t, grip = 1) => {
    const z = pullZ(t); leo.place(PORCH.x, PORCH.y + 3.03, PORCH.z + z, Math.PI);
    if (t > 112.4) possessedWalk(leo, t - 112.4);
    grabFrame(leo, grip); leo.body.rotation.x = -0.12; leo.setFace('scream');
  };
  // Max on the porch side of the doorway, x -1.5 (keeps the doorway line clear)
  const maxAtDoor = (z, face = 'shocked') => { const p = pw(-1.5, 3.17, z); max.place(p.x, p.y, p.z, yawTo(p, pw(0, 0, 2))); max.setFace(face); };
  const kickT = t => t - 118.219;
  const bootsUp = t => { leoBoots.place(porch.marks.steps, porch.facing.steps); leoBoots.stepUp(kickT(t), 2.6); };
  const ext = t => snowfall.update(t);

  return [
    // "11:58."
    { s: 90.523, e: 91.469, name: 'clock1158', f(lt) { look_clock(BM); clock.set(11, 58); tc(CLOCK_CAMS.clockClose, lt, 0.95, 0.05, 3, 1.5); } },
    // "11:59."
    { s: 91.469, e: 92.469, name: 'clock1159', f(lt) { look_clock(BM); clock.set(11, 59); tc(CLOCK_CAMS.clock, lt, 1.0, 0.06, -3, 1.5); } },
    // "12:00." (tiny shake on the strike)
    { s: 92.469, e: 93.149, name: 'clock1200', f(lt, t) {
      look_clock(BM); clock.set(12, 0); const c = CLOCK_CAMS.clockClose, a = Math.max(0, 1 - lt / 0.3);
      aim(c[0].clone().add(shake(t, 0.1 * a)), c[1], c[2], 0.02 * a * Math.sin(t * 12), 1.5);
    } },
    // "I ran to Max's room."
    { s: 93.149, e: 94.256, name: 'runToMax', f(lt) {
      look_beds(BM); const p = bw(-11 + lt * 8.5, 0, 8.2); leo.place(p.x, p.y, p.z, Math.PI / 2); leo.run(lt * 9); leo.setFace('worried');
      tc(BEDS_CAMS.maxDoor, lt, 1.1, 0.05, 3, 1.8, bw(-4 + lt * 4, 3.8, 7));
    } },
    // "He was still there."
    { s: 94.256, e: 95.096, name: 'maxStillThere', f(lt) { look_beds(BM); maxAsleep(); tc(BEDS_CAMS.maxBedClose, lt, 0.85, 0.05, -2, 1.8); } },
    // "Snoring."
    { s: 95.096, e: 95.669, name: 'snoring', f(lt, t) {
      look_beds(BM); maxAsleep(); max.neck.rotation.z = 0.04 * Math.sin(t * 9);
      oc(headOf(max, 0), 12, 20, 35, 32, lt, 0.57, 0.04, -2, 1.8);
    } },
    // "He was safe."
    { s: 95.669, e: 96.403, name: 'leoRelief', f(lt) {
      look_beds(BM); maxAsleep(); const r = -0.43, p = bw(13, 0, -4); leo.place(p.x, p.y, p.z, r); leo.setFace('happy');
      leo.body.rotation.x = -0.05 * easeOut(lt / 0.5); oc(headOf(leo), 13, r * R2D, 4, 32, lt, 0.73, 0.04, 2, 1.8);
    } },
    // "I hugged him and laughed"
    { s: 96.403, e: 97.336, name: 'hug', f(lt) {
      look_beds(BM); hugSpot(easeOut(lt / 0.4)); leo.setFace('happy'); max.setFace('sleeping');
      tc(BEDS_CAMS.maxRoom, lt, 0.93, 0.04, 2, 1.8, bw(13.6, 3.6, -5));
    } },
    // "so hard I cried."
    { s: 97.336, e: 98.469, name: 'laughCry', f(lt, t) {
      look_beds(BM); hugSpot(1); max.setFace('sleeping'); leo.setFace(Math.floor(lt * 5) % 2 ? 'crying' : 'happy');
      leo.body.rotation.z = Math.sin(t * 9) * 0.04; oc(headOf(leo), 13, 20, 5, 32, lt, 1.13, 0.05, 3, 1.8);
    } },
    // "Then"
    { s: 98.469, e: 99.109, name: 'smileDrops', f(lt) {
      look_beds(BM); hugSpot(1 - 0.3 * easeOut(lt / 0.6)); max.setFace('sleeping'); leo.setFace(lt < 0.22 ? 'happy' : 'shocked');
      oc(headOf(leo), 13, -18, 4, 32, lt, 0.64, 0.05, -2, 1.8);
    } },
    // "my feet started walking."
    { s: 99.109, e: 100.003, name: 'feetWalk', f(lt) {
      look_beds(BM); walkLeo(lt); const f = leo.root.position.clone().add(V(0, 0.9, 0));
      oc(f, 7, walkYaw * R2D + 55, 8, 34, lt, 0.9, 0.04, 4, 1.8);
    } },
    // "I didn't tell them to."
    { s: 100.003, e: 100.949, name: 'pulledOut', f(lt) {
      look_beds(BM); walkLeo(0.9 + lt); leo.setFace('scream');
      const m = bw(14.6, 0, -5); max.place(m.x, m.y, m.z, -Math.PI / 2); max.setFace('sleeping');
      oc(headOf(leo, 0.3), 15, walkYaw * R2D + 12, 4, 34, lt, 0.95, 0.03, -3, 1.8);
    } },
    // "Down the stairs."
    { s: 100.949, e: 101.736, name: 'stairs', f(lt) {
      look_home(BM); const A = hw(23, 10, -9.64), B = hw(23, 0.03, 10), d = possessedWalk(leo, lt), u = 0.3 + d * 1.6 / 19.6;
      const p = A.clone().lerp(B, u); leo.place(p.x, p.y, p.z, 0); possessedWalk(leo, lt); leo.setFace('scream');
      tc(HOME_CAMS.stairs, lt, 0.79, 0.04, 2, 1.8, headOf(leo, -1));
    } },
    // "Out the door."
    { s: 101.736, e: 102.363, name: 'outDoor', f(lt, t) {
      look_porch(BM); ext(t); porch.door.setOpen(1); const d = possessedWalk(leo, lt);
      leo.place(PORCH.x, PORCH.y + 3.03, PORCH.z - 7 + d * 1.6, 0); possessedWalk(leo, lt);
      tc(PORCH_CAMS.doorInside, lt, 0.63, 0.05, -2, 2);
    } },
    // "Barefoot in the snow."
    { s: 102.363, e: 103.309, name: 'barefoot', f(lt, t) {
      look_porch(BM); ext(t); porch.door.setOpen(1); const z = yardLeo(lt, 11); leo.setFace('worried');
      oc(pw(0.6, 2.4, z), 18, 15, 4, 36, lt, 0.95, 0.04, 3, 2.2);
    } },
    // "Mrs Ruiz touched her slippers." (re-read flash, night)
    { s: 103.309, e: 104.789, name: 'flashRuiz', f(lt, t) {
      look_street('night'); ext(t); const m = street.marks.ruizPorch, r = street.facing.ruizPorch; ruiz.place(m.x, m.y, m.z, r); carry(ruiz); ruiz.setFace('happy');
      const sp = m.clone().add(fwd(r).multiplyScalar(1.0)); slippers.place(sp.x, m.y + 2.6, sp.z, r);
      tc(STREET_CAMS.ruizPorch, lt, 1.48, 0.06, 3, 2.2);
    } },
    // "Mr Hale touched his boots."
    { s: 104.789, e: 106.083, name: 'flashHale', f(lt, t) {
      look_street('night'); ext(t); const m = street.marks.halePorch, r = street.facing.halePorch; hale.place(m.x, m.y, m.z, r); hale.setFace('smirk');
      const k = easeOut(lt / 0.8); hale.body.rotation.x = 0.45 * k; for (const a of hale.arms) a.rotation.x = -0.9 * k;
      const bp = m.clone().add(fwd(r).multiplyScalar(1.3)); boots.place(bp.x, m.y, bp.z, r + Math.PI);
      tc(STREET_CAMS.halePorch, lt, 1.29, 0.06, -3, 2.2);
    } },
    // "Lily's mom touched Lily's shoes."
    { s: 106.083, e: 107.669, name: 'flashLilyMom', f(lt, t) {
      look_street('night'); ext(t); const m = street.marks.lilyPorch, r = street.facing.lilyPorch; lilyMom.place(m.x, m.y, m.z, r); carry(lilyMom); lilyMom.setFace('happy');
      const sp = m.clone().add(fwd(r).multiplyScalar(1.0)); babyShoes.place(sp.x, m.y + 2.6, sp.z, r);
      tc(STREET_CAMS.lilyPorch, lt, 1.59, 0.06, 3, 2.2);
    } },
    // "Lily never did."
    { s: 107.669, e: 108.563, name: 'flashLily', f(lt) {
      look_nursery('night'); const m = nursery.marks.crib; lily.place(m.x, m.y - 0.22, m.z, nursery.facing.crib); sleepInBed(lily);
      tc(NURSERY_CAMS.cribTop, lt, 0.89, 0.05, -3, 1.5);
    } },
    // "And neither did Max."
    { s: 108.563, e: 109.536, name: 'maxDoorway', f(lt, t) {
      look_porch(BM); ext(t); porch.door.setOpen(1); const m = porch.marks.doorway; max.place(m.x, m.y, m.z, 0); max.setFace('worried');
      tc(PORCH_CAMS.door, lt, 0.97, 0.05, -2, 2.2, headOf(max, 0.2));
    } },
    // "Shoes don't care"
    { s: 109.536, e: 110.229, name: 'granFace', f(lt, t) {
      look_home(BM); const m = home.marks.armchair, r = home.facing.armchair; gran.place(m.x, m.y, m.z, r); knit(gran, t);
      gran.neck.rotation.x = 0.05; gran.setFace(lt < 0.35 ? 'worried' : 'sad');
      oc(headOf(gran), 13, r * R2D, 3, 32, lt, 0.69, 0.05, 2, 1.8);
    } },
    // "whose feet they're on."
    { s: 110.229, e: 111.096, name: 'bareFeet', f(lt, t) {
      look_porch(BM); ext(t); const z = yardLeo(lt + 1, 11);
      oc(pw(0.6, 0.9, z), 7, 150, 9, 34, lt, 0.87, 0.04, 4, 2.2);
    } },
    // "I grabbed the doorframe."
    { s: 111.096, e: 112.203, name: 'grabFrame', f(lt, t) {
      look_porch(BM); ext(t); porch.door.setOpen(1); pullLeo(t, easeOut(lt / 0.3));
      oc(headOf(leo, 0.2), 15, 192, 3, 34, lt, 1.1, 0.05, -3, 2.2);
    } },
    // "My fingers slipped."
    { s: 112.203, e: 113.149, name: 'fingersSlip', f(lt, t) {
      look_porch(BM); ext(t); porch.door.setOpen(1); pullLeo(t, 1);
      leo.arms[0].rotation.x = -2.0 + 0.5 * easeOut(clamp((lt - 0.45) / 0.3, 0, 1)) + Math.sin(t * 10) * 0.04;
      const hp = headOf(leo, 0.4).add(V(0, 0, -1.4));
      oc(hp, 7, 200, 6, 34, lt, 0.95, 0.04, 3, 2.2);
    } },
    // "One."
    { s: 113.149, e: 113.763, name: 'oneFace', f(lt, t) {
      look_porch(BM); ext(t); porch.door.setOpen(1); pullLeo(t, 0.9);
      oc(headOf(leo, 0.2), 13, 180, 0, 32, lt, 0.61, 0.04, 2, 2.2);
    } },
    // "By. One."
    { s: 113.763, e: 114.843, name: 'dragWide', f(lt, t) {
      look_porch(BM); ext(t); porch.door.setOpen(1); pullLeo(t, 0.8);
      tc(PORCH_CAMS.yard, lt, 1.08, 0.05, -3, 2.2, pw(0, 5, -1));
    } },
    // "Max ran to the door."
    { s: 114.843, e: 115.843, name: 'maxRuns', f(lt, t) {
      look_porch(BM); ext(t); porch.door.setOpen(1); pullLeo(t, 0.8);
      const z = lerp(-12, -2.4, easeOut(clamp(lt / 0.8, 0, 1))); maxAtDoor(z); if (lt < 0.8) max.run(lt * 10);
      const L = headOf(max, 0.2); aim(pw(-9, 8, 16).lerp(L, 0.04 * easeOut(lt)), L, 34, 0, 2.2);
    } },
    // MAX: "Where are you going?"
    { s: 115.843, e: 116.565, name: 'maxAsks', f(lt, t) {
      look_porch(BM); ext(t); porch.door.setOpen(1); pullLeo(t, 0.8); maxAtDoor(-2.4); max.pose.point(easeOut(lt / 0.4), 0);
      const L = headOf(max, 0.2); aim(pw(-8, 7, 15).lerp(L, 0.05 * easeOut(lt / 0.72)), L, 34, 0, 2.2);
    } },
    // "What's mine is yours," I whispered.
    { s: 116.565, e: 118.219, name: 'whisper', f(lt, t) {
      look_porch(BM); ext(t); porch.door.setOpen(1); pullLeo(t, 0.5); leo.setFace('sad'); maxAtDoor(-2.4, 'crying');
      leo.talk(t < 117.62 ? [1, 2, 0][Math.floor(t * 14) % 3] : 0);
      oc(headOf(leo, 0.2), 13, 180, 0, 32, lt, 1.65, 0.06, 2, 2.2);
    } },
    // "The next night, a pair of boots" (kicker, night)
    { s: 118.219, e: 119.313, name: 'kickWide', f(lt, t) {
      look_porch('night'); ext(t); bootsUp(t); const p = pw(0, 3.03, -0.3); max.place(p.x, p.y, p.z, 0); max.setFace('sad');
      tc(PORCH_CAMS.wide, lt, 1.09, 0.05, 2, 2);
    } },
    // "walked up our porch."
    { s: 119.313, e: 120.553, name: 'bootsClimb', f(lt, t) {
      look_porch('night'); ext(t); bootsUp(t); tc(PORCH_CAMS.stepsLow, lt, 1.24, 0.05, -3, 2, leoBoots.worldPos().add(V(0, 0.5, 0)));
    } },
    // "My boots."
    { s: 120.553, e: 121.233, name: 'myBoots', f(lt, t) {
      look_porch('night'); ext(t); bootsUp(t); const b = leoBoots.worldPos().add(V(0, 0.4, 0));
      oc(b, 7, 35, 12, 33, lt, 0.68, 0.05, 3, 2);
    } },
    // "And Max reached for them." (final, settles slowly)
    { s: 121.233, e: 123.6, name: 'maxReaches', f(lt, t) {
      look_porch('night'); ext(t); bootsUp(t); const p = pw(0, 3.03, -0.3); max.place(p.x, p.y, p.z, 0);
      const k = easeOut(lt / 2.3); max.setFace(lt < 0.9 ? 'sad' : 'worried');
      for (const [i, a] of max.arms.entries()) { a.rotation.x = -0.6 - 0.75 * k; a.rotation.z = (i ? -0.12 : 0.12); }
      max.body.rotation.x = 0.3 * k; max.neck.rotation.x = 0.25 * k;
      const tg = pw(0, 4.0, 1.0); const kk = easeOut(lt / 2.37);
      aim(orbit(tg, lerp(10.5, 9.2, kk), lerp(44, 40, kk), lerp(10, 8, kk)), tg, 34, 0, 2);
    } },
  ];
}
