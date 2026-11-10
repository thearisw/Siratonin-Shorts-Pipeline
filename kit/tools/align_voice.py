"""Audio-first step 4: turn a finished narration file (ElevenLabs download, or any voice) into the timing files the rest of the kit uses,
and check the voice against the reference targets.

Usage:  python -I kit/tools/align_voice.py --dir <video folder> --audio voice_final.mp3 [--shots shots.json]
        python -I kit/tools/align_voice.py --check <file.mp3>        (voice check only: pitch, movement, loudness, words/s, gaps)
Needs:  pip install faster-whisper librosa
Output (in --dir): word_timings.csv (time,word, script spelling, for make_captions), voice_timings.json ({"starts": [...per shot...], "end": s},
        for the Director), and a voice check printed at the end.

How it works: Whisper (base.en, CPU) hears the words with timestamps; the script words from shots.json are matched to them in order
(difflib), so the CSV keeps the script's spelling even where Whisper mishears. Unmatched words get times interpolated from their neighbours.
"""
import argparse, difflib, json, pathlib, re, sys

import librosa
import numpy as np

# Targets measured on the reference reels with THIS script's tracker (pyin; see CLAUDE.md §9b). Compare like with like.
TARGET = "refs: F0 167-225 Hz (Craftee/Hadel/revanrants ~190-225), pitch SD 5.1-6.8 st, loudness 0.46-0.50, 4.1-4.8 w/s, <=10 gaps >0.4 s per 100 s"

norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def hear(y):
    from faster_whisper import WhisperModel
    m = WhisperModel("base.en", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(y, word_timestamps=True, vad_filter=False, language="en")
    return [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]


def check(y, sr, heard, label):
    f0, vf, _ = librosa.pyin(y, fmin=75, fmax=450, sr=sr, frame_length=1024, hop_length=256)
    f = f0[vf & ~np.isnan(f0)]
    med = float(np.median(f))
    sd = float(np.std(12 * np.log2(f / med)))
    rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=256)[0]
    loud = rms[rms > 0.02 * rms.max()]
    t0, t1 = heard[0][0], heard[-1][1]
    gaps = [b[0] - a[1] for a, b in zip(heard, heard[1:])]
    per100 = 100 / max(t1 - t0, 1)
    print(f"\nVOICE CHECK {label}: F0 {med:.0f} Hz | pitch SD {sd:.1f} st | loudness {loud.std() / loud.mean():.2f} | "
          f"{len(heard) / (t1 - t0):.2f} w/s | {sum(g > 0.4 for g in gaps) * per100:.0f} gaps >0.4 s per 100 s (longest {max(gaps):.2f} s)")
    print("  " + TARGET)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=".")
    ap.add_argument("--audio", default="voice_final.mp3")
    ap.add_argument("--shots", default="shots.json")
    ap.add_argument("--check", default="", help="only run the voice check on this file")
    a = ap.parse_args()

    if a.check:
        y, sr = librosa.load(a.check, sr=16000)
        check(y, sr, hear(y), pathlib.Path(a.check).name)
        return

    here = pathlib.Path(a.dir)
    y, sr = librosa.load(str(here / a.audio), sr=16000)
    heard = hear(y)
    shots = json.loads((here / a.shots).read_text(encoding="utf-8"))
    script = [(si, w) for si, s in enumerate(shots) for w in s.split()]

    sm = difflib.SequenceMatcher(None, [norm(w) for _, w in script], [norm(h[2]) for h in heard], autojunk=False)
    times = [None] * len(script)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = heard[blk.b + k][0]
    matched = sum(t is not None for t in times)
    # interpolate gaps between known neighbours
    known = [i for i, t in enumerate(times) if t is not None]
    if not known:
        sys.exit("No script words were heard in the audio: wrong file or wrong shots.json?")
    for i in range(len(times)):
        if times[i] is None:
            lo = max((k for k in known if k < i), default=None)
            hi = min((k for k in known if k > i), default=None)
            if lo is None:
                times[i] = times[hi]
            elif hi is None:
                times[i] = times[lo] + 0.25 * (i - lo)
            else:
                times[i] = times[lo] + (times[hi] - times[lo]) * (i - lo) / (hi - lo)
    for i in range(1, len(times)):  # keep monotonic
        times[i] = max(times[i], times[i - 1])

    starts = []
    for si in range(len(shots)):
        idx = next((i for i, (s, _) in enumerate(script) if s == si), None)
        starts.append(round(times[idx], 3) if idx is not None else (starts[-1] if starts else 0.0))
    starts[0] = 0.0
    end = round(max(heard[-1][1], times[-1]) + 0.3, 3)
    (here / "voice_timings.json").write_text(json.dumps({"starts": starts, "end": end}), encoding="utf-8")
    (here / "word_timings.csv").write_text("\n".join(f"{t:.3f},{w}" for t, (_, w) in zip(times, script)), encoding="utf-8")
    print(f"Matched {matched}/{len(script)} script words ({100 * matched / len(script):.0f}%). {len(shots)} shots, audio ends {end:.1f} s.")
    if matched / len(script) < 0.85:
        print("  WARNING: under 85% matched. The audio may not follow the script (ad-libs, skipped lines): listen, then fix the script or re-render.")
    print(f"Wrote {here / 'word_timings.csv'} and {here / 'voice_timings.json'}")
    check(y, sr, heard, a.audio)


if __name__ == "__main__":
    main()
