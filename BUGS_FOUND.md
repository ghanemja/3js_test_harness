# Bugs the harness found

A running log of what this harness has turned up in *The Vanishing Gallery* (ghanemja/art-heist).
It keeps three kinds of finding apart:

1. **Real bugs**: in the shipped game, confirmed, then fixed or recorded.
2. **Open findings**: real measurements that break a stated rule, waiting on a human decision. They're
   recorded in `tests/baseline/exceptions.json` so they can't quietly get worse.
3. **Planted bugs**: mistakes made on purpose to prove the tests catch them. They aren't bugs in the game,
   but they show what a test would do the day the real thing happens.

Each one also says honestly *how* it was found. Some were spotted by a person and then pinned down and
guarded by the harness; others the harness found on its own.

---

## 1. Real bugs

### The swimmer was a standing person sunk to her chest
- **Found:** spotted by eye (the user's screenshot: "a head on a red blob" in the pool), then root-caused
  with the harness's tools. The harness's posture check *didn't* catch it at first; that gap is now a test.
- **Cause:** nobody had made her swim. She was an ordinary townsperson in the *walking* pose, sunk to the
  chest and slid back and forth. The red "blob" was her T-shirt, and her shadow was drawn on the water.
- **Fix:** art-heist `5ff921b`. Breaststroke built with arm IK, a frog kick, turns at each end, a swim cap,
  and the pool shader draws her body lying along the water.
- **Guard:** `rigs` › *the swimmer swims*. On the old build: `body upright in 100% of frames — standing in
  the pool, not swimming`. Passes on the fix.

### The golfer floated, held the club in one wrist, and never swung
- **Found:** the user reported "same with the golfing"; the harness measured what was wrong.
- **Cause:** three bugs.
  - He stood ~0.09 above the mat: a lift was added on top of a floor height that already included the mat.
  - The club was attached to one wrist bone, so the shaft came straight out of the wrist.
  - His "swing" only waved the arms sideways.
- **Fix:** `5ff921b`. Set on the mat by a raycast, both fists on the grip (IK), a real 7-second swing that
  meets the ball, and leg IK for planted feet.
- **Guard:** `rigs` › *the golfer golfs*. On the old build: `fists up to 0.141 apart — not both on the grip`,
  and ankles never lower than 0.126 over the mat (0.034 after the fix).

### Every story character is ~15–20× over the triangle budget
- **Found:** by the harness, on its first run (`models`).
- **What:** AGENTS.md sets ~6k triangles per person. Vivi 84k, Otto 86k, Pia 110k, Rex 127k, Ezra 126k.
  About half of each is the ink-outline hull, which doubles every mesh.
- **Status:** recorded as known debt. A test fails if any of them grows further.

### Walkers' planted feet skate along the ground
- **Found:** by the harness (`rigs` gait measurements).
- **What:** in a clean walk the planted foot stays put while the body passes over it. Here, every walker's
  planted foot slides about 0.9–1.0× the distance the body travels. This affects the critic and the
  Citizen Maker townsfolk alike.
- **Status:** reported, not failed (it's town-wide animation quality). The moonwalk the feature log
  once fixed, a planted foot moving *forward* relative to the body, has *not* come back: 26–45% of frames,
  against ~70% when it was broken.

---

### Run against the live site, 2026-11-01: a regression on `main`
Since the last green run, `main` gained distance LOD, a mini map and reworked roads. The harness was run
against it unchanged (`GAME_DIR` → a checkout of `origin/main` at `ead09d7`). static, interactions and rigs
passed; story, models and rules failed:
- **The ladder clue lost its painted sketch** (`story` › *story data*: `clues with no painted sketch: ['ladder']`).
  The clue card would show without its picture. This is a real regression; everything else in the
  playthrough still works end to end.
- **Shader programs grew 53 → 68** (`models` › *scene baseline*). Probably the LOD work's new materials. A
  budget question for the author, not a bug.
- **Five new "floating" objects and one person 0.24 off the ground** (`rules`), each photographed by the
  failing test:
  - **The river bridge:** expected (a bridge spans water) and becomes an exception.
  - **Borrowed Eyes (1.04) and the parked train at the station (0.72):** look grounded from a distance;
    open until someone looks up close.
  - **QR Compass's shop and car park:** ~6 cm, minor.
- **Road grades:** the road network was rebuilt, so roads have new numbers. Five roads at 0.27–0.94 now
  read as new offenders. Road 15 at 0.94 is close to a wall, so it's either a real kink or a bridge ramp
  measured wrongly. Open.

## 2. Open findings (a human decides)

| finding | measured | rule it breaks | note |
|---|---|---|---|
| DeckGPT, Splatform and QR Compass shops each have a gap under one edge | ~0.11–0.12 | "nothing floats"; FEATURE_LOG: flat slabs lift at the ends on a radius-40 planet | invisible from a distance; needs a close look |
| Six roads steeper than the log's 0.19 | 0.24–0.70 grade | FEATURE_LOG: "worst west grade now 0.19" | may be real hills or bridge ramps; recorded so none can get steeper |
| The sound button on touch screens | 36 px tall | MOBILE_REPORT: tap targets toward 40–44 px | small fix |
| Tyre ruts have no ink outline | — | CLAUDE.md: the ink outline is the signature look | probably intended (ground marks, like the road slabs), needs confirming |
| One citizen (Ada) measures 0.39 below ground in the numbers | −0.39 | "everyone's feet on the floor" | looks right on screen; likely how her model hides skin under clothes |

---

## 3. Planted bugs (proof the tests work)

| planted mistake | caught by | how it failed |
|---|---|---|
| Solving the case no longer starts act 2 | `story` | `closing the solved notebook did not start the getaway`, and every later act failed after it |
| An import of a name the module doesn't export | `static` | `park.js imports { notARealExport } but world.js does not export it` |
| A model with 1110×1425 JPEG textures dropped into the townsfolk folder | `static` | `a 1110×1425 texture (max 512²)`, `a jpeg texture (should be WebP)`, `1.96 MB` |
| **Worked example:** a new benches module left out of the import map | `static` | `modules missing from the import map: 'benches.js'` in 3 s |
| **Worked example:** benches placed at the path's height over a falling lawn | `rules` | *nothing floats* named both benches (`gap: 0.281, near: 'museum-garden'`) and saved a photo of each |

---

## 4. Bugs in the harness itself (and what they taught it)

A checker run over a real 3D world finds *its own* mistakes first. Each of these was caught by looking
at a screenshot before trusting a number:
- **The critic "measured 8.6 units tall."** Her model reshapes parts on the GPU, so skinning her on the
  CPU flings some vertices far away. She's now measured by her skeleton.
- **Five floating "bugs" were the bunting.** It's strung across Main Street, meant to hang in the air.
  This led to *reviewed exceptions*: each one is checked in a screenshot and recorded with a reason, and
  anything new still fails.
- **The launch console "floated 0.86."** It sat on the grass in the photo, but the drawn ground at the cape
  isn't where the analytic ground says. The check now casts its ray from above each low point.
- **"Everyone sank 0.4."** The Citizen Maker models hide skin under clothes with collapsed triangles.
  These are now skipped, because they're never drawn.
- **"The critic moonwalks 98% of the time."** The harness was using the wrong metric. It now uses the
  feature log's own: the planted foot's motion relative to the body.
- **Road exceptions were keyed by road number.** When `main` rebuilt its road network the numbers changed,
  so recorded exceptions stopped matching and old roads showed up as "new". They need a stable key, such as
  where the road starts and ends.
- **A first, mistaken "planted" bench didn't float at all.** The lawn there was level with the path, so
  the test correctly passed it. The example was moved to where the ground actually falls away.

---

## How to add to this log

When a run turns up something new, add it under the right heading with: how it was found, what the
measurement was, the rule it breaks, and what happened (fixed in `<commit>`, recorded as an exception,
or still open).
