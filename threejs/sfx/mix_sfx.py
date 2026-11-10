"""Mix the Pineapple SFX cue list into one track (preview only; does not touch the render).

usage (from this sfx folder):  python mix_sfx.py
needs: python 3 + numpy, ffmpeg on PATH
writes: sfx_only.wav (all cues, no voice) and voice_plus_sfx_preview.mp3 (voice_final.mp3 + SFX)
Tweak gains / times in sfx_cues.json and run again.
"""
import json, os, subprocess, wave, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
VOICE = os.path.join(HERE, '..', 'voice_final.mp3')


def load_wav(p):
    with wave.open(p) as w:
        assert w.getframerate() == SR and w.getsampwidth() == 2
        x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768
        return x.reshape(-1, w.getnchannels()) if w.getnchannels() == 2 else np.repeat(x[:, None], 2, 1)


def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(np.float32).reshape(-1, 2) / 32768


cues = json.load(open(os.path.join(HERE, 'sfx_cues.json')))
voice = decode(VOICE) if os.path.exists(VOICE) else None
dur = max(cues.get("duration", 0), len(voice) / SR if voice is not None else 0)
bus = np.zeros((int(dur * SR) + SR * 6, 2), np.float32)
cache = {}
get = lambda f: cache.setdefault(f, load_wav(os.path.join(HERE, f)))

for b in cues['beds']:
    x = get(b['file']); i0, i1 = int(b['at'] * SR), int(b['until'] * SR); n = i1 - i0
    seg = np.tile(x, (n // len(x) + 1, 1))[:n].copy()
    f = min(int(b.get('fade', 0.3) * SR), n // 2)
    if f: seg[:f] *= np.linspace(0, 1, f)[:, None]; seg[-f:] *= np.linspace(1, 0, f)[:, None]
    bus[i0:i1] += seg * 10 ** (b['gain'] / 20)

for h in cues['hits']:
    x = get(h['file']); i0 = int(h['at'] * SR); n = min(len(x), len(bus) - i0)
    bus[i0:i0 + n] += x[:n] * 10 ** (h['gain'] / 20)

bus = bus[: int(dur * SR)]


def write(p, x):
    x = np.clip(x, -1, 1)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())


write(os.path.join(HERE, 'sfx_only.wav'), bus)
print('wrote sfx_only.wav', f'peak {20*np.log10(np.abs(bus).max()+1e-9):.1f} dBFS')
if voice is not None:
    mix = bus.copy(); mix[: len(voice)] += voice[: len(mix)]
    pk = np.abs(mix).max()
    if pk > 0.98: mix *= 0.98 / pk
    tmp = os.path.join(HERE, '_mix.wav'); write(tmp, mix)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-b:a', '192k', os.path.join(HERE, 'voice_plus_sfx_preview.mp3')], check=True)
    os.remove(tmp); print('wrote voice_plus_sfx_preview.mp3')
