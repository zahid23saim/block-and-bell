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
platform, loop and yard capacity as the trains are drawn. Skipping this produced shifts that
deadlocked on impossible bookings - a light engine booked to a shed at a box that has no shed
stands there for ever and holds the section shut. Measured with `test/capacity.mjs` while the
bug was live, the simulator completed 2 nights in 400; with the reservation it completed 398.
The shipped tree has the fix, so that script now prints 400/400 and the before-figure is
history rather than something you can reproduce from this checkout.

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

The rest of `test/` is measurement and harnesses rather than pass/fail: `capacity.mjs`,
`deadair.mjs` and `ceiling.mjs` measure the line, the silences and the value of information;
`traps.mjs` and `planner2.mjs` are sweeps; `autoplay.mjs`, `partner.mjs` and `twoplayer.mjs`
drive the live server. The measurement scripts are what the tuning here is based on: the shift
windows come from measured line throughput, and the clock speed comes from measuring how long
the quiet stretches actually run.

## What is not built

The design document is deliberately larger than what shipped, and it is easier to say so than to
let you find out:

- **Three and four box rings.** The generator supports up to four boxes; the server runs two.
- **Sound.** Specified, not built.
- **Two of the nine trap families.** Seven are implemented (`src/traps.js`): a facility out of use,
  a yard smaller than its board, a loop out of use, a slow section, a priority inversion, late
  running, and a train longer than the loop it is booked into. The conditional stop (T6) and the
  bait pair (T9) are not.
- **The counterfactual** - "the shift you didn't have" - on the Notice.
- **The rejection tests are not a gate.** The design has the generator reroll a shift that fails
  R1-R5. Here they exist as functions in `src/traps.js` and as measurement in `test/ceiling.mjs`,
  and nothing calls them during generation. A shift is certified *solvable*, not *certified to
  require conversation*.

That last point deserves its own paragraph, because measuring it is most of the work in this repo
and the answer was not the one the design expected. Run `test/ceiling.mjs`:

- **R1** asks that sharing every card but no live road occupancy still costs 12-30 minutes. The
  measured cost of that channel is **0.0**. Once the planner controls the hold decision it can
  reproduce anything occupancy knowledge would have forced, so R1 tests a channel worth nothing.
- **R3** asks for three facts at turn 1 that are each individually worth 8 minutes. The entire
  information content of a turn-1 night measures **6.8**. Twenty-four minutes of value cannot be
  extracted from it.
- **R2** - delete one box's book - is the one that behaves sensibly. It wants 15 minutes and
  measures about **7.6 at turn 1 and 25.7 at turn 3**, so it certifies on the bigger nights only.
- **R4** (no box idle more than 5 simulated minutes) currently **fails**: `test/stall.mjs` measures
  a median longest silence of 6 minutes. The clock speed and offering trains ahead were tuned
  against that number rather than hiding it.
- **R5** (a confused pair still reaches a report) **holds**: 60 of 60 nights finish.

Those thresholds were written without an implementation to check them against. They are kept in
the published design exactly as authored.

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
