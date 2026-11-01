# House rules → tests

art-heist's own rules (`CLAUDE.md`, `AGENTS.md`) and the lessons in its `FEATURE_LOG.md` /
`MOBILE_REPORT.md`, and the test that now enforces each one. The full list of ~220 checkable rules the
docs contain, with sources and thresholds, is in [`docs/rules-catalogue.md`](docs/rules-catalogue.md)
(catalogue numbers in the `#` column).

**Exceptions.** Some things are meant to break a rule: bunting hangs in the air, a cyclist's feet are on
the pedals. Each one is listed with its reason in [`tests/baseline/exceptions.json`](tests/baseline/exceptions.json),
after being checked in a screenshot. A listed exception passes; anything new that breaks the rule fails.
Entries marked **OPEN** are real findings waiting for a decision. They're recorded so the suite stays
green, and so they can't quietly get worse.

## Grounding and physics: `rules` suite

| # | rule | source | test |
|---|---|---|---|
| 8–10, 23–29 | nothing floats: every object rests on something | FL: floating planters, ladder, station door, easel card, beacons, console | nothing floats |
| 1–5, 34 | everyone's feet on the floor: story cast, citizens, shoppers, park and north folk | AGENTS.md 3; FL: feet 3–7 cm above | everyone stands on the ground |
| 105 | the car stays on the road at full lock, both ways | FL: "no off-road samples under full-lock steering" | the car stays on the road |
| 126 | the camera never goes underground or into the critic | FL: camera collapsed onto her head | the camera never goes underground |
| 129 | play opens facing the museum | FL: "squared behind the critic toward the museum" | play opens looking at the museum |

## Layout: `rules` suite

| # | rule | source | test |
|---|---|---|---|
| 39 | roads go round reserved ground; spurs may end in their own district | CLAUDE.md layout | roads go round reserved ground |
| 42 | no plant within its footprint + 0.4 of a road | FL: 9 green meshes on roads | no plant on a road |
| 46, 209 | story people out of the road and out of buildings | FL: booth and Otto in the junction | story people and clues stand clear |
| 17 | road grades: none steeper than 0.22, and recorded ones can't get steeper | FL: west roads 0.59 → 0.19 | roads are drivable grades |

## People: `rules`, `rigs`, `models` suites

| # | rule | source | test |
|---|---|---|---|
| 74 | no townsperson is a clone of the critic | AGENTS.md 1 | no townsperson is a clone |
| 75–76 | people at the town's scale | AGENTS.md 2 | `models` story people… |
| 88 | the cast idles on its own | AGENTS.md 8, 10 | people are alive when nobody moves |
| 92 | ~6k triangles per person (known debt: 84–127k) | AGENTS.md 11 | `models` triangle budget (TODO) |
| 93, 183 | everyone and every clue inked | CLAUDE.md, AGENTS.md 11 | every story person and clue is inked |
| 80 | bones keep their length (no stretched limbs) | AGENTS.md 4 | `rigs` bones keep their length |
| 81 | hands outside the torso | AGENTS.md 5 | `rigs` hands stay outside the torso |
| — | head over hips over feet, head upright | FL: the swimmer | `rigs` posture |
| — | the swimmer swims: lying along the water, head up, moving, no shadow on the water | user report 2026-10-31 ("something is wrong with the swimming"), fixed in art-heist 5ff921b | `rigs` the swimmer swims |
| 83 | the golfer golfs: on the mat, both fists on the grip, a full swing that meets the ball | user report 2026-10-31 ("same with the golfing"), fixed in 5ff921b | `rigs` the golfer golfs |
| 90–91 | gait: feet alternate, no moonwalk (planted foot forward vs the body), legs front-to-back, feet at the ground | FL: moonwalk ~70% → ~25%; legs splayed sideways | `rigs` the critic walks / runs, townsfolk walk |

## Art style: `rules` suite

| # | rule | source | test |
|---|---|---|---|
| 184–185 | smooth (no flatShading), matte (no shiny PBR), no tone mapping | CLAUDE.md bevels; FL: "no shine, no chrome" | smooth, matte, as painted |

## UI: `rules` and `interactions` suites

| # | rule | source | test |
|---|---|---|---|
| 135 | no emoji anywhere in the UI | AGENTS.md 7b | no emoji anywhere in the UI |
| 144–147 | touch tap targets ≥ 40 px; the phone can be put away in landscape | MOBILE_REPORT fixes 3–4 | touch layout |
| 152 | controls strip; H hides it; hidden on phones | FL | `interactions` M/H, phone layout |

## Wiring and assets: `static` suite

| # | rule | source | test |
|---|---|---|---|
| 190 | every module in the import map on main.js's cache token | CLAUDE.md | import map… |
| 192, 195 | build gates pass; no missing asset paths | CLAUDE.md, DEPLOY.md | Netlify build gates; asset paths |
| 173 | models the app loads: textures ≤ 512² WebP, ≤ 1.5 MB | CLAUDE.md asset pipeline | loaded models stay in budget |

## Story: `story` suite

| # | rule | source | test |
|---|---|---|---|
| 200–206 | the whole case plays through; only the right accusation solves it | FL | the playthrough tests |

## Not automated yet

These come from the catalogue and are worth adding next, roughly in order of how often the log shows them breaking:
- **z-fighting** (61, 67, 68): coplanar surfaces too close together.
- **Draw-call and triangle budgets** at fixed spots (160–161).
- **Talk camera line of sight** (123).
- **Every road drivable** end to end (116).
- **Cornice and trim fit** (54).
- **Critic colours** by piece (94).
- **Audio spectrum** (178).

The catalogue marks the ones that need human eyes (S-profile shoes, faces, hair).
