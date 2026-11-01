I built a robot that plays my game to find its bugs.

The Vanishing Gallery is a little hand-drawn art-heist game on a tiny 3D planet (three.js, no build step). It deploys to the web on every push, which means every bug does too. My own feature log had ~220 rules and lessons written down ("nothing floats", "feet on the ground", "roads go around buildings") that nothing was actually checking.

So I built a test harness. It boots the real game in headless Chrome, plays it the way a person would (walks, talks, drives, accuses a suspect) and measures the live 3D scene against those rules.

What it does:
→ 6 suites, 65 tests: the whole story from title screen to "Case closed", every key and button, models, house rules, and gait + rigging
→ every failure says what broke, where, and which rule, with a screenshot
→ things that break a rule on purpose (bunting hangs in the air) are reviewed in a picture and written down with a reason

What it caught:
🏊 A swimmer who was actually a person standing in the pool. I spotted that one by eye; the harness found why, and now guards it
⛳ A golfer floating 9 cm above the mat, holding the club in one wrist, never swinging
🪑 Two benches I added on purpose with two mistakes: caught both, with a photo of each
🔴 Pointed at the live site after three big merges: a clue that lost its picture, and a shader budget creeping up

The honest part: it was wrong six times first. "The hero is 8.6 units tall." "Five things are floating!" (it was bunting). The lesson I keep relearning: look at a screenshot before you trust a number.

It's built on ISTQB's game-testing syllabus and the way studios like Rare test Sea of Thieves, scaled down to one person and a browser.

Code: github.com/ghanemja/3js_test_harness
Play: art-heist.netlify.app

What would you test first?

#gamedev #threejs #testing #QA #webdev #playwright
