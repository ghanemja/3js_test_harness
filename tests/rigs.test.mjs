// GAIT & RIGGING — every rigged person in town (the critic, the story cast and the other folk
// built by folk.js, the Citizen Maker bystanders) has a sound skeleton, holds a believable posture,
// and walks properly: feet alternate, the planted foot grips the ground instead of sliding (the
// "moonwalk" in FEATURE_LOG), legs swing front-to-back (not sideways), feet stay at the ground.
// Rules: AGENTS.md 4, 5, 6, 8, 10; FEATURE_LOG (moonwalk, splayed legs, swimmer, golfer…).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { bootGame, OUT } from './lib/game.mjs';
import { exceptionsFor } from './lib/exceptions.mjs';

const X = exceptionsFor();
let g;

before(async () => {
  g = await bootGame();
  await g.fast();
  await g.until(() => __v2.player.critic?.inst && __v2.citizens.list.length >= 8, null, 180_000);
  await g.startPlay();
  await g.frames(10);
  await g.eval(async () => {
    const { THREE, world } = __T, { STANCES } = await import('./js/folk.js');
    const v = new THREE.Vector3();
    const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const W = (o) => o && o.getWorldPosition(new THREE.Vector3());
    const byName = (root, n) => { let f = null; root.traverse((b) => { if (!f && b.name === n) f = b; }); return f; };
    const stanceName = (s) => (typeof s === 'string' ? s : Object.keys(STANCES).find((k) => STANCES[k] === s)) ?? 'none';
    // every rigged person as one shape: { who, kind, root, j: { hips, neck, head, footL, footR, handL, handR, gripL, gripR } }
    function people({ all = false } = {}) {
      const out = [];
      const zone = (o) => world.zoneHit(W(o).normalize(), 6)?.key ?? 'town';
      __v2.scene.traverse((o) => {
        const h = o.userData.human; if (!h?.J || (!all && !shown(o))) return;
        const it = __v2.game.items.find((i) => i.obj === o);
        const w = __v2.game.walkers.find((x) => x.obj === o);
        const st = stanceName(h.stance);
        out.push({ who: it ? `person:${it.id}` : w ? `walker:${w.id}` : `folk:${st}@${zone(o)}`, kind: 'folk', root: o, stance: st, seated: !!it?.seated, j: h.J });
      });
      const c = __v2.player.critic.inst;
      out.push({ who: 'critic', kind: 'critic', root: __v2.player.root, stance: 'player', j: { hips: c.bones.hips, neck: c.bones.neck, head: c.bones.head, footL: c.bones.footL, footR: c.bones.footR, handL: c.bones.handL, handR: c.bones.handR } });
      for (const cz of __v2.citizens.list) {
        if (!all && !shown(cz.root)) continue;
        const r = cz.body ?? cz.root;
        out.push({ who: `citizen:${cz.id}`, kind: 'citizen', role: cz.role, root: cz.root, stance: cz.role, j: { hips: byName(r, 'root'), neck: byName(r, 'neck01'), head: byName(r, 'head'), footL: byName(r, 'footL'), footR: byName(r, 'footR'), handL: byName(r, 'wristL'), handR: byName(r, 'wristR') } });
      }
      return out;
    }
    // track people's feet while something happens: per frame, each foot's height over the ground and its
    // motion along / across the way the body moved
    async function gait(p, frames, drive) {
      const up = () => W(p.root).normalize();
      const s = [];
      for (let n = 0; n < frames; n++) {
        drive?.(n);
        await new Promise((ok) => requestAnimationFrame(ok));
        p.root.updateWorldMatrix(true, true);
        const body = W(p.j.hips), L = W(p.j.footL), R = W(p.j.footR), u = up();
        const gh = (q) => q.length() - world.standAt(q.clone().normalize());
        s.push({ body, L, R, hL: gh(L), hR: gh(R), u });
      }
      let fwdSlide = 0, planted = 0, switches = 0, lat = 0, along = 0, minH = 1e9, maxLow = -1e9, moved = 0, lower = null, slip = 0;
      for (let n = 1; n < s.length; n++) {
        const a = s[n - 1], b = s[n], db = b.body.clone().sub(a.body).projectOnPlane(b.u), step = db.length();
        moved += step; if (step < 0.004) continue;
        const fwd = db.clone().normalize(), side = new THREE.Vector3().crossVectors(b.u, fwd);
        const low = b.hL < b.hR ? 'L' : 'R'; if (lower && low !== lower) switches++; lower = low;
        const f0 = a[low], f1 = b[low], df = f1.clone().sub(f0).projectOnPlane(b.u);
        // FEATURE_LOG's measure: relative to the body, a planted foot moves BACKWARD (the body passes over it);
        // forward means it's being dragged ahead — the moonwalk. (slip: how far it skates over the ground)
        planted++; if (df.dot(fwd) - step > 0) fwdSlide++; slip += Math.abs(df.dot(fwd));
        for (const k of ['L', 'R']) { const d = b[k].clone().sub(a[k]).sub(db).projectOnPlane(b.u); along += Math.abs(d.dot(fwd)); lat += Math.abs(d.dot(side)); }
        minH = Math.min(minH, b.hL, b.hR); maxLow = Math.max(maxLow, Math.min(b.hL, b.hR));
      }
      return { frames: s.length, moved: +moved.toFixed(2), switches, slip: planted ? +(slip / moved).toFixed(2) : null, slideFrac: planted ? +(fwdSlide / planted).toFixed(2) : null, lateralRatio: along ? +(lat / along).toFixed(2) : null, minFootH: +minH.toFixed(3), maxLowFootH: +maxLow.toFixed(3) };
    }
    const frame = () => new Promise((ok) => requestAnimationFrame(ok));
    // visit everyone: stand a little off each person (far-away life is hidden and frozen until you're near),
    // let the town catch up, then measure them — fn(p) returns a finding or null
    async function tour(fn, filter = () => true) {
      const st = __v2.player.st, out = [], home = st.dir.clone();
      for (const p of people({ all: true }).filter((p) => p.who !== 'critic').filter(filter)) {
        st.dir.copy(W(p.root).normalize()).multiplyScalar(40).add(new THREE.Vector3(1.2, 1.2, 1.2)).normalize();
        for (let n = 0; n < 8; n++) await frame();
        if (!shown(p.root)) continue;
        p.root.updateWorldMatrix(true, true);
        const r = await fn(p); if (r) out.push(r);
      }
      st.dir.copy(home); for (let n = 0; n < 4; n++) await frame();
      return out;
    }
    window.__G = { THREE, world, W, people, gait, shown, tour, frame };
  });
});
after(async () => { writeFileSync(`${OUT}rigs-report.json`, JSON.stringify(X.report, null, 2)); X.save(); await g?.close(); });

// ── the skeleton ──────────────────────────────────────────────────────────────

test('every bone and joint has a finite transform', async () => {
  const bad = await g.eval(() => {
    const out = [];
    __v2.scene.traverse((o) => { if ((o.isBone || o.parent?.userData?.human) && !o.matrixWorld.elements.every(Number.isFinite)) out.push(o.name || o.type); });
    return out;
  });
  assert.deepEqual(bad, []);
});

test('bones keep their length: no limb stretched or squashed by a pose (AGENTS.md 4: smooth skinned joints)', async (t) => {
  const bad = await g.eval(() => {
    const { THREE, shown } = __G, out = [], seen = new Set(), inv = new THREE.Matrix4(), a = new THREE.Vector3(), b = new THREE.Vector3();
    __v2.scene.traverse((m) => {
      if (!m.isSkinnedMesh || !shown(m) || seen.has(m.skeleton)) return;
      seen.add(m.skeleton);
      m.skeleton.update(); m.updateWorldMatrix(true, false); inv.copy(m.matrixWorld).invert();
      const bones = m.skeleton.bones, bind = m.skeleton.boneInverses.map((bi) => new THREE.Matrix4().copy(bi).invert());
      // each bone's length now ÷ at bind; a rig scaled as a whole (the Citizen Maker models are) scales them
      // all alike, so each is judged against its skeleton's median — only a limb stretched on its own shows
      const ks = [];
      bones.forEach((bone, i) => {
        const pi = bones.indexOf(bone.parent); if (pi < 0) return;
        const restLen = new THREE.Vector3().setFromMatrixPosition(bind[i]).distanceTo(new THREE.Vector3().setFromMatrixPosition(bind[pi]));
        if (restLen < 1e-3) return;
        a.setFromMatrixPosition(bone.matrixWorld).applyMatrix4(inv); b.setFromMatrixPosition(bone.parent.matrixWorld).applyMatrix4(inv);
        ks.push([bone.name || `#${i}`, a.distanceTo(b) / restLen]);
      });
      const med = ks.map(([, k]) => k).sort((x, y) => x - y)[ks.length >> 1] || 1;
      let owner = ''; for (let p = m.parent; p && !owner; p = p.parent) owner = p.name;
      for (const [bone, k] of ks) { const r = k / med; if (r < 0.8 || r > 1.25) out.push({ bone, ratio: +r.toFixed(2), owner }); }
    });
    return out;
  });
  X.judge('bone-stretch', bad, (o) => `${o.owner}/${o.bone}`, t);
});

// ── posture ───────────────────────────────────────────────────────────────────

test('posture: head over hips over feet, head upright (FEATURE_LOG: the swimmer\'s head tipped on its side)', async (t) => {
  const bad = await g.eval(() => {
    const { THREE, W, tour } = __G, seenPeople = [];
    return tour((p) => {
      const { hips, neck, head, footL, footR } = p.j;
      if (!hips || !head || !footL || !footR) return { who: p.who, problem: 'missing joints' };
      const up = W(p.root).normalize(), h = (o) => W(o).dot(up);
      const problems = [];
      if (h(head) - h(hips) < 0.2) problems.push(`head only ${(h(head) - h(hips)).toFixed(2)} above the hips`);
      if (!p.seated && Math.max(h(footL), h(footR)) > h(hips) - 0.15) problems.push('a foot level with the hips');
      // the head's own up: folk heads are built +Y up; a GLB rig's head points along neck → head
      const hu = p.kind === 'folk' ? new THREE.Vector3(0, 1, 0).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion())) : W(head).sub(W(neck ?? hips)).normalize();
      const tilt = Math.acos(Math.min(1, Math.max(-1, hu.dot(up)))) * 180 / Math.PI;
      if (tilt > 55) problems.push(`head tilted ${tilt.toFixed(0)}°`);
      seenPeople.push(`${p.who} ${tilt.toFixed(0)}°`);
      return problems.length ? { who: p.who, problem: problems.join('; ') } : null;
    }).then((out) => ({ out, seenPeople }));
  });
  t.diagnostic(`head tilt, everyone toured: ${bad.seenPeople.join(', ')}`);
  X.judge('posture', bad.out, (o) => `${o.who}: ${o.problem.replace(/[-\d.]+/g, '#')}`, t);
});

test('hands stay outside the torso (AGENTS.md 5: "no part of an arm or hand may be inside the torso")', async (t) => {
  const bad = await g.eval(async () => {
    const { THREE, W, tour } = __G, seg = new THREE.Line3(), q = new THREE.Vector3();
    return (await tour((p) => {
      const { hips, neck, handL, handR } = p.j; if (!hips || !neck) return null;
      seg.set(W(hips), W(neck));
      const out = [];
      for (const [side, hand] of [['L', handL], ['R', handR]]) {
        if (!hand) continue;
        const d = seg.closestPointToPoint(W(hand), true, q).distanceTo(W(hand));
        if (d < 0.05) out.push({ who: p.who, hand: side, fromSpine: +d.toFixed(3) });
      }
      return out.length ? out : null;
    }, (p) => p.kind === 'folk')).flat();
  });
  X.judge('hand-in-torso', bad, (o) => `${o.who}:${o.hand}`, t);
});

test('a club is held in both hands (FEATURE_LOG: "same with the golfing")', async () => {
  const r = await g.eval(() => {
    const { W, tour } = __G;
    return tour((p) => ({ who: p.who, apart: p.j.gripL && p.j.gripR ? +W(p.j.gripL).distanceTo(W(p.j.gripR)).toFixed(3) : null }), (p) => p.stance === 'golf');
  });
  assert.ok(r.length, 'no golfer found (stance "golf")');
  for (const o of r) assert.ok(o.apart != null && o.apart < 0.15, `${o.who}: hands ${o.apart} apart — not both on the club`);
});

// ── gait ──────────────────────────────────────────────────────────────────────

const GAIT = (m, what) => {
  assert.ok(m.moved > 0.4, `${what} barely moved (${m.moved})`);
  if (m.moved >= 1.5) assert.ok(m.switches >= 2, `${what}: feet never alternate over ${m.moved} units (${m.switches} switches)`);   // (a shuffle while waiting to cross takes one step)
  // FEATURE_LOG: the moonwalk had the planted foot moving forward (relative to the body) in ~70% of frames; fixed, ~25%.
  // Sampled per frame here the healthy walks read 26–39%, so the line sits between the two: 55%.
  assert.ok(m.slideFrac < 0.55, `${what}: the planted foot moves forward in ${Math.round(m.slideFrac * 100)}% of steps — moonwalking (FEATURE_LOG: ~70% broken, ~25% fixed)`);
  assert.ok(m.lateralRatio < 0.6, `${what}: feet swing sideways (lateral/forward ${m.lateralRatio}) — legs splayed, not front-to-back`);
  // (foot joints sit at the ankle, and a kerb edge shifts the ground lookup by ~0.15: these catch gross failures)
  assert.ok(m.maxLowFootH < 0.35, `${what}: the lower foot rises ${m.maxLowFootH} off the ground mid-walk — floating`);
  assert.ok(m.minFootH > -0.25, `${what}: a foot sinks ${m.minFootH} into the ground`);
};

test('the critic walks properly: alternating feet, no foot slide, legs front-to-back', async (t) => {
  await g.teleport(await g.eval(() => __v2.game.jeepSpot().toArray()));
  await g.eval(() => { const st = __v2.player.st, nr = __T.world.nearestRoad(st.dir); if (nr) { st.heading.copy(nr.tangent).projectOnPlane(st.dir).normalize(); st.camFwd.copy(st.heading); st.camYaw = 0; } });
  const m = await g.eval(async () => {
    const st = __v2.player.st, p = __G.people().find((x) => x.who === 'critic');
    try { return await __G.gait(p, 90, () => { st.keys.add('KeyW'); }); }
    finally { st.keys.delete('KeyW'); st.keys.delete('KeyA'); }
  });
  t.diagnostic(JSON.stringify(m));
  GAIT(m, 'the critic walking');
});

test('the critic runs properly (Shift)', async (t) => {
  await g.teleport(await g.eval(() => __v2.game.jeepSpot().toArray()));
  await g.eval(() => { const st = __v2.player.st, nr = __T.world.nearestRoad(st.dir); if (nr) { st.heading.copy(nr.tangent).projectOnPlane(st.dir).normalize(); st.camFwd.copy(st.heading); st.camYaw = 0; } });
  const m = await g.eval(async () => {
    const st = __v2.player.st, p = __G.people().find((x) => x.who === 'critic');
    try { return await __G.gait(p, 80, () => { st.keys.add('KeyW'); st.keys.add('ShiftLeft'); }); }
    finally { st.keys.delete('KeyW'); st.keys.delete('ShiftLeft'); }
  });
  t.diagnostic(JSON.stringify(m));
  GAIT(m, 'the critic running');
});

test('townsfolk walk properly: every walking citizen and Main Street walker', async (t) => {
  const results = await g.eval(async () => {
    return __G.tour(async (p) => ({ who: p.who, ...(await __G.gait(p, 90)) }), (p) => p.role === 'walk' || p.who.startsWith('walker:'));
  });
  t.diagnostic(`${results.length} walkers: ${results.map((r) => r.who).join(', ')}`);
  assert.ok(results.length >= 4, `only ${results.length} walkers found`);
  const fails = [];
  for (const m of results) {
    if (m.moved < 0.4) continue;                      // stopped for a moment (waiting to cross, chatting): nothing to judge
    try { GAIT(m, m.who); } catch (e) { fails.push({ who: m.who, problem: e.message.split('\n')[0].replace(/^[^:]+: /, ''), m }); }
  }
  X.judge('gait', fails, (o) => `${o.who}: ${o.problem.replace(/[-\d.]+%?/g, '#')}`, t);
});

test('no errors while checking rigs and gaits', () => {
  assert.deepEqual(g.errors, []);
  assert.deepEqual(g.failed, []);
});
