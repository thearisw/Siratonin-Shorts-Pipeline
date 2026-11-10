# Breaking the Fourth Wall: what we need + feedback
Review of `scripts/breaking the fourth wall.md` (baseline storyboard). Checked against CLAUDE.md, PIPELINE.md, horror_format.md, the kit and the Pineapple asset list only.

## A. What we already have
- **Cast:** narrator_boy (P), little_sister (Mina), grandpa (Mr Ortiz), dad_white / dad_* variants (Mr Tiller), mom_brown, the Caller (`MONSTERS.caller` in kit/chars.js, or tall_shadow), police, suit_man, teacher, and ~30 other kid/adult presets for the "hundreds of kids" on the screens.
- **Sets:** `buildPropStreet` (textured street), house GLBs, `makeHouse`, `buildHouseInterior` (bedroom, living room, windows), tree prop, streetlights, `buildClock`.
- **Looks:** day, sunset, night, bloodmoon, fog, storm. Faces: shocked, scared/worried, scream, sleeping, crying, grin1-3/void.
- **Voice/captions/music:** house voice pipeline with per-speaker semitone offsets, one-word captions with highlights, `after(ctx,t)` 2D overlay hook, intro drop-in, default TEMPOREX music.
- **Pineapple SFX (synth, CC0):** door knocks/creak/rattle, locks, caller breath/footsteps/grin stretch, drones, risers, stingers, sub boom, whoosh, tinnitus, heartbeat, silence suck.

## B. What we lack (by priority)
### Must build (kit)
1. **Glitch effect, `kit/glitch.js`** (the signature of this style). 2D post pass in `after(ctx,t)`: slice displacement, RGB split, scanlines, brief frame-freeze/stutter, a short black/static flash. Deterministic (seeded by time, never Math.random), works on the caption too. Used at least for: cut-off hook, "your… dog", "pine-… Strawberry", the sky wall, the vial.
2. **Caption glitch / cut-off:** captions.js can't cut a word mid-way ("pine-"), jitter or scramble a word, or show a fake on-screen sign. Needs a per-word `glitch` flag plus support for 2D text panels ("CODE 2: BREACHED CONTAINMENT. AREA 45", "SUBJECT F-13").
3. **Pets in the kit:** Pineapple's dog/cat (`makePet`) lives in the Pineapple world file, not the kit, so the rules forbid reusing it. The Tillers' cat (Butter) needs a kit pet builder (promote it to chars.js).
4. **Opening door:** `makeHouse` doors are static panels. Mr Tiller opening the door needs a hinged door in buildings.js (Pineapple's `hingeDoor` is video code).
5. **New poses:** tackle/pinned on the floor, being held by two guards, dragged by the feet (Mr Tiller), crouch/hide behind a bush, peek around a corner, struggle/kick, drowsy head-drop.
6. **New faces:** angry/yelling (director, security), drowsy/half-lidded boy (the dose), suspicious/squint (deja vu beats).
7. **Alarm lighting:** a red flashing / rotating beacon look for the studio (new `setLook('alarm')` or red point lights with a strobe at ≤12 rad/s per the vibration rule).

### Must build (sets and props)
8. **The sky wall:** a giant wall at the edge of the woods painted with the day/sunset sky (sky texture on a huge tbox), a visible seam or panel lines, and a door that opens in it.
9. **The studio / containment area (biggest new set):** hundreds of screens on the walls (instanced planes with image textures), control desks, director's chair, film cameras on tripods, boom mic, clapperboard, light rigs, intercom speaker, "AREA 45" signage. Needs `buildHouseInterior`-style room built from tbox parts; none of this exists.
10. **Screen images:** stills from the real channel videos (Crayons = sister drawing, Pip = egg hatch?, Gravity = the crush, Fog, Shoes, Mind Reader, and Pineapple house shots). These are on your PC as `out.mp4`; extract 1-3 frames each with ffmpeg on the PC into `videos/<v>/screens/`. Note: **there is no Pineapple `out.mp4` in the folder** (only pineapple_opening), so P's own screen needs a frame from wherever the final Pineapple render lives.
11. **Small props:** coffee mug, the vial with purple liquid and a readable "SIRATONIN" label (canvas texture), dropper, bushes (only a tree prop exists), woods edge / many trees, security belt/radio.
12. **Woods path:** buildPropStreet has houses and roads only; the walk from town to the wall needs a woods set (trees, path, bushes, dusk fog).

### Cast to make (recolours mostly, no new GLBs required)
13. **Security guards (2-3):** police preset recoloured black/navy, ideally a cap.
14. **Scientists in white coats (2):** teacher / dad_white tinted white (tint keeps detail on white). A lab coat over clothes would need a new model.
15. **Film director (1):** suit_man, or a recolour with cap. A headset or megaphone would sell it (new prop).
16. **The Tiller family:** Mr Tiller ("Grandpa Joey") with white hair (grandpa_grey variant), maybe a wife; the cat.
17. **F-12 and F-14:** two other kid presets, visibly not P.

### Voice and sound
18. **Speakers:** N (P), CALLER (copies "Cocoa"), DIRECTOR, SECURITY, INTERCOM, maybe ORTIZ quote. All house voice with small semitone offsets. You dislike filtered audio, so the intercom should be a plain offset and any radio filter done lightly in CapCut.
19. **Cut-off and glitch audio:** the hook cut-off and "pine-… Strawberry" need the voice cut, stuttered or reversed. make_voice_eleven `post` can't do that; either split those into separate lines and cut in CapCut, or add a small `glitch` step to post.
20. **Screen chatter:** "In this world, snowmen get closer…" works best as the real clips from those videos' `voice_final.mp3`, layered (CapCut), or re-voiced in the house voice.
21. **SFX not in the Pineapple set:** muffled far banging + shouting (voice-like, can't be synthesised: needs a library pick), alarm siren and intercom chime (synthesisable), digital glitch/static bursts (synthesisable), tackle thud, footsteps on concrete, crowd of guards rushing, cat meow (library), vial drip.
22. **Music cuts:** music.json takes one track for the whole video. Dropping the music for glitches or the alarm needs a `cuts` feature in kit/music.js, or do it in CapCut.

### Docs
23. **New theme file `formats/meta_format.md`** + a row in CLAUDE.md, and an exception to the §4 "never break the fourth wall" rule for this format (P still never talks to the viewer; the world is what breaks).

## C. Feedback
**What works.** The concept is strong and it rewards regulars: the Pineapple callbacks (pine-… Strawberry, Mr Ortiz, the Caller, "Cocoa", which was the Millers' dog in Pineapple), the screens wall of your own videos, and "Siratonin" on the vial as a branded kicker. The far banging in the cold open paying off as F-12's breach is a real plant-and-payoff, exactly the §4b kind.

**Fix these story-logic holes first.**
1. **The Tillers' door breaks the rule.** Their word is "butter", but the Caller says "It's me, Cocoa" and Mr Tiller opens anyway. Have it say "Butter. It's me, Cocoa." The word gets it in (Mr Ortiz was right: it listens), and "Cocoa" is the glitch: a name from another story leaking in.
2. **Lighting vs the rule.** The storyboard says day/sunset, but the Caller only comes after dark. Either the kidnapping is at night, or make it an anomaly: "It was still light out. It had never come before dark." That doubles as a clue that the world is breaking.
3. **Deja vu is told, not shown.** "Strange feeling" appears three times. §4b.3 wants evidence. Swap at least two for things P sees: Mr Ortiz says his line twice, word for word, with the same head turn; the same bird crosses the sky twice; the road out of town just stops at the trees; Mina says a line from Pineapple. Then the sky-wall reveal is earned.
4. **Plant the edge of the world early.** "Nobody knows what's beyond this town" comes late. One early line or shot (the sun never moves, one cloud repeats, a seam in the sky) makes the wall land as a payoff instead of a surprise.
5. **Make the cold open a clue too.** The cut-off "In this town, if someone calls your—" could be the take being interrupted by F-12's breach. Then the ending can loop: a clapperboard reads "TAKE 14", and P (or F-14) starts again: "In this town, if someone calls your name after dark…" That re-reads the hook and is a stronger, bleaker horror kicker than falling asleep.

**Pacing.** It reads at about 130-140 s, which is in range. The setup and rules are good and quick. The escalation is thin (one family, no countdown), so the middle could sag: add a second victim or a time count ("Monday… Tuesday… Wednesday, the Tillers."). The studio section is dialogue-heavy (three director lines, security, intercom): keep each line under ~8 words and trim the screens list to three fast items so the climax stays the fastest part.

**Clarity risks.** Film studio vs containment lab ("Area 45", "subjects", "breached") is two ideas. It works if one visual says both (lab coats next to film cameras and a clapperboard, an "AREA 45 / STUDIO 3" sign), otherwise viewers may be confused about who these people are. F-14 is ambiguous: another kid, or P's replacement? Decide, because it sets the ending.

**Other risks.** A scientist dripping a purple "Siratonin" drug into a kid's mouth to wipe his memory is the one beat that might read badly for a kid audience; "memory drops" or a spray reads softer and keeps the joke. The horror format says not to reuse the secret-word twist; here it's only a callback, not the twist, so it's fine. The screens joke only lands if the titles are real videos on the channel. Typos to fix in the script pass: "Tiller's" → "Tillers'", "peak" → "peek".

**Title ideas (§15):** "I Followed the Monster Out of My Town 💀", "I Found the Edge of My World 😳", "In This Town, Someone Is Filming Us!".
