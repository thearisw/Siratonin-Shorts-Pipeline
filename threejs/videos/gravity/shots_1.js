// Crush Gravity: shots 0.00 -> 25.15 (lines 0-9). Coordinates come from world_index.js marks/cams.
import { V, aim, shake, easeOut, easeIn, lerp, clamp } from '../../kit/core.js';
import { focus } from '../../kit/look.js';

export function part(W) {
  const { hero, rose, hale, kids, CEIL, floatPose, ceilingPose, heavyPose, armsCrossed, crack, books, floatFx,
          look_school, look_outside } = W;

  // ---- marks (world_index.js) ----
  const M = {
    hall: { hero: [-63, 0, 3, 0.5], rose: [-57, 0, 3, -0.5],
      kid: [[-71, 0, -4, 0.4], [-67, 0, -9, 0.2], [-60, 0, -10, 0], [-53, 0, -9, -0.2], [-48, 0, -4, -0.4], [-74, 0, 4, 0.6]],
      fhero: [-61.5, 7, 2, 0.3], frose: [-58.5, 7, 2, -0.3],
      cHero: [-63, 14, 2, 0.4], cRose: [-57, 14, 2, -0.4],
      ckid: [[-72, 14, -3, 0.3], [-66, 14, -8, 0], [-60, 14, -5, 0], [-54, 14, -8, 0], [-48, 14, -3, -0.3], [-69, 14, 5, 0.3]] },
    gym: { hero: [-18, 0, 4, 0.5], rose: [-12, 0, 4, -0.5],
      kid: [[-28, 0, -6, 0.4], [-22, 0, -8, 0.2], [-15, 0, -9, 0], [-8, 0, -8, -0.2], [-2, 0, -6, -0.4], [2, 0, 3, -0.6]] },
    out: { rose: [300, 6, -4, 0], hero: [306, 0, 0, -0.4],
      fk: [[290, 9, -6, 0.3], [294, 13, -10, 0.2], [305, 11, -8, -0.2], [310, 7, -3, -0.3], [287, 4, 1, 0.4], [314, 14, -12, -0.2]],
      gk: [[292, 0, 2, 0.3], [298, 0, 4, 0], [304, 0, 4, 0], [310, 0, 2, -0.3]] },
    off: { hale: [67, 0, -8, 0], haleSeat: [67, 0, -8.5, 0], hero: [71, 0, 2, -2.6], ckid: [63, 12, 0, 0] },
  };
  const at = (c, m, dy = 0) => c.place(m[0], m[1] + dy, m[2], m[3]);
  const hideAll = (...cs) => { for (const c of cs) c.hide(); };
  const hideKids = (from = 0) => { for (let i = from; i < kids.length; i++) kids[i].hide(); };

  // camera: [pos, look, fov] from the index; slow easeOut push + drift, optional impact shake
  const cam = (c, lt, d, o = {}) => {
    const { push = 0.05, drift = 0.6, fill = 0.6, pull = 1, shk = 0, shkT = 0 } = o;
    const [p, l, fov] = c, look = V(l[0], l[1], l[2]);
    const pos = V(p[0], p[1], p[2]);
    pos.sub(look).multiplyScalar(pull).add(look);        // pull > 1 = further back
    const k = easeOut(lt / d);
    pos.lerp(look, push * k); pos.x += drift * (k - 0.5);
    if (shk) pos.add(shake(lt, shk * Math.max(0, 1 - (lt - shkT) / 0.35) * (lt >= shkT ? 1 : 0)));
    aim(pos, look, fov, 0, fill);
    focus(look);
  };
  const C = {
    oRose: [[300, 7, 11], [300, 8.2, -4], 32], oHook: [[300, 9, 52], [300, 10, -6], 40], oYard: [[300, 6, 28], [300, 5, -2], 40],
    oGround: [[299, 2.5, 26], [299, 3, 3], 36],
    ofWide: [[67, 6.5, 30], [67, 5, -3], 38], ofHale: [[67.5, 5.4, 7], [67, 4.8, -8], 34], ofPoint: [[67, 3.5, 12], [67, 8, -6], 36],
    ofCeil: [[64, 6, 16], [63, 10, 0], 36], ofHero: [[71, 5.4, 17], [71, 4.4, 2], 34],
    hWide: [[-60, 7.5, 34], [-60, 6, 0], 40], hTwo: [[-60, 5.2, 24], [-60, 4.2, 3], 36], hHero: [[-61.5, 5.2, 19], [-63, 4.4, 3], 34],
    hRoseFace: [[-58, 5.4, 17], [-57, 4.8, 3], 32], hLow: [[-60, 2.5, 30], [-60, 11, 0], 40], hFloat: [[-60, 8, 23], [-60, 7.5, 2], 36],
    gTwo: [[-15, 5.2, 25], [-15, 4.2, 4], 36], gRose: [[-13, 5.2, 20], [-12, 4.4, 4], 34], gHero: [[-17, 5.2, 20], [-18, 4.4, 4], 34],
    gWide: [[-15, 9, 40], [-15, 7, 0], 40], gCrack: [[-15, 6, 9], [-15, 0, 3], 33],
  };

  // ---- scene builders ----
  const roseTalk = (face) => { rose.setFace(face); };

  function hallStand(lt, opts = {}) {            // everyone standing in the hall
    at(hero, M.hall.hero); at(rose, M.hall.rose);
    M.hall.kid.forEach((m, i) => at(kids[i], m));
    hale.hide();
    armsCrossed(rose, 1);
    hero.pose.armsOut(opts.heroArms || 0);
    hero.setFace(opts.hero || 'happy');
    kids.forEach((k, i) => k.setFace(i % 2 ? 'happy' : 'smirk'));
  }
  function hallRise(q, t) {                     // q 0..1: everyone drifts up to the ceiling spots
    const e = easeIn(q) * 0.95 + q * 0.05;
    const mix = (a, b) => [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e), a[3]];
    at(hero, mix(M.hall.hero, M.hall.cHero)); floatPose(hero, e, t, 1);
    at(rose, mix(M.hall.rose, M.hall.cRose)); floatPose(rose, e, t, 2);
    M.hall.kid.forEach((m, i) => { at(kids[i], mix(m, M.hall.ckid[i])); floatPose(kids[i], e, t, 3 + i); });
  }
  function hallCeil(t) {
    at(hero, M.hall.cHero); ceilingPose(hero, 1);
    at(rose, M.hall.cRose); ceilingPose(rose, 1);
    M.hall.ckid.forEach((m, i) => { at(kids[i], m); ceilingPose(kids[i], 1); });
  }
  function gymHeavy(k) {
    at(hero, M.gym.hero); heavyPose(hero, k);
    at(rose, M.gym.rose); heavyPose(rose, k);
    M.gym.kid.forEach((m, i) => { at(kids[i], m); heavyPose(kids[i], k); });
    hale.hide();
  }
  const sitHale = () => { at(hale, M.off.haleSeat); hale.pose.sit(1); hale.arms.forEach(a => { a.rotation.x = -0.9; }); };

  const shots = [];
  const add = (s, e, name, f) => shots.push({ s, e, name, f });

  // 0 "When my crush is happy," cover: Rose floating, slight smile, close
  add(0.00, 1.07, 'rose_float_cover', (lt, t) => {
    look_outside(); hideAll(hero, hale); hideKids();
    at(rose, M.out.rose); floatPose(rose, 1, t, 2); rose.setFace('girl_slight_smile');
    floatFx.set(true, V(300, 7, -4), 6);
    cam(C.oRose, lt, 1.07, { push: 0.04, drift: 0.5, fill: 0.7 });
  });
  // 0 "everyone at school floats" wide
  add(1.07, 2.49, 'yard_float_wide', (lt, t) => {
    look_outside(); hale.hide();
    at(rose, M.out.rose); floatPose(rose, 1, t, 2); rose.setFace('girl_slight_smile');
    M.out.fk.forEach((m, i) => { at(kids[i], m); floatPose(kids[i], 1, t, 3 + i); kids[i].setFace('happy'); });
    at(hero, M.out.hero); hero.setFace('shocked'); hero.pose.armsOut(0.3);
    floatFx.set(true, V(300, 8, -6), 16);
    cam(C.oHook, lt, 1.42, { push: 0.04, drift: -1, fill: 0.5 });
  });
  // 1 "everything gets heavy" kids flattened on the ground
  add(2.49, 4.35, 'yard_heavy', (lt, t) => {
    look_outside(); hideAll(hero, hale);
    M.out.gk.forEach((m, i) => { at(kids[i], m); heavyPose(kids[i], easeOut(lt / 0.3)); kids[i].setFace('sad'); });
    kids[4].hide(); kids[5].hide();
    at(rose, [300, 0, -4, 0]); heavyPose(rose, 1); rose.setFace('neutral_droopy_eyes_girl');
    cam(C.oGround, lt, 1.86, { push: 0.04, drift: 0.5, fill: 0.6, shk: 0.08, shkT: 0.02 });
  });
  // 2 "So the principal gave me one rule:" office wide, Hale at desk
  add(4.35, 6.00, 'office_rule', (lt, t) => {
    look_school(); hideAll(rose); hideKids();
    sitHale(); hale.setFace('smirk');
    at(hero, M.off.hero); hero.setFace('happy'); hero.neck.rotation.y = 0.3;
    cam(C.ofWide, lt, 1.65, { push: 0.05, drift: 0.8, fill: 0.5 });
  });
  // 2 "keep Rose calm." Rose arms crossed, deadpan, hall
  add(6.00, 7.28, 'rose_calm', (lt, t) => {
    look_school(); hideAll(hero, hale); hideKids();
    at(rose, M.hall.rose); armsCrossed(rose, 1); rose.setFace('neutral_droopy_eyes_girl');
    cam(C.hRoseFace, lt, 1.28, { push: 0.05, drift: -0.5, fill: 0.7 });
  });
  // 2 "The ceiling is very hard." kid pressed on the office ceiling
  add(7.28, 8.68, 'kid_ceiling', (lt, t) => {
    look_school(); hideAll(hero, rose, hale); hideKids(1);
    at(kids[0], M.off.ckid); ceilingPose(kids[0], 1); kids[0].setFace('shocked');
    cam(C.ofCeil, lt, 1.4, { push: 0.04, drift: 0.6, fill: 0.6, shk: 0.09, shkT: 0.95 });   // thud on "hard" (8.24)
  });
  // 3 "Then he said something weird." hero reacts
  add(8.68, 9.79, 'hero_weird', (lt, t) => {
    look_school(); hideAll(rose, hale); hideKids();
    at(hero, [71, 0, 2, 0]); hero.setFace('worried'); hero.neck.rotation.z = 0.15 * easeOut(lt / 0.5);
    cam(C.ofHero, lt, 1.11, { push: 0.05, drift: 0.5, fill: 0.7 });
  });
  // 4 HALE "Never watch her face."
  add(9.79, 11.82, 'hale_face', (lt, t) => {
    look_school(); hideAll(hero, rose); hideKids();
    at(hale, M.off.hale); hale.setFace('smirk'); hale.pose.point(1, 0);
    if (lt > 1.14) hale.arms[0].rotation.x = -1.5 - 1.5 * easeOut(Math.min(1, (lt - 1.14) / 0.3));   // "Watch the ceiling": points up
    cam(C.ofHale, lt, 2.03, { push: 0.05, drift: 0.5, fill: 0.7 });
  });
  // 5 "On Monday, I told her a joke" hero + Rose in the hall
  add(11.82, 13.62, 'hall_joke', (lt, t) => {
    look_school(); hideAll(hale); hideKids();
    at(hero, M.hall.hero); hero.setFace('happy'); hero.pose.armsOut(0.5 + 0.2 * Math.sin(t * 5));
    at(rose, M.hall.rose); armsCrossed(rose, 1); rose.setFace('neutral_droopy_eyes_girl');
    cam(C.hTwo, lt, 1.8, { push: 0.04, drift: 0.6, fill: 0.7 });
  });
  // 6 ROSE "That's so dumb." hmph
  add(13.62, 14.61, 'rose_dumb', (lt, t) => {
    look_school(); hideAll(hero, hale); hideKids();
    at(rose, M.hall.rose); armsCrossed(rose, 1); rose.setFace('tsundere_hmph_girl');
    cam(C.hRoseFace, lt, 0.99, { push: 0.06, drift: 0.4, fill: 0.7 });
  });
  // 7 "She didn't even smile." deadpan, tiny lift starts
  add(14.61, 15.88, 'rose_no_smile', (lt, t) => {
    look_school(); hideAll(hale); hideKids();
    at(hero, M.hall.hero); hero.setFace('worried');
    at(rose, M.hall.rose, 0.35 * easeIn(lt / 1.27)); armsCrossed(rose, 1); rose.setFace('neutral_droopy_eyes_girl');
    cam(C.hTwo, lt, 1.27, { push: 0.06, drift: 0.5, fill: 0.7 });
  });
  // 7 "Then the whole hallway" everyone rises, books float
  add(15.88, 16.95, 'hall_rise', (lt, t) => {
    look_school(); hideAll(hale);
    hallRise(lt / 1.07 * 0.85, t);
    rose.setFace('girl_blushing_closed_mouth'); hero.setFace('shocked'); kids.forEach(k => k.setFace('shocked'));
    books.set(lt / 1.07, t);
    cam(C.hWide, lt, 1.07, { push: 0.03, drift: 0.8, fill: 0.5 });
  });
  // 7 "hit the ceiling" low angle, all on the ceiling
  add(16.95, 17.68, 'hall_ceiling', (lt, t) => {
    look_school(); hideAll(hale);
    hallCeil(t);
    rose.setFace('girl_blushing_closed_mouth'); hero.setFace('shocked'); kids.forEach(k => k.setFace('shocked'));
    books.set(1, t);
    cam(C.hLow, lt, 0.73, { push: 0.04, drift: 0.5, fill: 0.5, shk: 0.1, shkT: 0.0 });
  });
  // 8 "Best ten seconds of my life." hero + Rose floating side by side
  add(17.68, 19.29, 'float_pair', (lt, t) => {
    look_school(); hideAll(hale); hideKids();
    at(hero, M.hall.fhero); floatPose(hero, 1, t, 1); hero.setFace('happy');
    at(rose, M.hall.frose); floatPose(rose, 1, t, 2); rose.setFace('girl_blushing_closed_mouth');
    floatFx.set(true, V(-60, 8, 2), 8);
    cam(C.hFloat, lt, 1.61, { push: 0.07, drift: 0.9, fill: 0.7 });
  });
  // 8 "Then we all fell down." drop from the ceiling and land heavy
  add(19.29, 20.29, 'hall_fall', (lt, t) => {
    look_school(); hideAll(hale);
    const q = easeIn(clamp(lt / 0.65, 0, 1)), land = easeOut(clamp((lt - 0.65) / 0.2, 0, 1));
    const drop = (c, from, to, seed) => { at(c, [lerp(from[0], to[0], q), lerp(from[1], to[1], q), lerp(from[2], to[2], q), to[3]]);
      if (q < 1) floatPose(c, 1 - q * 0.6, t, seed); else heavyPose(c, land); };
    drop(hero, M.hall.cHero, M.hall.hero, 1); drop(rose, M.hall.cRose, M.hall.rose, 2);
    M.hall.ckid.forEach((m, i) => drop(kids[i], m, M.hall.kid[i], 3 + i));
    hero.setFace('shocked'); rose.setFace('neutral_droopy_eyes_girl'); kids.forEach(k => k.setFace('sad'));
    cam(C.hWide, lt, 1.0, { push: 0.03, drift: -0.6, fill: 0.5, shk: 0.12, shkT: 0.65 });
  });
  // 9 "So I stopped telling jokes." gym, hero silent, Rose droopy
  add(20.29, 21.78, 'gym_stopped', (lt, t) => {
    look_school(); hideAll(hale); hideKids();
    at(hero, M.gym.hero); heavyPose(hero, 0.5 * easeOut(lt / 1.0)); hero.setFace('sad');
    at(rose, M.gym.rose); armsCrossed(rose, 1); rose.setFace('neutral_droopy_eyes_girl');
    cam(C.gTwo, lt, 1.49, { push: 0.06, drift: 0.6, fill: 0.7 });
  });
  // 9 "She called me boring." Rose hmph (close)
  add(21.78, 23.16, 'rose_boring', (lt, t) => {
    look_school(); hideAll(hero, hale); hideKids();
    at(rose, M.gym.rose); armsCrossed(rose, 1); rose.setFace('tsundere_hmph_girl');
    cam(C.gRose, lt, 1.38, { push: 0.05, drift: -0.4, fill: 0.7 });
  });
  // 9 "The gym got so heavy," all squashed
  add(23.16, 24.31, 'gym_heavy', (lt, t) => {
    look_school();
    gymHeavy(easeOut(lt / 0.5));
    hero.setFace('sad'); rose.setFace('neutral_droopy_eyes_girl'); kids.forEach(k => k.setFace('sad'));
    cam(C.gWide, lt, 1.15, { push: 0.04, drift: 0.8, fill: 0.5, shk: 0.07, shkT: 0.0 });
  });
  // 9 "the floor cracked." crack insert
  add(24.31, 25.15, 'floor_crack', (lt, t) => {
    look_school(); hideAll(hero, rose, hale); hideKids();
    crack.set(easeOut(lt / 0.6));
    cam(C.gCrack, lt, 0.84, { push: 0.05, drift: 0.3, fill: 0.6, shk: 0.09, shkT: 0.25 });
  });

  function hide_(...cs) { for (const c of cs) c.hide(); }
  return shots;
}
