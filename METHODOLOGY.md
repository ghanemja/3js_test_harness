# Methodology

How this harness tests *The Vanishing Gallery* (ghanemja/art-heist), which testing practices it
follows, where those practices come from, and the evidence that the tests catch real bugs.

## 1. What is being tested, and why automated

The game is a browser three.js app with no build step. Every push to its `main` deploys live
(Netlify), so a broken import, a story step that no longer advances or a model that vanishes reaches
players at once. A survey of video-game testing found that studios still lean almost entirely on
manual play-testing, and named automation as the clearest gap [3]. This harness automates the parts
of play-testing a script can judge reliably, and leaves the rest to people (§7).

## 2. Approach

**Test the real build, the way a player meets it.** The harness doesn't import game modules into a
test runner or mock the renderer. It serves the game folder over HTTP, opens it in headless Chromium
(Playwright), waits for the same boot a player sees, and drives it with keyboard events and clicks.
This is how studio gameplay testing works: Rare's Sea of Thieves tests load the game and assert on
what happens in it [4], and Unreal's Gauntlet framework runs whole game sessions and validates the
results [6]. three.js tests its own examples the same way, by rendering them in a headless browser [7].

**Fast checks first, slow ones last (the test pyramid [8]).**

| level | suite | runs in | needs a browser |
|---|---|---|---|
| static analysis | `static` | ~2 s | no |
| asset / content validation | `models` | ~3 min | yes |
| functional (inputs, UI, vehicles, doors) | `interactions` | ~1.5 min | yes |
| end-to-end critical path | `story` | ~2 min | yes |

`run.mjs` runs `static` first and skips the browser suites if it fails, since nothing would boot.

**Deterministic driving, not real-time play.** Headless Chromium renders with software GL, which takes
seconds per frame of the full town. So between screenshots the harness switches `renderer.render` off.
The game's own loop (logic, AI, timers, the story) keeps running on its normal frame step, and tests
wait for game state (`G.act === 3`), never for wall-clock time. Shortcuts that skip *travel* (standing
the critic next to a clue instead of walking there) are allowed. Shortcuts that skip *game logic*
(setting `G.solved = true`) are not: every story beat is reached by pressing the key or clicking the
button a player would.

**Every browser suite is also a smoke test.** Any page error, `console.error`, or failed request
(a 404'd model) fails the suite, whatever the individual tests say.

## 3. Mapping to recognised practice

The ISTQB *Certified Tester – Game Testing* (CT-GaMe) syllabus [1] is the international certification
body's syllabus for game testing. It covers game mechanics, graphics, sound, localization and test
tooling. ISO/IEC/IEEE 29119 [2] is the general software-testing standard (process, documentation, techniques).

| practice | where it comes from | in this harness |
|---|---|---|
| Smoke / build verification | ISO 29119 [2]; CT-GaMe [1] | every browser suite fails on errors and 404s; `static` runs the deploy gates |
| Static analysis | ISO 29119 [2] | `static`: parse, imports ↔ exports, import map and cache tokens, asset paths |
| Game-mechanics testing | CT-GaMe [1] | `story`: data invariants, plus `judge()` checked for every suspect × every pair of clues |
| Scripted gameplay / end-to-end | Sea of Thieves [4]; Gauntlet [6] | `story`: title → "Case closed" through every act |
| Functional / input testing | CT-GaMe [1] | `interactions`: WASD, Shift, N/B/P/M/H/Esc, car, boat, doors, project cards |
| Graphics / asset validation | CT-GaMe [1] | `models`: no NaN geometry, people at the town's scale, feet on the ground, triangle budget |
| Regression baseline | ISO 29119 [2] | `tests/baseline/scene.json`: landmarks and story items must match; cost can't grow > 15% |
| Visual review artefacts | three.js e2e [7] | screenshots in `tests/output/` (reviewed by a person, not yet diffed; see §6) |
| Responsive / platform layout | CT-GaMe [1] (platform) | phone-width layout keeps its buttons on screen |

## 4. Requirements traceability

Each requirement and the test that covers it. "Requirement" means a story beat, a control, or a rule
from the game repo's `CLAUDE.md` / `AGENTS.md`.

| requirement | test |
|---|---|
| The culprit can be proven with two clues | `story` › story data… (≥2 proving clues) |
| Only the culprit + two proving clues solves the case | `story` › judge() accepts only… |
| Title → cold open → phone → play | `story` › title screen → … → play |
| Can't accuse before finding anything | `story` › act 1: Vivi briefs you… |
| Every clue is reachable and recorded | `story` › every clue can be walked up to… |
| Every suspect (and Ezra) can be talked to | `story` › every suspect… |
| Wrong accusations refused; right one solves | `story` › wrong accusations are refused… |
| Solving starts the getaway; Rex starts the countdown | `story` › act 2 → 3 |
| The countdown runs | `story` › act 3: the countdown runs down |
| Abort → police → epilogue → "Case closed" | `story` › act 3 → 4 → epilogue… |
| Movement: walk, run, stay on the ground | `interactions` › WASD…, player stays on the ground |
| Every panel opens and closes | `interactions` › N…, B…, P…, M/H…, case board |
| Car and boat: in, drive, out | `interactions` › E by the car…, E by the boat… |
| Museum door: in and back out | `interactions` › the museum door… |
| Project buildings show their card | `interactions` › a project building… |
| Phone layout keeps its buttons on screen | `interactions` › the phone layout… |
| People ≈ town scale, feet on the ground (AGENTS.md 2–3) | `models` › story people… |
| The critic loads, rigged, on the ground | `models` › the critic streamed in… |
| People under ~6k triangles (AGENTS.md 11) | `models` › triangle budget (reported as TODO, see §6) |
| No broken geometry | `models` › no mesh has NaN… |
| Every js/ module in the import map on one cache token (CLAUDE.md) | `static` › import map… |
| No deploy with missing assets | `static` › asset paths, build gates |

## 5. Evidence the tests work (mutation testing)

A test suite is only worth something if it fails when the code is wrong. Each change below was made
on purpose to the game, the relevant suite run, and the change reverted:

| injected bug | caught by | failure message |
|---|---|---|
| `park.js` imports a name `world.js` doesn't export | `static` | `park.js imports { notARealExport } but world.js does not export it` |
| Solving the case no longer starts act 2 (`G.act = 2` removed) | `story` | `closing the solved notebook did not start the getaway` (and every later act fails after it) |

Re-run these whenever the harness itself changes. A test that still passes against a broken game
is broken itself.

## 6. Known limits and gaps

- **Screenshots aren't compared automatically.** They're saved for review. Golden-image comparison
  (as three.js [7] and Playwright do) is the next step. It needs per-platform baselines, because
  software and GPU rendering differ.
- **No performance budget.** Load time and draw calls are recorded in the baseline, but frame time
  can't be measured honestly on software GL. That needs a real-GPU runner.
- **No exploratory / monkey testing.** Random input for minutes at a time, a cheap version of the
  learned exploration agents in [5], would find crashes that scripted paths miss.
- **Not run automatically yet.** The tests only protect `main` once CI runs them on every push.
- **Not covered:** audio, localization (the game is English-only), accessibility, real devices.
- **Measurement caveat:** the critic's GLB reshapes parts on the GPU, so her scale is measured from
  her skeleton, not her mesh (`models.test.mjs`).
- **Known debt surfaced by the harness:** every story person is ~84k–127k triangles against the
  ~6k budget in AGENTS.md. This is reported as a TODO, and growth beyond the baseline fails.

## 7. What stays human

Whether it *looks* right (the ink, the hand-drawn feel, faces up close), whether it *feels* right
(camera, pacing, difficulty), and whether it's *fun*. CT-GaMe treats these as tester judgement [1].
The harness supports that judgement with the screenshots in `tests/output/`; it doesn't replace it.

## References

1. ISTQB, *Certified Tester – Game Testing (CT-GaMe)*, syllabus v1.0.1 (approved Oct 2022).
   https://www.istqb.org/certifications/game-testing/ ·
   [syllabus PDF](https://www.istqb.org/wp-content/uploads/2024/11/ISTQB_CT_GaMe_Syllabus_v1.0.1_LtrKuyi.pdf)
2. ISO/IEC/IEEE 29119, *Software and systems engineering — Software testing* (parts 1–5).
3. C. Politowski, F. Petrillo, Y.-G. Guéhéneuc, "A Survey of Video Game Testing,"
   IEEE/ACM AST 2021, pp. 90–99. https://arxiv.org/abs/2103.06431
4. R. Masella (Rare), "Automated Testing of Gameplay Features in *Sea of Thieves*," GDC 2019.
   https://gdcvault.com/play/1026366/Automated-Testing-of-Gameplay-Features
5. J. Bergdahl, C. Gordillo, K. Tollmar, L. Gisslén (EA SEED), "Augmenting Automated Game Testing with
   Deep Reinforcement Learning," IEEE Conference on Games 2020, pp. 600–603. https://arxiv.org/abs/2103.15819
6. Epic Games, *Gauntlet Automation Framework* (Unreal Engine documentation).
   https://dev.epicgames.com/documentation/unreal-engine/gauntlet-automation-framework-in-unreal-engine
7. three.js end-to-end tests: headless-browser screenshots of the examples (`test/e2e` in the three.js repo).
   https://github.com/mrdoob/three.js
8. M. Fowler, "TestPyramid." https://martinfowler.com/bliki/TestPyramid.html
