// Shoes — glue (coordinator). Joins the three shot parts; the director loads this file.
import * as S from './world_sets.js';
import * as C from './world_cast.js';
import { fade } from '../../kit/captions.js';
import { part as p1 } from './shots_1.js';
import { part as p2 } from './shots_2.js';
import { part as p3 } from './shots_3.js';

export async function setup() {
  const W = { ...S, ...C };
  const shots = [...p1(W), ...p2(W), ...p3(W)];
  const R = '#ff5a5a', Y = '#ffd23f', B = '#7fb2ff';
  return {
    shots, duration: shots[shots.length - 1].e,
    highlights: {
      disappear: R, shoes: Y, sunset: Y, midnight: Y, footprints: B, touch: R, '140': Y, max: B, yours: Y, feet: R,
      slippers: Y, '121': Y, boots: Y, '97': Y, lily: B, big: R, '80': Y, sneakers: Y, '900': R, '1000': R, '1100': R, '1130': R,
      socks: R, '1158': R, '1159': R, '1200': R, safe: B, snow: B,
    },
    before(t) { S.resetProps(); for (const r of W.resets || []) r(); },
    after(ctx, t) {
      const end = shots[shots.length - 1].e;
      fade(ctx, (t - (end - 1.0)) / 1.0);   // last second fades to black
    },
    intro: true,
  };
}
