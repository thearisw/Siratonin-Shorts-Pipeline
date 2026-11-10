// Captions: one word at a time at ~67% down the frame, bold white with a black outline, key words in colour (house style §8).
import { W, H } from './core.js';

/** Parse word timings: captions.json ([{w, s, e}]) or word_timings.csv ("time,word" per line, no end times). */
export function parseWords(text) {
  text = text.trim();
  if (text.startsWith('[')) return JSON.parse(text);
  const rows = text.split(/\r?\n/).map(l => { const i = l.indexOf(','); return { s: parseFloat(l.slice(0, i)), w: l.slice(i + 1).trim() }; }).filter(r => !isNaN(r.s) && r.w);
  rows.forEach((r, i) => { r.e = rows[i + 1] ? Math.min(rows[i + 1].s, r.s + 0.6) : r.s + 0.6; });
  return rows;
}

export const DEFAULT_COLORS = { yellow: '#ffd23f', red: '#ff5a5a', blue: '#7fb2ff', green: '#7ddc7d', pink: '#ff7ab8' };

/**
 * Draw the caption for time t on a 2D context. highlights maps a lower-case word (letters/digits only) to a colour.
 * Numbers show as numerals; pass the words already in caption spelling.
 */
export function drawCaption(ctx, words, t, highlights = {}, o = {}) {
  let cur = null;
  for (let i = 0; i < words.length; i++) {
    const w = words[i], next = words[i + 1];
    const end = next ? Math.min(next.s, w.e + 0.45) : w.e + 0.5;
    if (t >= w.s && t < end) cur = w;
  }
  if (!cur) return;
  const txt = cur.w.replace(/[",.!?;:]+$/g, '').replace(/^["']+/, '').toUpperCase();
  const key = cur.w.toLowerCase().replace(/[^a-z0-9]/g, '');
  const pop = 1 + 0.18 * Math.max(0, 1 - (t - cur.s) / 0.09);
  let size = o.size || 112;
  ctx.save();
  ctx.font = `900 ${size}px "Inter", "Inter Display", "Arial Black", sans-serif`;
  const maxW = W * 0.86, mw = ctx.measureText(txt).width;
  if (mw > maxW) { size = Math.floor(size * maxW / mw); ctx.font = `900 ${size}px "Inter", "Inter Display", "Arial Black", sans-serif`; }
  ctx.translate(W / 2, H * (o.y || 0.67)); ctx.scale(pop, pop);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.2; ctx.strokeStyle = '#000';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
  ctx.strokeText(txt, 0, 0); ctx.shadowColor = 'transparent';
  ctx.fillStyle = highlights[key] || '#ffffff'; ctx.fillText(txt, 0, 0);
  ctx.restore();
}

export function vignette(ctx, strength = 0.45) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/** Full-frame fade (to black by default), for cuts to black or a flash (colour '#fff'). */
export function fade(ctx, k, color = '#000') { if (k <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, k); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
