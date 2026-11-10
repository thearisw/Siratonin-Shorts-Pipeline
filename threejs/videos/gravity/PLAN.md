# Crush Gravity — PLAN (coordinator)

Theme: crush, template F2 + tsundere crush. Title: "My crush's mood controls gravity 😳". Script: `gravity_script.md`. Voice LOCKED: `voice_final.mp3`, 48.6 s.
Timings: `lines_timed.json` (per line s/e), `captions.json` (per word). Music: `music.json` = `{ "format": "crush" }`.
No rendering anywhere in the cloud, not even --test. Never open other videos' folders.

## Story in one line
At Rose's school, her real mood sets gravity (happy = float, sad = heavy). She is a tsundere: every line she says is cold ("That's so dumb", "Not funny", "Go away", "No!") and every one makes things float harder. The face lies, the ceiling tells the truth.

## Cast (world_cast.js exports; speaker names as in captions.json)
| Export | Role | Slug (check `models/presets.json`) | Speaker | Look / notes |
|---|---|---|---|---|
| `hero` | narrator boy | `narrator_boy` | `ME` (line 19 only; narration never moves his mouth) | the one hero avatar |
| `rose` | the crush, tsundere | `black_shirt_girl` | `ROSE` | faces: `tsundere_hmph_girl` (her default when talking), `neutral_droopy_eyes_girl` (deadpan), `girl_blushing_closed_mouth` (while floating / after denials), `girl_slight_smile` only hidden/brief. Arms crossed a lot |
| `hale` | Mr Hale, principal | `suit_man` | `HALE` | adult, suit, visibly distinct |
| `kids` (array of 6) | students / crowd | `friend_boy cap_boy plaid_boy blonde_girl school_girl spiky_kid` | — | float, get squashed, stuck to ceiling, yell |

## Sets (world_sets.js exports; one origin each, ≥300 apart)
| Set | Origin | Contents | Used by lines |
|---|---|---|---|
| `SCHOOL` interior | `V(0,0,0)` | ONE build, rooms side by side along X, open to +Z for cameras: **hall** (lockers both sides, ceiling ~14 high, tiled floor), **gym** (wood floor, hoops, bleachers, floor crack decal), **cafe** (long tables, benches, lunch trays, big windows on the back wall), **office** (small: principal desk, nameplate "MR HALE"). Ceilings must exist (people press against them) but cameras sit in the open +Z side | 0–20 |
| `OUTSIDE` | `V(300,0,0)` | school exterior (textured, `makeHouse`/tbox brick, school sign) with a **separate roof group that can lift off**, parking lot, yellow school bus, grass, day sky | 0 hook wide, 12 bus, 21–23 ending |
| inserts | inside SCHOOL | floor crack close-up (gym), lunch tray + window (cafe) | 9, 15 |
Look: `day` everywhere; indoor rooms use the PIPELINE §3 indoor light cut (sky fill ~0.5x, sun ~0.35x, room lamps).

## World API the shots need (names to export exactly)
- `SCHOOL`, `school.marks` / `SCHOOL_CAMS`, `look_school()`; `OUTSIDE`, `outside.marks`, `OUTSIDE_CAMS`, `look_outside()`; `CEIL` = { hall, gym, cafe, office } ceiling heights (world Y).
- `floatPose(c, k, t, seed)`: floating (k 0..1): body tilted, arms out drifting, legs dangling, slow bob + slow spin (≤ 8–12 rad/s, PIPELINE §3: no fast oscillation). Caller sets height.
- `ceilingPose(c, k)`: upside down / back pressed to the ceiling (caller places at ceiling Y).
- `heavyPose(c, k)`: crushed by weight, knees bent, shoulders down, head low.
- `armsCrossed(c, k)`: Rose's tsundere pose.
- `crack.set(k)` gym floor crack 0..1 (grows); `crack.hide()`.
- `trays` = { set(t01) } trays lift off the cafe tables and fly out the windows along a path; hidden-safe; `trays.reset()`.
- `bus` = { root, setFloat(k, t) } bus on the lot rising / tilting into the sky.
- `roof` = { setLift(k, t) } outside roof group lifts and tumbles away (k 0..1).
- `floatFx` = { set(on, center, radius) } a few slow soft motes/sparkles for "happy gravity"; `floatFx.hide()`.
- Every prop/fx is hidden by default (the `before(t)` in shots.js calls hide on all of them).

## Files and owners
| File | Owner |
|---|---|
| `PLAN.md`, `gravity_script.md`, `lines.json`, `voice_config.json`, voice outputs, `shots.js`, `music.json`, `TOKEN_LOG.md` | coordinator |
| `world_index.js` (first), `world_sets.js`, `world_cast.js`, any new kit file (e.g. a bus maker in `kit/buildings.js`) | world agent |
| `shots_1.js` | shots agent 1: **0.00 → 25.15** (lines 0–9) |
| `shots_2.js` | shots agent 2: **25.15 → 49.30** (lines 10–23; last shot settles to 49.3) |

## Shot ideas per line (shots agents own the details; cut every ~1–1.5 s on phrase starts)
0 wide outside: kids floating above the schoolyard, Rose smiling slightly in the middle / 1 kids squashed flat, heavy / 2 office: Hale at desk, "one rule"; close-up kid hitting the ceiling / 4 Hale points up / 5–6 hall: hero tells joke, Rose arms crossed hmph / 7 whole hall rises to the ceiling, lockers' books float / 8 hero & Rose float side by side (best ten seconds), then everyone drops / 9 gym: hero silent, Rose sad-droopy, everyone heavy, floor crack insert / 10–12 hall then outside: tiny joke, "Not funny" (hmph + blush), bus floats away / 13–15 cafe: hero sits beside Rose silent, "Go away" (hmph), she doesn't move, trays fly out the window / 16 wide cafe: whole school on the ceiling yelling at hero / 17 hero looks at Rose's face, then up at the ceiling (callback) / 18–19 hero floats to Rose, asks / 20 Rose shouts "No!", blushing hard, arms crossed / 21 outside wide: roof lifts off, everyone floats out into the sky / 22 Hale upside down in the sky, deadpan / 23 Rose and hero floating side by side, Rose turns away "Hmph" with a blush, last shot settles ~1 s.
Highlights (shots.js): floats/happy/ceiling yellow `#ffd23f`; heavy/sad/cracked blue `#7fb2ff`; Rose's words pink `#ff7ab8`.
