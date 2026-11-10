# Production Pipeline (the one to follow)

This is the fixed, self-contained pipeline for making a video. **Read only this file, `CLAUDE.md` (story rules) and the ONE theme file in `formats/`.**
**Never open another video's `world.js`, `shots.js` or notes** (`threejs/videos/*/`): copying past productions passes their mistakes on.
Reuse the kit (`threejs/kit/`, `threejs/models/`), never past video code. If something here is wrong or missing, fix this file, not a video.
Commands run from `threejs/`. Kit details beyond this page: `threejs/README.md` (only the section you need).

## 1. Hard rules
- **Audio first.** The voice is locked before any shot is written; shots are timed to it, never the reverse.
- **No rendering in the cloud at all, not even `--test` frames.** The user renders on the PC GPU. Finish the code, copy it to the PC folder, and tell the user
  which timestamps to check and what to look for. Full render: `threejs\render_gpu.bat <video>` (`--from a --to b` for a part).
- **First command of every video: `git status` in the PC folder.** If kit/model/doc files show as modified, commit and push them (or stage them into the cloud clone) before anything else (Crush Gravity : core.js, presets.json, a new GLB and the scripts/ move were uncommitted).
- **Before starting a video, commit and push any kit changes made on the PC**: the cloud clone must already have the kit (textures, buildings, interiors...). Uncommitted kit work cost a 9-file copy on Shoes. The PC folder must be connected to the thread.
- **Don't touch another video's folder**, and don't edit a shared kit file another agent owns (see §6).
- New reusable things (a set, prop, pose, creature, face) go in `threejs/kit/` or `threejs/models/` with one line in `threejs/README.md`.

## 2. Steps
1. **Script** → `videos/<v>/<v>_script.md`. Check it against CLAUDE.md §2–4b, the theme file and the §4b.14 self-check. Words ÷ rate (4.2, or the theme's) = length;
   check beat percentages before spending credits. Mark caption highlight words `*word*`. Title per CLAUDE.md §15.
2. **Lines** → `videos/<v>/lines.json`: `[[speaker, text], ...]`, narrator `"N"`. Tweaks in `voice_config.json` (`offset` semitones per speaker, `gain`, `spoken` pronunciations, v4 `tags`).
3. **Voice (house):** ElevenLabs **v4 Turbo**, voice Adam `IRHApOXLvnW57QJPQH2P`, stability 0.7, similarity 0.75, light audio tags only (told, not acted),
   then **1.5x plain faster playback, no pitch correction**. Characters = the same voice shifted a few semitones (user dislikes big shifts and "filtered" audio).
   `python -I kit/make_voice_eleven.py render videos/<v> --model eleven_v4_turbo --env <.env>` (costs credits; cached in `_eleven/`), then
   `python -I kit/make_voice_eleven.py post videos/<v> --model eleven_v4_turbo --semis 0 --tempo 1.5 --varispeed`
   → `voice_final.mp3`, `captions.json` (`[{w,s,e,speaker}]`), `word_timings.csv`, `lines_timed.json`. Key `ELEVENLABS_API_KEY` in `.env`: never print it.
   `render` splits v4 requests automatically every ~1800 characters (one 2.7k-char request came back with the last 9 lines silent); `post` stops with `TRUNCATED: line N` if any line has no audio (then lower `V4_MAX_CHARS` or set `v4_chunks` in `voice_config.json`, delete that cache file, render again).
   The `.env` lives in the **repo root** (not `threejs/`): `--env ../.env`. Needs `pip install websockets` (add it to the environment setup script).
   Free fallback: `python kit/make_voice_edge.py videos/<v>` (same outputs).
   **Run the voice in the cloud container, not on the PC VM:** the PC shell's proxy blocks api.elevenlabs.io (403). Stage the PC's repo-root `.env` into the cloud clone (git-ignored, never print it), `pip install websockets`, render + post there, then copy the outputs to the PC.
4. **World** → `world_index.js` FIRST (pure-data map of every set, mark, camera, prop and API, see §5), then `world_sets.js` + `world_cast.js` built to match it, see §4.
5. **Shots** → `shots.js` (+ `shots_<n>.js` parts) on the real word times from `lines_timed.json` / `captions.json`, see §5.
6. **Music** → `videos/<v>/music.json`: nothing for the default (TEMPOREX instrumental at 0.6); `{ "format": "crush" }` for crush (Caretaker at 0.3);
   `{ "track": "file.mp3", "volume": 0.4 }` or `{ "track": "none" }` to override. Mixed in automatically at render.
7. **Hand-off** → copy the folder to the PC, tell the user: the render command, 6–8 timestamps to check (one per set, the twist, any tricky framing), and any `Z-FIGHT RISK` lines to watch for.
8. **Edit** (user, CapCut): sound effects (`threejs/sfx/`: Pineapple set + glitch/alarm/intercom set from `gen_glitch_sfx.py`, see `sfx/SFX_README.md`), export.

## 3. Visual rules (vertical 1080x1920)
- Subjects in the centre band; top ~10% and bottom ~25% are app UI; captions sit ~65–70% down, so faces stay above them.
- `fov` is VERTICAL: frame width ≈ dist × tan(fov/2) × 2 × 9/16. At fov 32: head+shoulders ≈ 9 units away, waist-up ≈ 14, full body ≈ 18.
  At fov 40 the frame is only ~±11° wide: aim the look point AT the subject, keep the camera clear of other characters, start wider rather than closer.
  **Default is waist-up or head-and-shoulders with room around the subject; never tighter** (user: Mind Reader and Pip were too tight).
  **Minimum camera distances (Crayons review: "even further back", characters were cut off at the sides).** Distance = camera to the look point. These are floors, not targets:
  | Framing | fov | distance | frame width at the subject |
  |---|---|---|---|
  | One face, head + shoulders | 32 | ≥ 13 | ≥ 4.2 |
  | One character, waist-up | 34 | ≥ 15 | ≥ 5.2 |
  | Two-shot / one character full body | 36 | ≥ 20 | ≥ 7.3 |
  | Group or wide | 38–42 | ≥ 25 | ≥ 10 |
  | Insert (paper, clock, hand, fish) | 32–34 | 6–8 | 2–2.8 |
  Side offset of the camera ≤ ~15% of the distance; anyone else in the shot must sit inside the frame width. Pip/Mind Reader used ~9–11 for faces: too close.
  **The person talking must be visible (Crayons: the brother's shoulder hid Fern's face while she talked).** Automatic now: `kit/speaker_view.js`, run by the director. For every shot in which a character with `c.speaker` talks and is in frame, it casts rays from the camera to 7 points on their face (against everything solid) and checks the camera is in front of the face; if blocked it swings the camera around their head (±12–45°), then a bit higher, then 0.8x/0.65x closer, picked once per shot. Watch the render log for `speaker view: moved ...` and `SPEAKER BLOCKED: <shot>` (fix those by hand). Still stage dialogue so the listener is not between camera and speaker.
  **Indoor light:** the looks are tuned for outdoors; under a ceiling cut the sky fill to ~0.5x and the sun (key) to ~0.35x after `setLook` and let room lamps light it (Crayons `indoor()`), or paper and walls blow out.
  How Crayons does it: every camera is pulled back from its look point by `PULL = 1.45` (inserts 1.2), then walked back toward the look point until it is inside the room's walls (`place()` in `videos/crayons/shots.js`). Bright paper or white props: matte (roughness 1) and tinted to ~0xc0b8aa so lamp light + bloom don't wash them out.
- Every sentence is shown literally ("clock" → clock insert). Rotate: face close-ups (most), two-shots, wides with crowds, inserts, top-down/low angles, POV. Cut every ~1–2 s on phrase starts (median ~1.2–1.5 s); nothing over ~4 s; merge shots under ~0.8 s into a neighbour; reframe ones over 3.5 s (Crush Gravity: a 0.97 s median felt too choppy, max raised by 1 s).
- **No fast oscillation (Shoes: Max "vibrated").** Video is 30 fps, so any `Math.sin(t * k)` with k above ~12 rad/s (shiver, tremble, buzz, snore) aliases into random jitter. Shake/shiver/tremble = 8-12 rad/s with a visible amplitude (body 0.04-0.08, neck/arms 0.05-0.1 rad); camera `shake()` is already ~11-19. Never put different high frequencies on 4 body parts at once.
- **Camera always moves a little and always decelerates** (`easeOut`, never linear, never InOut everywhere): push-in 3–6% over 1–2 s, orbit ≤4°, drift ≤1 unit; alternate directions. "Hold then reframe" (hold ~1 s, ~0.4 s move, settle). Reveal pull-outs Quad Out over 2–2.5 s; last shot settles over ~4 s. Shake only for impacts: ≤0.1 offset, ≤1–2° roll, decays in 0.2–0.4 s.
- Over-the-shoulder for face-to-face beats. Faces always lit (5th arg of `aim` = camera fill; raise it at night). Interiors never blow out white.
- **Everyone in frame reacts** (face + pose fit the moment). Idle and blinks are automatic; use `faceBlink` for held faces.
- Monsters: no human walk (stiff glide, long paused strides, lurch, jerky head), no blinking. Big creatures not too blocky: a converted free model or rounded, tapered, many-part builds. Original designs only.
- Grade comes from the kit (soft flat Roblox look on by default; `material.userData.keepShine = true` opts a prop out; bloom, vignette). Add motes/fog/smoke per mood. One central place keeps coming back.

## 4. Kit API (what world files use)
```js
import { THREE, V, lerp, vlerp, clamp, easeOut, easeIn, easeInOut, rng, std, rbox, box, canvasTex, emissive, aim, orbit, shake, scene } from '../../kit/core.js';
import { setLook, focus } from '../../kit/look.js';        // setLook('night'|'bloodmoon'|'day'|'sunset'|'fog'|'storm'); focus(point) = shadow light on the shot
import { buildPropStreet, buildStreet, buildRoom, buildClock, at } from '../../kit/sets.js';
import { tmat, tbox, tplane, twedge } from '../../kit/textures.js';   // Roblox materials: brick, concrete, sidewalk, asphalt, grass, woodplanks, siding, shingles, slate, ...
import { makeHouse, makeCar } from '../../kit/buildings.js';     // textured part-built house and car
import { loadChar, loadProp } from '../../kit/models.js';
import { makeChar, HAIR, MONSTERS } from '../../kit/chars.js';
```
- **Textured, Roblox-looking sets.** No flat-colour `box`/`std` houses, cars, walls or ground: that reads as "basic geometry".
  Buildings: the house GLBs (`loadProp('house_brick'...)`, or the whole street with `await buildPropStreet(V(0,0,0))` →
  `{houses[{slug, group, side, front, facing}], cars, lamps (setOn), roadY, curbX}`), or `makeHouse({wall:'brick'|'siding', color, floors})` when a house must be
  recoloured or changed. Cars: `makeCar({color, style:'sedan'|'suv'|'taxi'|'police'})` (or a converted car GLB once one is in props.json).
  Any other part (wall, floor, fence, sign post, desk): `tbox(w,h,d, tmat('brick'|'concrete'|'woodplanks'|...))`, ground `tplane(w,d, tmat('grass'))`.
  Everything at Roblox scale (1 stud = 1 unit, a character ~5.2 tall, a door ~7.5, a car ~14 long), so props never need `scale: 0.4`.
- **Sets:** `buildStreet(V(0,0,0))` (old night street, primitives: prefer buildPropStreet) → `{porches[{door,facing,side}], lamps (setOn), windows, woodsZ}`; `buildRoom(V(-200,0,0))` → `{center, doorMark, windowCenter, lamp}`;
  `buildClock(V(200,0,0))` → `{center, set(h, m)}`. Props: `await loadProp(slug, {x, z, rotY, scale})`, slugs in `models/props/props.json`
  (house_brick/purple/green/grey, school, road_cross/t/straight, streetlight, tree). **Each set at its own origin 300 units apart, ground under ~290 units;**
  lift every flat layer on another (rug, road, path) 0.02–0.05. Keep props low-poly.
- **Characters:** `await loadChar(slug)` (all slugs in `models/presets.json`; colour variants via `"base"` + `recolor`/`hair` there). Crush default: `black_shirt_girl`.
  One hero avatar, 3–6 named roles each readable by outfit, outfits never change, adults visibly distinct (suits, hats, mustaches, white hair).
  API: `place(x,y,z,rotY)`, `setHome(...)` (where it stands when a shot doesn't place it; no home = hidden), `hide()`, `walk(phase)`, `run(phase)`,
  `setFace(k)`, `faceBlink(k, t, seed)`, `root`/`body`/`neck`/`arms[0 right,1 left]`/`legs[]`,
  poses `c.pose.wave(t,k,side) point(k,side) armsOut armsUp hug handsToFace hold sit lie fall(t,k) curl lookAt(point,k) nodShake(t,t0)` (k = 0..1 blend). Built facing +Z.
- **Faces:** drawn `happy smirk sad worried shocked scream sleeping crying blink`; twist morph only: `grin1 grin2 grin3 void`.
  Girls: `girl_slight_smile girl_little_laugh` (base), `neutral_droopy_eyes_girl girl_blushing_closed_mouth girl_grinning_face embarrassed_laugh tsundere_hmph_girl`.
  Never use grins for a normal laugh. New face = transparent PNG in `models/faces/` + name in `IMAGE_FACES` (`kit/models.js`).
- **Talking:** `c.speaker = 'MOM'` (the speaker name in captions.json) and the mouth moves on that speaker's words. Narration never moves the hero's mouth;
  thoughts/telepathy lines stay shut with `c.silentLines = [n]`. Manual: `c.mute = true` or `c.talk(0|1|2)`.
- **Interiors:** `buildHouseInterior(origin, {rooms:[{name, kind:'living'|'bedroom'|'nursery'|'hall'}]})` (`kit/interiors.js`): rooms side by side, open to +Z, doorways, windows, lamps, furniture, marks/cams/`index` per room. Use it instead of hand-building rooms.
- **World lookup without reading world files:** `node kit/index_near.mjs <v> [set <s> | near <mark|x,y,z> [r] | find <text>]` prints only what is near a point.
- **Behind-the-set sets (`kit/studio.js`):** `buildWoodsPath` (woods path + bushes, ends at `buildSkyWall`: painted sky wall, seams, a door `wall.door.open(k)`), `buildStudio` (studio/containment hall, ~550 screens showing `models/screens/` stills, `featured` big screens with labels, desks, director's chair, film cameras, lab table + `makeVial`, `alarm(t,on)` red beacons at 0.9 s). Call `set.show(false)` for sets not in the shot.
- **Glitch (`VFX/glitch.js`):** `const G = glitchTrack([{ at, dur: 0.3, kind: 'hit'|'soft'|'static'|'black'|'cut', k, stutter: 'freeze'|0.1, tint }])`, then in `setup()` return `post: (ctx, t) => G.post(ctx, t)` (runs AFTER the caption, so the word tears too) and `timeMap: G.timeMap` (freezes/loops the picture only). Caption cuts: `words: glitchWords(await loadWords('<v>'), [{ match: 'pine-', type: true }, { match: 'your', end: 0.2 }, { match: 'dog', scramble: 0.15 }])`. Panels: `hudText(ctx, t, { at, dur, text: 'CODE 2: BREACHED CONTAINMENT.\nAREA 45' })`, `alarmWash(ctx, t, { at, until })`. Deterministic per frame (safe with 3 render workers). Keep hits short (0.2-0.5 s) and put a matching `sfx/glitch_*.wav` on each one.
- **Camera:** `aim(pos, look, fov=45, roll=0, fill=0)`; `orbit(target, dist, yawDeg, pitchDeg)` returns a position; `shake(t, amt)` returns an offset to add.

**Frames render out of order:** every frame each character is reset to rest at its home (or hidden). A shot must place and pose everyone it shows,
must not depend on an earlier shot, and must `updateMatrixWorld()` before reading another object's world position.
**Anything per-character that a frame doesn't set must be identical in every render worker** (Crush Gravity: every *standing* character vibrated, floating ones were fine).
Cause: `ALL_CHARS` filled in GLB download order, which differs per worker, and the director seeds `idle()` by that index, so the 3 workers (each renders every 3rd frame)
bobbed with 3 different phases. Floating poses overwrote the idle, so only standing characters jittered. Fixed in the kit: `loadChar` keeps call order (`c.loadOrder`) and
`reset()` also returns the face to `c.defaultFace` (an unknown `setFace` name used to leave a stale face from another frame). Never seed anything by load order or `Math.random()`;
use only valid face names. Check suspicious motion without rendering: `node kit/pose_probe.cjs <v> <from> <to>` (poses only, draws nothing; spikes in "jerk" = jitter).

## 5. File layout and contract (`threejs/videos/<v>/`)
| File | Owner | Exports / contents |
|---|---|---|
| `PLAN.md` | coordinator | theme, title, cast table (role → slug → speaker name), set list (name → origin), export names, shot ranges per agent |
| `<v>_script.md`, `lines.json`, `voice_config.json`, voice outputs | script+voice | §2 steps 1–3 |
| `world_index.js` | world agent, written FIRST | pure data, **no imports**: `export const INDEX = { sets:{name:{origin,size,look,note}}, marks:{'set.name':{p:[x,y,z],face,note}}, cams:{'set.name':{p,look,fov,note}}, props:{name:{p,note,api}}, chars:{name:{p,note}}, api:['sneakers.walk(t,speed) -> distance', ...] }`. World coordinates, every name a shot may use, one line per entry. `world_sets.js` builds from it |
| `world_sets.js` | world agent | per set: `export const ROOM = V(...)`, `export const room = {marks}` (stand spots), `export const ROOM_CAMS = {name: [pos, look, fov]}`, `export function look_room()` (setLook + focus), props/fx with `hide()` |
| `world_cast.js` | world agent | `export const [hero, mom, ...] = await Promise.all([...].map(s => loadChar(s)))`, speakers set, creatures, helper poses (`export function scared(c,k)`) |
| `shots_<n>.js` | shots agent n (2 parts) | `export function part(W) { return [{ s, e, name, f(lt, t) }, ...] }`, only its time range |
| `shots.js`, `music.json` | coordinator | glue below |

```js
// shots.js (coordinator): joins the parts; the director loads this file
import * as S from './world_sets.js';
import * as C from './world_cast.js';
import { part as p1 } from './shots_1.js';
import { part as p2 } from './shots_2.js';
export async function setup() {
  const W = { ...S, ...C };
  const shots = [...p1(W), ...p2(W)];
  return { shots, duration: shots[shots.length - 1].e,
           highlights: { mom: '#7ddc7d', midnight: '#ffd23f' },   // yellow ffd23f, red ff5a5a, blue 7fb2ff, green 7ddc7d, pink ff7ab8
           before(t) { /* hide per-shot fx */ }, after(ctx, t) { /* fades: fade() from kit/captions.js */ }, intro: true };
}
```
Words come from `captions.json` automatically. One shot = `{ s, e, name, f(lt, t) }` (lt = time into the shot): place + pose + face everyone, `aim(...)`, `focus(...)`.

## 6. Parallel production (coordinator + 3 agents) and token rules
The video's thread is the **coordinator**. It writes `PLAN.md`, assigns files, never lets two agents write the same file, merges and checks.
**Two agents for a short (≤ ~60 s / ≤ ~50 shots), three for a long video** (Shoes used 5 and ~610k subagent tokens; each cold start re-reads ~25-35k; Crush Gravity used 3 for 49 s and ~325k, the two shots agents ~92k each re-reading the same context): one **world agent**, and **one shots agent** for a short or two shots agents for 60 s+.
Each agent reads only: its PIPELINE sections (below), the theme file only if it needs story context, `PLAN.md`, its own files, and kit functions by `grep -n` / `sed -n` ranges. Never whole kit files, never other videos, never images.
| Agent | PIPELINE sections | Reads besides | Writes |
|---|---|---|---|
| World | §3, §4, §5 | PLAN.md, kit/sets.js + buildings.js + interiors.js ranges, `presets.json` names | `world_index.js` first, then `world_sets.js`, `world_cast.js` (+ presets/chars/faces/footwear if needed) |
| Shots (1, or 1 + 2 for 60 s+) | §3, §5 | PLAN.md, **`node kit/index_near.mjs`** output, its `lines_timed.json` range, the video's script | `shots_1.js` (+ `shots_2.js`) |
1. **Script + voice** (coordinator or one cheap agent): script → §4b self-check → `PLAN.md` (cast, sets, export names, shot ranges) → lines + voice. Ask the user before the paid render if the premise or length changed; once the user approves the take, audio is locked.
2. **World agent, as soon as `PLAN.md` exists** (no timings needed): writes `world_index.js` (coordinates and names of everything, **kept small: ~40 marks and ~20 cams for a short**; Crush Gravity's 96 marks / 35 cams cost tokens to design and to read back, and the shots used under half), then builds sets (use `buildPropStreet`, `makeHouse`, **`buildHouseInterior`**; fewer, smaller sets: interiors with several rooms in one build, the clock as an insert inside a room) and cast. It ends by running `node kit/index_near.mjs <v>` to confirm the index prints. It is the only editor of `presets.json`, `chars.js`, faces and any new kit file listed in PLAN.md.
3. **Shots agent(s)** (can run on a cheaper model: they follow a precise index): one agent for a short; for 60 s+ split the timeline at beat boundaries into two ranges. Start it in parallel with world phase 2 as soon as `world_index.js` exists (world agent phase 1 = index only, then resume it with a message for phase 2). A shots agent does NOT read `world_sets.js`/`world_cast.js`. For each beat it runs `index_near.mjs <v> near <mark> 30` and builds cameras from those coordinates (`orbit()` around a mark), using only listed names; a missing mark/camera is requested from the coordinator, not invented.
4. **Coordinator merges:** writes `shots.js` + `music.json`, then checks: `node --input-type=module --check < file.js` on every file; every name a shot destructures from `W` exists in the world exports; ranges meet with no gaps or overlaps (each `e` = next `s`), lengths 0.8-4 s; every shot places everyone it shows; framing follows §3. Fixes conflicts itself, then §2 step 7.
**Token rules ("productions cost way more than they should"):** do not list/grep/open folders for context; read `script_ideas.md` by heading range only; no images; no renders; give each agent a section list, not "read PIPELINE.md"; check the log of what each agent read (ask for its 3 biggest reads) and keep a `TOKEN_LOG.md` in the video folder.
