/**
 * BLOCK & BELL — steps 4, 5 and 8 of the generator.
 *
 *   4  PERTURB          bend the solved shift with K traps
 *   5  SPLIT + RELEASE  file every derived fact in the book of the box that
 *                       does NOT own the affected road or train
 *   8  REJECTION TESTS  certify the shift before it is ever shown to anyone
 *
 * Traps implemented mechanically here: T1-T5, T7, T8.
 * T6 (conditional stop) and T9 (bait pair) are presentation-layer traps and
 * are built with the book UI; they are not claimed as certified below.
 */

import { simulate } from "./generator.js";
import { beamPlanOrder, planAndExecute } from "./planner.js";

// ---------------------------------------------------------------- step 4: PERTURB

const clone = (o) => JSON.parse(JSON.stringify(o));

/**
 * What a signaller assumes about a train whose working order they have not
 * been given: that it is ordinary, and waits its turn like everything else.
 * The order card in the NEIGHBOUR'S book is what says otherwise.
 */
export const NEUTRAL_PRIORITY = 3;

export function perturb(rng, shift, K) {
  const { line, trains, config } = shift;
  const window = config.window;
  const candidates = [];

  // T1 — a facility is out at a box, and the box that needs it cannot see that
  for (const b of line.boxes) {
    for (const need of ["WATER", "COAL"]) {
      if (!b.facilities[need]) continue;
      if (!trains.some((t) => t.facilityNeed === need)) continue;
      candidates.push({
        trap: "T1", owner: b.idx,
        params: { boxIdx: b.idx, need, untilMinute: rng.int(Math.floor(window * 0.3), window) },
      });
    }
  }

  // T2 — the yard is smaller than the yard board says it is
  for (const b of line.boxes) {
    if (!trains.some((t) => t.disposal === "yard" && t.dest === b.idx)) continue;
    const printed = b.yard.printedCapacity;
    candidates.push({
      trap: "T2", owner: b.idx,
      params: { boxIdx: b.idx, actualCapacity: Math.max(6, printed - rng.pick([6, 8, 12])) },
    });
  }

  // T3 — a loop is out of use
  for (const b of line.boxes) {
    for (const l of b.loops) {
      if (!trains.some((t) => t.disposal === "loop" && t.dest === b.idx)) continue;
      candidates.push({ trap: "T3", owner: b.idx, params: { boxIdx: b.idx, loopId: l.id } });
    }
  }

  // T4 — the section is slow, so every path plan built on the book is wrong
  line.sections.forEach((s, i) => {
    candidates.push({
      trap: "T4", owner: s.a,
      params: { sectionIdx: i, untilMinute: rng.int(Math.floor(window * 0.4), window), slowsBy: rng.int(2, 4) },
    });
  });

  // T5 — something outranks what the book implies. A CONNECTION archetype
  // needs a real deadline or it prints "by 22:40" on a shift that starts 22:40.
  for (const t of trains) {
    if (t.priority >= 5) continue;
    candidates.push({
      trap: "T5", owner: t.origin,
      params: {
        trainId: t.id, priority: 5,
        byMinute: Math.max(8, Math.floor(window * rng.int(35, 75) / 100)),
      },
    });
  }

  // T7 — running late. ALWAYS time-released: nobody is warned in advance.
  for (const t of trains) {
    candidates.push({ trap: "T7", owner: t.origin, params: { trainId: t.id, minutes: rng.int(4, 12) } });
  }

  // T8 — it is longer than the loop it is booked into
  for (const t of trains) {
    if (t.disposal !== "loop" || t.dest === "THROUGH") continue;
    const box = line.boxes[t.dest];
    const maxLoop = Math.max(0, ...box.loops.map((l) => l.maxWagons));
    if (maxLoop === 0) continue;
    candidates.push({ trap: "T8", owner: t.dest, params: { trainId: t.id, wagons: maxLoop + rng.int(2, 8) } });
  }

  // Pick K, spread ACROSS trap families rather than four of the same kind.
  // A night that is four late-running notices is one idea repeated; a night
  // that is a shut water column, a shrunk yard and a train that outranks the
  // book is three different conversations.
  const byFamily = new Map();
  for (const c of rng.shuffle(candidates)) {
    if (!byFamily.has(c.trap)) byFamily.set(c.trap, []);
    byFamily.get(c.trap).push(c);
  }
  const families = rng.shuffle([...byFamily.keys()]);
  const chosen = [];
  const used = new Set();
  for (let round = 0; chosen.length < K && round < 8; round++) {
    for (const fam of families) {
      if (chosen.length >= K) break;
      const c = byFamily.get(fam)[round];
      if (!c) continue;
      const key =
        c.trap + ":" + JSON.stringify(c.params.boxIdx ?? c.params.trainId ?? c.params.sectionIdx);
      if (used.has(key)) continue;
      used.add(key);
      chosen.push(c);
    }
  }

  // ---- step 5: SPLIT AND TIME-RELEASE --------------------------------
  const boxCount = line.boxes.length;
  return chosen.map((c, i) => {
    // THE SPLIT RULE: never filed with the box that owns the thing it affects.
    const others = line.boxes.map((b) => b.idx).filter((x) => x !== c.owner);
    const heldBy = others.length ? rng.pick(others) : (c.owner + 1) % boxCount;

    // 60% known at booking-on; 40% arrive mid-shift as a district wire.
    // T7 is always late — you find out a train is late by it being late.
    const late = c.trap === "T7" || rng.chance(0.4);
    const knownFrom = late
      ? Math.floor((0.25 + rng() * 0.6) * shift.config.window)
      : 0;

    return { id: "F" + (i + 1), ...c, heldBy, knownFrom };
  });
}

/**
 * The complete book: every train's working order, plus the night's notices.
 *
 * THE SPLIT RULE applies to both. A box holds the orders for its NEIGHBOUR'S
 * trains, so neither signaller can rank their own traffic without being told.
 */
export function buildFacts(rng, shift, K) {
  const boxCount = shift.line.boxes.length;
  const orders = shift.trains.map((t, i) => {
    const others = shift.line.boxes.map((b) => b.idx).filter((x) => x !== t.origin);
    return {
      id: "O" + (i + 1),
      trap: "ORDER",
      owner: t.origin,
      heldBy: others.length ? rng.pick(others) : (t.origin + 1) % boxCount,
      knownFrom: rng.chance(0.75) ? 0 : Math.floor((0.25 + rng() * 0.5) * shift.config.window),
      params: { trainId: t.id, priority: t.priority, bookedMinute: t.bookedMinute },
    };
  });
  return [...orders, ...perturb(rng, shift, K)];
}

// ---------------------------------------------------------------- apply

export function applyTraps(shift, facts) {
  const line = clone(shift.line);
  // Every train starts ORDINARY. Its real standing is printed in the other
  // box's book, so a box that has not been told treats a boat train and a
  // rake of coal empties exactly alike.
  const trains = clone(shift.trains).map((t) => ({ ...t, priority: NEUTRAL_PRIORITY }));

  // ORDER cards first, then the notices that override them.
  const ordered = [...facts].sort((a, b) => (a.trap === "ORDER" ? -1 : 0) - (b.trap === "ORDER" ? -1 : 0));
  for (const f of ordered) {
    const p = f.params;
    if (f.trap === "ORDER") {
      const t = trains.find((x) => x.id === p.trainId);
      if (t) { t.priority = p.priority; t.bookedMinute = p.bookedMinute; }
    } else if (f.trap === "T1") {
      const b = line.boxes[p.boxIdx];
      b.facilityDownUntil = b.facilityDownUntil || {};
      b.facilityDownUntil[p.need] = p.untilMinute;
    } else if (f.trap === "T2") {
      line.boxes[p.boxIdx].yard.actualCapacity = p.actualCapacity;
    } else if (f.trap === "T3") {
      const l = line.boxes[p.boxIdx].loops.find((x) => x.id === p.loopId);
      if (l) l.outOfUse = true;
    } else if (f.trap === "T4") {
      const s = line.sections[p.sectionIdx];
      s.slowUntil = p.untilMinute;
      s.slowsBy = p.slowsBy;
    } else if (f.trap === "T5") {
      const t = trains.find((x) => x.id === p.trainId);
      if (t) t.priority = p.priority;
    } else if (f.trap === "T7") {
      const t = trains.find((x) => x.id === p.trainId);
      if (t) t.readyAt += p.minutes;
    } else if (f.trap === "T8") {
      const t = trains.find((x) => x.id === p.trainId);
      if (t) t.wagons = p.wagons;
    }
  }
  return { line, trains };
}

// ---------------------------------------------------------------- PAR

/**
 * PAR = the least total delay achievable under PERFECT communication:
 * every fact known to every box the instant it exists. Computed by the
 * planner (step 7), searching dispatch orders in the true world.
 */
export function computePar(shift, facts, { makeRng, width = 24, iters = 5 } = {}) {
  const actual = applyTraps(shift, facts);
  return beamPlanOrder(actual, { makeRng, width, iters }).delay;
}

// ---------------------------------------------------------------- step 8: rejection tests

/** The world as it looks if you only know SOME of the notices. */
function believedFrom(shift, facts, knownIds) {
  return applyTraps(shift, facts.filter((f) => knownIds.has(f.id)));
}

/**
 * Plan on what you know; live with what is true.
 * Returns the delay actually incurred, which is what the report prints.
 */
function delayKnowing(shift, facts, knownIds, opts, makeRng, width = 24, iters = 5) {
  const actual = applyTraps(shift, facts);
  const believed = believedFrom(shift, facts, knownIds);
  const r = planAndExecute(actual, believed, { makeRng, width, iters, ...opts });
  return r.ok ? r.actual : shift.config.window * 2;
}

/**
 * R1 — THE DUMP TEST.
 * Every card is posted the moment it appears, and nothing else is ever said.
 * Cards are shared; live road occupancy is not. If reading your book aloud is
 * enough to reach par, the shift is not a conversation and is rerolled.
 */
export function R1_dumpTest(shift, facts, par, makeRng) {
  const all = new Set(facts.map((f) => f.id));
  const dump = delayKnowing(shift, facts, all, { blindOccupancy: true }, makeRng);
  const need = [12, 20, 30][shift.turnNo - 1];
  return { pass: dump - par >= need, gap: dump - par, need, dump, par };
}

/**
 * R2 — NO DECORATIVE SEAT.
 * Delete each box's book in turn. If the shift survives without a given box's
 * cards, that signaller is scenery.
 */
export function R2_noDecorativeSeat(shift, facts, par, makeRng) {
  const results = [];
  for (const b of shift.line.boxes) {
    const without = new Set(facts.filter((f) => f.heldBy !== b.idx).map((f) => f.id));
    const delay = delayKnowing(shift, facts, without, {}, makeRng);
    results.push({
      boxIdx: b.idx,
      cards: facts.filter((f) => f.heldBy === b.idx).length,
      gap: delay - par, need: 15, pass: delay - par >= 15,
    });
  }
  return { pass: results.every((r) => r.pass), results };
}

/**
 * R3 — CROSS-FACT FLOOR.
 * Count the facts that are individually load-bearing: withhold that one alone
 * and the best achievable night still gets worse.
 */
export function R3_crossFactFloor(shift, facts, par, makeRng) {
  let necessary = 0;
  const lateOnes = [];
  for (const f of facts) {
    const without = new Set(facts.filter((x) => x.id !== f.id).map((x) => x.id));
    const delay = delayKnowing(shift, facts, without, {}, makeRng, 16, 4);
    if (delay - par >= 8) {
      necessary++;
      if (f.knownFrom > 0.25 * shift.config.window) lateOnes.push(f.id);
    }
  }
  const need = [3, 5, 7][shift.turnNo - 1];
  return { pass: necessary >= need && lateOnes.length >= 1, necessary, need, lateOnes };
}
