# BLOCK & BELL

**One single track. Two signal boxes. You can only see your own — so say it out loud.**

Play: **https://block-and-bell.zahid23saim.workers.dev**

Two to four players work a single-track railway at night in 1897, each in their own
signal box, from separate devices. Only one train may occupy the section between two
boxes at a time, so every movement has to be asked for and granted.

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
node test/generator.mjs    # determinism, yield, invariants, achievability
node test/shift.mjs        # the split rule, time-release, the book
node test/planner.mjs      # knowledge monotonicity — more information is never worse
node test/fullgame.mjs     # end-to-end against the deployed worker
node test/autoplay.mjs     # two automatic signallers play a whole night
```

## A note on the planner

The rejection tests ask whether talking to each other is *necessary* — whether a pair who
share nothing do measurably worse. Answering that needs a planner, not a heuristic: a
reactive policy can be made *worse* by knowing more, because it reacts differently rather
than better. An earlier version showed exactly that, and the measurement was meaningless
until the planner replaced it. The planner is monotone in knowledge by construction, since
it can always ignore a fact.

Built for the Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge.
