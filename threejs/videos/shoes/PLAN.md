# Shoes — PLAN (coordinator)

**Theme:** horror, Template A. **Title:** My Brother's Shoes Came Home Without Him 👟
**Voice:** locked. `voice_final.mp3`, 122.1 s. Timings: `lines_timed.json` (per line s/e), `captions.json` (per word). Script: `shoes_script.md`.
**Music:** default (`music.json` = `{}`).
**Look per section:** sunset (shoes arriving) → night (midnights, deep blue + snow) → `bloodmoon` from 9:00 (68.2 s) to the end, except the kicker (`night`) → `fog` for the chapel-board morning shots.
All exteriors are SNOW: white-blue ground (~0xdfe7ef, roughness 1, tinted so bloom doesn't blow it out), snow on roofs/rails, light snowfall motes at night.

## Cast (world_cast.js) — role → slug → speaker
| Export | Slug | Speaker | Notes |
|---|---|---|---|
| `leo` | `narrator_boy` | — (narration never moves his mouth; line 86 whisper: `leo.talk` manually in shots) | hero, 12 |
| `max` | `spiky_kid` | `MAX` | little brother, 8. Scale ~0.85 of Leo |
| `mom` | `mom_brown` | — | |
| `gran` | `grandma` | `GRAN` | knits in an armchair |
| `ruiz` | `mom_pink` | — | Mrs Ruiz, neighbour |
| `hale` | `grandpa` | — | old Mr Hale, lives alone |
| `lilyMom` | `mom_green` | — | Lily's mom |
| `lily` | `little_sister_b` scaled ~0.45 | — | baby, sleeps in a crib (lie pose) |
| `ortiz` | `dad_red` | — | sells cocoa |
| `crowd` | array of 6: `friend_boy_blue, neighbor_shades, builder, cap_boy, blonde_girl, dad_blue` | — | townsfolk watching the woods |
Helper poses (exported from world_cast.js): `scared(c,k)`, `shiver(c,t)`, `sleepInBed(c)` (lie, eyes `sleeping`), `knit(c,t)` (seated, small hand motion),
`possessedWalk(c,t)` (stiff legs-only stride, upper body leaning BACK, arms reaching behind: he is being pulled), `grabFrame(c,k)` (both arms forward-up gripping),
`carry(c,k)` (both hands in front at chest, for carrying shoes), `throwArm(c,t)` (overhead throw 0..1), `hug(a,b,k)` (positions b in a's arms, both poses).

## Sets (world_sets.js) — origins 300 apart
| Set | Origin export | What | Marks (`<set>.marks`) | Cams (`<SET>_CAMS`) |
|---|---|---|---|---|
| Main street | `STREET = V(0,0,0)` | `buildPropStreet` (snow ground, 3 per side, porch lights, cars snowed), a CHAPEL at the far end (makeHouse-based, steeple, cross) with the POPULATION BOARD out front, a woods edge of `tree` props behind the houses | `ruizPorch, halePorch, lilyPorch, chapelBoard, crowdSpot, cocoaStand, streetMid, streetFar` | `wide, high, lowRoad, board, crowd, ruizPorch, halePorch, lilyPorch` |
| Our porch | `PORCH = V(300,0,0)` | our house front (`makeHouse`, 2 floors, wood siding) with 4 porch steps, porch rail, porch light, shoe mat, open-able front door (`porch.door.setOpen(k)`), snowy yard, path to the gate | `steps (bottom), topStep, mat, doorway, yard, gate` | `steps, stepsLow, door, doorInside (from the hall looking out), yard, wide` |
| Home inside | `HOME = V(-300,0,0)` | front hall + stairs going up + living room with armchair, fireplace, window to snow | `hallDoor, stairsTop, stairsBottom, armchair, fireplace, window` | `hall, stairs, stairsDown, armchair, livingWide, doorFromHall` |
| Bedrooms | `BEDS = V(-600,0,0)` | Leo's room (bed with space under it, boots by the bed, window) and Max's room (small bed, blanket, nightlight) side by side, a wall with a doorway between | `leoBed, underBed, leoFloor, maxBed, maxDoor` | `leoRoom, underBed, leoBedTop, maxRoom, maxBedClose, maxDoor` |
| Nursery | `NURSERY = V(600,0,0)` | Lily's room: crib, closet with doors (`nursery.closet.setOpen(k)`), window to snow, nightlight | `crib, closet, window, door` | `crib, cribTop, closet, room` |
| Woods | `WOODS = V(0,0,320)` | snowy forest edge, dense `tree` props + rounded pines, a clearing; bare footprint trail leading into the dark trees | `edge, clearing, trailStart, trailEnd` | `edge, trail, clearing, deep` |
| Clock | `CLOCK = V(0,0,-600)` | `buildClock` (wall clock insert) | — | `clock` |
`look_<set>()` for each (setLook + focus; indoor ones cut sky fill ~0.5x and key ~0.35x and light with lamps). Each set exports its camera table as `[pos, look, fov]` world-space, obeying PIPELINE §3 minimum distances.
Other exports: `board.setCount(n)` (chapel board shows "POPULATION n"), `clock.set(h,m)`, `snowfall.setOn(bool)` + `snowfall.update(t)`.

## Footwear + footprints (sets agent, new kit file `kit/footwear.js`, reusable)
`makeShoes(kind, o)` → Group of a PAIR, kinds `sneakers` (red/white kid sneakers, Max's), `slippers` (pink fuzzy, Ruiz), `boots` (brown work boots, Hale), `baby` (tiny white), `bigboots` (Leo's black snow boots).
API on the returned object: `.walk(t, speed)` (pair alternately lifts and steps forward ~0.9 stud per step, stiff, small pause between steps, no person: creepy), `.stepUp(t)` (climbing steps),
`.place(x,y,z,rotY)`, `.hide()`, `.show()`, `.root`. Also `makeFootprints(points, {bare:true, scale})` → mesh trail of bare footprints pressed into snow, `.reveal(k)` (0..1 along the trail), `.hide()`.
In world_sets.js export instances: `sneakers, slippers, boots, babyShoes, leoBoots` and trails `printsRuiz, printsHale, printsLily (BIG adult prints from the nursery window to the woods), printsLeo (from our porch into the woods)`.
Shots agents only call these APIs; every shot must place/show what it uses (frames render out of order) — world_sets.js must export a `resetProps()` that hides all shoes/prints (coordinator calls it in `before(t)`).

## Kit file owners
- `kit/footwear.js` (new) + one line in `README.md` → **sets agent**.
- `models/presets.json`, `kit/chars.js`, faces → **cast agent** (only if needed).
- Nobody edits `kit/sets.js`, `kit/buildings.js`, `kit/textures.js`, `kit/director.js`.

## Shots split (by beat, each `e` = next `s`)
| File | Range (s) | Lines | Beats |
|---|---|---|---|
| `shots_1.js` | 0 → 43.069 | 0–28 | hook, rules, Leo/Max/pact, Grandma, Ruiz |
| `shots_2.js` | 43.069 → 90.523 | 29–61 | 121, Hale, 97, Lily, Ortiz, 80, 9:00 sneakers, throw, 10/11/11:30, wet socks |
| `shots_3.js` | 90.523 → 122.104 (+ 1.5 s tail hold = 123.6) | 62–89 | 11:58–12:00, relief hug, twist walk, re-read list, doorframe, Max, kicker |
