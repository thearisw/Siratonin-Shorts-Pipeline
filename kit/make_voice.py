"""Narration with a free Microsoft neural voice (edge-tts), rendered ONE SENTENCE AT A TIME so every sentence ends with a natural
falling tone, then joined with short, even pauses (no run-ons, no random 1.3 s gaps). Also writes word timings and shot start times.

Usage:  python kit/make_voice.py --dir <video folder> [--shots shots.json] [--voice en-US-AndrewNeural] [--rate +18%] [--pitch +6Hz]
        [--gap 0.22] [--comma 0.0] [--sample 8]   (--sample N: only the first N sentences, to audition voices)
Needs:  pip install edge-tts imageio-ffmpeg
Output (in --dir): voice.mp3, word_timings.csv (time,word), voice_timings.json ({"starts": [...per shot...], "end": s})
"""
import argparse, asyncio, json, pathlib, re, subprocess, tempfile
import edge_tts, imageio_ffmpeg

ap = argparse.ArgumentParser()
ap.add_argument("--dir", default=".")
ap.add_argument("--shots", default="shots.json", help="JSON list of shot texts, in order")
ap.add_argument("--voice", default="en-US-AndrewNeural")
ap.add_argument("--rate", default="+18%")
ap.add_argument("--pitch", default="+6Hz")
ap.add_argument("--gap", type=float, default=0.22, help="pause after a sentence (s)")
ap.add_argument("--out", default="voice.mp3")
ap.add_argument("--sample", type=int, default=0)
ap.add_argument("--meme", type=float, default=0, help="also write <out>_meme.mp3 pitched up this many semitones (same timing), e.g. 4")
ap.add_argument("--semis", type=float, default=0, help="house sound, baked in per sentence: pitch the narrator up N semitones (e.g. 6)")
ap.add_argument("--speed", type=float, default=1.0, help="house sound, baked in per sentence: speed everything up (e.g. 1.2). Timings match the final file")
ap.add_argument("--cast", default="", help="JSON {voices:{Name:{voice,rate,pitch,semis}}, quotes:[Name per quoted line, in order]}: each quoted line gets its speaker's voice")
args = ap.parse_args()
HERE = pathlib.Path(args.dir)
FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 24000

norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))
shots = json.loads((HERE / args.shots).read_text(encoding="utf-8"))

# every script word, tagged with its shot; then sentences = runs of words ending in . ! ? (or a shot's last word if it ends with one)
words = []
for si, s in enumerate(shots):
    for w in s.split():
        words.append({"shot": si, "w": w})
cast = json.loads((HERE / args.cast).read_text(encoding="utf-8")) if args.cast else {"voices": {}, "quotes": []}
NARR = {"voice": args.voice, "rate": args.rate, "pitch": args.pitch, "semis": args.semis}
sentences, cur, speakers = [], [], []
inq, qn = False, -1
def close():
    global cur
    if cur:
        sentences.append(cur); speakers.append(cast["quotes"][qn] if inq and 0 <= qn < len(cast["quotes"]) else None); cur = []
for i, w in enumerate(words):  # sentences end at . ! ? and also at quote boundaries, so each quoted line can get its speaker's voice
    t = w["w"]
    if t[0] in '"“' and not inq:
        close(); inq = True; qn += 1
    cur.append(i)
    if inq and t.rstrip(".,!?")[-1:] in '"”' or t[-1] in '"”':
        close(); inq = False
    elif re.search(r'[.!?]$', t):
        close()
close()
if args.sample: sentences = sentences[: args.sample]

def spec(idx):
    v = dict(NARR); v.update(cast["voices"].get(speakers[idx] or "", {})); return v
async def tts(text, v):
    com = edge_tts.Communicate(text, v["voice"], rate=v.get("rate", "+0%"), pitch=v.get("pitch", "+0Hz"), boundary="WordBoundary")
    audio, bounds = bytearray(), []
    async for ch in com.stream():
        if ch["type"] == "audio": audio += ch["data"]
        elif ch["type"] == "WordBoundary": bounds.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
    return bytes(audio), bounds

async def render_all():
    sem = asyncio.Semaphore(2)
    async def one(idx):
        async with sem:
            text = " ".join(words[i]["w"] for i in sentences[idx]).replace('"', "").replace("“", "").replace("”", "")
            for attempt in range(6):
                try: return await tts(text, spec(idx))
                except Exception as e:
                    if attempt == 5: raise
                    await asyncio.sleep(1.5 * (attempt + 1))
    return await asyncio.gather(*[one(i) for i in range(len(sentences))])

results = asyncio.run(render_all())
tmp = pathlib.Path(tempfile.mkdtemp())
pcm = bytearray()
t = 0.0
word_times = [None] * len(words)
spoken = []  # (time, text) for captions
for si, (audio, bounds) in enumerate(results):
    mp3 = tmp / f"s{si}.mp3"; mp3.write_bytes(audio)
    raw = subprocess.run([FF, "-v", "error", "-i", str(mp3), "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    if bounds:
        a = max(0.0, bounds[0][0] - 0.03); b = bounds[-1][1] + 0.10
    else:
        a, b = 0.0, len(raw) / 2 / SR
    seg = raw[int(a * SR) * 2: int(b * SR) * 2]
    semis, sp = float(spec(si).get("semis", 0)), args.speed
    if semis or sp != 1.0:  # pitch this sentence by its speaker's semitones, then speed up; times scale by 1/speed
        f = 2 ** (semis / 12)
        seg = subprocess.run([FF, "-v", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af",
                              f"asetrate={SR}*{f:.5f},aresample={SR},atempo={sp / f:.5f}", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                             input=bytes(seg), capture_output=True, check=True).stdout
        bounds = [(o / sp, e / sp, x) for (o, e, x) in bounds]; a = a / sp
    # align spoken tokens to script words in this sentence (a token can hold two words, e.g. "Maple Street")
    idxs = sentences[si]; k = 0
    for (o, e, txt) in bounds:
        spoken.append((t + o - a, txt))
        for part in txt.split():
            if k < len(idxs) and norm(part):
                word_times[idxs[k]] = t + o - a; k += 1
    pcm += seg
    t += len(seg) / 2 / SR
    gap = args.gap * (0.7 if len(idxs) <= 2 else 1.0) / args.speed  # one-word beats ("Dong.") snap faster
    if si < len(results) - 1:
        pcm += b"\x00\x00" * int(gap * SR); t += gap

# fill any word the aligner missed (numbers read aloud etc.) from its neighbours
last = 0.0
for i in range(len(word_times)):
    if word_times[i] is None: word_times[i] = last
    last = word_times[i]

out = HERE / args.out
subprocess.run([FF, "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-b:a", "96k", str(out)], input=bytes(pcm), check=True)
used = {i for s in sentences for i in s}
starts = []
for si in range(len(shots)):
    first = next((i for i, w in enumerate(words) if w["shot"] == si and i in used), None)
    starts.append(round(word_times[first], 3) if first is not None else round(t, 3))
starts[0] = 0.0
end = round(t + 0.4, 3)
if not args.sample:
    (HERE / "voice_timings.json").write_text(json.dumps({"starts": starts, "end": end}), encoding="utf-8")
    (HERE / "word_timings.csv").write_text("\n".join(f"{a:.3f},{w}" for a, w in spoken), encoding="utf-8")
if args.meme:
    f = 2 ** (args.meme / 12)
    subprocess.run([FF, "-v", "error", "-y", "-i", str(out), "-af", f"asetrate={SR}*{f:.4f},aresample=44100,atempo={1 / f:.4f}", "-b:a", "128k",
                    str(out.with_name(out.stem + "_meme.mp3"))], check=True)
n = len(used)
print(f"{args.voice} rate {args.rate} pitch {args.pitch}: {len(sentences)} sentences, {n} words, {t:.1f} s, {n / t:.2f} words/s -> {out}")
