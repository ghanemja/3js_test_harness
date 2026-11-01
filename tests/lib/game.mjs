// Shared driver for the browser suites: boots the real game (index.html) in headless
// Chromium, collects every error, and gives the tests a small vocabulary for driving it —
// teleport next to things, press keys, step frames, read the game state, take screenshots.
//
// Headless Chromium renders with SwiftShader (software GL): a frame of the full scene takes
// seconds. So between screenshots the suites switch drawing off (`fast()`): the game's own
// loop keeps running — logic, AI, timers, the story — only `renderer.render` is a no-op.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { serve } from '../serve.mjs';

export const OUT = new URL('../output/', import.meta.url).pathname;     // screenshots + reports (gitignored)
mkdirSync(OUT, { recursive: true });

function loadPlaywright() {
  const roots = [process.cwd() + '/', '/opt/node-tools/node_modules/'];
  try { roots.push(execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() + '/'); } catch { /* no npm */ }
  for (const r of roots) { try { return createRequire(r)('playwright'); } catch { /* next */ } }
  throw new Error('playwright not found — `npm i -g playwright && npx playwright install chromium`');
}

// console noise that isn't ours: driver perf chatter from software GL, autoplay rules
const BENIGN = [/GL Driver Message/i, /GPU stall/i, /AudioContext was not allowed/i, /WebGL.*performance/i, /Automatic fallback to software WebGL/i];

export async function bootGame({ query = '', width = 960, height = 540, timeout = 240_000 } = {}) {
  const server = await serve();
  const { chromium } = loadPlaywright();
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;     // sandboxes: three.js comes off unpkg via the proxy
  const browser = await chromium.launch({
    proxy: proxy ? { server: proxy, bypass: '127.0.0.1,localhost' } : undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width, height }, ignoreHTTPSErrors: !!proxy });
  page.setDefaultTimeout(180_000);
  const errors = [], warnings = [], failed = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    const t = m.text();
    if (BENIGN.some((r) => r.test(t))) return;
    if (m.type() === 'error') errors.push(`console.error: ${t}`);
    else if (m.type() === 'warning') warnings.push(t);
  });
  page.on('requestfailed', (r) => {               // (ERR_ABORTED is a cancelled fetch — a stream superseded — not a missing file)
    const why = r.failure()?.errorText ?? '';
    if (!/ERR_ABORTED/.test(why)) failed.push(`${r.url()} (${why})`);
  });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.url()} (HTTP ${r.status()})`); });

  const t0 = Date.now();
  await page.goto(`${server.url}/${query ? '?' + query : ''}`, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__v2?.game, null, { timeout });
  const bootMs = Date.now() - t0;
  // a handle the tests use inside page.evaluate: the game, the world and story modules
  await page.evaluate(async () => {
    window.__T = { ...window.__v2, world: await import('./js/world.js'), story: await import('./js/story.js'), THREE: await import('three') };
    window.__T.realRender = __v2.renderer.render.bind(__v2.renderer);
  });

  const g = {
    page, browser, server, errors, warnings, failed, bootMs,
    eval: (fn, arg) => page.evaluate(fn, arg),
    /** stop drawing (logic keeps running) */
    fast: () => page.evaluate(() => { __v2.renderer.render = () => {}; }),
    /** draw again */
    slow: () => page.evaluate(() => { __v2.renderer.render = __T.realRender; }),
    /** wait for n animation frames of the game's own loop */
    frames: (n = 1) => page.evaluate((n) => new Promise((ok) => { let i = 0; const f = () => (++i >= n ? ok() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n),
    /** wait (real time) until fn() in the page is truthy */
    until: (fn, arg, ms = 60_000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 50 }),
    state: () => page.evaluate(() => {
      const G = __v2.game.G;
      return { state: G.state, act: G.act, ui: G.ui, solved: G.solved, found: [...G.found], talked: [...G.talked], met: [...G.met],
        mode: __v2.player.st.mode, room: !!G.room, inside: !!__v2.rooms.inside, enabled: __v2.player.st.enabled };
    }),
    press: async (code, holdMs = 0) => {
      await page.evaluate((code) => dispatchEvent(new KeyboardEvent('keydown', { code, key: code.replace(/^Key/, '').toLowerCase(), bubbles: true })), code);
      if (holdMs) await page.waitForTimeout(holdMs);
      await page.evaluate((code) => dispatchEvent(new KeyboardEvent('keyup', { code, key: code.replace(/^Key/, '').toLowerCase(), bubbles: true })), code);
    },
    visible: (id) => page.evaluate((id) => { const e = document.getElementById(id); return !!e && !e.classList.contains('hide') && getComputedStyle(e).display !== 'none'; }, id),
    text: (id) => page.evaluate((id) => document.getElementById(id)?.textContent ?? '', id),
    click: (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) throw new Error('no element ' + sel); e.click(); }, sel),
    /** stand the critic right on a direction (a unit vector [x,y,z]), on foot */
    teleport: async (dir) => {
      await page.evaluate((d) => {
        const st = __v2.player.st; st.dir.set(d[0], d[1], d[2]).normalize(); st.gr = 0; st.speed = 0;
      }, dir);
      await g.frames(3);
    },
    /** stand at a story item (person/clue) by id and return the E prompt's text */
    goTo: async (id) => {
      const dir = await page.evaluate((id) => { const it = __v2.game.items.find((i) => i.id === id); return it && it.dir.toArray(); }, id);
      if (!dir) throw new Error(`no story item "${id}"`);
      await g.teleport(dir);
      return (await g.visible('prompt')) ? g.text('prompt') : '';
    },
    /** draw one real frame and save it to tests/output/<name>.png (noUI: hide the HUD for a clean look at the models) */
    shot: async (name, { noUI = false } = {}) => {
      if (noUI) await page.addStyleTag({ content: '.ui, #bubbles { visibility: hidden !important; } #__noui {}' }).then((h) => h.evaluate((e) => e.id = '__noui'));
      await g.slow(); await g.frames(2);
      const path = `${OUT}${name}.png`;
      await page.screenshot({ path, timeout: 300_000 });
      await g.fast();
      if (noUI) await page.evaluate(() => document.getElementById('__noui')?.remove());
      return path;
    },
    /** photograph a spot in the world (at: [x,y,z], size: how big the thing is), boxed in red — for a failing rule */
    shotAt: async (name, at, size = 2) => {
      await page.evaluate(({ at, size }) => {
        const { THREE, world } = __T, c = new THREE.Vector3(...at), up = c.clone().normalize();
        const base = up.clone().multiplyScalar(world.standAt(up));
        // a step back at about knee height, aimed at the thing's base so a gap under it shows — from
        // whichever side the ground is lowest (looking up from downhill, a gap shows against the sky)
        const d = Math.min(Math.max(size * 2.2, 3.5), 30), h = Math.min(0.35 + size * 0.15, 6);
        const a0 = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0.2, 0.3, 1)).normalize(), b0 = new THREE.Vector3().crossVectors(up, a0);
        let side = a0, lowest = Infinity;
        for (let k = 0; k < 8; k++) {
          const dir = a0.clone().multiplyScalar(Math.cos(k * Math.PI / 4)).addScaledVector(b0, Math.sin(k * Math.PI / 4));
          const at = base.clone().addScaledVector(dir, d).normalize(), gh = world.standAt(at);
          if (gh < lowest) { lowest = gh; side = dir; }
        }
        const ground = base.clone();
        const box = new THREE.Box3Helper(new THREE.Box3().setFromCenterAndSize(c, new THREE.Vector3(size, size, size).multiplyScalar(0.55)), 0xff2020);
        box.userData.__mark = true; __v2.scene.add(box);
        __T.__prevHook = __v2.player.st.camHook;
        __v2.player.st.camHook = (cam) => { cam.position.copy(ground).addScaledVector(side, d).addScaledVector(up, h); cam.up.copy(up); cam.lookAt(c.clone().lerp(ground, 0.5)); };
      }, { at, size });
      await g.frames(2);
      const path = await g.shot(name, { noUI: true });
      await page.evaluate(() => { for (const o of [...__v2.scene.children]) if (o.userData.__mark) __v2.scene.remove(o); __v2.player.st.camHook = __T.__prevHook ?? null; });
      return path;
    },
    /** title → cold open (skipped) → phone texts → playing */
    startPlay: async () => {
      await g.click('#start');
      await g.until(() => __v2.game.G.state === 'cold');
      await g.click('#skip');
      await g.until(() => document.querySelector('#screen .chip'), null, 30_000);
      await g.click('#screen .chip');
      await g.until(() => __v2.game.G.state === 'play', null, 30_000);
    },
    close: async () => { await browser.close(); await server.close(); },
  };
  return g;
}
