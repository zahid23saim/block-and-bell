/**
 * BLOCK & BELL — the live shift.
 *
 * The generator produces a night; this file runs one, as a state machine the
 * Durable Object drives. It owns THE SPLIT RULE at the wire: `sliceFor(boxId)`
 * is the only way a client ever learns anything, and it physically cannot
 * return a fact the asking box is not entitled to.
 */

import { generateShift, TURN } from "./generator.js";
import { buildFacts, applyTraps, NEUTRAL_PRIORITY } from "./traps.js";
import { TABLES } from "./content.js";
import { fnv1a32, mulberry32 } from "./generator.js";

const SERVICE_MIN = 3;
const DISPOSE_MIN = 2;

function rngFor(seed) {
  const r = mulberry32(seed);
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = (a) => a[Math.floor(r() * a.length)];
  r.shuffle = (a) => {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  };
  r.chance = (p) => r() < p;
  return r;
}

const hhmm = (m) =>
  String(Math.floor((m % 1440) / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");


/**
 * A notice is a thing somebody wrote by lamplight, so every token must come
 * out reading like English. A leftover {WAGONS} — or a blanket regex that
 * turns "{WAGONS} of ballast" into "the branch of ballast" — is the kind of
 * thing a judge notices in the first ten seconds.
 */
function substitute(s, v) {
  return s
    .replace(/\{BOX\}/g, v.box ?? "this box")
    .replace(/\{OTHERBOX\}/g, v.otherBox ?? "the next box")
    .replace(/\{TIME\}/g, v.time ?? "the booked time")
    .replace(/\{TRAIN\}/g, v.train ? `${v.train.headcode} ${v.train.name}` : "that working")
    .replace(/\{CLASS\}/g, v.train ? v.train.className.toLowerCase() : "goods")
    .replace(/\{WAGONS\}/g, String(v.wagons ?? 0))
    .replace(/\{LOOP\}/g, v.loop ?? "the loop")
    .replace(/\{MILES\}/g, String(v.miles ?? 7) + " miles")
    .replace(/\{SECTION\}/g, v.section ?? "the section");
}

/**
 * These archetypes name their cargo — "is the boat train", "is fish for the
 * early market" — so one cannot simply be dealt at random. Applying the cattle
 * card to a powder train produced "Cattle in G8 GUNPOWDER", which is nonsense
 * in a game whose whole subject is reading a notice carefully.
 */
const ARCHETYPE_FITS = [
  [/post office|mails/i, ["MAIL"]],
  [/boat train/i, ["EXPRESS_PASSENGER"]],
  [/fish/i, ["EXPRESS_FREIGHT"]],
  [/milk/i, ["MILK"]],
  [/breakdown/i, ["LIGHT_ENGINE"]],
  [/cattle/i, ["EXPRESS_FREIGHT"]],
  [/empty stock/i, ["COAL_EMPTIES"]],
  [/passenger|relief crew/i, ["EXPRESS_PASSENGER", "STOPPING_PASSENGER"]],
];

function archetypesFor(classId) {
  const all = TABLES.orders.priorityArchetypes;
  const fits = all.filter((a) => {
    const rule = ARCHETYPE_FITS.find(([re]) => re.test(a.template));
    return !rule || rule[1].includes(classId);
  });
  return fits.length ? fits : all.filter((a) => /\{CLASS\}/.test(a.template));
}

// ---------------------------------------------------------------- notices

/** Fill a notice template. Only the documented tokens are ever substituted. */
export function renderFact(fact, shift) {
  const box = (i) => shift.line.boxes[i]?.name ?? "the far box";
  const train = shift.trains.find((t) => t.id === fact.params?.trainId);
  const start = shift.startMinutes;

  if (fact.trap === "ORDER") {
    const rank = fact.params.priority;
    const who = train ? `${train.headcode} ${train.name}` : "that working";
    if (rank >= 5) return `${who} takes precedence over everything on the branch tonight.`;
    if (rank === 4) return `${who} is to be given a clear run. Do not stable it.`;
    if (rank <= 1) return `${who} may be put inside for anything else that wants the line.`;
    return `${who} runs in its booked order. Nothing special.`;
  }

  const pick = (arr) => arr[fnv1a32(fact.id + fact.trap) % arr.length];
  const sub = (s) =>
    substitute(s, {
      box: box(fact.params.boxIdx ?? fact.owner),
      otherBox: box(((fact.params.boxIdx ?? fact.owner) + 1) % shift.line.boxes.length),
      time: hhmm(start + (fact.params.untilMinute ?? fact.params.byMinute ?? 0)),
      train,
      wagons: fact.params.wagons ?? train?.wagons ?? 0,
      loop: fact.params.loopId ?? "the loop",
      miles: shift.line.sections[0]?.miles ?? 7,
    });

  if (fact.trap === "T1") {
    const pool = TABLES.notices.facilityNotices.filter((n) => n.need === fact.params.need);
    const n = pick(pool.length ? pool : TABLES.notices.facilityNotices);
    return sub(n.template);
  }
  if (fact.trap === "T4") return sub(pick(TABLES.notices.sectionNotices).template);
  if (fact.trap === "T2")
    return sub(`Yard at {BOX} will not hold more than ${fact.params.actualCapacity} wagons tonight. Board is wrong.`);
  if (fact.trap === "T3") return sub(`Loop {LOOP} at {BOX} is out of use. Do not book anything into it.`);
  if (fact.trap === "T5") return sub(pick(archetypesFor(train?.classId)).template);
  if (fact.trap === "T7") return sub(`{TRAIN} is running ${fact.params.minutes} minutes late.`);
  if (fact.trap === "T8")
    return sub(`{TRAIN} is ${fact.params.wagons} wagons. Longer than it looks on the book.`);
  return sub("Nothing further from the district office.");
}

// ---------------------------------------------------------------- build

export function newShift(roomCode, turnNo, boxCount) {
  const base = generateShift({ roomCode, turnNo, boxCount });
  if (!base) return null;

  const rng = rngFor(fnv1a32(`${roomCode}:facts:${turnNo}`));
  const facts = buildFacts(rng, base, base.config.traps);
  const world = applyTraps(base, facts); // the TRUE railway

  const decoyPool = rngFor(fnv1a32(`${roomCode}:decoy:${turnNo}`)).shuffle(TABLES.decoys.decoys);
  const decoys = [];
  for (let b = 0; b < boxCount; b++) {
    for (let k = 0; k < 2 + turnNo; k++) {
      const d = decoyPool[(b * 5 + k) % decoyPool.length];
      decoys.push({
        id: `D${b}_${k}`, trap: "DECOY", heldBy: b, knownFrom: 0, inert: true,
        text: substitute(d.template, {
          box: base.line.boxes[b].name,
          otherBox: base.line.boxes[(b + 1) % boxCount].name,
          time: hhmm(base.startMinutes - 60 - ((b * 7 + k * 13) % 180)),
          wagons: 4 + ((b + k) % 20),
          section: "the section",
          miles: base.line.sections[0]?.miles ?? 7,
        }),
      });
    }
  }

  return {
    turnNo,
    startMinutes: base.startMinutes,
    startClock: base.startClock,
    window: base.config.window,
    lineName: base.lineName,
    line: world.line,
    printedLine: base.line,       // what the boards SAY, before any notice
    trains: world.trains.map((t) => ({
      ...t,
      at: t.origin,
      state: "WAITING",            // WAITING | RUNNING | ARRIVED | DONE
      serviced: t.facilityNeed === "none",
      readyClock: t.readyAt,
      arriveAt: null,
      doneAt: null,
      placedOn: null,
    })),
    facts: facts.concat(decoys),
    sections: world.line.sections.map((s) => ({
      ...s, lamp: "CLEAR", grant: null, occupiedBy: null,
    })),
    roads: world.line.boxes.map((b) => ({
      platform: null,
      loops: b.loops.map((l) => ({ ...l, occupiedBy: null })),
      yardUsed: 0,
    })),
    clockMin: 0,
    delay: 0,
  };
}

// ---------------------------------------------------------------- physics

const finalBoxOf = (sh, t) =>
  t.dest === "THROUGH" ? (t.northbound ? sh.line.boxes.length - 1 : 0) : t.dest;

export function canPlace(sh, t, boxIdx, road) {
  const r = sh.roads[boxIdx];
  const b = sh.line.boxes[boxIdx];
  if (road === "through") return t.dest === "THROUGH";
  if (road === "platform") return !r.platform;
  if (road === "shed") return !!b.facilities.SHED;
  if (road === "yard")
    return r.yardUsed + t.wagons <= (b.yard.actualCapacity ?? b.yard.printedCapacity);
  if (road === "loop")
    return r.loops.some((l) => !l.outOfUse && !l.occupiedBy && l.maxWagons >= t.wagons);
  return false;
}

export function place(sh, t, boxIdx, road) {
  const r = sh.roads[boxIdx];
  if (road === "platform") r.platform = t.id;
  else if (road === "yard") r.yardUsed += t.wagons;
  else if (road === "loop") {
    const l = r.loops.find((x) => !x.outOfUse && !x.occupiedBy && x.maxWagons >= t.wagons);
    if (l) l.occupiedBy = t.id;
  }
  t.placedOn = road;
  t.state = "DONE";
  t.doneAt = sh.clockMin + DISPOSE_MIN;
  sh.delay += Math.max(0, t.doneAt - (t.bookedMinute ?? 0));
  const sec = sh.sections.find((s) => s.occupiedBy === t.id);
  if (sec) { sec.occupiedBy = null; sec.lamp = "CLEAR"; sec.grant = null; }
}

/** One simulated minute. Movement only; every decision belongs to a player. */
export function tick(sh) {
  sh.clockMin += 1;
  for (const t of sh.trains) {
    if (t.state === "RUNNING" && t.arriveAt != null && sh.clockMin >= t.arriveAt) {
      t.at = t.pendingTo;
      t.state = "ARRIVED";
      t.arriveAt = null;
      if (t.at !== finalBoxOf(sh, t)) {
        const sec = sh.sections.find((s) => s.occupiedBy === t.id);
        if (sec) { sec.occupiedBy = null; sec.lamp = "CLEAR"; sec.grant = null; }
        t.state = "WAITING";
      }
    }
  }
  return sh;
}

export const shiftOver = (sh) => sh.trains.every((t) => t.state === "DONE");

// ---------------------------------------------------------------- the slice

/**
 * THE SPLIT RULE, enforced at the only place it can be enforced.
 * A box is told its own roads and its own trains in full, its neighbour's
 * only as a lamp, and exactly those notices filed in ITS book that have
 * come through yet. Nothing else is ever serialised.
 */
export function sliceFor(sh, boxIdx) {
  const b = sh.line.boxes[boxIdx];
  const printed = sh.printedLine.boxes[boxIdx];
  const r = sh.roads[boxIdx];
  const here = sh.trains.filter((t) => t.at === boxIdx && t.state !== "DONE");
  const vign = TABLES.vignettes.vignettes;

  return {
    clock: hhmm(sh.startMinutes + sh.clockMin),
    lineName: sh.lineName,
    box: {
      id: b.id, name: b.name,
      // THE BOARDS, as printed. A notice may say otherwise — and that notice
      // is in the other box's book, not this one.
      yardPrinted: printed.yard.printedCapacity,
      loops: printed.loops.map((l) => ({ id: l.id, maxWagons: l.maxWagons })),
      facilities: printed.facilities,
    },
    roads: {
      platform: r.platform,
      loops: r.loops.map((l) => ({ id: l.id, maxWagons: l.maxWagons, occupiedBy: l.occupiedBy })),
      yardUsed: r.yardUsed,
    },
    trains: here.map((t) => {
      const v = vign.find((x) => x.classId === t.classId);
      return {
        id: t.id, headcode: t.headcode, name: t.name,
        className: t.className, glyph: t.glyph, wagons: t.wagons,
        booked: t.booked, dest: t.dest, disposal: t.disposal,
        facilityNeed: t.facilityNeed, serviced: t.serviced, state: t.state,
        vignette: v ? v.lines[fnv1a32(t.id + t.headcode) % v.lines.length] : t.flavour,
      };
    }),
    sections: sh.sections.map((s) => {
      const other = s.a === boxIdx ? s.b : s.a;
      const occ = sh.trains.find((t) => t.id === s.occupiedBy);
      return {
        id: s.id, to: sh.line.boxes[other].name, miles: s.miles,
        lamp: s.lamp, grant: s.grant,
        // the train in the section is visible as a working, not as a file
        occupiedBy: occ ? `${occ.headcode} ${occ.name}` : null,
        mine: s.a === boxIdx || s.b === boxIdx,
      };
    }),
    // YOUR BOOK: only cards filed here, only once they have come through.
    book: sh.facts
      .filter((f) => f.heldBy === boxIdx && (f.knownFrom ?? 0) <= sh.clockMin)
      .map((f) => ({
        id: f.id,
        kind: f.trap === "ORDER" ? "ORDER" : f.trap === "DECOY" ? "NOTICE" : "NOTICE",
        text: f.text ?? renderFact(f, sh),
        about: f.params?.trainId ?? null,
        posted: !!f.posted,
      })),
    delay: sh.delay,
  };
}
