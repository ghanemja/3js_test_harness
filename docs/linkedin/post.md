My game had a swimmer who couldn't swim.

She was standing in the pool. So I built a robot that plays my game to find bugs like that.

The Vanishing Gallery is a hand-drawn art-heist game on a tiny 3D planet (three.js). Every push deploys straight to the web, bugs included. My notes held ~220 rules ("nothing floats", "feet on the ground", "no moonwalking") that nothing was checking.

So the harness:
→ boots the real game in headless Chrome
→ plays it like a person: walks, talks, drives, solves the case
→ checks the live 3D scene against my rules, with a screenshot of every failure

6 suites, 65 tests. What it caught:

🏊 The swimmer was a townsperson in a walking pose, sunk to her chest. (I spotted that one; the harness found why, and now guards it.)
⛳ A golfer floating 9 cm above the mat, holding the club in one wrist
🔴 On the live site: a clue card that lost its picture

The honest part: it was wrong six times first. "Your hero is 8.6 units tall." "Five objects are floating!" (It was bunting.) Lesson: check the screenshot before you trust the number.

Carousel with real screenshots 👉

Code: github.com/ghanemja/3js_test_harness
Play: art-heist.netlify.app

What would you test first in your game?

#gamedev #threejs #QA #softwaretesting #playwright #indiedev
