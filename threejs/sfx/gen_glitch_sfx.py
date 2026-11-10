"""Glitch, alarm and intercom SFX for the fourth-wall video (and any video where the world breaks).

Synthesized from scratch with numpy like gen_sfx.py (CC0, no attribution). 48 kHz stereo 16-bit WAVs into the folder given
(default: this folder). Deterministic (fixed seeds), so re-running gives the same files.

    python gen_glitch_sfx.py            # writes the glitch_*, alarm_*, intercom_*, screens_* WAVs next to this file

Files (length):
  glitch_hit_short.wav      0.25 s  digital crunch: bit-crushed noise + square blips (one picture glitch)
  glitch_hit_long.wav       0.80 s  longer tear: crunch, stutters and a pitch drop (the sky wall, the vial)
  glitch_stutter.wav        0.60 s  buffer-repeat stutter of a tone, speeding up (frame freeze / stutter)
  glitch_static_burst.wav   0.50 s  TV static burst with crackle (kind 'static')
  glitch_static_loop.wav    3.00 s  seamless static bed (dead screens)
  glitch_dropout.wav        0.45 s  signal cut: hum, click, then silence (kind 'cut' / 'black', the cut-off hook)
  glitch_powerdown.wav      1.20 s  tape-stop pitch-down (the dose kicking in, the end)
  glitch_bleeps.wav         0.70 s  data chirps (screens, HUD text typing on)
  glitch_reverse_suck.wav   0.60 s  reversed swell into a hard stop (just before a reveal)
  alarm_siren_loop.wav      3.60 s  two-tone containment alarm, seamless loop (period 0.9 s, matches VFX alarmWash)
  alarm_klaxon.wav          1.50 s  one harsh klaxon blast (CODE 2)
  intercom_chime.wav        1.20 s  three-note PA chime before the intercom voice
  intercom_click.wav        0.15 s  PA key-up click + short hiss
  screens_hum_loop.wav      4.00 s  CRT whine + mains hum of a wall of screens, seamless loop
"""
import os, sys, wave
import numpy as np

SR = 48000
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))


def t_(dur):
    return np.arange(int(SR * dur)) / SR


def norm(x, peak=0.89):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def env(n, a=0.002, r=0.05):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def crush(x, bits=4, hold=8):
    """Bit-depth + sample-rate reduction: the 'digital' in digital glitch."""
    q = 2 ** (bits - 1)
    y = np.round(x * q) / q
    idx = (np.arange(len(y)) // hold) * hold
    return y[np.minimum(idx, len(y) - 1)]


def square(f, tt, duty=0.5):
    return np.where((tt * f) % 1 < duty, 1.0, -1.0)


def lowpass(x, a=0.2):
    y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x):
        s += a * (v - s); y[i] = s
    return y


def highpass(x, a=0.2):
    return x - lowpass(x, a)


def stereo(m, width=0.15, seed=0):
    """Mono -> stereo with a small decorrelation (a few-sample delay on one side)."""
    d = 7 + seed % 11
    r = np.concatenate([np.zeros(d), m[:-d]])
    return np.stack([m * (1 - width) + r * width, r * (1 - width) + m * width], 1)


def loopify(x, xf=0.25):
    """Crossfade the tail into the head so the file loops without a click."""
    n = int(xf * SR)
    head, tail = x[:n].copy(), x[-n:].copy()
    w = np.linspace(0, 1, n)[:, None] if x.ndim == 2 else np.linspace(0, 1, n)
    out = x[:-n].copy()
    out[:n] = tail * (1 - w) + head * w
    return out


def save(name, x, peak=0.89):
    x = norm(x, peak)
    if x.ndim == 1: x = stereo(x)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f'{name:28s} {len(x) / SR:5.2f} s')


def glitch_chunk(rng, dur, k=1.0):
    """One burst: crushed noise + random square blips + short tone fragments, chopped into on/off segments."""
    n = int(dur * SR); tt = t_(dur)
    x = np.zeros(n)
    pos = 0
    while pos < n:
        seg = int(SR * rng.uniform(0.012, 0.05))
        kind = rng.integers(0, 4)
        tt2 = tt[pos:pos + seg]
        if kind == 0: s = crush(rng.uniform(-1, 1, len(tt2)), bits=rng.integers(2, 5), hold=rng.integers(4, 30))
        elif kind == 1: s = square(rng.uniform(300, 3500), tt2, rng.uniform(0.1, 0.5)) * 0.7
        elif kind == 2: s = np.sin(2 * np.pi * rng.uniform(800, 6000) * tt2) * 0.6
        else: s = np.zeros(len(tt2))   # dropouts are half the sound
        x[pos:pos + len(s)] = s * rng.uniform(0.5, 1.0) * k
        pos += seg
    return x


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = np.random.default_rng(13)

    # --- hits ---
    x = glitch_chunk(rng, 0.25); x *= env(len(x), 0.001, 0.03)
    sub = np.sin(2 * np.pi * 55 * t_(0.25)) * np.exp(-t_(0.25) * 18) * 0.5
    save('glitch_hit_short.wav', stereo(x + sub, 0.3, 1))

    a = glitch_chunk(rng, 0.8)
    tt = t_(0.8)
    drop = np.sin(2 * np.pi * np.cumsum(np.linspace(900, 60, len(tt))) / SR) * 0.5 * np.linspace(1, 0, len(tt))
    # stutter the middle: repeat a 30 ms grain 6x
    g0 = int(0.3 * SR); grain = a[g0:g0 + int(0.03 * SR)].copy()
    for i in range(6): a[g0 + i * len(grain):g0 + (i + 1) * len(grain)] = grain
    x = (a + crush(drop, 5, 6)) * env(len(tt), 0.001, 0.12)
    save('glitch_hit_long.wav', stereo(x, 0.35, 2))

    # --- stutter: a 40 ms grain of tone+noise repeated with shrinking spacing ---
    tt = t_(0.06)
    grain = (np.sin(2 * np.pi * 440 * tt) + 0.5 * square(880, tt, 0.3) + 0.3 * rng.uniform(-1, 1, len(tt))) * env(len(tt), 0.001, 0.01)
    x = np.zeros(int(0.6 * SR)); pos, gap = 0, 0.09
    while pos + len(grain) < len(x):
        x[pos:pos + len(grain)] += grain; pos += int(gap * SR); gap = max(0.035, gap * 0.85)
    save('glitch_stutter.wav', stereo(crush(x, 6, 3), 0.2, 3))

    # --- static ---
    tt = t_(0.5)
    st = highpass(rng.uniform(-1, 1, len(tt)), 0.35)
    crackle = (rng.uniform(0, 1, len(tt)) > 0.997) * rng.uniform(-1, 1, len(tt)) * 1.2
    x = (st * 0.7 + crackle) * env(len(tt), 0.002, 0.08) * (0.75 + 0.25 * np.sin(2 * np.pi * 9 * tt))
    save('glitch_static_burst.wav', np.stack([x, highpass(rng.uniform(-1, 1, len(tt)), 0.35) * 0.7 * env(len(tt), 0.002, 0.08) + crackle], 1), 0.8)

    tt = t_(3.25)
    L = highpass(rng.uniform(-1, 1, len(tt)), 0.3) + (rng.uniform(0, 1, len(tt)) > 0.998) * rng.uniform(-1, 1, len(tt)) * 1.0
    R = highpass(rng.uniform(-1, 1, len(tt)), 0.3) + (rng.uniform(0, 1, len(tt)) > 0.998) * rng.uniform(-1, 1, len(tt)) * 1.0
    save('glitch_static_loop.wav', loopify(np.stack([L, R], 1)), 0.6)

    # --- dropout: hum + buzz, a hard click, then silence ---
    tt = t_(0.45); cut = int(0.16 * SR)
    hum = np.sin(2 * np.pi * 60 * tt) * 0.4 + square(120, tt, 0.2) * 0.15 + glitch_chunk(rng, 0.45, 0.6)
    hum[cut:] = 0
    hum[cut:cut + 40] = np.linspace(1, -1, 40)      # the click
    save('glitch_dropout.wav', stereo(hum * env(len(tt), 0.001, 0.005), 0.1, 4))

    # --- power-down: tape stop (pitch and speed fall to zero) ---
    tt = t_(1.2)
    f = 420 * (1 - tt / 1.2) ** 2 + 20
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.4 * np.sign(np.sin(ph * 2)) + 0.25 * np.sin(ph * 3.01)) * (1 - tt / 1.2) ** 0.6
    x = crush(lowpass(x, 0.25), 8, 2) * env(len(tt), 0.005, 0.05)
    save('glitch_powerdown.wav', stereo(x, 0.2, 5))

    # --- bleeps: short data chirps ---
    x = np.zeros(int(0.7 * SR)); pos = 0
    while pos < len(x) - SR * 0.03:
        d = rng.uniform(0.015, 0.045); tt = t_(d)
        b = square(rng.choice([1200, 1600, 2000, 2400, 3200]), tt, 0.5) * env(len(tt), 0.001, 0.004) * 0.5
        x[pos:pos + len(b)] += b[:len(x) - pos]; pos += int((d + rng.uniform(0.005, 0.04)) * SR)
    save('glitch_bleeps.wav', stereo(lowpass(x, 0.5), 0.25, 6), 0.6)

    # --- reverse suck: a swell that rises then stops dead ---
    tt = t_(0.6)
    sw = (rng.uniform(-1, 1, len(tt)) * 0.6 + np.sin(2 * np.pi * np.cumsum(np.linspace(80, 1400, len(tt))) / SR)) * (tt / 0.6) ** 3
    sw[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    save('glitch_reverse_suck.wav', stereo(lowpass(sw, 0.3), 0.3, 7))

    # --- alarm: two-tone siren, 0.9 s period ---
    tt = t_(3.6 + 0.25)   # 4 whole 0.9 s periods, so the loop seam lands on the same tone
    sel = ((tt % 0.9) < 0.45)
    f = np.where(sel, 740.0, 554.0)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sign(np.sin(ph)) * 0.5 + np.sin(ph) * 0.5 + 0.25 * np.sin(ph * 2)
    x = lowpass(x, 0.35) * (0.85 + 0.15 * np.sin(2 * np.pi * tt / 0.9 * 2))
    save('alarm_siren_loop.wav', loopify(stereo(x, 0.2, 8)), 0.75)

    tt = t_(1.5)
    f = 220 + 25 * np.sin(2 * np.pi * 6 * tt)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sign(np.sin(ph * h)) / h for h in (1, 1.5, 2)) * env(len(tt), 0.01, 0.25)
    save('alarm_klaxon.wav', stereo(lowpass(x, 0.3), 0.2, 9), 0.8)

    # --- intercom ---
    out = np.zeros(int(1.2 * SR))
    for i, f in enumerate((659.25, 523.25, 392.0)):   # E5 C5 G4, a falling PA chime
        tt = t_(0.7); n = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2 * tt)
        n *= np.exp(-tt * 4) * env(len(tt), 0.004, 0.05)
        p = int(i * 0.25 * SR); out[p:p + len(n)] += n[:len(out) - p]
    save('intercom_chime.wav', stereo(out, 0.1, 10), 0.7)

    tt = t_(0.15)
    x = highpass(rng.uniform(-1, 1, len(tt)), 0.4) * 0.25 * np.exp(-tt * 20)
    x[:60] += np.linspace(1, -0.8, 60)
    save('intercom_click.wav', stereo(x, 0.05, 11), 0.6)

    # --- a wall of screens: 15.7 kHz CRT whine is too high to hear well on phones, so use a softer 8 kHz-ish whine + 60 Hz hum ---
    tt = t_(4.25)
    x = 0.04 * np.sin(2 * np.pi * 7850 * tt) + 0.35 * np.sin(2 * np.pi * 60 * tt) + 0.18 * np.sin(2 * np.pi * 120 * tt) \
        + 0.08 * lowpass(rng.uniform(-1, 1, len(tt)), 0.05) + 0.05 * square(180, tt, 0.1)
    save('screens_hum_loop.wav', loopify(stereo(x, 0.3, 12)), 0.45)


if __name__ == '__main__':
    main()
