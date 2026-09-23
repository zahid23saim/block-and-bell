/**
 * BLOCK & BELL — the shift generator.
 *
 * Deterministic and seeded: seed = fnv1a32(roomCode + ":" + turnNo).
 * Solved BEFORE it is printed — we never generate a shift we have not
 * already completed ourselves, so the timetable a player reads is
 * provably achievable rather than merely plausible.
 *
 * Steps implemented here: 1 THE LINE, 2 SOLUTION FIRST, 3 BOOK BACKWARDS.
 */

import { TABLES } from "./content.js";

// ---------------------------------------------------------------- PRNG

export function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const r = mulberry32(seed);
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  r.chance = (p) => r() < p;
  return r;
}

// ---------------------------------------------------------------- tuning

/**
 * Windows are calibrated against measured line throughput (test/capacity.mjs),
 * not guessed: each turn's must-finish-by sits near the 85th percentile of what
 * a greedy dispatch actually achieves, so a shift is tight but rarely rerolled.
 */
export const TURN = [
  { trains: 5, slack: 0.45, window: 62, traps: 2 },
  { trains: 7, slack: 0.25, window: 60, traps: 4 },
  { trains: 9, slack: 0.12, window: 75, traps: 6 },
];

const SERVICE_MIN = 3; // minutes to take water or coal
const DISPOSE_MIN = 2; // minutes to put a train away
const SHUNT_MIN = 8;   // minutes lost breaking up a train that cannot go where it is booked
const HOLD_PATIENCE = 14; // how long a box will hold an awkward train before sending it anyway

// ---------------------------------------------------------------- step 1: THE LINE

export function buildLine(rng, boxCount) {
  const names = rng.shuffle(TABLES.places.boxNames).slice(0, boxCount);
  const lineName = rng.pick(TABLES.places.lineNames);

  const boxes = names.map((name, i) => {
    const loopCount = rng.pick([0, 1, 1, 2]);
    return {
      idx: i,
      id: ["DUN", "HAR", "WES", "KEL"][i],
      name: name.toUpperCase(),
      platform: 1,
      loops: Array.from({ length: loopCount }, (_, k) => ({
        id: "L" + (k + 1),
        maxWagons: rng.pick([12, 16, 20, 24]),
        outOfUse: false,
      })),
      yard: {
        printedCapacity: rng.pick([18, 24, 30]),
        actualCapacity: null, // set by trap T2; null means "as printed"
        roads: rng.int(2, 4),
        used: 0,
      },
      facilities: {
        WATER: rng.chance(0.6),
        COAL: rng.chance(0.5),
        SHED: rng.chance(0.45),
      },
    };
  });

  // Invariant L1 — exactly one box has no loop at all.
  const noLoop = boxes.filter((b) => b.loops.length === 0);
  if (noLoop.length === 0) {
    rng.pick(boxes).loops = [];
  } else if (noLoop.length > 1) {
    for (const b of noLoop.slice(1)) {
      b.loops = [{ id: "L1", maxWagons: rng.pick([16, 20, 24]), outOfUse: false }];
    }
  }

  // Invariant L2 — at least one box has water and at least one does not.
  if (boxes.every((b) => b.facilities.WATER)) rng.pick(boxes).facilities.WATER = false;
  if (boxes.every((b) => !b.facilities.WATER)) rng.pick(boxes).facilities.WATER = true;
  // A shed must exist somewhere or nothing can ever be put away for the night.
  if (boxes.every((b) => !b.facilities.SHED)) rng.pick(boxes).facilities.SHED = true;

  const sections = [];
  for (let i = 0; i < boxCount - 1; i++) {
    sections.push({
      id: "S" + (i + 1),
      a: i,
      b: i + 1,
      miles: rng.pick([5, 7, 9]),
      slowUntil: 0, // trap T4
      slowsBy: 0,
    });
  }

  return { lineName, boxes, sections };
}

// ---------------------------------------------------------------- step 2: draw trains

function classById(id) {
  return TABLES.identities.classes.find((c) => c.id === id);
}

/**
 * A train's working name and its class are the same fact stated twice, so
 * they must agree: the FISH is express freight, the SHUNTER runs light, and
 * nothing called THE BOAT is a rake of coal empties. Drawing them
 * independently produced "9-F BALLAST — Light engine", which reads as a bug
 * to anyone who glances at the board.
 */
const CLASS_OF_HEADCODE = {
  "4-B": "EXPRESS_FREIGHT",   // FISH
  "M2": "MAIL",               // NIGHT MAIL
  "231": "STOPPING_PASSENGER",// THE 8.05 DOWN
  "9-F": "BALLAST",           // BALLAST
  "K7": "MILK",               // MILK
  "606": "COAL_EMPTIES",      // EMPTIES
  "L1": "LIGHT_ENGINE",       // LIGHT ENGINE
  "88": "BALLAST",            // THE QUARRY
  "A3": "EXPRESS_FREIGHT",    // CATTLE
  "64": "STOPPING_PASSENGER", // THE PARLIAMENTARY
  "3-D": "MAIL",              // PAPERS
  "S4": "LIGHT_ENGINE",       // SHUNTER
  "17": "STOPPING_PASSENGER", // THE MARKET
  "G8": "BALLAST",            // GUNPOWDER
  "460": "STOPPING_PASSENGER",// THE RELIEF
  "W4": "COAL_EMPTIES",       // TIMBER
  "T5": "EXPRESS_PASSENGER",  // THE BOAT
  "512": "COAL_EMPTIES",      // THE SLOW GOODS
  "6-J": "EXPRESS_FREIGHT",   // PIGEONS
  "305": "STOPPING_PASSENGER",// THE 9.40 UP
  "H2": "EXPRESS_PASSENGER",  // EXCURSION
  "X9": "LIGHT_ENGINE",       // BREAKDOWN VAN
  "2-C": "COAL_EMPTIES",      // COAL
  "780": "EXPRESS_FREIGHT",   // MEAT
};

export function drawTrains(rng, n, line) {
  const pool = rng.shuffle(TABLES.identities.trains);
  const idents = pool.slice(0, n);

  // THE BAIT PAIR needs two workings of the SAME CLASS running from opposite
  // ends - "the ballast train" has to be ambiguous, or there is nothing to
  // mistake. Guarantee the pair exists at the draw rather than hoping the
  // shuffle provides one.
  const classOf = (i) => CLASS_OF_HEADCODE[i.headcode];
  const hasPair = idents.some((a, i) => idents.some((b, j) => j > i && classOf(a) === classOf(b)));
  if (!hasPair && n >= 2) {
    const wanted = pool.find((cand) =>
      !idents.includes(cand) && idents.some((i) => classOf(i) === classOf(cand)));
    if (wanted) idents[n - 1] = wanted;
  }
  const classes = TABLES.identities.classes;
  const last = line.boxes.length - 1;

  // BALANCE THE ENDS. Independent coin flips let every train start from the
  // same box, which leaves the other signaller holding no working orders at
  // all — a decorative seat, with nothing to tell anyone. Splitting the
  // directions evenly also means trains meet head-on, which is the only
  // reason a single line needs two people in the first place.
  const dirs = rng.shuffle(
    Array.from({ length: n }, (_, i) => i < Math.ceil(n / 2))
  );

  // and the pair must start at opposite ends, or one box holds both of them
  outer: for (let i = 0; i < idents.length; i++) {
    for (let j = i + 1; j < idents.length; j++) {
      if (classOf(idents[i]) !== classOf(idents[j])) continue;
      if (dirs[i] !== dirs[j]) break outer;
      const swap = dirs.findIndex((d, k) => k !== i && k !== j && d !== dirs[j]);
      if (swap >= 0) { const tmp = dirs[j]; dirs[j] = dirs[swap]; dirs[swap] = tmp; }
      break outer;
    }
  }

  // SOLUTION FIRST, applied at the draw: we never book a train somewhere it
  // cannot physically be put. A shed disposal at a box with no shed is not a
  // hard puzzle, it is an impossible one, and it wedges the whole shift.
  const budget = line.boxes.map((b) => ({
    platformFree: true,
    loops: b.loops.map((l) => ({ id: l.id, maxWagons: l.maxWagons, free: true })),
    yardLeft: b.yard.printedCapacity,
    shed: b.facilities.SHED,
  }));

  return idents.map((ident, i) => {
    const cls = classById(CLASS_OF_HEADCODE[ident.headcode]) ?? rng.pick(classes);
    const wagons = cls.id === "LIGHT_ENGINE" ? 0 : rng.pick(cls.typicalWagons);

    // northbound from the south end, or southbound from the north end
    const northbound = dirs[i];
    const origin = northbound ? 0 : last;

    // a train either terminates at a box up the line, or runs THROUGH
    let dest;
    if (rng.chance(0.3)) dest = "THROUGH";
    else {
      const options = northbound
        ? line.boxes.slice(origin + 1).map((b) => b.idx)
        : line.boxes.slice(0, origin).map((b) => b.idx);
      dest = options.length ? rng.pick(options) : "THROUGH";
    }

    const finalIdx = dest === "THROUGH" ? (northbound ? last : 0) : dest;
    const lo = Math.min(origin, finalIdx);
    const hi = Math.max(origin, finalIdx);
    const path = line.boxes.slice(lo, hi + 1);

    // only ask for water or coal if somewhere on this train's own path has it
    const servable = ["WATER", "COAL"].filter((f) => path.some((b) => b.facilities[f]));
    const facilityNeed =
      servable.length && rng.chance(cls.id === "LIGHT_ENGINE" ? 0.5 : 0.4)
        ? rng.pick(servable)
        : "none";

    // choose a disposal the destination can actually accept, and reserve it
    let disposal = "through";
    if (dest !== "THROUGH") {
      const bud = budget[finalIdx];
      const opts = [];
      if (bud.platformFree) opts.push("platform");
      if (bud.shed && (cls.id === "LIGHT_ENGINE" || rng.chance(0.2))) opts.push("shed");
      if (bud.loops.some((l) => l.free && l.maxWagons >= wagons)) opts.push("loop");
      if (wagons > 0 && bud.yardLeft >= wagons) opts.push("yard");

      if (opts.length === 0) {
        disposal = "through";
        dest = "THROUGH";
      } else {
        // bias by class, but only among the options that are genuinely open
        const want =
          cls.id === "LIGHT_ENGINE" ? ["shed", "loop", "platform"]
            : cls.priorityHint >= 4 ? ["platform", "loop", "yard"]
            : ["yard", "loop", "platform"];
        disposal = want.find((w) => opts.includes(w)) ?? rng.pick(opts);

        if (disposal === "platform") bud.platformFree = false;
        else if (disposal === "yard") bud.yardLeft -= wagons;
        else if (disposal === "loop") {
          const l = bud.loops.find((x) => x.free && x.maxWagons >= wagons);
          if (l) l.free = false;
        }
      }
    }

    return {
      id: String(i + 1),
      headcode: ident.headcode,
      name: ident.name,
      flavour: ident.flavour,
      classId: cls.id,
      className: cls.label,
      glyph: cls.glyph,
      perishable: cls.perishable,
      priority: cls.priorityHint,
      wagons,
      northbound,
      origin,
      dest,
      facilityNeed,
      disposal,
      readyAt: 0, // filled below
    };
  });
}

// ---------------------------------------------------------------- the simulator

/**
 * Forward-simulate a dispatch policy under the two physical laws of the line:
 * one train per section, and a road cannot hold more than it holds.
 * Returns the minute every train was finally disposed of, or null if wedged.
 */
export function simulate(line, trains, opts = {}) {
  const limit = opts.limit ?? 400;
  const rng = opts.rng ?? makeRng(1);
  const policy = opts.policy ?? "greedy";

  const boxes = line.boxes.map((b) => ({
    idx: b.idx,
    platformFree: true,
    loops: b.loops.map((l) => ({ ...l, occupiedBy: null })),
    yardUsed: 0,
    // the ACTUAL capacity, which a trap may have made smaller than the printed one
    yardCap: b.yard.actualCapacity ?? b.yard.printedCapacity,
    facilities: { ...b.facilities },
    facilityDownUntil: b.facilityDownUntil ?? {},
  }));
  // A box DECIDES using what it believes — the printed book, plus whichever
  // notices it has actually been told. Physics runs on what is true. The gap
  // between those two is the entire game.
  const believedSrc = opts.believedLine ?? line;
  const believed = believedSrc.boxes.map((b) => ({
    idx: b.idx,
    loops: b.loops.map((l) => ({ ...l })),
    yardCap: b.yard.actualCapacity ?? b.yard.printedCapacity,
    facilities: { ...b.facilities },
  }));

  const sections = line.sections.map((s) => ({ ...s, occupiedBy: null, freeAt: 0 }));

  const st = trains.map((t) => ({
    id: t.id,
    at: t.origin,
    state: "WAITING", // WAITING | RUNNING | SERVICING | DONE | WEDGED
    serviced: t.facilityNeed === "none",
    arriveAt: 0,
    readyAt: t.readyAt,
    doneAt: null,
    ref: t,
  }));

  const sectionBetween = (i, j) =>
    sections.find((s) => (s.a === i && s.b === j) || (s.a === j && s.b === i));

  const nextBox = (t) => (t.ref.northbound ? t.at + 1 : t.at - 1);

  const finalBox = (t) =>
    t.ref.dest === "THROUGH" ? (t.ref.northbound ? boxes.length - 1 : 0) : t.ref.dest;

  // A train's priority as the deciding box BELIEVES it. A priority notice
  // sitting unread in the neighbour's book cannot reorder anything.
  const believedTrainById = new Map(
    (opts.believedTrains ?? trains).map((t) => [t.id, t])
  );
  const believedPriority = (t) =>
    (believedTrainById.get(t.id) ?? t.ref).priority ?? t.ref.priority;
  const believedWagons = (t) =>
    (believedTrainById.get(t.id) ?? t.ref).wagons ?? t.ref.wagons;

  /**
   * Which roads could take this train at this box?
   *
   * @param believedView decide as the box BELIEVES the world to be (used when
   *                     giving Line Clear), rather than as it is (used when
   *                     the train is actually standing there)
   */
  /**
   * Can this box take the train WHERE IT IS BOOKED TO GO?
   *
   * A train booked into the yard cannot simply be dropped on the platform
   * instead — the platform is where it STANDS while it waits, not somewhere
   * it can be left. So a wrong road is not a substitution, it is a block:
   * the train sits at the home signal and the section stays shut behind it.
   * That is what makes a neighbour's card worth the breath it takes to read.
   */
  function canDispose(t, boxIdx, believedView) {
    const live = boxes[boxIdx];
    const view = believedView ? believed[boxIdx] : live;
    // Posting a card tells your neighbour a RULE. It does not tell them what
    // is standing on your loop right now. Under `blindOccupancy` the sender
    // knows the capacities and assumes the roads are clear.
    const blind = believedView && opts.blindOccupancy && boxIdx !== t.at;
    const w = believedView ? believedWagons(t) : t.ref.wagons;
    // a conditional stop turns a THROUGH working into one that must call
    const cs = t.ref.conditionalStop;
    const d = cs && boxes[cs.boxIdx] && boxes[cs.boxIdx].yardUsed >= cs.threshold
      ? "platform" : t.ref.disposal;

    if (d === "through") return true;
    if (d === "platform") return blind ? true : live.platformFree;
    if (d === "shed") return view.facilities.SHED;
    if (d === "yard") return (blind ? 0 : live.yardUsed) + w <= view.yardCap;
    if (d === "loop")
      return view.loops.some(
        (l, i) => !l.outOfUse && (blind || !live.loops[i].occupiedBy) && l.maxWagons >= w
      );
    return false;
  }

  /** It goes where it is booked, or it stands there until it can be shunted. */
  function chooseDisposal(t, boxIdx) {
    if (!canDispose(t, boxIdx, false)) return null;
    const cs = t.ref.conditionalStop;
    return cs && boxes[cs.boxIdx] && boxes[cs.boxIdx].yardUsed >= cs.threshold
      ? "platform" : t.ref.disposal;
  }

  /**
   * SHUNT / DETACH — the expensive way out of a misfile.
   * A train that cannot go where it is booked is not lost; it is broken up and
   * put somewhere else, which costs minutes and holds the section throughout.
   * So a bad Line Clear is dear, not fatal — a confused pair still reaches a
   * report rather than a dead end.
   */
  function anyOpenRoad(t, boxIdx) {
    const b = boxes[boxIdx];
    const w = t.ref.wagons;
    if (b.platformFree) return "platform";
    const l = b.loops.find((x) => !x.outOfUse && !x.occupiedBy && x.maxWagons >= w);
    if (l) return "loop";
    if (b.yardUsed + w <= b.yardCap) return "yard";
    if (b.facilities.SHED) return "shed";
    return null;
  }

  function doDispose(t, boxIdx, road) {
    const b = boxes[boxIdx];
    if (road === "platform") b.platformFree = false;
    else if (road === "yard") b.yardUsed += t.ref.wagons;
    else if (road === "loop") {
      const l = b.loops.find(
        (x) => !x.outOfUse && !x.occupiedBy && x.maxWagons >= t.ref.wagons
      );
      if (l) l.occupiedBy = t.id;
    }
  }

  const orderIndex = new Map((opts.order ?? []).map((id, i) => [id, i]));
  // Trains this plan is willing to hold back rather than send into a block.
  const holdSet = new Set(opts.hold ?? []);

  const freeSectionOf = (t) => {
    const sec = sections.find((s) => s.occupiedBy === t.id);
    if (sec) sec.occupiedBy = null;
  };

  for (let clock = 0; clock <= limit; clock++) {
    // 1. land running trains. The section behind them stays OCCUPIED until
    //    they are actually dealt with — that is what makes a block expensive.
    for (const t of st) {
      if (t.state === "RUNNING" && t.arriveAt <= clock) {
        t.at = t.pendingTo;
        t.state = "ARRIVED";
      }
    }

    for (const t of st) {
      if (t.state !== "ARRIVED" && t.state !== "WAITING") continue;
      const b = boxes[t.at];

      // 2. take water or coal if this box can actually provide it now
      if (!t.serviced && t.ref.facilityNeed !== "none") {
        const need = t.ref.facilityNeed;
        const downUntil = b.facilityDownUntil[need] ?? 0;
        if (b.facilities[need] && clock >= downUntil) {
          t.serviced = true;
          t.readyAt = clock + SERVICE_MIN;
        }
      }

      if (t.state !== "ARRIVED") continue;

      // 3a. a train passing through frees its section and carries on
      if (t.at !== finalBox(t)) {
        freeSectionOf(t);
        t.state = "WAITING";
        continue;
      }

      // 3b. at its destination it must be PUT somewhere. Disposal is a
      //     decision, not a property: the booked road is only a preference.
      if (!t.serviced && t.ref.facilityNeed !== "none") continue; // still waiting on water

      let road = chooseDisposal(t, t.at);
      if (!road) {
        // It stands at the home signal, and the section stays shut behind it.
        if (t.blockedSince == null) t.blockedSince = clock;
        const waited = clock - t.blockedSince;
        if (waited >= SHUNT_MIN) road = anyOpenRoad(t, t.at);
        // DETACH: if there is genuinely nowhere left, it is split up and
        // stowed in pieces across whatever roads exist. Always possible,
        // never cheap — the minutes already lost standing here are the price.
        if (!road && waited >= SHUNT_MIN * 2) road = "detached";
      }
      if (road) {
        doDispose(t, t.at, road);
        t.state = "DONE";
        t.doneAt = clock + DISPOSE_MIN;
        freeSectionOf(t);
      }
    }

    // 4. dispatch: one train per section, by priority as BELIEVED
    const movable = st
      .filter((t) => t.state === "WAITING" && t.readyAt <= clock && t.at !== finalBox(t))
      .sort((x, y) => {
        // An explicit dispatch order, as chosen by the planner. This is the
        // decision a pair of signallers actually makes: not "what is the rule"
        // but "who goes next".
        if (policy === "order") {
          return (orderIndex.get(x.id) ?? 1e6) - (orderIndex.get(y.id) ?? 1e6);
        }
        if (policy === "random") return rng() - 0.5;
        // Order by priority AS BELIEVED, breaking ties at random so repeated
        // runs explore different orderings without discarding what is known.
        const d = believedPriority(y) - believedPriority(x);
        return d !== 0 ? d : rng() - 0.5;
      });

    // TWO KEYS. The sender names where the train is going; the receiving box
    // gives Line Clear only if IT BELIEVES it can take it. So a box that has
    // been told its neighbour's news puts the acceptable train through FIRST
    // and holds the awkward one back for a quiet moment. A box that has not
    // been told cannot tell them apart, and sends whichever comes to hand —
    // which is how a train ends up standing at a home signal it cannot pass,
    // with the section shut behind it.
    const acceptable = [];
    const awkward = [];
    for (const t of movable) {
      const to = nextBox(t);
      if (to < 0 || to >= boxes.length) continue;
      (to === finalBox(t) && !canDispose(t, to, true) ? awkward : acceptable).push(t);
    }

    for (const t of acceptable.concat(awkward)) {
      const to = nextBox(t);
      const sec = sectionBetween(t.at, to);
      if (!sec || sec.occupiedBy) continue;

      // Whether to hold an awkward train back and wait for its road to clear,
      // or send it now and accept the shunt at the far end, is a JUDGEMENT —
      // not a constant. It belongs to whoever is planning the night, so the
      // planner chooses it per train. Holding is only wise if you know why.
      if (awkward.includes(t)) {
        if (t.heldSince == null) t.heldSince = clock;
        const patience = holdSet.has(t.id) ? HOLD_PATIENCE : 0;
        if (clock - t.heldSince < patience) continue;
      }

      const slow = clock < sec.slowUntil ? sec.slowsBy : 0;
      const transit = Math.max(2, Math.round(sec.miles / 2) + slow);
      sec.occupiedBy = t.id;
      t.state = "RUNNING";
      t.pendingTo = to;
      t.arriveAt = clock + transit;
    }

    if (st.every((t) => t.state === "DONE")) {
      // Delay is measured against the PRINTED book, which is what the
      // players can see — not against the solution that produced it.
      let totalDelay = 0;
      for (const t of st) {
        const booked = t.ref.bookedMinute;
        if (typeof booked === "number") totalDelay += Math.max(0, t.doneAt - booked);
      }
      return {
        ok: true,
        finishAt: Math.max(...st.map((t) => t.doneAt)),
        totalDelay,
        perTrain: Object.fromEntries(st.map((t) => [t.id, t.doneAt])),
      };
    }
  }

  return {
    ok: false,
    finishAt: Infinity,
    totalDelay: Infinity,
    perTrain: {},
    stuck: st
      .filter((t) => t.state !== "DONE")
      .map((t) => ({
        id: t.id, state: t.state, at: t.at, final: finalBox(t),
        disposal: t.ref.disposal, wagons: t.ref.wagons,
        need: t.ref.facilityNeed, serviced: t.serviced,
        blockedSince: t.blockedSince ?? null, heldSince: t.heldSince ?? null,
      })),
  };
}

// ---------------------------------------------------------------- step 3: BOOK BACKWARDS

/**
 * Derive every printed booked time from the canonical solution, minus a
 * little pad. Because the times come OUT of a solution rather than being
 * invented and hoped for, the printed timetable is always achievable.
 */
function bookBackwards(rng, trains, canonical, startMinutes) {
  const hhmm = (m) => {
    const t = (startMinutes + m) % (24 * 60);
    return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
  };
  for (const t of trains) {
    const done = canonical.perTrain[t.id] ?? 0;
    t.bookedMinute = Math.max(0, done - rng.int(0, 2));
    t.booked = hhmm(t.bookedMinute);
    t.readyLabel = hhmm(t.readyAt);
  }
}

// ---------------------------------------------------------------- generate

export function generateShift({ roomCode, turnNo = 1, boxCount = 2, startClock = "22:40" }) {
  const cfg = TURN[Math.min(turnNo, TURN.length) - 1];
  const seed = fnv1a32(`${roomCode}:${turnNo}`);
  const [hh, mm] = startClock.split(":").map(Number);
  const startMinutes = hh * 60 + mm;

  let attempt = 0;
  for (; attempt < 200; attempt++) {
    const rng = makeRng((seed + attempt * 0x9e3779b9) >>> 0);
    const line = buildLine(rng, boxCount);
    const trains = drawTrains(rng, cfg.trains, line);

    // Offer the trains FASTER than the single line can work them off. A
    // section takes roughly transit + disposal to turn round; booking trains
    // on a shorter headway than that is what forms a queue, and a queue is
    // what makes the order you choose — and therefore what you have been told
    // about priority — actually matter. An uncongested railway needs no
    // signaller, and would make every notice in the book decorative.
    const headway = rng.pick([2, 3, 3, 4]);
    trains.forEach((t, i) => {
      t.readyAt = i * headway + rng.int(0, 2);
    });

    const canonical = simulate(line, trains, { rng: makeRng(seed + attempt), policy: "greedy" });
    if (!canonical.ok) continue;

    const mustFinishBy = Math.floor(cfg.window * (1 - cfg.slack));
    if (canonical.finishAt > mustFinishBy) continue;

    bookBackwards(rng, trains, canonical, startMinutes);

    return {
      seed,
      attempt,
      turnNo,
      config: cfg,
      startClock,
      startMinutes,
      lineName: line.lineName,
      line,
      trains,
      canonical,
      par: canonical.finishAt,
      mustFinishBy,
    };
  }
  return null; // caller falls back to a pre-certified shipped seed
}

export { makeRng };
