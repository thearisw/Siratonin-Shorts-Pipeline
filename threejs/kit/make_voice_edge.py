"""House narration with Edge TTS (free), one request per line, word timings from Edge's own WordBoundary events.

    python make_voice_edge.py <video_dir>          # reads <video_dir>/lines.json, writes voice_final.mp3, word_timings.csv, captions.json, lines_timed.json

lines.json: [[speaker, text], ...]. Speakers map to VOICES below (narrator "N").
House sound (Aris, 2026-11-05): en-US-AndrewMultilingualNeural, +8Hz, rate +25%, pitched up 6 semitones, sped up x1.12.
Pitch shift is plain resampling (asetrate + atempo), the same as the Edge house voice on Windows. No rubberband: it was used on the
ElevenLabs Charlie sample that Aris heard as "filtered".
Needs: pip install edge-tts; ffmpeg on PATH. In the cloud container the proxy CA must be trusted (done below if the bundle exists).
"""
import asyncio, json, os, ssl, subprocess, sys, csv, wave
import numpy as np
import edge_tts.communicate as ec
CA = '/root/.ccr/ca-bundle.crt'
if os.path.exists(CA):
    ec._SSL_CTX = ssl.create_default_context(cafile=CA)
import edge_tts

SR = 24000
SPEED = 1.12
GAP = 0.22          # seconds between lines, before the x1.12 speed-up
ANDREW = 'en-US-AndrewMultilingualNeural'
# speaker: (voice, rate, pitch, semis, gain dB)
VOICES = {
    'N':       (ANDREW, '+25%', '+8Hz', 6.0, 0),
    # side characters (Aris, 2026-11-08): the narrator's own voice and processing, only the Edge pitch nudged so each is
    # noticeably different without sounding filtered. Rate is tuned per line by --lock (no time-stretching).
    'MIA':     (ANDREW, '+25%', '+38Hz', 6.0, 0),
    'MIA_W':   (ANDREW, '+25%', '+34Hz', 6.0, -4),
    'MOM':     (ANDREW, '+25%', '+26Hz', 6.0, 0),
    'ORTIZ':   (ANDREW, '+25%', '-22Hz', 6.0, 0),
    # the Caller copying someone: the copied voice, a few Hz flatter
    'JOE':     (ANDREW, '+25%', '-26Hz', 6.0, 0),
    'C_MOM':   (ANDREW, '+25%', '+22Hz', 6.0, 0),
    'C_MIA':   (ANDREW, '+25%', '+34Hz', 6.0, 0),
    'C_MIA_W': (ANDREW, '+25%', '+30Hz', 6.0, -3),
    'C_ME':    (ANDREW, '+25%', '+0Hz', 6.0, 0),
}


async def tts(text, voice, rate, pitch, mp3, tries=4):
    for k in range(tries):
        try:
            return await _tts(text, voice, rate, pitch, mp3)
        except edge_tts.exceptions.NoAudioReceived:
            if k == tries - 1: raise
            await asyncio.sleep(2 + 2 * k)


async def _tts(text, voice, rate, pitch, mp3):
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary='WordBoundary')
    words = []
    with open(mp3, 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append((ch['text'], ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7))
    return words


def ff(*args):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], check=True)


def read_wav(p):
    with wave.open(p) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


def main(vdir, lock=None):
    lines = json.load(open(os.path.join(vdir, 'lines.json')))
    # --lock lines_timed.json: keep every non-narrator line exactly as long as before (time-stretch), so shots stay in sync
    locked = {l['i']: (l['e'] - l['s']) * SPEED for l in json.load(open(lock))} if lock else {}
    cache = os.path.join(vdir, '_edge_cache'); os.makedirs(cache, exist_ok=True)
    track, words_out, lines_out, t = [], [], [], 0.0
    for i, (spk, text) in enumerate(lines):
        voice, rate, pitch, semis, gain = VOICES[spk]
        key = f'{i:03d}_{spk}'
        mp3, js = os.path.join(cache, key + '.mp3'), os.path.join(cache, key + '.json')
        def render(rate_):
            if os.path.exists(js) and json.load(open(js))['text'] == text and (spk == 'N' or json.load(open(js)).get('voice') == [voice, rate_, pitch]):
                return json.load(open(js))['words']
            w_ = asyncio.run(tts(text, voice, rate_, pitch, mp3))
            json.dump({'text': text, 'words': w_, 'voice': [voice, rate_, pitch]}, open(js, 'w'))
            return w_
        words = render(rate)
        if spk != 'N' and i in locked:
            # spoken length (first word start .. last word end + tail) vs the locked length: adjust Edge's rate, no stretching
            cur = words[-1][2] + 0.10 - max(0.0, words[0][1] - 0.04)
            base = 1 + int(rate.rstrip('%')) / 100
            for _ in range(2):
                want = round((base * cur / locked[i] - 1) * 100)
                want = max(10, min(80, want))   # never slower than +10%: a short line gets a little silence instead of a drawl
                r2 = f'{want:+d}%'
                if r2 == rate: break
                words = render(r2); rate = r2
                cur = words[-1][2] + 0.10 - max(0.0, words[0][1] - 0.04); base = 1 + want / 100
        r = 2 ** (semis / 12)
        wav = os.path.join(cache, key + '.wav')
        # pitch up, duration kept
        ff('-i', mp3, '-af', f'aresample={SR},asetrate={SR * r:.1f},aresample={SR},atempo={1 / r:.6f},volume={gain}dB', '-ac', '1', '-ar', str(SR), wav)
        a = read_wav(wav)
        s0 = max(0.0, words[0][1] - 0.04); s1 = min(len(a) / SR, words[-1][2] + 0.10)
        seg = a[int(s0 * SR):int(s1 * SR)]
        if spk != 'N' and i in locked:   # pad or trim to the exact locked length (the rate already got it within a few %)
            n = int(round(locked[i] * SR)); seg = np.concatenate([seg[:n], np.zeros(max(0, n - len(seg)), np.float32)])
        fade = int(0.01 * SR); seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
        lines_out.append({'i': i, 'speaker': spk, 'text': text, 's': round(t / SPEED, 3), 'e': round((t + len(seg) / SR) / SPEED, 3)})
        for w, ws, we in words:
            words_out.append({'w': w, 's': round((t + ws - s0) / SPEED, 3), 'e': round((t + we - s0) / SPEED, 3), 'line': i, 'speaker': spk})
        track.append(seg); t += len(seg) / SR
        gap = 0.10 if text.endswith(',') or (i + 1 < len(lines) and lines[i + 1][1][0].islower()) else GAP
        track.append(np.zeros(int(gap * SR), np.float32)); t += gap
    full = np.concatenate(track + [np.zeros(int(0.4 * SR), np.float32)])
    raw = os.path.join(cache, '_joined.wav')
    with wave.open(raw, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(full, -1, 1) * 32767).astype(np.int16).tobytes())
    out = os.path.join(vdir, 'voice_final.mp3')
    ff('-i', raw, '-af', f'atempo={SPEED},loudnorm=I=-15:TP=-1.5:LRA=11', '-ar', '44100', '-b:a', '192k', out)
    json.dump(words_out, open(os.path.join(vdir, 'captions.json'), 'w'))
    json.dump(lines_out, open(os.path.join(vdir, 'lines_timed.json'), 'w'), indent=0)
    with open(os.path.join(vdir, 'word_timings.csv'), 'w', newline='') as f:
        cw = csv.writer(f); cw.writerow(['word', 'start', 'end', 'line', 'speaker'])
        for w in words_out: cw.writerow([w['w'], w['s'], w['e'], w['line'], w['speaker']])
    print(f'{len(words_out)} words, {t / SPEED:.1f} s, {len(words_out) / (t / SPEED):.2f} words/s -> {out}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[sys.argv.index('--lock') + 1] if '--lock' in sys.argv else None)
