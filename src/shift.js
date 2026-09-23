/**
 * BLOCK & BELL — the live shift.
 *
 * The generator produces a night; this file runs one, as a state machine the
 * Durable Object drives. It owns THE SPLIT RULE at the wire: `sliceFor(boxId)`
 * is the only way a client ever learns anything, and it physically cannot
 * return a fact the asking box is not entitled to.
 */

import { generateShift, simulate } from "./generator.js";
import { buildFacts, applyTraps } from "./traps.js";
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
    // "{WAGONS} of ballast" must read "5 wagons of ballast", while
    // "blocked by {WAGONS} wagons" must not read "5 wagons wagons".
    .replace(/\{WAGONS\} wagons/g, `${v.wagons ?? 0} wagons`)
    .replace(/\{WAGONS\}/g, `${v.wagons ?? 0} wagons`)
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
  // cargo named in the notice -> the WORKING it may describe. Matching on
  // class alone called a meat train "fish for the early market", because
  // meat and fish are both express freight.
  [/fish/i, { names: ["FISH"] }],
  [/cattle/i, { names: ["CATTLE"] }],
  [/milk/i, { names: ["MILK"] }],
  [/post office|the mails/i, { names: ["NIGHT MAIL", "PAPERS"] }],
  [/boat train/i, { names: ["THE BOAT"] }],
  [/breakdown/i, { names: ["BREAKDOWN VAN"] }],
  [/empty stock/i, { names: ["EMPTIES", "THE SLOW GOODS"] }],
  [/take on the mails/i, { names: ["NIGHT MAIL", "PAPERS"] }],
  [/relief crew/i, { names: ["THE RELIEF"] }],
  [/passengers off/i, { classes: ["EXPRESS_PASSENGER", "STOPPING_PASSENGER"] }],
];

function archetypesFor(train) {
  const all = TABLES.orders.priorityArchetypes;
  const fits = all.filter((a) => {
    const rule = ARCHETYPE_FITS.find(([re]) => re.test(a.template));
    if (!rule) return true;                       // generic, fits anything
    if (!train) return false;
    const spec = rule[1];
    if (spec.names) return spec.names.includes(train.name);
    if (spec.classes) return spec.classes.includes(train.classId);
    return false;
  });
  // fall back to the one archetype written to take any class at all
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
  if (fact.trap === "T5") return sub(pick(archetypesFor(train)).template);
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

  // What a pair who told each other everything would have lost. One greedy
  // run under perfect knowledge — cheap enough to compute inside a Worker,
  // and an honest benchmark to print on the Notice.
  let par = null;
  try {
    const byBooked = world.trains.slice()
      .sort((a, b) => (a.bookedMinute ?? 0) - (b.bookedMinute ?? 0)).map((t) => t.id);
    const allIds = world.trains.map((t) => t.id);
    const tries = [
      { policy: "greedy" },
      { policy: "greedy", hold: allIds },
      { policy: "order", order: byBooked, hold: allIds },
      { policy: "order", order: byBooked },
    ];
    for (const o of tries) {
      const r = simulate(world.line, world.trains, o);
      if (r.ok && (par == null || r.totalDelay < par)) par = r.totalDelay;
    }
  } catch { /* the Notice simply omits par */ }
  if (par == null) par = 0;

  return {
    turnNo,
    par,
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
  releaseSection(sh, t);
}

/**
 * Free the section a train was occupying, without destroying a Line Clear
 * that was queued for a DIFFERENT train. Offering the next train while one is
 * still crossing is the whole point of "OFFER THE NEXT TRAIN"; wiping the
 * grant when the crossing train arrived silently undid it.
 */
function releaseSection(sh, t) {
  const sec = sh.sections.find((s) => s.occupiedBy === t.id);
  if (!sec) return;
  sec.occupiedBy = null;
  if (sec.grant && sec.grant.trainId !== t.id) {
    sec.lamp = sec.grant.given ? "GIVEN" : "CLEAR";
  } else {
    sec.grant = null;
    sec.lamp = "CLEAR";
  }
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
        releaseSection(sh, t);
        t.state = "WAITING";
      } else if (t.dest === "THROUGH") {
        // A train booked THROUGH does not stop and does not want anybody's
        // roads. It reaches the far end and is away. Offering it a platform
        // would have a goods train squatting on a road it never needed.
        place(sh, t, t.at, "through");
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
  // A train keeps `at` set to the box it left until it lands, so RUNNING must
  // be excluded or the same working is drawn twice: once out in the section
  // and once still standing on your platform.
  const here = sh.trains.filter(
    (t) => t.at === boxIdx && t.state !== "DONE" && t.state !== "RUNNING"
  );
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
    // Only the sections this box works. Tagging them `mine` and sending the
    // rest anyway would put a neighbour's lamp and grant on the wire the
    // moment the line grows past two boxes.
    sections: sh.sections.filter((s) => s.a === boxIdx || s.b === boxIdx).map((s) => {
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

// ---------------------------------------------------------------- the Notice

/**
 * Graded against THE BOOK, not against a computed par.
 *
 * The book is certified achievable — every printed time came out of a solution
 * the generator actually ran — so "minutes lost against the book" is a number
 * that means something. A par from a cheap heuristic was not: it ranged from 0
 * to 197 on the same difficulty, and printing it would have been dressing a
 * guess up as a standard. Bands scale with the size of the night.
 */
const GRADE = (total, trains) => {
  const n = Math.max(1, trains);
  if (total <= 2 * n) return { letter: "A", line: "A clean night. The district office has no remarks." };
  if (total <= 5 * n) return { letter: "B", line: "A good night, give or take a few minutes nobody will miss." };
  if (total <= 10 * n) return { letter: "C", line: "Workable. The delay was talked about at the far end." };
  return { letter: "D", line: "A bad night. Somebody will be asked to explain it." };
};

/**
 * NOTICE OF DELAY — the thing people screenshot.
 *
 * It prints what was booked against what happened, and then quotes the pair's
 * own worst sentence back at them, timestamped. Nothing here is invented: the
 * quote is a line one of them actually typed, chosen as the last thing said
 * before the train that lost the most time.
 */
export function buildReport(sh, register, players) {
  // The Notice names the SIGNAL BOXES on tonight's line — the ones printed on
  // the board all shift — not the room's placeholder seats. A player who
  // worked Garsdyke all night should not read "DUNMERE BOX" on their receipt.
  const boxNames = sh.line.boxes.map((b) => b.name);
  const worked = sh.line.boxes.map((b, i) => ({
    box: b.name,
    by: (players || [])[i] || null,
  }));
  // Single-handed means one box was MANNED, not that two people happened to
  // use the same default name. Deduping by name collapsed two signallers who
  // had both left theirs as "Signaller".
  const singleHanded = (players || []).filter(Boolean).length <= 1;
  const rows = sh.trains.map((t) => {
    const actual = t.doneAt != null ? sh.startMinutes + t.doneAt : null;
    const booked = t.bookedMinute != null ? sh.startMinutes + t.bookedMinute : null;
    const late = actual != null && booked != null ? Math.max(0, actual - booked) : 0;
    return {
      id: t.id, headcode: t.headcode, name: t.name, className: t.className,
      booked: booked != null ? hhmm(booked) : "—",
      actual: actual != null ? hhmm(actual) : "not away",
      late, placedOn: t.placedOn,
    };
  });

  const total = rows.reduce((a, r) => a + r.late, 0);
  const worst = rows.slice().sort((a, b) => b.late - a.late)[0];

  // the last thing anybody actually said
  const said = (register || []).filter((r) => r.kind === "say" || r.kind === "card");
  const quote = said.length ? said[said.length - 1] : null;

  /**
   * HELD FACTS — the closing beat.
   *
   * Every card that mattered, sat in somebody's book all night, and was never
   * read out. The grade says whether the trains ran; this says whether you
   * told each other, which is what the game is actually about. Decoys are
   * excluded: holding those back was the correct thing to do.
   */
  const held = sh.facts
    .filter((f) => f.trap !== "DECOY" && !f.posted && (f.knownFrom ?? 0) <= sh.clockMin)
    .map((f) => ({
      boxIdx: f.heldBy,
      box: boxNames[f.heldBy] ?? sh.line.boxes[f.heldBy]?.name,
      text: f.text ?? renderFact(f, sh),
    }));

  return {
    line: sh.lineName,
    from: hhmm(sh.startMinutes),
    to: hhmm(sh.startMinutes + sh.clockMin),
    boxes: boxNames,
    worked,
    singleHanded,
    rows,
    total,
    grade: GRADE(total, rows.length),
    worst: worst && worst.late > 0 ? worst : null,
    held,
    heldCount: held.length,
    quote: quote ? { from: quote.from, text: quote.text, kind: quote.kind } : null,
    allAway: sh.trains.every((t) => t.state === "DONE"),
  };
}

// ---------------------------------------------------------------- legality

/**
 * Which buttons exist for this box, right now.
 *
 * Pure, and deliberately not a method on the Durable Object: a night that
 * silently runs out of legal moves is the worst bug this game can have, and
 * it has to be findable in a local loop rather than only over a websocket.
 */
export function legalFor(sh, idx, opts = {}) {
  if (!sh || opts.paused) return [];
  const out = [];
  const sec = sh.sections[0];
  const boxCount = sh.line.boxes.length;
  const finalOf = (t) => (t.dest === "THROUGH" ? (t.northbound ? boxCount - 1 : 0) : t.dest);

  for (const t of sh.trains) {
    if (t.at !== idx || t.state === "DONE" || t.state === "RUNNING") continue;
    if (t.readyClock > sh.clockMin) continue;
    if (t.shuntUntil && sh.clockMin < t.shuntUntil) continue;
    const label = `${t.headcode} ${t.name}`;

    if (!t.serviced && t.facilityNeed !== "none") {
      const down = sh.line.boxes[idx].facilityDownUntil?.[t.facilityNeed] ?? 0;
      if (sh.line.boxes[idx].facilities[t.facilityNeed] && sh.clockMin >= down) {
        out.push({
          action: t.facilityNeed === "WATER" ? "TAKE_WATER" : "TAKE_COAL",
          label: t.facilityNeed === "WATER" ? "TAKE WATER" : "TAKE COAL",
          trainId: t.id, train: label,
        });
        continue;
      }
      // If this box HAS the facility but it is out of use, the train waits
      // for it - that is what the notice is about. Only fall through when the
      // box genuinely has no such facility, in which case the train must
      // travel on to find one.
      const here = sh.line.boxes[idx];
      if (here.facilities[t.facilityNeed] && t.at === finalOf(t)) {
        // The column is here but out of use. The train cannot be stowed
        // unserviced, so it waits - but waiting must be a CHOICE, not a
        // locked screen: shunting it clear costs minutes and is always open.
        out.push({
          action: "SHUNT", label: "SHUNT IT CLEAR", trainId: t.id, train: label,
          hint: `It is booked to take ${t.facilityNeed.toLowerCase()} here and the column is out of use.`,
        });
        continue;
      }
    }

    if (t.at === finalOf(t)) {
      const roads = [
        ["TO_PLATFORM", "platform", "TO THE PLATFORM"],
        ["TO_LOOP", "loop", "INTO THE LOOP"],
        ["TO_YARD", "yard", "INTO THE YARD"],
        ["TO_SHED", "shed", "TO THE SHED"],
      ];
      // It goes where it is BOOKED, or it is shunted. Offering every open
      // road let a player route around a shrunk yard or an out-of-use loop
      // for nothing, which made those notices - and the neighbour holding
      // them - worth precisely nothing.
      let any = false;
      for (const [action, road, lab] of roads) {
        if (road !== t.disposal) continue;
        if (canPlace(sh, t, idx, road)) {
          any = true;
          out.push({ action, label: lab, trainId: t.id, train: label, booked: true });
        }
      }
      if (!any) {
        if (t.shuntUntil && sh.clockMin >= t.shuntUntil) {
          out.push({
            action: "DETACH", label: "DETACH AND STOW", trainId: t.id, train: label, danger: true,
            hint: "Break it up and put it wherever there is room. It will not run again tonight.",
          });
        } else {
          out.push({
            action: "SHUNT", label: "SHUNT IT", trainId: t.id, train: label,
            hint: "Nowhere will take it as it stands. This costs minutes.",
          });
        }
      }
    } else if (!sec.grant) {
      // A train may be OFFERED while another is still in the section. The
      // grant queues and the road is only given when the section clears.
      // Without this both boxes sit watching a train cross with nothing to
      // decide — 89% of all dead air, and the longest silences in the game.
      out.push({
        action: "ASK", label: sec.occupiedBy ? "OFFER THE NEXT TRAIN" : "ASK LINE CLEAR",
        trainId: t.id, train: label,
        hint: sec.occupiedBy ? "The section is busy. Ask now and it goes the moment it clears." : undefined,
        args: { disposalIntent: t.disposal },
      });
    }
  }

  if (sec.grant && !sec.grant.given && sec.grant.from !== idx) {
    const t = sh.trains.find((x) => x.id === sec.grant.trainId);
    const nm = t ? `${t.headcode} ${t.name}` : "";
    out.push({ action: "GIVE", label: "GIVE LINE CLEAR", trainId: sec.grant.trainId, train: nm,
               hint: `for the ${sec.grant.intent}` });
    out.push({ action: "HOLD_THE_LINE", label: "HOLD THE LINE", trainId: sec.grant.trainId,
               train: nm, danger: true });
  }
  if (sec.grant && sec.grant.given && sec.grant.from === idx && !sec.occupiedBy) {
    const t = sh.trains.find((x) => x.id === sec.grant.trainId);
    out.push({ action: "SEND_INTO_SECTION", label: "SEND INTO SECTION",
               trainId: sec.grant.trainId, train: t ? `${t.headcode} ${t.name}` : "" });
  }
  return out;
}

/**
 * Apply one accepted action. Shared by the Durable Object and the local
 * stall test, so the two can never drift apart.
 * Returns a register line, or null if the action did nothing.
 */
export function applyAction(sh, idx, action, args, who) {
  const sec = sh.sections[0];
  const t = sh.trains.find((x) => x.id === args?.trainId);
  const name = t ? `${t.headcode} ${t.name}` : "that working";

  switch (action) {
    case "ASK":
      sec.grant = {
        from: idx, trainId: t.id, given: false,
        // the client names the intent; it is echoed to both boxes, so clip it
        intent: String(args.disposalIntent || t.disposal).slice(0, 24),
      };
      return `${who} asks Line Clear for the ${name}, for the ${sec.grant.intent}.`;

    case "GIVE":
      sec.grant.given = true;
      // a grant may be queued while a train is still crossing; the lamp must
      // keep reporting the section, not the promise
      if (!sec.occupiedBy) sec.lamp = "GIVEN";
      return `${who} gives Line Clear for the ${name}.`;

    case "HOLD_THE_LINE": {
      sec.grant = null;
      const reason = String(args?.reason || "cannot take it yet").slice(0, 80);
      return `${who} holds the line: ${reason}.`;
    }

    case "SEND_INTO_SECTION": {
      if (sec.occupiedBy) return null;
      const to = t.northbound ? t.at + 1 : t.at - 1;
      const slow = sh.clockMin < sec.slowUntil ? sec.slowsBy : 0;
      const transit = Math.max(2, Math.round(sec.miles / 2) + slow);
      sec.occupiedBy = t.id; sec.lamp = "OCCUPIED"; sec.grant = null;
      t.state = "RUNNING"; t.pendingTo = to; t.arriveAt = sh.clockMin + transit;
      return `${who} sends the ${name} into the section.`;
    }

    case "TAKE_WATER":
    case "TAKE_COAL":
      t.serviced = true; t.readyClock = sh.clockMin + SERVICE_MIN;
      return `${who} ${action === "TAKE_WATER" ? "waters" : "coals"} the ${name}.`;

    case "TO_PLATFORM": case "TO_LOOP": case "TO_YARD": case "TO_SHED": {
      const road = action.slice(3).toLowerCase();
      if (!canPlace(sh, t, idx, road)) return null;
      place(sh, t, idx, road);
      return `${who} puts the ${name} in the ${road}.`;
    }

    case "DETACH":
      place(sh, t, idx, "detached");
      return `${who} breaks up the ${name} and stows it where there is room.`;

    case "SHUNT":
      t.shuntUntil = sh.clockMin + 8;
      // shunting it clear settles the booking: it is dealt with by hand from
      // here, water or no water, booked road or not
      t.serviced = true;
      return `${who} sets about shunting the ${name}. It will take a while.`;
  }
  return null;
}
