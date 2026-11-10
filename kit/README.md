# kit/ (voice tools)

Animation is in `../threejs/`. The house narration scripts now live in `../threejs/kit/` (`make_voice_eleven.py`, `make_voice_edge.py`; see CLAUDE.md §9).
This folder holds:
- `tools/align_voice.py`: voice check against the references, or word timings for audio made elsewhere (Whisper).
- `make_voice.py`, `make_voice_eleven.py`: the older shots.json-based versions. Not used by the three.js videos.
