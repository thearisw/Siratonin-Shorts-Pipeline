# Roblox Story Shorts — House Rules
Vertical 9:16 story reels, animated in **three.js** (`threejs/`). Roblox Studio and Blender-era history is archived and not needed for new work.

**Making a video = `PIPELINE.md`** (the one fixed production pipeline: steps, voice, kit API, camera rules for the vertical frame, music, no cloud rendering, and the parallel coordinator + agents plan). This file holds the story rules. **Never read another video's `world.js`/`shots.js`/notes for guidance**: reuse the kit, not past video code.

## 0. Where to look, and where NOT to look (saves tokens)
Read only what the task needs. Don't list, grep or open folders "to get context".
| Task | Read | Skip |
|---|---|---|
| Write or check a script | this file §2–4b + §15, then the ONE theme file in `formats/` | everything else |
| Produce / stage / animate a video | `PIPELINE.md`, the theme file, the video's own folder, the section of `threejs/CATALOG.md` you need (stock sets, presets, faces, poses, builders), the kit function you are changing (find it with `node kit/outline.mjs <file>`, read it with `node kit/outline.mjs <file> <fn>`; `threejs/README.md` only the section needed). Glitch effects: `threejs/VFX/glitch.js` header; sound effects: `threejs/sfx/STORY_KIT_SFX.md` | **other videos' folders (never copy past productions)**, references |
| Voice | `PIPELINE.md` §2, `threejs/kit/make_voice_eleven.py` docstring|
| Study a reference reel | `references/INDEX.md` first, then only the section/folder it points to | the other reels |

**Never open unless the user asks for them by name** (history, backups, raw files, renders):
- `_backup_*/` - backup files, (only used by user when necessary)
- `references/` (the mp4s), `analysis/`, `_analysis/` — reference data. Use `references/INDEX.md` to find the one file you need.
- `reference_analysis.md` and `reference_scripts.md` — only the section a rule here or in `formats/` points to (e.g. "§10"). Never read them whole.
- `threejs/videos/*/out*.mp4`, `*/test/`, `sfx/`, `_eleven/` caches — render output and caches.
- `threejs/models/_work/`, `threejs/models/props/_work/` — raw Studio OBJ exports and converter scripts (only when converting a new model).
- `threejs/node_modules/` (old Studio-era reel files), `script_ideas.md` (only when the user asks for ideas).
`.claude/settings.json` blocks Read on the backup, node_modules and raw-export folders; most of the rest is git-ignored, so Grep/Glob skip it.

## Writing a script: two layers
1. **General format = this file:** §2 pacing, §3 ingredients, §4 writing style, §4b story logic (run the §4b.14 self-check), §15 titles.
2. **Theme format = `formats/<theme>_format.md`.** Pick the theme from the premise and read that one file: templates (beat tables), length, speed, ending, devices.
   **Where it differs from the general rules, the theme file wins** (e.g. crush is a 35–50 s short with its own beat shape).

| Theme | Premise looks like | File | Templates |
|---|---|---|---|
| Horror | A deadly rule, a monster, a copy, a curse | `formats/horror_format.md` | A Horror Rule + Twist, D Misread Monster |
| Superpowers | Everyone gets a power; the narrator's weak one wins | `formats/superpowers_format.md` | B Underdog |
| Fantasy | Wholesome magic, mystery or rescue, no villain | `formats/fantasy_format.md` | C Wholesome Mystery, E Rescue + Sting |
| Crush | Short romance-comedy, a magic rule makes the crush public | `formats/crush_format.md` | F Crush Rule (+F2), G Absurd Line, H Snowball Lie |

Mixed premise: pick the theme that decides the ending (bleak = horror, warm win = superpowers, reunion = fantasy, she likes him too = crush) and borrow devices from the other.
**A new theme** gets its own `formats/<theme>_format.md` ("Use for", quick numbers, template table, reference videos), a row here, and a folder in `references/` + a section in `references/INDEX.md`.

## Core principle
**Story first, visuals second.** The narration carries the video; visuals show *who*, *where* and *how they feel*.
Crude animation is fine (static poses, simple walks, sitting, falling). Emotion comes from **face swaps + camera framing + fast cuts**.

## 2. Pacing
- **Write for the house voice: ~3.9 words per second** (~235 words for 60 s, ~350 for 90 s, ~470 for 120 s; measured on ElevenLabs Adam at 1.5x). The references' own rates are in the theme files; word counts always use 3.9.
- **No silence.** The narration never pauses for a visual. Unless requested by user.
- **A new story beat every 5–10 s.** **A shot cut every 1s–1.5 s (median)**, almost none over 4 s, cut on phrase starts.
- Horror/action stays fast to the end. Heartfelt stories slow to ~1.6 s shots in the last 20%.
- **The rule is explained fast, but the world is lived in before anything happens** Rule + the narrator's problem by ~10 s (crush: by ~4 s, in the hook). Then a **lived-in act**: the status quo shown as routines ("Every morning…", "At lunch…") and mirrored pairs with the other key character ("She could fly. I had a jetpack."), before any inciting event.
- **Act lengths (numbers in `formats/superpowers_format.md` "Act lengths" and `formats/crush_format.md` §8b):**
  | Act | Long video (100–135 s) | Crush short (35–50 s) |
  |---|---|---|
  | Hook: premise + the narrator's problem | ≤ 10 s | ≤ 4 s |
  | Lived-in act (routines, the relationship, the plant, clues) | to **≥ 40%** of runtime before "Until…" | to **50–65%** before the turn, or Template F's shape |
  | Inciting event → turn ("Except me" / the reveal) | 40% → 64–70% | the turn itself unfolds over 4–6 short beats |
  | Climax | 70–90% | to ~90% |
  | **Ending after the climax resolves** | **≤ 10 s, at most 2 kicker lines**  **≤ 5 s, one image** |
  The antagonist or bond character gets **2–3 scenes before the inciting event** and ideally causes it. Pick the single best callback for the ending and cut the rest; no "waiting" beats after the climax (minutes passing, dogs, shovels).
- **The twist/climax takes the final 25–30%** and moves fastest, broken up by counts, numbers or one-word lines.
- **Countdowns make it urgent, anticipation:** population numbers (100 → 81 → 61 → 43 → 19), clock times (11:00, 11:10 … 11:58), clock strikes counted between lines.

## 3. Themes & story ingredients
- **One-rule worlds:** a power or curse everyone in a town or world has. Kid-friendly but ominous.
- **Night = danger, morning = consequences.** Times of day mark the structure.
- **A pact or promise** set up early always pays off (kept or broken).
- **Family/friend stakes:** examples: a missing dad, Mom, a best friend.
- **The weakest turns out strongest** (underdog), or **the safest turns out most dangerous** (horror).
- **Dark comedy in the chaos:** cupcakes, a wedding interrupted, "eating chips like it was a movie", "Bulls don't run from rain."
- **Endings:** horror ends bleak and quiet; underdog ends warm with a joke. Neither explains too much.

## 4. Writing style
- First person, simple words, short sentences. A child or teen, around 10-18 year-old (depending on scenario) narrates every line, unless stated by user.
- **World rules in present tense, the story in past tense.**
- **Never break the fourth wall unless requested by user**: no addressing the viewer, no questions to the audience, no meta lines, unless the user asks. Put any rule or clue in the story's world ("Mom's rule: never say it out loud."). Check every script for this.
- **Reusable patterns, not required but a good outline:** "In [my/this] [town/world], [everyone] ___." / "Every night at [time], ___." / (The next part is for mostly underdog format) "If ___, ___." / sets of three ("[A] kids ___. [B] kids ___. [C] kids ___.") /
  deadpan reveal ("The stone gave me snail.") / fragment add-ons ("Slow. Sticky. Useless.") / "But [it] can do one thing." (plants the payoff) / "Then there's [Name]." /
  "Until ___." / "Everyone ___. Except [me]." / "That's when I saw ___." / "The strangest part? ___." / times or numbers as their own sentences ("11:10. Getting closer.") /
  sound words ("Crack.", "Knock. Knock. Knock.") / callback kicker (a setup line repeated with a new meaning) / "You see, at midnight, ___." / "At first I thought ___, but then I realized ___."
- **Dialogue:** rare, very short, inside the narration. Unless requested by user, or fits well with scene.
- **Names:** short and plain, examples: Rex, Leon, Jonah, Leo, Rose, Ash, Mr Hale, Mrs Ruiz, Mr Ortiz. Allow other names.

### 4b. Story logic rules. Check every script before staging.

1. **The twist (mostly applies to horror) must reinterpret the evidence, not contradict it.** Every earlier example must still be true after the twist and read differently in hindsight.
2. **Plant 1-3 clues before the twist,** spread across the escalation (something it does every time, something an adult says, something the narrator notices, something subtle in the background).
3. **The protagonist needs evidence before they understand:** personal observation, hearing it from someone (grandparent, sign, old newspaper, rumour), ideally both. Never "I realized…" from nowhere.
4. **15–25 s of rising dread before the twist:** the clue clicks → they try to act on it → it fails or it's too late → the twist plays out step by step. The viewer guesses ~2 s before it's said.
5. **Rules stay consistent.** Write a rules box at the top of the script (trigger, effect, exceptions). Any exception the twist needs is in the box from the start and hinted on screen.
6. **Cause and effect in every beat** ("Then", "So", "But", never "and then"). A beat that could be removed without changing anything gets cut or tied in.
7. **Pact/bond payoffs use exactly the mechanic that was set up.**
8. **Flag each clue with an anomaly line:** "But he didn't hurt him." / "That had never happened before." / "Strangely, ___." / one-word fragments ("Desperate.").
9. **Clue techniques:** a trait echo; a time or number pattern ("3:00… 3:05"); an adult's throwaway saying repeated word for word as the explanation; an action that contradicts the rule; a false "always" in the hook that the ending flips.
10. **Discovery chain (not required but a good outline):** anomaly → an adult or legend gives half the answer → hero acts on a hunch → proof → *then* "That's when I finally understood," + a 2–3 line re-read of the hook. At least two pieces before the understanding line.
11. **Let the hero use the clue before naming it**
12. **Viewer-ahead mysteries are fine** when the payoff is emotional or funny: stack clues and end on a joke that uses one.
13. **Compact rule, roomy setup:** see §2 (hook ≤ 10 s, lived-in act to ≥ 40% / 50–65%).
14. **Self-check at the end of every script:** (a) rules box; (b) planted clues with timestamps; (c) how the narrator learns the truth; (d) one line per example beat on how it still fits after the twist; (e) build-up length before the twist (≥15 s); (f) an act table with real seconds and % (hook end, inciting event, turn, climax end, end) checked against §2 "Act lengths", plus the number of kicker lines (≤2).

## 5–9. Visuals, sets, cast, captions, camera, production pipeline, kit map
All in **`PIPELINE.md`**. Captions: one word at a time, key words marked `*word*` in the script, numbers as numerals.

## 15. Titles and packaging (Hadel Films; details in `reference_analysis.md` §15–18, read only if needed)
- Title = 3–8 words, first person, one plain verb + one impossible object/rule, **outcome withheld**, one emoji at the end (💀 / 😳 / object). Short sentence case beats long ALL-CAPS.
- Irony/contradiction is the strongest hook ("I Tried to Lose…", "slowest race").
- Rule-horror: "In This World, [rule]!" or "My [family member]'s [object] [did impossible thing]!".
- Shot 1 doubles as the cover: extreme face close-up with a meme-level expression, or a wide of the impossible event, caption word already on screen.
- Rotate the hook/title shape every ~10 videos. Part 2s get ~20% of the original. "Object that shows the future" is a proven premise engine.
