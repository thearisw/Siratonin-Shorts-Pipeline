// Shoes — shots_2 (43.069 → 90.523, lines 29–61): 121, Hale, 97, Lily, Ortiz, 80, 9:00 sneakers, throw, 10/11/11:30, wet socks.
import { THREE, V, clamp, easeOut, orbit, aim, shake, scene } from '../../kit/core.js';
import { setLook, focus } from '../../kit/look.js';

export function part(W) {
  const { STREET, PORCH, HOME, BEDS, NURSERY, WOODS, yawTo, street, porch, home, beds, nursery, woods,
    STREET_CAMS, PORCH_CAMS, HOME_CAMS, BEDS_CAMS, NURSERY_CAMS, WOODS_CAMS, CLOCK_CAMS,
    look_street, look_porch, look_home, look_beds, look_nursery, look_woods, look_clock,
    board, clock, snowfall, shovel, sneakers, boots, babyShoes, leoBoots, printsHale, printsLily,
    leo, max, mom, hale, lilyMom, lily, ortiz, crowd, carry, throwArm, hug, scared, sleepInBed } = W;
  const sw = (x, y, z) => STREET.clone().add(V(x, y, z)), pw = (x, y, z) => PORCH.clone().add(V(x, y, z));
  const bw = (x, y, z) => BEDS.clone().add(V(x, y, z)), nw = (x, y, z) => NURSERY.clone().add(V(x, y, z));
  const ww = (x, y, z) => WOODS.clone().add(V(x, y, z)), hw = (x, y, z) => HOME.clone().add(V(x, y, z));
  const E = (lt, d) => easeOut(clamp(lt / d, 0, 1));
  const up = (p, y) => p.clone().add(V(0, y, 0));
  // cam: [pos, look, fov] table entry; push = fraction toward look, yaw = orbit degrees around look, both easeOut over dur
  const cam = (c, lt, dur, push = 0.05, yaw = 0, fill = 2, roll = 0, sh = null) => {
    const k = E(lt, dur), off = c[0].clone().sub(c[1]);
    off.applyAxisAngle(V(0, 1, 0), THREE.MathUtils.degToRad(yaw * k)).multiplyScalar(1 - push * k);
    const p = c[1].clone().add(off); if (sh) p.add(sh);
    aim(p, c[1], c[2], roll, fill);
  };
  const oc = (look, dist, yaw, pitch, fov) => [orbit(look, dist, yaw, pitch), look, fov];
  const head = (c, dy = 0.55) => { c.root.updateMatrixWorld(true); return c.neck.getWorldPosition(V()).add(V(0, dy * c.root.scale.y, 0)); };
  const fwd = (c, d) => V(Math.sin(c.root.rotation.y) * d, 0, Math.cos(c.root.rotation.y) * d);
  const chest = (c, d = 1.0, y = 3.1) => c.root.position.clone().add(fwd(c, d)).add(V(0, y * c.root.scale.y, 0));
  const ext = n => { look_street(n); snowfall.update(T); };
  let T = 0;
  const S = (s, e, name, f) => ({ s, e, name, f: (lt, t) => { T = t; f(lt, t); } });

  const sm = street.marks, hp = sm.halePorch, lp = sm.lilyPorch, pm = porch.marks;
  const SHOVEL = V(-19.0, 0.0, -181.5);   // shovel's default spot (world_sets.js)
  const MAT = pm.mat, DECK = pm.doorway.y;
  const clockShot = (h, m, lt, yaw) => { look_clock('bloodmoon'); clock.set(h, m); cam(CLOCK_CAMS.clockClose, lt, 0.8, 0.05, yaw, 1.2); };
  const boardShot = (n, lt, yaw) => { ext('fog'); board.setCount(n); cam(STREET_CAMS.board, lt, 0.8, 0.06, yaw, 1); };

  // wet patch (melted snow) on Leo's blanket for the socks insert: shown only on the frame a shot arms it
  const wet = new THREE.Group(); wet.visible = false; scene.add(wet);
  {
    const stain = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshStandardMaterial({ color: 0x1c2a3a, roughness: 0.25, transparent: true, opacity: 0.75 }));
    stain.rotation.x = -Math.PI / 2; stain.scale.set(1.5, 1.1, 1); wet.add(stain);
    for (let i = 0; i < 5; i++) {
      const lump = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 2) * 0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xdfe7ef, roughness: 1 }));
      lump.position.set(Math.cos(i * 1.3) * 0.9, 0.08, Math.sin(i * 1.3) * 0.6); lump.scale.y = 0.55; wet.add(lump);
    }
  }
  W.resets = [...(W.resets || []), () => { wet.visible = false; }];   // shots.js before(t) runs these every frame
  const showWet = p => { wet.position.copy(p); wet.visible = true; };
  const feetOf = c => { c.root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(c.legs[0]).union(new THREE.Box3().setFromObject(c.legs[1])); return b; };

  return [
    // "121."
    S(43.069, 43.909, 'board121', lt => boardShot(121, lt, 4)),
    // "Then old Mr Hale's boots came home." — boots walking up the road, low
    S(43.909, 45.0, 'haleBootsWalk', lt => {
      ext('sunset'); const st = hp.clone().add(V(5.5, 0.04, 0.4));
      boots.place(st, yawTo(st, hp)); boots.walk(lt, 1.1);
      cam(oc(st.clone().add(V(-0.8, 0.5, 0)), 7, -62, 9, 34), lt, 1.1, 0.05, 4, 1.6);
    }),
    S(45.0, 45.763, 'haleBootsHome', lt => {
      ext('sunset'); boots.place(hp.clone().add(V(0.6, 0.0, 0)), street.facing.halePorch + Math.PI);
      cam(STREET_CAMS.halePorch, lt, 0.8, 0.05, -3, 1.6);
    }),
    // "He lived alone."
    S(45.763, 46.496, 'haleAlone', (lt, t) => {
      ext('sunset'); hale.place(hp.x - 1.2, hp.y, hp.z, street.facing.halePorch); hale.faceBlink('sad', t, 3);
      boots.place(hp.clone().add(V(1.0, 0, 0)), street.facing.halePorch + Math.PI); hale.neck.rotation.x = 0.3;
      cam(STREET_CAMS.halePorch, lt, 0.8, 0.06, 3, 1.6);
    }),
    // "He laughed, pulled them on"
    S(46.496, 47.643, 'haleLaugh', (lt, t) => {
      ext('sunset'); hale.place(hp.x - 1.2, hp.y, hp.z, street.facing.halePorch); hale.setFace('happy');
      if (lt < 0.55) { carry(hale); hale.body.position.y = Math.abs(Math.sin(lt * 14)) * 0.06; boots.place(chest(hale, 1.0, 2.9), hale.root.rotation.y); }
      else { const k = E(lt - 0.55, 0.3); hale.body.rotation.x = 0.5 * k; for (const a of hale.arms) a.rotation.x = -0.75 * k; boots.place(chest(hale, 0.7, 0.04), hale.root.rotation.y); }
      cam(oc(up(hale.root.position, 3.4), 15, 78, 5, 34), lt, 1.1, 0.04, -3, 1.6);
    }),
    // "and went out to shovel his porch."
    S(47.643, 48.883, 'haleShovel', (lt, t) => {
      ext('sunset'); shovel.show();
      hale.place(SHOVEL.x, 0.05, SHOVEL.z - 1.15, 0); hale.setFace('smirk');
      for (const [i, a] of hale.arms.entries()) { a.rotation.x = -1.05; a.rotation.z = i ? -0.3 : 0.3; }
      hale.body.rotation.x = 0.15 + 0.12 * Math.sin(lt * 6);
      cam(oc(V(SHOVEL.x, 3.0, SHOVEL.z - 0.8), 17, 38, 8, 36), lt, 1.2, 0.05, -4, 1.6);
    }),
    // "Midnight."
    S(48.883, 49.456, 'clock12a', lt => { look_clock('night'); clock.set(12, 0); cam(CLOCK_CAMS.clockClose, lt, 0.6, 0.05, 2, 1.2); }),
    // "Just a shovel, standing in the snow."
    S(49.456, 51.096, 'shovelAlone', lt => {
      ext('night'); shovel.show(); printsHale.reveal(1);
      cam(oc(V(SHOVEL.x + 0.5, 2.4, SHOVEL.z), 18, 112, 11, 36), lt, 1.6, 0.06, 4, 2.0);
    }),
    // "97."
    S(51.096, 51.829, 'board97', lt => boardShot(97, lt, -4)),
    // "Then baby Lily's tiny shoes came home."
    S(51.829, 53.0, 'babyShoesWalk', lt => {
      ext('sunset'); const st = lp.clone().add(V(-5.0, 0.04, -0.3));
      babyShoes.place(st, yawTo(st, lp)); babyShoes.walk(lt, 1.2);
      cam(oc(st.clone().add(V(0.6, 0.25, 0)), 6, 64, 8, 33), lt, 1.1, 0.05, -4, 1.6);
    }),
    S(53.0, 53.789, 'babyShoesHome', (lt, t) => {
      ext('sunset'); babyShoes.place(lp.clone().add(V(-0.6, 0, 0)), street.facing.lilyPorch + Math.PI);
      lilyMom.place(lp.x + 2.2, lp.y, lp.z, street.facing.lilyPorch); lilyMom.setFace('shocked'); lilyMom.pose.handsToFace(E(lt, 0.3));
      cam(STREET_CAMS.lilyPorch, lt, 0.8, 0.05, 3, 1.6);
    }),
    // "Her mom grabbed them"
    S(53.789, 54.669, 'lilyMomGrab', (lt, t) => {
      ext('sunset'); lilyMom.place(lp.x, lp.y, lp.z, street.facing.lilyPorch); lilyMom.setFace('worried');
      carry(lilyMom, E(lt, 0.3)); babyShoes.place(chest(lilyMom, 1.0, 3.0), lilyMom.root.rotation.y);
      cam(oc(up(lp, 3.5), 15, -78, 5, 34), lt, 0.9, 0.05, 3, 1.6);
    }),
    // "and hid them in the closet,"
    S(54.669, 55.416, 'closetHide', (lt, t) => {
      look_nursery('night'); nursery.closet.setOpen(1);
      const m = nursery.marks.closet; lilyMom.place(m.x, m.y, m.z, nursery.facing.closet); lilyMom.setFace('worried');
      const k = E(lt - 0.1, 0.5); carry(lilyMom, 1 - 0.4 * k); lilyMom.body.rotation.x = 0.3 * k;
      babyShoes.place(chest(lilyMom, 1.0 + 2.6 * k, 3.0 * (1 - k) + 0.02 / lilyMom.root.scale.y), lilyMom.root.rotation.y);
      cam(NURSERY_CAMS.closet, lt, 0.75, 0.04, -3, 1.8);
    }),
    // "so Lily would never see them."
    S(55.416, 56.603, 'closetShut', (lt, t) => {
      look_nursery('night'); nursery.closet.setOpen(1 - E(lt, 0.6));
      const m = nursery.marks.closet, c = nursery.marks.crib; lilyMom.place(m.x, m.y, m.z, nursery.facing.closet + (yawTo(m, c) - nursery.facing.closet) * E(lt - 0.4, 0.5));
      lilyMom.faceBlink('sad', t, 1);
      lily.place(c.x, c.y - 0.25, c.z + 0.8, 0); lily.pose.lie(1); lily.faceBlink('happy', t, 2);
      cam(NURSERY_CAMS.room, lt, 1.2, 0.05, 3, 1.8);
    }),
    // "At midnight, her mom was gone."
    S(56.603, 57.3, 'clock12b', lt => { look_clock('night'); clock.set(12, 0); cam(CLOCK_CAMS.clockClose, lt, 0.7, 0.05, -2, 1.2); }),
    S(57.3, 58.243, 'nurseryEmpty', lt => {
      look_nursery('night'); nursery.closet.setOpen(1);
      const c = nursery.marks.crib; lily.place(c.x, c.y - 0.25, c.z + 0.8, 0); sleepInBed(lily);
      cam(NURSERY_CAMS.room, lt, 1.0, 0.05, -3, 1.6);
    }),
    // "But Lily was still asleep in her crib." — ANOMALY, held
    S(58.243, 59.829, 'lilyAsleep', lt => {
      look_nursery('night'); const c = nursery.marks.crib; lily.place(c.x, c.y - 0.25, c.z + 0.8, 0); sleepInBed(lily);
      cam(NURSERY_CAMS.cribTop, lt, 1.6, 0.035, 2, 1.8);
    }),
    // "Strangely, the footprints outside were big."
    S(59.829, 60.85, 'liliPrintsWide', (lt, t) => {
      setLook('night'); focus(nw(-30, 0, 0)); snowfall.setOn(true); snowfall.update(t); printsLily.reveal(1);
      cam(NURSERY_CAMS.outside, lt, 1.0, 0.05, -3, 1.8);
    }),
    S(60.85, 61.896, 'lilyPrints', (lt, t) => {
      setLook('night'); focus(nw(-36, 0, 0)); snowfall.setOn(true); snowfall.update(t); printsLily.reveal(1);
      cam(NURSERY_CAMS.prints, lt, 1.0, 0.05, 3, 1.8);
    }),
    // "Grown-up big."
    S(61.896, 62.736, 'lilyPrintClose', (lt, t) => {
      setLook('night'); focus(nw(-34, 0, 2)); snowfall.setOn(true); snowfall.update(t); printsLily.reveal(1);
      cam(oc(nw(-34, 0.05, 2), 7.5, 20, 62, 34), lt, 0.8, 0.06, 5, 1.6);
    }),
    // "The whole town said her mom went looking for her."
    S(62.736, 63.6, 'townTalk', (lt, t) => {
      ext('fog'); const a = crowd[1], b = crowd[4], c0 = sw(0, 0.09, -90);
      a.place(c0.x - 1.4, c0.y, c0.z, Math.PI / 2); b.place(c0.x + 1.4, c0.y, c0.z, -Math.PI / 2);
      a.setFace('worried'); b.setFace('worried'); a.talk(Math.floor(t * 9) % 3); a.pose.point(0.4, 1);
      cam(oc(up(c0, 3.8), 20, 160, 6, 36), lt, 0.9, 0.05, -3, 1.2);
    }),
    S(63.6, 64.536, 'crowdBacks', (lt, t) => {
      ext('sunset'); const c0 = sm.crowdSpot;
      crowd.forEach((c, i) => { c.place(c0.x - 6 + i * 2.4, c0.y, c0.z + (i % 2) * 1.6, 0); c.setFace('worried'); });
      cam(STREET_CAMS.crowd, lt, 0.9, 0.05, 3, 1.6);
    }),
    // "Mr Ortiz sold hot cocoa"
    S(64.536, 66.083, 'ortizCocoa', (lt, t) => {
      ext('sunset'); const m = sm.cocoaStand; ortiz.place(m.x, m.y, m.z, street.facing.cocoaStand); ortiz.faceBlink('happy', t, 4); ortiz.pose.hold(0.8);
      const b = crowd[3]; b.place(m.x + 5.2, 0.09, m.z + 2.6, 0); b.root.rotation.y = yawTo(b.root.position, m); b.setFace('worried'); b.pose.hold(0.6);
      cam(STREET_CAMS.cocoa, lt, 1.4, 0.05, -4, 1.6);
    }),
    // "to everyone watching the woods."
    S(66.083, 67.056, 'crowdFaces', (lt, t) => {
      ext('sunset'); const c0 = sm.crowdSpot;
      crowd.forEach((c, i) => { c.place(c0.x - 6 + i * 2.4, c0.y, c0.z + (i % 2) * 1.6, 0); c.faceBlink(i % 3 ? 'worried' : 'sad', t, i); if (i % 2 === 0) c.pose.hold(0.7); });
      cam(oc(up(c0, 3.5), 24, 8, 7, 40), lt, 1.0, 0.04, -3, 1.8);
    }),
    // "Two dollars."
    S(67.056, 67.66, 'cocoaSign', lt => { ext('sunset'); cam(oc(sw(-13.74, 1.8, 12), 8, 90, 3, 34), lt, 0.6, 0.05, 3, 1.4); }),
    // "80."
    S(67.66, 68.203, 'board80', lt => boardShot(80, lt, 3)),
    // "Then, at 9:00,"  (bloodmoon from here)
    S(68.203, 69.38, 'clock9', lt => clockShot(9, 0, lt, 3)),
    // "I heard it."
    S(69.38, 69.949, 'leoHears', (lt, t) => {
      look_home('bloodmoon'); const m = home.marks.stairsBottom, cp = HOME_CAMS.stairs[0];
      leo.place(m.x, m.y, m.z, yawTo(m, cp)); leo.setFace('shocked'); scared(leo, 0.4);
      cam([cp, head(leo, 0.2), 32], lt, 0.6, 0.04, 2, 1.8);
    }),
    // "Step. Step. Step." — empty sneakers climbing our steps, low
    S(69.949, 70.55, 'stepsLow', (lt, t) => {
      look_porch('bloodmoon'); snowfall.update(t); sneakers.place(pm.steps, porch.facing.steps); sneakers.stepUp(t - 69.949, 2.2);
      cam(PORCH_CAMS.stepsLow, lt, 0.6, 0.05, 3, 1.8);
    }),
    S(70.55, 71.536, 'stepsSide', (lt, t) => {
      look_porch('bloodmoon'); snowfall.update(t); sneakers.place(pm.steps, porch.facing.steps); sneakers.stepUp(t - 69.949, 2.2);
      const p = sneakers.worldPos(); cam(oc(p.clone().add(V(0, 0.4, 0)), 7, 80, 6, 33), lt, 1.0, 0.04, -4, 1.8);
    }),
    // "Max's sneakers walked up our porch steps."
    S(71.536, 72.4, 'stepsFront', (lt, t) => {
      look_porch('bloodmoon'); snowfall.update(t); sneakers.place(pm.steps, porch.facing.steps); sneakers.stepUp(t - 69.949, 2.2);
      cam(PORCH_CAMS.steps, lt, 0.9, 0.05, -3, 1.8);
    }),
    S(72.4, 73.443, 'stepsHigh', (lt, t) => {
      look_porch('bloodmoon'); snowfall.update(t); sneakers.place(pm.steps, porch.facing.steps); sneakers.stepUp(t - 69.949, 2.2);
      cam(PORCH_CAMS.door, lt, 1.0, 0.05, 3, 1.8);
    }),
    // "Max screamed."
    S(73.443, 74.283, 'maxScream', (lt, t) => {
      look_porch('bloodmoon'); snowfall.update(t); porch.door.setOpen(1);
      sneakers.place(pm.steps, porch.facing.steps); sneakers.stepUp(99, 2.2);
      max.place(pm.doorway.x, DECK, pm.doorway.z + 0.6, 0); max.setFace('scream'); scared(max, E(lt, 0.25));
      cam(oc(head(max, 0.1), 14, -6, 4, 32), lt, 0.5, 0.05, 2, 2.2, 0, shake(t, 0.08 * Math.max(0, 1 - lt / 0.35)));
    }),
    // "Mom grabbed him."
    S(74.283, 75.069, 'momGrabs', (lt, t) => {
      look_porch('bloodmoon'); snowfall.update(t); porch.door.setOpen(1);
      max.place(pm.doorway.x, DECK, pm.doorway.z + 1.2, Math.PI); hug(max, mom, E(lt, 0.4));
      mom.setFace('worried'); max.setFace('crying');
      cam(oc(head(mom, 0.0), 20, 14, 9, 36), lt, 0.8, 0.05, -3, 2.2);
    }),
    // "I couldn't let him touch them."
    S(75.069, 76.069, 'leoDecides', (lt, t) => {
      look_porch('bloodmoon'); snowfall.update(t); porch.door.setOpen(1);
      sneakers.place(pm.steps, porch.facing.steps); sneakers.stepUp(99, 2.2);
      leo.place(0.3 + PORCH.x, DECK, MAT.z + 1.2, 0); leo.pose.lookAt(sneakers.worldPos(), 0.8); leo.neck.rotation.x = 0.3; leo.faceBlink('worried', t, 5);
      cam(oc(head(leo, 0.1), 13, -10, 6, 32), lt, 1.0, 0.04, 3, 2.2);
    }),
    // "So I picked them up myself,"
    S(76.069, 77.109, 'leoPicksUp', (lt, t) => {
      look_porch('bloodmoon'); snowfall.update(t); porch.door.setOpen(1);
      leo.place(PORCH.x, DECK, MAT.z + 2.4, 0); leo.setFace('worried');
      const k = E(lt, 0.5); leo.body.rotation.x = 0.45 * (1 - k); carry(leo, 0.6 + 0.4 * k);
      sneakers.place(chest(leo, 1.0, 1.2 + 1.9 * k), 0);
      cam(oc(V(PORCH.x, DECK + 2.6, MAT.z + 2.4), 16, 20, 6, 34), lt, 1.0, 0.05, -3, 2.2);
    }),
    // "ran them out to the woods"
    S(77.109, 78.016, 'leoRuns', (lt, t) => {
      look_woods('bloodmoon'); snowfall.update(t);
      leo.place(WOODS.x, 0, WOODS.z + 33 - 5.5 * lt, Math.PI); leo.run(lt * 13); carry(leo); leo.setFace('worried');
      sneakers.place(chest(leo, 1.0, 3.1), Math.PI);
      cam(oc(up(leo.root.position, 3.3), 18, 195, 6, 36), lt, 0.9, 0.04, 3, 2.2);
    }),
    // "and threw them as hard as I could."
    S(78.016, 79.203, 'leoThrows', (lt, t) => {
      look_woods('bloodmoon'); snowfall.update(t);
      const m = woods.marks.edge; leo.place(m.x, 0, m.z, Math.PI); leo.setFace('shocked');
      const tt = clamp(lt / 0.75, 0, 1); throwArm(leo, tt);
      const rel = 0.75 * 0.55, u = lt - rel;
      if (u < 0) sneakers.place(leo.root.position.clone().add(V(0.6, 5.4 + tt * 0.8, 0.7)), Math.PI);
      else { const p = leo.root.position.clone().add(V(0.6 + u * 0.8, 6.0 + u * 9 - u * u * 7, 0.7 - u * 17)); sneakers.place(p, Math.PI); sneakers.root.rotation.x = u * 14; }
      cam([ww(3, 5.5, 13), ww(0, 4.2, -9), 38], lt, 1.1, 0.04, -3, 2.2, 0, shake(t, 0.06 * clamp(1 - Math.abs(u) / 0.25, 0, 1)));
    }),
    // "10:00."
    S(79.203, 79.883, 'clock10', lt => clockShot(10, 0, lt, -3)),
    // "They were back on the porch."
    S(79.883, 80.989, 'sneakersBack', (lt, t) => {
      look_porch('bloodmoon'); snowfall.update(t); sneakers.place(MAT, porch.facing.mat);
      cam(oc(up(MAT, 0.5), 7, 15, 12, 33), lt, 1.1, 0.05, -4, 1.6);
    }),
    // "11:00."
    S(80.989, 81.776, 'clock11', lt => clockShot(11, 0, lt, 3)),
    // "Max was shaking under his blanket."
    S(81.776, 83.203, 'maxShiver', (lt, t) => {
      look_beds('bloodmoon'); const m = beds.marks.maxBed;
      max.place(m.x + Math.sin(t * 11) * 0.06, m.y - 0.5 * max.root.scale.y, m.z, beds.facing.maxBed); sleepInBed(max); max.faceBlink('worried', t, 6);
      max.neck.rotation.z = Math.sin(t * 9) * 0.08;
      cam(BEDS_CAMS.maxBedClose, lt, 1.4, 0.04, 3, 1.8);
    }),
    // "11:30."
    S(83.203, 83.989, 'clock1130', lt => clockShot(11, 30, lt, -3)),
    // "I shoved them inside my own boots,"
    S(83.989, 84.89, 'leoStuffs', (lt, t) => {
      look_beds('bloodmoon'); const m = beds.marks.leoFloor;
      leo.place(m.x, m.y, m.z, beds.facing.leoFloor); leo.setFace('worried'); leo.body.rotation.x = 0.65;
      for (const [i, a] of leo.arms.entries()) { a.rotation.x = -0.9 - 0.25 * Math.sin(lt * 9); a.rotation.z = i ? -0.2 : 0.2; }
      const bp = V(m.x - 1.9 - 0.5 * E(lt, 0.8), m.y, m.z); leoBoots.place(bp, -Math.PI / 2);
      sneakers.place(bp.clone().add(V(0.15, 1.6 - 1.2 * E(lt, 0.5), 0)), -Math.PI / 2);
      cam(oc(V(m.x - 1.2, 2.4, m.z), 17, 18, 12, 36), lt, 0.9, 0.05, 3, 1.8);
    }),
    // "under my bed,"
    S(84.89, 85.856, 'underBed', (lt, t) => {
      look_beds('bloodmoon'); const m = beds.marks.underBed, bp = V(m.x, m.y, m.z + 5.2 - 4.0 * E(lt, 0.7));
      leoBoots.place(bp, Math.PI); sneakers.place(bp.clone().add(V(0, 0.4, 0)), Math.PI);
      cam(BEDS_CAMS.underBed, lt, 0.9, 0.04, -3, 1.6);
    }),
    // "and sat on top of it all."
    S(85.856, 86.883, 'leoSits', (lt, t) => {
      look_beds('bloodmoon'); const m = beds.marks.leoBed;
      leo.place(m.x, m.y - 2.0, m.z, beds.facing.leoBed); leo.pose.sit(1); leo.pose.hug(0.5); leo.faceBlink('worried', t, 7);
      cam(BEDS_CAMS.leoBedTop, lt, 1.0, 0.05, -3, 1.8);
    }),
    // "That's when I noticed my socks."
    S(86.883, 88.149, 'leoNotices', (lt, t) => {
      look_beds('bloodmoon'); const m = beds.marks.leoBed;
      leo.place(m.x, m.y - 2.0, m.z, beds.facing.leoBed); leo.pose.sit(1); leo.pose.hug(0.5);
      leo.neck.rotation.x = 0.45 * E(lt - 0.3, 0.4); leo.setFace(lt < 0.6 ? 'worried' : 'shocked');
      cam(oc(head(leo, 0), 13, 12, 6, 32), lt, 1.2, 0.04, 3, 1.8);
    }),
    // "They were wet. Wet with..." — insert on Leo's feet, melted snow on the blanket
    S(88.149, 89.6, 'wetSocks', (lt, t) => {
      look_beds('bloodmoon'); const m = beds.marks.leoBed;
      leo.place(m.x, m.y - 2.0, m.z, beds.facing.leoBed); leo.pose.sit(1); leo.pose.hug(0.5); leo.setFace('shocked');
      const b = feetOf(leo), c = b.getCenter(V()), toe = V(c.x, m.y + 0.03, b.max.z - 0.3);
      showWet(toe);
      cam(oc(V(c.x, c.y, b.max.z - 0.6), 7, 25, 30, 33), lt, 1.4, 0.05, -4, 1.8);
    }),
    // "...snow I never walked in."
    S(89.6, 90.523, 'leoFear', (lt, t) => {
      look_beds('bloodmoon'); const m = beds.marks.leoBed;
      leo.place(m.x, m.y - 2.0, m.z, beds.facing.leoBed); leo.pose.sit(1); scared(leo, 0.6); leo.setFace('shocked');
      cam(oc(head(leo, 0), 13, -10, 5, 32), lt, 0.9, 0.05, -3, 1.8);
    }),
  ];
}
