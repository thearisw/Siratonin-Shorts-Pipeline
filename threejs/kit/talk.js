// Talking mouths (Aris, 2026-11-09): a character's mouth flaps while their quoted lines play.
// Opt in per character: c.speaker = 'RUIZ' (the speaker name used in captions.json / word_timings.csv). The director then opens
// and closes that character's mouth on the word times every frame, on top of whatever face the shot set (faces.js '#1'/'#2' variants).
// The narrator's voice-over never moves a mouth unless you give the hero c.speaker = 'N' on purpose.
// Lines heard in someone's head (telepathy, a thought) should not move the mouth: c.silentLines = [27] (line numbers) skips them.
// A shot can also force it: c.talk(0|1|2), or c.mute = true for the shot (the director resets it each frame).

/** Mouth level at time t from a word list [{s, e}]: about 6 flaps a second inside a word, closed between words. */
export function mouthLevel(t, words) {
  for (const w of words) {
    if (t < w.s) break;
    if (t >= w.e) continue;
    const d = Math.max(0.08, w.e - w.s), n = Math.max(1, Math.round(d / 0.16)), p = (t - w.s) / d;
    const v = Math.abs(Math.sin(Math.PI * n * p));
    return v < 0.3 ? 0 : v < 0.75 ? 1 : 2;
  }
  return 0;
}

/** Group the caption words by speaker: {RUIZ: [{s, e, line}], ...}. Words without a speaker are ignored. */
export function speechBySpeaker(words) {
  const by = {};
  for (const w of words || []) if (w.speaker) (by[w.speaker] ||= []).push({ s: w.s, e: w.e, line: w.line });
  for (const k in by) {   // stretch each word over short gaps (TTS words can be 0.05 s long), so the mouth reads as talking, not flickering
    const l = by[k].sort((a, b) => a.s - b.s);
    l.forEach((w, i) => { const n = l[i + 1]; w.e = n && n.s - w.e < 0.15 ? n.s : w.e + 0.06; });
  }
  return by;
}

/** Called by the director after each shot: flap the mouth of every character that has a speaker. */
export function applyTalk(chars, t, by) {
  for (const c of chars) {
    if (!c.speaker || !c.talk) continue;
    if (c.mute) { c.mute = false; continue; }
    const list = by[c.speaker]; if (!list) continue;
    const ws = c.silentLines ? list.filter(w => !c.silentLines.includes(w.line)) : list;
    c.talk(mouthLevel(t, ws));
  }
}
