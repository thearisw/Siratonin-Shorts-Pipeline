"""Synthesize original SFX for the Pineapple reel (numpy only). All output is original, CC0.
usage: python3 gen_sfx.py OUTDIR
"""
import sys, os, wave, numpy as np

SR = 48000
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t_(d): return np.arange(int(d * SR)) / SR


def noise(d): return rng.standard_normal(int(d * SR))


def spec_filter(x, fn):
    """filter by multiplying the spectrum with fn(freqs)"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * fn(f), len(x))


def lp(x, fc, order=2): return spec_filter(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order)))
def hp(x, fc, order=2): return spec_filter(x, lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order)))
def bp(x, lo, hi, order=2): return hp(lp(x, hi, order), lo, order)
def pink(d): return spec_filter(noise(d), lambda f: 1 / np.sqrt(np.maximum(f, 20)))
def brown(d): return spec_filter(noise(d), lambda f: 1 / np.maximum(f, 15))


def env_ad(n, a, d):
    """attack a s, exponential decay with time-constant d s"""
    tt = np.arange(n) / SR
    e = np.exp(-tt / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def fade(x, fi=0.01, fo=0.05):
    x = x.copy(); a, b = int(fi * SR), int(fo * SR)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x


def modes(d, parts, click=0.0, clickfc=3000):
    """sum of damped sinusoids: parts = [(freq, amp, decay)]"""
    tt = t_(d); y = np.zeros_like(tt)
    for f, a, dec in parts:
        y += a * np.sin(2 * np.pi * f * tt + rng.uniform(0, 6.28)) * np.exp(-tt / dec)
    if click:
        c = lp(noise(d), clickfc) * env_ad(len(tt), 0.0005, 0.004)
        y += click * c / (np.abs(c).max() + 1e-9)
    return y


def reverb(x, dur=1.8, wet=0.35, pre=0.012, tone=5000, stereo=True):
    n = int(dur * SR)
    chans = []
    for k in range(2 if stereo else 1):
        ir = lp(noise(dur), tone) * np.exp(-np.arange(n) / SR / (dur / 6.9))
        ir = np.concatenate([np.zeros(int(pre * SR)), ir]); ir /= np.sqrt((ir ** 2).sum())
        L = len(x) + len(ir)
        y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)
        xx = np.concatenate([x, np.zeros(len(ir))])
        chans.append((1 - wet) * xx + wet * y * 3)
    return np.stack(chans, 1) if stereo else chans[0]


def fold(y, n):
    """wrap a reverb tail back onto the head so a loop stays seamless"""
    y = np.asarray(y, float); out = y[:n].copy(); k = n
    while k < len(y):
        seg = y[k:k + n]; out[:len(seg)] += seg; k += n
    return out


def to_st(x, width=0.0):
    if x.ndim == 2: return x
    if width <= 0: return np.stack([x, x], 1)
    d = int(0.0006 * SR)
    r = np.concatenate([np.zeros(d), x[:-d]])
    return np.stack([x, (1 - width) * x + width * r], 1)


def save(name, x, peak_db=-1.0, desc=''):
    x = to_st(np.asarray(x, float))
    x = x / (np.abs(x).max() + 1e-12) * 10 ** (peak_db / 20)
    # trim trailing near-silence
    a = np.abs(x).max(1) if 'loop' not in name else np.ones(len(x)); idx = np.where(a > 10 ** (-70 / 20))[0]
    if len(idx) and 'loop' not in name: x = x[: idx[-1] + int(0.02 * SR)]
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f'{name}.wav  {len(x)/SR:.2f}s  {desc}')


# ---------------------------------------------------------------- beds / ambience
def drone(d=40):
    tt = t_(d); y = np.zeros_like(tt)
    for f, a in [(41.2, 1), (55.0, 0.7), (61.7, 0.35), (82.4, 0.3), (87.3, 0.18)]:   # E1 A1 B1 E2 F2 (dissonant minor 2nd up top)
        lfo = 1 + 0.003 * np.sin(2 * np.pi * rng.uniform(0.03, 0.08) * tt)
        y += a * np.sin(2 * np.pi * f * np.cumsum(lfo) / SR)
    air = bp(pink(d), 200, 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * tt)) * 0.25
    y = y / np.abs(y).max() + air / np.abs(air).max() * 0.3
    # seamless loop: crossfade tail into head
    xf = int(4 * SR); y[:xf] = y[:xf] * np.linspace(0, 1, xf) + y[-xf:] * np.linspace(1, 0, xf); y = y[:-xf]
    return fold(reverb(y, 3, 0.3), len(y))


def crickets(d=30):
    tt = t_(d); y = np.zeros_like(tt)
    for k in range(7):                               # several crickets, different pitch/rate/pan-ish level
        f = rng.uniform(3900, 5200); rate = rng.uniform(1.2, 2.6); amp = rng.uniform(0.2, 1)
        chirp_gate = (np.sin(2 * np.pi * rate * tt + rng.uniform(0, 6.28)) > 0.55).astype(float)
        pulse = (np.sin(2 * np.pi * 30 * tt) > 0).astype(float)      # 30 Hz syllable pulses inside each chirp
        g = lp(chirp_gate * pulse, 400)
        y += amp * g * np.sin(2 * np.pi * f * tt)
    y = bp(y, 2500, 8000)
    wind = lp(pink(d), 500) * 0.6 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * tt))
    y = y / np.abs(y).max() * 0.5 + wind / np.abs(wind).max() * 0.35
    xf = int(3 * SR); y[:xf] = y[:xf] * np.linspace(0, 1, xf) + y[-xf:] * np.linspace(1, 0, xf); y = y[:-xf]
    return fold(reverb(y, 1.2, 0.25), len(y))


def wind(d=30):
    tt = t_(d)
    base = pink(d)
    # slow moving resonance = howl
    out = np.zeros_like(tt); seg = int(0.5 * SR)
    g = 0.5 + 0.5 * np.sin(2 * np.pi * 0.09 * tt) * np.sin(2 * np.pi * 0.031 * tt + 1)
    y = lp(base, 700) * (0.4 + 0.6 * g) + bp(base, 300, 900) * g ** 2 * 0.8
    xf = int(3 * SR); y[:xf] = y[:xf] * np.linspace(0, 1, xf) + y[-xf:] * np.linspace(1, 0, xf); y = y[:-xf]
    return to_st(y, 0.6)


def room_tone(d=20):
    y = lp(brown(d), 180) + 0.15 * lp(pink(d), 1500)
    y += 0.02 * np.sin(2 * np.pi * 60 * t_(d)) + 0.01 * np.sin(2 * np.pi * 120 * t_(d))   # fridge hum
    xf = int(2 * SR); y[:xf] = y[:xf] * np.linspace(0, 1, xf) + y[-xf:] * np.linspace(1, 0, xf); y = y[:-xf]
    return to_st(y, 0.4)


def birds_morning(d=12):
    tt = t_(d); y = np.zeros_like(tt)
    for k in range(18):
        t0 = rng.uniform(0, d - 1); n = int(rng.uniform(0.08, 0.25) * SR); i0 = int(t0 * SR)
        f0, f1 = rng.uniform(2500, 4500), rng.uniform(2000, 5500)
        for rep in range(rng.integers(1, 4)):
            j = i0 + rep * int(n * 1.3)
            if j + n >= len(tt): break
            ff = np.linspace(f0, f1, n); ph = 2 * np.pi * np.cumsum(ff) / SR
            y[j:j + n] += rng.uniform(0.3, 1) * np.sin(ph + 0.8 * np.sin(2 * np.pi * 40 * np.arange(n) / SR)) * np.hanning(n)
    y += lp(pink(d), 400) * 0.05
    return reverb(fade(y, 0.5, 1), 1.5, 0.35)


# ---------------------------------------------------------------- hits / transitions
def sub_boom(d=3.5):
    tt = t_(d)
    f = 30 + 70 * np.exp(-tt / 0.08)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.9)
    y += 0.4 * lp(noise(d), 300) * env_ad(len(tt), 0.001, 0.15)
    y += 0.3 * lp(noise(d), 4000) * env_ad(len(tt), 0.0005, 0.02)
    return reverb(y, 3.0, 0.3, tone=2500)


def stinger(d=4):
    """dissonant cluster hit + noise splash: horror sting"""
    tt = t_(d); y = np.zeros_like(tt)
    for f in [110, 116.5, 155.6, 164.8, 233, 247, 311, 330]:
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt + rng.uniform(0, 6))
        saw = 2 * ((np.cumsum(f * vib) / SR) % 1) - 1
        y += saw * rng.uniform(0.5, 1)
    y = lp(y, 2500) * env_ad(len(tt), 0.005, 1.0)
    y += 1.5 * sub_boom(d)[:len(tt), 0] if False else 0
    tt2 = tt; f = 35 + 60 * np.exp(-tt2 / 0.06)
    y += 3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt2 / 0.7)
    y += 0.8 * hp(noise(d), 3000) * env_ad(len(tt), 0.001, 0.4)
    return reverb(y, 3.5, 0.4)


def riser(d=4.0, top=900):
    tt = t_(d); p = tt / d
    y = np.zeros_like(tt)
    # noise swelling up in brightness
    nz = noise(d); out = np.zeros_like(tt); blocks = 40; L = len(tt) // blocks
    for b in range(blocks):
        s = slice(b * L, (b + 1) * L if b < blocks - 1 else len(tt))
        fc = 300 + (6000 - 300) * (b / blocks) ** 2
        out[s] = lp(nz, fc)[s]
    y += out * p ** 2
    # shepard-ish rising tones
    for k in range(3):
        f = (80 * 2 ** k) * 2 ** (p * 1.5)
        y += 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * p ** 1.5
    y *= (p ** 1.2)
    y[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return reverb(y, 1.5, 0.3)


def reverse_swell(d=1.6):
    s = stinger(2.5)[:, 0]
    s = s[: int(d * SR)][::-1]
    return to_st(fade(s, 0.05, 0.01), 0.5)


def whoosh(d=0.9):
    tt = t_(d); p = tt / d
    e = np.sin(np.pi * p) ** 2
    nz = noise(d); out = np.zeros_like(tt); blocks = 30; L = len(tt) // blocks
    for b in range(blocks):
        s = slice(b * L, (b + 1) * L if b < blocks - 1 else len(tt))
        c = b / blocks; fc = 400 + 3000 * np.sin(np.pi * c)
        out[s] = bp(nz, fc * 0.5, fc * 1.5)[s]
    y = out * e
    pan = p
    return np.stack([y * (1 - 0.6 * pan), y * (0.4 + 0.6 * pan)], 1)


def tinnitus(d=5):
    tt = t_(d)
    y = np.sin(2 * np.pi * 7200 * tt) * 0.3 + 0.1 * np.sin(2 * np.pi * 7230 * tt)
    return to_st(fade(y, 0.3, 2.5))


def heartbeat(d=6, bpm=72):
    tt = t_(d); y = np.zeros_like(tt)
    per = 60 / bpm
    for k in range(int(d / per)):
        for off, a in [(0, 1.0), (0.28, 0.65)]:
            i = int((k * per + off) * SR)
            n = int(0.25 * SR)
            if i + n > len(tt): continue
            ttt = np.arange(n) / SR
            f = 45 + 25 * np.exp(-ttt / 0.02)
            y[i:i + n] += a * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-ttt / 0.06)
    return to_st(lp(y, 150))


# ---------------------------------------------------------------- clock / bell
def clock_tick(d=0.25, hi=True):
    f0 = 3200 if hi else 2500
    y = modes(d, [(f0, 1, 0.006), (f0 * 1.63, 0.6, 0.004), (f0 * 2.4, 0.3, 0.003), (900, 0.3, 0.01)], click=0.8, clickfc=8000)
    return reverb(y, 0.4, 0.15, tone=8000)


def clock_ticking(d=8):
    out = np.zeros(int(d * SR))
    for k in range(int(d)):
        for half in (0, 1):
            tk = clock_tick(hi=(half == 0))[:, 0]; i = int((k + half * 0.5) * SR)
            n = min(len(tk), len(out) - i); out[i:i + n] += tk[:n] * (1 if half == 0 else 0.7)
    return to_st(out)


def bell_toll(d=7, f=196):
    # inharmonic church-bell partials (hum, prime, tierce, quint, nominal...)
    ratios = [(0.5, 0.6, 3.5), (1.0, 0.9, 2.5), (1.19, 0.7, 2.0), (1.5, 0.4, 1.6), (2.0, 0.8, 1.4), (2.52, 0.3, 0.9), (3.0, 0.25, 0.7), (4.07, 0.15, 0.5)]
    y = modes(d, [(f * r, a, dec) for r, a, dec in ratios], click=0.5, clickfc=2500)
    tt = t_(d); y *= 1 + 0.15 * np.sin(2 * np.pi * 1.7 * tt)    # beating
    return reverb(y, 4.0, 0.45, tone=4000)


def clock_strike_9(d=None):
    toll = bell_toll(5.5)[:, 0]
    gap = 1.15; total = int((gap * 8 + 6) * SR); out = np.zeros(total)
    for k in range(9):
        i = int(k * gap * SR); n = min(len(toll), total - i); out[i:i + n] += toll[:n]
    return to_st(out, 0.5)


def clock_hit_915():
    """minute hand clunk + low sting for 9:15"""
    t1 = clock_tick(0.3)[:, 0] * 1.2
    boom = sub_boom(2.5)[:, 0] * 0.8
    y = np.zeros(len(boom)); y[:len(t1)] += t1; y += boom
    return to_st(y, 0.4)


# ---------------------------------------------------------------- doors / house foley
def knock_one(heavy=1.0):
    d = 0.5
    y = modes(d, [(105, 1, 0.045), (185, 0.8, 0.03), (262, 0.6, 0.02), (410, 0.35, 0.012), (690, 0.2, 0.008)], click=0.9 * heavy, clickfc=2500)
    y = lp(y, 2200) * heavy
    return y


def knocks3(gap=0.56, heavy=1.0, room=0.3):
    one = knock_one(heavy); out = np.zeros(int((gap * 2 + 0.6) * SR))
    for k in range(3):
        k1 = knock_one(heavy * rng.uniform(0.9, 1.05)); i = int(k * gap * SR); out[i:i + len(k1)] += k1
    return reverb(out, 1.0, room, tone=3000)


def knock_single(heavy=1.0, room=0.3):
    return reverb(knock_one(heavy), 1.0, room, tone=3000)


def tiny_knock():
    out = np.zeros(int(0.9 * SR))
    for k, (dt, a) in enumerate([(0, 0.55), (0.18, 0.45)]):
        k1 = modes(0.35, [(160, 1, 0.03), (300, 0.8, 0.02), (520, 0.5, 0.012), (900, 0.3, 0.006)], click=0.6, clickfc=3500) * a
        i = int(dt * SR); out[i:i + len(k1)] += k1
    return reverb(out, 1.0, 0.3, tone=3000)


def door_creak(d=1.6):
    """stick-slip friction: an irregular pulse train swept in rate, through wood resonances"""
    tt = t_(d); p = tt / d
    rate = 35 + 120 * np.sin(np.pi * p * 0.9) + 25 * np.sin(2 * np.pi * 3.1 * tt)
    rate *= 1 + 0.15 * lp(noise(d), 8)
    ph = np.cumsum(rate) / SR
    pulses = np.diff(np.floor(ph), prepend=0) * (0.6 + 0.4 * rng.random(len(tt)))
    y = np.zeros_like(tt)
    for f, a, q in [(380, 1, 0.012), (820, 0.7, 0.008), (1450, 0.5, 0.006), (2600, 0.3, 0.004)]:
        n = int(0.06 * SR); ir = np.sin(2 * np.pi * f * np.arange(n) / SR) * np.exp(-np.arange(n) / SR / q)
        y += a * np.convolve(pulses, ir)[:len(tt)]
    y *= np.sin(np.pi * np.clip(p * 1.05, 0, 1)) ** 0.5
    return reverb(y, 1.2, 0.3, tone=4000)


def door_open_close(close=False):
    latch = modes(0.15, [(2100, 1, 0.01), (3400, 0.6, 0.006), (5200, 0.3, 0.004)], click=1, clickfc=9000)
    if not close:
        c = door_creak(1.4)[:, 0]
        y = np.zeros(len(c) + int(0.2 * SR)); y[:len(latch)] += latch * 0.6; y[int(0.12 * SR):int(0.12 * SR) + len(c)] += c
        return to_st(y, 0.4)
    thud = modes(0.6, [(70, 1, 0.08), (130, 0.7, 0.05), (240, 0.4, 0.03)], click=0.7, clickfc=2000)
    y = np.zeros(len(thud)); y += thud; y[:len(latch)] += latch * 0.5
    return reverb(y, 1.0, 0.3, tone=3000)


def deadbolt():
    out = np.zeros(int(0.6 * SR))
    slide = bp(noise(0.12), 2000, 7000) * np.hanning(int(0.12 * SR)) * 0.25
    out[:len(slide)] += slide
    clack = modes(0.2, [(1800, 1, 0.012), (2950, 0.8, 0.008), (4400, 0.5, 0.005), (650, 0.4, 0.02)], click=1, clickfc=9000)
    i = int(0.11 * SR); out[i:i + len(clack)] += clack
    return reverb(out, 0.6, 0.2, tone=6000)


def lock_check_x2():
    d = deadbolt()[:, 0]; out = np.zeros(len(d) * 2)
    out[:len(d)] += d; out[int(0.55 * SR):int(0.55 * SR) + len(d)] += d * 0.9
    return to_st(out)


def door_rattle(d=0.6):
    tt = t_(d)
    hits = (rng.random(len(tt)) < 0.004).astype(float) * np.exp(-tt / 0.15)
    y = np.zeros_like(tt)
    for f, q in [(1300, 0.004), (2400, 0.003), (3700, 0.002)]:
        n = int(0.03 * SR); ir = np.sin(2 * np.pi * f * np.arange(n) / SR) * np.exp(-np.arange(n) / SR / q)
        y += np.convolve(hits, ir)[:len(tt)]
    return reverb(y, 0.6, 0.2)


# ---------------------------------------------------------------- streetlight
def light_off(flicker=True, d=2.2):
    """mains buzz that sputters (flicker) then dies with a relay clunk + sub drop"""
    tt = t_(d)
    buzz = np.zeros_like(tt)
    for h in range(1, 12):
        buzz += np.sin(2 * np.pi * 120 * h * tt) / h ** 0.8
    buzz = bp(buzz, 100, 3000)
    gate = np.ones_like(tt); cut = 0.55
    if flicker:
        # same idea as the shot: sputters, then out at ~0.52 s
        for a, b in [(0.12, 0.16), (0.24, 0.27), (0.33, 0.40), (0.46, 0.49)]:
            gate[int(a * SR):int(b * SR)] = 0.05
    gate[int(cut * SR):] = 0
    gate = lp(gate, 300)
    sputter = hp(noise(d), 2500) * np.abs(np.diff(gate, prepend=1)) * 40
    y = buzz * gate * 0.5 + sputter * 0.3
    clunk = modes(0.5, [(90, 1, 0.06), (180, 0.6, 0.03), (1200, 0.3, 0.01)], click=0.8, clickfc=3000)
    i = int(cut * SR); y[i:i + len(clunk)] += clunk * 1.3
    f = 50 * np.exp(-(tt - cut).clip(0) / 0.4) + 25
    drop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-(tt - cut).clip(0) / 0.6) * (tt > cut)
    y += drop * 0.9
    return reverb(y, 2.0, 0.3, tone=3000)


def lights_count_down():
    """three quick 'clunk-out's for 9 lights / then five / then two"""
    c = light_off(False, 1.2)[:, 0]
    return to_st(c, 0.3)


# ---------------------------------------------------------------- creature / caller
def footstep_grass(heavy=1.0):
    d = 0.45
    y = bp(noise(d), 300, 5000) * env_ad(int(d * SR), 0.01, 0.06) * 0.7
    y += hp(noise(d), 3000) * env_ad(int(d * SR), 0.02, 0.09) * (rng.random(int(d * SR)) < 0.08) * 1.5   # blades crunch
    y += modes(d, [(60, 1, 0.05), (95, 0.5, 0.03)]) * heavy
    return y


def caller_creep(d=8):
    """slow long strides with pauses, a tilt-creak on some steps"""
    out = np.zeros(int(d * SR)); t = 0.3
    while t < d - 0.6:
        s = footstep_grass(1.2); i = int(t * SR); out[i:i + len(s)] += s * rng.uniform(0.7, 1)
        t += rng.choice([1.1, 1.3, 2.0])
    out += lp(brown(d), 120) * 0.1
    return reverb(out, 1.5, 0.3, tone=4000)


def caller_presence(d=6):
    """low breathy groan for the Caller (pitched-down filtered noise with formants)"""
    tt = t_(d)
    src = brown(d) * 0.5 + 0.2 * np.sign(np.sin(2 * np.pi * 38 * tt * (1 + 0.05 * np.sin(2 * np.pi * 0.4 * tt))))
    y = bp(src, 150, 400) + 0.6 * bp(src, 550, 750) + 0.3 * bp(src, 1100, 1300)
    y *= np.sin(np.pi * tt / d) ** 1.5 * (0.7 + 0.3 * np.sin(2 * np.pi * 0.6 * tt))
    return reverb(y, 3, 0.45, tone=2500)


def grin_stretch(d=0.6, pitch=1.0):
    """wet, rubbery stretch for each 'Wider.'"""
    tt = t_(d)
    f = (180 - 120 * tt / d) * pitch
    sq = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.08 * np.sin(2 * np.pi * 23 * tt))) / SR)
    sq = np.tanh(3 * sq)
    y = bp(sq, 200, 2000) * np.sin(np.pi * tt / d) ** 0.7
    wet = bp(noise(d), 1500, 6000) * (rng.random(len(tt)) < 0.02) * 2
    y += wet * np.sin(np.pi * tt / d)
    return reverb(y, 1.0, 0.25)


def void_drone(d=3.5):
    """for the black-void mouth: everything sucks downward"""
    tt = t_(d)
    y = np.zeros_like(tt)
    for k, f0 in enumerate([220, 233, 330, 349]):
        f = f0 * 2 ** (-2.5 * tt / d)
        y += np.sin(2 * np.pi * np.cumsum(f) / SR)
    y = lp(np.tanh(y), 1500)
    y += lp(brown(d), 200) * 2 * (tt / d)
    y *= np.minimum(tt / 0.15, 1) * np.exp(-np.maximum(tt - d + 0.8, 0) / 0.3)
    return reverb(y, 3, 0.4, tone=3000)


def distant_dog_bark_synth():
    """placeholder only; a real recording is better"""
    out = np.zeros(int(1.2 * SR))
    for dt in (0, 0.35):
        d = 0.22; tt = t_(d); f = 420 + 300 * np.sin(np.pi * tt / d)
        v = np.tanh(4 * np.sin(2 * np.pi * np.cumsum(f) / SR)) + 0.5 * noise(d)
        v = bp(v, 400, 2500) * env_ad(len(tt), 0.01, 0.07)
        i = int(dt * SR); out[i:i + len(v)] += v
    return reverb(lp(out, 1800), 2.0, 0.6, tone=2000)


def stairs_creak():
    c = door_creak(0.7)[:, 0] * 0.6
    st = footstep_grass(0.3)
    out = np.zeros(len(c) + int(0.3 * SR)); out[:len(st)] += st * 0.4; out[int(0.15 * SR):int(0.15 * SR) + len(c)] += lp(c, 2000)
    return reverb(out, 1, 0.25)


def silence_suck(d=1.2):
    """reverse air pull: the 'woods went quiet' moment, ambience is sucked out"""
    y = bp(pink(d), 300, 5000) * np.linspace(1, 0, int(d * SR)) ** 0.5
    y = y[::-1]
    y *= np.exp(-np.maximum(t_(d) - d + 0.05, 0) / 0.01)
    return to_st(fade(y, 0.02, 0.01), 0.5)


# ---------------------------------------------------------------- build
if __name__ == '__main__':
    jobs = [
        ('amb_night_crickets_loop', crickets, 'night ambience: crickets + soft wind (loops)'),
        ('amb_wind_night_loop', wind, 'cold night wind (loops)'),
        ('amb_dread_drone_loop', drone, 'low dissonant drone bed (loops)'),
        ('amb_house_room_tone_loop', room_tone, 'quiet house interior hum (loops)'),
        ('amb_morning_birds', birds_morning, 'light morning birds (sunrise / breakfast)'),
        ('hit_sub_boom', sub_boom, 'deep cinematic sub boom'),
        ('hit_horror_stinger', stinger, 'dissonant horror sting'),
        ('fx_riser_4s', lambda: riser(4.0), 'tension riser, 4 s'),
        ('fx_riser_8s', lambda: riser(8.0), 'tension riser, 8 s (build-up to twist)'),
        ('fx_reverse_swell', reverse_swell, 'reverse swell into a hit (1.6 s)'),
        ('fx_whoosh', whoosh, 'transition whoosh'),
        ('fx_tinnitus_ring', tinnitus, 'high ear-ring after a shock'),
        ('fx_heartbeat_72bpm', heartbeat, 'heartbeat 72 bpm'),
        ('fx_heartbeat_110bpm', lambda: heartbeat(6, 110), 'heartbeat 110 bpm (panic)'),
        ('fx_silence_suck', silence_suck, 'air pulled out before dead silence'),
        ('clock_ticking_loop', clock_ticking, 'clock ticking'),
        ('clock_tick_single', clock_tick, 'single clock tick'),
        ('clock_bell_toll', bell_toll, 'single low bell toll'),
        ('clock_strikes_nine', clock_strike_9, 'nine bell strikes'),
        ('clock_915_hit', clock_hit_915, 'minute-hand clunk + low boom (9:15)'),
        ('door_knock_x3', knocks3, 'three slow heavy knocks'),
        ('door_knock_x3_fast', lambda: knocks3(0.28), 'three quicker knocks (Monday, Millers door)'),
        ('door_knock_single', knock_single, 'single heavy knock'),
        ('door_knock_tiny', tiny_knock, 'tiny small-hand knock-knock'),
        ('door_open_creak', door_open_close, 'latch + door creaks open'),
        ('door_close_thud', lambda: door_open_close(True), 'door shuts'),
        ('door_creak_only', door_creak, 'creak only'),
        ('door_rattle', door_rattle, 'door rattles in its frame'),
        ('lock_deadbolt', deadbolt, 'deadbolt slides + clacks'),
        ('lock_check_twice', lock_check_x2, 'two deadbolt clacks ("Twice.")'),
        ('light_flicker_out', light_off, 'streetlight buzz sputters, dies with a clunk + sub drop'),
        ('light_clunk_out', lights_count_down, 'quick streetlight clunk-out (countdown)'),
        ('caller_footsteps_creep', caller_creep, 'slow heavy steps on grass with pauses'),
        ('caller_breath_groan', caller_presence, 'low breathy presence for the Caller'),
        ('caller_grin_stretch_1', lambda: grin_stretch(0.6, 1.0), 'rubbery stretch (grin 1)'),
        ('caller_grin_stretch_2', lambda: grin_stretch(0.6, 0.8), 'rubbery stretch, lower (grin 2)'),
        ('caller_void_pitchdown', void_drone, 'pitch-dropping void sound'),
        ('house_stairs_creak', stairs_creak, 'step on an old stair'),
        ('placeholder_dog_bark_far', distant_dog_bark_synth, 'PLACEHOLDER distant bark (replace with real)'),
    ]
    for name, fn, desc in jobs:
        save(name, fn(), desc=desc)
