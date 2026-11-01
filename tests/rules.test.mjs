// THE HOUSE RULES — the rules in art-heist's CLAUDE.md / AGENTS.md and the lessons in its
// FEATURE_LOG.md, checked against the live world. Each test names the rule it enforces;
// RULES.md lists every rule, where it comes from, and which test covers it.
//
// Some things are meant to break a rule (bunting hangs in the air). Those are listed, with a
// reason, in tests/baseline/exceptions.json — reviewed once, so anything NEW that breaks the
// rule still fails. Re-record after reviewing: UPDATE_EXCEPTIONS=1 node --test tests/rules.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { bootGame, OUT } from './lib/game.mjs';
import { exceptionsFor, UPDATE } from './lib/exceptions.mjs';

const X = exceptionsFor(), exceptions = X.all, report = X.report;
const judgeAgainst = (rule, offenders, keyOf, t) => X.judge(rule, offenders, keyOf, t);
/** a stable key for "a thing at this spot": its rounded position on the planet */
const spot = (o) => o.at.map((x) => Math.round(x * 2) / 2).join(',');
/** a placed thing matches a listed exception if it's within 1.5 units of where it was recorded (parts move a little) */
const nearSpot = (o, k) => k.seen?.at && Math.hypot(...o.at.map((x, i) => x - k.seen.at[i])) < 1.5;

let g, opening;
before(async () => {
  g = await bootGame();
  await g.fast();
  await g.until(() => __v2.player.critic?.inst, null, 120_000);
  await g.startPlay();
  await g.frames(10);
  opening = await g.eval(() => {
    const cam = __v2.camera, up = cam.position.clone().normalize(), V = cam.position.constructor;
    const fwd = new V(0, 0, -1).applyQuaternion(cam.quaternion).projectOnPlane(up).normalize();
    const toMus = __v2.town.museum.dir.clone().multiplyScalar(40).sub(cam.position).projectOnPlane(up).normalize();
    return fwd.angleTo(toMus) * 180 / Math.PI;
  });
  // shared measuring kit, installed in the page once
  await g.eval(() => {
    const { THREE, world } = __T, v = new THREE.Vector3();
    const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const solids = () => { const s = []; __v2.scene.traverse((m) => { if (m.isMesh && !m.userData.isInk && !m.isSkinnedMesh && !m.isInstancedMesh && shown(m) && m.geometry?.attributes?.position?.array && !(m.material?.transparent && m.material.opacity < 0.5)) s.push(m); }); return s; };
    // world-space sample points of a subtree (skinned ones posed; each mesh trimmed of its 1% extremes when skinned)
    function points(root, max = 4000) {
      const out = [];
      root.updateWorldMatrix(true, true);
      root.traverse((m) => m.isSkinnedMesh && m.skeleton.update());
      root.traverse((m) => {
        if (!m.isMesh || m.userData.isInk || !shown(m) || !m.geometry?.attributes?.position?.array) return;
        const mats = [].concat(m.material);
        if (mats.every((mt) => mt && (mt.visible === false || mt.colorWrite === false || (mt.transparent && mt.opacity < 0.05)))) return;   // not drawn
        // the vertices real triangles use — each once; collapsed triangles (how the Citizen Maker models
        // hide skin under clothes) are skipped, they never draw
        const P = m.geometry.attributes.position, idx = m.geometry.index?.array;
        let use;
        if (idx) { const seen = new Set(); for (let k = 0; k + 2 < idx.length; k += 3) { const a = idx[k], b = idx[k + 1], c = idx[k + 2]; if (a === b || b === c || a === c) continue; seen.add(a); seen.add(b); seen.add(c); } use = [...seen]; }
        else use = Array.from({ length: P.count }, (_, k) => k);
        const step = Math.max(1, (use.length / max) | 0), pts = [];
        for (let k = 0; k < use.length; k += step) { m.getVertexPosition(use[k], v); m.localToWorld(v); pts.push(v.clone()); }
        if (m.isSkinnedMesh && pts.length > 50) { pts.sort((a, b) => a.length() - b.length()); const c = Math.floor(pts.length * 0.01); out.push(...pts.slice(c, pts.length - c)); }
        else out.push(...pts);
      });
      return out;
    }
    const rc = new THREE.Raycaster();
    /** how far below p (along the planet's up) the nearest other surface is; negative = p is embedded */
    function gapBelow(p, others) {
      const up = p.clone().normalize();
      rc.set(p.clone().addScaledVector(up, 1.2), up.clone().negate()); rc.near = 0; rc.far = 8;
      const h = rc.intersectObjects(others, false).find((h) => h.face && Math.abs(h.face.normal.clone().transformDirection(h.object.matrixWorld).dot(up)) > 0.2);
      return h ? h.distance - 1.2 : Infinity;
    }
    const where = (d) => world.zoneHit(d.clone().normalize(), 4)?.key ?? '';
    window.__R = { THREE, world, shown, solids, points, gapBelow, where, v };
  });
});
after(async () => {
  writeFileSync(`${OUT}rules-report.json`, JSON.stringify(report, null, 2));
  X.save();
  await g?.close();
});

// ── grounding ─────────────────────────────────────────────────────────────────

test('nothing floats: every object rests on something (FEATURE_LOG: floating planters, ladder, door, easel card, beacons…)', async (t) => {
  const floaters = await g.eval(() => {
    const { THREE, shown, solids, points, gapBelow, where } = __R, out = [];
    const all = solids(), skip = new Set([__v2.player.root]);
    for (const top of __v2.scene.children) {
      if (skip.has(top) || top.isLight || top.isCamera || !shown(top)) continue;
      let skinned = false, planet = false, own = new Set();
      top.traverse((m) => { if (m.isSkinnedMesh) skinned = true; if (m.name === 'planet' || m.name === 'sea') planet = true; if (m.isMesh) own.add(m); });
      if (skinned || planet) continue;                                     // people: their own test; the planet and sea are the ground
      const box = new THREE.Box3().setFromObject(top); if (box.isEmpty() || box.getSize(new THREE.Vector3()).length() > 100) continue;   // sky dome, clouds ring
      const pts = points(top, 3000); if (!pts.length) continue;
      // lowest points along the local up: height above the analytic ground
      const h = (p) => p.length() - __T.world.radiusAt(p.clone().normalize());
      pts.sort((a, b) => h(a) - h(b));
      const lo = h(pts[0]), low = pts.filter((p) => h(p) < lo + 0.03);
      const pick = low.filter((_, k) => k % Math.max(1, (low.length / 12) | 0) === 0).slice(0, 12);
      const others = all.filter((m) => !own.has(m));
      const gap = Math.min(...pick.map((p) => gapBelow(p, others)));
      if (gap > 0.05) out.push({ at: box.getCenter(new THREE.Vector3()).toArray(), gap: Number.isFinite(gap) ? +gap.toFixed(3) : 'nothing below', size: +box.getSize(new THREE.Vector3()).length().toFixed(1), near: where(pts[0]) });
    }
    return out;
  });
  // a failure comes with pictures: each new floater, boxed in red, in tests/output/floating-N.png
  const fresh = X.fresh('floating', floaters, spot, nearSpot);
  for (const [i, o] of fresh.slice(0, 5).entries()) t.diagnostic(`photo of new floater ${i}: ${await g.shotAt(`floating-${i}`, o.at, Math.min(o.size, 6))}`);
  X.judge('floating', floaters, spot, t, nearSpot);
});

test('everyone stands on the ground: feet on the floor, not sunk or hovering (AGENTS.md 3; FEATURE_LOG: feet 3–7 cm above)', async (t) => {
  // three snapshots a moment apart: a walker caught mid-step on a kerb is off in one, not in all three
  const snap = () => g.eval(() => {
    const { THREE, shown, solids, points, gapBelow } = __R, out = {};
    const all = solids(), roots = new Set();
    // a person = the largest person-sized group holding a skinned mesh (a cyclist and her bike count as one)
    __v2.scene.traverse((m) => {
      if (!m.isSkinnedMesh || !shown(m)) return;
      let r = m; while (r.parent && r.parent !== __v2.scene && new THREE.Box3().setFromObject(r.parent).getSize(new THREE.Vector3()).length() < 3.2) r = r.parent;
      if (r !== __v2.player.critic.inst.rig && !r.getObjectById(__v2.player.critic.inst.rig.id)) roots.add(r);
    });
    // who they are: a story person, a citizen (by id), or someone else (by where they stand)
    const who = (r) => {
      const it = __v2.game.items.find((i) => i.obj === r || i.obj?.getObjectById(r.id) || r.getObjectById(i.obj?.id ?? -1)); if (it) return `person:${it.id}`;
      const c = __v2.citizens.list.find((c) => c.root === r || c.root.getObjectById(r.id) || r.getObjectById(c.root.id)); if (c) return `citizen:${c.id}${c.role === 'bike' ? ' (cyclist)' : ''}`;
      return `someone@${r.getWorldPosition(new THREE.Vector3()).toArray().map((x) => Math.round(x)).join(',')}`;
    };
    for (const r of roots) {
      const pts = points(r, 2500); if (!pts.length) continue;
      pts.sort((a, b) => a.length() - b.length());
      const own = new Set(); r.traverse((m) => m.isMesh && own.add(m));
      // the game's own ground (standAt: terrain, registered floors, road ribbons) — what it places people on;
      // a raycast onto the drawn scene as a second opinion (it can miss a floor or catch an awning overhead)
      const d = pts[0].clone().normalize(), byStand = pts[0].length() - __R.world.standAt(d);
      const gap = Math.abs(byStand) < 0.06 ? byStand : gapBelow(pts[0], all.filter((m) => !own.has(m)));
      out[who(r)] = Number.isFinite(gap) ? +gap.toFixed(3) : 99;
    }
    return out;
  });
  const shots = [];
  for (let i = 0; i < 3; i++) { shots.push(await snap()); await g.frames(25); }
  const ids = Object.keys(shots[0]);
  t.diagnostic(`${ids.length} people measured`);
  assert.ok(ids.length >= 10, `only ${ids.length} people found — the town should have its cast, citizens, shoppers…`);
  const off = (x) => x == null || !(x > -0.06 && x < 0.06);
  const bad = ids.filter((id) => shots.every((s) => off(s[id]))).map((id) => ({ who: id, gaps: shots.map((s) => s[id]) }));
  judgeAgainst('feet-off-ground', bad, (o) => o.who, t);
});

// ── layout: nothing built on anything ─────────────────────────────────────────

test('roads go round reserved ground: no road runs through a reserved zone (CLAUDE.md layout)', async (t) => {
  const hits = await g.eval(() => {
    const { world } = __R, out = [];
    __v2.ROADS.forEach((rd, i) => { for (const z of __v2.ZONES) {
      const inside = rd.pts.map((p, k) => (world.arc(p, z.dir) < z.r - rd.half * 0.5 ? k : -1)).filter((k) => k >= 0);
      if (!inside.length) continue;
      // a spur that ends at its district (CLAUDE.md: "a spur that ends in front") runs into the zone from one end
      const last = rd.pts.length - 1, contiguous = inside.every((k, j) => j === 0 || k === inside[j - 1] + 1);
      if (contiguous && (inside[0] === 0 || inside.at(-1) === last)) continue;
      out.push({ road: i, zone: z.key, samples: inside.length });
    } });
    return out;
  });
  judgeAgainst('road-through-zone', hits, (o) => `${o.road}:${o.zone}`, t);
});

test('no plant on a road: every decoration keeps its footprint + 0.4 off the carriageway (FEATURE_LOG: 9 green meshes on roads)', async (t) => {
  const bad = await g.eval(() => {
    const { THREE, world, shown } = __R, out = [];
    __v2.scene.traverse((o) => {
      if (o.userData.deco == null || !shown(o)) return;
      const d = o.getWorldPosition(new THREE.Vector3()).normalize();
      if (world.onRoad(d, o.userData.deco + 0.4 - 0.15)) out.push({ at: d.clone().multiplyScalar(40).toArray(), r: o.userData.deco });   // (0.15 slack)
    });
    return out;
  });
  X.judge('plant-on-road', bad, spot, t, nearSpot);
});

test('story people and clues stand clear: not in the road, not inside a building (FEATURE_LOG: booth + Otto in the junction, A-board where Pia stands)', async (t) => {
  const bad = await g.eval(() => {
    const { world } = __R, out = [];
    for (const it of __v2.game.items) {
      const d = (it.at ?? it.dir).clone().normalize();
      if (it.kind === 'person' && world.onRoad(d, -0.2)) out.push({ id: it.id, why: 'standing in the road' });
      const inside = __v2.town.colliders.filter((c) => !c.soft && !c.carOnly && world.arc(c.dir, d) < c.r * 0.6 && world.arc(c.dir, d) > 0.05);
      if (it.kind === 'person' && inside.length) out.push({ id: it.id, why: `inside ${inside.length} solid footprint(s)` });
    }
    return out;
  });
  judgeAgainst('story-items-clear', bad, (o) => `${o.id}:${o.why}`, t);
});

test('roads are drivable grades: no road climbs steeper than 0.22 (FEATURE_LOG: west roads 0.59 → 0.19)', async (t) => {
  const steep = await g.eval(() => {
    const { world } = __R, out = [];
    __v2.ROADS.forEach((rd, i) => {
      let worst = 0;
      for (let k = 1; k < rd.pts.length; k++) {
        const a = rd.pts[k - 1], b = rd.pts[k], run = world.arc(a, b); if (run < 0.2) continue;
        worst = Math.max(worst, Math.abs(world.standAt(b) - world.standAt(a)) / run);
      }
      if (worst > 0.22) out.push({ road: i, grade: +worst.toFixed(2) });
    });
    return out;
  });
  judgeAgainst('road-grade', steep, (o) => `${o.road}`, t);
  const worse = steep.filter((o) => { const k = (exceptions['road-grade'] ?? []).find((e) => e.key === `${o.road}`); return k && o.grade > k.seen.grade + 0.05; });
  if (!UPDATE) assert.deepEqual(worse, [], 'roads that got steeper than their recorded grade');
});

// ── people (AGENTS.md) ────────────────────────────────────────────────────────

test('no townsperson is a clone of the critic (AGENTS.md 1)', async () => {
  const clones = await g.eval(() => {
    const critic = new Set(); __v2.player.critic.inst.rig.traverse((m) => m.isMesh && critic.add(m.geometry));
    const out = [];
    __v2.scene.traverse((m) => {
      if (!m.isSkinnedMesh || !critic.has(m.geometry)) return;
      for (let p = m; p; p = p.parent) if (p === __v2.player.critic.inst.rig || p === __v2.player.root) return;
      out.push(m.parent?.name || m.name || m.uuid);
    });
    return out;
  });
  assert.deepEqual(clones, [], 'meshes sharing the critic\'s geometry outside the player');
});

test('people are alive when nobody moves: the story cast idles on its own (AGENTS.md 8, 10)', async () => {
  const still = await g.eval(async () => {
    const snap = () => __v2.game.items.filter((i) => i.kind === 'person').map((i) => { let s = 0; i.obj.traverse((b) => { if (b.isBone || b.isObject3D) s += b.rotation.x * 1.3 + b.rotation.y * 1.7 + b.rotation.z * 2.1 + b.position.y; }); return [i.id, s]; });
    const a = snap();
    await new Promise((ok) => { let n = 0; const f = () => (++n > 40 ? ok() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const b = snap();
    return a.filter(([id, s], k) => Math.abs(s - b[k][1]) < 1e-5).map(([id]) => id);
  });
  assert.deepEqual(still, [], 'people frozen while the player stands still');
});

test('every story person and clue is inked (CLAUDE.md: the ink outline is the signature of the look)', async (t) => {
  const bare = await g.eval(() => __v2.game.items.filter((it) => it.obj).filter((it) => { let ink = false; it.obj.traverse((m) => { if (m.userData.isInk || m.material?.type === 'ShaderMaterial') ink = true; }); return !ink; }).map((it) => it.id));
  judgeAgainst('unlinked-ink', bare.map((id) => ({ id })), (o) => o.id, t);
});

// ── art style ─────────────────────────────────────────────────────────────────

test('smooth, matte, as painted: no flat shading, no shiny PBR, no tone mapping (CLAUDE.md bevels; FEATURE_LOG: no shine, no chrome)', async () => {
  const r = await g.eval(() => {
    const flat = new Set(), shiny = new Set();
    __v2.scene.traverse((m) => { if (!m.isMesh) return; for (const mt of [].concat(m.material)) {
      if (!mt) continue;
      if (mt.flatShading) flat.add(`${mt.type} ${mt.name || '#' + (mt.color?.getHexString?.() ?? '')}`);
      if ((mt.isMeshStandardMaterial || mt.isMeshPhysicalMaterial) && (mt.metalness > 0.2 || mt.roughness < 0.35)) shiny.add(`${mt.type} ${mt.name}`);
      if (mt.isMeshPhongMaterial && mt.shininess > 40) shiny.add(`${mt.type} ${mt.name}`);
    } });
    return { flat: [...flat], shiny: [...shiny], tone: __v2.renderer.toneMapping };
  });
  assert.equal(r.tone, 0, 'tone mapping is on (gouache: colours as painted)');
  assert.deepEqual(r.flat, [], 'materials with flatShading (faceted — wrong for this world)');
  assert.deepEqual(r.shiny, [], 'shiny / metallic materials');
});

// ── vehicles & camera ─────────────────────────────────────────────────────────

test('the car stays on the road at full lock, both ways (FEATURE_LOG: "no off-road samples under full-lock steering")', async () => {
  const spot = await g.eval(() => __v2.game.jeepSpot().toArray());
  await g.teleport(spot);
  await g.press('KeyE'); await g.frames(3);
  assert.equal((await g.state()).mode, 'jeep', 'could not get in the car');
  const off = await g.eval(async () => {
    const { world } = __R, st = __v2.player.st, out = [];
    const onLot = (d) => world.LOTS?.some?.((f) => f(d));
    for (const steer of ['KeyA', 'KeyD']) {
      st.keys.add('KeyW'); st.keys.add(steer);
      for (let n = 0; n < 90; n++) {
        await new Promise((ok) => requestAnimationFrame(ok));
        const d = st.dir, nr = world.nearestRoad(d);
        if (nr && nr.dist > nr.half + 0.35 && !onLot(d)) out.push({ steer, off: +(nr.dist - nr.half).toFixed(2) });
      }
      st.keys.delete('KeyW'); st.keys.delete(steer);
      for (let n = 0; n < 30; n++) await new Promise((ok) => requestAnimationFrame(ok));
    }
    return out;
  });
  await g.press('KeyE'); await g.frames(3);
  assert.deepEqual(off.slice(0, 5), [], `${off.length} frames off the road`);
});

test('the camera never goes underground or inside the critic, walking or driving (FEATURE_LOG: camera collapsed onto her head)', async () => {
  const bad = await g.eval(async () => {
    const { world } = __R, st = __v2.player.st, cam = __v2.camera, out = [];
    const drive = async (keys, frames) => {
      for (const k of keys) st.keys.add(k);
      for (let n = 0; n < frames; n++) {
        await new Promise((ok) => requestAnimationFrame(ok));
        const d = cam.position.clone().normalize(), under = cam.position.length() - world.radiusAt(d), toHer = cam.position.distanceTo(__v2.player.root.position);
        if (under < 0.15) out.push({ keys: keys.join('+'), n, under: +under.toFixed(2) });
        if (toHer < 0.9 && !__v2.game.G.ui) out.push({ keys: keys.join('+'), n, toHer: +toHer.toFixed(2) });
      }
      for (const k of keys) st.keys.delete(k);
    };
    await drive(['KeyW'], 60); await drive(['KeyA', 'KeyW'], 60); await drive(['KeyS'], 40); await drive(['KeyD', 'KeyW', 'ShiftLeft'], 60);
    return out;
  });
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} bad camera frames`);
});

test('play opens looking at the museum (FEATURE_LOG: "squared behind the critic toward the museum", ~8° off its door)', () => {
  assert.ok(opening < 15, `camera opens ${opening.toFixed(1)}° off the museum`);
});

// ── UI ────────────────────────────────────────────────────────────────────────

test('no emoji anywhere in the UI (AGENTS.md 7b)', async () => {
  // open every panel so its text is in the DOM, then read all of it
  const found = await g.eval(async () => {
    const tick = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    const key = (code) => dispatchEvent(new KeyboardEvent('keydown', { code }));
    const texts = [];
    const grab = () => texts.push(document.body.innerText, ...[...document.querySelectorAll('[title],[aria-label],img[alt]')].map((e) => `${e.title} ${e.getAttribute('aria-label') ?? ''} ${e.alt ?? ''}`));
    grab();
    for (const k of ['KeyN', 'KeyN', 'KeyB', 'KeyB', 'KeyP', 'KeyP']) { key(k); await tick(); grab(); }
    const emoji = /\p{Emoji_Presentation}|️/gu;
    return [...new Set(texts.join('\n').match(emoji) ?? [])];
  });
  assert.deepEqual(found, [], 'emoji in the UI');
});

test('touch layout: tap targets are at least 40 px, the phone can be put away in landscape (MOBILE_REPORT fixes 3–4)', async (t) => {
  await g.page.setViewportSize({ width: 664, height: 390 });
  await g.eval(() => { document.body.classList.add('touch'); dispatchEvent(new Event('resize')); });
  await g.frames(2);
  const r = await g.eval(async () => {
    const box = (id) => { const e = document.getElementById(id); if (!e || e.classList.contains('hide') || getComputedStyle(e).display === 'none') return null; const b = e.getBoundingClientRect(); return { w: b.width, h: b.height, top: b.top, bottom: b.bottom, left: b.left, right: b.right }; };
    const small = ['caseTog', 'nbBtn', 'bagBtn', 'sndBtn'].map((id) => [id, box(id)]).filter(([, b]) => b && (b.w < 39.5 || b.h < 39.5)).map(([id, b]) => `${id} ${Math.round(b.w)}×${Math.round(b.h)}`);
    dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' }));
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    const close = box('phClose');
    dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' }));
    return { small, close, vh: innerHeight, vw: innerWidth };
  });
  await g.eval(() => document.body.classList.remove('touch'));
  await g.page.setViewportSize({ width: 960, height: 540 });
  judgeAgainst('small-tap-targets', r.small.map((x) => ({ target: x })), (o) => o.target.split(' ')[0], t);
  assert.ok(r.close && r.close.top >= 0 && r.close.bottom <= r.vh && r.close.right <= r.vw, `"put away" button off screen in landscape: ${JSON.stringify(r.close)}`);
});

test('no errors while checking the rules', () => {
  assert.deepEqual(g.errors, []);
  assert.deepEqual(g.failed, []);
});
