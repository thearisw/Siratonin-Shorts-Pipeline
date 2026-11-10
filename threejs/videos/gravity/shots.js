// Crush Gravity: joins the two shot parts. The director loads this file.
import * as S from './world_sets.js';
import * as C from './world_cast.js';
import { part as p1 } from './shots_1.js';
import { part as p2 } from './shots_2.js';

export async function setup() {
  const W = { ...S, ...C };
  const shots = [...p1(W), ...p2(W)];
  return {
    shots, duration: shots[shots.length - 1].e,
    highlights: {
      happy: '#ffd23f', floats: '#ffd23f', ceiling: '#ffd23f', floated: '#ffd23f',
      sad: '#7fb2ff', heavy: '#7fb2ff', cracked: '#7fb2ff', boring: '#7fb2ff',
      dumb: '#ff7ab8', funny: '#ff7ab8', away: '#ff7ab8', no: '#ff7ab8', like: '#ff7ab8', hmph: '#ff7ab8', forever: '#ff7ab8',
      rule: '#7ddc7d', bus: '#ffd23f', window: '#ffd23f', roof: '#ffd23f',
    },
    before(t) { S.hideAll(); },
    intro: true,
  };
}
