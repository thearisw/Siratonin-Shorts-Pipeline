// Fast render on a PC with a graphics card: node kit/render_gpu.js <video> [options]
//   --from 0 --to 12      time range (default: whole video)
//   --fps 30              frame rate
//   --workers 3           parallel browsers (default 3; best on the RTX 4050 laptop: 23 fps)
//   --encoder auto        auto | nvenc | amf | qsv | x264   (auto picks the first one that works: NVIDIA, AMD, Intel, then CPU x264)
//   --headed              show the browser windows (used automatically if headless Chrome has no GPU)
//   --software            force the SwiftShader CPU renderer (what the cloud uses)
//   --audio file.mp3      narration to mux in (default: videos/<video>/voice_final.mp3 if present)
//   --out out.mp4         output name inside the video folder (default out.mp4)
//   --music name.mp3      background track from threejs/music/ (default: the TEMPOREX instrumental, or videos/<video>/music.json); --music none for none
//   --music-volume 0.2    background music level under the voice (see kit/music.js)
//   --format crush        the video's theme, for its default music (normally "format" in videos/<video>/music.json)
// Differences from render.js: it checks that WebGL really runs on the GPU (and says which one), and it streams frames
// straight into ffmpeg in order (no frame files on disk), encoding with the graphics card's video encoder when there is one.
// Frames still render at exact times, so the video is identical to render.js output apart from the encoder.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');
const { pickMusic, audioArgs } = require('./music');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const video = args[0];
if (!video || video.startsWith('--')) { console.log('usage: node kit/render_gpu.js <video> [--from a --to b] [--workers n] [--encoder auto|nvenc|amf|qsv|x264] [--headed]'); process.exit(1); }
const opt = k => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : undefined; };
const flag = k => args.includes('--' + k);
const VDIR = path.join(ROOT, 'videos', video);
const FFMPEG = opt('ffmpeg') || 'ffmpeg';
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.csv': 'text/plain', '.mp3': 'audio/mpeg' };

const server = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
});

// ---------- browser ----------
function browserArgs(software) {
  if (software) return ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const angle = process.platform === 'win32' ? 'd3d11' : process.platform === 'darwin' ? 'metal' : 'gl';
  return [`--use-angle=${angle}`, '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-gpu-vsync',
    '--disable-frame-rate-limit', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--force-high-performance-gpu'];
}
async function gpuName(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas'); const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    if (!gl) return 'no WebGL';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
}
const isSoftware = name => /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(name);

async function openPage(port, mode, w) {
  const browser = await chromium.launch({
    headless: !mode.headed, args: [...browserArgs(mode.software), ...(mode.headed ? [`--window-position=${40 + w * 60},${40 + w * 60}`, '--window-size=320,600'] : [])],
  });
  const page = await browser.newPage({ viewport: { width: 270, height: 480 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('page:', m.text()); });
  page.on('pageerror', e => console.log('page error:', e.message));
  await page.goto(`http://localhost:${port}/index.html?video=${encodeURIComponent(video)}`);
  await page.waitForFunction('window.READY || window.FAILED', null, { timeout: 180000 });
  const failed = await page.evaluate('window.FAILED');
  if (failed) throw new Error(failed);
  return { browser, page, gpu: await gpuName(page) };
}

// ---------- encoder ----------
const ENCODERS = {
  nvenc: ['-c:v', 'h264_nvenc', '-preset', 'p5', '-tune', 'hq', '-rc', 'vbr', '-cq', '19', '-b:v', '0', '-maxrate', '40M', '-bufsize', '80M'],
  amf: ['-c:v', 'h264_amf', '-quality', 'quality', '-rc', 'cqp', '-qp_i', '18', '-qp_p', '20'],
  qsv: ['-c:v', 'h264_qsv', '-preset', 'slow', '-global_quality', '20'],
  x264: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18'],
};
function encoderWorks(name) {
  const r = spawnSync(FFMPEG, ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=1080x1920:d=0.2', ...ENCODERS[name], '-pix_fmt', 'yuv420p', '-f', 'null', '-'], { encoding: 'utf8' });
  return r.status === 0;
}
function pickEncoder() {
  const want = opt('encoder') || 'auto';
  if (spawnSync(FFMPEG, ['-version']).status !== 0) throw new Error(`ffmpeg not found (${FFMPEG}). Install it or pass --ffmpeg C:\\path\\to\\ffmpeg.exe`);
  if (want !== 'auto') { if (!ENCODERS[want]) throw new Error('unknown encoder ' + want); return want; }
  for (const e of ['nvenc', 'amf', 'qsv']) if (encoderWorks(e)) return e;
  return 'x264';
}

(async () => {
  await new Promise(res => server.listen(0, res));
  const port = server.address().port;
  const fps = parseFloat(opt('fps') || '30');
  const workers = Math.max(1, parseInt(opt('workers') || '3'));
  const encoder = pickEncoder();
  const mode = { headed: flag('headed'), software: flag('software') };
  const pages = [];
  try {
    // first browser: check the GPU really is in use; headless Chrome sometimes falls back to SwiftShader, a headed window does not
    let first = await openPage(port, mode, 0);
    if (!mode.software && isSoftware(first.gpu) && !mode.headed) {
      console.log(`headless Chrome fell back to the CPU (${first.gpu}); retrying with visible windows`);
      await first.browser.close(); mode.headed = true; first = await openPage(port, mode, 0);
    }
    console.log(`WebGL renderer: ${first.gpu}${isSoftware(first.gpu) ? '   <-- CPU software rendering, this will be slow' : ''}`);
    console.log(`video encoder: ${encoder}`);
    pages.push(first);
    for (let w = 1; w < workers; w++) pages.push(await openPage(port, mode, w));

    const duration = await first.page.evaluate('window.DURATION');
    const from = parseFloat(opt('from') || '0'), to = parseFloat(opt('to') || String(duration));
    const n = Math.round((to - from) * fps);
    const audio = opt('audio') || (fs.existsSync(path.join(VDIR, 'voice_final.mp3')) ? path.join(VDIR, 'voice_final.mp3') : null);
    const outFile = path.join(VDIR, opt('out') || 'out.mp4');
    const tmpFile = outFile.replace(/\.mp4$/, '') + '.partial.mp4';
    console.log(`${video}: ${n} frames (${from}-${to}s) with ${workers} workers -> ${outFile}`);

    const ff = ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-'];
    const music = pickMusic(ROOT, VDIR, opt);
    console.log(`music: ${music ? path.basename(music.file) + ' at volume ' + music.volume : 'none'}`);
    const aud = audioArgs({ voice: audio, music, from, to, ffprobe: FFMPEG.replace(/ffmpeg(\.exe)?$/i, m => m.replace(/ffmpeg/i, 'ffprobe')) });
    ff.push(...aud.inputs);
    ff.push(...ENCODERS[encoder], '-pix_fmt', 'yuv420p', '-r', String(fps));
    ff.push(...aud.output);
    ff.push('-movflags', '+faststart', tmpFile);
    const proc = spawn(FFMPEG, ff, { stdio: ['pipe', 'inherit', 'inherit'] });
    const ffDone = new Promise((res, rej) => proc.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exited with ' + c))));

    // frames come back out of order; hold them until it is their turn, then write in order
    const pending = new Map(); let next = 0, done = 0; const t0 = Date.now();
    const write = buf => new Promise(res => proc.stdin.write(buf) ? res() : proc.stdin.once('drain', res));
    let flushing = Promise.resolve();
    const flush = () => (flushing = flushing.then(async () => {
      while (pending.has(next)) { const b = pending.get(next); pending.delete(next); await write(b); next++; }
    }));
    await Promise.all(pages.map(async ({ page }, w) => {
      for (let i = w; i < n; i += workers) {
        while (i - next > workers * 6) await flushing.then(() => new Promise(r => setTimeout(r, 5)));   // don't run far ahead
        const r = await page.evaluate(t => renderAt(t), from + i / fps);
        pending.set(i, Buffer.from(r.data.slice(r.data.indexOf(',') + 1), 'base64'));
        flush();
        if (++done % 60 === 0 || done === n) {
          const s = (Date.now() - t0) / 1000, rate = done / s;
          console.log(`${done}/${n}  ${s.toFixed(0)}s  ${rate.toFixed(1)} fps  ~${((n - done) / rate / 60).toFixed(1)} min left  (${r.name})`);
        }
      }
    }));
    await flush();
    proc.stdin.end();
    await ffDone;
    fs.renameSync(tmpFile, outFile);
    const s = (Date.now() - t0) / 1000;
    console.log(`wrote ${outFile}: ${n} frames in ${s.toFixed(0)}s (${(n / s).toFixed(1)} fps, ${(s / n * 1000).toFixed(0)} ms a frame)`);
  } finally {
    for (const p of pages) await p.browser.close().catch(() => {});
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
