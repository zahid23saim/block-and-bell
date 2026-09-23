/**
 * BLOCK & BELL — step 7 of the generator: the planner.
 *
 * The rejection tests in step 8 only mean something if "best achievable given
 * what you know" is computed by something that PLANS. A reactive heuristic can
 * be made worse by knowing more — it reacts differently, not better — and a
 * measurement built on one cannot tell you whether talking is necessary.
 *
 * A planner cannot be hurt by knowledge, because it can always ignore a fact.
 * That monotonicity is the whole reason this file exists.
 *
 * Deviation from spec, stated plainly: §5.7 specifies a beam search over the
 * full state {clock, occupancy, grants, roads, trains, facts-known}. This
 * searches the DISPATCH ORDER instead — the permutation of trains that decides
 * who takes the single line next. That is the decision a pair of signallers
 * actually argues about, it is where knowledge pays, and it is small enough to
 * search honestly. Search width and depth are parameters, not the fixed 250×N.
 */

import { simulate } from "./generator.js";

/** Run one candidate order through a world and return its total delay. */
function scorePlan(world, plan, extra) {
  const r = simulate(world.line, world.trains, {
    policy: "order", order: plan.order, hold: plan.hold, ...extra,
  });
  return r.ok ? r.totalDelay : Infinity;
}

function seedOrders(world, makeRng, count) {
  const ts = world.trains;
  const byKey = (fn) => ts.slice().sort(fn).map((t) => t.id);
  const seeds = [
    byKey((a, b) => b.priority - a.priority),
    byKey((a, b) => (a.bookedMinute ?? 0) - (b.bookedMinute ?? 0)),
    byKey((a, b) => a.readyAt - b.readyAt),
    byKey((a, b) => b.wagons - a.wagons),
    byKey((a, b) => (b.perishable ? 1 : 0) - (a.perishable ? 1 : 0)),
  ];
  const rng = makeRng(90210);
  while (seeds.length < count) seeds.push(rng.shuffle(ts.map((t) => t.id)));
  return seeds;
}

function neighbours(plan, rng, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    // a third of the time, change WHO WE HOLD rather than who goes first
    if (rng.chance(0.35)) {
      const hold = new Set(plan.hold);
      const id = plan.order[rng.int(0, plan.order.length - 1)];
      if (hold.has(id)) hold.delete(id); else hold.add(id);
      out.push({ order: plan.order.slice(), hold: [...hold] });
      continue;
    }
    const a = plan.order.slice();
    if (rng.chance(0.6)) {
      // adjacent swap — a small change of mind about who goes next
      const i = rng.int(0, a.length - 2);
      [a[i], a[i + 1]] = [a[i + 1], a[i]];
    } else if (rng.chance(0.5)) {
      // move one train to a different place in the queue
      const i = rng.int(0, a.length - 1);
      const j = rng.int(0, a.length - 1);
      const [x] = a.splice(i, 1);
      a.splice(j, 0, x);
    } else {
      const i = rng.int(0, a.length - 1);
      const j = rng.int(0, a.length - 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    out.push({ order: a, hold: plan.hold.slice() });
  }
  return out;
}

/**
 * Search for the dispatch order that works best IN THE GIVEN WORLD.
 * Pass the believed world to plan under partial knowledge; pass the actual
 * world to compute the optimum.
 */
export function beamPlanOrder(world, { width = 40, iters = 8, fanout = 6, makeRng, blindOccupancy } = {}) {
  const extra = blindOccupancy ? { blindOccupancy: true } : undefined;
  const rng = makeRng(1234);
  const allIds = world.trains.map((t) => t.id);
  const seeds = [];
  for (const o of seedOrders(world, makeRng, Math.max(4, Math.ceil(width / 2)))) {
    seeds.push({ order: o, hold: [] });        // send everything, shunt as needed
    seeds.push({ order: o, hold: allIds });    // hold every awkward train
  }
  let beam = seeds
    .map((p) => ({ ...p, delay: scorePlan(world, p, extra) }))
    .sort((a, b) => a.delay - b.delay)
    .slice(0, width);

  let best = beam[0];

  for (let it = 0; it < iters; it++) {
    const seen = new Set(beam.map((b) => b.order.join(",") + "|" + b.hold.slice().sort().join(",")));
    const next = beam.slice();
    for (const cand of beam) {
      for (const p of neighbours(cand, rng, fanout)) {
        const key = p.order.join(",") + "|" + p.hold.slice().sort().join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ ...p, delay: scorePlan(world, p, extra) });
      }
    }
    next.sort((a, b) => a.delay - b.delay);
    beam = next.slice(0, width);
    if (beam[0].delay < best.delay) best = beam[0];
  }

  return best; // {order, delay}
}

/**
 * Plan in the believed world, then run that plan in the real one.
 *
 * This is the honest cost of not being told something: you do not make a
 * random mistake, you make a CONFIDENT one — the plan is optimal for a
 * railway that is not the railway you are standing on.
 */
export function planAndExecute(actual, believed, opts) {
  const plan = beamPlanOrder(believed, opts);
  const run = simulate(actual.line, actual.trains, {
    policy: "order",
    order: plan.order,
    hold: plan.hold,
    believedLine: believed.line,
    believedTrains: believed.trains,
    blindOccupancy: opts?.blindOccupancy,
  });
  return {
    order: plan.order,
    hold: plan.hold,
    predicted: plan.delay,
    actual: run.ok ? run.totalDelay : Infinity,
    ok: run.ok,
  };
}
