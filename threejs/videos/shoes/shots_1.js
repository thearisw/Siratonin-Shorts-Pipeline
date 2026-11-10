// Shoes: shots 0 -> 43.069 (lines 0-28: hook, rules, Leo/Max/pact, Grandma, Ruiz). shots agent 1.
import { THREE, V, easeOut, aim, orbit } from '../../kit/core.js';

const E = easeOut, UP = V(0, 1, 0), D2R = Math.PI / 180;
const at = (o, x, y, z) => o.clone().add(V(x, y, z));
const put = (c, p, r = 0) => c.place(p.x, p.y, p.z, r);
// camera from a cams entry [pos, look, fov]: push-in `push` (fraction) + orbit `yaw` (deg) around the look, both easeOut over dur
function cam(c, lt, dur, push = 0.04, yaw = 0, fill = 1.5, look = null) {
  const L = look || c[1], k = E(lt / dur), d = c[0].clone().sub(c[1]);
  d.applyAxisAngle(UP, yaw * D2R * k).multiplyScalar(1 - push * k);
  aim(L.clone().add(d), L, c[2], 0, fill);
}
// orbit shot around a point: dist, yaw/pitch (deg) with yaw drift dy and push
function orb(look, lt, dur, dist, yaw, pitch, fov, dy = 3, push = 0.04, fill = 1.5) {
  const k = E(lt / dur);
  aim(orbit(look, dist * (1 - push * k), yaw + dy * k, pitch), look, fov, 0, fill);
}
const pray = c => {
  c.arms[0].rotation.x = -1.5; c.arms[0].rotation.z = 0.45; c.arms[1].rotation.x = -1.5; c.arms[1].rotation.z = -0.45;
  c.neck.rotation.x = 0.35; c.setFace('sleeping');
};
const crouch = c => {
  c.body.rotation.x = 0.55; c.neck.rotation.x = 0.4;
  for (const a of c.arms) a.rotation.x = -0.6;
};
const laugh = (c, lt, i = 0) => { c.setFace('happy'); c.body.rotation.x = -0.08 + 0.06 * Math.sin(lt * 30 + i); };
const mouth = lt => [0, 1, 2, 1][Math.floor(lt * 10) % 4];

export function part(W) {
  const { STREET, PORCH, HOME, BEDS, WOODS, STREET_CAMS, PORCH_CAMS, HOME_CAMS, WOODS_CAMS, CLOCK_CAMS,
    street, porch, home, look_street, look_porch, look_home, look_beds, look_woods, look_clock,
    snowfall, board, clock, sneakers, slippers, boots, printsRuiz, printsWoods, yawTo,
    leo, max, mom, gran, ruiz, knit, scared, grabFrame, carry } = W;
  const pw = (x, y, z) => at(PORCH, x, y, z), sw = (x, y, z) => at(STREET, x, y, z);
  const hw = (x, y, z) => at(HOME, x, y, z), bw = (x, y, z) => at(BEDS, x, y, z);
  const pm = porch.marks, pf = porch.facing, rm = street.marks.ruizPorch, rf = street.facing.ruizPorch;
  const up = v => v.clone().add(V(0, 0.45, 0));
  // street walk of the rules pair (boots), continuous over 4.96 -> 9.293
  const bootsWalk = t => { boots.place(sw(0, 0.09, -16), 0); boots.walk(t - 4.96, 1.5); return up(boots.worldPos()); };
  const bootsTop = () => { boots.place(pm.steps, pf.steps); boots.stepUp(99, 2.5); };
  // Max standing in his room with the sneakers on
  const maxIn = (p, r) => { put(max, p, r); sneakers.place(p, r); };
  // Gran in the armchair (seat top home.seatY; sit lowers hips to ~1.05, thighs ~0.5 thick)
  const am = home.marks.armchair, af = home.facing.armchair;
  const granSeat = t => { put(gran, at(am, Math.sin(af) * 0.2, home.seatY - 0.56, Math.cos(af) * 0.2), af); knit(gran, t); };
  const granHead = at(am, 0, 5.0, 0);
  const maxLace = hw(-20.4, 0.02, -5.2);

  const list = [
    // 0 "In my town, when someone is about to disappear," — COVER: Max's sneakers climbing our porch steps, low
    [0, 'hook_steps_low', (lt, t, d) => {
      look_porch('sunset'); snowfall.update(t);
      sneakers.place(pm.steps, pf.steps); sneakers.stepUp(t, 2.5);
      const p = up(sneakers.worldPos()), c = PORCH_CAMS.stepsLow;
      const k = E(lt / d), pos = c[0].clone().lerp(p, 0.05 * k);
      aim(pos, p.clone().lerp(c[1], 0.3), c[2], 0, 1.2);
    }],
    // 0 "their shoes walk home first."
    [2.1, 'hook_steps_top', (lt, t, d) => {
      look_porch('sunset'); snowfall.update(t);
      sneakers.place(pm.steps, pf.steps); sneakers.stepUp(t, 2.5);
      const p = sneakers.worldPos().lerp(pw(0, 4, 0), 0.5);
      cam(PORCH_CAMS.steps, lt, d, 0.05, -3, 1.2, p);
    }],
    // 1 "It always starts at sunset."
    [3.427, 'rules_sunset_wide', (lt, t, d) => { look_street('sunset'); snowfall.update(t); cam(STREET_CAMS.wide, lt, d, 0.04, -2, 1.2); }],
    // 2 "A pair of shoes comes walking up the street."
    [4.96, 'rules_boots_road', (lt, t, d) => {
      look_street('sunset'); snowfall.update(t);
      const p = bootsWalk(t);
      aim(sw(1.3, 0.9, -3.5 - 0.6 * E(lt / d)), p, 34, 0, 1.2);
    }],
    // 3 "Nobody inside them."
    [6.707, 'rules_boots_empty', (lt, t, d) => { look_street('sunset'); snowfall.update(t); orb(bootsWalk(t), lt, d, 7, 50, 32, 33, -4, 0.04, 1.2); }],
    // 4 "Step."
    [7.653, 'rules_step_front', (lt, t, d) => { look_street('sunset'); snowfall.update(t); orb(bootsWalk(t), lt, d, 6.5, 0, 4, 33, 2, 0.03, 1.2); }],
    // 4 "Step. Step."
    [8.24, 'rules_step_side', (lt, t, d) => { look_street('sunset'); snowfall.update(t); orb(bootsWalk(t), lt, d, 6.5, 90, 3, 33, -5, 0.03, 1.2); }],
    // 5 "They climb onto a porch and stop."
    [9.293, 'rules_boots_climb', (lt, t, d) => {
      look_porch('sunset'); snowfall.update(t);
      boots.place(pm.steps, pf.steps); boots.stepUp(2.0 + lt, 2.5);
      orb(up(boots.worldPos()), lt, d, 9, -30, 12, 33, 4, 0.04, 1.2);
    }],
    // 6 "That's your house."
    [10.88, 'rules_house_wide', (lt, t, d) => { look_porch('sunset'); snowfall.update(t); bootsTop(); cam(PORCH_CAMS.wide, lt, d, 0.05, 2, 1.2); }],
    // 7 "At midnight,"
    [11.773, 'rules_clock_12', (lt, t, d) => { look_clock('night'); clock.set(lt < 0.35 ? 11 : 12, lt < 0.35 ? 59 : 0); cam(CLOCK_CAMS.clock, lt, d, 0.06, 0, 1.5); }],
    // 7 "the owner is gone."
    [12.52, 'rules_porch_empty_night', (lt, t, d) => {
      look_porch('night'); snowfall.update(t); bootsTop(); porch.door.setOpen(0.25);
      cam([pw(0, 7, 19), pw(0, 4.5, -2), 36], lt, d, 0.04, -2, 2);
    }],
    // 8 "All that's left are bare footprints in the snow,"
    [13.413, 'rules_prints_trail', (lt, t, d) => {
      look_woods('night'); snowfall.update(t); printsWoods.reveal(0.1 + 0.4 * E(lt / d));
      cam(WOODS_CAMS.trail, lt, d, 0.04, 3, 2);
    }],
    // 8 "walking into the woods."
    [15.52, 'rules_prints_woods', (lt, t, d) => { look_woods('night'); snowfall.update(t); printsWoods.reveal(1); cam(WOODS_CAMS.edge, lt, d, 0.05, -2, 2); }],
    // 9 "So we have rules." — family in the living room, night
    [16.387, 'rules_family', (lt, t, d) => {
      look_home('night');
      const c = HOME_CAMS.livingWide;
      put(mom, hw(-13, 0.02, -3), yawTo(hw(-13, 0, -3), c[0])); mom.setFace('worried');
      put(leo, hw(-16.8, 0.02, -4.2), yawTo(hw(-16.8, 0, -4.2), c[0])); leo.setFace('worried');
      put(max, hw(-10.2, 0.02, -2.4), yawTo(hw(-10.2, 0, -2.4), c[0])); max.setFace('worried'); scared(max, 0.5);
      cam(c, lt, d, 0.04, 2, 1.8);
    }],
    // 10 "Never touch the shoes." — Max reaches for the boots on the porch, Mom stops him
    [17.493, 'rules_never_touch', (lt, t, d) => {
      look_porch('night'); snowfall.update(t); bootsTop(); porch.door.setOpen(1);
      put(max, pw(0.7, 3.03, -0.6), 0); max.pose.point(0.9 * E(lt / 0.5), 0); max.body.rotation.x = 0.3; max.setFace('worried');
      put(mom, pw(-1.2, 3.03, -2.6), 0.3); mom.pose.point(1, 1); mom.setFace('shocked');
      cam([pw(1, 7, 19.5), pw(0, 4, 0), 36], lt, d, 0.04, 2, 2);
    }],
    // 11 "Leave them on the porch."
    [18.653, 'rules_leave_porch', (lt, t, d) => {
      look_porch('night'); snowfall.update(t); bootsTop(); porch.door.setOpen(0.8 - 0.6 * E(lt / d));
      orb(pw(0, 3.6, 1.8), lt, d, 7.5, -20, 14, 33, 3, 0.04, 2);
    }],
    // 12 "Lock the door."
    [19.6, 'rules_lock_door', (lt, t, d) => {
      look_porch('night'); porch.door.setOpen(0.3 * (1 - E(lt / 0.45)));
      put(mom, pw(0.4, 3.03, -6.2), 0); grabFrame(mom, 0.8);
      cam([pw(-2.5, 7.5, -18), pw(0, 5, -4.5), 36], lt, d, 0.04, 2, 2);
    }],
    // 13 "Pray."
    [20.387, 'rules_pray', (lt, t, d) => {
      look_home('night');
      const h = hw(-14, 4.4, -8.5), c = orbit(h, 14, 10, 4);
      put(mom, hw(-14, 0.02, -8.5), yawTo(h, c)); pray(mom);
      orb(h, lt, d, 14, 10, 4, 32, -2, 0.04, 1.8);
    }],
    // 14 "The chapel board counts us every morning."
    [20.96, 'rules_chapel_fog', (lt, t, d) => { look_street('fog'); board.setCount(140); cam(STREET_CAMS.chapel, lt, d, 0.04, 2, 1); }],
    // 15 "140."
    [22.6, 'board_140', (lt, t, d) => { look_street('fog'); board.setCount(140); cam(STREET_CAMS.board, lt, d, 0.05, 0, 1); }],
    // 16 "I'm Leo."
    [23.493, 'leo_intro', (lt, t, d) => {
      look_beds('sunset');
      const h = bw(-12, 4.6, -4); put(leo, bw(-12, 0.02, -4), yawTo(h, orbit(h, 14, 8, 5))); leo.setFace('smirk');
      orb(h, lt, d, 14, 8, 5, 32, 3, 0.04, 1.5);
    }],
    // 17 "My little brother Max is eight,"
    [24.12, 'max_intro', (lt, t, d) => {
      look_beds('sunset');
      const h = bw(13, 3.9, -5); maxIn(bw(13, 0.02, -5), yawTo(h, orbit(h, 13.5, -8, 6))); max.setFace('happy');
      orb(h, lt, d, 13.5, -8, 6, 32, -3, 0.04, 1.5);
    }],
    // 17 "and he wears my old sneakers."
    [25.27, 'max_sneakers_insert', (lt, t, d) => {
      look_beds('sunset');
      const p = bw(13, 0.02, -5); maxIn(p, -0.25); max.neck.rotation.x = 0.4; max.setFace('happy');
      orb(at(p, 0, 0.9, 0), lt, d, 7, -15, 10, 33, 4, 0.04, 1.5);
    }],
    // 18 "Two sizes too big." — full-body two-shot
    [26.4, 'leo_max_twoshot', (lt, t, d) => {
      look_beds('sunset');
      put(leo, bw(10.5, 0.02, -5), 0.35); leo.setFace('smirk');
      maxIn(bw(14, 0.02, -4.6), -0.3); max.pose.armsOut(0.6); max.body.rotation.z = 0.06 * Math.sin(lt * 8); max.setFace('happy');
      orb(bw(12.25, 2.6, -4.8), lt, d, 21, 0, 6, 36, 3, 0.04, 1.5);
    }],
    // 19 "When I gave them to him, I said,"
    [27.507, 'leo_gives_sneakers', (lt, t, d) => {
      look_beds('sunset');
      put(leo, bw(10.5, 0.02, -5), Math.PI / 2); carry(leo, 1); leo.setFace('happy');
      sneakers.place(bw(11.7, 2.2, -5), Math.PI / 2);
      put(max, bw(14, 0.02, -5), -Math.PI / 2); carry(max, 0.6 * E(lt / d)); max.setFace('happy');
      orb(bw(12.25, 2.8, -5), lt, d, 20, -6, 6, 36, 3, 0.04, 1.5);
    }],
    // 19 "What's mine is yours." — Leo says it (remembered line, mouth moves)
    [28.81, 'leo_mine_is_yours', (lt, t, d) => {
      look_beds('sunset');
      const h = bw(10.5, 4.6, -5);
      put(leo, bw(10.5, 0.02, -5), Math.PI / 2 - 0.25); leo.setFace('happy'); leo.talk(lt < 0.95 ? mouth(lt) : 0);
      put(max, bw(14, 0.02, -5), -Math.PI / 2); carry(max, 1); max.setFace('happy');
      sneakers.place(bw(13, 2.0, -5), -Math.PI / 2);
      orb(h, lt, d, 14, 40, 4, 32, -3, 0.04, 1.5);
    }],
    // 20 "He never stopped saying it back."
    [29.893, 'max_says_back', (lt, t, d) => {
      look_beds('sunset');
      const h = bw(14, 3.9, -5); maxIn(bw(14, 0.02, -5), yawTo(h, orbit(h, 13.5, -25, 5))); max.setFace('happy'); max.talk(mouth(lt));
      orb(h, lt, d, 13.5, -25, 5, 32, 4, 0.04, 1.5);
    }],
    // 21 "Grandma watched him lace them up and said,"
    [31.32, 'gran_watches_lacing', (lt, t, d) => {
      look_home('sunset'); granSeat(t); gran.setFace('happy');
      maxIn(maxLace, yawTo(maxLace, am)); crouch(max); max.setFace('happy');
      orb(hw(-21.2, 2.8, -6.6), lt, d, 20, 75, 8, 36, -3, 0.04, 1.6);
    }],
    // 22 GRAN: "Shoes don't care whose feet they're on."
    [32.773, 'gran_line', (lt, t, d) => {
      look_home('sunset'); granSeat(t); gran.setFace('smirk');
      orb(granHead, lt, d, 15, 35, 8, 34, -3, 0.05, 1.6);
    }],
    // 23 "We laughed."
    [34.349, 'we_laughed', (lt, t, d) => {
      look_home('sunset');
      put(leo, hw(-17, 0.02, -3), yawTo(hw(-17, 0, -3), am)); laugh(leo, lt);
      maxIn(maxLace, yawTo(maxLace, hw(-17, 0, -3))); laugh(max, lt, 1.3);
      orb(hw(-18.7, 3.6, -4.2), lt, d, 20, 55, 6, 36, 3, 0.03, 1.6);
    }],
    // 24 "We thought she meant hand-me-downs." — Gran, not laughing
    [35.029, 'gran_knowing', (lt, t, d) => {
      look_home('sunset'); granSeat(t); gran.setFace('worried');
      orb(granHead, lt, d, 15, 25, 6, 34, 2, 0.06, 1.6);
    }],
    // 25 "The first night,"
    [36.243, 'ruiz_first_night', (lt, t, d) => { look_street('sunset'); snowfall.update(t); cam(STREET_CAMS.high, lt, d, 0.04, 2, 1.2); }],
    // 25 "Mrs Ruiz's slippers came home." — slippers walk in from the road and stop on her porch mark
    [36.89, 'ruiz_slippers_arrive', (lt, t, d) => {
      look_street('sunset'); snowfall.update(t);
      slippers.place(at(rm, 2.4 * Math.sin(rf), 0, 2.4 * Math.cos(rf)), rf + Math.PI); slippers.walk(Math.min(lt, 1.3), 1.5);
      const p = up(slippers.worldPos());
      aim(at(rm, 3.2 - 0.2 * E(lt / d), 0.9, 6), p, 33, 0, 1.2);
    }],
    // 26 "She put them on to see if they still fit."
    [38.363, 'ruiz_puts_on', (lt, t, d) => {
      look_street('sunset'); snowfall.update(t);
      put(ruiz, rm, rf); slippers.place(rm, rf); ruiz.neck.rotation.x = 0.45; ruiz.setFace('smirk');
      cam(STREET_CAMS.ruizPorch, lt, d, 0.05, -3, 1.2);
    }],
    // 27 "At midnight,"
    [39.843, 'ruiz_clock_12', (lt, t, d) => { look_clock('night'); clock.set(lt < 0.3 ? 11 : 12, lt < 0.3 ? 59 : 0); cam(CLOCK_CAMS.clockClose, lt, d, 0.05, 0, 1.5); }],
    // 27 "she was gone."
    [40.59, 'ruiz_porch_empty', (lt, t, d) => {
      look_street('night'); snowfall.update(t); slippers.place(rm, rf);
      cam(STREET_CAMS.ruizPorch, lt, d, 0.05, 3, 2);
    }],
    // 28 "Bare footprints,"
    [41.323, 'ruiz_prints', (lt, t, d) => {
      look_street('night'); snowfall.update(t); slippers.place(rm, rf); printsRuiz.reveal(0.08 + 0.3 * E(lt / d));
      cam(STREET_CAMS.ruizPrints, lt, d, 0.04, -2, 2);
    }],
    // 28 "right into the trees."
    [42.21, 'ruiz_prints_trees', (lt, t, d) => {
      look_street('night'); snowfall.update(t); printsRuiz.reveal(0.4 + 0.6 * E(lt / d));
      cam(STREET_CAMS.trailToWoods, lt, d, 0.04, 2, 2);
    }],
  ];
  const END = 43.069;
  return list.map(([s, name, fn], i) => {
    const e = i + 1 < list.length ? list[i + 1][0] : END, d = e - s;
    return { s, e, name, f: (lt, t) => fn(lt, t, d) };
  });
}
