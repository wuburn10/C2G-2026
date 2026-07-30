#!/usr/bin/env node
/**
 * Renders assets/og/og-image.html into assets/img/og-preview.png — the 1200×630
 * link-preview image that WhatsApp, Telegram, Facebook, iMessage and X show when
 * booklet.c2g.upcmalaysia.com is shared.
 *
 *   node assets/og/render.mjs
 *
 * No npm packages needed — it drives a headless Chrome/Chromium that is already
 * on the machine over the DevTools protocol (Node 22+, for global fetch and
 * WebSocket). Set CHROME_PATH if it can't find a browser:
 *
 *   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node assets/og/render.mjs
 *
 * Two things this deliberately does not leave to chance:
 *   · Chrome's `--screenshot` flag captures the headless window, whose viewport
 *     is shorter than the window on some builds, silently cropping the artwork.
 *     Emulation.setDeviceMetricsOverride pins the frame to exactly 1200×630.
 *   · The web fonts are downloaded and inlined as data URIs first, so a blocked
 *     request to fonts.googleapis.com can't quietly swap Playfair Display for a
 *     system serif mid-render.
 */

import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SOURCE = join(HERE, 'og-image.html');
const OUT = join(ROOT, 'assets/img/og-preview.png');

const WIDTH = 1200;
const HEIGHT = 630;
// WhatsApp quietly drops previews for oversized images; keep well under its limit.
const SIZE_BUDGET = 300 * 1024;

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,900&family=Inter:wght@400;500;600;700&display=swap';
// woff2 needs a modern UA, otherwise Google serves ttf.
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  for (const path of candidates) if (existsSync(path)) return path;

  // Any Chromium that Playwright has cached locally.
  for (const dir of [process.env.PLAYWRIGHT_BROWSERS_PATH, join(process.env.HOME ?? '', '.cache/ms-playwright')]) {
    if (!dir || !existsSync(dir)) continue;
    try {
      const found = execFileSync('find', [dir, '-maxdepth', '4', '-name', 'chrome', '-type', 'f'], {
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean)[0];
      if (found) return found;
    } catch {
      /* find missing, or nothing matched */
    }
  }
  throw new Error('No Chrome/Chromium found. Install Chrome or set CHROME_PATH.');
}

/** Fetches the Google Fonts CSS and rewrites every woff2 URL to a data URI. */
async function inlinedFontCss() {
  const res = await fetch(FONT_CSS_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Google Fonts CSS returned ${res.status}`);
  const css = await res.text();

  const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
  const inlined = new Map(
    await Promise.all(
      urls.map(async (url) => {
        const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
        return [url, `data:font/woff2;base64,${buf.toString('base64')}`];
      })
    )
  );

  console.log(`  fonts:  inlined ${inlined.size} woff2 file(s)`);
  return css.replace(/https:\/\/[^)]+\.woff2/g, (url) => inlined.get(url) ?? url);
}

/**
 * Stages the page in a temp dir — next to copies of the logos, so the relative
 * ../img/*.png paths still resolve — with the font <link> swapped for inline CSS.
 */
function stagePage(fontCss) {
  const stage = mkdtempSync(join(tmpdir(), 'c2g-og-'));
  mkdirSync(join(stage, 'img'));
  mkdirSync(join(stage, 'og'));
  for (const logo of ['C2G.png', 'UPCWM.png']) {
    copyFileSync(join(ROOT, 'assets/img', logo), join(stage, 'img', logo));
  }

  const source = readFileSync(SOURCE, 'utf8');
  const html = source.replace(/<link rel="preconnect"[\s\S]*?rel="stylesheet" \/>/, `<style>\n${fontCss}\n</style>`);
  if (html === source) throw new Error('Could not find the font <link> block in og-image.html.');

  const staged = join(stage, 'og', 'og-image.html');
  writeFileSync(staged, html);
  return staged;
}

/** Minimal DevTools protocol client over the page target's WebSocket. */
async function connect(port) {
  let target;
  for (let attempt = 0; attempt < 60 && !target; attempt++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch {
      /* browser still starting */
    }
    if (!target) await sleep(250);
  }
  if (!target) throw new Error('Chrome never exposed a DevTools page target.');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, fail) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', () => fail(new Error('DevTools WebSocket failed')), { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const events = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? fail(new Error(`${msg.error.message} (${msg.method ?? 'cdp'})`)) : ok(msg.result);
    } else if (msg.method && events.has(msg.method)) {
      events.get(msg.method).forEach((fn) => fn(msg.params));
      events.delete(msg.method);
    }
  });

  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((ok, fail) => {
        pending.set(id, { ok, fail });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    once(method) {
      return new Promise((ok) => {
        if (!events.has(method)) events.set(method, []);
        events.get(method).push(ok);
      });
    },
    close: () => ws.close(),
  };
}

const chrome = findChrome();
console.log(`  chrome: ${chrome}`);

const staged = stagePage(await inlinedFontCss());
const port = 9800 + Math.floor(Math.random() * 200);

const browser = spawn(
  chrome,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-extensions',
    '--no-first-run',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'c2g-profile-'))}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
);

try {
  const cdp = await connect(port);

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Page.enable');

  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: `file://${staged}` });
  await loaded;

  // Fonts, logos and the gradient-clipped title all need to be laid out before
  // the frame is grabbed.
  await cdp.send('Runtime.evaluate', {
    expression: 'document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))) ',
    awaitPromise: true,
  });

  // The metrics override already makes the page exactly one viewport tall, so no
  // captureBeyondViewport — pairing it with a clip tiles the surface.
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
  });
  writeFileSync(OUT, Buffer.from(data, 'base64'));
  cdp.close();
} finally {
  browser.kill();
}

const bytes = statSync(OUT).size;
console.log(`  wrote:  ${OUT.replace(`${ROOT}/`, '')} (${WIDTH}×${HEIGHT}, ${(bytes / 1024).toFixed(0)} KB)`);
if (bytes > SIZE_BUDGET) {
  console.warn(`  WARNING: over the ${SIZE_BUDGET / 1024} KB budget — WhatsApp may skip the preview.`);
}
