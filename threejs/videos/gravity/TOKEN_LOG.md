# Token log — Crush Gravity

Estimates: ~4 bytes per token for reads; subagent totals from the harness.

| Step | Who | Tokens (approx) | Biggest reads / cost |
|---|---|---|---|
| Rules + theme | coordinator | ~14k | crush_format.md 27 KB (~7k: §7 transcripts + §8b are ~60% of it and not needed to write a script), PIPELINE.md 18 KB (~4.5k), CLAUDE.md (in context, ~2.6k) |
| Idea 17 | coordinator | ~1k | script_ideas.md by heading range only (lines 360–380) |
| Sync PC kit to cloud | coordinator | ~2k | staging 9 files; avoidable if the PC commits + pushes kit changes before a video (PIPELINE §1) |
| Voice | coordinator | ~2k | make_voice_eleven.py docstring + grep; ElevenLabs ~1,000 chars |
| Script + PLAN.md | coordinator | ~6k (writing) | |
| World phase 1 (index) | world agent | 89k | PIPELINE §3–5, kit/interiors.js 60–100, index_near.mjs 1–30. Cold start + designing 96 marks / 35 cams |
| Shots 1 (0–25 s, 23 shots) | shots agent (sonnet) | 92k | PIPELINE §3+§5, PLAN.md + script, index_near output |
| Shots 2 (25–49 s, 26 shots) | shots agent (sonnet) | 93k | same as shots 1 |
| World phase 2 (sets, cast, makeBus) | world agent | ~141k reported for the agent (phase 1 + 2 share one context) | kit/buildings.js 1–30 + 92–147, kit/chars.js 10–60, kit/look.js 36–58 |
| Merge + checks + PC copy | coordinator | ~15k | name check vs world_index, static s/e contiguity check (49 shots, 0 → 49.30, all 0.5–3 s) |

**Total ≈ 370k** (agents ~325k, coordinator ~45k). Agents are ~88% of the spend.

## Where the tokens go, biggest savings first
1. **Agent cold starts (~25–35k each, ×3) and agent output.** Each shots agent cost ~92k for ~240 lines of code. For a crush short (~49 shots) **one shots agent** instead of two would save ~40–50k: the second agent re-reads the same PIPELINE §3/§5, PLAN.md, script and index output.
2. **The world index was bigger than the shots used** (96 marks, 35 cams; shots 1 hard-coded only ~40 of them). Ask for ~40 marks / ~20 cams in PLAN.md. That makes phase 1 cheaper and makes the index_near output the shots agents read smaller.
3. **crush_format.md is 27 KB (~7k tokens) and gets read whole.** §7 transcripts + §8b examples are ~60% of it and only matter when choosing a template. Moving §7 to `references/crush/transcripts.md` would save ~4k on every crush video.
4. **PC kit changes not committed before the video** (core.js, presets.json, anime_girl.glb, the scripts/ move) cost a 9-file sync (~2k) and a risk of the cloud building on old kit. PIPELINE §1 already says commit + push first.
5. Small: the voice step needed the PC `.env` staged because the PC VM can't reach ElevenLabs (now in PIPELINE §2.3).

## Fix round
| Step | Who | Tokens (approx) | Notes |
|---|---|---|---|
| Find the vibration | coordinator | ~35k | kit greps (chars.js, director.js, models.js, faces.js), a pose-only probe in headless Chromium (no drawing). Cause: idle seed by GLB download order, different per render worker. `kit/pose_probe.cjs` now makes this a one-command check |
| Merge 8 short shots, Rose pitch, docs | coordinator | ~20k | shot list by regex, no agent; voice re-mix is free (cache) |
Savings now in the docs: one shots agent for shorts, ~40 marks / ~20 cams, crush transcripts moved to `formats/crush_transcripts.md` (crush_format.md 27 KB → 21 KB), `git status` on the PC as the first command.
