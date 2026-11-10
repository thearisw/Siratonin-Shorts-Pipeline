"""Re-time sfx_cues_v1.json (timed to the v1 voice) onto the current voice, using the same
line-by-line piecewise map as shots.js (lines_timed_v1.json -> lines_timed.json). Writes sfx_cues.json.
Run again after any re-voice:  python retime_cues.py   then   python mix_sfx.py
"""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(H, '..')
old = json.load(open(os.path.join(P, 'lines_timed_v1.json'))); new = json.load(open(os.path.join(P, 'lines_timed.json')))
OLD_END, NEW_END = 150.6, new[-1]['e'] + 0.6
kn = [(0.0, 0.0)] + [p for o, n in zip(old, new) for p in ((o['s'], n['s']), (o['e'], n['e']))] + [(OLD_END, NEW_END)]
def to_new(t):
    for (a0, b0), (a1, b1) in zip(kn, kn[1:]):
        if t <= a1:
            return b1 if a1 - a0 < 1e-6 else b0 + (b1 - b0) * max(0, min(1, (t - a0) / (a1 - a0)))
    return t - OLD_END + NEW_END
c = json.load(open(os.path.join(H, 'sfx_cues_v1.json')))
for grp in ('beds', 'hits', 'needs'):
    for x in c[grp]:
        for k in ('at', 'until'):
            if k in x: x[k] = round(to_new(x[k]), 3)
        x['beat'] = re.sub(r' \([^)]*\d[^)]*\)', '', x['beat'])   # drop v1 sync times from the label
c['_note'] = c['_note'] + ' Re-timed from sfx_cues_v1.json by retime_cues.py.'
c['duration'] = round(NEW_END, 3)
json.dump(c, open(os.path.join(H, 'sfx_cues.json'), 'w'), indent=1)
print('re-timed', sum(len(c[g]) for g in ('beds', 'hits', 'needs')), 'cues; reel ends', round(NEW_END, 2))
