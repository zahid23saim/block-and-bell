# BLOCK & BELL

**One single track. Two signal boxes. You can only see your own — so say it out loud.**

Play: **https://block-and-bell.zahid23saim.workers.dev**

Two players work a single-track railway at night in 1897, each in their own signal
box, from separate devices. Only one train may occupy the section between them at a
time, so every movement has to be asked for and granted. On your own, you work both
boxes and the Notice records that you did.

The catch is what is printed where:

> **The working orders that govern your trains are printed only on your neighbour's
> screen, and the details those orders act on are printed only on yours.**

Neither half is an answer. Your own screen can be confidently, printedly *wrong* about
your own yard — and only your neighbour holds the correction.

No app, no account, no sign-in. A four-letter room code and a link.

---

## How it holds together

**The server is authoritative for everything, including which buttons exist.** A client
renders exactly the actions it is handed. `sliceFor(boxId)` in [`src/shift.js`](src/shift.js)
is the only path by which a client ever learns anything, so a box physically cannot be
sent a fact it is not entitled to. The asymmetry is enforced at the wire, not hidden in CSS.

**Every shift is generated, and solved before it is printed.** The generator draws a
line, draws the night's workings, and then *forward-simulates a solution*. Only once it
has completed the night itself does it derive the printed timetable backwards from that
solution. So the book a player reads is provably achievable rather than merely plausible —
certified across 600 generated lines in [`test/generator.mjs`](test/generator.mjs).

**Trains are never booked somewhere they cannot go.** Disposals are reserved against real
platform, loop and yard capacity as the trains are drawn. Skipping this produced shifts
that deadlocked on impossible bookings: the underlying simulator completed **2 nights in
400**. With it, 398.

**A wrong decision is expensive, not fatal.** A train that cannot go where it is booked
stands at the home signal and holds the section shut behind it. It can always be shunted
or detached in the end, so a confused pair reaches a report rather than a dead end.

---

## The parts

| File | What it does |
|---|---|
| [`src/generator.js`](src/generator.js) | Seeded shift generation, the railway simulator, solve-first / book-backwards |
| [`src/planner.js`](src/planner.js) | Beam search over dispatch order and hold decisions |
| [`src/traps.js`](src/traps.js) | The night's notices, the split rule, time-release, rejection tests |
| [`src/shift.js`](src/shift.js) | Runs a live night; owns the per-seat slice and the Notice of Delay |
| [`src/index.js`](src/index.js) | Durable Object: rooms, seats, the block cycle, the clock |
| [`public/index.html`](public/index.html) | The whole client, in one file |
| [`src/content.js`](src/content.js) | 24 workings, 8 classes, 60 boxes, 36 notices, 40 decoys, 208 vignettes |

Cloudflare Workers + Durable Objects, SQLite-backed. Room state is persisted rather than
held in memory, so a reload restores your seat, your book and the register you missed.

## Why Durable Objects

The game is unbuildable on a backend the players can read. With a client-visible database
and no logins you cannot hide one player's state from another, and the entire premise
collapses the moment somebody opens devtools. A Durable Object holds the true railway and
sends each connection only its own view.

## Tests

```bash
node test/generator.mjs   # determinism, yield, invariants, achievability (600 lines)
node test/shift.mjs       # the split rule, time-release, the book
node test/stall.mjs       # plays 60 nights locally: can a game always be finished?
node test/planner.mjs     # knowledge monotonicity - more information is never worse
node test/solo.mjs        # one player can finish the tutorial and book on alone
node test/fullgame.mjs    # end to end against the deployed worker
node test/soloplay.mjs    # plays a whole night through to the Notice
```

The live tests hit the deployed worker; point them elsewhere with `BB_BASE`.

`test/capacity.mjs`, `test/deadair.mjs` and `test/ceiling.mjs` are measurement scripts rather
than pass/fail tests. They are what the tuning in this repo is based on: the shift windows come
from measured line throughput, and the clock speed comes from measuring how long the quiet
stretches actually run.

## What is not built

The design document is deliberately larger than what shipped, and it is easier to say so than to
let you find out:

- **Three and four box rings.** The generator supports up to four boxes; the server runs two.
- **Sound.** Specified, not built.
- **The bait pair (T9)** - a notice whose obvious application is your own train while its real
  bite is on a train you cannot see. The other eight trap families are implemented.
- **The counterfactual** - "the shift you didn't have" - on the Notice.

Two rejection tests in the design (R1, R3) turned out to be uncertifiable rather than unbuilt.
Measured against a planner, the channel R1 tests is worth 0.0 minutes, and R3 at turn 1 asks for
24 minutes of value from a night whose entire information content is worth 6.2. Those thresholds
were written without an implementation to check them against. R2 certifies and is implemented.

## The design document

[`docs/DESIGN_SPEC.md`](docs/DESIGN_SPEC.md) is the original design the game was built from,
kept as written. Section 16 is a ten-step build order; the list above is the honest account of
which steps landed.

## A note on the planner

The rejection tests ask whether talking to each other is *necessary* — whether a pair who
share nothing do measurably worse. Answering that needs a planner, not a heuristic: a
reactive policy can be made *worse* by knowing more, because it reacts differently rather
than better. An earlier version showed exactly that, and the measurement was meaningless
until the planner replaced it. The planner is monotone in knowledge by construction, since
it can always ignore a fact.

Built for the Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge.
