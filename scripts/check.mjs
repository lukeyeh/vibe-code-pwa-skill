// Checks that a PWA installs its service worker and still loads offline.
//
// Usage: node check.mjs DIR
//
// Serves DIR on a local port, opens it in headless Chrome, waits for the
// service worker to take control, then stops the server and reloads. Prints
// what was cached and whether the offline reload rendered, and exits non-zero
// if it did not. Needs only Node 22+, python3 and Chrome (set CHROME to use a
// different binary). Uses its own ports and a throwaway browser profile, so it
// does not disturb a dev server or your own Chrome.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node check.mjs DIR');
  process.exit(2);
}

const PORT = 8799;
const DEBUG_PORT = 9339;
const URL_ROOT = `http://127.0.0.1:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'pwa-check-'));
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: resolve(dir),
  stdio: 'ignore',
});
const chrome = spawn(
  process.env.CHROME ?? 'google-chrome',
  ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank'],
  { stdio: 'ignore' },
);

async function debuggerUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

let ok = false;
let ws;
try {
  ws = new WebSocket(await debuggerUrl());
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  let nextId = 0;
  const replies = new Map();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    replies.get(msg.id)?.(msg.result);
    replies.delete(msg.id);
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      replies.set(++nextId, r);
      ws.send(JSON.stringify({ id: nextId, method, params }));
    });
  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))?.result?.value;
  const waitFor = async (expression) => {
    for (let i = 0; i < 50; i++) {
      const value = await evaluate(expression).catch(() => undefined);
      if (value) return value;
      await sleep(200);
    }
    return undefined;
  };

  await send('Page.navigate', { url: URL_ROOT });
  const controlled = await waitFor('!!navigator.serviceWorker?.controller');
  const cached = await evaluate(`(async () => {
    const paths = [];
    for (const name of await caches.keys()) {
      for (const req of await (await caches.open(name)).keys()) paths.push(new URL(req.url).pathname);
    }
    return paths.sort();
  })()`);
  console.log('service worker in control:', !!controlled);
  console.log('cached:', (cached ?? []).join(' ') || '(nothing)');

  server.kill();
  await sleep(500);

  await send('Page.navigate', { url: URL_ROOT });
  // A page that failed to load has no stylesheet rules and no body content.
  const rendered = await waitFor(`location.href === ${JSON.stringify(URL_ROOT)}
    && document.readyState === 'complete'
    && [...document.styleSheets].some((s) => s.cssRules.length > 0)
    && document.body.innerText.trim().length > 0`);
  console.log('loads with the server stopped:', !!rendered);

  ok = !!controlled && !!rendered;
} finally {
  ws?.close();
  chrome.kill();
  server.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}

process.exit(ok ? 0 : 1);
