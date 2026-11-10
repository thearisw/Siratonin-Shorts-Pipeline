// Characters: blocky original rig (makeChar), pose library, hair, the blocky cast presets, and the Caller monster.
// Every character (blocky or GLB from models.js) exposes the same API:
//   root (place/rotate), body (bob/lean), neck (head turn), head, arms[0]=right arm, arms[1]=left arm, legs[0]=right, legs[1]=left
//   setFace(kind), rest(), idle(t, seed), walk(phase, amp), hide(), plus pose helpers below.
// A character built facing +Z: its right side is -X. Rotation.y = -PI/2 faces -X, +PI/2 faces +X, PI faces -Z.
import { THREE, scene, std, rbox, canvasTex, V, easeOut } from './core.js';
import { faceSet } from './faces.js';

export const ALL_CHARS = [];   // the director resets these each frame

export function stripes(colA, colB, n) {
  return canvasTex(128, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? colB : colA; g.fillRect(0, i * h / n, w, h / n + 1); } });
}

/** Give any rig object the shared animation API. Expects root, body, neck, arms[2], legs[2], faceMat, faces. */
export function addCharApi(c) {
  c.face = c.face || 'happy';
  const showTex = tex => { if (c.faceMat.map !== tex) { c.faceMat.map = tex; c.faceMat.needsUpdate = true; } };
  c.setFace = k => { if (!c.faces || !c.faces[k]) return; c.face = k; showTex(c.faces[k]); };
  /** talking mouth on top of the current face: 0 = closed (the face as set), 1 = half open, 2 = open. kit/talk.js calls this from the word timings. */
  c.talk = level => { if (!c.faces || !c.face) return; showTex((level && c.faces[c.face + '#' + level]) || c.faces[c.face]); };
  /** set a face but blink briefly every ~3 s (seeded so characters don't blink together) */
  c.faceBlink = (k, t, seed = 0) => { const p = (t + seed * 1.37) % 3.1; c.setFace(p < 0.11 ? 'blink' : k); };
  c.rest = () => {
    for (const a of c.arms) a.rotation.set(0, 0, 0);
    for (const l of c.legs) l.rotation.set(0, 0, 0);
    c.neck.rotation.set(0, 0, 0); c.body.position.set(0, 0, 0); c.body.rotation.set(0, 0, 0);
  };
  c.idle = (t, seed = 0) => { const b = Math.sin(t * 2.2 + seed); c.body.position.y = b * 0.03; c.arms[0].rotation.z = -0.06 - b * 0.02; c.arms[1].rotation.z = 0.06 + b * 0.02; };
  c.walk = (phase, amp = 0.7) => {
    const s = Math.sin(phase);
    c.legs[0].rotation.x = s * amp; c.legs[1].rotation.x = -s * amp;
    c.arms[0].rotation.x = -s * amp * 0.8; c.arms[1].rotation.x = s * amp * 0.8;
    c.body.position.y = Math.abs(Math.cos(phase)) * 0.12 * amp / 0.7;
  };
  c.run = phase => { c.walk(phase, 1.1); c.body.rotation.x = 0.18; };
  c.hide = () => c.root.position.set(0, -500, 0);
  c.place = (x, y, z, rotY = 0) => { c.root.position.set(x, y, z); c.root.rotation.y = rotY; };
  /** home = where the character stands when a shot doesn't place it. No home = hidden. Frames can render in any order,
   *  so shots must not rely on where an earlier shot left someone: the director calls reset() every frame. */
  c.setHome = (x, y, z, rotY = 0) => { c.homeArgs = [x, y, z, rotY]; c.place(x, y, z, rotY); };
  // the face is reset too (Crush Gravity, 2026-11-10): frames render out of order, so a face left over from another frame
  // (or a setFace with an unknown name, which is ignored) showed whichever face that worker rendered last
  c.reset = () => { c.rest(); if (c.defaultFace) c.setFace(c.defaultFace); if (c.homeArgs) c.place(...c.homeArgs); else c.hide(); };
  // ---- poses (call after rest/idle; k = 0..1 blend for easing in) ----
  c.pose = {
    wave: (t, k = 1, side = 0) => { const a = c.arms[side], s = side ? 1 : -1; a.rotation.z = s * (2.6 + Math.sin(t * 14) * 0.35) * k; },
    point: (k = 1, side = 0) => { c.arms[side].rotation.x = -1.5 * k; },
    armsOut: (k = 1) => { c.arms[0].rotation.z = -1.3 * k; c.arms[1].rotation.z = 1.3 * k; },
    armsUp: (k = 1) => { c.arms[0].rotation.z = -2.8 * k; c.arms[1].rotation.z = 2.8 * k; },
    hug: (k = 1) => { for (const [i, a] of c.arms.entries()) { a.rotation.x = -1.4 * k; a.rotation.z = (i ? -0.5 : 0.5) * k; } },
    handsToFace: (k = 1) => { for (const [i, a] of c.arms.entries()) { a.rotation.x = -2.5 * k; a.rotation.z = (i ? -0.45 : 0.45) * k; } },
    hold: (k = 1) => { for (const a of c.arms) a.rotation.x = -1.2 * k; },
    sit: (k = 1) => { for (const l of c.legs) l.rotation.x = -1.57 * k; c.body.position.y = -0.95 * k; },
    lie: (k = 1) => { c.body.rotation.x = -1.57 * k; c.body.position.y = 0.5 * k; c.body.position.z = -0.0; },
    fall: (t, k = 1) => { c.body.rotation.x = -1.2 * k; c.pose.armsUp(k * 0.9); c.legs[0].rotation.x = Math.sin(t * 18) * 0.5 * k; c.legs[1].rotation.x = -Math.sin(t * 18) * 0.5 * k; },
    curl: (k = 1) => { c.pose.sit(k); c.body.rotation.x = 0.5 * k; c.pose.hug(k); c.neck.rotation.x = 0.4 * k; },
    lookAt: (worldPoint, k = 1) => { // turn the head toward a point (yaw only, clamped)
      const p = c.root.worldToLocal(worldPoint.clone()); const yaw = Math.atan2(p.x, p.z);
      c.neck.rotation.y = THREE.MathUtils.clamp(yaw, -1.1, 1.1) * k;
    },
    nodShake: (t, t0, amt = 0.32) => { const k = t - t0; if (k > 0) c.neck.rotation.y = Math.sin(k * 22) * amt * Math.exp(-k * 2.2); },
  };
  ALL_CHARS.push(c);
  return c;
}

/**
 * Blocky R6-style character (5 units tall, feet at origin, facing +Z).
 * o = {skin, shirt|shirtTex, sleeveTex, longSleeve, pants, shoes, hair(head), faceExtra:{lashes,mustache,cheeks,glasses}, torsoExtra(torso), scale}
 */
export function makeChar(o = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const skin = std(o.skin ?? 0xf2c79b);
  const shirtMat = o.shirtTex ? std(0xffffff, { map: o.shirtTex }) : std(o.shirt ?? 0x888888);
  const sleeveMat = o.sleeveTex ? std(0xffffff, { map: o.sleeveTex }) : shirtMat;
  const pantsMat = std(o.pants ?? 0x333344);
  const torso = rbox(2, 2, 1, shirtMat, 0.1); torso.position.y = 3; body.add(torso);
  if (o.torsoExtra) o.torsoExtra(torso);
  const neck = new THREE.Group(); neck.position.y = 4.02; body.add(neck);
  const head = rbox(1.25, 1.25, 1.25, skin, 0.28); head.position.y = 0.66; neck.add(head);
  const faces = faceSet(o.faceExtra || {});
  const faceMat = new THREE.MeshStandardMaterial({ map: faces.happy, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.08), faceMat);
  face.position.set(0, 0, 0.628); head.add(face);
  if (o.hair) o.hair(head);
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 1.5, 3.92, 0); body.add(sh);
    const sleeve = rbox(0.98, 0.95, 0.98, sleeveMat, 0.08); sleeve.position.y = -0.45; sh.add(sleeve);
    const hand = rbox(0.94, 1.1, 0.94, o.longSleeve ? sleeveMat : skin, 0.1); hand.position.y = -1.45; sh.add(hand);
    arms.push(sh);
    const hip = new THREE.Group(); hip.position.set(s * 0.5, 2.0, 0); body.add(hip);
    const leg = rbox(0.98, 1.75, 0.98, pantsMat, 0.08); leg.position.y = -0.88; hip.add(leg);
    const shoe = rbox(1.0, 0.3, 1.04, std(o.shoes ?? 0x2b2b2b), 0.08); shoe.position.set(0, -1.85, 0.02); hip.add(shoe);
    legs.push(hip);
  }
  if (o.scale) root.scale.setScalar(o.scale);
  scene.add(root);
  return addCharApi({ root, body, neck, head, torso, arms, legs, faces, faceMat, kind: 'blocky' });
}

// ---------- hair / headwear ----------
const hairMat = c => std(c, { roughness: 0.7 });
export const HAIR = {
  spiky: col => head => { // hero: blonde fringe
    const m = hairMat(col);
    const top = rbox(1.42, 0.5, 1.42, m, 0.2); top.position.set(0, 0.6, -0.04); head.add(top);
    const back = rbox(1.42, 1.0, 0.36, m, 0.15); back.position.set(0, 0.18, -0.58); head.add(back);
    for (let i = 0; i < 4; i++) { const s = rbox(0.42, 0.42, 0.3, m, 0.1); s.position.set(-0.5 + i * 0.33, 0.36 - (i % 2) * 0.06, 0.58); s.rotation.z = (i - 1.5) * 0.25; head.add(s); }
    for (const sx of [-1, 1]) { const sd = rbox(0.22, 0.75, 1.1, m, 0.08); sd.position.set(sx * 0.68, 0.22, -0.06); head.add(sd); }
  },
  bun: col => head => {
    const m = hairMat(col);
    const top = rbox(1.4, 0.42, 1.4, m, 0.2); top.position.set(0, 0.6, -0.04); head.add(top);
    const back = rbox(1.4, 1.1, 0.34, m, 0.15); back.position.set(0, 0.12, -0.58); head.add(back);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), m); bun.castShadow = true; bun.position.set(0, 0.7, -0.78); head.add(bun);
    for (const sx of [-1, 1]) { const sd = rbox(0.2, 0.9, 1.0, m, 0.08); sd.position.set(sx * 0.68, 0.12, -0.1); head.add(sd); }
  },
  short: col => head => {
    const m = hairMat(col);
    const top = rbox(1.36, 0.32, 1.36, m, 0.14); top.position.set(0, 0.62, -0.03); head.add(top);
    const back = rbox(1.36, 0.6, 0.3, m, 0.12); back.position.set(0, 0.35, -0.56); head.add(back);
  },
  curly: col => head => {
    const m = hairMat(col);
    const top = rbox(1.4, 0.42, 1.4, m, 0.18); top.position.set(0, 0.62, -0.03); head.add(top);
    for (let i = 0; i < 5; i++) { const s = rbox(0.34, 0.5, 0.34, m, 0.08); s.position.set(-0.52 + i * 0.26, 0.86, -0.1 + (i % 2) * 0.25); s.rotation.set(0.2 * (i % 2 ? 1 : -1), 0, (i - 2) * 0.22); head.add(s); }
    const back = rbox(1.4, 0.7, 0.3, m, 0.12); back.position.set(0, 0.3, -0.57); head.add(back);
  },
  pigtails: col => head => {
    const m = hairMat(col);
    const top = rbox(1.4, 0.42, 1.4, m, 0.2); top.position.set(0, 0.6, -0.04); head.add(top);
    const back = rbox(1.4, 1.0, 0.32, m, 0.14); back.position.set(0, 0.15, -0.58); head.add(back);
    for (const sx of [-1, 1]) { const p = rbox(0.42, 0.9, 0.42, m, 0.18); p.position.set(sx * 0.92, 0.0, -0.25); p.rotation.z = sx * 0.35; head.add(p); }
  },
  bald: (fringeCol = 0xdddddd) => head => {
    const m = hairMat(fringeCol);
    for (const sx of [-1, 1]) { const sd = rbox(0.18, 0.4, 0.9, m, 0.06); sd.position.set(sx * 0.67, 0.0, -0.15); head.add(sd); }
    const back = rbox(1.3, 0.4, 0.2, m, 0.08); back.position.set(0, 0.0, -0.6); head.add(back);
  },
};

// ---------- blocky cast presets (house cast; add more here, keep outfits fixed across videos) ----------
export const BLOCKY = {
  hero: () => makeChar({ shirtTex: stripes('#f4c51c', '#1b1b1b', 6), sleeveTex: stripes('#f4c51c', '#1b1b1b', 3), pants: 0x3b5fa8, hair: HAIR.spiky(0xf3c94a) }),
  mom: () => makeChar({
    shirtTex: canvasTex(128, (g, w, h) => { g.fillStyle = '#3f8a4e'; g.fillRect(0, 0, w, h); g.fillStyle = '#f3efe4'; g.fillRect(w * 0.38, 0, w * 0.24, h); g.fillStyle = '#e6d9b8'; for (const y of [30, 64, 98]) { g.beginPath(); g.arc(w * 0.66, y, 5, 0, 7); g.fill(); } }),
    shirt: 0x3f8a4e, longSleeve: true, pants: 0x4a4258, hair: HAIR.bun(0x3a2418), faceExtra: { lashes: true, cheeks: true } }),
  dad: () => makeChar({ shirt: 0x2f6fb0, pants: 0x3a3a3a, hair: HAIR.short(0x5a3a22), faceExtra: { mustache: true }, skin: 0xe8b88c }),
  friend: () => makeChar({
    shirtTex: canvasTex(128, (g, w, h) => { g.fillStyle = '#c83a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#9e2a2a'; g.fillRect(w * 0.3, h * 0.55, w * 0.4, h * 0.25); g.strokeStyle = '#f2f2f2'; g.lineWidth = 4; g.beginPath(); g.moveTo(w * 0.42, 0); g.lineTo(w * 0.4, h * 0.35); g.moveTo(w * 0.58, 0); g.lineTo(w * 0.6, h * 0.35); g.stroke(); }),
    shirt: 0xc83a3a, longSleeve: true, pants: 0x2d3a4f, hair: HAIR.curly(0x1d1d22), skin: 0xb07a52 }),
  littleSister: () => makeChar({ shirt: 0xf4a6c8, longSleeve: true, pants: 0xf4a6c8, shoes: 0xffffff, hair: HAIR.pigtails(0x6a4126), faceExtra: { lashes: true, cheeks: true }, scale: 0.8 }),
  oldMan: () => makeChar({ shirt: 0x7a5a3a, longSleeve: true, pants: 0x4a4a4a, hair: HAIR.bald(0xeeeeee), faceExtra: { mustache: true, mustacheColor: '#eeeeee' }, skin: 0xe8c0a0 }),
  neighbor: () => makeChar({ shirtTex: canvasTex(128, (g, w, h) => { g.fillStyle = '#a03030'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2a2a'; g.lineWidth = 6; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 18, 0); g.lineTo(i * 18, h); g.moveTo(0, i * 18); g.lineTo(w, i * 18); g.stroke(); } }), shirt: 0xa03030, pants: 0x3a3a50, hair: HAIR.bald(0x8a6a4a) }),
};

// ---------- monsters (original designs only) ----------
/** The Caller: tall, thin, matte black, arms to the knees, small round tilted head, pale smile line shown only when it speaks. */
export function makeCaller() {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const black = new THREE.MeshStandardMaterial({ color: 0x1b1b24, roughness: 0.5 });  // not pure black, so it reads against the night
  const torso = rbox(1.25, 3.2, 0.6, black, 0.12); torso.position.y = 6.0; body.add(torso);
  const neck = new THREE.Group(); neck.position.y = 7.55; body.add(neck);
  const neckBox = rbox(0.28, 0.5, 0.28, black, 0.1); neckBox.position.y = 0.2; neck.add(neckBox);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 24), black); head.castShadow = true; head.position.y = 0.78; neck.add(head);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const u = -1 + (2 * i) / 40, a = u * 0.95, e = -0.12 - 0.2 * (1 - u * u), r = 0.525;
    pts.push(V(r * Math.sin(a) * Math.cos(e), r * Math.sin(e), r * Math.cos(a) * Math.cos(e)));
  }
  const smileMat = new THREE.MeshBasicMaterial({ color: 0xf1ead6, transparent: true, opacity: 0, fog: false });
  head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.018, 8, false), smileMat));
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.78, 7.45, 0); body.add(sh);
    const arm = rbox(0.34, 5.0, 0.34, black, 0.1); arm.position.y = -2.5; sh.add(arm);
    const hand = rbox(0.3, 0.6, 0.2, black, 0.08); hand.position.y = -5.15; sh.add(hand);
    arms.push(sh);
    const hip = new THREE.Group(); hip.position.set(s * 0.32, 4.45, 0); body.add(hip);
    const leg = rbox(0.42, 4.45, 0.42, black, 0.1); leg.position.y = -2.22; hip.add(leg);
    legs.push(hip);
  }
  const rim = new THREE.PointLight(0x9ab8ff, 25, 14, 1.6); rim.position.set(0, 8.5, -3); root.add(rim);  // cool rim light from behind
  scene.add(root);
  const c = addCharApi({ root, body, neck, head, arms, legs, smileMat, kind: 'monster' });
  c.setSmile = k => { smileMat.opacity = k; };
  // the Caller has its own idle/walk: head tilted, limp arms, slow long steps
  c.idle = t => {
    neck.rotation.set(0.12, 0, 0.42 + Math.sin(t * 0.9) * 0.04); body.rotation.set(0.06, 0, 0);
    for (const [i, a] of arms.entries()) a.rotation.set(Math.sin(t * 1.3 + i) * 0.04, 0, (i ? 1 : -1) * 0.05);
  };
  c.walk = phase => {
    const s = Math.sin(phase);
    legs[0].rotation.x = s * 0.35; legs[1].rotation.x = -s * 0.35;
    arms[0].rotation.x = -s * 0.18; arms[1].rotation.x = s * 0.18;
    body.position.y = Math.abs(Math.cos(phase)) * 0.08; body.rotation.z = Math.sin(phase) * 0.04;
  };
  const baseRest = c.rest; c.rest = () => { baseRest(); smileMat.opacity = 0; };
  return c;
}
export const MONSTERS = { caller: makeCaller };
