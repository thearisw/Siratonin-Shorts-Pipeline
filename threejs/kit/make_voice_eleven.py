"""House narration with ElevenLabs for the three.js reels. Same inputs/outputs as make_voice_edge.py, so shots.js keeps working.

    python -I kit/make_voice_eleven.py render <video_dir> --model eleven_multilingual_v2|eleven_v4_turbo [--lines 0-9]
    python -I kit/make_voice_eleven.py post   <video_dir> --model ... [--lines 0-9] --semis 6 --tempo 1.22 [--name voice_final]

render: the ONLY step that spends credits. Sends lines.json (all lines, every speaker, one voice) in a few section-sized chunks and caches
        the raw audio + per-character timings in <video_dir>/_eleven/<model>/. A chunk already in the cache is never sent again.
post:   free, local. Cuts each line out of the cached chunks by its timestamps, pitches each speaker (narrator `semis`, characters
        `semis` + their offset below), joins lines with even 0.22 s gaps, speeds up by `tempo` (pitch kept), loudness-normalises, and writes
        <name>.mp3, captions.json, lines_timed.json, word_timings.csv (only when --name is voice_final).
Pitch shift is resampling (asetrate + atempo), not rubberband (Aris heard rubberband as "filtered").
Key: ELEVENLABS_API_KEY in the environment or in the .env file given by --env (never print it).
"""
import argparse, asyncio, base64, csv, difflib, json, os, pathlib, re, ssl, subprocess, sys, wave
import numpy as np

VOICE_ID = 'IRHApOXLvnW57QJPQH2P'   # Adam - American, Dark and Tough (Aris, 2026-11-09)
SR = 44100
GAP = 0.22
CA = '/root/.ccr/ca-bundle.crt'
# speaker -> semitones relative to the narrator (all lines are Adam; characters differ only by pitch, like the Edge house setup)
OFFSET = {'N': 0, 'MIA': 3.5, 'MIA_W': 3.0, 'MOM': 2.5, 'ORTIZ': -2.5, 'JOE': -3.0,
          'C_MOM': 2.0, 'C_MIA': 3.0, 'C_MIA_W': 2.5, 'C_ME': -0.5}
GAIN = {'MIA_W': -4, 'C_MIA_W': -3}
# what the voice reads vs what the captions show
SPOKEN = {'8:55,': 'eight fifty-five,', '9:00.': "Nine o'clock.", '9:15.': 'Nine fifteen.', 'Mr': 'Mister'}
# chunk boundaries (first line of each chunk): hook+rules, promise, Millers, countdown+breakfast, Friday, relief+twist+kicker
CHUNKS = [0, 15, 24, 41, 53, 70]   # v2 only; v4 Turbo gets the whole script in one request (set in main)
# v4 audio tags, light touch (Aris, 2026-11-09: a story being told, not a scene acted out). Spoken only: never in captions or timings.
TAGS = {14: '[whispers]', 69: '[whispers]', 75: '[crying]', 101: '[whispers]', 103: '[whispers]', 106: '[quietly]'}
V4_SETTINGS = {'stability': 0.7, 'similarity_boost': 0.75}


def spoken(text):
    return ' '.join(SPOKEN.get(w, w) for w in text.split())


def prefix(i, model):
    return TAGS[i] + ' ' if model.startswith('eleven_v4') and i in TAGS else ''


def api_key(env):
    k = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if not k and env and os.path.exists(env):
        for line in open(env, encoding='utf-8'):
            if line.strip().startswith('ELEVENLABS_API_KEY='):
                k = line.split('=', 1)[1].strip().strip('"').strip("'")
    if not k:
        sys.exit('No ELEVENLABS_API_KEY')
    return k


def line_range(spec, n):
    if not spec:
        return list(range(n))
    a, b = spec.split('-')
    return list(range(int(a), int(b) + 1))


V4_MAX_CHARS = 1800   # Shoes (2026-11-09): one 2768-char request returned audio for only the first ~2470 chars, the last 9 lines were silent


def auto_chunks(lines, model):
    """First line index of each v4 request: close a chunk when it passes V4_MAX_CHARS, preferably at a sentence end."""
    out, n = [0], 0
    for i, (_, t) in enumerate(lines):
        n += len(prefix(i, model)) + len(spoken(t)) + 1
        if n >= V4_MAX_CHARS and i + 1 < len(lines):
            out.append(i + 1); n = 0
    return out


def plan(lines, idx):
    """Group the selected line indices into chunks at the CHUNKS boundaries."""
    out, cur = [], []
    for i in idx:
        if cur and (i in CHUNKS or i != cur[-1] + 1):
            out.append(cur); cur = []
        cur.append(i)
    if cur:
        out.append(cur)
    return out


def render_v2(key, text, prev, nxt):
    import requests
    body = {'text': text, 'model_id': 'eleven_multilingual_v2',
            'voice_settings': {'stability': 0.40, 'similarity_boost': 0.75, 'style': 0.05, 'use_speaker_boost': True, 'speed': 1.0}}
    if prev: body['previous_text'] = prev[-400:]
    if nxt: body['next_text'] = nxt[:400]
    r = requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/with-timestamps?output_format=mp3_44100_128',
                      headers={'xi-api-key': key}, json=body, timeout=300, verify=CA if os.path.exists(CA) else True)
    if r.status_code != 200:
        sys.exit(f'ElevenLabs error {r.status_code}: {r.text[:400]}')
    j = r.json(); al = j['alignment']
    return {'audio': [j['audio_base64']], 'chars': al['characters'],
            'start': al['character_start_times_seconds'], 'end': al['character_end_times_seconds']}


async def _render_v4(key, text):
    import websockets
    uri = 'wss://api.elevenlabs.io/v1/text-to-dialogue/stream-input?model_id=eleven_v4_turbo&output_format=mp3_44100_128&sync_alignment=true'
    ctx = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else None
    audio, msgs = [], []
    async with websockets.connect(uri, ssl=ctx, max_size=None, additional_headers={'xi-api-key': key}) as ws:
        await ws.send(json.dumps({'voices': [VOICE_ID], 'voice_settings': V4_SETTINGS}))
        await ws.send(json.dumps({'inputs': [{'text': text, 'voice_id': VOICE_ID, 'new_turn': False}]}))
        await ws.send(json.dumps({'close_socket': True}))
        while True:
            m = json.loads(await ws.recv())
            if m.get('error'):
                sys.exit(f'ElevenLabs error: {m}')
            if m.get('audio'):
                audio.append(m['audio'])
            msgs.append({k: v for k, v in m.items() if k != 'audio'})
            if m.get('is_final'):
                break
    return audio, msgs


def render_v4(key, text):
    audio, msgs = asyncio.run(_render_v4(key, text))
    # alignment arrives per audio chunk; times are made absolute using the decoded length of the audio before it
    return {'audio': audio, 'msgs': msgs}


def decode(b64list):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                       input=b''.join(base64.b64decode(b) for b in b64list), capture_output=True, check=True).stdout
    return np.frombuffer(p, np.int16).astype(np.float32) / 32768


def v4_alignment(res):
    """Join the per-message alignments. Each message's times start at 0 and the messages tile the audio end to end (their audio
    arrives in differently sized pieces, so the offset is the running sum of the alignment spans, not of the audio bytes)."""
    chars, st, en, offset = [], [], [], 0.0
    for m in res['msgs']:
        al = m.get('alignment')
        if not al or not al.get('chars'):
            continue
        for c, a, d in zip(al['chars'], al['char_start_times_ms'], al['char_durations_ms']):
            chars.append(c); st.append(a / 1000 + offset); en.append((a + d) / 1000 + offset)
        offset += (al['char_start_times_ms'][-1] + al['char_durations_ms'][-1]) / 1000
    return chars, st, en


def char_times(text, chars, st, en):
    """Start/end time for every character of `text`, matched to the alignment characters."""
    t0, t1 = [None] * len(text), [None] * len(text)
    sm = difflib.SequenceMatcher(None, text, ''.join(chars), autojunk=False)
    for b in sm.get_matching_blocks():
        for k in range(b.size):
            t0[b.a + k], t1[b.a + k] = st[b.b + k], en[b.b + k]
    return t0, t1, sum(b.size for b in sm.get_matching_blocks())


def cmd_render(a, lines, idx):
    key = api_key(a.env)
    cdir = pathlib.Path(a.dir) / '_eleven' / a.model; cdir.mkdir(parents=True, exist_ok=True)
    allsp = [prefix(i, a.model) + spoken(t) for i, (_, t) in enumerate(lines)]
    total = 0
    for ch in plan(lines, idx):
        text = ' '.join(allsp[i] for i in ch)
        f = cdir / f'{ch[0]:03d}-{ch[-1]:03d}.json'
        if f.exists() and json.load(open(f))['text'] == text:
            print(f'cached {f.name}'); continue
        prev = ' '.join(allsp[:ch[0]]); nxt = ' '.join(allsp[ch[-1] + 1:])
        print(f'render {f.name}: {len(text)} chars')
        res = render_v2(key, text, prev, nxt) if a.model == 'eleven_multilingual_v2' else render_v4(key, text)
        res['text'] = text; res['lines'] = ch
        json.dump(res, open(f, 'w'))
        total += len(text)
    print(f'sent {total} characters')


def ff(*args):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], check=True)


def shift(seg, semis, gain, tmp):
    r = 2 ** (semis / 12)
    src, dst = tmp + '_in.wav', tmp + '_out.wav'
    write_wav(src, seg)
    t, at = 1 / r, []
    while t < 0.5:   # atempo takes 0.5..100 per filter: chain it for big shifts
        at.append('atempo=0.5'); t /= 0.5
    at.append(f'atempo={t:.6f}')
    ff('-i', src, '-af', f'asetrate={SR * r:.1f},aresample={SR},{",".join(at)},volume={gain}dB', '-ac', '1', '-ar', str(SR), dst)
    with wave.open(dst) as w:
        out = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return out


def write_wav(p, x):
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def cmd_post(a, lines, idx):
    vdir = pathlib.Path(a.dir); cdir = vdir / '_eleven' / a.model
    tmp = str(cdir / '_tmp')
    allsp = [prefix(i, a.model) + spoken(t) for i, (_, t) in enumerate(lines)]
    pieces = {}   # line index -> (audio, [(caption word, start, end)])
    for ch in plan(lines, idx):
        f = cdir / f'{ch[0]:03d}-{ch[-1]:03d}.json'
        res = json.load(open(f))
        pcm = decode(res['audio'])
        if 'chars' in res:
            chars, st, en = res['chars'], res['start'], res['end']
        else:
            chars, st, en = v4_alignment(res)
        text = res['text']
        t0, t1, matched = char_times(text, chars, st, en)
        if matched < 0.9 * len(text.replace(' ', '')):
            print(f'  WARNING {f.name}: only {matched}/{len(text)} characters aligned')
        pos = 0
        for i in ch:
            s_txt = allsp[i]; a0 = pos; a1 = pos + len(s_txt); pos = a1 + 1
            # words: caption spelling, timed from the spoken word(s) it maps to
            words, wpos = [], a0 + len(prefix(i, a.model))
            for w in lines[i][1].split():
                sw = SPOKEN.get(w, w)
                rng = [k for k in range(wpos, wpos + len(sw)) if text[k].isalnum() and t0[k] is not None]
                ts = [t0[k] for k in rng]; te = [t1[k] for k in rng]
                words.append([re.sub(r"^[^\w]+|[^\w]+$", '', w), min(ts) if ts else None, max(te) if te else None])
                wpos += len(sw) + 1
            known = [x for x in words if x[1] is not None]
            ls, le = known[0][1], known[-1][2]
            if ls >= len(pcm) / SR - 0.05:
                sys.exit(f'TRUNCATED: line {i} ("{lines[i][1][:40]}") has no audio in {f.name} (the request stopped early). Lower V4_MAX_CHARS or add "v4_chunks" to voice_config.json, delete that cache file, render again.')
            s0 = max(0.0, ls - 0.04); s1 = min(len(pcm) / SR, le + 0.12)
            seg = pcm[int(s0 * SR):int(s1 * SR)].copy()
            # fill missing word times by neighbours
            for k, x in enumerate(words):
                if x[1] is None:
                    x[1] = words[k - 1][2] if k else ls; x[2] = x[1] + 0.15
            pieces[i] = (seg, [(w, s - s0, e - s0) for w, s, e in words])
    track, words_out, lines_out, t = [], [], [], 0.0
    for i in idx:
        spk = lines[i][0]
        seg, words = pieces[i]
        semis = a.semis + (0 if a.no_char_pitch else OFFSET.get(spk, 0))
        if semis or GAIN.get(spk, 0):
            seg = shift(seg, semis, GAIN.get(spk, 0), tmp)
        fade = int(0.01 * SR); seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
        T = a.tempo
        lines_out.append({'i': i, 'speaker': spk, 'text': lines[i][1], 's': round(t / T, 3), 'e': round((t + len(seg) / SR) / T, 3)})
        for w, ws, we in words:
            words_out.append({'w': w, 's': round((t + ws) / T, 3), 'e': round((t + we) / T, 3), 'line': i, 'speaker': spk})
        track.append(seg); t += len(seg) / SR
        nxt = lines[i + 1][1] if i + 1 < len(lines) else ''
        gap = 0.10 if lines[i][1].endswith(',') or (nxt and nxt[0].islower()) else a.gap
        track.append(np.zeros(int(gap * SR), np.float32)); t += gap
    full = np.concatenate(track + [np.zeros(int(0.4 * SR), np.float32)])
    write_wav(tmp + '_joined.wav', full)
    out = vdir / f'{a.name}.mp3'
    # --varispeed: plain faster playback, pitch rises with speed (Aris's pick, 2026-11-09: v4 Turbo at 1.5x); else atempo keeps pitch
    speed = f'asetrate={SR * a.tempo:.1f},aresample={SR}' if a.varispeed else f'atempo={a.tempo}'
    ff('-i', tmp + '_joined.wav', '-af', f'loudnorm=I=-15:TP=-1.5:LRA=11,aresample={SR},{speed}', '-ar', '44100', '-b:a', '192k', str(out))
    for s in ('_in.wav', '_out.wav', '_joined.wav'):
        if os.path.exists(tmp + s): os.remove(tmp + s)
    dur = t / a.tempo
    print(f'{len(words_out)} words, {dur:.1f} s, {len(words_out) / dur:.2f} words/s -> {out}')
    if a.name == 'voice_final':
        json.dump(words_out, open(vdir / 'captions.json', 'w'))
        json.dump(lines_out, open(vdir / 'lines_timed.json', 'w'), indent=0)
        with open(vdir / 'word_timings.csv', 'w', newline='') as f:
            cw = csv.writer(f); cw.writerow(['word', 'start', 'end', 'line', 'speaker'])
            for w in words_out: cw.writerow([w['w'], w['s'], w['e'], w['line'], w['speaker']])
        print('wrote captions.json, lines_timed.json, word_timings.csv')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['render', 'post'])
    ap.add_argument('dir')
    ap.add_argument('--model', default='eleven_multilingual_v2', choices=['eleven_multilingual_v2', 'eleven_v4_turbo'])
    ap.add_argument('--lines', default='')
    ap.add_argument('--env', default='')
    ap.add_argument('--semis', type=float, default=6.0)
    ap.add_argument('--tempo', type=float, default=1.22)
    ap.add_argument('--gap', type=float, default=GAP)
    ap.add_argument('--name', default='voice_final')
    ap.add_argument('--varispeed', action='store_true', help='speed up like faster playback (pitch rises), not pitch-kept atempo')
    ap.add_argument('--no-char-pitch', action='store_true', help='no per-character pitch offsets')
    a = ap.parse_args()
    global CHUNKS
    if a.model == 'eleven_v4_turbo':
        CHUNKS = None      # filled below: v4 stops after ~3 min of audio per request, so requests are split every ~V4_MAX_CHARS characters
    # per-video overrides (Fog onwards): <video_dir>/voice_config.json with any of
    # offset {speaker: semis}, gain {speaker: dB}, spoken {caption word: read as}, tags {line index: "[tag]"}, v4_chunks [first lines]
    cfg_p = os.path.join(a.dir, 'voice_config.json')
    if os.path.exists(cfg_p):
        global OFFSET, GAIN, SPOKEN, TAGS
        cfg = json.load(open(cfg_p))
        OFFSET = {**{'N': 0}, **cfg.get('offset', {})}; GAIN = cfg.get('gain', {}); SPOKEN = cfg.get('spoken', {})
        TAGS = {int(k): v for k, v in cfg.get('tags', {}).items()}
        if a.model == 'eleven_v4_turbo':
            CHUNKS = cfg.get('v4_chunks', None)
    lines = json.load(open(os.path.join(a.dir, 'lines.json')))
    if a.model == 'eleven_v4_turbo' and CHUNKS is None:
        CHUNKS = auto_chunks(lines, a.model)
        print('v4 chunks (first line of each request):', CHUNKS)
    idx = line_range(a.lines, len(lines))
    (cmd_render if a.cmd == 'render' else cmd_post)(a, lines, idx)


if __name__ == '__main__':
    main()
