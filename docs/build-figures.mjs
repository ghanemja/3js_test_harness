// Lays the harness's own screenshots out into the README's figures.
//   node docs/capture-gallery.mjs      → tests/output/gallery-*.png   (what each area looks like)
//   (the worked example's photos come from the run described in the README: bench-before/after.png)
//   node docs/build-figures.mjs        → docs/img/what-gets-tested.jpg, docs/img/worked-example.jpg
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname, OUT = `${ROOT}tests/output/`, IMG = `${ROOT}docs/img/`;
mkdirSync(IMG, { recursive: true });
const img = (f) => `data:image/png;base64,${readFileSync(OUT + f).toString('base64')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const C = { game: '#c2410c', harness: '#1d4ed8', browser: '#7c3aed', suite: '#047857', result: '#334155', bad: '#b91c1c', ink: '#0f172a', sub: '#475569', line: '#cbd5e1', paper: '#f8fafc' };
const CSS = `*{box-sizing:border-box;margin:0} body{background:${C.paper};font:15px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${C.ink};padding:36px 40px;width:1600px}
h1{font-size:30px;font-weight:800;letter-spacing:-.4px} .sub{color:${C.sub};margin:4px 0 22px;font-size:16px}
.box{background:#fff;border:1px solid ${C.line};border-left:6px solid var(--c)} .tag{display:inline-block;font:600 12px/1 ui-monospace,Menlo,monospace;color:#fff;background:var(--c);padding:4px 7px;letter-spacing:.3px}
.arrow{color:${C.sub};font-size:26px;text-align:center;line-height:1} code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}`;

function load() {
  const roots = ['/opt/node-tools/node_modules/'];
  try { roots.push(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/'); } catch { /* */ }
  for (const r of [process.cwd() + '/', ...roots]) { try { return createRequire(r)('playwright'); } catch { /* */ } }
  throw new Error('playwright not found');
}
const { chromium } = load();
const browser = await chromium.launch();
async function render(html, file) {
  const page = await browser.newPage({ viewport: { width: 1680, height: 900 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset=utf-8><style>${CSS}</style><body>${html}</body>`);
  const el = await page.$('body');
  await el.screenshot({ path: IMG + file, type: 'jpeg', quality: 86 });
  await page.close();
  console.log('wrote docs/img/' + file);
}

// ── figure 1: what gets tested ──────────────────────────────────────────────
const tiles = [
  ['gallery-story-title.png', 'Story', 'story', 'title → cold open → phone → every clue and suspect → accusations → getaway → countdown → "Case closed"'],
  ['gallery-ui-board.png', 'UI & the case board', 'interactions · rules', 'every key and button: N B P M H Esc, the board fold, touch tap targets, no emoji'],
  ['gallery-ui-notebook.png', 'Notebook & accusing', 'story · interactions', 'finds are recorded; only the culprit with two proofs solves the case'],
  ['gallery-camera-talk.png', 'Camera', 'rules', 'opens facing the museum; never underground or inside her; over-the-shoulder talks'],
  ['gallery-people-pia.png', 'People & style', 'models · rules', 'town scale, no critic clones, idle life, ink on everything, smooth and matte'],
  ['gallery-grounding-feet.png', 'Grounding', 'rules', 'nothing floats — a ray down from every object; everyone\'s feet on the floor'],
  ['gallery-layout-above.png', 'Layout', 'rules', 'roads go round reserved ground; no plant on a road; road grades'],
  ['gallery-driving.png', 'Driving', 'interactions · rules', 'in, drive, out; the car stays on the road at full lock both ways'],
  ['gallery-gait-stride.png', 'Gait & rigging', 'rigs', 'feet alternate, no moonwalk, legs front-to-back; posture; the swimmer swims, the golfer swings'],
];
const flow = (label, detail, c) => `<div class="box" style="--c:${c};padding:12px 16px;flex:1"><div style="font-weight:700;color:${c};font-size:17px">${label}</div><div style="color:${C.sub};font:13px ui-monospace,Menlo,monospace;margin-top:3px">${detail}</div></div>`;
await render(`
<h1>What the harness checks</h1><div class="sub">Every picture below is a screenshot the harness took of the real game during a run.</div>
<div style="display:flex;gap:14px;align-items:center;margin-bottom:18px">
  ${flow('Your art-heist checkout', 'GAME_DIR · index.html + js/', C.game)}<div class="arrow">→</div>
  ${flow('Headless Chromium boots it', 'tests/serve.mjs · Playwright', C.browser)}<div class="arrow">→</div>
  ${flow('The driver plays it', 'lib/game.mjs · keys, clicks, teleport, frames', C.harness)}<div class="arrow">→</div>
  ${flow('Six suites measure it', 'static · story · interactions · models · rules · rigs', C.suite)}
</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
${tiles.map(([f, t, suite, what]) => `<div class="box" style="--c:${C.suite};padding:0;border-left:none;border-top:6px solid ${C.suite}">
  <img src="${img(f)}" style="display:block;width:100%;height:290px;object-fit:cover">
  <div style="padding:10px 14px 13px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">${t}</b><span class="tag" style="--c:${C.suite}">${suite}</span></div>
  <div style="color:${C.sub};margin-top:4px">${what}</div></div></div>`).join('')}
</div>
<div style="display:flex;gap:14px;align-items:center;margin-top:18px">
  ${flow('Verdict', 'pass / fail per rule · each failure says what, where and which rule', C.result)}
  ${flow('Evidence', 'screenshots of every offender · tests/output/*-report.json', C.result)}
  ${flow('Reviewed exceptions', 'meant to break a rule? listed with a reason — anything new still fails', C.result)}
</div>`, 'what-gets-tested.jpg');

// ── figure 2: a real feature, caught twice, then green ──────────────────────
const term = (lines) => `<pre style="background:#0f172a;color:#e2e8f0;padding:12px 14px;font-size:12.5px;line-height:1.5;white-space:pre-wrap;margin-top:10px">${lines.map((l) => {
  const e = esc(l);
  return /^✖|fail [1-9]|new offenders|missing/.test(l) ? `<span style="color:#fca5a5">${e}</span>` : /^✔|^✓|pass 16|fail 0/.test(l) ? `<span style="color:#86efac">${e}</span>` : /photo of/.test(l) ? `<span style="color:#fcd34d">${e}</span>` : e;
}).join('\n')}</pre>`;
const code = (lines) => `<pre style="background:#fff;border:1px solid ${C.line};padding:10px 12px;font-size:12.5px;line-height:1.5;white-space:pre-wrap">${lines.map((l) => {
  const e = esc(l); return l.startsWith('+') ? `<span style="color:#047857">${e}</span>` : l.startsWith('-') ? `<span style="color:#b91c1c">${e}</span>` : e;
}).join('\n')}</pre>`;
const stage = (n, c, title, body) => `<div class="box" style="--c:${c};padding:16px 18px;flex:1;display:flex;flex-direction:column;gap:6px">
  <div><span class="tag" style="--c:${c}">STEP ${n}</span></div><div style="font-weight:800;font-size:19px;margin:4px 0 2px">${title}</div>${body}</div>`;
await render(`
<h1>A real example: adding two benches to the museum garden</h1>
<div class="sub">A new feature written the way a hurried edit often is. The harness catches two mistakes, each with the rule it breaks; then everything passes.</div>
<div style="display:flex;gap:16px;align-items:stretch">
${stage(1, C.bad, 'New module, import map forgotten', `
  ${code(["// js/benches.js — new", "export function addMemorialBenches({ scene }) { … }", "", "// js/main.js", "+import { addMemorialBenches } from './benches.js';", "+addMemorialBenches({ scene });"])}
  <div style="color:${C.sub}">CLAUDE.md: every <code>js/</code> module goes in index.html's import map on main.js's cache token, or browsers ship a stale mix.</div>
  ${term(['$ node tests/run.mjs static', '✔ every js/ module parses', '✔ every relative import … a real export', '✖ import map lists every module with main.js\'s cache token', '  AssertionError: modules missing from the import map', "  +   'benches.js'", '✗ static        3s'])}
  <div style="color:${C.sub}">Fixed: one line in the import map, cache token 207 → 208.</div>`)}
${stage(2, C.bad, 'Benches set at the path\'s height', `
  ${code(["const path = f(Math.cos(a) * r * 0.8, …);", "b.position.copy(d).multiplyScalar(groundAt(path));", "                     // level with the garden path"])}
  <div style="color:${C.sub}">The lawn drops ~0.4 past the path, so the benches hang in the air. Same mistake as the forecourt beacons in FEATURE_LOG ("set at paving height, 0.35 above the lawn").</div>
  ${term(['$ node tests/run.mjs rules', '✖ nothing floats: every object rests on something', 'ℹ photo of new floater 1: tests/output/floating-1.png', '  floating: new offenders', "  +  { gap: 0.281, near: 'museum-garden', size: 2.1 }", "  +  { gap: 0.268, near: 'lm:yarnflow',   size: 2 }", 'ℹ pass 15', 'ℹ fail 1'])}
  <img src="${img('bench-before.png')}" style="width:100%;display:block;border:1px solid ${C.line}">
  <div style="color:${C.sub};font-size:13px">The photo the failing test saves for each floater, boxed in red: the bench hovering over the slope.</div>`)}
${stage(3, C.suite, 'Settled on the ground under it', `
  ${code(["-const path = f(Math.cos(a) * r * 0.8, …);", "-b.position.copy(d).multiplyScalar(groundAt(path));", "-alignToSurface(b, d, a + Math.PI / 2);", "+settle(b, d, 0.6, 0, a + Math.PI / 2);", "+                     // on the ground under its own feet"])}
  <div style="color:${C.sub}">AGENTS.md: things stand on the ground with <code>settle(…)</code>. One line.</div>
  ${term(['$ node tests/run.mjs rules', '✔ nothing floats: every object rests on something', '✔ everyone stands on the ground', '✔ roads go round reserved ground', '✔ no plant on a road', '  … 12 more', 'ℹ pass 16', 'ℹ fail 0'])}
  <img src="${img('bench-after.png')}" style="width:100%;display:block;border:1px solid ${C.line}">
  <div style="color:${C.sub};font-size:13px">Same camera, after the fix: the bench stands on the lawn.</div>`)}
</div>`, 'worked-example.jpg');
await browser.close();
