// Query a video's world_index.js without opening the (big) world files. Pure node, no three.js.
//   node kit/index_near.mjs <video>                       -> one line per set (origin, size, look, note) + the API list
//   node kit/index_near.mjs <video> set <set>             -> everything in that set
//   node kit/index_near.mjs <video> near <name|x,y,z> [radius=30]   -> marks/cams/props/chars within radius of a mark name or a point (nearest first)
//   node kit/index_near.mjs <video> find <text>           -> entries whose name or note contains the text
// world_index.js shape (PIPELINE §5): export const INDEX = { sets: {name: {origin:[x,y,z], size:[w,d], look, note}},
//   marks: {'set.name': {p:[x,y,z], face: rotY, note}}, cams: {'set.name': {p, look, fov, note}}, props: {name: {p, note, api}}, api: ['sneakers.walk(t, speed) ...'] }
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [, , video, cmd, arg, rad] = process.argv;
if (!video) { console.log('usage: node kit/index_near.mjs <video> [set <set> | near <mark|x,y,z> [radius] | find <text>]'); process.exit(1); }
const dir = path.resolve(video.includes('/') || video.includes('\\') ? video : `videos/${video}`);
const { INDEX: I } = await import(pathToFileURL(path.join(dir, 'world_index.js')).href);
const f = a => a ? '[' + a.map(v => +(+v).toFixed(1)).join(', ') + ']' : '';
const kinds = { marks: 'mark', cams: 'cam', props: 'prop', chars: 'char' };
const entries = [];
for (const [k, kind] of Object.entries(kinds)) for (const [name, e] of Object.entries(I[k] || {})) entries.push({ kind, name, e, set: name.split('.')[0] });
const line = ({ kind, name, e }, d) => `${kind.padEnd(5)} ${name.padEnd(26)} ${f(e.p)}${e.face != null ? ' face ' + (+e.face).toFixed(2) : ''}${e.look ? ' look ' + f(e.look) + ' fov ' + e.fov : ''}${e.api ? '  ' + e.api : ''}${e.note ? '  // ' + e.note : ''}${d != null ? '  (' + d.toFixed(1) + ' away)' : ''}`;
if (!cmd) {
  for (const [n, s] of Object.entries(I.sets || {})) console.log(`set ${n.padEnd(10)} origin ${f(s.origin)} size ${f(s.size)} look ${s.look || ''}  ${s.note || ''}`);
  console.log('\nAPI:'); for (const a of I.api || []) console.log('  ' + a);
} else if (cmd === 'set') {
  const s = I.sets?.[arg]; if (s) console.log(`set ${arg} origin ${f(s.origin)} size ${f(s.size)} look ${s.look || ''}  ${s.note || ''}`);
  for (const x of entries.filter(x => x.set === arg || (x.e.set === arg))) console.log(line(x));
} else if (cmd === 'near') {
  let p = arg.includes(',') ? arg.split(',').map(Number) : (entries.find(x => x.name === arg)?.e.p);
  if (!p) { console.log('unknown mark ' + arg); process.exit(1); }
  const R = +(rad || 30);
  entries.map(x => [x, x.e.p ? Math.hypot(x.e.p[0] - p[0], x.e.p[1] - p[1], x.e.p[2] - p[2]) : 1e9]).filter(([, d]) => d <= R).sort((a, b) => a[1] - b[1]).forEach(([x, d]) => console.log(line(x, d)));
} else if (cmd === 'find') {
  for (const x of entries.filter(x => (x.name + ' ' + (x.e.note || '')).toLowerCase().includes(arg.toLowerCase()))) console.log(line(x));
}
