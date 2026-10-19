// Frame-accurate render of index.html to MP4.
//   node render.mjs stills 3.5 20 47        -> out/still-<t>.png
//   node render.mjs video [fps] [workers]   -> out/Elasticito_Vendor_Monitoring_ConceptC_1080x1080.mp4
// Uses the Playwright + Chromium preinstalled at /opt/pw-browsers.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(execFileSync('npm', ['root', '-g']).toString().trim() + '/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
mkdirSync(out, { recursive: true });
const url = pathToFileURL(path.join(here, 'index.html')).href + '?render';
const AUDIO = path.join(here, 'assets', 'vo-music.m4a');
const NAME = 'Elasticito_Vendor_Monitoring_ConceptC_1080x1080';

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.READY === true);
  const ok = await page.evaluate(() => ['700 50px Montserrat', '800 66px Montserrat', 'italic 800 66px Montserrat', '400 17px "Source Sans 3"', '500 14px "IBM Plex Mono"'].map(f => document.fonts.check(f)));
  if (ok.includes(false)) throw new Error('fonts not loaded: ' + ok);
  page.errors = errors;
  return page;
}
const shot = (page) => page.locator('#stage').screenshot({ type: 'png', animations: 'disabled' });

const [mode = 'stills', ...rest] = process.argv.slice(2);
const browser = await pw.chromium.launch();

if (mode === 'stills') {
  const page = await openPage(browser);
  for (const t of rest.map(Number)) {
    await page.evaluate(t => window.renderAt(t), t);
    writeFileSync(path.join(out, `still-${t.toFixed(2)}.png`), await shot(page));
  }
  if (page.errors.length) console.error('PAGE ERRORS:\n' + page.errors.join('\n'));
  console.log('stills done');
} else {
  const fps = Number(rest[0] || 60), workers = Number(rest[1] || 4);
  const dur = 85.5, total = Math.round(dur * fps);
  const per = Math.ceil(total / workers);
  const t0 = Date.now();
  const parts = [];
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = w * per, b = Math.min(total, a + per);
    if (a >= b) return;
    const file = path.join(out, `part${w}.mp4`);
    parts[w] = file;
    const page = await openPage(browser);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(fps), file], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) {
      await page.evaluate(t => window.renderAt(t), f / fps);
      const buf = await shot(page);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (w === 0 && f % 300 === 0) console.log(`worker0 ${f - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
    if (page.errors.length) console.error(`worker${w} PAGE ERRORS:\n` + page.errors.join('\n'));
  }));
  const list = path.join(out, 'parts.txt');
  writeFileSync(list, parts.filter(Boolean).map(p => `file '${p}'`).join('\n'));
  const silent = path.join(out, 'silent.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
  const final = path.join(out, `${NAME}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy',
    '-t', String(dur), '-movflags', '+faststart', final]);
  for (const p of [...parts.filter(Boolean), list, silent]) if (existsSync(p)) rmSync(p);
  console.log(`video done: ${final} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
