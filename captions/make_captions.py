#!/usr/bin/env python3
"""
make_captions.py - narration + word-synced meme captions from your own script.

Edge TTS reports when each word is spoken, so the captions come straight from
your script with exact timing. No transcription and no AI calls.

Basic use (makes freeze.mp3, freeze.ass, freeze.srt, freeze_words.json):
    python make_captions.py freeze_script.txt

Burn the captions onto a finished export from your editor (keeps the video's own audio).
Drag BOTH files onto make_captions.bat at once, or:
    python make_captions.py freeze_script.txt --video freeze_capcut.mp4

Reuse the voice you already made and only redo the captions (no new TTS):
    python make_captions.py freeze_script.txt --reuse

Script markup:
    *word* or *two words*   -> shown in the highlight color
    numbers / times (212, 11:55) are highlighted automatically
    skipped: lines starting with # or ---, whole-line **BOLD** headers,
             **Label:** note lines (and their wrapped lines), "- " bullet lists, | tables
    [pause] or [pause 0.8]  -> a silent gap (seconds, default 0.5)

Needs: pip install edge-tts      and ffmpeg on PATH (winget install ffmpeg)
"""

import argparse
import asyncio
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import tempfile

import edge_tts

# ----------------------------------------------------------------------------
# House-style defaults. Change these once, or override with command-line flags.
# ----------------------------------------------------------------------------
DEFAULTS = dict(
    voice="en-US-BrianMultilingualNeural",
    rate="+0%",            # Edge speaking speed, e.g. "+10%"
    pitch="+0Hz",          # Edge pitch, e.g. "+20Hz" (timing is unchanged)
    semitones=0.0,         # extra ffmpeg pitch-up after TTS, timing unchanged
    words=1,               # words on screen at once (1 = one word at a time)
    font="Arial Black",
    size=110,
    color="FFFFFF",        # normal text, RGB hex
    highlight="FFE600",    # highlighted words, RGB hex
    outline_color="000000",
    outline=7,
    shadow=3,
    y=0.68,                # vertical position, fraction of frame height
    upper=False,           # ALL CAPS
    pop=True,              # small scale-up pop on each new word
    offset=0.0,            # shift captions later (seconds) if the voice starts later in the edit
)

PLAY_W, PLAY_H = 1080, 1920


# ----------------------------------------------------------------------------
# Script parsing
# ----------------------------------------------------------------------------
def load_script(path):
    """Return a list of segments: ("text", str) or ("pause", seconds)."""
    with open(path, encoding="utf-8-sig") as f:
        lines = f.read().splitlines()
    kept = []
    in_note = False
    for line in lines:
        s = line.strip()
        if not s:
            in_note = False
            continue
        if s.startswith("|"):
            continue                                     # markdown tables
        if in_note and not re.fullmatch(r"\*\*[^*]+\*\*", s) and not re.match(r"\*\*[^*]+:\*\*", s):
            continue                                     # wrapped continuation of a **Label:** note
        if s.startswith("#") or s.startswith("---"):
            continue
        if re.fullmatch(r"\*\*[^*]+\*\*", s):        # **HOOK (0-4 s)** style headers
            continue
        if re.match(r"\*\*[^*]+:\*\*", s):            # **Target:** ... notes lines
            in_note = True
            continue
        in_note = False
        if re.match(r"[-*+] ", s):
            continue                                     # bullet lists (checklists, notes)
        s = s.replace("**", "")
        kept.append(s)
    text = " ".join(kept)
    segments = []
    for part in re.split(r"(\[pause(?:\s+[\d.]+)?\])", text, flags=re.I):
        m = re.fullmatch(r"\[pause(?:\s+([\d.]+))?\]", part, flags=re.I)
        if m:
            segments.append(("pause", float(m.group(1) or 0.5)))
        elif part.strip():
            segments.append(("text", part.strip()))
    return segments


def script_tokens(text):
    """Split script text into display tokens, remembering *highlight* marks."""
    tokens = []
    in_mark = False
    for raw in text.split():
        starts = raw.startswith("*")
        if starts:
            in_mark = True
        hl = in_mark
        if raw.rstrip(".,!?;:\"')").endswith("*"):
            in_mark = False
        tokens.append({"raw": raw.replace("*", ""), "hl": hl})
    return tokens


def norm(s):
    return re.sub(r"[^0-9a-z]", "", s.lower().replace("’", "'"))


# ----------------------------------------------------------------------------
# TTS with word timings
# ----------------------------------------------------------------------------
def _ssl_fix():
    # Only needed behind a TLS-inspecting proxy; set EDGE_TTS_CAFILE to its CA bundle.
    cafile = os.environ.get("EDGE_TTS_CAFILE")
    if cafile:
        import edge_tts.communicate as ec
        ec._SSL_CTX = ssl.create_default_context(cafile=cafile)


async def tts_segment(text, args, mp3_path):
    comm = edge_tts.Communicate(text, args.voice, rate=args.rate, pitch=args.pitch,
                                boundary="WordBoundary")
    words = []
    with open(mp3_path, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"text": chunk["text"],
                              "start": chunk["offset"] / 1e7,
                              "end": (chunk["offset"] + chunk["duration"]) / 1e7})
    return words


def probe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(out.stdout.strip())


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        sys.exit("ffmpeg failed:\n" + r.stderr[-2000:])


def make_voice(segments, args, out_mp3):
    """Voice every text segment, join with pauses, return word list with global times."""
    _ssl_fix()
    tmp = tempfile.mkdtemp(prefix="captions_")
    parts, all_words, t = [], [], 0.0
    try:
        for i, (kind, val) in enumerate(segments):
            if kind == "pause":
                p = os.path.join(tmp, f"p{i}.mp3")
                run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
                     "-t", str(val), "-c:a", "libmp3lame", "-b:a", "48k", p])
                parts.append(p)
                t += val
                continue
            p = os.path.join(tmp, f"s{i}.mp3")
            words = asyncio.run(tts_segment(val, args, p))
            tokens = script_tokens(val)
            attach_tokens(words, tokens)
            for w in words:
                w["start"] += t
                w["end"] += t
            all_words += words
            parts.append(p)
            t += probe_duration(p)

        joined = os.path.join(tmp, "joined.mp3")
        if len(parts) == 1:
            shutil.copy(parts[0], joined)
        else:
            lst = os.path.join(tmp, "list.txt")
            with open(lst, "w", encoding="utf-8") as f:
                for p in parts:
                    f.write(f"file '{p}'\n")
            run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                 "-c:a", "libmp3lame", "-b:a", "128k", joined])

        if args.semitones:
            r = 2 ** (args.semitones / 12)
            sr = 24000
            af = f"asetrate={sr * r:.0f},aresample={sr},atempo={1 / r:.6f}"
            run(["ffmpeg", "-y", "-i", joined, "-af", af, "-c:a", "libmp3lame",
                 "-b:a", "128k", out_mp3])
        else:
            shutil.copy(joined, out_mp3)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return all_words


def attach_tokens(words, tokens):
    """Match each spoken word to its script token to get punctuation + highlight marks.
    Words that don't match the script keep their spoken spelling."""
    ntok = [norm(t["raw"]) for t in tokens]
    j = 0
    for i, w in enumerate(words):
        nw = norm(w["text"])
        w["display"], w["hl"] = w["text"], False
        n_parts = max(1, len(w["text"].split()))         # Edge can group "Maple Street" as one word

        def joined(k):
            return "".join(ntok[k:k + n_parts])

        hit = next((k for k in range(j, min(j + 6, len(tokens))) if joined(k) == nw), None)
        if hit is None:
            # Lost our place (notes in the script, or the voice text differs): find the next
            # spot where this word and the two after it line up with the script.
            ahead = [norm(x["text"]) for x in words[i:i + 3]]
            for k in range(j, len(tokens) - len(ahead) + 1):
                if ntok[k:k + len(ahead)] == ahead:
                    hit = k
                    break
        if hit is None:
            continue
        tok = " ".join(t["raw"] for t in tokens[hit:hit + n_parts])
        # Keep the script's spelling, drop leading quotes and soft punctuation.
        disp = tok.lstrip("\"“”'‘(")
        disp = re.sub(r"[.,;:\"”’)]+$", "", disp) if not re.search(r"\d:\d", disp) else disp.rstrip(".,;\"”)")
        w["display"] = disp or w["text"]
        w["hl"] = any(t["hl"] for t in tokens[hit:hit + n_parts])
        j = hit + n_parts


def load_csv(path):
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            if "," not in line:
                continue
            t, word = line.rstrip("\n").split(",", 1)
            try:
                rows.append({"text": word.strip().strip('"'), "start": float(t)})
            except ValueError:
                continue                                     # header row
    for i, w in enumerate(rows):
        w["end"] = rows[i + 1]["start"] if i + 1 < len(rows) else w["start"] + 0.6
    return rows


def find_script(csv_path):
    folder = os.path.dirname(os.path.abspath(csv_path))
    for name in sorted(os.listdir(folder)):
        if name.lower().endswith(("_script.md", "_script.txt")):
            return os.path.join(folder, name)
    return None


# ----------------------------------------------------------------------------
# Caption writers
# ----------------------------------------------------------------------------
def ass_color(rgb):
    rgb = rgb.lstrip("#")
    return f"&H00{rgb[4:6]}{rgb[2:4]}{rgb[0:2]}".upper()


def ass_time(t):
    t = max(t, 0)
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02}:{s:02}.{cs:02}"


def srt_time(t):
    ms = int(round(max(t, 0) * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def is_auto_highlight(text, extra):
    if re.search(r"\d", text):
        return True
    n = norm(text)
    return n in extra or (n.endswith("s") and n[:-1] in extra)   # Theo's


def timed(words, offset):
    """Each word stays on screen until the next one starts (short cap across pauses)."""
    out = []
    for i, w in enumerate(words):
        start = w["start"] + offset
        if i + 1 < len(words):
            nxt = words[i + 1]["start"] + offset
            end = nxt if nxt - (w["end"] + offset) < 0.6 else w["end"] + offset + 0.3
        else:
            end = w["end"] + offset + 0.5
        out.append((start, max(end, start + 0.05), w))
    return out


def group_words(words, n):
    groups, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= n or re.search(r"[.!?]$", w.get("display", "")):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


def write_ass(words, args, path, extra_hl):
    y = int(PLAY_H * args.y)
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {PLAY_W}
PlayResY: {PLAY_H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{args.font},{args.size},{ass_color(args.color)},{ass_color(args.highlight)},{ass_color(args.outline_color)},&H80000000,-1,0,0,0,100,100,0,0,1,{args.outline},{args.shadow},5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    hl_tag = "{\\c" + ass_color(args.highlight) + "}"
    rs_tag = "{\\c" + ass_color(args.color) + "}"
    pop = "\\fscx80\\fscy80\\t(0,80,\\fscx108\\fscy108)\\t(80,140,\\fscx100\\fscy100)" if args.pop else ""

    def fmt(w):
        txt = w["display"].upper() if args.upper else w["display"]
        txt = txt.replace("{", "(").replace("}", ")")
        if w["hl"] or is_auto_highlight(w["display"], extra_hl):
            return hl_tag + txt + rs_tag
        return txt

    lines = []
    tw = timed(words, args.offset)
    if args.words <= 1:
        for start, end, w in tw:
            lines.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Cap,,0,0,0,,"
                         f"{{\\pos({PLAY_W // 2},{y}){pop}}}{fmt(w)}")
    else:
        # Several words on screen; the word being spoken is in the highlight color.
        idx = {id(w): i for i, (_, _, w) in enumerate(tw)}
        for g in group_words(words, args.words):
            for k, w in enumerate(g):
                start, end, _ = tw[idx[id(w)]]
                parts = []
                for m, other in enumerate(g):
                    t = fmt(other)
                    if m == k and hl_tag not in t:
                        t = hl_tag + t + rs_tag
                    parts.append(t)
                p = pop if k == 0 else ""
                lines.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Cap,,0,0,0,,"
                             f"{{\\pos({PLAY_W // 2},{y}){p}}}" + " ".join(parts))
    with open(path, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(lines) + "\n")


def write_srt(words, args, path):
    tw = timed(words, args.offset)
    with open(path, "w", encoding="utf-8") as f:
        for i, (start, end, w) in enumerate(tw, 1):
            txt = w["display"].upper() if args.upper else w["display"]
            f.write(f"{i}\n{srt_time(start)} --> {srt_time(end)}\n{txt}\n\n")


def burn(video, ass, out, fontsdir):
    """Burn captions onto a video. Runs ffmpeg inside the .ass folder to avoid Windows path escaping."""
    folder = os.path.dirname(os.path.abspath(ass))
    vf = f"subtitles={os.path.basename(ass)}"
    if fontsdir:
        vf += f":fontsdir={os.path.relpath(os.path.abspath(fontsdir), folder).replace(os.sep, '/')}"
    run(["ffmpeg", "-y", "-i", os.path.abspath(video), "-vf", vf, "-c:v", "libx264",
         "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy",
         os.path.abspath(out)], cwd=folder)


# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Narration + word-synced captions from a script.")
    ap.add_argument("inputs", nargs="+", help="script .txt/.md (makes a new voice) or word_timings.csv "
                    "(existing voice); optionally also a video to burn the captions onto")
    ap.add_argument("--text", help="with a .csv: the script to take spelling and *highlights* from")
    ap.add_argument("-o", "--out", help="output name without extension (default: next to the script)")
    ap.add_argument("--video", help="burn captions onto this video (e.g. your Filmora export)")
    ap.add_argument("--reuse", action="store_true", help="reuse <out>_words.json + mp3; only rebuild captions")
    ap.add_argument("--fontsdir", help="folder with .ttf/.otf fonts to use for burn-in (e.g. Montserrat)")
    ap.add_argument("--highlight-words", default="", help="comma list always highlighted, e.g. Theo,Patel,Dong")
    ap.add_argument("--voice", default=DEFAULTS["voice"])
    ap.add_argument("--rate", default=DEFAULTS["rate"])
    ap.add_argument("--pitch", default=DEFAULTS["pitch"])
    ap.add_argument("--semitones", type=float, default=DEFAULTS["semitones"])
    ap.add_argument("--words", type=int, default=DEFAULTS["words"])
    ap.add_argument("--font", default=DEFAULTS["font"])
    ap.add_argument("--size", type=int, default=DEFAULTS["size"])
    ap.add_argument("--color", default=DEFAULTS["color"])
    ap.add_argument("--highlight", default=DEFAULTS["highlight"])
    ap.add_argument("--outline-color", default=DEFAULTS["outline_color"])
    ap.add_argument("--outline", type=float, default=DEFAULTS["outline"])
    ap.add_argument("--shadow", type=float, default=DEFAULTS["shadow"])
    ap.add_argument("--y", type=float, default=DEFAULTS["y"])
    ap.add_argument("--upper", action="store_true", default=DEFAULTS["upper"])
    ap.add_argument("--no-pop", dest="pop", action="store_false", default=DEFAULTS["pop"])
    ap.add_argument("--offset", type=float, default=DEFAULTS["offset"])
    args = ap.parse_args()
    # Drag-and-drop: the text/csv file is the script, any video file is the one to caption.
    videos = [x for x in args.inputs if x.lower().endswith((".mp4", ".mov", ".mkv", ".webm", ".avi"))]
    others = [x for x in args.inputs if x not in videos]
    if len(others) != 1:
        sys.exit("Give one script (.md/.txt) or one word_timings.csv, plus optionally a video.")
    args.script = others[0]
    if videos and not args.video:
        args.video = videos[0]

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found. Install it (winget install ffmpeg) and open a new terminal.")

    base = args.out or os.path.splitext(args.script)[0]
    mp3, ass, srt, js = base + ".mp3", base + ".ass", base + ".srt", base + "_words.json"
    extra = {norm(x) for x in args.highlight_words.split(",") if x.strip()}

    if args.script.lower().endswith(".csv"):
        # Captions for a voice you already made: CSV rows are  start_seconds,word
        words = load_csv(args.script)
        src = args.text or find_script(args.script)
        if src:
            segs = [v for k, v in load_script(src) if k == "text"]
            attach_tokens(words, script_tokens(" ".join(segs)))
            print(f"Timings from {args.script} ({len(words)} words), spelling and *marks* from {src}")
        else:
            for w in words:
                w["display"], w["hl"] = w["text"], False
            print(f"Timings from {args.script} ({len(words)} words); no *_script.md found for highlights")
    elif args.reuse and os.path.exists(js):
        with open(js, encoding="utf-8") as f:
            words = json.load(f)
        # Re-read highlight marks from the (possibly edited) script.
        segs = [v for k, v in load_script(args.script) if k == "text"]
        attach_tokens(words, script_tokens(" ".join(segs)))
        print(f"Reusing {js} ({len(words)} words)")
    else:
        segments = load_script(args.script)
        if not segments:
            sys.exit("Script is empty after skipping headers.")
        print(f"Voicing with {args.voice} ...")
        words = make_voice(segments, args, mp3)
        with open(js, "w", encoding="utf-8") as f:
            json.dump(words, f, indent=1, ensure_ascii=False)
        print(f"  {mp3}  ({probe_duration(mp3):.1f} s, {len(words)} words)")

    write_ass(words, args, ass, extra)
    write_srt(words, args, srt)
    print(f"  {ass}\n  {srt}")

    if args.video:
        out = os.path.splitext(args.video)[0] + "_captioned.mp4"
        print("Burning captions ...")
        burn(args.video, ass, out, args.fontsdir)
        print(f"  {out}")


if __name__ == "__main__":
    main()
