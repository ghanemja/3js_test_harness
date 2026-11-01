// Screenshots of each area the harness tests, for the README's "what gets tested" chart.
//   node docs/capture-gallery.mjs            (game checked out next to this repo, or GAME_DIR=…)
// Writes tests/output/gallery-*.png; docs/build-figures.mjs lays them out into docs/img/.
import { bootGame } from '../tests/lib/game.mjs';

const g = await bootGame({ width: 960, height: 540 });
await g.fast();
await g.until(() => __v2.player.critic?.inst && __v2.citizens.list.length >= 8, null, 180_000);
const cam = (fn) => g.eval(fn);                                 // (camera rigs below run in the page)
const shoot = async (name, opts) => { await g.frames(3); console.log(await g.shot(`gallery-${name}`, opts)); };

// story: the title page
await shoot('story-title');
await g.startPlay();
// UI: the case board + waypoint as you start; then the notebook
await g.frames(10); await shoot('ui-board');
await g.press('KeyN'); await g.frames(3); await shoot('ui-notebook'); await g.press('Escape');
// camera: walk up to Vivi and talk — the over-the-shoulder conversation camera
await g.goTo('vivi'); await g.press('KeyE'); await g.frames(30); await shoot('camera-talk');
for (let i = 0; i < 6; i++) { await g.press('KeyE'); await g.frames(2); }
// people & style: Pia up close
await cam(() => {
  const { THREE, world } = __T, it = __v2.game.items.find((i) => i.id === 'pia'), p = it.obj.position.clone(), up = p.clone().normalize();
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(it.obj.quaternion).projectOnPlane(up).normalize();
  __v2.player.st.camHook = (c) => { c.position.copy(p).addScaledVector(fwd, 2.3).addScaledVector(up, 0.9); c.up.copy(up); c.lookAt(p.clone().addScaledVector(up, 0.65)); };
});
await shoot('people-pia', { noUI: true });
// grounding: the forecourt from shoe height — feet on the paving
await cam(() => {
  const { THREE } = __T, it = __v2.game.items.find((i) => i.id === 'vivi'), p = it.obj.position.clone(), up = p.clone().normalize();
  const side = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0.3, 1, 0.2)).normalize();
  __v2.player.st.camHook = (c) => { c.position.copy(p).addScaledVector(side, 2.2).addScaledVector(up, 0.25); c.up.copy(up); c.lookAt(p.clone().addScaledVector(up, 0.3)); };
});
await shoot('grounding-feet', { noUI: true });
// layout: the museum, its roads and the town from above
await cam(() => {
  const z = __v2.ZONES.find((z) => z.key === 'museum'), c = z.dir.clone().multiplyScalar(40), up = z.dir.clone();
  const north = new __T.THREE.Vector3(0, 1, 0).projectOnPlane(up).normalize();
  __v2.player.st.camHook = (k) => { k.position.copy(c).addScaledVector(up, 28); k.up.copy(north); k.lookAt(c); };
});
await shoot('layout-above', { noUI: true });
await cam(() => { __v2.player.st.camHook = null; __v2.player.st.camInit = false; });
// driving: in the car on the road, seen from behind and above as you drive
await g.teleport(await g.eval(() => __v2.game.jeepSpot().toArray()));
await g.press('KeyE'); await g.frames(3);
await g.eval(async () => { const st = __v2.player.st; st.keys.add('KeyW'); for (let n = 0; n < 60; n++) await new Promise((ok) => requestAnimationFrame(ok)); });
await cam(() => {
  const { THREE } = __T, r = __v2.player.root;
  __v2.player.st.camHook = (c) => { const p = r.position.clone(), up = p.clone().normalize(), fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(r.quaternion).projectOnPlane(up).normalize();
    c.position.copy(p).addScaledVector(fwd, -6.5).addScaledVector(up, 3.4); c.up.copy(up); c.lookAt(p.clone().addScaledVector(fwd, 1.5)); };
});
await shoot('driving', { noUI: true });
await g.eval(() => { __v2.player.st.keys.delete('KeyW'); __v2.player.st.camHook = null; });
await g.frames(20); await g.press('KeyE'); await g.frames(5);
// gait: the critic mid-stride, the camera keeping pace beside her
await g.eval(() => { __v2.player.st.keys.add('KeyW'); });
await cam(() => {
  const { THREE } = __T, r = __v2.player.root;
  __v2.player.st.camHook = (c) => { const p = r.position.clone(), up = p.clone().normalize(), fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(r.quaternion).projectOnPlane(up).normalize(), side = new THREE.Vector3().crossVectors(up, fwd);
    c.position.copy(p).addScaledVector(side, 2.6).addScaledVector(up, 0.7); c.up.copy(up); c.lookAt(p.clone().addScaledVector(up, 0.55)); };
});
await g.frames(20);
await shoot('gait-stride', { noUI: true });
await g.eval(() => { __v2.player.st.keys.delete('KeyW'); });
await g.close();
