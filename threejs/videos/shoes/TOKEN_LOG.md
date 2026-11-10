# Shoes — token log (coordinator, running)

| Step | What | Rough cost | Needed? |
|---|---|---|---|
| Context | CLAUDE.md auto-loaded (10 KB) + PIPELINE.md (13 KB) + horror_format.md (9 KB) | ~9k tokens | yes, mandated |
| Idea | script_ideas.md section 6 only (grep for headings, then sed one range; file is 36 KB) | ~1k | yes; reading whole file would be ~9k |
| Kit sync | The PC had uncommitted kit work (buildings.js, textures.js, speaker_view.js, sets.js, director.js, README, props.json, PIPELINE, CLAUDE). Cloud repo did not have it, so I staged 9 files from the PC and copied them in | ~3k + one round trip | avoidable: commit + push kit changes on the PC before starting a thread |
| Folder access | First device call failed (folder not approved for this session), request + retry | small | avoidable if threads start with the folder connected |
| .env | Looked in threejs/ first (wrong), then found it at repo root | small | note the path in PIPELINE §2 step 3 (root `.env`) |
| Voice | `websockets` missing in the container: one failed run + pip install | small | add to setup script |
| Voice | **v4 Turbo truncated the one-request render at 182 s raw** (the last 9 lines had no audio). Diagnosis took 3 python probes (~4k tokens) | ~4k tokens + **~2.5k ElevenLabs chars wasted**: my workaround (copy the cache as 000-079) didn't count, the script re-sent 000-079 | fix the kit: default `v4_chunks` to split ~every 1800 chars; make the render warn when alignment ends before the last line |
| Cast agent | world_cast.js. Reads: PIPELINE ~8 KB, PLAN ~5 KB, chars.js/models.js ranges ~6 KB | small (good) | yes; ranged reads worked |
| Sets agent | world_sets.js (44 KB!) + kit/footwear.js (11 KB). 188k subagent tokens, 18 min | **the biggest single cost so far** | partly: 7 sets is a lot; a 44 KB world file then has to be read by every shots agent |
| Cast agent | 72k subagent tokens, 1.3 min | moderate | yes |
| Digest | I extracted a 13 KB WORLD_DIGEST.md (header, cams, marks, footwear API, cast) so the 3 shots agents don't each read the 44 KB world_sets.js | saves ~3 × 11k tokens | yes, worth making a pipeline step |
| Shots 1 agent | 36 shots, 113k subagent tokens, 6 min. Reads: digest 13 KB, PIPELINE §3–5 7 KB, PLAN 6 KB | moderate | yes |
| Shots 3 agent | 33 shots. Reads: digest 13 KB, PIPELINE §3–5 7 KB, footwear excerpt 3 KB | moderate | yes |
| Shots 2 agent | 49 shots, 126k subagent tokens, 8 min. Reads: digest 13 KB, PIPELINE §3–5 8 KB, PLAN 6 KB | moderate | yes |
| Merge check | node --check, name check, a node harness that runs every shot with stub objects (needed `npm i three` in scratch: node_modules isn't in the repo) | ~6k | yes, caught nothing fatal; one fix (wet-stain hide moved to before(t)) |

## Totals (rough)
- Subagents: sets ~189k, cast ~72k, shots 113k + 126k + 112k → **~610k tokens, about 3/4 of the whole production.**
- Coordinator (this thread): roughly 120–150k, of which ~10k was avoidable (kit sync, the voice truncation probes, the wrong .env folder).
- Not wasted: no folder browsing beyond PIPELINE/CLAUDE/horror_format, script_ideas §6, presets.json names and the kit ranges; no images opened; no renders.

## What cost the most, and how to cut it
1. **Every subagent starts cold** and re-reads PIPELINE.md, PLAN.md and the kit (~25–35k each before writing a line). Five agents = ~150k just for context. *Cut:* for a ~120 s video use 3 agents, not 5: one world agent (sets + cast together), two shots agents. Or run the shots on a cheaper model (e.g. Sonnet) since they follow a precise digest.
2. **The sets agent (189k, 18 min)** built 7 sets and a 44 KB file. *Cut:* fewer sets (merge bedrooms + nursery into one interior with three rooms; clock = a wall clock inside HOME), and reuse kit sets instead of hand-building each room. A reusable `buildHouseInterior()` in kit/sets.js would remove most of this from every future horror video.
3. **World digest:** making a 13 KB WORLD_DIGEST.md (exports, cams, marks, APIs) saved each shots agent from reading the 44 KB world file. *Make it a pipeline step* (the sets/cast agents write it themselves at the end).
4. **Kit work not committed on the PC** meant copying 9 files across first. *Commit and push kit changes on the PC* before starting a thread so the cloud clone already has them.
5. **Voice:** v4 Turbo cut the single request off at ~182 s raw audio, so the last 9 lines were silent, and the retry re-sent ~2.5k characters (credits). *Fix in kit:* split v4 requests every ~1800 characters by default and fail loudly when the alignment stops before the last line. Also add `websockets` to the environment setup script.
6. **PIPELINE.md is read in full by every agent (14 KB).** *Cut:* tell agents which § they need (shots: §3–5, sets: §3–4, cast: §4), as done here; the shots agents read only ~7 KB of it.
7. Small: put the `.env` location (repo root) and "folder must be connected" in PIPELINE §2 so the first device calls don't miss.
