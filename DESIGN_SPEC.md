# BLOCK & BELL — Canonical Build Spec

**Version 1.0 — final. Build from this document. No further design decisions required.**

Base design: *Block & Bell* (aggregate winner, 4.42). Every fatal flaw named by the three judges is fixed in the body of this document and audited in §13. Every graft idea is ruled on in §14. Contested calls are settled in §15.

---

## 0. What we are building, and the one sentence that has to land

A two-to-four player co-operative game about moving trains through a single-track railway section that only one train may occupy at a time. Each player is a signaller in their own signal box. Nobody can see anybody else's track. And — the spine of the design — **the working orders that govern YOUR trains are printed only on your NEIGHBOUR'S screen**, while the details those orders act on are printed only on yours. Neither half is an answer. The answer only exists in a sentence somebody types.

The pitch a judge repeats to a colleague: *"Two strangers work a single-track railway from opposite ends. Neither can see the other's line, and each one is holding the other's rulebook."*

The session a judge actually experiences: link → name → 40-second unlosable tutorial they perform **on each other** → one 3-minute shift → a printed **NOTICE OF DELAY** with their own worst sentence quoted on it, timestamped. Five and a half minutes, cold, no host, no install, no account.

Why it scores:
- **Execution (25%)** — one shared mutable object per section with exactly one writer; complete per-seat snapshots, never deltas; every button authored by the server; no canvas, no images, no 60fps anything. 60 KB gzipped client, sub-2 KB snapshots.
- **Creativity (25%)** — cross-wired orders, and the **bait fact**: a notice whose obvious application is to a train on your own screen while its real bite is on a train you cannot see.
- **Usefulness/Value (25%)** — two strangers on different networks become a competent pair in six minutes, and leave holding an artifact. Fully playable by a screen-reader user against sighted partners.
- **Polish (25%)** — the ribbon, the glosses, the pause-on-drop, the humanised confirms, the receipts, the counterfactual, the archive.

---

## 1. Name and tagline (real on-screen copy)

Title card, exactly:

> ## BLOCK & BELL
> **One single track. Two signal boxes. You can only see your own — so say it out loud.**
>
> Two to four players · about six minutes a shift · no app, no account, no name required.
>
> `[ OPEN A BOX ]`  `[ JOIN WITH A CODE ]`

Document title in the browser tab: `BLOCK & BELL — one track, two boxes`.
Contest cover image: a real **NOTICE OF DELAY** card rendered from seed `HAWKSMERE / SPAR-2` (§4.9). Not concept art. The game's own output.

---

## 2. The 30-second cold open, screen by screen

Hard rule: **no modal tutorial, no carousel, no video, and no sentence longer than twelve words before the player's first action.**

### T+0s — Landing (one screen, no scroll, 375px)
Lamp-black field, a single brass-rimmed signal lamp glowing amber in the corner, CSS only.

> **BLOCK & BELL**
> One single track. Two signal boxes. You can only see your own — so say it out loud.
> `[ OPEN A BOX ]`   `[ JOIN WITH A CODE ]`
> *Two players, two phones, about six minutes.*

### T+3s — Code (opener)
Four letters at 64px brass on black, tabular mono.

> **SPAR**
> `[ Copy invite link ]` `[ Share ]`
> Read your book while you wait. 1 of 2 signallers on duty.

The opener's board is **already live and readable**. Nobody stares at a lobby. Joiner path: four fat 56px boxes, auto-advance, paste-a-code detected from clipboard on focus, case-insensitive.

### T+8s — The duty card (one card, six lines, one button)
Generated, in character, naming only what is true of this seat:

> You are the signaller at **DUNMERE BOX**.
> Tonight you work the Hawksmere branch with **HARTLE BOX**, seven miles north.
> Only one train may be in the section between you at a time — so you must ask, and you must be told.
> Three things live on your screen and nowhere else: **your platform**, **your signals**, and **the orders for HARTLE's trains**.
> Hartle cannot read your orders. Tell them.
> `[ TAKE THE DUTY ]`

Hartle's card mirrors it. Neither card contains a jargon term that has not been glossed on the same card.

### T+13s — THE LIGHT ENGINE (the unlosable tutorial)
The shift clock **does not start**. There is one train: `12 LIGHT ENGINE`, northbound, empty section, no deadline, no orders, no notices. It cannot be got wrong: at every instant exactly one action is legal, every other control is visibly dimmed, and the server refuses anything else in character.

Each side is walked through by the ribbon plus one coach arrow pinned to the exact control:

| Beat | Dunmere's ribbon | Hartle's ribbon | Coach arrow |
|---|---|---|---|
| 1 | The light engine wants to go north. Ask Hartle if they can take it. | Nothing yet. Dunmere is about to ask you. | Over `ASK` — *"Tap this. You don't have to type."* |
| 2 | Asked. Wait for Hartle. | Dunmere is asking for the 12 Light Engine. Your section is clear — say yes. | Over `GIVE LINE CLEAR` |
| 3 | Hartle can take it. Send it. | Given. It's coming. | Over `SEND INTO SECTION` |
| 4 | In the section. Nothing else may enter. | It's in. Seven miles. Put it somewhere when it gets here. | Over `TO THE SHED` |
| 5 | — | Tell Dunmere the section's clear or nothing else can move. | Over `CLEAR MY SECTION` |

Elapsed 35–45 s. Both players have used four controls, and **the first thing that happened in the game was a stranger helping them.** Each coach arrow is written to `localStorage` on first use and never appears again on that device. There are exactly six coach arrows in the entire game.

### T+~50s — READY
Both boxes see `[ I HAVE THE DUTY ]`. **The sim clock does not start until every seated box has tapped it.** A phone that joined late never burns anyone's shift. Then: one bell, the lamps come up, the ribbon says the first real thing.

Total cold-open budget: the player has read 71 words and taken four actions before the clock exists.

---

## 3. Roles

There is **one role**, instanced per box, and boxes differ by *generated property*, not by code path. This is deliberate: one screen to build, one screen to test, and no seat can be the manual-reader.

Boxes are a ring: **each box holds the WORKING ORDERS BOOK for the box immediately south of it, cyclically.** Two boxes = a ring of two, each holding the other's book.

### THE SPLIT RULE (normative — the whole game)

| Concern | Lives on |
|---|---|
| A box's roads, their printed capacities, and the trains standing on them **in full detail** (number, class, length in wagons, booked time, delay, destination, facility needs, conditional-stop flags) | **That box only** |
| A box's section lamps and its own legal actions | That box only |
| **Priorities, connections and deadlines for a box's trains** | **The neighbour's book** |
| **District notices that invalidate what a box can see about its own premises** (facility down, yard shrunk, loop out of use, section slow) | **The neighbour's book** |
| Late-breaking amendments (early running, cancellations, a pump not fitted) | Wired **to the neighbour's book**, mid-shift |

Consequence, stated plainly because it is the design: **a box's own screen can be confidently, printedly wrong about its own yard, its own loop and its own water column, and only the neighbour holds the correction.**

### DUNMERE BOX (example seat, generated)

**SEES:** sim clock, room code, connection lamp. One section lamp (north, to Hartle): `CLEAR` / `LINE CLEAR GIVEN TO HARTLE` / `OCCUPIED — 231 ↓ Mail, due 22:47`. Its own roads: `PLATFORM (1 road)`, `YARD — 30 wagons, 4 roads`, `WATER COLUMN`, `COAL STAGE`, and **no loop**. Every train standing on those roads in full detail. Its arrival stack. Its own book: **the orders for HARTLE's trains**, each card headed *"THIS CONCERNS HARTLE. They cannot read it."* The shared register (every bell, message, fact and movement, sim-timestamped). Its own legal actions only.

**NEVER SEES:** Hartle's platform, loops, yard, arrival stack or shed. Any train standing at Hartle — not its number, class, length, delay, destination or needs — unless Hartle says so or holds it up. Hartle's book (its own orders). Whether a fact in its own book is live. Any other box's chips, pending actions, or draft messages. Its own true yard capacity tonight, if a notice in Hartle's book overrides it.

**DOES:** `ASK LINE CLEAR (train, disposal intent)` · `GIVE LINE CLEAR (accepting a named disposal)` · `HOLD THE LINE (reason)` · `SEND INTO SECTION` · `CLEAR MY SECTION` · disposals `TO PLATFORM / TO LOOP n / RUN THROUGH / TO YARD / WATER / COAL / SHUNT / DETACH n WAGONS / HOLD AT SIGNAL / RELEASE` · `SEND THIS VERBATIM (fact)` · `HOLD UP (train)` · free text · quick phrases · `SIGNALMAN'S BREAK` (2 per shift per box) · `WORK BOTH BOXES` (only when offered).

### HARTLE BOX (the same seat, different generated properties)
Platform (1), **LOOP 1 — 24 wagons**, **LOOP 2 — 12 wagons**, yard, engine shed, no water, no coal. Holds **DUNMERE's orders**.

**Generator invariant:** in every line, exactly one box has **no loop**. That box is the crunch: a train it cannot dispose of blocks everything behind it, and the reason it cannot dispose of it is usually printed in somebody else's book.

### Middle boxes (3–4 players)
Identical seat with **two** sections (north and south) and the same verbs. No new mechanics, no new protocol. At 375px a segmented `NORTH | SOUTH` control draws one corridor full height and collapses the other to a 28px lamp strip; the collapsed strip still flashes and still speaks in the ribbon.

### RELIEF SIGNALLER (5th–8th player, and every reconnect)
Attaches to an existing box, sees that box's exact screen, has that box's exact controls. Actions are attributed by name in the register. Two hands per box, four boxes, hard cap eight. The ninth visitor gets: *"Every box on this line is worked. Open your own line — it takes four seconds."* plus a fresh code. **No spectator mode exists**, because a spectator would break the split.

---

## 4. A full shift, beat by beat, with real generated content

**HAWKSMERE BRANCH · TURN 2 · SEED `SPAR-2` · 22:30 → 00:00 · 7 trains · PAR 38 delay minutes.**
Sim clock: 1 sim minute per 4 real seconds. 90 sim min = 6 minutes real.
Ivy is Hartle, on an iPhone on cellular. Sam is Dunmere, on a laptop three time zones away. They met forty seconds ago.

### 4.1 What Ivy's phone shows (and Sam can never see)

```
22:30   SPAR   ● wire good                      HARTLE BOX
── Dunmere is asking nothing. You have three trains and a book. ──

SECTION SOUTH — DUNMERE, 7 MILES            ▣ CLEAR
   mile 7 ─ 6 ─ 5 ─ 4 ─ 3 ─ 2 ─ 1 ─ 0

PLATFORM      231   SOUTHBOUND MAIL      express pass.   out 22:40   delay 0
LOOP 1 (24)   4-B   BALLAST              31 wagons       ↓ terminates DUNMERE YARD
                    booked to take WATER at Dunmere       DELAY 26 ▲
LOOP 2 (12)   empty
ARRIVAL       605   STOPPING PASSENGER   out 23:12   conditional stop at Dunmere
SHED          —

[ BOARD ]  [ BOOK ③ ]  [ WIRE ]
```

Ivy's **BOOK — ORDERS FOR DUNMERE'S TRAINS AND PREMISES. *Dunmere cannot read these. Tell them.***

- **H1 · ORDER, 22:30** — `88 MILK` (northbound, booked out Dunmere 22:44) must be **into the section by 22:50** or the churns miss the 23:30 boat train. Milk takes precedence over all freight. `[ SEND VERBATIM ]`
- **H2 · DISTRICT NOTICE 14/A, 22:30** — **DUNMERE water column FROZEN.** No engine may take water at Dunmere before 23:00 (relief pump). `[ SEND VERBATIM ]`
- **H3 · DISTRICT NOTICE 14/B, 22:30** — **DUNMERE YARD: three roads out of use** (permanent-way gang). Capacity tonight **18 wagons**, not 30. `[ SEND VERBATIM ]`
- **decoy · NOTICE, 22:30** — Dunmere down-side waiting room locked; passengers to use the up side.
- **decoy · NOTICE, 22:30** — Dunmere coal stage weight limit 12 tons.

**H2 is the bait.** Ivy's own ballast is booked to water at Dunmere, so she reads the frozen-column notice, applies it to `4-B`, files it mentally as *dealt with*, and never sends it. Its real bite is on a train she has never seen.

### 4.2 What Sam's laptop shows (and Ivy can never see)

```
22:30   SPAR   ● wire good                      DUNMERE BOX
── Your section is clear. You have the 22:44 Milk and no loop. ──

SECTION NORTH — HARTLE, 7 MILES             ▣ CLEAR
PLATFORM (the only road)   88   NORTHBOUND MILK   out 22:44   delay 0
YARD — 30 wagons, 4 roads  empty
WATER COLUMN ✓   COAL STAGE ✓   LOOP — none
ARRIVAL   9-F  FISH SPECIAL  northbound  passes 23:26  34 wagons
                              booked to take WATER at Dunmere
```

Sam's **BOOK — ORDERS FOR HARTLE'S TRAINS AND PREMISES. *Hartle cannot read these. Tell them.***

- **D1 · ORDER, 22:30** — `231 MAIL` (southbound, booked out Hartle 22:40): **ABSOLUTE PRIORITY.** Runs through Dunmere without stopping. Must not be delayed for any freight.
- **D2 · SECTION NOTICE 14/F, 22:30** — Speed restriction at **mile 3 until 23:00**. Any train in the section before 23:00 takes **7 minutes, not 4**.
- **D3 · DISTRICT NOTICE 14/G, 22:30** — **HARTLE LOOP 2 out of use tonight** (gang working the points).
- two inert decoys.

So the biggest, reddest number on Ivy's screen is a ballast train 26 minutes late, the section is empty, and the obvious move destroys the shift three separate ways. The only thing between Ivy and that move is Sam's screen.

### 4.3 The opening — the correct refusal

```
22:30:12  DUNMERE   [chip] I have three notices for Hartle. Ask me before you move anything.
22:30:24  HARTLE    taps 4-B → ASK LINE CLEAR → disposal intent: TO YOUR YARD
          ▮ bell · DUNMERE's ribbon: "Hartle is asking Line Clear for 4-B BALLAST,
            southbound, to be put in YOUR YARD. Your section is clear.
            Give it, hold the line, or ask why."
22:30:31  DUNMERE   hold on. three things. what's it booked to do at my end and how long is it?
22:30:44  HARTLE    [chip] 4-B BALLAST, loop 1, 31 wagons, 26 minutes down,
                    terminates your yard, booked to take water at Dunmere.
22:30:58  DUNMERE   then no, and here's why. my book says your 231 Mail is
                    ABSOLUTE PRIORITY and must not be delayed for freight.
                    what time is it booked out?
22:31:10  HARTLE    22:40, stood at my platform.
22:31:19  DUNMERE   and it isn't four minutes of track tonight —
          [SEND VERBATIM · D2] SECTION NOTICE 14/F. Speed restriction at mile 3
          until 23:00. Any train in the section before 23:00 takes 7 minutes, not 4.
22:31:26  DUNMERE   ballast goes now, it's in there till 22:38 and the Mail loses its path.
          HOLD THE LINE — reason: PRIORITY TRAIN BOOKED
22:31:40  HARTLE    didn't have any of that. Mail it is.
```

`HOLD THE LINE` with a stated reason is a **graded action** (§4.9, "BEST DECISION"). Refusing well is scoring, not damage control.

### 4.4 The bait fires — and is caught once, half

```
22:31:52  DUNMERE   also: 31 wagons. my yard's 30. that's already tight —
22:32:03  HARTLE    ah. [SEND VERBATIM · H3] DISTRICT NOTICE 14/B. DUNMERE YARD:
          three roads out of use. Capacity tonight 18 wagons, not 30.
22:32:11  DUNMERE   eighteen. my own screen says thirty. lovely.
22:32:18  DUNMERE   so it can't come whole. can you split it?
22:32:29  HARTLE    loop 1 holds 24. I can detach 13 and keep them here.
                    18 down to you, 13 in my loop.
22:32:41  DUNMERE   do that. after the Mail. and after the Milk.
```

Ivy sent H3 and H1 within the first two minutes. She did not send **H2**. She had already spent it on her own ballast. Nothing on her screen can tell her it matters to anything else.

### 4.5 The block cycle, three times

```
22:32  HARTLE  231 → ASK (disposal intent: RUN THROUGH)
22:33  DUNMERE GIVE LINE CLEAR, accepting: RUN THROUGH        ▮▮▮–▮ bell
22:40  HARTLE  SEND INTO SECTION      ▮▮   both corridors go amber:
               OCCUPIED — 231 ↓ Mail, due Dunmere 22:47 (restriction)
22:47  DUNMERE RUN THROUGH, then CLEAR MY SECTION             ▮▮–▮
22:48  DUNMERE 88 → ASK (disposal intent: TO YOUR PLATFORM)   — inside the 22:50
               deadline Sam never knew existed, because Ivy sent H1 at 22:30
22:55  HARTLE  TO PLATFORM, CLEAR MY SECTION
22:56  HARTLE  detach 13 wagons → LOOP 1, then 4-B (18 wagons) → ASK
23:03  DUNMERE TO YARD ✓, CLEAR MY SECTION
```

Vignette on each handover, one line, from a table keyed to class and hour:
`REUNITED-equivalent:` *"the churns made the 23:30 boat."* · *"the Mail is away south and somebody in Wrenfield gets a letter on Tuesday."*

### 4.6 The late facts (the anti-front-loading engine)

Three of tonight's eight live facts **did not exist at 22:30**. A dump cannot cover them.

```
22:51  ▮ district wire → DUNMERE ONLY
       NOTICE 14/C. 9-F FISH SPECIAL running 20 minutes early.
       Will be at your box 23:06, not 23:26.

23:04  ▮ district wire → DUNMERE ONLY
       NOTICE 14/D. Wrenfield branch train CANCELLED tonight. No connection at Dunmere.
       → bites HARTLE's 605, whose card (on Ivy's screen) reads
         "conditional stop at Dunmere". Sam must tell her to run it through.

23:18  ▮ district wire → HARTLE ONLY
       NOTICE 14/E. Dunmere relief pump NOT FITTED. Water column out for the night.
```

### 4.7 Where it goes wrong

```
23:05  DUNMERE   fish is early, 23:06 not 23:26. I need it away north sharpish,
                 it's perishable and it's 34 wagons.
23:06  DUNMERE   also your 605 — my book just gained a line. Wrenfield branch is
        [SEND VERBATIM · D-late] NOTICE 14/D. Wrenfield branch train CANCELLED.
                 No connection at Dunmere. so don't stop it, run it through.
23:06  HARTLE    noted, 605 runs through. thank you.
23:07  DUNMERE   fish is at my column. it's booked to water here. column's fine
                 on my screen. taking water.
23:07  HARTLE    NO
23:07  HARTLE    [SEND VERBATIM · H2] DISTRICT NOTICE 14/A. DUNMERE water column
                 FROZEN. No engine may take water at Dunmere before 23:00
                 (relief pump). — I'm sorry. I had that at 22:30. I thought it
                 was about my ballast.
23:07  DUNMERE   it's 23:07. so it's thawed?
23:18  ▮ HARTLE  district wire: relief pump NOT FITTED. Column out for the night.
23:18  HARTLE    it is not thawed. it is never thawing. send it to me, I've got water.
23:19  DUNMERE   9-F → ASK, disposal intent: WATER AT YOUR PLATFORM
23:20  HARTLE    GIVE LINE CLEAR, accepting: WATER AT MY PLATFORM
23:32  fish away north, watered.  Held at Dunmere: 14 minutes.
```

Then `77 COAL EMPTIES` and `12 LIGHT ENGINE` go through clean, and the clock reaches 00:00.

### 4.8 The board never breaks

Two moves in this shift were physically refused by the server, in character, costing nothing but a half-second:

- 22:57 Ivy taps `SEND INTO SECTION` for the detached ballast before asking. `toast:` *"Line not clear — Dunmere hasn't given you the section."*
- 23:11 Ivy tries `605 → LOOP 2`. `toast:` *"Loop 2 is out of use tonight — the gang's on the points. Dunmere's book has said so since 22:30."* (Cost: 2 sim minutes. Diagnosable. Printed in the report.)

### 4.9 THE SHIFT REPORT — the one screen they finally see together

```
────────────────────────────────────────────
 NOTICE OF DELAY            HAWKSMERE BRANCH
 TURN 2 · SEED SPAR-2 · 22:30–00:00 · ROOM SPAR

   THE MAIL RAN. THE FISH WAITED.

 GRADE  B   —  a clean run with one cold minute
 7 of 7 handed over · 0 rule violations
 DELAY 41 minutes against a PAR of 38
────────────────────────────────────────────
 AS BOOKED  ▁▁▁▁▁▁▁   AS RUN  ▁▁▁▁▁▁▁
 231 MAIL    ████████──────────  on time
 88  MILK    ──████████────────  +4
 4-B BALLAST ──────███████████─  +23  (26 on arrival, recovered 3)
 605 STOPPER ─────────█████████  +2   (loop 2 out of use, 2 min)
 9-F FISH    ──────────███──███  +14  ◀ the cold minute
 77  EMPTIES ─────────────█████  on time
 12  ENGINE  ██────────────────  on time
────────────────────────────────────────────
 ATTRIBUTED
 +23  4-B BALLAST — arrived 26 down and could not be sent before the
      Mail. Unavoidable. Three minutes were recovered by detaching.
 +14  9-F FISH — held at Dunmere for a water column that was never
      going to work.
 + 4  88 MILK — waited for the Mail. Correct.
 + 2  605 — Loop 2.
────────────────────────────────────────────
 THE RECEIPT
   HARTLE had "DUNMERE water column FROZEN" on screen at 22:30.
   It reached the wire at 23:07.  Held: 37 minutes.
   HARTLE, 23:07 — "I thought it was about my ballast."

 BEST DECISION OF THE SHIFT
   22:31 — DUNMERE held the line for 4-B and said why.

 THE SHIFT YOU DIDN'T HAVE
   Give Line Clear at 22:31 instead. The ballast takes 7 minutes,
   not 4, and stands on Dunmere's only road at 22:38 — 31 wagons
   into 18 — and cannot water. The Mail leaves at 22:45:
   ABSOLUTE PRIORITY BREACHED. The Milk misses the boat by 40
   minutes. Grade D. You avoided that in ninety seconds.

 HELD FACTS  37 minutes (1 of 8 live facts)
────────────────────────────────────────────
 [ NEXT TURN ]  [ SEND THIS EXACT SHIFT ]
 [ SAVE THE NOTICE ]  [ PIN TO THE ARCHIVE ]
```

`SAVE THE NOTICE` renders the card as a PNG client-side (SVG → canvas → blob), letterpress-styled, room code and seed on it. That is the screenshot, the cover image, and the reason a room plays a fourth shift.

`PIN TO THE ARCHIVE` (explicit, opt-in, one confirm sheet naming exactly what is published: grade, seed, delay, and up to three quoted register lines) posts to a public gallery with two rooms: **THE CLEAN SHIFTS** and **THE WORST BOXES IN THE DISTRICT**. Per the EYEWITLESS finding, the second is the one people share.

**Headline generator:** `[SUBJECT] [VERB]. [CONTRAST].` Subject = the best-performing train class. Verb from `{RAN, GOT AWAY, MADE THE BOAT, WENT SOUTH ON TIME}`. Contrast = the worst-delayed train + `{WAITED, DID NOT, SAT AT A FROZEN COLUMN, IS STILL THERE}`. Special cases: par matched exactly → `"NOTHING TO REPORT. FOR ONCE."`; zero held minutes → `"EVERYTHING WAS SAID IN TIME."`; grade D → `"NINE TRAINS, ONE SENTENCE, THIRTY-FOUR MINUTES."`

---

## 5. The generator

Deterministic, seeded, solved-backwards, and certified by five rejection tests before it ships a shift. `seed = fnv1a32(roomCode + ":" + turnNo)`, PRNG = mulberry32. Everything below is generation-time; the client receives only its own slice.

### 5.1 Step 1 — THE LINE
`boxCount = clamp(seatedBoxes, 2, 4)`. Per box: `platform: 1`, `loops: pick([[],[L],[L,L]])` with `L.length ∈ {12,16,20,24}` wagons, `yard: {printedCapacity: pick([18,24,30]), roads: 2..4}`, `facilities ⊆ {WATER, COAL, SHED}`, `sectionMiles: pick([5,7,9])`.
**Invariant L1:** exactly one box has `loops == []`.
**Invariant L2:** at least one box has WATER and at least one does not.

### 5.2 Step 2 — SOLUTION FIRST (never generate a puzzle you have not solved)
`N = {5, 7, 9}[turn-1]`. Draw N trains: identity from a 24-row table, class from 8 (`express passenger, stopping passenger, mail, milk, express freight (fish/perishable), ballast, coal empties, light engine`), `lengthWagons`, origin box, destination (a box, or THROUGH), `facilityNeed ∈ {none, WATER, COAL}`, `disposal ∈ {platform, loop, through, yard, shed}`, `conditionalStop?`.
Forward-simulate with a random-but-legal dispatch policy under one-train-per-section and road capacity. Accept as the **CANONICAL SOLUTION** if it completes inside the window with ≥ `slack[turn]` spare (`{45%, 25%, 12%}`). Up to 200 attempts.

### 5.3 Step 3 — BOOK BACKWARDS
Derive every printed booked time from the canonical solution minus 0–2 minutes of pad. The timetable a player reads is therefore provably achievable.

### 5.4 Step 4 — PERTURB with `K = {2, 4, 6}[turn-1]` traps

| # | Trap | Bites | Parameters |
|---|---|---|---|
| T1 | FACILITY DOWN at box X until t (or all night) | any train with that need arriving before t | `X, need, t` |
| T2 | YARD SHRUNK at X to capacity c | terminating freight longer than c | `X, c < printedCapacity` |
| T3 | LOOP OUT OF USE at X | anything needing that loop | `X, loopId` |
| T4 | SECTION SLOW until t | path planning; 7 min not 4 | `sectionId, t` |
| T5 | PRIORITY INVERSION | first-come-first-served | `trainId, {absolute \| connection at time t}` |
| T6 | CONDITIONAL STOP + a resolving notice | stopping decisions | `trainId, condition` |
| T7 | EARLY/LATE RUNNING by m minutes | everything downstream; **always delivered late** | `trainId, m` |
| T8 | LENGTH vs LOOP | looping; forces DETACH | `trainId, w > maxLoopLen(X)` |
| T9 | **BAIT PAIR** — a notice whose obvious application is a train on the holder's own screen, while its real bite is a train on the neighbour's | the holder's confidence | mandatory ≥1 from turn 2 |

### 5.5 Step 5 — SPLIT AND TIME-RELEASE
Every derived fact is filed in the book of the box that does **not** own the affected road or train (THE SPLIT RULE). `knownFrom`: 60% at shift start; 40% scheduled uniformly in `[0.25, 0.85] × window` and delivered as a **district wire** to exactly one box, with a sounder chime. T7 is always time-released.

### 5.6 Step 6 — DECOYS
Add `2 + turnNo` true-but-inert notices per book from a 40-row table. At most one may become live during the shift. Decoys are never penalised and never help; their cost is the partner's attention, which is the only currency a dump actually spends.

### 5.7 Step 7 — PAR
Beam search (width 250, depth `N×6`) over state `{clock, per-section occupancy and grants, per-road contents, per-train state, facts-known-per-box}` assuming **perfect communication** (every fact known to every box the instant it exists). Minimum achievable total delay = **PAR**, printed on screen. Grade bands: `A ≤ PAR+3`, `B ≤ PAR+12`, `C ≤ PAR+30`, `D` otherwise. A tie at par is a genuine perfect shift and says so.

### 5.8 Step 8 — THE FIVE REJECTION TESTS (reroll on any failure; max 40 rerolls, then fall back to one of 64 pre-certified shipped seeds)

- **R1 — THE DUMP TEST.** *The direct answer to the front-loading flaw.* Re-solve under the policy *"each box posts every card it holds the moment it appears, and nothing else is ever said"* — so facts are shared but per-train hidden attributes and live road contents are not. Require best achievable delay ≥ `PAR + {12, 20, 30}[turn-1]`. If a dump can reach par, **reroll the shift**. This is enforced per generated shift, not asserted in prose.
- **R2 — NO DECORATIVE SEAT.** For each box `b`: delete `b`'s book and re-solve; require delay ≥ `PAR + 15`. Additionally require that no box can complete its own disposals without at least one fact originating with `b`. (MOTHLIGHT's harder invariant, promoted from assertion to test — this is what makes the 3rd and 4th signaller load-bearing rather than more of the same job.)
- **R3 — CROSS-FACT FLOOR.** At least `{3, 5, 7}[turn-1]` facts must be individually cross-box-necessary (deleting any one alone pushes best delay ≥ `PAR + 8`). At least one such fact must have `knownFrom > start + 0.25 × window`.
- **R4 — NO DEAD AIR.** Simulate the canonical solution; no box may have a window longer than **20 real seconds (5 sim minutes)** with zero legal decisions pending. Reroll otherwise.
- **R5 — SOFT FLOOR.** Under a "nothing clever, never refuse" policy, at least 60% of trains must still be handed over, so a confused pair always reaches a report rather than a dead end.

### 5.9 Table widths (the boredom defence — build wide, not merely enumerated)
24 train identities × 8 classes × 9 length bands × 3 facility needs; **22 facility notices**, **14 section notices**, **11 priority/connection archetypes**, **8 conditional-stop archetypes**, 40 decoys, 18 line names, 60 box names, 26 vignette lines per class. Trap combinations at turn 3 (`K=6`) exceed 10⁷ distinct shifts before timing. Nothing past the copy is hand-authored; no room gets the same night twice.

---

## 6. Difficulty curve

A **DUTY** is three turns with named ranks. Each turn ends in its own printed Notice, so leaving after turn 1 is a complete experience — which is exactly how a contest judge will play it.

| | TURN 1 — RELIEF SIGNALMAN | TURN 2 — BOX SIGNALMAN | TURN 3 — DISTRICT INSPECTOR |
|---|---|---|---|
| Window | 22:30–23:15 (45 sim min, **3 min real**) | 22:30–00:00 (90, 6 min) | 22:30–00:30 (120, 8 min) |
| Trains | 5 | 7 | 9 |
| Traps `K` | 2 | 4 | 6 |
| Late facts | 1 | 3 | 5 |
| Cross-necessary facts | ≥3 | ≥5 | ≥7 |
| New devices | — | bait pair, detach/length, conditional stop | facility fails all night → **PILOTMAN special working**; two simultaneous grants |
| Par slack | 45% | 25% | 12% |
| Clock rate | **1 sim min / 4 s** | **1 sim min / 4 s** | **1 sim min / 4 s** |

**The clock rate never changes.** Difficulty scales by *counted cross-box facts and cascade depth*, never by shortening time — a faster clock raises panic and typing speed, which is not the game. (Graft accepted from MOTHLIGHT; FOGBOUND's and EYEWITLESS's clock-tightening levers explicitly rejected.)

Session shape: cold open 50 s + turn 1 (3 min) + report (40 s) ≈ **5 min to first artifact**; full duty ≈ 22 minutes. `SEND THIS EXACT SHIFT` mints `?room=NEW&seed=SPAR-2` for a head-to-head on an identical night and for a reproducible demo link.

---

## 7. Wire protocol

Single WebSocket per client, JSON text frames, one server process, in-memory rooms. Server is authoritative for everything, including which buttons exist. **Only two server→client message types carry state, and one of them is ephemeral.**

### 7.1 Client → Server

| Event | Payload | Who may send | Notes |
|---|---|---|---|
| `hello` | `{v:1, roomCode?, resumeToken?, name?}` | anyone | idempotent; a reload is just a re-hello |
| `create_room` | `{v:1, name?}` | anyone | returns a 4-letter code |
| `claim_seat` | `{boxId}` | a seated-or-unseated client | vacant seat → seat; occupied → Relief |
| `ready` | `{on:bool}` | any seated client | clock starts only when all seats ready |
| `act` | `{trainId, action, args}` | the box that owns the train or the section | see 7.2 |
| `send_fact` | `{factId}` | the box holding the fact | **only after that card has been opened**; posts verbatim, attributed |
| `hold_up` | `{trainId}` | the box the train stands at | broadcasts number, class, direction, delay — never roads, orders or needs |
| `say` | `{text}` (≤240 chars) | any seated client | free text |
| `chip` | `{chipId, ref?}` | any seated client | server interpolates live values from the sender's own slice |
| `take_seat` | `{boxId}` | offered clients only | WORK BOTH BOXES / relief attach |
| `break` | `{on:bool}` | any seated box | Signalman's Break, 2 per box per shift |
| `next_turn` | `{}` | any seated box | advances when all seats agree |
| `send_shift` | `{}` | any seated box | mints a same-seed share link |
| `pin_archive` | `{consent:true}` | any seated box | requires all seats; opens the consent sheet first |
| `ping` | `{t}` | anyone | 15 s heartbeat |

### 7.2 `act.action` enum and args

```
ASK              {sectionId, disposalIntent}      // intent is MANDATORY
GIVE             {sectionId, acceptedDisposal}    // you accept a NAMED disposal
HOLD_THE_LINE    {sectionId, reasonId, note?}     // reasonId from 9 gloss-backed reasons
SEND_INTO_SECTION{sectionId}
CLEAR_MY_SECTION {sectionId}
TO_PLATFORM      {} | TO_LOOP {loopId} | RUN_THROUGH {} | TO_YARD {} | TO_SHED {}
WATER {} | COAL {} | SHUNT {} | DETACH {wagons} | HOLD_AT_SIGNAL {} | RELEASE {}
PILOTMAN         {sectionId}                      // turn 3 only
```

**TWO KEYS, extended to disposal.** `ASK` must carry a `disposalIntent`; `GIVE` must carry an `acceptedDisposal`. A train cannot enter a section until both boxes have named where it is going. If the disposal then fails, the report attributes the minutes to **both** boxes by name. No misfile is ever one person's fault — which is what makes strangers press READY again.

### 7.3 Server → Client

- `hello_ack {v, roomCode, seatToken, boxId|null, boxes[{id,name,manned,names[]}], phase}`
- **`snapshot`** — the only message carrying state. A complete, per-seat slice. Never a delta. Sent after every accepted event and on every 4-second clock tick. **Clients render `snapshot` only if `seq` exceeds the last rendered `seq`.** That is the entire desync story.

```json
{ "t":"snapshot","seq":417,"phase":"SHIFT","turn":2,"clock":"23:07","paused":false,
  "you":{"boxId":"DUN","name":"Sam","relief":false,"breaksLeft":1},
  "boxes":[{"id":"HAR","name":"HARTLE","manned":true,"typing":false},
           {"id":"DUN","name":"DUNMERE","manned":true,"typing":true}],
  "sections":[{"id":"S1","to":"HAR","miles":7,
               "lamp":"CLEAR","grant":null,"train":null,"noteIds":[]}],
  "roads":[{"id":"PLAT","label":"PLATFORM (the only road)","cap":1,
            "trains":[{"id":"9F","num":"9-F","class":"FISH SPECIAL","dir":"N",
                       "wagons":34,"booked":"23:26","delay":14,
                       "dest":"THROUGH","needs":"WATER","flags":["PERISHABLE"]}]},
           {"id":"YARD","label":"YARD — 30 wagons, 4 roads","cap":30,"trains":[]}],
  "book":[{"id":"D1","kind":"ORDER","concerns":"HARTLE","knownFrom":"22:30",
           "opened":true,"sent":"22:31","text":"231 MAIL: ABSOLUTE PRIORITY…"}],
  "ribbon":"9-F is at your column and it is booked to take water. Ask Hartle first.",
  "legalActions":[{"trainId":"9F","action":"ASK","args":{"sectionId":"S1"},
                   "label":"Ask Hartle to take the 9-F Fish","primary":true}],
  "chips":[{"id":"c_train","label":"9-F FISH SPECIAL, 34 wagons, booked 23:26, needs water"}],
  "register":[{"t":"23:07","kind":"FACT","from":"HARTLE","factId":"H2","text":"…"}],
  "pills":["DUNMERE YARD","HARTLE LOOP 2"],
  "par":38,"delay":41,"handed":6,"of":7
}
```

- `toast {kind, text, ttlMs}` — ephemeral, in character, never state. `"Line not clear — Dunmere hasn't given you the section."` / `"Loop 2 is out of use tonight — the gang's on the points."`
- `pong {t}`

### 7.4 Budgets and limits
Snapshot ≤ 2 KB (turn 3, 4 boxes, 30-line register tail; the register is paged, not resent whole). Client ≤ 60 KB gzipped, no framework or Preact only, no webfont over 30 KB. Rate limits, server-side, dropped with a toast: `say` 1/500 ms and 20/min; `chip` 1/400 ms; `act` 1/250 ms; `send_fact` 1/300 ms. Room codes: 4 letters from a curated 420-word railway noun list, no ambiguous glyphs, screened against a profanity list. Room TTL 15 minutes after the last socket closes.

---

## 8. Failure and edge cases

1. **A player drops (socket closes).** Their box turns `manned:false` within 3 s. **The sim clock pauses immediately** and every ribbon reads `WAITING FOR DUNMERE` — never `wire down`, never a blamed lamp. Pending grants are preserved. A train already in a section stays where it is.
2. **They come back within 15 minutes.** `hello {resumeToken}` (localStorage, per room) restores the **same seat**, same book, full snapshot including the register they missed. Nothing is lost. The clock resumes on their `ready`.
3. **They do not come back (90 s).** The neighbour is offered, in character: *"Sam's wire is dead. Work both boxes? The Notice will record that you worked two desks."* Accepting merges both boxes onto one screen with a `HARTLE | DUNMERE` switcher and both books. The report prints `WORKED SINGLE-HANDED` and pars are not adjusted — the honest record, not a fudge.
4. **Someone joins mid-shift.** If a seat is vacant they take it (clock resumes). If all seats are manned they attach as **Relief** to the box with fewest hands, receive the full snapshot plus the entire register so they can read what was already said, and both hands may act. Actions are attributed by name.
5. **The host leaves.** There is no host. Rooms are server-owned; any seated box may `ready`, `next_turn`, or `send_shift`. The code keeps working while any socket is attached.
6. **Exactly 2 players.** The **design target**, not a floor. The line is two boxes and one section, every predicate in §5.4 is cross-wired between exactly those two, and R2 guarantees neither book is optional. Nothing in the two-player game is a reduced version of anything.
7. **1 player.** Permitted, honestly labelled: `SOLO — you will be working both boxes` with both books visible. It is a pleasant little scheduling puzzle and it says so. It exists so a judge who opens the link alone at 2am sees a working game rather than a lobby, and the Notice is stamped `WORKED SINGLE-HANDED`.
8. **5–8 players.** Up to 4 boxes plus up to 2 hands per box. Hard cap 8. The 9th gets a fresh code and one line of copy.
9. **Someone idles but is connected.** The clock keeps running (they are slow, not gone), the ribbon escalates at 45 s (`DUNMERE IS WAITING ON YOU`), the neighbour may tap `NUDGE` (a bell, one per 30 s), and at 120 s `WORK BOTH BOXES` is offered. Idling is never a hard fail.
10. **`SIGNALMAN'S BREAK`.** Either box, twice per shift, pauses the clock for up to 60 s. It exists because one of these people is on a train.
11. **Two trains into one section / dispatch without Line Clear / disposal into a full road / using an out-of-use loop.** Physically refused by a compare-and-set on `section.occupiedBy` and a road-capacity check, answered with an in-character `toast`. The game cannot be broken into an illegal state, so every failure is soft, diagnosable and printed.
12. **A disposal fails on arrival** (31 wagons into an 18-wagon yard). The train stands at the platform and blocks; the section cannot be reused until it is disposed; `SHUNT` and `DETACH` are offered; the report attributes the minutes to the `ASK` intent **and** the `GIVE` acceptance, both named.
13. **Server restarts.** Rooms are in memory and are lost. Clients show *"The district office has gone dark. Your seed was SPAR-2 — start again on the same night?"* with a one-tap rejoin that recreates the identical shift from the seed.
14. **Clock skew / bad network.** No per-second ticks. The server sends an absolute `clock` string in each snapshot; the client interpolates locally between ticks and snaps on arrival. A dropped packet heals itself on the next snapshot.
15. **Abusive text.** Client- and server-side profanity filter on names, messages and anything pinned to the archive. `MUTE THIS SIGNALLER` is local and immediate. No DMs exist. Nothing is stored server-side except an opt-in archive row.

---

## 9. In-game communication design

**The wire is the game, so it is a first-class screen, not a bubble in the corner.** The design assumes strangers, separate networks, no voice, no Discord, one thumb, and a cracked phone keyboard.

**THE REGISTER.** One shared stream, sim-timestamped, carrying four kinds of line in one column — **bells, facts, messages, movements** — so the conversation and the trains are legibly the same object. It is the transcript that becomes evidence in the report, which is why people write sentences instead of `k`.

**QUICK PHRASES THAT AUTO-FILL LIVE VALUES FROM YOUR OWN SCREEN.** Six contextual slots above the input. Not static strings — the server interpolates from the sender's own slice, so one tap produces a precise, correctly formatted report:

| Chip | Sends |
|---|---|
| *my next train* | `4-B BALLAST, loop 1, 31 wagons, 26 minutes down, terminates your yard, booked to take water at Dunmere.` |
| *what's it booked to do?* | `What's your next train, how long is it, and where's it going at my end?` |
| *my roads* | `I have a platform, loop 1 (24 wagons), loop 2 (12), and a yard.` |
| *I have a notice for you* | opens the BOOK with unsent cards ringed |
| *say that again with numbers* | verbatim |
| *sorry — my mistake* | verbatim |

**SEND VERBATIM, gated by having looked.** Every book card has a one-tap `SEND VERBATIM` that posts the exact wording, attributed — but **only after that card has been opened**, so the chip rewards reading rather than replacing it. Sending is a discrete, timestamped, gradeable **move**, which is what makes HELD FACTS measurable at all.

**HOLD UP A TRAIN — a pointer that points without revealing.** Broadcasts number, class, direction and delay as a blank card outline. Referring to a train becomes one tap; the yard never leaks; both players get the same noun to say out loud.

**GREY PILLS.** Any reference to something on the other side of the split renders in your own log as a tappable foreign pill — `«DUNMERE YARD»`, `«HARTLE LOOP 2»`, `«NOTICE 14/A»`. Tapping composes the question for you (*"how much room have you got in your yard tonight?"*). It teaches cross-wiring wordlessly on first contact and makes a 40-line register scannable.

**THE JARGON KILLER.** Twenty-two terms carry a dotted underline; tapping any of them opens a 12-word inline gloss. First occurrence auto-opens once, then never again. `SECTION · BLOCK · LINE CLEAR · LOOP · YARD · ROAD · PLATFORM ROAD · SHED · DISPOSAL · WATER COLUMN · COAL STAGE · BOOKED OUT · RUNNING LATE · DETACH · SHUNT · LIGHT ENGINE · EXPRESS FREIGHT · PERISHABLE · RESTRICTION · DISTRICT NOTICE · PILOTMAN · SIGNALMAN'S BREAK`. The eight historical bell codes are **not** in the critical path (§12) — they are sound, and an optional `CODEBOOK` tab for the curious.

**MUTE THE WIRE.** One tap degrades a player to chips, book cards and hold-ups only. **This path is certified sufficient**: an automated test plays every shipped seed to par using only chips and `SEND VERBATIM`, no free text. A player who cannot or will not type can still win — just slower.

**THE RIBBON.** One line, always present, always naming the next legal thing, in character, in plain English. It replaces the tutorial entirely.

**Presence.** A typing dot. No read receipts, no avatars, no emoji reactions, no DMs.

---

## 10. Mobile portrait layout

Designed at **375 × 667 first**, desktop second, and **one layout for every role** — one thing to build, one thing to test, nothing that can look broken on a judge's device. Middle boxes add only a segmented section switcher.

```
 0   ┌──────────────────────────────────────┐ 44px  STATUS
     │ 23:07   SPAR   ● wire good   ⏸ BREAK │       sim clock · code · lamp · break
 44  ├──────────────────────────────────────┤ 36px  RIBBON (one sentence, 15/20)
     │ 9-F is at your column and booked to  │
     │ take water. Ask Hartle first.        │
 80  ├──────────────────────────────────────┤
     │  ▣ HARTLE — 7 MILES        [shutter] │ ~46%  THE BOARD
     │  ┃ mile 7                            │       far box as a closed shutter+bell
     │  ┃  6   OCCUPIED                     │       SECTION as a vertical corridor,
     │  ┃  5   231 ↓ Mail                   │       mile ticks, lamp text
     │  ┃  4   due 22:47                    │
     │  ┃  3   (restriction)                │
     │  ┃  2                                │
     │  ┃  1                                │
     │  ┃  0   ── YOUR BOX ──               │
     │  PLATFORM   9-F FISH  34w  +14  ▸    │       your roads, 64px train cards
     │  YARD 30/4  empty                    │
     │  WATER ✓  COAL ✓  LOOP — none        │
 440 ├──────────────────────────────────────┤ 48px  TABS
     │  BOARD  │  BOOK ③  │  WIRE ⁵         │
 488 ├──────────────────────────────────────┤ ~38%  SHEET (whichever tab)
     │  [chips: my next train | my roads …] │       chip row ALWAYS above the input
     │  23:07 HARTLE  NOTICE 14/A …         │
     │  ─────────────────────────────────── │
     │  [ say something ]            [SEND] │
 667 └──────────────────────────────────────┘
```

Rules that are not negotiable:
- **Every interaction is a tap.** Tap a train card → an action sheet of 2–4 large labelled **legal** actions only. **No drag, no long-press, no pinch, no gesture, no landscape.** A cold player cannot reach an illegal state by curiosity.
- 16px gutters, 44px minimum targets, no horizontal scroll anywhere, ever.
- **When the keyboard opens**, the status bar, the ribbon and the section lamp stay pinned, and the chip row docks directly above the input. You never have to dismiss the keyboard to see the number you are reporting.
- **No colour-only information.** Every lamp state, every class and every direction carries a word and a glyph as well as a colour (`▣ CLEAR`, `▤ OCCUPIED`, `↓ SOUTH`). Readable outdoors, readable colour-blind, readable at 200% text size.
- **Screen reader**: the whole board is semantic HTML — no canvas, no images, no ARIA fakery. The ribbon is an `aria-live="polite"` region; toasts are `aria-live="assertive"`; the register is a `<ol>`; every action is a real `<button>` with a full sentence label. A screen-reader user genuinely works a box against sighted partners, and we will have tested it with VoiceOver and NVDA before we ship. Nothing in the showcase has this.
- **Desktop** is the identical 420px column, centred, with the register expanded alongside. One layout, two widths.
- **The report/Notice** is the only screen with its own layout: a full-bleed paper card, 343px wide on a phone, that is also exactly what `SAVE THE NOTICE` exports.

---

## 11. Visual and audio direction

**Premise:** 1897, night, an oil-lit signal box. All CSS and inline SVG. No bitmaps, no sprites, no canvas, no icon font.

**Palette (final tokens):**
```
--lamp-black   #0C0D0F   page
--box-dark     #16181C   panels
--box-edge     #23262C   1px rules
--brass        #C89B3C   primary, lamp rims, code
--brass-dim    #8A6A28   disabled brass
--signal-red   #C2352B   refusals, irreversible, delay chips
--oil-amber    #E8A33D   section occupied, district wire
--lamp-green   #4E9A5F   line clear given
--chalk        #F2EDE3   body text
--chalk-dim    #9A968D   secondary
--paper        #EDE3CE   register sheet, the Notice
--ink          #1C1A17   on paper
```
One theme. It is night; there is no light mode and no toggle (a cut, §12).

**Type:** two webfonts, 46 KB total, `font-display: swap`, system fallbacks.
- `IBM Plex Mono` — all times, train numbers, wagon counts, mile ticks, room code. **Tabular figures always**, so numbers never jitter as they tick.
- `Zilla Slab` — the Notice of Delay and the register headers only.
- UI body: system sans stack.
Scale: ribbon 15/20 · train number 20 mono · times 13 mono · road labels 12 caps letterspaced 0.08em · sheet body 15/22 · Notice headline 28 slab caps letterspaced 0.06em · room code 64 mono brass.

**Motion:** nothing exceeds 220 ms, nothing bounces, nothing springs.
- Lamp state change: 120 ms cross-fade plus a 1px brass glint sweep.
- Bell received: the corridor takes an amber wash, 180 ms ease-out, then settles.
- New train card / new fact card: 160 ms slide-up 8px with opacity.
- Register line: 100 ms fade-in.
- District wire arriving: the BOOK tab badge pulses twice, 2 × 200 ms, then stops.
- The Notice of Delay assembles once: the paper slides up 220 ms, then the two-track diagram draws its bars left-to-right over 600 ms — the only animation in the game longer than a quarter second, and it is the one people screenshot.
- `prefers-reduced-motion: reduce` → every transition becomes an instant opacity swap, the diagram draws complete. No exceptions.
- **No confetti, no parallax, no train sprite crawling down the corridor.** Position is text (§12).

**Sound:** five assets, mono 32 kHz mp3, **under 60 KB total**, default on, one-tap mute persisted, and silent until the player's first gesture (autoplay policy).
1. `bell-1` — a single brass strike, 320 ms, for an ask and a nudge.
2. `bell-2` — a double strike, for a train entering the section.
3. `bell-2-1` — two-pause-one, for a section cleared. (The historical rhythms survive as *sound*; nobody has to learn them.)
4. `sounder` — telegraph chatter, 500 ms, only for a district wire. This is the sound that makes a phone in a pocket worth checking.
5. `thunk` — a soft wooden refusal, 140 ms, for a server-refused action.
No music. No voice. Haptics: a 10 ms tap on bell receipt where `navigator.vibrate` exists.

**The Notice of Delay** is deliberately a different visual object from the rest of the game: cream paper, ink, a letterpress rule, a red rubber-stamp grade, the seed and room code set small in the corner. It has to look like it came out of a drawer, because it is going to be the cover image.

---

## 12. What we deliberately CUT, and why

Every cut buys Execution. Each one is a thing that could break on a judge's phone.

**Cut from the gameplay**
1. **Memorising bell codes.** There is one `ASK` button whose label is generated plain English. The eight codes survive as sound and as an optional `CODEBOOK` tab. *Why: all three judges named the jargon wall as the fatal flaw; the codebook was the largest single item on it and it was never load-bearing.*
2. **Six of the eight historical bell codes as distinct player actions** (Obstruction Danger, Stop and Examine, Wrong-Line Order, etc.). Nine trains do not need them. *Why: verbs must vary by consequence, not by enumeration.*
3. **More than 4 boxes, and spectators.** *Why: a spectator breaks the split, and a 5th box adds screen, not game.*
4. **A second mechanic for the 3rd/4th box.** Same verbs, harder ring. *Why: one code path.*
5. **Faster clocks as a difficulty lever.** *Why: raises typing speed, not the puzzle.*
6. **Free-form order composition.** Orders are structured `(train, action, disposal)`; reasoning stays in free text. *Why: unambiguous on the wire, cheap, and impossible to typo into an illegal state.*

**Cut from the client**
7. **All bitmap art, all canvas, all sprites.** CSS and inline SVG only. *Why: instant first paint on cellular; nothing to fail to load; nothing to pinch.*
8. **A train graphic moving down the corridor.** The section says `OCCUPIED — 231 ↓ Mail, due 22:47`. *Why: position as text is the one representation that is correct on every device, in every locale, and in a screen reader — and continuous motion is the only thing in this design that would have required real-time sync.*
9. **Drag and drop, long-press, pinch, swipe gestures, landscape, and a light theme.** *Why: each is a distinct failure mode on a borrowed phone; FOGBOUND's drag-and-snap marker on a 26px grid was correctly identified as the most likely thing in the whole field to feel broken.*
10. **Any framework heavier than Preact**, any CSS framework, any animation library. *Why: 60 KB budget.*

**Cut from the product**
11. **Accounts, logins, profiles, persistent stats, leaderboards, friend lists.** A name is a string you type or don't. *Why: the contest forbids logins and every one of these is a database.*
12. **Voice chat, screen share, image upload, emoji reactions, message editing, read receipts, DMs.** *Why: the wire is the game; a private channel would delete it, and the rest is moderation surface we cannot staff.*
13. **Server-side persistence** beyond in-memory rooms plus one append-only JSONL row per *opt-in* archived shift. *Why: no database, no migrations, no GDPR surface, and a restart costs a seed, not a season.*
14. **Localisation.** English only, with every jargon term glossed. *Why: the copy IS the game; a machine translation would break the puzzle.*
15. **Hand-authored shifts.** Everything is generated and certified (§5.8). *Why: ten hand-made levels run out in twenty minutes, and a rejection test is cheaper to build than a level editor.*
16. **An animated debrief.** The two-track diagram is one static SVG that draws once. *Why: it has to survive being a PNG.*

---

## 13. Every fatal flaw, and its fix

| Flaw (judge) | Fix, by section |
|---|---|
| **The first sixty seconds are a jargon wall** (all three) | §2 unlosable two-player tutorial, clock not started, coach arrows pinned to controls and deleted forever after one use; §9 dotted-underline gloss on 22 terms; §12 cut 1 removes the bell codebook from the critical path; §3 duty cards gloss every term they use; the ribbon (§9) permanently names the next action in plain English. Disproportionate build and playtest budget assigned here. |
| **"Paste my whole ORDERS tab" spends the asymmetry in 20 seconds** (judge 2, fatal) | The design's centrepiece. **(a)** Conditional relevance: every notice's trigger is a hidden attribute of a train on the *other* box's screen (§5.4), so after a dump somebody still has to match, and matching needs a card that was never sent. **(b)** Time-release: 40% of facts do not exist at shift start (§5.5). **(c)** The **BAIT PAIR** (T9): a notice whose obvious application is your own train, so you file it as spent — the shipped trap in §4.4/4.7. **(d)** 2–8 inert-but-plausible decoys per book, so a dump costs your partner attention. **(e)** **R1, THE DUMP TEST** (§5.8): any shift where a full dump reaches par is mechanically rerolled. |
| **No laugh, no artifact, no screenshot; cover image is a shuttered signal box** (judge 1, fatal) | §4.9 the **NOTICE OF DELAY**: letterpress card, generated headline, two-track diagram, the receipt quoting your own sentence with both timestamps, **THE SHIFT YOU DIDN'T HAVE** counterfactual, client-side PNG export. Plus the public **WORST BOXES IN THE DISTRICT** gallery and a per-handover human vignette. The contest cover image is a real Notice from seed `SPAR-2`. |
| **The verbs never change; variety lives only in the notices tables** (judge 3) | §7.2 sixteen actions across four families, including `DETACH`, `SHUNT`, `WATER`, `COAL`, `PILOTMAN`; §5.4 nine trap archetypes across six cross-wired predicate families; §5.9 tables built wide (22 + 14 + 11 + 8 + 40 rows), >10⁷ turn-3 shifts. |
| **Reward for mastery is a punctual timetable; Usefulness 3** (judge 1) | The chaseable number is not the grade: **HELD FACTS** (§4.9) plus the counterfactual plus par. Mastery is measured in *what you said and when*, which is the thing the game is actually about. |
| **Disposal cascades punish the box that was never told** (judge 2) | §7.2 **two keys extended to disposal**: `ASK` carries an intent, `GIVE` accepts a named disposal, and a failed disposal is attributed to both boxes by name. No misfile is one person's fault. |
| **The 3–4 box ring is asserted, not certified; seats may be decorative** (judge 2) | §5.8 **R2**, a mechanical per-box deletion test, plus the requirement that no box can complete its own disposals without a fact originating with every other box. |
| **Dead air during a 7-minute transit** (author, judge 3) | §5.8 **R4**: reject any shift with a window over 20 real seconds in which any box has zero legal decisions pending. |
| **Terseness — a partner who answers "k"** (judge 2) | §9 chips that auto-fill live values from your own screen; `SEND VERBATIM` gated on having opened the card; grey pills that compose the question; and the report quoting the register, so your sentences become evidence in your own grade. |
| **"Niche trainspotter sim" read by a judge who never plays** (judge 3) | The landing copy never says "signalling" (§1). The fiction is kept because it is what makes text chat the period-accurate instrument rather than a concession — but every term is glossed, the codebook is optional, and the hook is stated as two strangers holding each other's rulebook. |
| **Grade is a verdict, not a hook** (judge 2) | Three continuous printed metrics: delay vs par, HELD FACTS, and the two-track divergence with the exact minute pinned. |

---

## 14. Graft ledger — every judge idea, ruled on

**Native to this design, kept and hardened:** the persistent ribbon · attributing the win as well as the loss (`BEST DECISION OF THE SHIFT`) · generator rejection tests rather than generator promises · complete per-seat snapshots, never deltas, with `seq` monotonicity · `WORK BOTH BOXES` + clock-pause-on-drop + Relief Signaller · the canned-phrase bar with a certified `MUTE THE WIRE` degrade path · server refuses illegal states in character · no colour-only information.

**Imported and adopted as specified:**

| Graft | From | Landed in |
|---|---|---|
| Facts **arrive during** the shift, to one box only | FOGBOUND | §5.5, §4.6 |
| Quick phrases that **auto-fill live values from your own screen** | FOGBOUND | §9 |
| One continuous chaseable metric for the invisible thing (POSITION ERROR → **HELD FACTS**) | FOGBOUND | §4.9 |
| Show the **believed line over the true line**, divergence pinned | FOGBOUND | §4.9 two-track diagram |
| Role card written as a **job**, plus a guaranteed-safe first move | FOGBOUND | §2 |
| Named difficulty **ranks** | FOGBOUND | §6 |
| Print the convention on screen → **tap any jargon for a gloss** | FOGBOUND | §9 |
| Assert the named risk as a **rejection test** (no dead air) | FOGBOUND | §5.8 R4 |
| Claim *and test* full screen-reader play | FOGBOUND | §10 |
| **Say-this chips unlocked only for what you have actually opened** | Window 4 | §9 `SEND VERBATIM` gating |
| **Two keys on the irreversible action**, extended to **disposal** | Window 4 | §7.2 |
| **Reward the correct refusal** explicitly | Window 4 | §4.3, §4.9 |
| **Coach text pinned to the exact element**, deleted forever after one use | Window 4 | §2 (six arrows, localStorage) |
| Clock does not start until every seat taps READY | Window 4 | §2 |
| Pause with **"waiting for Sam"**, never "wire down" | Window 4 | §8.1 |
| **Shared addresses, private contents** — a pointer that points without revealing | Window 4 | §9 `HOLD UP` |
| Humanised confirm copy stating the human cost | Window 4 | §7.2 sheets, §8.12 |
| **Per-event emotional payoff**, not only an end grade | Window 4 | §4.5 vignettes |
| **THE RECEIPT**, in its harder form, with both timestamps | EYEWITLESS | §4.9 |
| A **printed shareable artifact** + a gallery of disasters | EYEWITLESS | §4.9 Notice + archive |
| A warm-up move that **cannot be got wrong**, performed on each other | EYEWITLESS | §2 |
| **Tap a clue to send it verbatim**, attributed | MOTHLIGHT | §9 |
| **Certifying generator** with stated invariants, rerolled per round | MOTHLIGHT | §5.8 |
| **No decorative seat** as a deletion test | MOTHLIGHT | §5.8 R2 |
| **Seeded, reproducible round** + *send this exact shift* | MOTHLIGHT | §4.9, §6 |
| **Foreign-token grey pills** | MOTHLIGHT | §9 |
| Scale difficulty by **counted inference**, not by tightening the clock | MOTHLIGHT | §6 |
| A second act instead of a wall of red | MOTHLIGHT (one-bit + grace) | §4.7 late reprieve / `PILOTMAN` special working — adopted in spirit, not as a one-bit reveal, because a single bit is the least actionable ending in the set |

**Rejected, with reasons:**
- **One-bit failure ("the ledgers disagree")** — replaced by the fully attributed report. All three judges wanted more diagnosis at the end, not less.
- **Hiding which box erred** — the report names both boxes on every shared decision; anonymised blame removes the reason to press READY again.
- **A per-player eraser / veto economy** — subsumed by two-keyed disposal, which achieves the same "spoken decision" without a second resource to explain.
- **Clock-tightening as escalation** — see §6.
- **Confusability-tuned illustration** (the EYEWITLESS content engine) — it is the one dependency that cannot be generated or half-done on a deadline, and it is why that design scored Execution 3 twice.

---

## 15. Where the judges disagreed — decisions, one line each

1. **Winner.** Two of three ranked Block & Bell first and all three scored it Execution 5 — we build the design that ships, then graft the artifact and the laugh it was missing rather than gamble on illustration work.
2. **Is the jargon wall fixable?** Judge 1 said no ("the fiction that justifies the chat is the same fiction that gates it"); judges 2 and 3 said yes — we side with 2 and 3, because the *fiction* and the *codebook* are separable, and cutting the codebook (§12.1) leaves the fiction intact.
3. **Is front-loading fatal?** Only judge 2 flagged it — we treat it as the most serious finding in all three reviews and spend half the design budget on it, because it is the one flaw that deletes the genre rather than the polish.
4. **Usefulness 3 or 4?** Judge 1 said 3 ("the reward is a punctual timetable") — we accept that read and answer it with the Notice, the receipt, the counterfactual and the archive, which is the entire delta between 3 and 5.
5. **Keep the Victorian skin?** All three called it narrow; we keep it because it is the only fiction in the field where text chat is the *period-accurate instrument* rather than a remote-play concession, and we pay for it with 22 inline glosses.
6. **Which design has the worst boredom risk?** Judges split three ways (Window 4 / MOTHLIGHT / EYEWITLESS) but agreed on *our* risk — table depth — so §5.9 specifies row counts as build requirements, not as aspirations.
7. **Session length.** The field ranged 10–12 minutes; we ship a **3-minute turn 1** that ends in the artifact, because a Round-1 judge and a cold stranger both decide in the first six minutes and a 22-minute duty is an option, never a price of entry.
8. **Two players: floor or target?** Judges treated the 2-player case as every design's weak point; here it is the **design target** (§8.6), certified by R2, and the 3rd and 4th seats are the variants.
9. **Relief Signaller or spectator for overflow?** Relief only — a spectator sees a box's screen, and any screen shared with someone who has no duty is a hole in the split.
10. **Grade or continuous score?** Both: a grade for the story, HELD FACTS for the rematch.

---

## 16. Build order (so this ships by 30 Oct)

1. Server room + seats + snapshot loop + `toast` + reconnect tokens. Two browser tabs passing a light engine.
2. Generator steps 1–3 and the block cycle end to end, hand-fed facts.
3. Traps T1–T8, the split rule, time-release, and the book UI with `SEND VERBATIM`.
4. **The rejection tests R1–R5**, run offline over 10,000 seeds; ship 64 pre-certified fallbacks.
5. The ribbon, `legalActions`, and the unlosable tutorial. **Playtest with five people who have never seen it, and watch the first sixty seconds only.**
6. The report, the Notice, the PNG export. This is the cover image; do not leave it to the last week.
7. T9 the bait pair, the counterfactual solver, HELD FACTS.
8. Glosses, chips, pills, `MUTE THE WIRE` par-certification, VoiceOver and NVDA passes.
9. 3–4 box rings, Relief, `WORK BOTH BOXES`, the archive gallery with its consent sheet.
10. Freeze the feature set two weeks out. Everything after that date is copy, sound and the notices tables — which is exactly where the remaining upside is.