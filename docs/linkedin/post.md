My 3D world is getting more and more complicated. Between the storylines, animations, mini-games and more, it got too large for me to test on my own.

How do you catch bugs automatically, with no AI agent in the loop?

The Vanishing Gallery is a hand-drawn art-heist game on a tiny 3D planet (three.js). Every push deploys straight to the web, bugs included. My notes held ~220 rules ("nothing floats", "feet on the ground", "no moonwalking") that nothing was checking.

So I built a test harness that:
→ boots the real game in headless Chrome
→ plays it like a person: walks, talks, drives, solves the case
→ checks the live 3D scene against my rules, with a screenshot of every failure

No AI in the tests: same steps, same verdict, every run. 6 suites, 65 tests. What it caught:

🏊 A swimmer who couldn't swim: a townsperson in a walking pose, standing in the pool. (I spotted that one; the harness found why, and now guards it.)
⛳ A golfer floating 9 cm above the mat, holding the club in one wrist
🔴 On the live site: a clue card that lost its picture

The honest part: it was wrong six times first. "Your hero is 8.6 units tall." "Five objects are floating!" (It was bunting.) Lesson: check the screenshot before you trust the number.

(I built it with Claude Code, but the tests themselves are plain, deterministic checks.)

Carousel with real screenshots 👉

Code: github.com/ghanemja/3js_test_harness
Play: art-heist.netlify.app

What would you test first in your game?

#gamedev #threejs #QA #softwaretesting #playwright #indiedev
