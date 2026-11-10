# Music

Background music tracks for the renderer.

- **Default:** the renderer mixes `TEMPOREX - Numbers Instrumental _ Perfect intro loop.mp3` from this folder in as background music.
- **Crush videos:** `Caretaker - A4 - Childishly fresh eyes.mp3` at volume 0.3 (same loudness under the voice as TEMPOREX at 0.6;
  this track is ~6 dB louder). A video is crush when its `videos/<video>/music.json` says `{ "format": "crush" }` (or `--format crush`).
  Other formats can get their own default in `FORMAT_MUSIC` in `kit/music.js`.
- **Override:** a video can name a different track in this folder in `videos/<video>/music.json`, e.g. `{ "track": "Other song.mp3" }`
  (or `{ "track": "none" }` for no music, optional `"volume": 0.15`). `--music "Other song.mp3"` / `--music none` on the command line also works.
- A `"track"` or `"volume"` in music.json (or on the command line) still wins over the format default.
- The mix is done by `kit/music.js`: looped, volume 0.6 under the voice (0.3 for the crush track), ducked while someone talks, 1.5 s fade-out.

Drop new tracks here (mp3) and refer to them by file name.
