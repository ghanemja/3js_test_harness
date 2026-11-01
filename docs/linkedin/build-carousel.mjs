// The LinkedIn carousel (a PDF, one 1080×1350 slide per page) — every image is a real harness screenshot.
//   node docs/linkedin/build-carousel.mjs     (needs the screenshots in tests/output/: gallery-*, c-*, models-opening-view-noui)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { GAME_DIR } from '../../tests/lib/target.mjs';

const ROOT = new URL('../../', import.meta.url).pathname, SHOTS = `${ROOT}tests/output/`;
const OUT = `${ROOT}docs/linkedin/the-vanishing-gallery-test-harness.pdf`;
const font = (f) => `data:font/woff2;base64,${readFileSync(`${GAME_DIR}/fonts/${f}`).toString('base64')}`;
// screenshots → JPEG data URIs (keeps the PDF small)
const jpgCache = {};
function img(name) {
  if (jpgCache[name]) return jpgCache[name];
  const src = SHOTS + name; if (!existsSync(src)) throw new Error(`missing screenshot ${name}`);
  const b64 = execSync(`python3 -c "import sys,io,base64;from PIL import Image;b=io.BytesIO();Image.open(sys.argv[1]).convert('RGB').save(b,'JPEG',quality=86);print(base64.b64encode(b.getvalue()).decode())" ${JSON.stringify(src)}`, { maxBuffer: 64e6 }).toString().trim();
  return (jpgCache[name] = `data:image/jpeg;base64,${b64}`);
}

const C = { bg: '#15111c', bg2: '#1f1928', paper: '#f6efdf', ink: '#2a2230', coral: '#e8604c', gold: '#e4b84f', teal: '#3fb6a8', green: '#4ade80', red: '#f87171', mute: '#a79fb3', line: '#3a3145' };
const CSS = `
@font-face{font-family:Caveat;font-weight:700;src:url(${font('caveat-latin-700-normal.woff2')})}
@font-face{font-family:Hand;src:url(${font('patrick-hand-latin-400-normal.woff2')})}
@page{size:1080px 1350px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{background:${C.bg};color:${C.paper};font:500 30px/1.35 system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
.s{width:1080px;height:1350px;position:relative;overflow:hidden;padding:84px 80px 0;page-break-after:always;
  background:radial-gradient(1200px 700px at 110% -10%,rgba(232,96,76,.28),transparent 60%),radial-gradient(900px 600px at -20% 110%,rgba(63,182,168,.20),transparent 60%),${C.bg}}
.kick{font:800 22px/1 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:${C.gold}}
h1{font:700 104px/.95 Caveat,cursive;letter-spacing:-.5px;margin:18px 0 22px}
h2{font:700 84px/.98 Caveat,cursive;margin:16px 0 20px}
.hl{color:${C.coral}} .gd{color:${C.gold}} .tl{color:${C.teal}}
p{color:#e9e1d0} .mute{color:${C.mute}}
.foot{position:absolute;left:80px;right:80px;bottom:44px;display:flex;justify-content:space-between;font:600 20px/1 system-ui,sans-serif;color:${C.mute};letter-spacing:.06em}
.shot{display:block;width:100%;border:3px solid ${C.paper};box-shadow:12px 12px 0 rgba(0,0,0,.45)}
.tag{display:inline-block;font:800 19px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;padding:9px 13px;color:${C.bg}}
.bad{background:${C.red}} .good{background:${C.green}} .gold{background:${C.gold}}
pre{font:500 21px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;background:#0b0910;border:2px solid ${C.line};padding:18px 22px;white-space:pre-wrap;color:#e2e8f0}
.r{color:${C.red}} .g{color:${C.green}} .y{color:${C.gold}}
.big{font:800 150px/.9 system-ui,sans-serif;letter-spacing:-4px}
.swipe{position:absolute;right:80px;bottom:110px;font:700 64px/1 Caveat,cursive;color:${C.gold}}
`;
const N = 10;
const foot = (n) => `<div class="foot"><span>THE VANISHING GALLERY · TEST HARNESS</span><span>${n} / ${N}</span></div>`;
const pair = (a, b, la, lb) => `<div style="display:grid;grid-template-columns:1fr;gap:26px">
  <div><span class="tag bad">${la}</span><img class="shot" style="margin-top:10px;height:330px;object-fit:cover" src="${img(a)}"></div>
  <div><span class="tag good">${lb}</span><img class="shot" style="margin-top:10px;height:330px;object-fit:cover" src="${img(b)}"></div></div>`;

const slides = [
// 1 — cover
`<div class="s"><div class="kick">a side project · three.js · automated QA</div>
<h1>I built a robot that <span class="hl">plays my game</span> to find its bugs.</h1>
<img class="shot" style="height:560px;object-fit:cover;margin-top:10px" src="${img('models-opening-view-noui.png')}">
<p style="margin-top:34px;font-size:32px">The Vanishing Gallery is a hand-drawn art-heist game on a tiny planet. It ships to the web on <b class="gd">every push</b>. So I gave it a test harness.</p>
<div class="swipe">swipe →</div>${foot(1)}</div>`,
// 2 — the problem
`<div class="s"><div class="kick">the problem</div>
<h2>Every push goes <span class="hl">live</span>.<br>Every bug, too.</h2>
<p style="font-size:32px;margin-bottom:34px">A browser game: ~15,000 lines of plain JavaScript, no build step, deployed by Netlify on every commit. My feature log kept filling up with the same kinds of bug:</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;font-size:29px">
${['planters floating over the lawn', 'feet sunk into the floor', 'a road through a building', 'a hero who moonwalks', 'a ladder hanging in mid-air', 'a plant in the middle of the street'].map((t) => `<div style="border-left:6px solid ${C.coral};background:${C.bg2};padding:16px 20px">${t}</div>`).join('')}
</div>
<div style="display:flex;align-items:flex-end;gap:28px;margin-top:56px"><div class="big gd">~220</div><p style="font-size:32px;padding-bottom:14px">lessons and rules, written down in my own docs, that nothing was checking.</p></div>
${foot(2)}</div>`,
// 3 — how it works
`<div class="s"><div class="kick">how it works</div>
<h2>It plays the <span class="tl">real game</span>, like a person would.</h2>
<div style="display:grid;gap:16px;font-size:29px;margin-bottom:30px">
${[['1', 'Boots the actual game in headless Chrome (Playwright)'], ['2', 'Presses the keys and clicks a player would: walk, talk, drive, accuse'], ['3', 'Reads the live 3D scene and measures it against my rules'], ['4', 'Every failure says what, where and which rule — with a photo']].map(([n, t]) => `<div style="display:flex;gap:22px;align-items:center;background:${C.bg2};padding:16px 22px;border-left:6px solid ${C.teal}"><b class="tl" style="font:800 44px/1 system-ui">${n}</b><span>${t}</span></div>`).join('')}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
<img class="shot" style="height:300px;object-fit:cover" src="${img('gallery-camera-talk.png')}"><img class="shot" style="height:300px;object-fit:cover" src="${img('gallery-driving.png')}"></div>
<p class="mute" style="margin-top:22px;font-size:24px">Screenshots the harness took mid-run: a conversation, and the car on the road.</p>
${foot(3)}</div>`,
// 4 — six suites
`<div class="s"><div class="kick">what it checks</div>
<h2>Six suites. <span class="gd">65 tests.</span></h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
${[['gallery-ui-notebook.png', 'static', 'imports, cache tokens, asset budgets — 2 seconds'], ['gallery-story-title.png', 'story', 'title to "Case closed", every clue, every suspect'], ['gallery-ui-board.png', 'interactions', 'every key, panel, door, car and boat'], ['gallery-people-pia.png', 'models', 'broken geometry, scale, triangle budgets'], ['gallery-layout-above.png', 'rules', 'nothing floats, roads round buildings, no emoji…'], ['gallery-gait-stride.png', 'rigs', 'skeletons, posture, gait — no moonwalking']].map(([f, t, d]) => `<div style="background:${C.bg2};border-top:5px solid ${C.coral}"><img style="display:block;width:100%;height:178px;object-fit:cover" src="${img(f)}"><div style="padding:14px 18px 18px"><b style="font:800 30px/1 system-ui" class="hl">${t}</b><div style="font-size:23px;margin-top:6px;color:#e9e1d0">${d}</div></div></div>`).join('')}
</div>${foot(4)}</div>`,
// 5 — swimmer
`<div class="s"><div class="kick">bug #1 · real, now fixed</div>
<h2>The swimmer was <span class="hl">standing</span> in the pool.</h2>
${pair('c-old-swim.png', 'c-new-swim.png', 'before', 'after')}
<p style="margin-top:28px;font-size:27px">I spotted this one by eye. The harness found <i>why</i>: she was a regular townsperson in the walking pose, sunk to her chest. Now she swims breaststroke, and a test fails if she ever stands up again.</p>
${foot(5)}</div>`,
// 6 — golfer
`<div class="s"><div class="kick">bug #2 · real, now fixed</div>
<h2>The golfer <span class="hl">floated</span> and never swung.</h2>
${pair('c-old-golf.png', 'c-new-golf.png', 'before', 'after')}
<pre style="margin-top:26px"><span class="r">✖ fists 0.141 apart — not both on the grip</span>
<span class="r">✖ ankles never below 0.126 over the mat</span>   <span class="mute">(0.034 fixed)</span></pre>
${foot(6)}</div>`,
// 7 — worked example
`<div class="s"><div class="kick">a real test run</div>
<h2>I added two benches.<br><span class="hl">It caught two mistakes.</span></h2>
<pre><span class="mute">$ node tests/run.mjs static</span>
<span class="r">✖ modules missing from the import map: 'benches.js'</span>
<span class="mute">$ node tests/run.mjs rules</span>
<span class="r">✖ nothing floats</span>  <span class="y">gap: 0.281  near: 'museum-garden'</span>
<span class="y">ℹ photo of new floater: floating-1.png</span></pre>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:28px">
<div><span class="tag bad">caught</span><img class="shot" style="margin-top:10px;height:330px;object-fit:cover" src="${img('c-bench-before.png')}"></div>
<div><span class="tag good">fixed · 16/16 green</span><img class="shot" style="margin-top:10px;height:330px;object-fit:cover" src="${img('c-bench-after.png')}"></div></div>
<p style="margin-top:26px;font-size:26px">Neither shows on the title screen or a quick walk past. Both would have shipped.</p>
${foot(7)}</div>`,
// 8 — the live site
`<div class="s"><div class="kick">pointed at the live site</div>
<h2>After 3 big merges, it went <span class="hl">red</span>.</h2>
<p style="font-size:30px;margin-bottom:26px">Same tests, unchanged, run against what's on the web today:</p>
<pre><span class="g">✓ static        ✓ interactions        ✓ rigs</span>
<span class="r">✗ story         ✗ models              ✗ rules</span></pre>
<div style="display:grid;gap:16px;margin-top:30px;font-size:28px">
${[[C.red, 'A clue lost its painted sketch', 'a real regression: the ladder card would show with no picture'], [C.gold, 'Shader programs 53 → 68', 'a performance budget question'], [C.gold, 'Five new things off the ground', 'each one photographed: a bridge (fine), two to check up close']].map(([c, t, d]) => `<div style="background:${C.bg2};border-left:8px solid ${c};padding:16px 22px"><b>${t}</b><div class="mute" style="font-size:24px;margin-top:4px">${d}</div></div>`).join('')}
</div>${foot(8)}</div>`,
// 9 — honesty
`<div class="s"><div class="kick">the part nobody posts</div>
<h2>The harness was <span class="gd">wrong</span> six times first.</h2>
<div style="display:grid;gap:14px;font-size:27px">
${[['"The hero is 8.6 units tall"', 'her model reshapes on the GPU — now measured by her skeleton'], ['"Five things are floating!"', 'it was the bunting over Main Street — meant to hang there'], ['"Everyone sank 0.4"', 'hidden triangles under clothes — now skipped'], ['"She moonwalks 98% of the time"', 'wrong metric — now uses the one from my own bug log']].map(([a, b]) => `<div style="background:${C.bg2};padding:16px 22px;border-left:6px solid ${C.gold}"><b>${a}</b><div class="mute" style="font-size:24px;margin-top:4px">${b}</div></div>`).join('')}
</div>
<p style="margin-top:36px;font-size:34px;font-family:Hand,cursive">Lesson: <b class="hl">look at a screenshot before you trust a number.</b> Every exception is checked in a picture and written down with a reason.</p>
${foot(9)}</div>`,
// 10 — numbers + CTA
`<div class="s"><div class="kick">by the numbers</div>
<h2>Small game. <span class="tl">Real QA.</span></h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:10px">
${[['6', 'test suites'], ['65', 'tests'], ['~220', 'rules catalogued from my own docs'], ['0', 'changes to how the game is built'], ['2', 'real bugs fixed, with tests that guard them'], ['~15 min', 'for the whole run, in software rendering']].map(([n, t]) => `<div style="background:${C.bg2};padding:22px 24px;border-top:5px solid ${C.teal}"><div style="font:800 76px/1 system-ui;letter-spacing:-2px" class="gd">${n}</div><div style="font-size:25px;margin-top:8px">${t}</div></div>`).join('')}
</div>
<p style="margin-top:40px;font-size:30px">Built on ISTQB's game-testing syllabus and the way studios like Rare test <i>Sea of Thieves</i> — scaled down to one person and a browser.</p>
<p style="margin-top:26px;font:700 58px/1.1 Caveat,cursive" class="hl">What would you test first?</p>
<p class="mute" style="margin-top:14px;font-size:24px">github.com/ghanemja/3js_test_harness · art-heist.netlify.app</p>
${foot(10)}</div>`,
];

function load() {
  const roots = [process.cwd() + '/', '/opt/node-tools/node_modules/'];
  try { roots.push(execSync('npm root -g', { encoding: 'utf8' }).trim() + '/'); } catch { /* */ }
  for (const r of roots) { try { return createRequire(r)('playwright'); } catch { /* */ } }
  throw new Error('playwright not found');
}
const { chromium } = load();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.setContent(`<!doctype html><meta charset=utf-8><style>${CSS}</style><body>${slides.join('')}</body>`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: OUT, width: '1080px', height: '1350px', printBackground: true, preferCSSPageSize: true });
// a PNG of each slide too, for checking and for posting as images
for (let i = 0; i < slides.length; i++) {
  const el = (await page.$$('.s'))[i];
  await el.screenshot({ path: `${SHOTS}slide-${String(i + 1).padStart(2, '0')}.png` });
}
await browser.close();
console.log('wrote', OUT);
