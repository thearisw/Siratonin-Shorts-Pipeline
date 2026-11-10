// Crush Gravity shots 2: 25.15 -> 49.30 (lines 10-23). No renders were run when writing this.
import { V, lerp, easeOut, aim, orbit, clamp } from '../../kit/core.js';
import { focus } from '../../kit/look.js';

export function part(W) {
  const { hero, rose, hale, kids, CEIL, floatPose, ceilingPose, heavyPose, armsCrossed, trays, bus, roof, floatFx,
    look_school, look_outside, school, outside, SCHOOL_CAMS, OUTSIDE_CAMS } = W;
  hero.speaker = 'ME'; rose.speaker = 'ROSE'; hale.speaker = 'HALE';

  const v = a => (Array.isArray(a) ? V(a[0], a[1], a[2]) : a.clone());
  const M = (set, n) => v(set.marks[n]);
  const F = (set, n) => { const f = set.face && set.face[n]; return f !== undefined ? f : (set.marks[n].face || 0); };
  const put = (c, set, n, o = {}) => { const p = M(set, n); c.place(p.x, p.y + (o.dy || 0), p.z, o.rot !== undefined ? o.rot : F(set, n)); return p; };
  const sc = (c, n, o) => put(c, school, n, o);
  const os = (c, n, o) => put(c, outside, n, o);

  // camera from [pos, look, fov]: slow push + drift, always easeOut
  function cam(c, k, o = {}) {
    const p = v(c[0]), l = v(c[1]);
    const pos = p.lerp(l, (o.push === undefined ? 0.05 : o.push) * easeOut(k));
    pos.x += (o.dx || 0) * easeOut(k); pos.y += (o.dy || 0) * easeOut(k);
    if (o.ly) l.y += o.ly;
    aim(pos, l, c[2], (o.roll || 0) * easeOut(k), o.fill === undefined ? 0.6 : o.fill);
    focus(l);
  }
  // orbit-camera around a target: [pos, look, fov]
  const oc = (target, dist, yaw, pitch, fov) => [orbit(target, dist, yaw, pitch), target, fov];

  const sh = (s, e, name, fn, out = false) => ({
    s, e, name,
    f(lt, t) { (out ? look_outside : look_school)(); fn(lt / (e - s), lt, t, e - s); },
  });

  // ---- shared staging ----
  const hallPair = (heroFace, roseFace, dyRose = 0) => {
    sc(hero, 'hall_hero'); hero.setFace(heroFace);
    sc(rose, 'hall_rose', { dy: dyRose }); rose.setFace(roseFace); armsCrossed(rose, 1);
  };
  function seated(o = {}) {
    sc(hero, 'cafe_hero_seat_f'); hero.pose.sit(1); hero.setFace(o.hf || 'worried');
    sc(rose, 'cafe_rose_seat_f'); rose.pose.sit(1); armsCrossed(rose, 1); rose.setFace(o.rf || 'neutral_droopy_eyes_girl');
    if (o.kids === false) return;
    const seats = ['cafe_seat1', 'cafe_seat2', 'cafe_seat3', 'cafe_seat4', 'cafe_seat5', 'cafe_seat6'];
    kids.forEach((k, i) => { sc(k, seats[i]); k.pose.sit(1); k.setFace(o.kf || 'worried'); });
  }
  const ceilAll = (heroN, roseN, t, kf = 'scream') => {
    sc(hero, heroN); ceilingPose(hero, 1); hero.setFace('worried');
    sc(rose, roseN); ceilingPose(rose, 1); rose.setFace('girl_blushing_closed_mouth');
    kids.forEach((k, i) => { sc(k, 'cafe_ceil_k' + (i + 1)); ceilingPose(k, 1); k.setFace(kf); });
    sc(hale, 'cafe_ceil_hale'); ceilingPose(hale, 1); hale.setFace('shocked');
  };
  const cafeFloat = (t, heroDy = 0, roseFace = 'tsundere_hmph_girl') => {
    sc(hero, 'cafe_float_hero', { dy: heroDy }); floatPose(hero, 1, t, 1); hero.setFace('shocked');
    sc(rose, 'cafe_float_rose'); floatPose(rose, 1, t, 2); armsCrossed(rose, 1); rose.setFace(roseFace);
  };
  const cafeCeilCrowd = t => {
    kids.forEach((k, i) => { sc(k, 'cafe_ceil_k' + (i + 1)); ceilingPose(k, 1); k.setFace('worried'); });
    sc(hale, 'cafe_ceil_hale'); ceilingPose(hale, 1); hale.setFace('shocked');
  };
  // ending sky: everyone rises out of the roofless school from 44.7
  const RISE0 = 44.7;
  function sky(t, o = {}) {
    const k = easeOut(clamp((t - RISE0) / 2.2, 0, 1));
    const up = (c, n, seed, pose) => {
      const p = M(outside, n);
      c.place(p.x, lerp(8, p.y, k), p.z, F(outside, n));
      if (pose) pose(c);
      floatPose(c, 1, t, seed);
    };
    kids.forEach((c, i) => { up(c, 'sky_k' + (i + 1), i + 3); c.setFace(i % 2 ? 'scream' : 'shocked'); });
    const hp = M(outside, 'sky_hale');
    hale.place(hp.x, lerp(8, hp.y, k), hp.z, F(outside, 'sky_hale')); ceilingPose(hale, 1, 'hang'); hale.setFace('blink');
    if (!o.noPair) {
      up(hero, 'sky_hero', 1); hero.setFace(o.hf || 'shocked');
      up(rose, 'sky_rose', 2); armsCrossed(rose, 1); rose.setFace(o.rf || 'tsundere_hmph_girl');
    }
    roof.setLift(clamp((t - RISE0) / 3.2, 0, 1), t);
  }
  const haleT = () => { const p = M(outside, 'sky_hale'); return V(p.x, p.y - 3, p.z); };

  return [
    // 10 "So I told one tiny joke."
    sh(25.15, 26.79, 'hall_two_joke', (k) => {
      hallPair('smirk', 'neutral_droopy_eyes_girl');
      cam(SCHOOL_CAMS.hall_two, k, { push: 0.05, dx: 0.4 });
    }),
    // 11 ROSE "Not funny."
    sh(26.79, 27.46, 'rose_not_funny', (k, lt) => {
      sc(hero, 'hall_hero'); hero.setFace('worried');
      sc(rose, 'hall_rose', { dy: 0.9 * easeOut(k) }); armsCrossed(rose, 1);
      rose.setFace(lt < 0.4 ? 'tsundere_hmph_girl' : 'girl_blushing_closed_mouth');
      const r = M(school, 'hall_rose'); const l = V(r.x - 0.5, r.y + 4, r.z);
      cam([orbit(l, 14, -8, 3), l, 32], k, { push: 0.05, dx: -0.3 });
    }),
    sh(27.46, 28.90, 'bus_away', (k, lt, t) => {
      bus.setFloat(clamp((t - 27.46) / 3, 0, 1), t);
      cam(OUTSIDE_CAMS.bus_up, k, { push: 0.05, dy: 1.5 });
    }, true),
    // 13 "So I said nothing."
    sh(28.90, 30.09, 'cafe_sit_two', (k) => {
      seated({ hf: 'worried', rf: 'neutral_droopy_eyes_girl', kf: 'blink' });
      cam(SCHOOL_CAMS.cafe_two_seat, k, { push: 0.05, dx: 0.4 });
    }),
    sh(30.09, 31.06, 'hero_sits_beside', (k) => {
      seated({ hf: 'worried', rf: 'neutral_droopy_eyes_girl', kf: 'blink' });
      const l = V(31.4, 3.7, 0.6);
      cam([orbit(l, 15.5, 4, 4), l, 33], k, { push: 0.06, dx: -0.3 });
    }),
    // 14 ROSE "Go away."
    sh(31.06, 31.75, 'rose_go_away', (k, lt) => {
      seated({ hf: 'worried', rf: lt < 0.4 ? 'tsundere_hmph_girl' : 'girl_blushing_closed_mouth', kids: false });
      const l = V(32.4, 3.7, 0.6);
      cam([orbit(l, 15.5, 6, 4), l, 33], k, { push: 0.05, dx: 0.3 });
    }),
    // 15 "She didn't move." / "Every lunch tray flew out the window."
    sh(31.75, 32.90, 'rose_didnt_move', (k, lt, t) => {
      seated({ hf: 'worried', rf: 'girl_blushing_closed_mouth', kf: 'shocked' });
      floatFx.set(true, V(33, 6, 1), 5);
      const l = V(32.4, 4.4, 0.6);
      cam([orbit(l, 17, -4, 2), l, 34], k, { push: 0.07 });
    }),
    sh(32.90, 33.75, 'tray_insert', (k, lt, t) => {
      seated({ hf: 'shocked', rf: 'girl_blushing_closed_mouth', kf: 'shocked' });
      trays.set(clamp((t - 32.9) / 2.4, 0, 1));
      cam(SCHOOL_CAMS.cafe_tray, k, { push: 0.06, dy: 0.4 });
    }),
    sh(33.75, 35.18, 'trays_out_window', (k, lt, t) => {
      seated({ hf: 'shocked', rf: 'girl_blushing_closed_mouth', kf: 'scream' });
      trays.set(clamp((t - 32.9) / 2.4, 0, 1));
      cam(SCHOOL_CAMS.cafe_window, k, { push: 0.05, dx: 0.5 });
    }),
    // 16 "The whole school was stuck to the ceiling, yelling at me."
    sh(35.18, 36.30, 'ceiling_crowd', (k) => {
      ceilAll('cafe_ceil_hero', 'cafe_ceil_rose');
      cam(SCHOOL_CAMS.cafe_ceiling, k, { push: 0.04, dx: 0.6 });
    }),
    sh(36.30, 37.46, 'hero_yelled_at', (k, lt, t) => {
      cafeCeilCrowd(t);
      sc(rose, 'cafe_ceil_rose'); ceilingPose(rose, 1); rose.setFace('girl_blushing_closed_mouth');
      sc(hero, 'cafe_float_hero', { dy: -3 }); floatPose(hero, 1, t, 1); hero.setFace('worried');
      const l = V(31, 9, 3);
      cam([V(28.5, 2.5, 27), l, 38], k, { push: 0.05, dy: 0.6 });
    }),
    // 17 "Then I remembered. Never watch her face. Watch the ceiling."
    sh(37.46, 38.55, 'hero_remembers', (k, lt, t) => {
      cafeCeilCrowd(t); cafeFloat(t);
      const h = M(school, 'cafe_float_hero'); const l = V(h.x, h.y + 3.8, h.z);
      cam([orbit(l, 13.5, 14, 2), l, 32], k, { push: 0.06 });
    }),
    sh(38.55, 39.66, 'rose_face_lies', (k, lt, t) => {
      cafeCeilCrowd(t); cafeFloat(t);
      const r = M(school, 'cafe_float_rose'); const l = V(r.x, r.y + 3.8, r.z);
      cam([orbit(l, 13.5, -10, 2), l, 32], k, { push: 0.05, dx: -0.3 });
    }),
    sh(39.66, 40.54, 'watch_ceiling', (k, lt, t) => {
      cafeCeilCrowd(t); cafeFloat(t);
      const l = V(33, 12.5, 3);
      cam([V(32.5, 5.5, 24), l, 38], k, { push: 0.04, dy: 1.2 });
    }),
    // 18 "I floated over to her."
    sh(40.54, 41.49, 'hero_floats_over', (k, lt, t) => {
      cafeCeilCrowd(t);
      sc(rose, 'cafe_float_rose'); floatPose(rose, 1, t, 2); armsCrossed(rose, 1); rose.setFace('tsundere_hmph_girl');
      sc(hero, 'cafe_float_hero', { dy: -4 * (1 - easeOut(k)) }); floatPose(hero, 1, t, 1); hero.setFace('happy');
      cam(SCHOOL_CAMS.cafe_float, k, { push: 0.05, dx: -0.4 });
    }),
    // 19 ME "Rose, are you happy right now?"
    sh(41.49, 42.96, 'hero_asks', (k, lt, t) => {
      cafeCeilCrowd(t); cafeFloat(t);
      hero.setFace('worried');
      const h = M(school, 'cafe_float_hero'); const l = V(h.x + 0.4, h.y + 3.8, h.z);
      cam([orbit(l, 14, 28, 2), l, 32], k, { push: 0.07, dx: -0.3 });
    }),
    // 20 ROSE "No! It's not like I like you or anything."
    sh(42.96, 43.82, 'rose_no', (k, lt, t) => {
      cafeCeilCrowd(t); cafeFloat(t, 0, 'tsundere_hmph_girl');
      floatFx.set(true, V(33, 10, 3), 5);
      const r = M(school, 'cafe_float_rose'); const l = V(r.x, r.y + 3.8, r.z);
      cam([orbit(l, 13.5, -6, 2), l, 32], k, { push: 0.06, roll: 0.02 });
    }),
    sh(43.82, 44.70, 'rose_blush_two', (k, lt, t) => {
      cafeCeilCrowd(t); cafeFloat(t, 0, lt < 0.55 ? 'tsundere_hmph_girl' : 'girl_blushing_closed_mouth');
      hero.setFace('shocked'); floatFx.set(true, V(33, 10, 3), 6);
      cam(SCHOOL_CAMS.cafe_float, k, { push: 0.07, dy: 0.5 });
    }),
    // 21 "The roof came off the school."
    sh(44.70, 46.00, 'roof_off', (k, lt, t) => {
      sky(t);
      cam(OUTSIDE_CAMS.roof, k, { push: 0.04, dy: 1 });
    }, true),
    // 22 HALE "New rule. You sit next to her. Forever."
    sh(46.00, 47.15, 'hale_new_rule', (k, lt, t) => {
      sky(t);
      cam(OUTSIDE_CAMS.sky_hale, k, { push: 0.05, ly: -3, dx: 0.4 });
    }, true),
    sh(47.15, 48.21, 'hale_forever', (k, lt, t) => {
      sky(t);
      const l = haleT();
      cam([orbit(l, 14, -18, -8), l, 33], k, { push: 0.07, dy: 0.4 });
    }, true),
    // 23 ROSE "Hmph." (last shot settles)
    sh(48.21, 49.30, 'final_hmph', (k, lt, t) => {
      sky(t, { noPair: true });
      const turn = easeOut(clamp(lt / 0.55, 0, 1));
      const hp = M(outside, 'sky_hero'), rp = M(outside, 'sky_rose');
      hero.place(hp.x, hp.y, hp.z, F(outside, 'sky_hero')); floatPose(hero, 1, t, 1); hero.setFace('happy');
      rose.place(rp.x, rp.y, rp.z, lerp(F(outside, 'sky_rose'), -1.0, turn)); floatPose(rose, 1, t, 2); armsCrossed(rose, 1);
      rose.setFace(lt < 0.5 ? 'tsundere_hmph_girl' : 'girl_blushing_closed_mouth');
      floatFx.set(true, V(300, 34, -26), 6);
      cam(OUTSIDE_CAMS.sky, k, { push: -0.08, dy: 0.5, fill: 0.7 });
    }, true),
  ];
}
