# Pineapple SFX

Everything in this folder was **synthesized from scratch** for this video (numpy, see `gen_sfx.py`), so there is no third-party source and no attribution needed. License: **CC0 / public domain**, safe for monetized YouTube.

Why synthesized: the free SFX sites (freesound, pixabay, sonniss, Wikimedia, OpenGameArt, BigSoundBank) are all blocked from the machine I work on, so I couldn't download from them. Abstract sounds (drones, risers, booms, stingers, clock, bells, knocks, locks, streetlight buzz-outs) synthesize well. Animal and voice-like foley does not, so those are listed under **Still needed** with search terms.

## Files
- `*.wav` 48 kHz stereo. `_loop` files loop seamlessly.
- `sfx_cues.json` the cue list (times, gains, beats). Edit this to retime or rebalance.
- `mix_sfx.py` mixes every cue into `sfx_only.wav` and `voice_plus_sfx_preview.mp3` (voice + SFX) so you can listen. It does not change the render. Run: `python mix_sfx.py` (needs numpy + ffmpeg).
- `retime_cues.py` re-times the cues after a re-voice (writes `sfx_cues.json` from `sfx_cues_v1.json`).
- `gen_sfx.py` regenerates all the WAVs (`python gen_sfx.py .`).

Times are on the current (re-voiced, 141.4 s) timeline. The cues were first timed to the v1 voice (`sfx_cues_v1.json`, synced to the shot code's knock rattles, light flicker-outs and door moves) and then mapped line by line onto the new voice by `retime_cues.py`, the same mapping `shots.js` uses for the picture, so they stay on the same frames. After any future re-voice: `python retime_cues.py` then `python mix_sfx.py`.

## Point cues
| Time | File | Gain | Beat |
|---|---|---|---|
| 0:01.57 | `hit_sub_boom.wav` | -10 dB | 'don't answer' shocked push-in |
| 0:02.85 | `clock_bell_toll.wav` | -12 dB | Clock to 9:00 |
| 0:04.29 | `caller_footsteps_creep.wav` | -14 dB | Caller walks out of the woods / down the street |
| 0:04.60 | `caller_breath_groan.wav` | -20 dB | Caller presence |
| 0:07.35 | `fx_whoosh.wav` | -18 dB | Cut to hero at the door |
| 0:11.15 | `placeholder_dog_bark_far.wav` | -20 dB | Dog barks far off (replace with real bark) |
| 0:11.91 | `hit_sub_boom.wav` | -16 dB | Caller copies |
| 0:13.45 | `door_open_creak.wav` | -12 dB | Door opens |
| 0:14.35 | `hit_horror_stinger.wav` | -12 dB | Gone by morning |
| 0:17.93 | `hit_sub_boom.wav` | -14 dB | Already gone |
| 0:27.15 | `lock_deadbolt.wav` | -12 dB | Checks the locks |
| 0:28.95 | `lock_deadbolt.wav` | -12 dB | Twice. |
| 0:35.20 | `fx_whoosh.wav` | -18 dB | Twelve streetlights reveal |
| 0:37.20 | `caller_breath_groan.wav` | -18 dB | When the Caller takes someone |
| 0:39.20 | `light_flicker_out.wav` | -10 dB | Light goes dark |
| 0:45.30 | `caller_breath_groan.wav` | -18 dB | Something in the woods hears |
| 0:45.90 | `caller_footsteps_creep.wav` | -16 dB | Monday, Caller creeps up |
| 0:46.90 | `door_knock_x3_fast.wav` | -10 dB | Knock knock knock on the Millers' door |
| 0:49.84 | `door_open_creak.wav` | -12 dB | Mr Miller opens the door |
| 0:51.99 | `light_flicker_out.wav` | -9 dB | Millers' light flickers out |
| 1:00.29 | `placeholder_dog_bark_far.wav` | -12 dB | Kims' dog barks at the Caller (replace with real bark) |
| 1:02.04 | `hit_horror_stinger.wav` | -16 dB | Empty dog bed |
| 1:02.39 | `light_clunk_out.wav` | -12 dB | Nine lights |
| 1:03.23 | `light_clunk_out.wav` | -12 dB | Then five |
| 1:04.01 | `light_clunk_out.wav` | -12 dB | Then two |
| 1:05.29 | `hit_sub_boom.wav` | -12 dB | Ours was one of them |
| 1:06.14 | `caller_footsteps_creep.wav` | -14 dB | Out of the woods again, walks past houses, stops |
| 1:08.40 | `fx_reverse_swell.wav` | -14 dB | Swell into 'under my window' |
| 1:10.00 | `hit_horror_stinger.wav` | -14 dB | Under my window |
| 1:10.14 | `caller_breath_groan.wav` | -18 dB | Just standing there |
| 1:21.21 | `door_open_creak.wav` | -14 dB | Biscuit slips out the door |
| 1:24.08 | `fx_silence_suck.wav` | -14 dB | The woods went quiet |
| 1:24.47 | `clock_bell_toll.wav` | -10 dB | Clock 9:00 |
| 1:25.27 | `fx_tinnitus_ring.wav` | -30 dB | Dead silence ring |
| 1:27.33 | `clock_915_hit.wav` | -8 dB | 9:15 (minute hand clunk) |
| 1:28.22 | `door_knock_x3.wav` | -6 dB | Knock. Knock. Knock. |
| 1:29.35 | `door_rattle.wav` | -18 dB | Door rattles on the 3rd knock |
| 1:29.88 | `caller_breath_groan.wav` | -18 dB | Caller on the porch |
| 1:30.76 | `hit_horror_stinger.wav` | -14 dB | Silhouette in the window |
| 1:39.60 | `house_stairs_creak.wav` | -12 dB | Mia creeps up the stairs |
| 1:40.20 | `house_stairs_creak.wav` | -15 dB | Mia creeps up the stairs |
| 1:43.85 | `door_knock_tiny.wav` | -8 dB | Then a tiny knock |
| 1:44.27 | `hit_sub_boom.wav` | -18 dB | Hero wakes |
| 1:50.97 | `door_open_creak.wav` | -10 dB | Opens the door |
| 1:52.22 | `door_close_thud.wav` | -10 dB | Pulls her in, door shuts |
| 1:52.52 | `lock_deadbolt.wav` | -10 dB | Locks it |
| 1:59.97 | `fx_whoosh.wav` | -18 dB | Memory: Ortiz |
| 2:01.52 | `fx_whoosh.wav` | -18 dB | Memory: breakfast |
| 2:02.97 | `fx_riser_8s.wav` | -12 dB | Riser into the grin |
| 2:03.12 | `fx_whoosh.wav` | -18 dB | Memory: the window |
| 2:03.87 | `fx_whoosh.wav` | -18 dB | Memory: every night |
| 2:10.62 | `hit_horror_stinger.wav` | -8 dB | The Mia in my arms smiled |
| 2:10.62 | `caller_grin_stretch_1.wav` | -12 dB | Grin 1 |
| 2:11.25 | `caller_grin_stretch_2.wav` | -11 dB | Wider. |
| 2:11.85 | `caller_grin_stretch_2.wav` | -10 dB | Wider. |
| 2:12.32 | `caller_breath_groan.wav` | -16 dB | 'You said it in your sleep' whisper |
| 2:13.30 | `hit_sub_boom.wav` | -6 dB | Hero scream |
| 2:14.08 | `caller_void_pitchdown.wav` | -10 dB | Every night: black void mouth |
| 2:14.78 | `light_clunk_out.wav` | -8 dB | Our streetlight went dark |
| 2:15.43 | `fx_tinnitus_ring.wav` | -28 dB | Ring after the light dies |
| 2:16.62 | `caller_footsteps_creep.wav` | -14 dB | Next night: walks down Maple Street to our house |
| 2:20.34 | `hit_horror_stinger.wav` | -8 dB | 'Pineapple.' smile hold, end |

## Ambience beds (loop between From and To)
| From | To | File | Gain | Beat |
|---|---|---|---|---|
| 0:00.00 | 0:24.74 | `amb_night_crickets_loop.wav` | -25 dB | Hook + rules, night street |
| 0:00.00 | 0:24.74 | `amb_dread_drone_loop.wav` | -24 dB | Dread under the rules |
| 0:24.74 | 0:35.44 | `amb_house_room_tone_loop.wav` | -26 dB | Inside: Mia, the locks, the promise |
| 0:35.44 | 0:53.24 | `amb_night_crickets_loop.wav` | -25 dB | Twelve streetlights, the Millers |
| 0:45.45 | 0:53.24 | `amb_dread_drone_loop.wav` | -22 dB | Something in the woods hears -> light goes dark |
| 0:53.24 | 0:54.88 | `amb_morning_birds.wav` | -22 dB | Mug on the doorstep (morning) |
| 0:54.88 | 1:02.94 | `amb_wind_night_loop.wav` | -22 dB | Ortiz on porch (fog), Kims |
| 0:54.88 | 1:12.04 | `amb_dread_drone_loop.wav` | -24 dB | Countdown + under my window |
| 1:02.94 | 1:12.04 | `amb_night_crickets_loop.wav` | -25 dB | Lights going out, Caller at the window |
| 1:12.04 | 1:15.64 | `amb_morning_birds.wav` | -22 dB | Until sunrise |
| 1:13.12 | 1:25.22 | `amb_house_room_tone_loop.wav` | -26 dB | Breakfast, Friday evening at home |
| 1:15.64 | 1:19.11 | `amb_morning_birds.wav` | -28 dB | Breakfast (birds outside) |
| 1:19.11 | 1:25.22 | `clock_ticking_loop.wav` | -18 dB | Clock 8:55 -> 9:00 |
| 1:27.27 | 1:42.25 | `amb_house_room_tone_loop.wav` | -26 dB | Back in after the silence: 9:15 onwards |
| 1:27.27 | 1:42.25 | `amb_dread_drone_loop.wav` | -20 dB | The Caller at the door |
| 1:31.96 | 1:35.47 | `fx_heartbeat_72bpm.wav` | -14 dB | Hiding under the stairs |
| 1:34.55 | 1:35.53 | `clock_ticking_loop.wav` | -16 dB | Clock: an hour passes |
| 1:44.25 | 1:55.77 | `amb_house_room_tone_loop.wav` | -26 dB | Hero wakes, Not-Mia at the door |
| 1:50.97 | 1:52.37 | `amb_wind_night_loop.wav` | -16 dB | Door open: cold air in |
| 1:55.79 | 2:14.82 | `amb_dread_drone_loop.wav` | -18 dB | Build-up to the twist |
| 2:04.67 | 2:10.62 | `fx_heartbeat_110bpm.wav` | -12 dB | Tried to let go / she held on / real Mia's voice |
| 2:16.19 | 2:21.44 | `amb_night_crickets_loop.wav` | -25 dB | Kicker: the next night |
| 2:16.19 | 2:21.44 | `amb_dread_drone_loop.wav` | -20 dB | Kicker |

## Still needed (find real recordings)
Good free, license-clear sources: **Pixabay Sound Effects** (Pixabay License, no attribution), **freesound.org** (filter License = Creative Commons 0), **Sonniss GDC bundles** (royalty-free, no attribution), **BigSoundBank** (free, no attribution). Avoid CC-BY-NC files (non-commercial) for a monetized channel.

| Time | Beat | Search terms |
|---|---|---|
| 0:11.15 | Dog barks far off | distant dog bark night, dog barking far away |
| 0:41.33 | 'Cocoa!' shout, dog runs home | dog running on grass, dog collar tags jingle, happy dog bark |
| 0:50.84 | Mr Miller still holding his mug | ceramic mug set down, coffee sip, mug clink |
| 1:00.29 | Kims' dog barks at the Caller | dog barking aggressive outdoor, dog growl bark |
| 1:07.14 | Caller's weird head tilt | neck crack, bone crack, joint pop |
| 1:16.99 | Breakfast, mid-spoon | spoon in cereal bowl, kitchen breakfast foley |
| 1:21.31 | Biscuit slips out | cat meow, cat running paws |
| 1:22.28 | Mom runs after her | footsteps running wooden floor, footsteps porch steps |
| 1:31.96 | Mia grabs my sleeve | cloth grab, fabric rustle foley |
| 1:37.36 | Mom's phone upstairs / call Grandma | phone dial tone, phone ringing muffled |
| 1:45.15 | Not-Mia crying at the door (under the voice) | child sobbing quiet (only if the voice line needs support) |
| 2:13.30 | Hero scream | boy scream horror, short scream (or leave to the voice) |

The `placeholder_dog_bark_far.wav` file is a rough synth stand-in so the timing is there; swap in a real bark with the same name or edit `sfx_cues.json`.

Also worth upgrading with a real recording if the synth versions sound too clean to you: `door_open_creak` (search "old wooden door creak open"), `house_stairs_creak` ("wooden stair creak"), `caller_footsteps_creep` ("slow footsteps on grass").

## Glitch, alarm and intercom set (fourth-wall video)
Made by `gen_glitch_sfx.py` (numpy, CC0, deterministic): `python gen_glitch_sfx.py` rewrites them in this folder. Pair each visual glitch from `VFX/glitch.js` with one of these.
| File | Length | Use |
|---|---|---|
| `glitch_hit_short.wav` | 0.25 s | one picture glitch (`kind: 'hit'`), "your... dog" |
| `glitch_hit_long.wav` | 0.80 s | longer tear with a stutter + pitch drop: the sky wall, the vial |
| `glitch_stutter.wav` | 0.60 s | frame freeze / `stutter` events, "pine-" type-on |
| `glitch_static_burst.wav` | 0.50 s | `kind: 'static'` |
| `glitch_static_loop.wav` | 3.00 s loop | dead screens, static bed |
| `glitch_dropout.wav` | 0.45 s | signal cut to silence: `kind: 'cut'` / `'black'`, the cut-off hook |
| `glitch_powerdown.wav` | 1.20 s | tape-stop: the dose kicking in, the last line |
| `glitch_bleeps.wav` | 0.70 s | data chirps: screens, `hudText` typing on |
| `glitch_reverse_suck.wav` | 0.60 s | reversed swell that stops dead, right before a reveal |
| `alarm_siren_loop.wav` | 3.60 s loop | two-tone containment alarm, 0.9 s period (same as `alarmWash` and the studio beacons) |
| `alarm_klaxon.wav` | 1.50 s | one klaxon blast for "CODE 2" |
| `intercom_chime.wav` | 1.20 s | three-note PA chime before the intercom voice |
| `intercom_click.wav` | 0.15 s | PA key-up click + hiss |
| `screens_hum_loop.wav` | 4.00 s loop | hum/whine of the wall of screens (keep it low, about -26 dB) |

Still needed for this video (can't be synthesized well; Pixabay / freesound CC0): muffled far banging + a boy screaming (cold open), cat meow (Butter), tackle thud on concrete, guards running on concrete, footsteps on leaves, vial drip.
