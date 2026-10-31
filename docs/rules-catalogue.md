# Rules catalogue — every checkable rule and lesson in art-heist's docs

Extracted from art-heist's `CLAUDE.md`, `AGENTS.md`, `FEATURE_LOG.md`, `MOBILE_REPORT.md` and `DEPLOY.md`
(as of 2026-10-31). This is the source list the tests are built from; [`RULES.md`](../RULES.md) says which
of these are automated and by which test. "FL:N" = FEATURE_LOG.md line N at that date.



**How to read it:**
- "FL:N" means FEATURE_LOG.md line N.
- **[MAIN]** = the main app (`js/`, `index.html`). **[CLASSIC]** = only `planet.js` / `classic.html`. **[BOTH]** = shared code such as `museum.js`.
- Statuses matter for some items:
  - ✅ = done and verified.
  - 🟡 = done, needs a live check.
  - ⏳ = in progress (a known bug, so a test may fail today).
- One existing harness is mentioned at FL:10: `ghanemja/3js_test_harness`, with suites static, story, interactions and models, a baseline in `tests/baseline/scene.json`, and a known finding that story people are 84k–127k tris against a 6k budget.

---

## 1. Grounding / floating / sinking

1. **people-feet-on-ground**: "Every person has shoes … that sit exactly on the floor: place people with `settle(..., sink = 0)`, never the prop sink." Source: AGENTS.md rule 3; FL:99. Measure: for every folk, citizen, plaza shopper and park person, the lowest skinned shoe-sole vertex (in world space, along the local up) should be about 0 from `standAt(x,z)`. The past bug was feet 3–7 cm above the drawn surface (FL:139). Suggested tolerance about ±0.01. [MAIN]
2. **standAt-uses-drawn-surface**: `standAt` must land on the highest *drawn* upward surface, not the analytic ground. Before the fix the drawn surfaces (forecourt, roads on slopes, double-sided road ribbons) sat "3–7 cm above" the computed ground. It casts a ray onto static geometry, cached per 0.2-unit patch, at about 0.001 ms per lookup (FL:139). Measure: at sample points on roads, slopes and the forecourt, compare `standAt` with a raycast down onto the scene; gap should be under 0.01. A lookup-time budget could also be asserted. [MAIN]
3. **people-stand-on-road-ribbons**: "people stand on the road ribbons too (`standAt` = ground/floor + road lift)" (FL:113). Measure: anyone standing where `onRoad` is true has feet at the road-surface height, not `groundAt`. [MAIN]
4. **raised-floors-registered**: "Raised floors (forecourt, platforms) must be registered with `addFloor`" (AGENTS.md 3; FL:91 "no more sinking"). Measure: `groundAt` or `standAt` on the museum forecourt, station platform, quay, pier, train-carriage floor, bridge deck and service ramp returns the drawn floor height. [MAIN]
5. **player-not-sinking**: "player sinking into the floor" (FL:88) and "Her feet sink into the floor" (FL:112). Measure: the critic's sole height compared with `standAt` while idle and walking over the forecourt, roads, platform and steps. [MAIN]
6. **step-up-ring-sampling**: "She walks into the museum steps … Her footing now samples a ring round her feet: a raised floor lifts her as soon as a shoe lands on it, and anything too tall to step is a wall she slides along. The stand cache measures each cell at its centre (no more edge flicker)" (FL:246). Measure:
   - Walk the player into the forecourt risers: she should rise, with no shoe inside a riser.
   - Walk her into a tall obstacle: she should slide, not climb.
   - Repeated `standAt` near cell edges should not flicker. [MAIN]
7. **no-floating-on-hedges**: ⏳ "she floats standing on top of hedges" (FL:333). Measure: walk into hedges; the player's height must not jump to hedge-top height. [MAIN, known open]
8. **flat-slab-curvature**: "a flat 9-unit slab on a radius-40 planet lifts ~0.3 at its ends" (FL:72; CLAUDE.md curvature paragraph). Every structure must go through `placeOnPlanet()`, which "lays every vertex onto the terrain under it". Measure: for building, platform and pavement bottom vertices, distance to `groundAt` along the local up should be about 0 at both ends. Station platform gap is the past bug. [MAIN]
9. **landscaping-no-float**: "nothing in the landscaping may float" (FL:298). Laid onto the mesh *as drawn* (`drawnGroundAt`, `placeOnPlanet {drawn}`), subdivided to 0.35. Draped surfaces sit 0.01 over the ground; bevelled boxes sink their bevel. The existing check was "82,908 parts + 18,384 paving samples, **max gap 0.017, max sink 0.009**, no offenders". Measure: re-run that check over the grounds parts. [MAIN; the museum gardens are off unless `?grounds=1` (FL:309)]
10. **plants-grounded**: "Every plant is seated on the ground as drawn … Grounding check: **max gap 0.014, 0 offenders**" (FL:315). Measure: the lowest vertex of each plant compared with `drawnGroundAt`. [MAIN]
11. **ground-mesh-density**: [CLASSIC] icosahedron detail 6 (about 4.5-unit triangles) let triangle middles sag "~0.08 below roads/buildings"; now detail 44 (about 0.7-unit triangles) (FL:165). Main-app analogue: the drawn planet mesh compared with the analytic height at triangle centroids.
12. **roads-draped-across-width**: "each ribbon is now draped across its width too (one height per cross-section tilted it on the museum's levelled slope, so grass bit through one edge and the other floated) and sits on the highest ground near each vertex" (FL:55). Measure: at both edges of each road cross-section, road vertex height minus `drawnGroundAt` must be ≥0 and small. [MAIN]
13. **road-near-shops-height**: "the road surfaces near them sit within **~0.15** of the ground" (FL:281). [MAIN]
14. **museum-forecourt-above-lawn**: the forecourt lawn must stay "**0.35 below the paving**" (FL:283 URGENT regression; re-asserted at FL:295, 298, 308). Measure: forecourt paving height minus `groundAt` of the surrounding lawn should be about 0.35. Lawn covering the paving was the bug. [MAIN]
15. **museum-tangent-plane**: the ground under the museum is a true tangent plane. Curved edges had been "~0.6 low → floating planters, slanted look" (FL:117). The plane covers r 9.5 and eases out over 16 (FL:308). Measure: `groundAt` across the museum footprint is flat in the museum frame, and the planters' bases touch it. [MAIN]
16. **no-ridge-past-museum-plane**: the plane once threw up "a ~5-high ridge 12–17 from the museum"; it should now be "max ~2.3, gentle" (FL:281). Measure: terrain-height profile along rays from the museum centre. [MAIN]
17. **road-grade-max**: "west roads climbed grades of up to 0.59 … worst west grade now **0.19**" (FL:308). Measure: slope between consecutive `ROADS` samples. [MAIN]
18. **tyres-on-ground / car-fitToGround**: "The car sits on its four contact patches (`fitToGround`: pitch, roll and lift from the ground under each wheel), parked and driving" (FL:135). Measure: for each wheel bottom, distance to `standAt` should be about 0. Sinking tyres was the bug. [MAIN]
19. **police-cars-on-ground**: "all four wheels within **~1 cm** of the ground" (FL:228). [MAIN]
20. **parked-cars-seated**: Maple Plaza's three cars "sit seated on their tyres in the bays" (FL:275), and so do the car-park cars (FL:312) and the Makers' Row cars (FL:297). Same wheel-contact test. [MAIN]
21. **van-tyres-on-ground**: the van tyres "sank a little … sit on the ground", and the hubs are filled, not see-through rings (FL:231). [MAIN]
22. **bike-tyres-on-ground**: Pia's bike has "spoked wheels whose tyres sit on the ground", "not sinking" (FL:233). [MAIN]
23. **easel-card-not-floating**: "The easel's little white wall-card was placed below the easel's ledge, hanging in mid-air" (FL:207). Measure: the card's base rests on the ledge. [MAIN]
24. **beacons-on-lawn**: the forecourt beacons were "set at paving height, **0.35** above the lawn; their feet now sit on the lawn" (FL:270). Measure: beacon post bottom compared with `groundAt`. [MAIN]
25. **ladder-grounded-and-leaning**: "The ladder is floating" (FL:252). It is "4.3 long, stood on the lawn and resting on the wing's balustrade", with its top resting outside the cornice ledge, not into it (FL:271), and at z = −7.5 between the pots at −6 and −9 (FL:286). ⏳ It floats in front of the side wall again (FL:334). Measure: feet on `groundAt`; the top touches the ledge's outer face without penetrating it; no overlap with the topiary-pot bounding boxes. [BOTH, museum.js]
26. **launch-console-on-desk**: "The screen, button and other moving cape parts were set at the site's flat base height … now sit on the same ground (`radiusAt`, less the **0.04** sink)" (FL:266, FL:258). There is also a guard collar so the flip cover rests on something. [MAIN]
27. **yarn-ball-on-roof**: the ball's "centre sat only 0.34 over the ridge with a 0.85 radius … now rests on both slopes (centre r/cos(pitch) above it)", and the strand lies on the roof surface (FL:313). Measure: the sphere does not intersect the roof planes and touches both. [MAIN]
28. **ruts-draped**: the tyre ruts were "long flat boxes on sloping ground … tilted against it and sank in"; now each rut is a strip draped point by point (FL:276) that starts at the ramp's foot (FL:272, 250). Measure: rut vertices compared with `drawnGroundAt`. [MAIN]
29. **station-door-not-floating**: "The front door, which floated **0.22** above the forecourt, now stands on two stone steps" (FL:328). [MAIN]
30. **harbour-level**: the old harbour sat on a steep bank, so the shed tilted and overhung the water. Now the land is "levelled to a true plane", the boathouse "stands level", and the pier is "level on the sea's own curve" (FL:279). Measure: boathouse tilt about 0; pier sections compared with sea height. [MAIN]
31. **crates-on-quay**: the crates were "sunk into the quay at the front"; now a neat stack on skids "sat on the quay's top" (FL:300). Measure: lowest crate or skid vertex compared with the quay top. [MAIN]
32. **booth-flush-plinth**: the guard booth sits on "a sunken concrete plinth (its foot stays flush on the slope)" (FL:230). [MAIN]
33. **pylon-plumb**: the Maple Plaza sign was "slanted in the ground" (about 10° off vertical). It is now set upright: "Measured: **tilt 0°**, nearest kerb **0.76** away", and the panel must clear every kerb by **≥0.3** (FL:327). [MAIN]
34. **newspaper-reader-seated**: ⏳ "the newspaper reader seated on the bench (not floating)" (FL:321). Measure: the seated person's pelvis is on the bench seat height. [MAIN, open]
35. **no-height-pops**: citizens' 60 s motion test found "no height pops" (FL:237). Measure: per-frame change in each walker's height is bounded. [MAIN]
36. **cars-touch-ground (classic)**: "Cars touch the ground (not floating)" (FL:189). [CLASSIC]
37. **turning-circles-on-terrain**: [CLASSIC] "turning circles lie on the terrain" (FL:151).
38. **pool/river-no-grass-through**: the pool water "rides the slightly uneven ground (no grass showing through)" (FL:304); the planet "sinks out of sight beneath" the river bed (FL:316). Measure: water surface sits above `drawnGroundAt` across the pool and river. [MAIN]

## 2. Overlaps / layout (nothing built on anything, roads through buildings, z-fighting)

39. **nothing-built-on-anything**: "Every structure that matters reserves its ground in ZONES … BEFORE roads are laid", and roads go around it (CLAUDE.md layout). Measure, using `window.__v2.ZONES`, `ROADS` and `zoneHit`:
    - No road sample falls inside a zone except intentional ones (the bridge).
    - No two zones overlap.
    - The rule's wording is the classic `reserve()` in `planet.js`; the main app has its own `ZONES`. [BOTH]
40. **buildings-not-on-roads**: [CLASSIC] "Buildings on roads: 40 → only intentional ones (the bridge) + kerb-flush facades" (FL:152). `?audit=1` reports overlaps and buildings on roads. For the main app, test building footprints against `onRoad` and `nearestRoad` distance. [BOTH in concept]
41. **project-shops-clear-of-roads**: "footprints clear of roads and statics" (FL:281). [MAIN]
42. **no-plants-on-roads**: "9 green meshes on roads before, 0 after" (FL:253). `decoBlocked()` keeps "a plant's footprint + **0.4** off every road (bridge decks included)" and off the railway (`onRail`). The audit gave "0 on any road — 6 plants pruned" (FL:317). Verge trees keep their crowns "**1.15** off the road" (FL:253). Measure:
    - Every `userData.deco` plant's footprint gets `nearestRoad` distance ≥0.4.
    - Crown radius plus clearance ≥1.15 for verge trees.
    - ⏳ FL:311 is the open version. [MAIN]
43. **parks-fit-blocks**: "The two downtown parks were also bigger than their blocks (lawn and tree crown over the street): they now fit inside the kerb" (FL:253). [MAIN]
44. **decoration-not-in-structures**: "Decoration landing in a structure, on a road or on the rails is removed at the end" (CLAUDE.md; FL:167). [BOTH]
45. **no-plant-in-road-near-museum**: spurs are laid "before any planting" (FL:253). This is covered by #42.
46. **street-furniture-not-overlapping-people**:
    - The bakery A-board stood where Pia stands (FL:209).
    - Pia's bike was "not in the A-board", leaning on the wall clear of the sign and tables (FL:233).
    - The guard booth and Otto stood in the middle of the junction (FL:226).
    - Measure: story people's positions are clear of every prop collider and off `onRoad`. [MAIN]
47. **booth-clear-of-lamp**: "checked over its full height, roof overhang included" (FL:235); the forecourt lamp is omitted in the main app (FL:236). Measure: no lamp collider inside the booth's bounding box. [MAIN]
48. **van-not-in-shop**: "Turning the van had pushed its nose into the Frame & Co. shop" and it should be "0.35 further out so it clears the corner shop" (FL:231, 234). Measure: the van's bounding box against building footprints. [MAIN]
49. **police-not-in-sign / not overlapping**: "no post inside any car's body, no two cars overlapping". The parked spots are (1.7, 6.5), (4.6, 7.0), (−1.1, 6.8), and the sign is at (6.0, 4.0) (FL:243, 266). Each car stops within "a car's length" of your car or the car ahead (FL:261). [MAIN]
50. **book-cart-wheels-attached**: four wheels on axles under the box; the box rests on them and the wheels don't stick out past the front (FL:209). [MAIN]
51. **house-door-vs-window**: "The door no longer collides with the windows". The front is laid out to fit, with one window on narrow houses and the porch brackets flat to the wall (FL:210). Measure: door and window bounding boxes don't overlap on each house. [MAIN]
52. **doors-not-slabs-over-windows**: the downtown, library and station doors were "a flat slab stuck over the drawn shop window" or "on the lower half of an arched window (the window's glass showed above it)" (FL:289, 324, 328). Measure: no window-glass mesh is coplanar or overlapping with a door opening. [MAIN]
53. **arch-surround-not-poking**: "square-topped stone surround … top corners stuck out past the curve" (FL:239). The arch trim must run down both jambs to a sill, with a transom (FL:251). [BOTH, museum.js]
54. **cornice-at-top**: the "cornice + brackets sat under a **0.26** band of bare parapet; the cornice now caps the parapet" (FL:299). Measure: cornice top equals the building's max height. ⏳ Trim stopping short or poking through at the station and library (FL:332). [MAIN]
55. **balustrade-corners-closed**: ⏳ "gaps in the roof balustrade's corners and rail ends" (FL:334). [BOTH]
56. **downtown-grid-pitch**: a fitted grid of "~4.2 pitch, one building per block". The bug was "198 streets on a 2.6 grid → 0.5-unit parcels" (CLAUDE.md; FL:149). Classic-only: a guaranteed "**1.4-unit** clear street between every footprint" (FL:200). [CLASSIC; the main app has its own downtown]
57. **downtown-orientation**: "fronts face fronts, backs face backs"; parks face the street with the tree on the left and the bench on its right (FL:126). Measure: building front normals against the nearest-road direction. [MAIN]
58. **no-bare-gaps-between-blocks**: blocks once stood "~2.8 apart with bare lawn between". Infill or a pocket park now fills the gap (FL:289). [MAIN]
59. **road-network-no-dead-ends**: audit of "28 roads; endpoints, junctions, near-misses, overlaps, grades, water". Rules (FL:308):
    - No stubs short of the boulevard.
    - No street running on top of the ring.
    - The harbour road reaches the quay.
    - The Summit road ends in a turning circle.
    - Measure: every `ROADS` endpoint is a junction, a turning circle or an intentional terminus. [MAIN]
60. **street-ends-meet**: "any street that ends just short of another is now carried on into it". The bug was a "**0.02** sliver between the two surfaces" (FL:325). Measure: endpoint-to-other-road gaps should be 0 or large, never 0 < gap < about 0.5. [MAIN]
61. **road-kerb-z-fight**: "one road's kerb strip and the next road's surface lay only **0.015** apart … flickered". The surface now sits "higher above the kerb (**0.03 vs 0.06**)" and is drawn in front, with dashes depth-offset (FL:273). Measure:
    - Vertical separation between overlapping road and kerb surfaces is ≥0.03.
    - `polygonOffset` / `renderOrder` are set on the surface and dash materials. [MAIN]
62. **centre-line-dashes**: dashes are evenly spaced, none inside junctions, and only the first of two overlapping roads gets one (FL:136). The units bug made dashes "**40×** too dense … ~4,000 stacked dashes" (FL:217–218). Dash corners sit at least on the road's top, draped in 6 steps (FL:284). Measure:
    - Dash count per unit road length.
    - No dash within junction radius.
    - Dash vertices ≥ road surface height. [MAIN]
63. **mall-drive-not-through-road**: the drive "ran **1.3** into the boulevard's carriageway at lot height (a step under the road, poking through it)". The bell-mouth now tucks just under the road edge with no gap or step (FL:278). The lot corners are cut clear of the side-road kerbs. [MAIN]
64. **mall-lot-no-ink-box**: road-coloured slabs (the lot and drive) are no-ink; inked, they drew a black box on the asphalt (FL:241). Measure: those meshes have no ink hull. [MAIN]
65. **maple-plaza-edges**: square to the building line, kerbs all round, an even grass verge, "no wedges of grass or bare ground" (FL:336). [MAIN]
66. **makers-row-spur-meets-lot**: the spur runs "right up to the lot's front edge and **0.08** under it, centred". No cobble tongue wider than the road (2.7 against the road's 1.7). Edging stones stop either side of the carriageway, and there is no step walking from road to cobbles (FL:335). ⏳ Cobble patches overlap and fight (FL:322). [MAIN]
67. **flagstone-gravel-z-fight**: ⏳ "a flagstone path z-fights the gravel"; a lamp post stands in a bench (FL:333). [MAIN]
68. **water-depth-mask-offset**: the water surface and depth mask "sat at exactly the same depth and fought". The mask now sits "a hair under it", with a fine bed mesh instead of coarse planet triangles; stencil means water is drawn once per pixel (FL:316, 307). ⏳ Open at FL:310. [MAIN]
69. **rail-clear-of-zones**: the rail loop (~120 units) is "kept out of every reserved zone and off the roads except one square level crossing"; trees keep off it (FL:282). [MAIN]
70. **harbour-crates-clear**: the crates must not be inside the shed, and must stay "clear of the walk from the road end to the pier" (FL:279). [MAIN]
71. **classic-layout-moves**: [CLASSIC]
    - Mall off downtown.
    - Museum Station out of the museum.
    - Gas station off the airport road.
    - Rocket pad off Far Side Station.
    - Farm B off the jetty; the jetty only over water.
    - Limo not inside the hotel (`SPUR_SETBACK`); silo and farmhouse not inside the barn; cottages off landmark plazas (FL:150–151, 166–167).
    - Districts inside the ring get no spur (`dropOffDir`) (CLAUDE.md).
72. **museum-pillars**: the main app has no pillars in front of the door; the classic game keeps all six (FL:212). Measure: column count in the main-app portico. [MAIN]
73. **landmark-set**: the main app's project shops are Behavior Search, QR Compass, YarnFlow, DeckGPT, Splatform and Borrowed Eyes. "no stale names (Charter Scope, Inbox Zero…) anywhere in the main app" (FL:281, 288). The Library is scenery with no card (FL:221). Splatform sits at [16, −110] and Lantern Park has no road (FL:290). [MAIN]

## 3. People models (AGENTS.md rules)

74. **not-a-critic-clone**: "Never a clone of the main character… Recolouring her rig is not a new person" (AGENTS.md 1; FL:93). Measure: no townsperson's skinned mesh shares geometry or skeleton with `critic.glb`; folk come from `makeFolk`. [MAIN]
75. **people-scale**: Citizen Maker bystanders are "≈**1.03–1.21** tall" (mean 1.12); the critic is "≈**1.12**" (`HUMAN_SCALE` **0.12**). Folk at `height` 1 are ≈1.12, "hips ≈**0.5**, shoulders ≈**0.76**". Height varies ±**5%**, and figures are never scaled up whole. "measure the skinned extent along up, not the bind pose" (AGENTS.md 2).
    - Earlier cast heights (FL:254): Vivi 1.36→1.18, Otto 1.26→1.11, Rex 1.29→1.13, Pia 1.20→1.06.
    - **Conflict:** FL:274 later makes the critic 0.9× (`LOOKS.critic.height`), "~**1.02** with the beret — a touch under the townsfolk", against townsfolk measured at 1.01–1.20. AGENTS.md still says 1.12.
    - Measure: skinned bounding-box height along up for every person; all in about [1.0, 1.21]; the critic no taller than the townsfolk. [MAIN]
76. **critic-not-bigger-than-npcs**: "The main character is still bigger than the NPCs" (FL:274). Measure: critic height ≤ the townsfolk mean, and her backpack and car seat scale with her. [MAIN]
77. **shoes-contrast**: "Shoes contrast with the trousers so the feet read" (AGENTS.md 3). Measure: luminance or colour difference between the shoe and trouser materials. [MAIN]
78. **shoe-size**: shoes are "~**15%** of body height, toe wider than heel; trouser hems end inside the collar" (FL:103). [MAIN]
79. **shoe-S-profile**: the topline dips at the ankle, rises over the tongue and swells over the toe; the sole springs up at the toe (AGENTS.md 9). Hard to automate; a side-silhouette check is possible. [MAIN]
80. **limbs-one-skinned-tube**: "Each arm and leg is ONE skinned tube (`limb()`) whose weights blend across the knee/elbow … never separate stacked segments" (AGENTS.md 4). Measure: each limb is a single SkinnedMesh with vertices weighted to both the upper and lower bone near the joint. [MAIN]
81. **arms-clear-body**: "no part of an arm or hand may be inside the torso" (AGENTS.md 5; Otto's arm inside his body, FL:110). Measure: arm and hand skinned vertices are outside the torso hull, in idle and every stance. [MAIN]
82. **no-shoulder-balls / ink fade at joints**: no bolt-on shoulder spheres. Limbs fade their outline via `inkW` (`inkFrom` / `inkTo`); sleeves end in a crisp `hem:` (AGENTS.md 5b; FL:111). Measure: limb ink hull vertices have `inkW` near 0 at the root; no sphere meshes at the shoulders. [MAIN]
83. **real-hands**: "four three-jointed fingers … a two-jointed thumb … one skinned mesh, skin-coloured, sized to the wrist (≈**0.03**)… Never a ball or a blob". Held things sit at the `FIST` centre (AGENTS.md 6; FL:249). Hands are "**1.3×** (about face length)" (FL:110). Measure: hand mesh bone count and finger bones; held prop position about equal to the fist anchor. [MAIN]
84. **head-shape-and-face**: built with `headShape` / `buildHead`; the face features (eyes, brows, nose, mouth, cheeks) are `noInk`. "Check the SIDE PROFILE" (AGENTS.md 7). [MAIN]
85. **unique-faces**: "Every face is different" — each person gets their own `face` spec (AGENTS.md 7a; FL:121). Measure: no two folk share an identical face spec. [MAIN]
86. **hats-fit-head**: hats are fitted to the measured head width and depth (AGENTS.md 7d; FL:123). [MAIN]
87. **necks-grow-out / collar**: the neck flares, its ink fades at both ends, and it rises from a collar (AGENTS.md 7c; FL:122). [MAIN]
88. **stance-and-idle-loop**: every person has a `stance` from `STANCES`, props are in hand (`hold`), and "a small loop of life … plays on its own, visibly — not only when the player moves" (AGENTS.md 8, 10; FL:112, 116). Measure:
    - With the player still, each folk's bone rotations change over time.
    - Each folk has a non-default stance.
    - Writing uses `ikArm`: the pen tip lands on the board. [MAIN]
89. **turn-to-face-player**: they "turn to face the player when near, gesture while talking" (AGENTS.md 10). Measure: folk yaw compared with the bearing to the player, within some distance. [MAIN]
90. **pose-axes**: "+Z is forward, a negative X rotation swings a hanging limb forward" (AGENTS.md 10). The bug was legs and arms swinging sideways (FL:90, 102). Measure: during the walk cycle the foot displacement is mostly along the local forward, not sideways. [MAIN; also CLASSIC `procWalk` (FL:105, cache token p98)]
91. **no-moonwalk**: "planted foot moved forward in ~**70%** of frames before, backward in ~**75%** after" (FL:47). Measure: during the walk, the planted (lowest) foot's world velocity relative to the body should be backward in most frames, for the critic and the townsfolk. [MAIN]
92. **person-tri-budget**: "Keep a person under ~**6k tris**" (AGENTS.md 11). Known failing: "every story person is ~**84k–127k** tris" (FL:10). Citizens ≈**8k** tris and ~**250 KB** each, **2.7 MB** total (FL:237). [MAIN]
93. **toon-paint-and-ink**: people use `paint()` materials and are inked with `ink(root,'fine')`; skinned limbs get skinned ink (AGENTS.md 11). Measure: every person has an ink hull. [MAIN]
94. **critic-colours**:
    - Skin is "warm light skin tone (**#efc3a2**)", not #f9efe5 (FL:46).
    - The cuffs and sleeves are sweater grey all round; skin starts at "HEM **-0.72**" (FL:129, 41).
    - The hands are repainted skin and the nape hair is hair (FL:96).
    - The eyes are a white with a hazel or brown iris, not all black (FL:208, 215).
    - The eye pieces are dark and the face is skin; front hair is hair, not skin (FL:36–37).
    - Measure: sample vertex colours or material colours per connected piece. [MAIN]
95. **critic-skin-front-only**: "Skin is now front-only with a hair-coloured back-face twin" — the "missing side of her head" bug (FL:17). Measure: the skin material's side is FrontSide. [MAIN]
96. **critic-one-nose / no added chin mesh**: "2 noses" was the bug (FL:223). "don't add any mesh to the chin" (FL:224). The chin tip is ≈**2.87** (model units), not dragged to 2.74 (FL:225). Collar rim ≈2.95, lining ≈2.80 (FL:24). Measure: nose mesh count is 1; the face's bottom-edge y is about 2.87. Note FL:14 later adds a "line for her chin" (a traced curve, not a mesh). [MAIN]
97. **critic-sweater-no-batwing**: the hem flare "measured **0.21** model units at rest, **0.23** mid-swing" before; "**0.01** at rest, **0.08** mid-swing" after (FL:130; also FL:204, 206). Measure: sweater-hem lateral displacement over the walk cycle should be ≤ about 0.08. [MAIN]
98. **critic-arm-spread-sign**: the arm-spread turn in `pose()` had the wrong sign (it folded her hands together in front) (FL:203). Measure: hand-to-hand distance at idle stays above a minimum. [MAIN]
99. **critic-beret/hair**: hair is clamped under the felt and nothing pokes through. Brim radius 0.9→**0.8** (FL:33, 38). No flat cut under the beret (FL:27). Straps sit outside the collar, over the shoulders and visible from the front (FL:28, 42). [MAIN]
100. **critic-shoes**: the zigzag soles are hidden and S-profile sneakers ride the foot bones (FL:135). [MAIN]
101. **double-sided-thin-parts**: the newspaper rendered black from behind because `restyle` dropped double-siding. "restyle now keeps double-sided parts double-sided" (FL:244). Hair locks are double-sided (FL:37). Measure: citizens' newspaper material side is DoubleSide. [MAIN]
102. **citizen-skin-under-clothes-dropped**: "Skin triangles on the trunk and legs that sit under a clothing layer are now dropped at load". The cyclist "duplicated" look was the bug, and a small hip patch can still show (FL:277). [MAIN]
103. **citizens-no-outline-hulls**: Citizen Maker models are "gouache … no outline hulls" (FL:237). [MAIN]
104. **verify-up-close**: screenshot every new person from the front and a low angle, next to the critic (AGENTS.md 12). This is a screenshot-baseline item. [MAIN]

## 4. Vehicles / physics

105. **car-stays-on-road**: "no off-road samples under full-lock steering". It "slides along the kerb instead of leaving it, and eases into line … (never more than ~**50°**, so junction turns are yours)" (FL:58). Classic: "cars drive only on road" (FL:181). Measure: simulate full-lock steering; `onRoad` stays true for every sample, except on `LOTS` paved ground. [MAIN]
106. **car-can-enter-lots**: "The car could never leave the boulevard into the lot"; car parks are `LOTS` in world.js, where the assist lets go (FL:275). It also drives into the shop car parks (FL:312). Measure: drive from the boulevard into the Maple Plaza and YarnFlow lots. [MAIN]
107. **car-stops-at-hard-colliders**: "The car skipped every collider under r **0.4** … street trees (**0.35**) and lamp posts (**0.15**)". People are tagged soft and everything else stops the car. "Downtown roads still drive clear (**17–46 units in 5 s** along each of six roads)" (FL:294). Measure:
    - Drive into a tree and a lamp: the car stops.
    - Drive each road for 5 s: distance ≥17. [MAIN]
108. **car-knocks-people**: hit people launch, tumble, land, get up and walk back. "The story's people always come home; you can't talk to anyone mid-air" (FL:60). Citizens, shoppers, park and north people are all bump-registered (FL:237, 275, 290, 295). Measure: after a bump cycle, each person returns to their spot; talk is disabled mid-air. [MAIN]
109. **parked-cars-solid / police solid**: parked cars are solid (FL:275); police have "nose and tail colliders" on foot or driving (FL:261). Measure: the player can't walk into a parked or police car's box. [MAIN]
110. **player-blocked-by-street-furniture**: "Street furniture baked into buildings (benches, lamp posts, planters, A-boards …) and the parks' trees and benches … all block her now (the car still ploughs past the small ones)" (FL:255). Measure: walking into a bench, the player stays outside it. [MAIN]
111. **project-shop-walls-solid**: "walls and furniture are solid, the floor is walkable" (FL:281). [MAIN]
112. **pier-walkable-not-off-edges**: "walk out along the pier over the water but not off its edges" (FL:279). [MAIN]
113. **boat-in-open-water**: "stops at the shallows and can't go under the pier or onto the quay"; E gets you out "only where there's somewhere to step" (FL:280). [MAIN]
114. **bridge-drivable**: "drove over the bridge at speed (deck height followed, no catches)"; the deck counts as road (FL:295). [MAIN]
115. **train-not-drivable-through**: the train walls have "car-only bulk so the car can't drive through"; the carriage floor is walkable (FL:282). [MAIN]
116. **every-road-drivable**: "Driven by script along every road both ways: no stalls, no water, no wandering — except the east side street, which Rex's van (a story placement, r **1.1** collider in a **2.1**-wide street) still blocks" (FL:308). This is a known exception. [MAIN]
117. **cyclists-avoid-car**: cyclists "pull out round your car … only brake if it's dead ahead"; walkers stop for you (FL:237). Shoppers: "nobody comes within a car's side" (FL:275). [MAIN]
118. **citizens-clear-of-solids**: "60 s motion test (no one within a body's width of anything solid…)". Routes are checked at load against colliders, buildings ("nothing overhead"), roads, water, story people and clues (FL:237). Measure: sample citizen positions over time against colliders. [MAIN]
119. **citizens-inside-ring**: bystanders stay inside the ring (the main town) (FL:237). [MAIN]
120. **police-on-road**: police "follow the cape's access road in its lane … one after another **1.4 s** apart", leaving the road only for the last stretch (FL:292). [MAIN]
121. **wheels-dont-fly-off (classic)**: the tyre spin flung wheels off because they share the car origin (FL:198). Main-app analogue: wheels are baked separately "so they still turn" (FL:293). Measure: wheel world positions stay within the car's box. [BOTH]
122. **critic-seated-in-car**: the critic sits at the wheel; the seat follows her scale (FL:90, 274). [MAIN]

## 5. Camera

123. **camera-never-inside-geometry (talk)**: "no camera inside anything" for walk-ups from **12 directions** to Rex, Vivi, Otto and Pia (FL:238). The talk camera looked through the easel frames (FL:232). Measure: at talk start, ray-test the camera position for being inside a mesh (both ray directions), and require a clear line of sight to both people's head and feet. [MAIN]
124. **no-freeze-on-E**: "E takes ~**0.05–0.4 s** instead of **0.3–6 s**" (FL:238, 265). Measure: time from E to the first convo frame. [MAIN]
125. **talk-over-shoulder**: "frames over the critic's shoulder, at eye level, aimed at the speaker's face … never swings round to her front" (FL:248). Measure: the camera is behind the critic, relative to the speaker direction. [MAIN]
126. **no-collapse-onto-head**: "a blocked camera collapsed onto your head and rose straight up" (FL:68). Measure: camera-to-player distance stays above a minimum near buildings. [MAIN]
127. **camera-smoothness**: "~half the frame-to-frame camera acceleration in a test walk" (FL:131). Measure: second difference of camera position during a scripted walk. [MAIN]
128. **camera-responsiveness params**: follow **5**, look **8**, look-ahead **1.6** must not regress to 4 / 5 / 2.5 / 0.9 (FL:247). Drag answers immediately (no trailing lag); her height rides a slow spring. Measure: read the params, or check drag-to-yaw latency. [MAIN]
129. **open-facing-museum**: drags during the title, cold open or phone don't move the view. The camera is squared behind the critic toward the museum at the end of the cold open and at play start, "still **8°** off the museum's centre (its door)" (FL:263, 267). Measure: the angle between camera forward and the museum direction at play start is ≤ about 10°. [MAIN]
130. **title-angle**: the title opens at "angle **1.57** … opens at **1.59**". It turns by frame time, not the clock (FL:242). [MAIN]
131. **camera-no-spiral**: "keeps its own facing (no more chasing your turns into a spiral)" (FL:92). [MAIN]
132. **camera-cuts-in-out-of-car**: it "cuts cleanly when you get in or out" (FL:68). [MAIN]
133. **police-shot-framing**: after ABORT, a letterboxed shot appears **1.4 s** later. The epilogue comes **5.6 s** later (FL:287), revised to **7.4 s** after the shot starts (FL:292), with all three cars in frame. [MAIN]
134. **shop-interior-camera / roof lift**: inside a project shop the shopfront, upper walls and roof lift away (FL:281); the back and side walls stay full height (FL:291). Train: the roof lifts and the camera rises (FL:282). [MAIN]

## 6. UI / UX (emoji, text fit, mobile)

135. **no-emoji**: "No emoji, anywhere in the UI" (AGENTS.md 7b; FL:112, 118). Measure: scan DOM text and source strings for emoji codepoints.
    - Caveat: MOBILE_REPORT line 55 mentions the "put away ✕" button. ✕ (U+2715) is a dingbat, not an emoji, but a codepoint-range check should decide that deliberately. [MAIN]
136. **portraits-not-emoji**: faces are painted portraits rendered from each model (`portraits.js`); clue cards show sketches of the real prop (AGENTS.md 7b). [MAIN]
137. **banner-text-fits**: "Every line is fitted to the banner's width with a margin (shrinks to fit)", drawn at double resolution (FL:132). [MAIN]
138. **inscription-fits**: the museum inscription was cut off ("HE DOWNTOWN MUSEUM OF AR"). It now shrinks to fit and is centred, allowing for trailing letter-spacing (FL:259, 264). Measure: canvas text width plus spacing must be ≤ canvas width minus the margin. [BOTH]
139. **classic-label-clip**: [CLASSIC] "long landmark labels no longer clip"; the "skip intro" button no longer lingers; the controls hint is not under the zoom bar (FL:176).
140. **title-fits-phone**: "title scales and lifts on phones (it used to clip)" (FL:158). [MAIN]
141. **title-wording**: "THE VANISHING GALLERY", "45 real paintings, stolen in one night. Get them back.", "an art heist on janelle ghanem's tiny planet", and a button "start the case". The header and browser tab match (FL:157). [MAIN]
142. **case-board-title**: "The Vanishing Gallery To Do List" (FL:213). [MAIN]
143. **case-board-fold-tab-inside**: the minimize tab is "inside the card's top-right, the title padded clear of it" (FL:214). The fold state is remembered (FL:128). Measure: the tab's DOM rect is inside the card's rect. [MAIN]
144. **phone-can-be-put-away**: a "put away" button exists; home goes home, then puts the phone away (FL:216). In landscape (664×390) the button is "**19px** from the top and the handset at y=**56–378**" (MOBILE_REPORT 128). Measure: the button rect is within the viewport in landscape. [MAIN]
145. **mobile-thumb-stick**: a **128px** stick bottom-left. It shows only on touch (`pointer: coarse` or after `touchstart`) and only while playing with no panel open; the keyboard takes priority (MOBILE_REPORT fix 1; FL:245). Measure: emulate touch, check visibility, then drag the stick and check the player moves. [MAIN]
146. **case-board-folds-on-small-screens**: folded by default when "under **700px** wide or under **500px** tall"; a saved choice wins (MOBILE_REPORT fix 2). [MAIN]
147. **touch-layout**: hint strip hidden on touch, no `E` badge, the prompt sits above the stick. Tap targets: fold tab 26→**40px**, others toward **44px**. The minimap shrinks so it doesn't cover the "get out" prompt; the launch timer goes below the board and toasts. No double-tap zoom, selection or callout (MOBILE_REPORT fix 3). Measure: tap-target rects ≥40–44 px; the minimap doesn't overlap the prompt. [MAIN]
148. **landscape-phone-fit** (`max-height: 500px`): the handset fits, the keypad is hidden, panels scroll, and the notebook uses `dvh` (MOBILE_REPORT fix 4). [MAIN]
149. **ios-audio-unlock**: the AudioContext opens on the first tap or keypress, not mid-bump (MOBILE_REPORT fix 5). Measure: the context is created inside a gesture handler. [MAIN]
150. **pixel-ratio-cap**: capped at **1.5** on touch devices (1.75 on desktop) (MOBILE_REPORT fix 6). Measure: `renderer.getPixelRatio()` under mobile emulation. [MAIN]
151. **mobile-todos (unfixed, could become tests)** (MOBILE_REPORT prioritised list):
    - #7: keyboard wording on touch ("press E", "P to read", "Press P / N", "click a line").
    - #8: no touch recenter.
    - #10: `gesturestart` preventDefault.
    - #12: `phBack` about 20×24 and case-board rows 25px tall.
    - The canvas has `touch-action: none`, and the page has `overflow: hidden`.
    - [MAIN]
152. **controls-strip**: always on screen, changes in the car, and H hides it (FL:69). It is hidden on touch (MOBILE_REPORT). [MAIN]
153. **messages-ui**: a chat thread with three chips ("on it · heading in now · why me??"). The keypad types the reply key by key and the editor answers (FL:138, 140). [MAIN]
154. **talk-bubble-style**: markers drawn at **256px** in the ink and paper style (FL:133). [MAIN]
155. **projects-panel-wording**: it must say the buildings are around the planet, not "around town", and point to the arrow (FL:260). The list ends with a link to ghanemja.github.io (FL:262, 288). [MAIN]
156. **cape-direction-ui**: after a correct verdict, a "great work — now head to Cape Far Side →" button, a card with "let's go →", and the cape tracked (FL:222). [MAIN]
157. **route-map-while-driving**: a heading-up minimap and gold chevrons, with the route via Dijkstra re-planned every ~**1 s**, only while driving (FL:227). [MAIN]
158. **waypoint-arrow**: pins the current lead or sits on the screen edge, with the distance (FL:65). [MAIN]
159. **sound-button-and-M-mute**: muting is remembered and includes the bump voices (FL:268). [MAIN]

## 7. Performance / budgets

160. **triangle-budget-scene**: "budget **900k**" tris at street level; currently "~1.2–1.9M", a known violation (FL:318). Mobile: "~530k" portrait, "760–800k" landscape. Ink hulls double every mesh (MOBILE_REPORT). Measure: `renderer.info.render.triangles` at fixed camera spots. [MAIN]
161. **draw-call-baselines**: measured on 960×600 swiftshader at fixed spots against main c6a64c1, after the perf pass (FL:318):

    | Spot | Draw calls |
    |---|---|
    | downtown | 1023 → **375** |
    | museum | 1074 → **516** |
    | Riverbend/north | 1330 → **490** |
    | station | 2035 → **677** |
    | wide view | 3579 → **1131** |
    | title | 2465 → **914** |

    - Meshes 5858 → **2491**.
    - The other set in the same entry: downtown 444, museum 522, Riverbend 260, wide 1240, meshes 2739.
    - Mobile guidance: 700+ draws is beyond a mid-range phone (MOBILE_REPORT); 730–855 in landscape and ~300 in portrait.
    - Measure: `renderer.info.render.calls` at the same spots, with a regression margin. [MAIN]
162. **car-draws**: each car must be "~**40** draws instead of ~**235**" (`buildCar` bakes one mesh per material, wheels separate) (FL:293). Measure: count the draw-producing meshes per car. [MAIN]
163. **memory**: JS heap after GC ~**190 MB** (was 235). GPU geometry 2646 → **1765** MB. Mobile heap ~**116 MB** (FL:318; MOBILE_REPORT). There was a raycast closure leak of **+46 MB** (FL:293). Measure: `performance.memory` after GC. [MAIN]
164. **shader-programs**: "57 → ~**41–54**" (FL:318); mobile ~40 (MOBILE_REPORT). Measure: `renderer.info.programs.length`. [MAIN]
165. **all-shaders-compile / precompile**: "every shader is compiled at load (`renderer.compile`)" (FL:217). No compile hitch entering rooms; "first frames inside **13–17 ms**" (FL:314). Shader compile failures are bugs: the plants' breeze ink had `uTime` undeclared, and "Console errors went from 1 to 0" (FL:331). Measure: zero WebGL program errors; every program's link status OK. [MAIN]
166. **zero-console-errors**: this is the verification criterion in nearly every entry, and the harness fails on page errors, console errors and 404s (FL:10, 49, 226, 314, 318). [MAIN]
167. **culling**: people and cars behind the planet are not drawn (`js/cull.js`; skinned bodies are never frustum-culled) (FL:293). The culler skips anything behind the planet or "under a pixel", and drops people's tiny parts under **45 px** tall (FL:318). Measure: from a spot, objects on the far hemisphere have `visible` false. [MAIN]
168. **life-only-near**:
    - Citizens are not drawn or animated past **22** units (FL:237).
    - Shoppers are animated within **20** (FL:275).
    - Park and north people within **22** (FL:290, 295).
    - Only near river life moves (FL:307).
    - Hidden at 3:07 a.m. (FL:237, 295).
    - Measure: the update or visible flags against distance to the player. [MAIN]
169. **street-updates-pause-in-rooms**: the townsfolk, shoppers, park people and culler wait while you're inside a room. YarnFlow went **12.9 → 8.4 ms**/frame (FL:314). Room budgets: **270–600** draws and **70–120k** tris. [MAIN]
170. **per-frame-js**: "all ≲**3 ms** headless" for game, player, citizens, plaza and shops (FL:293). [MAIN]
171. **standAt-lookup-cost**: ~**0.001 ms** per lookup (FL:139). [MAIN]
172. **E-response-time**: see #124 (0.05–0.4 s). [MAIN]
173. **model-asset-budgets**: "hard-decimate photoscans toward ~**40–70k** tris, shrink every texture to **512² WebP**, Draco-compress … Target sub-~**1.5MB** per model" (CLAUDE.md). Citizens ~8k tris and ~250 KB each, 2.7 MB total, meshopt (FL:237). Bungalows ~**4k** tris against a town house's **34k** (FL:295). Museum ~**54k** tris (FL:173). Frames +24.5k tris (FL:302). Measure: inspect `models/opt/*.glb` sizes and texture dimensions (`validate-assets`). [BOTH]
174. **page-weight**: "about **3.0 MB** decoded, about **1.5 MB** over the wire". three.js 1.27 MB (256 KB gz), game JS 441 KB (141 KB gz), `critic.glb` **434 KB**, artwork JPEGs 220–320 KB, fonts 132 KB (MOBILE_REPORT). [MAIN]
175. **load-time**: "~**30 s** headless" (FL:318); 17–33 s to the title in mobile emulation. Room first build ~0.8–1.3 s while faded (FL:314). [MAIN]
176. **static-batching**: "a motion probe confirms nothing merged ever moves" (FL:160). The Library is "~400 parts → a few dozen" (FL:217). Main Street is batched per material (FL:77). Measure: merged meshes keep identical world matrices over time. [BOTH]
177. **pool-one-draw**: the pool water is "One draw call, no textures" (FL:303). [MAIN]
178. **audio-spectrum**: "no clipping, ~**99%** of the energy below **600 Hz**, ~**0%** above **1.5 kHz**". No bells or high ringing. The siren uses triangle waves at **170–300 Hz** (FL:268, 287). The frog croak is "low buzzy rattle, no chirp" (FL:307). Measure: an OfflineAudioContext render plus an FFT. [MAIN]
179. **classic-draw-calls**: [CLASSIC] Classic 2058→~1200, Wasteland 4452→~2000 (FL:160); later ~1200→~870 (FL:152).

## 8. Art style

180. **three-render-modes**: Classic, Sketchbook and Wasteland; "Any new model MUST look right in all three" (CLAUDE.md). This applies to classic, and the main app has its own toon and ink style (FL:82). [CLASSIC mostly]
181. **gpRegister-streamed-models**: models loaded after `buildGreasePencil()` must call `gpRegister(obj)`; the jet needs `userData._gpForce` (CLAUDE.md; FL:183). "If a new thing shows up in Wasteland with no ink around it, it wasn't registered." [CLASSIC]
182. **boil params**: [CLASSIC] Wasteland boil **7→4** redraws/s, width jitter ±50%→±**20%**, wander 1.4×→**0.35×** thickness. Sketchbook wobble ~3px→~**1px** at **4 fps** (FL:168). CLAUDE.md still says "~7×/second", which is stale against FL:168.
183. **ink-on-everything**: every mesh has an ink hull, except deliberately `noInk` things (facial features, road-coloured lot slabs, gouache citizens) (FL:82, 241; AGENTS.md 7). There is "one ink hull per building / static thing" (FL:318). Measure: every visible non-exempt mesh has a matching hull. [MAIN]
184. **smooth-not-faceted**: "Keep smooth normals (`flatShading = false`)… Faceted low-poly is wrong for this world" (CLAUDE.md). Measure: no material has `flatShading` true; vertex normals are not all face normals (except shaded-flat road and lot surfaces, FL:278). [BOTH]
185. **no-shine/no-tone-mapping**: "matte toon paint … No shine, no chrome, no tone mapping" (FL:82). Measure: `renderer.toneMapping` is NoToneMapping; no Standard or Physical materials with metalness or high specular. Classic: the ground and roads are not mirror-like (FL:159). [MAIN]
186. **car-shading-classic**: [CLASSIC] cars and limo skip the boil hull ("angry scratches") (FL:197).
187. **critic-gentle-ramp**: the skin, hair and sweater use a gentler cel ramp so the face reads as one tone (FL:31). [MAIN]
188. **plants-not-blobs**: "real flowers, shrubs and trees, not egg-shaped blobs", merged per colour plus outline, with a shared breeze (trunks stay put) (FL:315). [MAIN]
189. **fine-bands-antialiased**: ripple and caustic bands use `fwidth` and fade with distance (FL:316). [MAIN]

## 9. Deploy / wiring

190. **cache-token-bump**: bump `js/main.js?cb=NN` in `index.html` on every `js/` edit. "index.html's import map gives every `js/` module the same token; `deploy.sh` syncs them to main.js's" (CLAUDE.md). The bug: only main.js had a token, so a stale world.js shipped (FL:285).
    - Measure, statically: every import-map entry's `?cb=` equals main.js's token, and the token changes when `js/` changes.
    - Measure, at runtime: every module loads with the token (e.g. "modules load with ?cb=127").
    - Recent tokens: cb=81 (mobile), cb=91, cb=127, cb=198. [MAIN]
191. **classic-cache-token**: `planet.js?cb=pNN` in `classic.html` (e.g. p98) (CLAUDE.md; FL:105). DEPLOY.md's wording ("Bump NN whenever planet.js changes") is outdated for the main app. [CLASSIC]
192. **build-gates**: Netlify runs `validate-critic`, `validate-assets` and `check-modules`; a missing or broken `critic.glb` fails the deploy (CLAUDE.md; DEPLOY.md). [MAIN]
193. **v2-redirect**: `/v2` and `/v2/*` 301 to `/`, keeping the query string; no `v2/` folder exists (FL:124, 141; CLAUDE.md). Measure: netlify.toml / `_redirects`, and that nothing references `v2/`. [MAIN]
194. **raw-assets-not-shipped**: `models/_raw/` is gitignored and never deployed; only `models/opt/*.glb` ships (CLAUDE.md). Measure: no runtime fetch to `_raw`. [BOTH]
195. **no-404s**: the harness fails on 404s (FL:10). Also check the asset paths. [MAIN]
196. **netlify-site-id**: `deploy.sh` pins the site id `c1677cd8-337d-4500-879c-3aed0433fe67`; the site name is art-heist (DEPLOY.md). Static check only. [MAIN]
197. **classic-still-loads**: "the original game still loads clean (museum.js is shared)" (FL:54, 302). Measure: boot `classic.html` with zero errors. [CLASSIC smoke]
198. **feature-log-current**: every request is logged with a status marker (CLAUDE.md workflow). This is process only. Note FL:303/305 and FL:304/306 are duplicate entries.
199. **dev-params-work**: `?audit=1`, `?layout=1` (`window.__layout()`), `?at=`, `?shotcam=`, `?arrfreeze=`, `?debug=1`, `?city=grown`, `?dlg=`, `?grounds=1` (CLAUDE.md; FL:177, 309). Mostly [CLASSIC]; `?grounds=1` is [MAIN].

## 10. Story / gameplay

200. **full-playthrough**: title → Vivi → suspects → clues → accuse Rex with two proofs → getaway → Cape → 60 s countdown → ABORT → police → epilogue → "Case closed" end card → free roam, "no console errors" (FL:49, 226; MOBILE_REPORT). The harness has this scripted (FL:10). [MAIN]
201. **clues-collectable**: [CLASSIC] "`collectClue` was never called"; "Cape Far Side never launched (`defStop` dropped `launches`)"; restart clears the case (FL:175). Main-app analogue: every clue is collectable. [BOTH concept]
202. **discovery-not-telling**: "8 things to notice (glints, no markers), 4 people"; the notebook only records what you saw. The accusation needs a suspect plus two evidence (FL:86). The case board never says what finds mean (FL:64). Museum-room inspections "add no clues" (FL:312). Ezra's hint is "optional, never proof" (FL:282). Measure: judge() verdicts (the harness has these). [MAIN]
203. **car-visible-from-start**: the parked roadster "was invisible until you'd driven once — now it's there from the start, parked beside the plaza in view" (FL:67). Measure: at play start the parked car mesh is visible and in the frustum. [MAIN]
204. **countdown-behaviour**: 60 s; at zero the rocket hops and retries rather than ending (FL:50). [MAIN]
205. **police-convoy-count**: three police cars arrive after ABORT (FL:228, 292). [MAIN]
206. **clue-spot-correct**: the "look closer" clue is on the easel with the empty frame, not the sculpture (mirrored x bug) (FL:257). Measure: clue position near the easel. [MAIN]
207. **van-vs-rex-prompt**: "standing by Rex offers Rex", not the van; the van is looked at from behind its open doors with the sparkle at door height (FL:256). Measure: at Rex's talk spot, the nearest prompt target is Rex. [MAIN]
208. **sparkle-placement**:
    - The van sparkle is above the roof over the open back, not inside the roof (FL:231).
    - The easel sparkle is above the easel top, not cut into the frame (FL:269).
    - The logbook sparkle is over the logbook (FL:229).
    - The crates sparkle is above the stack (FL:279).
    - Measure: sparkle sprite position is outside every mesh's bounding box. [MAIN]
209. **story-people-positions**: Otto stands beside the steps clear of the floodlight, not in the junction (FL:226). Rex is on the corner pavement by the van and Frame & Co., in plain view (FL:231, 235). The van's open back faces Main Street (FL:234). [MAIN]
210. **booth-window-faces-town**: the window faces the way you walk up (FL:229–230). [MAIN]
211. **markers-pulse-staggered**: about every **3.4 s**, "staggered so they never pulse together" (FL:125). [MAIN]
212. **project-shops-enterable**: walk in through the door, or (⏳ FL:320) press E at the door. E opens the project card and link (FL:281, 312). Rooms are entered and left by walking out over the front edge or pressing E on the mat (FL:312). The museum room is entered by E at the front door (FL:312). [MAIN]
213. **train-ezra**: Ezra is in the second carriage on the far bench with no sparkle, and has three lines (FL:282). [MAIN]
214. **boat-ride**: board from the pier, W/S and A/D controls, exit only onto the pier or bank, and the boat stays where left (FL:280). [MAIN]
215. **cold-open**: about 10 s and skippable (FL:84). [MAIN]
216. **audio-scenes**: music follows the story (title, cold open, dawn, investigation, countdown, ending); music dips inside rooms (FL:268, 291). [MAIN]
217. **3:07 night state**: bystanders and north life are hidden at 3:07 a.m.; the station clock is stopped at 3:07 (FL:73, 237, 295). [MAIN]
218. **classic-intro**: [CLASSIC] limo pulls up to the gas pumps (pull-in about **2.0**) (FL:194); the 11 s letterboxed intro (FL:201).

---

## Numeric thresholds stated in the docs

**Planet and grounding**
- Planet radius 40; a 9-unit slab lifts ~0.3 at its ends.
- Ground mesh detail 44 (~0.7-unit triangles) vs 6 (~4.5-unit triangles), with a ~0.08 sag (classic).
- People feet: sink 0. The past bug was 3–7 cm above the drawn surface. The stand cache uses 0.2-unit patches at 0.001 ms per lookup.
- Forecourt paving sits 0.35 above the lawn. Beacons were 0.35 high before their fix.
- Museum plane: edges were ~0.6 low; it covers r 9.5 and eases out over 16. The ridge was ~5 high and should now be max ~2.3.
- Road surfaces within ~0.15 of the ground near the shops. Max road grade 0.19 (was 0.59).
- Landscaping: subdivided to 0.35; drape 0.01; max gap 0.017; max sink 0.009. Plants: max gap 0.014.
- Police wheels within ~1 cm of the ground. Launch console: `radiusAt` less the 0.04 sink.
- Station door floated 0.22.
- Yarn ball: radius 0.85, centre was 0.34 over the ridge; the centre should be r/cos(pitch) above it.

**Clearances and layout**
- Plant footprint +0.4 off roads; verge tree crowns 1.15 off the road.
- Pylon tilt 0°, kerb clearance ≥0.3 (measured 0.76).
- Road surface 0.06 above the kerb (was 0.03); the flicker bug was a 0.015 gap. A 0.02 street-end sliver was a bug.
- Spur goes 0.08 under the lot's edge. Cobble tongue 2.7 vs road 1.7. Mall drive ran 1.3 into the carriageway.
- Van 0.35 out from the corner. Rex's van collider r 1.1 in a 2.1-wide street.
- Ladder 4.3 long at z −7.5, between pots at −6 and −9.
- Cornice band 0.26.
- Downtown pitch ~4.2 (bug: 2.6). Classic clear street 1.4.
- Police spots (1.7, 6.5), (4.6, 7.0), (−1.1, 6.8); sign at (6.0, 4.0).

**People**
- Scale 1.03–1.21 (mean 1.12); critic 1.12 per AGENTS.md vs ~1.02 per FL:274; `HUMAN_SCALE` 0.12.
- Hips ~0.5, shoulders ~0.76; height ±5%; shoe ~15% of body height.
- Wrist ~0.03; hands 1.3×.
- Critic: HEM −0.72; skin #efc3a2; chin tip ~2.87 (not 2.74); collar rim ~2.95, lining ~2.80; beret brim 0.8.
- Sweater flare ≤0.08 mid-swing (was 0.23).
- Moonwalk: planted foot backward in ~75% of frames.
- ≤6k tris per person (actual 84k–127k); citizens ~8k tris and ~250 KB.

**Vehicles**
- Car assist ≤~50°.
- Car-skip collider r 0.4; trees 0.35; lamps 0.15.
- 17–46 units in 5 s on each downtown road.
- Car ~40 draws (was ~235).
- Police 1.4 s apart; shot 1.4 s after ABORT; epilogue 7.4 s after the shot starts.

**Camera**
- Follow 5, look 8, look-ahead 1.6.
- Opening ≤~8° off the museum; title angle 1.57–1.59.
- Talk walk-ups from 12 directions; E latency 0.05–0.4 s.

**Activity radii**
- Life animated within 20–22 units. People's tiny parts are culled under 45 px.

**Performance**
- Tris budget 900k (actual 1.2–1.9M). Mobile 530k portrait, 760–800k landscape.
- Draw calls: downtown ~375–444, museum ~516–522, station ~677, north ~260–490, wide ~1131–1240, title ~914. Mobile 300 portrait, 730–855 landscape (700+ is too many for mid-range phones).
- Meshes ~2491–2739. Programs ~41–54. Heap ~190 MB (mobile 116 MB). GPU geometry 1765 MB.
- Per-system JS ≲3 ms. Room frames 13–17 ms first, 8.4–12.6 ms steady; rooms 270–600 draws and 70–120k tris.
- Load ~30 s headless (17–33 s mobile emulation).

**Assets and page weight**
- 40–70k tris per photoscan, 512² WebP textures, under 1.5 MB per model.
- Page ~3.0 MB decoded / 1.5 MB over the wire; `critic.glb` 434 KB.

**Mobile UI**
- Stick 128px. Board folds by default under 700 px wide or 500 px tall. Fold tab 40px; tap targets 44px. Pixel ratio 1.5 on touch, 1.75 on desktop.
- Landscape handset: "put away" 19px from the top, handset y 56–378 at 664×390.
- Adaptive-resolution todo: drop the pixel ratio to 1.0–1.25 above 25 ms frame time.

**Audio and timing**
- 99% of energy below 600 Hz, ~0% above 1.5 kHz; siren 170–300 Hz.
- Markers pulse every ~3.4 s; countdown 60 s; cold open ~10 s; route re-plan ~1 s.

## Inconsistencies to know about before writing assertions
- Critic height: AGENTS.md says ≈1.12 (`HUMAN_SCALE` 0.12), but FL:274 makes her 0.9× → ~1.02 with the beret.
- CLAUDE.md says the boil redraws ~7×/s; FL:168 cut Wasteland to 4/s. That is a classic-game parameter.
- DEPLOY.md's "Bump NN whenever planet.js changes" is outdated wording for the main app's `js/main.js?cb=NN`.
- Known failing or open items that tests would currently catch:
  - Person tri budget.
  - Scene tri budget.
  - Rex's van blocking the east street.
  - The cyclist hip patch.
  - ⏳ items at FL:310, 311, 320–323, 326, 329, 330, 332–334, 338.
  - Museum gardens are off unless `?grounds=1`.
