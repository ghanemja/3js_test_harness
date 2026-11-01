My game had a swimmer who couldn't swim.

She was standing in the pool. So I built a robot that plays my game to find bugs like that.

The Vanishing Gallery is a hand-drawn art-heist game I made on a tiny 3D planet: three.js, plain JavaScript, no build step. Every push to main deploys straight to the web. Every bug does too.

Over months of building it, my notes had filled up with ~220 hard-won rules. "Nothing floats." "Feet on the ground." "Roads go around buildings." "No moonwalking." Nothing was checking any of them.

So I built a test harness that:

→ boots the real game in headless Chrome
→ plays it like a person: walks, talks to suspects, drives, solves the case
→ measures the live 3D scene against my own rules
→ shows every failure with what broke, where, which rule, and a screenshot

6 suites. 65 tests. The whole story, from title screen to "Case closed".

What it caught:

🏊 The swimmer was a townsperson in a walking pose, sunk to her chest. I spotted that one by eye; the harness found why. Now she swims breaststroke, and a test fails if she ever stands up again.
⛳ The golfer floated 9 cm above the mat, held the club in one wrist, and never swung.
🪑 I added two benches with two deliberate mistakes. It caught both and photographed the floating one.
🔴 Pointed at the live site after three big merges: a clue card that lost its picture, and a shader count creeping up.

The part nobody posts: the harness was wrong six times before it was right. "Your hero is 8.6 units tall." "Five objects are floating!" (It was bunting.)

Lesson: look at a screenshot before you trust a number. Now every exception is checked in a picture and written down with a reason.

It's modelled on ISTQB's game-testing syllabus and how studios like Rare test Sea of Thieves, scaled down to one person and a browser.

The carousel walks through it with real screenshots. 👉

Code: github.com/ghanemja/3js_test_harness
Play: art-heist.netlify.app

What would you test first in your game?

#gamedev #threejs #QA #softwaretesting #webdev #playwright #indiedev
