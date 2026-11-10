// Background music for render.js and render_gpu.js.
// By default every video gets the default track from threejs/music/, looped, mixed under the voice, ducked a little while
// someone talks, and faded out over the last 1.5 s. A video picks something else in videos/<video>/music.json:
//   { "track": "Other song.mp3" }        another file in threejs/music/
//   { "track": "none" }                  no music
//   { "volume": 0.15, "start": 12.5 }    optional: music level (0..1, default 0.6) and where in the track to start (seconds)
//   { "format": "crush" }                the video's theme: picks that theme's default track and level (FORMAT_MUSIC below)
// Order: --music / --music-volume on the command line, then music.json "track"/"volume", then the format default, then DEFAULT_TRACK.
// --format crush on the command line also sets the format.
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_TRACK = 'TEMPOREX - Numbers Instrumental _ Perfect intro loop.mp3';
const DEFAULT_VOLUME = 0.6;   // about 6 dB under the voice (Aris, 2026-11-09: 0.2 and 0.45 too quiet); the voice stays at full level
const FADE_OUT = 1.5;
// Default music per theme (formats/<theme>_format.md). A theme not listed here uses DEFAULT_TRACK at DEFAULT_VOLUME.
// Caretaker is ~6 dB louder than TEMPOREX (-10.5 vs -16.2 LUFS), so 0.3 sits at the same level under the voice as TEMPOREX at 0.6.
const FORMAT_MUSIC = {
  crush: { track: 'Caretaker - A4 - Childishly fresh eyes.mp3', volume: 0.3 },   // Aris, 2026-11-09
};

function pickMusic(ROOT, VDIR, opt) {
  let cfg = {};
  const cfgFile = path.join(VDIR, 'music.json');
  if (fs.existsSync(cfgFile)) cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
  const format = String(opt('format') || cfg.format || '').toLowerCase();
  const fmt = FORMAT_MUSIC[format] || {};
  const track = opt('music') || cfg.track || fmt.track || DEFAULT_TRACK;
  if (String(track).toLowerCase() === 'none') return null;
  const file = path.isAbsolute(track) ? track : path.join(ROOT, 'music', track);
  if (!fs.existsSync(file)) throw new Error(`music track not found: ${file} (put it in threejs/music/ or use --music none)`);
  // a format's level only goes with its own track; a music.json/--music track at no stated volume gets the house 0.6
  const fmtVol = track === fmt.track ? fmt.volume : undefined;
  const volume = parseFloat(opt('music-volume') ?? cfg.volume ?? fmtVol ?? DEFAULT_VOLUME);
  return { file, volume, start: parseFloat(cfg.start || 0) };
}

// Audio for an ffmpeg command whose input 0 is the video. Push `inputs` right after the video input (before any output
// options) and `output` just before the output file.
function audioArgs({ voice, music, from, to, ffprobe = 'ffprobe' }) {
  const len = to - from, inputs = [], ff = [];
  if (!voice && !music) return { inputs, output: ff };
  let idx = 1, v = -1, m = -1;
  if (voice) { inputs.push('-ss', String(from), '-t', String(len), '-i', voice); v = idx++; }
  if (music) { inputs.push('-stream_loop', '-1', '-ss', String(music.start + from), '-t', String(len), '-i', music.file); m = idx++; }
  if (!music) { ff.push('-map', '0:v', '-map', `${v}:a`); }
  else {
    const fade = len > FADE_OUT * 2 ? `,afade=t=out:st=${(len - FADE_OUT).toFixed(3)}:d=${FADE_OUT}` : '';
    const bed = `[${m}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${music.volume}${fade}`;
    let graph;
    if (voice) {
      // a mono voice goes to both sides at full level (ffmpeg's own mono->stereo upmix drops it 3 dB)
      const up = channels(voice, ffprobe) === 1 ? 'aresample=48000,pan=stereo|c0=c0|c1=c0' : 'aformat=sample_rates=48000:channel_layouts=stereo';
      graph = `[${v}:a]${up},asplit=2[vo][key];` +
        `${bed}[bed];[bed][key]sidechaincompress=threshold=0.05:ratio=2:attack=20:release=400[duck];` +
        `[vo][duck]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95:level=disabled[a]`;
    } else graph = `${bed}[a]`;
    ff.push('-filter_complex', graph, '-map', '0:v', '-map', '[a]');
  }
  ff.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  return { inputs, output: ff };
}

function channels(file, ffprobe) {
  const r = spawnSync(ffprobe, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseInt((r.stdout || '').trim()) || 2;
}

module.exports = { pickMusic, audioArgs, DEFAULT_TRACK, FORMAT_MUSIC };
