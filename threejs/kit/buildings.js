// Textured Roblox-style buildings and cars built from parts (no download needed).
// Use these when a GLB prop (models/props, loadProp) doesn't fit: a house you need to colour, a car that gets smashed, a quick backdrop.
// Scale is Roblox studs, same as the cast (a character is ~5.2 tall): a door is ~7.5 tall, a car ~14 long.
//
//   import { makeHouse, makeCar } from '../../kit/buildings.js';
//   const h = makeHouse({ wall: 'brick', color: 0xb5553c, floors: 2 }); h.position.set(-30, 0, 0); h.rotation.y = Math.PI / 2; scene.add(h);
//   h.userData.door      -> local Vector3 of the step in front of the door (h.localToWorld(h.userData.door.clone()) for a mark)
//   h.userData.setLit(true/false) -> windows glow at night
//   const c = makeCar({ color: 0x2d5bd0 }); c.position.set(8, 0, -10); scene.add(c);   // front faces +Z
import { THREE, std, emissive, V, canvasTex } from './core.js';
import { tmat, tbox, tileUV } from './textures.js';

const add = (parent, m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); parent.add(m); return m; };

/**
 * House facing +Z (front door on the +Z wall). opts:
 *   w (front width, 26), d (depth, 20), floors (1|2), floorH (10), wall ('brick'|'siding'|'concrete'|'woodplanks'), color,
 *   trim (window/door frame colour, white), roofColor, roof ('shingles'|'slate'), door (door colour), chimney (true), lit (false)
 */
export function makeHouse(o = {}) {
  const w = o.w ?? 26, d = o.d ?? 20, floors = o.floors ?? 1, fh = o.floorH ?? 10, H = floors * fh;
  const wallM = tmat(o.wall ?? 'brick', o.color != null ? { color: o.color } : {});
  const trimM = tmat('plastic', { color: o.trim ?? 0xf2f2f2, roughness: 0.6 });
  const roofM = tmat(o.roof ?? 'shingles', o.roofColor != null ? { color: o.roofColor } : {});
  const g = new THREE.Group(); g.name = 'house';

  add(g, tbox(w + 0.8, 1.0, d + 0.8, tmat('concrete')), 0, 0.5, 0);                 // foundation
  add(g, tbox(w, H, d, wallM), 0, 1 + H / 2, 0);                                        // walls
  for (let f = 1; f < floors; f++) add(g, tbox(w + 0.3, 0.5, d + 0.3, trimM), 0, 1 + f * fh, 0);   // floor band

  // windows: glass + frame + cross mullions + sill, on front and back, and one per side wall per floor
  const glassDay = std(0x2c3f55, { roughness: 0.15, metalness: 0.2 }), glassLit = emissive(0xffcf7a, 1.4, 0x3a2a14);
  const panes = [];
  const windowAt = (x, y, z, rotY, ww = 4.2, wh = 5) => {
    const win = new THREE.Group(); win.position.set(x, y, z); win.rotation.y = rotY; g.add(win);
    const pane = add(win, new THREE.Mesh(new THREE.BoxGeometry(ww, wh, 0.1), glassDay), 0, 0, 0.08); panes.push(pane);
    const t = 0.45, dz = 0.3;
    add(win, tbox(ww + 2 * t, t, 0.5, trimM), 0, wh / 2 + t / 2, dz);                    // head
    add(win, tbox(ww + 2 * t + 0.8, t, 0.9, trimM), 0, -wh / 2 - t / 2, 0.5);            // sill
    for (const s of [-1, 1]) add(win, tbox(t, wh, 0.5, trimM), s * (ww / 2 + t / 2), 0, dz);
    add(win, tbox(0.22, wh, 0.25, trimM), 0, 0, 0.18); add(win, tbox(ww, 0.22, 0.25, trimM), 0, 0, 0.18);
  };
  const doorX = o.doorX ?? (floors === 1 ? -w * 0.18 : 0);
  for (let f = 0; f < floors; f++) {
    const y = 1 + f * fh + fh * 0.52, n = Math.max(1, Math.floor((w - 6) / 7));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 3 + (i + 0.5) * (w - 6) / n;
      if (f === 0 && Math.abs(x - doorX) < 4.5) continue;                                // leave room for the door
      windowAt(x, y, d / 2, 0); windowAt(-x, y, -d / 2, Math.PI);
    }
    for (const s of [-1, 1]) windowAt(s * w / 2, y, 0, s * Math.PI / 2);
  }

  // front door: panel, frame, knob, step, porch light
  const dw = 4, dh = 7.6, doorM = tmat('woodplanks', { color: o.door ?? 0x6b3f26 });
  add(g, tbox(dw, dh, 0.3, doorM), doorX, 1 + dh / 2, d / 2 + 0.1);
  add(g, tbox(dw + 1, 0.5, 0.6, trimM), doorX, 1 + dh + 0.25, d / 2 + 0.2);
  for (const s of [-1, 1]) add(g, tbox(0.5, dh, 0.6, trimM), doorX + s * (dw / 2 + 0.25), 1 + dh / 2, d / 2 + 0.2);
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), std(0xd8b44a, { metalness: 0.8, roughness: 0.3 })), doorX + dw * 0.32, 1 + dh * 0.47, d / 2 + 0.35);
  add(g, tbox(dw + 3, 0.9, 3, tmat('concrete')), doorX, 0.45, d / 2 + 1.9);
  const lamp = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), emissive(0xffd28a, 0, 0x333333)), doorX + dw / 2 + 1.4, 1 + dh * 0.8, d / 2 + 0.3);
  const porchLight = add(g, new THREE.PointLight(0xffc78a, 0, 14, 2), doorX + dw / 2 + 1.4, 1 + dh * 0.8, d / 2 + 1.5);

  // gable roof (ridge along X) with overhang, fascia trim, gable-end triangles in the wall material
  const rh = o.roofH ?? d * 0.38, over = 1.4, half = d / 2 + over, slope = Math.hypot(half, rh), ang = Math.atan2(rh, half);
  for (const s of [-1, 1]) {
    const slab = tbox(w + 2 * over, 0.7, slope, roofM); slab.rotation.x = s * ang;
    add(g, slab, 0, 1 + H + rh / 2 + 0.3, s * half / 2);
    const fascia = tbox(w + 2 * over, 0.6, 0.4, trimM); add(g, fascia, 0, 1 + H - 0.05, s * (half - 0.1));
  }
  const tri = new THREE.Shape(); tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rh); tri.closePath();
  for (const s of [-1, 1]) {
    const geo = new THREE.ShapeGeometry(tri); geo.rotateY(s * Math.PI / 2); tileUV(geo, wallM.userData.tile);
    const m = add(g, new THREE.Mesh(geo, wallM), s * (w / 2 + 0.01), 1 + H, 0); m.castShadow = m.receiveShadow = true;
  }
  if (o.chimney !== false) add(g, tbox(2.6, rh + 4, 2.6, tmat('brick', { color: 0x9a4a36 })), w * 0.3, 1 + H + (rh + 4) / 2, -d * 0.18);

  g.traverse(m => { if (m.isMesh && m.material !== glassDay) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData = {
    door: V(doorX, 1, d / 2 + 2.5), porchLight, size: { w, d, h: 1 + H + rh },
    setLit(on, porch = on) { for (const p of panes) p.material = on ? glassLit : glassDay; porchLight.intensity = porch ? 30 : 0; lamp.material.emissiveIntensity = porch ? 3 : 0; },
  };
  if (o.lit) g.userData.setLit(true);
  return g;
}

/**
 * Blocky Roblox-style car, front facing +Z, sitting on y = 0. ~7 wide, ~5.4 tall, ~14 long.
 * opts: color, style ('sedan' | 'suv' | 'taxi' | 'police'), lights (headlights on, default false)
 * Returns a Group; userData: { wheels[], body, glass[], setLights(on), smash() (cracked windshield + dented look) }.
 */
export function makeCar(o = {}) {
  const style = o.style ?? 'sedan', suv = style === 'suv';
  const color = o.color ?? (style === 'taxi' ? 0xf2c230 : style === 'police' ? 0xf4f4f4 : 0xc8352f);
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 });
  const dark = std(0x1f2124, { roughness: 0.8 }), chrome = std(0xd8dade, { metalness: 0.9, roughness: 0.25 });
  const glass = std(0x223548, { roughness: 0.1, metalness: 0.3 });
  const g = new THREE.Group(); g.name = 'car';
  const W = 7, L = suv ? 14.5 : 14, bodyH = suv ? 2.8 : 2.2, cabH = suv ? 2.8 : 2.2, y0 = 1.1;

  const body = add(g, new THREE.Mesh(new THREE.BoxGeometry(W, bodyH, L), paint), 0, y0 + bodyH / 2, 0);
  const cabL = suv ? 9 : 7, cabZ = suv ? -1.6 : -0.6, cy = y0 + bodyH + cabH / 2;
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W - 0.6, cabH, cabL), paint), 0, cy, cabZ);
  // glass: windshield + rear window slanted, side windows split by a B-pillar
  const panes = [];
  const ws = new THREE.Mesh(new THREE.BoxGeometry(W - 1.2, cabH * 1.12, 0.15), glass); ws.rotation.x = -0.45;
  add(g, ws, 0, cy, cabZ + cabL / 2 + 0.25); panes.push(ws);
  const rw = new THREE.Mesh(new THREE.BoxGeometry(W - 1.2, cabH * 1.05, 0.15), glass); rw.rotation.x = 0.4;
  add(g, rw, 0, cy, cabZ - cabL / 2 - 0.2); panes.push(rw);
  for (const s of [-1, 1]) for (const k of [-1, 1]) {
    const sw = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.12, cabH * 0.72, cabL / 2 - 0.9), glass), s * (W / 2 - 0.27), cy + 0.1, cabZ + k * cabL / 4); panes.push(sw);
  }
  // wheels with rims and arches
  const wheels = [], tyreGeo = new THREE.CylinderGeometry(1.35, 1.35, 1.1, 20), rimGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.14, 12);
  tyreGeo.rotateZ(Math.PI / 2); rimGeo.rotateZ(Math.PI / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wg = new THREE.Group(); add(g, wg, sx * (W / 2 - 0.45), 1.35, sz * (L / 2 - 2.8));
    wg.add(new THREE.Mesh(tyreGeo, dark)); wg.add(new THREE.Mesh(rimGeo, chrome)); wheels.push(wg);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 3.4), dark), sx * (W / 2 + 0.05), y0 + bodyH - 0.2, sz * (L / 2 - 2.8));   // arch trim
  }
  // bumpers, grille, lights, plates, mirrors, handles
  for (const s of [-1, 1]) add(g, tbox(W + 0.2, 0.8, 0.6, tmat('plastic', { color: 0x2a2c30 })), 0, y0 + 0.3, s * (L / 2 + 0.2));
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W * 0.45, 0.8, 0.1), dark), 0, y0 + bodyH * 0.55, L / 2 + 0.03);
  const headM = emissive(0xfff2cc, 0, 0xe8e8e0), tailM = emissive(0xff2a1a, 0.6, 0x5a0a08);
  for (const s of [-1, 1]) {
    add(g, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 0.12), headM), s * (W / 2 - 1.0), y0 + bodyH * 0.6, L / 2 + 0.04);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.12), tailM), s * (W / 2 - 1.0), y0 + bodyH * 0.65, -L / 2 - 0.04);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), paint), s * (W / 2 + 0.2), cy - cabH * 0.25, cabZ + cabL / 2 - 0.4);
    for (const k of [-1, 1]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.6), chrome), s * (W / 2 + 0.02), y0 + bodyH * 0.75, cabZ + k * cabL / 4 + 0.6);
  }
  for (const s of [-1, 1]) add(g, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.06), std(0xf4f4ee)), 0, y0 + 0.5, s * (L / 2 + 0.52));
  if (style === 'taxi') add(g, new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.8), emissive(0xfff4b0, 0.8, 0xf2e070)), 0, y0 + bodyH + cabH + 0.3, cabZ);
  if (style === 'police') {
    add(g, new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.8), emissive(0xff2020, 2, 0x600000)), -0.75, y0 + bodyH + cabH + 0.25, cabZ);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.8), emissive(0x2050ff, 2, 0x000060)), 0.75, y0 + bodyH + cabH + 0.25, cabZ);
    for (const s of [-1, 1]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, L * 0.55), std(0x1a1c22)), s * (W / 2 + 0.01), y0 + bodyH * 0.5, 0);
  }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  const crackM = std(0xb8c8d4, { roughness: 0.4 });
  g.userData = {
    wheels, body, glass: panes,
    setLights(on) { headM.emissiveIntensity = on ? 3 : 0; tailM.emissiveIntensity = on ? 1.6 : 0.6; },
    smash() { ws.material = crackM; body.rotation.z = 0.02; },
  };
  if (o.lights) g.userData.setLights(true);
  return g;
}

/**
 * Yellow school bus, front faces +Z (like makeCar), ~30 long, ~8 wide, ~10 tall. opts: color (0xf2b825), text ('SCHOOL BUS'), lights.
 *   const b = makeBus(); b.position.set(0, 0, 0); b.rotation.y = Math.PI / 2; scene.add(b);   // b.userData: wheels, setLights(on)
 */
export function makeBus(o = {}) {
  const paint = new THREE.MeshStandardMaterial({ color: o.color ?? 0xf2b825, roughness: 0.45, metalness: 0.15 });
  const dark = std(0x1f2124, { roughness: 0.8 }), chrome = std(0xd8dade, { metalness: 0.9, roughness: 0.25 });
  const glass = std(0x223548, { roughness: 0.1, metalness: 0.3 }), black = std(0x15161a, { roughness: 0.7 });
  const g = new THREE.Group(); g.name = 'bus';
  const W = 8, L = 30, y0 = 1.4, H = 7.6, hoodL = 4.5, boxL = L - hoodL;
  const zBack = -L / 2, zFront = zBack + boxL;                                  // passenger box from zBack to zFront, hood after it
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W, H, boxL), paint), 0, y0 + H / 2, zBack + boxL / 2);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.5, boxL - 0.4), paint), 0, y0 + H + 0.25, zBack + boxL / 2);     // roof cap
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W - 0.8, 3.2, hoodL), paint), 0, y0 + 1.6, zFront + hoodL / 2);              // hood
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W - 1.6, 1.4, 0.15), dark), 0, y0 + 1.6, L / 2 + 0.05);                      // grille
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W - 0.8, 3.4, 0.15), glass), 0, y0 + 5.0, zFront + 0.08);                    // windshield
  // black rub rails + side windows
  for (const s of [-1, 1]) {
    for (const y of [y0 + 1.0, y0 + 2.6, y0 + 3.6]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, boxL), black), s * (W / 2 + 0.03), y, zBack + boxL / 2);
    for (let i = 0; i < 8; i++) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 2.2), glass), s * (W / 2 + 0.03), y0 + 5.2, zBack + 1.8 + i * 2.85);
  }
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W - 2, 2.6, 0.12), glass), 0, y0 + 5.3, zBack - 0.05);                      // back window
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.1, 5.4, 2.4), glass), W / 2 + 0.05, y0 + 3.4, zFront - 1.6);               // door (right side)
  // SCHOOL BUS boards front and back
  const txt = canvasTex(64, (c, w, h) => { c.fillStyle = '#f2b825'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 44px sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.text ?? 'SCHOOL BUS', w / 2, h / 2 + 2); }, 320);
  const board = new THREE.MeshStandardMaterial({ map: txt, roughness: 0.8 });
  add(g, new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.1, 0.1), board), 0, y0 + H - 0.7, zFront + 0.12);
  const back = add(g, new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.1, 0.1), board), 0, y0 + H - 0.7, zBack - 0.08); back.rotation.y = Math.PI;
  // stop arm (left side), bumpers, lights
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 1.4), std(0xc8261e, { roughness: 0.5 })), -W / 2 - 0.15, y0 + 4.4, zFront - 2.5);
  for (const s of [-1, 1]) add(g, new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.8, 0.6), black), 0, y0 - 0.1, s > 0 ? L / 2 + 0.25 : zBack - 0.25);
  const headM = emissive(0xfff2cc, 0, 0xe8e8e0), redM = emissive(0xff3a1a, 0.5, 0x5a0a08), ambM = emissive(0xffa020, 0.5, 0x6a4008);
  for (const s of [-1, 1]) {
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 14).rotateX(Math.PI / 2), headM), s * (W / 2 - 1.1), y0 + 1.7, L / 2 + 0.05);
    for (const z of [zFront + 0.1, zBack - 0.1]) {
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 12).rotateX(Math.PI / 2), redM), s * (W / 2 - 0.8), y0 + H - 0.6, z);
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 12).rotateX(Math.PI / 2), ambM), s * (W / 2 - 1.7), y0 + H - 0.6, z);
    }
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.5), black), s * (W / 2 + 0.5), y0 + 4.6, zFront + 0.6);      // mirrors
  }
  // wheels
  const wheels = [], tyreGeo = new THREE.CylinderGeometry(1.5, 1.5, 1.2, 20).rotateZ(Math.PI / 2), rimGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.24, 12).rotateZ(Math.PI / 2);
  for (const sx of [-1, 1]) for (const z of [L / 2 - 4.5, zBack + 5.5]) {
    const wg = new THREE.Group(); add(g, wg, sx * (W / 2 - 0.5), 1.5, z); wg.add(new THREE.Mesh(tyreGeo, dark)); wg.add(new THREE.Mesh(rimGeo, chrome)); wheels.push(wg);
  }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData = { wheels, setLights(on) { headM.emissiveIntensity = on ? 3 : 0; redM.emissiveIntensity = on ? 2 : 0.5; } };
  if (o.lights) g.userData.setLights(true);
  return g;
}
