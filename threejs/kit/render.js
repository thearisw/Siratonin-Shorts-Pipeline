// Render a video: node kit/render.js <video> [options]
//   --test 1.2,5.5,9      render single frames to videos/<video>/test/ (quick framing checks)
//   --from 0 --to 12      time range (default: whole video)
//   --fps 30              frame rate
//   --workers 4           parallel headless browsers (each renders every Nth frame)
//   --audio file.mp3      narration to mux in (default: videos/<video>/voice_final.mp3 if present)
//   --out out.mp4         output name inside the video folder (default out.mp4)
//   --music name.mp3      background track from threejs/music/ (default: the TEMPOREX instrumental, or videos/<video>/music.json); --music none for none
//   --music-volume 0.2    background music level under the voice (see kit/music.js)
//   --format crush        the video's theme, for its default music (normally "format" in videos/<video>/music.json)
//   --software            force the SwiftShader software renderer (default on Linux)
// Frames render at exact times, so the result is identical however slow the machine is.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { pickMusic, audioArgs } = require('./music');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const video = args[0];
if (!video || video.startsWith('--')) { console.log('usage: node kit/render.js <video> [--test t1,t2] [--from a --to b] [--workers n]'); process.exit(1); }
const opt = k => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : undefined; };
const VDIR = path.join(ROOT, 'videos', video);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.csv': 'text/plain', '.mp3': 'audio/mpeg' };

const server = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
});

async function openPage(port) {
  // Linux servers have no GPU: use SwiftShader there. On a desktop (Windows/macOS) let Chromium use the real GPU.
  const gpuArgs = process.platform === 'linux' || args.includes('--software') ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--enable-gpu', '--use-angle=default'];
  const browser = await chromium.launch({ args: [...gpuArgs, '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('page:', m.text()); });
  page.on('pageerror', e => console.log('page error:', e.message));
  await page.goto(`http://localhost:${port}/index.html?video=${encodeURIComponent(video)}`);
  await page.waitForFunction('window.READY || window.FAILED', null, { timeout: 120000 });
  const failed = await page.evaluate('window.FAILED');
  if (failed) throw new Error(failed);
  return { browser, page };
}

(async () => {
  await new Promise(res => server.listen(0, res));
  const port = server.address().port;
  const fps = parseFloat(opt('fps') || '30');
  const test = opt('test');
  try {
    if (test) {
      const { browser, page } = await openPage(port);
      const dir = path.join(VDIR, 'test'); fs.mkdirSync(dir, { recursive: true });
      for (const t of test.split(',').map(Number)) {
        const r = await page.evaluate(t => renderAt(t), t);
        fs.writeFileSync(path.join(dir, `t_${t.toFixed(2)}.jpg`), Buffer.from(r.data.split(',')[1], 'base64'));
        console.log(t.toFixed(2), r.name);
      }
      await browser.close();
      return;
    }
    const workers = parseInt(opt('workers') || String(Math.max(1, Math.min(4, os.cpus().length - 1))));
    const first = await openPage(port);
    const duration = await first.page.evaluate('window.DURATION');
    const from = parseFloat(opt('from') || '0'), to = parseFloat(opt('to') || String(duration));
    const n = Math.round((to - from) * fps);
    const frames = fs.mkdtempSync(path.join(os.tmpdir(), `frames-${video}-`));
    console.log(`${video}: ${n} frames (${from}-${to}s) with ${workers} workers -> ${frames}`);
    const pages = [first];
    for (let w = 1; w < workers; w++) pages.push(await openPage(port));
    const t0 = Date.now(); let done = 0;
    await Promise.all(pages.map(async ({ page }, w) => {
      for (let i = w; i < n; i += workers) {
        const r = await page.evaluate(t => renderAt(t), from + i / fps);
        fs.writeFileSync(path.join(frames, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(r.data.split(',')[1], 'base64'));
        if (++done % 30 === 0) console.log(`${done}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s  (${r.name})`);
      }
    }));
    for (const p of pages) await p.browser.close();
    const audio = opt('audio') || (fs.existsSync(path.join(VDIR, 'voice_final.mp3')) ? path.join(VDIR, 'voice_final.mp3') : null);
    const outFile = path.join(VDIR, opt('out') || 'out.mp4');
    const ff = ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(frames, 'f%05d.jpg')];
    const music = pickMusic(ROOT, VDIR, opt);
    console.log(`music: ${music ? path.basename(music.file) + ' at volume ' + music.volume : 'none'}`);
    const aud = audioArgs({ voice: audio, music, from, to });
    ff.push(...aud.inputs);
    ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p');
    ff.push(...aud.output);
    ff.push('-movflags', '+faststart', outFile);
    execFileSync('ffmpeg', ff, { stdio: 'inherit' });
    fs.rmSync(frames, { recursive: true, force: true });
    console.log(`wrote ${outFile} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } finally { server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
