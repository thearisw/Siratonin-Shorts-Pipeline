# three.js reels

Our vertical story reels are animated and rendered in three.js now; Roblox Studio is no longer used.
Everything is code: the sets, the characters, the camera and the shot list. A headless browser renders each frame at an exact time,
and ffmpeg muxes the frames with the narration. Renders are deterministic and need no OBS.

## Setup (once)
```
cd threejs
npm i                     # three 0.170.0 + playwright
npx playwright install chromium
```
ffmpeg must be on PATH. `--workers` barely speeds up the software renderer used in the cloud; on a PC with a GPU, one worker is already fast.

## Make a video
**Follow `../PIPELINE.md`** (the fixed pipeline; never copy another video's files). Short version:
1. Audio first, as always (CLAUDE.md §9): `voice_final.mp3` + `word_timings.csv` (or `captions.json` = `[{w, s, e}]`) in `videos/<video>/`.
2. Write `world_sets.js`, `world_cast.js` and `shots.js` per `PIPELINE.md` §4–5 on the real word times (don't copy past videos' code).
3. Check framing **on the user's PC only** (no cloud renders, not even test frames): `node kit/render.js <video> --test 1.2,5.5,9` writes single frames to `videos/<video>/test/`.
4. Render **only on the user's local GPU** (never run a full render in the cloud): `render_gpu.bat <video>` (see "Fast render on the PC"). `node kit/render.js <video> --workers 4` This writes `videos/<video>/out.mp4` with the voice muxed in and captions burned in.
   `--from 20 --to 40` renders just part of the video.
5. Background music is added automatically (see below).

## Background music
Every render mixes `music/TEMPOREX - Numbers Instrumental _ Perfect intro loop.mp3` in under the narration: looped, at volume 0.6
(about 6 dB under the voice), ducked a little while someone talks, faded out over the last 1.5 s. Code: `kit/music.js`, used by both renderers.
To use another track, put it in `music/` and add `videos/<video>/music.json`: `{ "track": "Other song.mp3" }`, or `{ "track": "none" }`
for no music. **Crush videos** add `{ "format": "crush" }` to music.json and get `music/Caretaker - A4 - Childishly fresh eyes.mp3` at volume 0.3 instead
(per-theme defaults are `FORMAT_MUSIC` in `kit/music.js`). Optional fields: `"volume": 0.15`, `"start": 12.5` (seconds into the track). On the command line,
`--music "Other song.mp3"`, `--music none` and `--music-volume 0.15` win over music.json.

## Fast render on the PC (GPU)
The cloud machine has no GPU, so Chrome draws there with SwiftShader on the CPU (about 1.5 s a frame). On the user's PC
(RTX 4050 laptop) run `render_gpu.bat pineapple` or `node kit/render_gpu.js pineapple` from this folder: WebGL runs on the
NVIDIA card through ANGLE/D3D11, frames stream straight into ffmpeg and encode with NVENC. With 3 workers it does about 23 fps (43 ms a
frame), so a 150 s reel takes about 3.5 minutes. It prints the WebGL renderer at start; if it says SwiftShader, something is wrong.
`--from/--to/--out/--encoder auto|nvenc|amf|qsv|x264` work as in render.js. Copy the video's folder to the PC first.

## Layout
| Path | What |
|---|---|
| `index.html` | Page the renderer opens (`?video=<name>`). Also opens in a normal browser via any static server for a live look. |
| `kit/core.js` | Renderer (1080x1920), bloom, camera `aim(pos, look, fov, roll, fill)`, `orbit()`, `shake()`, easing, mesh helpers |
| `kit/look.js` | `setLook('night' \| 'bloodmoon' \| 'day' \| 'sunset' \| 'fog' \| 'storm')`, `focus(point)` moves the shadow light to the shot |
| `kit/chars.js` | Blocky rig `makeChar`, hair styles, blocky cast presets, monsters (the Caller), poses (`c.pose.wave/point/hug/sit/lie/fall/curl/...`) |
| `kit/faces.js` | Swappable faces: happy, smirk, sad, worried, shocked, scream, sleeping, crying, blink, grin1-3 + void (twist morph) |
| `kit/models.js` | `loadChar(slug)`: builds a blocky preset or loads a GLB with GLTFLoader and rigs it into the same API |
| `kit/sets.js` | `buildPropStreet` (Roblox-scale street from the house GLBs, async), `buildStreet` (12 streetlights with `setOn`, porches, woods), `buildRoom` (interior with door + window), `buildClock` |
| `kit/footwear.js` | `makeShoes(kind)` (sneakers/slippers/boots/baby/bigboots pair that walks or climbs steps by itself: `place/walk/stepUp/hide/show`), `makeFootprints(points, {bare, scale})` (snow footprint trail, `reveal(k)/hide`) |
| `kit/textures.js` | Roblox-style tiled materials `tmat(name,{color,tile})` + `tbox`/`tplane`/`twedge` with UVs in studs |
| `kit/buildings.js` | Textured part-built `makeHouse` (framed windows, gable roof, `setLit`) and `makeCar` (sedan/suv/taxi/police) |
| `kit/captions.js` | One-word captions with colour highlights, vignette, fades |
| `kit/director.js` | Runs a video's shot list every frame (hooks: `before`, `after`, `post` = after the caption, `timeMap` = picture-only time remap) |
| `kit/studio.js` | Behind-the-set kit: `buildWoodsPath` (path into the woods, trees, hiding bushes), `buildSkyWall` (painted sky wall with seams + a door that opens on a lit corridor), `buildStudio` ("AREA 45" studio: ~550 screens, desks, director's chair, film cameras, lights, boom mic, lab table, alarm beacons, intercom), props `makeVial` (SIRATONIN label), `makeClapper`, `makeBush`, `makeMug`, `makeDropper`, `makeMegaphone`, `makeSign`, `makeScreenWall` |
| `VFX/glitch.js` | Glitch post pass (deterministic): `glitchTrack([{at,dur,kind,stutter}])` → `post`/`timeMap` for setup(); slice tear, RGB split, scanlines, datamosh blocks, static, black drop-out; caption cuts `glitchWords` (mid-word cut, type-on stutter, scramble, repeat); `hudText` (typed intercom/subject panels), `alarmWash` |
| `models/screens/` | 16:9 stills from the channel's own `out.mp4` renders for screens (`screens.json` lists them with source times; `_contact_sheet.png` to eyeball them) |
| `sfx/` | Synthesized CC0 sound effects (Pineapple set + `gen_glitch_sfx.py` glitch/alarm/intercom set), see `sfx/SFX_README.md` |
| `kit/render.js` | Headless render + ffmpeg mux |
| `kit/music.js` | Background music: picks the track (default, music.json or --music) and mixes it under the voice |
| `music/` | Background music tracks (default: the TEMPOREX instrumental) |
| `kit/make_voice_edge.py` | Edge TTS narration with per-character voices: writes voice_final.mp3, captions.json, word_timings.csv |
| `models/presets.json` | Every character by slug: blocky builders and GLB files |
| `models/*.glb` | Converted Roblox avatars (one per character) |
| `videos/<video>/` | `shots.js`, `voice_final.mp3`, `word_timings.csv`/`captions.json`, `out.mp4` |

## Characters
All characters share one API, whether they're blocky or GLB:
- `root` (position/rotation), `body` (bob/lean), `neck` (head turn/tilt), `arms[0]` = right, `arms[1]` = left, `legs[0]`/`legs[1]`
- Faces: the drawn kit faces (`kit/faces.js`) plus image faces from `models/faces/` (`girl_slight_smile`, `girl_little_laugh`: the base girl expressions, listed in `IMAGE_FACES` in `kit/models.js`). Don't use `grin1-3` for a normal laugh.
  More girl image faces: `neutral_droopy_eyes_girl` (black_dress_girl's own face), `girl_blushing_closed_mouth`, `girl_grinning_face`
  (a smug half-lidded smile, not an open grin), `embarrassed_laugh` (classic open-mouth "D" laugh), `tsundere_hmph_girl`. Which beat each suits: `formats/crush_format.md` §7b.
  A preset can set `defaultFace` (the face a character starts with); black_dress_girl starts on `neutral_droopy_eyes_girl`.
  **Adding an image face:** a 256x256 transparent PNG laid out like the others (eyes about 140 px wide, centred near x 145, eye line near y 100),
  then its name in `IMAGE_FACES`. Faces with skin or a white background baked in get that colour keyed out with the border flood fill in
  `kit/face_tools/keyout.py` (keeps enclosed eye whites; `SOFT=1` for soft blush gradients) and are placed with `place.py`.
  Decals that Roblox won't let us download come in through Studio: put each decal on a Part, Export Selection, and take `<Part>_diff.png`
  (keep Studio's camera close to the parts first, or the export saves a blurry 32-64 px copy).
- **Talking mouths**: give a character `c.speaker = 'RUIZ'` (the speaker name on the words in captions.json) and the
  director opens and closes their mouth on the word times, on top of whatever face the shot set. Every face, drawn or image, has
  `<face>#1` (half open) and `<face>#2` (open) variants made automatically (`kit/faces.js`); a new PNG face needs nothing extra.
  The narrator's voice-over doesn't move the hero's mouth (that's the house look). A line heard in someone's head stays shut:
  `c.silentLines = [27]`. Per shot: `c.mute = true` (this frame) or `c.talk(0|1|2)` by hand. Code: `kit/talk.js`.
- **Crayon faces** (Crayons): `crayon1` (scribble eyes, red crayon smile), `crayon2` (smile runs to the face edges), `crayon3` (huge filled scribble grin), drawn kit faces for a 'drawn by a child' twist. Widen the face plane so the smile runs off the head (see `heroFaceWide` in `videos/crayons/world.js`).
- **Speaker in view**: the director keeps any character who is talking visible (`kit/speaker_view.js`: rays to the face, swings/raises/moves the camera closer if something blocks it, once per shot). Log lines `speaker view: moved` / `SPEAKER BLOCKED`. Opt out: `speakerCheck: false` in setup() or on a shot. `window.poseAt(t)` sets up a frame without drawing it (for code checks).
- `setFace(kind)`, `faceBlink(kind, t)`, `walk(phase)`, `run(phase)`, `place(x, y, z, rotY)`, `setHome(...)`, `hide()`
- A character is built facing +Z, so `rotY = -PI/2` faces -X.

Frames render in parallel and out of order. Every frame, each character is reset to its rest pose and moved to its `setHome` spot,
or hidden if it has none. A shot must place everyone it shows.

**GLB conventions** (what `models.js` expects): one GLB per character, Y-up, feet at origin, facing +Z, no skinning, body parts as
named nodes (R15: Head, UpperTorso, LowerTorso, Left/RightUpperArm, LowerArm, Hand, UpperLeg, LowerLeg, Foot; or R6: Head, Torso,
Left Arm...). Origins and hierarchy don't matter: the loader chains each limb and puts a pivot at every joint. Preset fields:
`file`, `name`, `height` (default 5.2), `yaw` (degrees, if the model doesn't face +Z), `faceBaked` + `headNoFace` (a head texture
with no face, so face swaps work), `faceSwap` (add a face plane to a plain head), `faceScale`, `faceLift`, `faceExtra` ({lashes, mustache, cheeks, glasses}).

## Framing rules of thumb (vertical, fov is vertical)
Frame width at the subject ≈ distance × tan(fov/2) × 2 × 9/16. At fov 32: head + shoulders ≈ 9 units away, waist-up ≈ 14, full body ≈ 18.
Turn up the camera fill (5th argument of `aim`) on close-ups at night so faces read.

## Adding a Roblox character (Creator Store model → GLB)
1. Insert the free model in Studio with the MCP `insert_asset` tool (plugin `LoadAsset` is refused), under Workspace > `_GLBExport`, scripts removed.
2. In Studio: select it, right-click, "Export Selection…" to `models/_work/<slug>/<slug>.obj`. **One folder per model**: every export's textures share names.
3. `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P models/_work/convert.py -- "<abs path>/models/_work/<slug>/<slug>.obj" <slug> "<abs path>/models"`
   (absolute paths: Blender can't save the PNGs with a relative output folder). It handles R6, R15 (parts found by position) and one-mesh creatures (a single rigid `Torso`).
4. Check `<slug>_preview.png`, add the presets.json entry, and test with `node models/_work/shot2.js "slug1,slug2@night"` (writes `models/_work/test2_N.png`).
Optional `convert.json` next to the OBJ: `{"drop": ["Handle1"], "max_acc_faces": 1500, "max_faces": {"Handle2": 3000}}` leaves out accessories (e.g. a mesh Face accessory that would cover face swaps) and decimates heavy hair/hats (low-poly rule). Long hair shreds below ~3000 faces; fur hats are fine at 1500. Export from Studio with the camera close to the model so its textures are full size.
Known export quirks: a model saved facing +X needs a 90° turn in the OBJ before converting (mom_brown); a body-scaled R6 exports its limbs at default size and needs them scaled about their centres (dad_white). Originals are kept as `*_orig.obj.bak`. If a face-less head should still get kit faces, set `faceSwap: true` and leave `faceBaked` out (`faceBaked: false` turns faces off).

## Notes for future videos
- **Narration (Pineapple):** ElevenLabs **v4 Turbo**, voice Adam `IRHApOXLvnW57QJPQH2P`, stability 0.7, similarity 0.75,
  light audio tags only (a story being told, not a scene acted out), then sped up **1.5x as plain faster playback (pitch rises), no pitch correction**.
  `python -I kit/make_voice_eleven.py render videos/<v> --model eleven_v4_turbo --env <.env>` then
  `python -I kit/make_voice_eleven.py post videos/<v> --model eleven_v4_turbo --semis 0 --tempo 1.5 --varispeed`.
  One v4 Turbo request stops after ~3 min of audio, so the script splits long scripts (CHUNKS in the script). The user disliked big pitch shifts (distorted).
- **Z-fighting on floors (seen in Pineapple):** two floor layers at the same height flicker. Never stack coplanar floors: lift the upper one
  (rug, road, path, interior floor over ground) by ~0.02–0.05 units, or use `polygonOffset` on the top material.

## Colour variants (extra side characters from one model)
A preset with `"base": "<slug>"` reuses that character and recolours it in `kit/models.js` (skin is protected automatically):
`{"base": "dad_white", "name": "Man (red shirt)", "recolor": {"tint": "#b03a32"}, "hair": {"tint": "#7a5230"}}`.
`recolor`/`hair` take `hue` (degrees, keeps the pattern), or `tint` (a colour, keeps light/dark detail, works on white clothes), plus optional
`sat`, `light` multipliers and `keep: ["#ffffff"]` (colours left alone). `hair` applies to every accessory (hair, hats). 14 variants are already in presets.json.

## Props (buildings, roads, street furniture)

**Low-poly is the house look.** We are not aiming for realism. Keep every converted model and prop low-poly and trim heavy assets without asking: pass a decimate ratio to `convert_prop.py` (about 0.12 for builds over ~200k triangles; house_green went from 1.1M to 137k triangles with no visible loss at street distance). Aim for GLBs well under ~3 MB.

`await loadProp('house_brick', {x, z, rotY})` from `kit/models.js` loads `models/props/<slug>.glb` (listed in `models/props/props.json`) at Studio scale
(1 stud = 1 unit, so they match the cast). Convert a Studio export with
`blender -b -P models/props/_work/convert_prop.py -- "<abs>/models/props/_work/<slug>/<slug>.obj" <slug> "<abs>/models/props"`.

`front` in props.json says which local side of a house lot faces the street (`-z`/`+z`); `buildPropStreet` uses it to turn houses toward the road.
The house lots are Roblox size (65-100 studs long, 22-45 tall), so build streets at that scale instead of shrinking the props.

### Textures and part-built assets
`kit/textures.js`: `tmat(name, {color, tile})` gives a tiled Roblox-style material (procedural canvas, light greys tinted by `color`, the way a Roblox
Brick part tints its mortar too). `tbox` / `tplane` / `twedge` / `tileUV(geo, tile)` keep the texture at a fixed size in studs on any part size.
`kit/buildings.js`: `makeHouse(opts)` (brick or siding walls, framed windows with mullions and sills, framed door, shingle gable roof, chimney,
`userData.door` mark, `userData.setLit(on)` for night) and `makeCar(opts)` (sedan/suv/taxi/police, glass, rims, lights, `userData.setLights(on)`, `smash()`) and `makeBus(opts)` (yellow school bus ~30 long, front +Z, SCHOOL BUS boards, stop arm, `userData.wheels`, `setLights(on)`).

### Getting more assets
Outside asset sites can't be reached from cloud sessions, so new models come from the Roblox Creator Store through Studio (same route as the houses):
insert in Studio, Export Selection to `models/props/_work/<slug>/<slug>.obj`, run `convert_prop.py` (decimate if heavy), add a props.json entry.
Free store picks (check the thumbnail first): cars `113700576399250` (Low Poly Cars, Dandan042899), `78100533916748` (Low Poly Cars Pack, GlazzVex),
`93588406843965` (Low-Poly Vehicle Pack, cars/trucks/vans), `305072608` (Two Basic Ford Citizen Cars, classic Roblox look);
buildings `14768613454` (NYC brick apartment, 3 storeys), `11107324912` (classic Roblox Suburban house).
Outside the store (download on your PC, all CC0 unless noted): kenney.nl (Car Kit, City Kit Suburban/Commercial: GLB, blocky, closest to Roblox),
quaternius.com (Ultimate Vehicles / Modular buildings), poly.pizza (search "car", "house"; check each licence), ambientcg.com and polyhaven.com
(brick/concrete/asphalt textures, 1K JPG is enough). Drop textures in `models/textures/` and use `new THREE.TextureLoader()` with `tileUV`.

## Z-fighting (flicker) rules (Fog)
- **Sets sit 300 units apart, so a set's ground must be smaller than ~290 units.** Fog's camp ground (600x600) overlapped the schoolyard
  ground at y 0 and showed as a flickering dark square. Every flat layer on top of another (yard, road, rug, path, lines) is lifted 0.02-0.05.
- `kit/director.js` checks the scene once at load and prints `Z-FIGHT RISK: ...` (render.js / render_gpu.js show it as `page:`) for flat
  surfaces at the same height that overlap. Fix every warning before a full render.
- GLB limbs touch the torso with coplanar faces; `kit/models.js` gives limb materials a polygon offset so the torso always wins (no shimmer on clothes).
- Anything a shot reads back from another object (localToWorld, getWorldPosition) must update that object's matrix first: frames render out of
  order, so a stale matrix is from some other frame and jitters.
- `kit/studio.js` — fourth-wall sets: `await buildWoodsPath(V(0,0,600), {length:160, wall:true})` (→ `marks`/`cams` incl. the sky wall's `wallDoor`, `wall.door.open(k)`), `await buildStudio(V(600,0,0), {featured:[{img:'pineapple_1', label:'F-13'}]})` (→ `alarm(t,on)`, `room(k)`, `vial`, `clapper.clap.set(k)`, `featured[]`). Each set has `show(on)`: hide the sets a shot doesn't use (hidden lights cost nothing).
- `VFX/glitch.js` — see PIPELINE.md §4 "Glitch". Import from a video as `../../VFX/glitch.js`.
- `kit/interiors.js` — `buildHouseInterior(origin, {rooms})`: multi-room house interior (bedroom, nursery with closet, living, hall), open to +Z, with marks, facing, cams, lamps and a flat `index` for `world_index.js`.
- `kit/index_near.mjs` — `node kit/index_near.mjs <video> [set|near|find ...]`: prints only the part of a video's `world_index.js` near a point (agents use it instead of reading world files).
- `kit/pose_probe.cjs` — `node kit/pose_probe.cjs <video> <from> <to>`: steps 30 fps through `window.poseAt` (poses only, draws nothing) and prints each visible character's per-frame jerk, to find jitter/vibration without rendering.
