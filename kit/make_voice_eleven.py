"""House narration (CLAUDE.md §9 step 3): render the script with the ElevenLabs API and take the word timings straight from ElevenLabs'
own timestamps (the /with-timestamps endpoint). No listening step: captions and shots use the exact times ElevenLabs reports.

Key:    ELEVENLABS_API_KEY=sk_... in the .env file in the Roblox videos folder (never commit or share that file)
Usage:
        python -I kit/make_voice_eleven.py --dir <video folder> [--settings voice_settings.json] [--shots shots.json] [--sample 6]
Needs:  pip install requests imageio-ffmpeg
Input (in --dir): shots.json (list of shot phrases; joined, they are the script word for word) and voice_settings.json (CLAUDE.md §9b template:
        voice_id, model, stability, similarity, style, speaker_boost, speed, optional "characters" {Name: {voice_id, ...}} and
        "quotes" [speaker Name for each quoted line, in order]).
Output (in --dir): voice_final.mp3, word_timings.csv (time,word in script spelling, for captions/make_captions.py),
        voice_timings.json ({"starts": [...per shot...], "end": s}, for the Director), eleven_alignment.json (raw per-character times).
        --sample N renders only the first N sentences into voice_sample.mp3 (to audition settings cheaply). Then run
        python -I kit/tools/align_voice.py --check <file> to compare the voice with the references.

The script is sent in a few long chunks (whole sentences, up to --chunk characters) so the delivery flows with short gaps; quoted lines with a
speaker in "quotes" are sent separately with that character's voice. Each chunk's trailing silence is cut to --tail seconds using the
timestamps, so there are no long pauses between chunks.
"""
import argparse, base64, difflib, hashlib, json, os, pathlib, re, subprocess, sys, tempfile, wave

API = "https://api.elevenlabs.io/v1/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_128"
SR = 44100
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def api_key():
    """ELEVENLABS_API_KEY from the environment, else from the .env file in the project folder (one level above kit/)."""
    k = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    env = pathlib.Path(__file__).resolve().parent.parent / ".env"
    if not k and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("ELEVENLABS_API_KEY="):
                k = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not k:
        sys.exit("No API key: add ELEVENLABS_API_KEY=sk_... to the .env file in the Roblox videos folder (ElevenLabs > API keys).")
    return k


def segments(script_words, quotes, sample):
    """Split the word list into (speaker, [word indices]) runs: narrator text vs quoted lines, then narrator runs into sentences."""
    segs, cur, inq, qi = [], [], False, 0
    speaker = None
    for i, w in enumerate(script_words):
        opens = w.startswith(("\"", "“"))
        if opens and not inq:
            if cur:
                segs.append((None, cur)); cur = []
            inq = True
            speaker = quotes[qi] if qi < len(quotes) else None
            qi += 1
        cur.append(i)
        if inq and re.search(r"[\"”][^\w]*$", w) and not (opens and len(w) == 1):
            segs.append((speaker, cur)); cur = []; inq = False
    if cur:
        segs.append((speaker if inq else None, cur))
    # sentences inside each run
    out = []
    for spk, idx in segs:
        s = []
        for i in idx:
            s.append(i)
            if re.search(r"[.!?][\"”')]*$", script_words[i]):
                out.append((spk, s)); s = []
        if s:
            out.append((spk, s))
    if sample:
        out = out[:sample]
    # quotes with no speaker go to the narrator
    return [(spk, s) for spk, s in out]


def chunks(sents, words, limit):
    """Merge consecutive sentences with the same speaker up to `limit` characters."""
    out = []
    for spk, s in sents:
        text_len = len(" ".join(words[i] for i in s))
        if out and out[-1][0] == spk and out[-1][2] + text_len + 1 <= limit:
            out[-1][1].extend(s); out[-1][2] += text_len + 1
        else:
            out.append([spk, list(s), text_len])
    return [(spk, s) for spk, s, _ in out]


def render(key, voice, text, prev, nxt):
    if key is None:
        sys.exit("--offline: this chunk is not in _eleven_cache yet")
    import requests
    body = {"text": text, "model_id": voice.get("model", "eleven_multilingual_v2"),
            "voice_settings": {"stability": voice.get("stability", 0.4), "similarity_boost": voice.get("similarity", 0.75),
                               "style": voice.get("style", 0.05), "use_speaker_boost": voice.get("speaker_boost", True),
                               "speed": voice.get("speed", 1.1)}}
    if prev: body["previous_text"] = prev[-600:]
    if nxt: body["next_text"] = nxt[:600]
    if voice.get("seed") is not None: body["seed"] = voice["seed"]
    r = requests.post(API.format(vid=voice["voice_id"]), headers={"xi-api-key": key}, json=body, timeout=300)
    if r.status_code != 200:
        sys.exit(f"ElevenLabs error {r.status_code}: {r.text[:400]}")
    return r.json()


def word_spans(alignment):
    """Per-character alignment -> list of (start, end, word) for each run of non-space characters."""
    ch, st, en = alignment["characters"], alignment["character_start_times_seconds"], alignment["character_end_times_seconds"]
    out, cur, t0, t1 = [], "", None, None
    for c, s, e in zip(ch, st, en):
        if c.isspace():
            if cur: out.append((t0, t1, cur)); cur = ""
        else:
            if not cur: t0 = s
            cur += c; t1 = e
    if cur: out.append((t0, t1, cur))
    return out


def tighten(pcm, spans, max_gap, lead=0.05):
    """Shorten every silence between words to at most max_gap seconds (and the lead-in to `lead`). Returns new pcm and a time-mapping function."""
    cuts = []  # (old_start, old_end) ranges removed
    if spans and spans[0][0] > lead:
        cuts.append((0.0, spans[0][0] - lead))
    for (_, e, _), (s, _, _) in zip(spans, spans[1:]):
        if s - e > max_gap:
            cuts.append((e + max_gap / 2, s - max_gap / 2))
    out, pos = bytearray(), 0
    for a, b in cuts:
        out += pcm[pos * 2:int(a * SR) * 2]; pos = int(b * SR)
    out += pcm[pos * 2:]

    def remap(t):
        shift = 0.0
        for a, b in cuts:
            if t >= b: shift += b - a
            elif t > a: shift += t - a
        return t - shift
    return out, remap, sum(b - a for a, b in cuts)


def decode(ff, mp3_bytes):
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(mp3_bytes); name = f.name
    pcm = subprocess.run([ff, "-v", "error", "-i", name, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    os.unlink(name)
    return pcm


def match_times(script_words, heard):
    """Give every script word a time from the heard (alignment) words, matched in order; interpolate the rest."""
    sm = difflib.SequenceMatcher(None, [norm(w) for w in script_words], [norm(w) for _, w in heard], autojunk=False)
    times = [None] * len(script_words)
    for b in sm.get_matching_blocks():
        for k in range(b.size):
            times[b.a + k] = heard[b.b + k][0]
    known = [i for i, t in enumerate(times) if t is not None]
    for i in range(len(times)):
        if times[i] is None:
            lo = max((k for k in known if k < i), default=None)
            hi = min((k for k in known if k > i), default=None)
            if lo is None: times[i] = times[hi] if hi is not None else 0.0
            elif hi is None: times[i] = times[lo] + 0.25 * (i - lo)
            else: times[i] = times[lo] + (times[hi] - times[lo]) * (i - lo) / (hi - lo)
    for i in range(1, len(times)):
        times[i] = max(times[i], times[i - 1])
    return times, len(known)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=".")
    ap.add_argument("--settings", default="voice_settings.json")
    ap.add_argument("--shots", default="shots.json")
    ap.add_argument("--out", default="voice_final.mp3")
    ap.add_argument("--chunk", type=int, default=2000, help="max characters per request")
    ap.add_argument("--tail", type=float, default=0.18, help="keep this much silence after each chunk's last word (s)")
    ap.add_argument("--sample", type=int, default=0, help="only the first N sentences, to voice_sample.mp3")
    ap.add_argument("--offline", action="store_true", help="only use cached renders (no API calls)")
    ap.add_argument("--max-gap", type=float, default=None, help="cap every pause between words (s); default from settings 'max_gap' or 0.22")
    ap.add_argument("--semis", type=float, default=None, help="pitch up N semitones after rendering (duration kept); default from settings 'semis'")
    ap.add_argument("--tempo", type=float, default=None, help="extra speed-up after rendering, pitch kept (e.g. 1.15); default from settings 'tempo'")
    a = ap.parse_args()

    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    here = pathlib.Path(a.dir)
    cfg = json.loads((here / a.settings).read_text(encoding="utf-8"))
    if not cfg.get("voice_id"):
        sys.exit(f"Fill in voice_id in {a.settings} first (ElevenLabs > Voices > the voice > ID).")
    shots = json.loads((here / a.shots).read_text(encoding="utf-8"))
    words = [w for s in shots for w in s.split()]
    shot_of = [si for si, s in enumerate(shots) for _ in s.split()]
    plan = chunks(segments(words, cfg.get("quotes", []), a.sample), words, a.chunk)
    key = None if a.offline else api_key()

    pcm, heard, raw, offset = bytearray(), [], [], 0.0
    used = sorted({i for _, s in plan for i in s})
    for n, (spk, idx) in enumerate(plan):
        voice = dict(cfg); voice.pop("characters", None)
        if spk and spk in cfg.get("characters", {}):
            voice.update(cfg["characters"][spk])
        text = " ".join(words[i] for i in idx)
        prev = " ".join(words[i] for i in range(0, idx[0]))
        nxt = " ".join(words[i] for i in range(idx[-1] + 1, len(words))) if not a.sample else ""
        print(f"[{n + 1}/{len(plan)}] {spk or 'narrator'}: {text[:70]}...")
        req = json.dumps([voice, text, prev, nxt], sort_keys=True)
        cache = here / "_eleven_cache" / (hashlib.sha1(req.encode()).hexdigest()[:16] + ".json")
        if cache.exists():  # same text + settings: reuse, costs no credits (lets you retune pauses/pitch/tempo for free)
            res = json.loads(cache.read_text(encoding="utf-8"))
        else:
            res = render(key, voice, text, prev, nxt)
            cache.parent.mkdir(exist_ok=True); cache.write_text(json.dumps(res), encoding="utf-8")
        al = res.get("alignment") or res.get("normalized_alignment")
        piece = decode(ff, base64.b64decode(res["audio_base64"]))
        last_end = max(al["character_end_times_seconds"]) if al["character_end_times_seconds"] else len(piece) / 2 / SR
        keep = min(len(piece) // 2, int((last_end + a.tail) * SR))
        piece = piece[:keep * 2]
        for s, e, w in word_spans(al):
            heard.append((offset + s, offset + e, w))
        raw.append({"speaker": spk or "narrator", "offset": round(offset, 3), "text": text, "alignment": al})
        pcm += piece
        offset += keep / SR

    max_gap = a.max_gap if a.max_gap is not None else cfg.get("max_gap", 0.22)
    semis = a.semis if a.semis is not None else cfg.get("semis", 0)
    tempo = a.tempo if a.tempo is not None else cfg.get("tempo", 1.0)
    pcm, remap, removed = tighten(pcm, heard, max_gap)
    heard = [(remap(s) / tempo, w) for s, _, w in heard]
    offset = (offset - removed) / tempo
    print(f"Pauses capped at {max_gap} s ({removed:.1f} s removed); pitch +{semis} st, tempo x{tempo}")

    out_name = "voice_sample.mp3" if a.sample else a.out
    wav = here / "_voice_tmp.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(pcm))
    r = 2 ** (semis / 12)
    filters = []
    if semis or tempo != 1.0:
        filters = [f"rubberband=pitch={r:.5f}:tempo={tempo:.5f}",  # best quality, if this ffmpeg has it
                   f"asetrate={SR * r:.1f},aresample={SR},atempo={tempo / r:.5f}"]   # fallback: same timing, plainer sound
    for flt in filters or [None]:
        cmd = [ff, "-v", "error", "-y", "-i", str(wav)] + (["-af", flt] if flt else []) + ["-ar", str(SR), "-b:a", "160k", str(here / out_name)]
        if subprocess.run(cmd).returncode == 0:
            break
    else:
        sys.exit("ffmpeg failed to write the output")
    wav.unlink()
    print(f"Wrote {here / out_name} ({offset:.1f} s)")
    if a.sample:
        return

    times, matched = match_times(words, heard)
    if matched / len(words) < 0.95:
        print(f"  WARNING: only {matched}/{len(words)} script words matched ElevenLabs' alignment. Check numbers/symbols in the script "
              "(write '11:55' as the caption but the voice may read 'eleven fifty-five').")
    starts = []
    for si in range(len(shots)):
        i = shot_of.index(si) if si in shot_of else None
        starts.append(round(times[i], 3) if i is not None else (starts[-1] if starts else 0.0))
    starts[0] = 0.0
    (here / "voice_timings.json").write_text(json.dumps({"starts": starts, "end": round(offset, 3)}), encoding="utf-8")
    (here / "word_timings.csv").write_text("\n".join(f"{t:.3f},{w}" for t, w in zip(times, words)), encoding="utf-8")
    (here / "eleven_alignment.json").write_text(json.dumps(raw), encoding="utf-8")
    print(f"Matched {matched}/{len(words)} words. Wrote word_timings.csv, voice_timings.json, eleven_alignment.json")


if __name__ == "__main__":
    main()
