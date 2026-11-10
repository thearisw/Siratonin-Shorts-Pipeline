# Story Shorts Pipeline (three.js + AI-assisted production)

A code-only pipeline for making vertical (9:16) narrated story shorts in a Roblox-like style.
A script goes in; a finished 1080x1920 video with voice, word-by-word captions, music and sound effects comes out.
Everything on screen (sets, characters, faces, camera moves, shot list) is JavaScript, rendered frame by frame in headless Chromium.
I built it with Claude Code as my main collaborator: I wrote the creative rules and made the calls, the model wrote most of the code and the per-video shot files.

## What it does
1. **Script** — written against house story rules (`CLAUDE.md`) and one genre template (`formats/*.md`): pacing in words per second, beat tables, a story-logic self-check.
2. **Voice** — `threejs/kit/make_voice_eleven.py` sends each line to ElevenLabs over websockets and saves word-level timestamps; `make_voice_edge.py` is a free fallback. Output: `voice_final.mp3`, `captions.json`, `word_timings.csv`, `lines_timed.json`.
3. **Staging** — per video, `world_sets.js` (locations), `world_cast.js` (characters) and `shots.js` (camera and action keyed to real word times) use the shared kit API.
4. **Render** — `threejs/kit/render_gpu.js` drives Playwright/Chromium with WebGL on the GPU, streams frames into ffmpeg (NVENC), and mixes in music (`kit/music.js`) and captions (`kit/captions.js`). Renders are deterministic: the same frame time always draws the same image, so several workers can split the frames.
5. **Effects** — `threejs/VFX/glitch.js` (shader glitch passes) and `threejs/sfx/gen_*.py` (every sound effect synthesized with numpy, no third-party audio).

## Architecture
```
PIPELINE.md            the fixed production steps, camera rules for a vertical frame, kit API, parallel-agent plan
CLAUDE.md              story rules the model follows when writing or checking a script
formats/               genre templates (horror, superpowers, fantasy, crush): lengths, speeds, beat tables
captions/              stand-alone caption generator (word timings -> styled captions)
kit/                   older voice tools + Whisper-based alignment check
threejs/
  kit/core.js          scene, camera, timeline helpers
  kit/director.js      loads a video's world + shots, exposes renderAt(t) to the renderer
  kit/chars.js faces.js talk.js look.js    characters, face swaps, lip flaps, lighting looks
  kit/sets.js buildings.js interiors.js textures.js    procedural sets
  kit/render.js render_gpu.js              CPU and GPU frame renderers -> ffmpeg
  kit/make_voice_*.py  narration + word timings
  kit/pose_probe.cjs   prints per-frame jerk of every character to find jitter without rendering
  VFX/ sfx/ music/     effects, synthesized SFX, music mixing notes
  videos/gravity, videos/shoes   two sample productions: script, PLAN.md, token log, shot files, timings
```
Production is split for parallel AI agents: one coordinator writes `PLAN.md` and the timings, then separate agents each own separate files (sets, cast, shots parts), so they never edit the same file.

## How to run
```
cd threejs
npm i                         # three 0.170.0 + playwright
npx playwright install chromium
# ffmpeg on PATH; python 3 with websockets for the voice step
python -I kit/make_voice_eleven.py render videos/<v> --env ../.env     # needs ELEVENLABS_API_KEY in your own .env
node kit/render.js <v> --test 1.2,5.5,9      # a few single frames
node kit/render_gpu.js <v>                    # full render on a GPU machine (Windows: render_gpu.bat <v>)
```
**Not included, so a render won't run out of the box:** the character and building models (they come from Roblox assets I can't redistribute), the voice audio, the music tracks (licensed; drop your own into `threejs/music/`) and the generated sound files (regenerate with `python threejs/sfx/gen_sfx.py threejs/sfx`). The reference videos I studied and their transcripts are also left out; the format docs keep only my measurements and short quotes.

## What the AI got wrong (and what I changed because of it)
- **Wrong diagnosis of a "vibrating" bug.** Standing characters jittered in a finished render. The model first blamed fast shiver animations aliasing at 30 fps and added a speed limit. The real cause was render-worker load order: characters were indexed in the order their models finished downloading, which differed per worker, so idle motion was seeded differently on every third frame. The fix was seeding by a stable name, and I added `pose_probe.cjs` so this kind of bug is found by measuring instead of guessing.
- **Scripts ran long.** A short meant to be about 36 s came out at 48.6 s because the model applied the reference channels' words-per-second to a voice that reads slower. The format docs now give a word budget measured on our own voice (~140 words for 36 s).
- **Story logic holes.** An early horror script's twist contradicted its own evidence, and storyboards had the narrator "realize" things with no clue planted. That's why `CLAUDE.md` §4b now forces a rules box, at least three planted clues and a timestamped self-check before staging.
- **Token waste.** Hand-building every set from primitives in each video took a large share of each video's tokens and produced near-identical code. The fix was a reusable kit (sets, buildings, interiors), a rule to never copy past videos, and a per-video `TOKEN_LOG.md` to track where tokens go.

All renders were done locally on my own GPU, never in the cloud.
