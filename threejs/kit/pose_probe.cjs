// Pose-only jitter probe, draws nothing (no render): node kit/pose_probe.cjs <video> <from> <to>
// Steps 30 fps, prints per frame the 2nd difference ("jerk") of every visible character part. Smooth motion ~0.00x; jitter shows as spikes.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = (() => { try { return require('playwright'); } catch { return require(require.resolve('playwright', { paths: ['/opt/node22/lib/node_modules'] })); } })();
const ROOT = process.cwd(), video = process.argv[2], from = +process.argv[3], to = +process.argv[4];
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.mjs': 'text/javascript' };
const server = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(res => server.listen(0, res));
  const exe = process.env.CHROME_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch({ executablePath: exe, args: process.platform === 'linux' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [] });
  const page = await browser.newPage({ viewport: { width: 270, height: 480 } });
  page.on('pageerror', e => console.log('page error:', e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html?video=${video}`);
  await page.waitForFunction('window.READY || window.FAILED', null, { timeout: 180000 });
  const out = await page.evaluate(async ([a, b]) => {
    const { ALL_CHARS } = await import('/kit/chars.js'); const { camera } = await import('/kit/core.js');
    const rows = []; let prev = null;
    for (let f = Math.round(a * 30); f <= Math.round(b * 30); f++) {
      const t = f / 30, name = window.poseAt(t); camera.updateMatrixWorld(true);
      const cur = ALL_CHARS.map(c => { c.root.updateMatrixWorld(true); if (c.root.position.y < -100) return null; const v = []; c.root.traverse(o => { const e = o.matrixWorld.elements; v.push(e[12], e[13], e[14], e[0], e[5], e[10]); }); return v; });
      const cam = camera.position.toArray();
      if (prev) { const d = cur.map((x, i) => x && prev.c[i] ? Math.max(...x.map((v, j) => Math.abs(v - prev.c[i][j]))).toFixed(3) : '-');
        const j2 = cur.map((x, i) => x && prev.c[i] && prev.p && prev.p[i] ? Math.max(...x.map((v, j) => Math.abs(v - 2 * prev.c[i][j] + prev.p[i][j]))).toFixed(3) : '-');
        rows.push(`${t.toFixed(3)} ${name} jerk ${j2.join(' ')} cam ${Math.max(...cam.map((v, j) => Math.abs(v - prev.cam[j]))).toFixed(3)} chars ${d.join(' ')}`); }
      prev = { c: cur, cam, p: prev && prev.c };
    }
    return rows.join('\n');
  }, [from, to]);
  console.log(out); await browser.close(); server.close();
})();
