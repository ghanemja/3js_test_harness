// STATIC CHECKS — no browser, a couple of seconds. The wiring that breaks a deploy before a
// single frame is drawn: syntax, imports, the import map + cache tokens, every model/texture
// the code asks for actually exists, and the build gates Netlify runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { GAME_DIR } from './lib/target.mjs';
const ROOT = GAME_DIR;
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');
const JS = readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js'));
const html = rd('index.html');

test('every js/ module parses', () => {
  const bad = [];
  for (const f of [...JS.map((f) => `js/${f}`), 'planet.js']) {
    if (!existsSync(join(ROOT, f))) continue;
    try { execFileSync(process.execPath, ['--check', '--input-type=module'], { input: rd(f), stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (e) { bad.push(`${f}: ${String(e.stderr).split('\n').find((l) => /Error/.test(l))}`); }
  }
  assert.deepEqual(bad, []);
});

test('every relative import in js/ points at a real file and a real export', () => {
  const bad = [];
  const exportsOf = (f) => {
    const src = rd(`js/${f}`), names = new Set();
    for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
    // export const A = 1, B = new X(…) — every top-level name in the declaration
    for (const m of src.matchAll(/^export\s+(?:const|let|var)\s+([^;\n]+)/gm)) {
      let depth = 0, cur = '';
      for (const ch of m[1]) { if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--; else if (ch === ',' && !depth) { const k = cur.match(/^\s*([A-Za-z_$][\w$]*)\s*=/); if (k) names.add(k[1]); cur = ''; continue; } cur += ch; }
      const k = cur.match(/^\s*([A-Za-z_$][\w$]*)\s*=/); if (k) names.add(k[1]);
    }
    for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) for (const n of m[1].split(',')) { const k = n.trim().split(/\s+as\s+/).pop(); if (k) names.add(k); }
    return names;
  };
  for (const f of JS) {
    for (const m of rd(`js/${f}`).matchAll(/import\s*(\{[^}]*\}|[\w$]+|\*\s+as\s+[\w$]+)?\s*(?:from\s*)?['"](\.\/[^'"?]+)['"]/g)) {
      const target = m[2].replace(/^\.\//, '');
      if (!existsSync(join(ROOT, 'js', target))) { bad.push(`${f} imports missing ${m[2]}`); continue; }
      if (m[1]?.startsWith('{')) {
        const have = exportsOf(target);
        for (const n of m[1].slice(1, -1).split(',')) {
          const name = n.trim().split(/\s+as\s+/)[0];
          if (name && !have.has(name)) bad.push(`${f} imports { ${name} } but ${target} does not export it`);
        }
      }
    }
  }
  assert.deepEqual(bad, []);
});

test('import map lists every module with main.js\'s cache token', () => {
  const cb = html.match(/main\.js\?cb=(\d+)/)?.[1];
  assert.ok(cb, 'index.html has no main.js?cb= token');
  const missing = JS.filter((f) => f !== 'main.js' && !html.includes(`"./js/${f}": "./js/${f}?cb=`));
  assert.deepEqual(missing, [], 'modules missing from the import map');
  const stale = [...html.matchAll(/"\.\/js\/([a-z]+\.js)": "\.\/js\/[a-z]+\.js\?cb=(\d+)"/g)].filter((m) => m[2] !== cb).map((m) => `${m[1]}@${m[2]}`);
  assert.deepEqual(stale, [], `modules not on cb=${cb} (run node scripts/check-modules.mjs)`);
  const ghosts = [...html.matchAll(/"\.\/js\/([a-z]+\.js)":/g)].map((m) => m[1]).filter((f) => !JS.includes(f));
  assert.deepEqual(ghosts, [], 'import map entries for modules that no longer exist');
});

test('every asset path named in the code exists', () => {
  const bad = new Set();
  const re = /['"`](\.?\/?(?:models|artworks|fonts|data|clips|screenshots)\/[^'"`$\s]+\.(?:glb|gltf|png|jpe?g|webp|json|woff2|mp3|ogg|wav|mp4|webm))['"`]/g;
  for (const f of [...JS.map((f) => `js/${f}`), 'index.html']) {
    for (const m of rd(f).matchAll(re)) {
      const p = m[1].replace(/^\.?\//, '');
      if (!existsSync(join(ROOT, p))) bad.add(`${f}: ${m[1]}`);
    }
  }
  assert.deepEqual([...bad], []);
});

test('every artwork in data/artworks.json has its image', () => {
  if (!existsSync(join(ROOT, 'data/artworks.json'))) return;
  const list = JSON.parse(rd('data/artworks.json'));
  const files = (Array.isArray(list) ? list : Object.values(list).flat()).map((a) => a?.image ?? a?.file ?? a?.src ?? a?.img ?? (typeof a === 'string' ? a : null)).filter(Boolean);
  const missing = files.filter((f) => !existsSync(join(ROOT, f.replace(/^\.?\//, ''))) && !existsSync(join(ROOT, 'artworks', f)));
  assert.deepEqual(missing, []);
});

test('shipped models stay inside the browser budget (≤ 6 MB each, CLAUDE.md targets ~1.5 MB)', () => {
  const big = [];
  const walk = (d) => { for (const f of readdirSync(join(ROOT, d))) {
    const p = `${d}/${f}`, s = statSync(join(ROOT, p));
    if (s.isDirectory()) { if (f !== '_raw') walk(p); } else if (/\.glb$/.test(f) && s.size > 6e6) big.push(`${p} ${(s.size / 1e6).toFixed(1)} MB`);
  } };
  walk('models');
  assert.deepEqual(big, []);
});

test('Netlify build gates pass (validate-critic, validate-assets)', () => {
  for (const s of ['scripts/validate-critic.mjs', 'scripts/validate-assets.mjs']) {
    try { execFileSync(process.execPath, [s], { cwd: ROOT, stdio: 'pipe' }); }
    catch (e) { assert.fail(`${s} failed:\n${e.stdout}${e.stderr}`); }
  }
});

// ── models the main app loads: CLAUDE.md asset rules (textures 512² WebP, sub-~1.5 MB per model) ──
function imageSize(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), type: 'png' };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const f = b.toString('ascii', 12, 16);
    if (f === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, type: 'webp' };
    if (f === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1, type: 'webp' }; }
    if (f === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), type: 'webp' };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), type: 'jpeg' };
      i += 2 + b.readUInt16BE(i + 2); }
  }
  return { w: 0, h: 0, type: 'unknown' };
}
function glbImages(path) {
  const b = readFileSync(path);
  if (b.readUInt32LE(0) !== 0x46546c67) return null;                     // 'glTF'
  const jl = b.readUInt32LE(12), json = JSON.parse(b.toString('utf8', 20, 20 + jl)), bin = 20 + jl + 8;
  return (json.images ?? []).map((im) => {
    if (im.bufferView == null) return { w: 0, h: 0, type: 'external' };
    const bv = json.bufferViews[im.bufferView], at = bin + (bv.byteOffset ?? 0);
    return imageSize(b.subarray(at, at + bv.byteLength));
  });
}
test('models the app loads: textures ≤ 512² WebP, each model ≤ 1.5 MB (CLAUDE.md asset pipeline)', () => {
  const src = JS.map((f) => rd(`js/${f}`)).join('\n');
  // the literal paths, plus the citizens folder the app loads by name (models/citizens/<id>.glb)
  const used = new Set([...src.matchAll(/['"`]\.?\/?(models\/[^'"`$]+\.glb)['"`]/g)].map((m) => m[1]));
  if (/models\/citizens\/\$\{/.test(src)) for (const f of readdirSync(join(ROOT, 'models/citizens'))) if (f.endsWith('.glb')) used.add(`models/citizens/${f}`);
  assert.ok(used.size > 0, 'found no models the app loads');
  const bad = [];
  for (const p of used) {
    if (!existsSync(join(ROOT, p))) continue;                             // (missing files: the asset-path test)
    const size = statSync(join(ROOT, p)).size;
    if (size > 1.5e6) bad.push(`${p}: ${(size / 1e6).toFixed(2)} MB`);
    for (const im of glbImages(join(ROOT, p)) ?? []) {
      if (im.w > 512 || im.h > 512) bad.push(`${p}: a ${im.w}×${im.h} texture (max 512²)`);
      if (im.type !== 'webp') bad.push(`${p}: a ${im.type} texture (should be WebP)`);
    }
  }
  assert.deepEqual(bad, []);
});
