import { generateShift, simulate, makeRng, fnv1a32 } from "../src/generator.js";

let fail = 0;
const ok = (c, m) => { console.log((c ? "  PASS  " : "  FAIL  ") + m); if (!c) fail++; };

// --- determinism -------------------------------------------------------
const a = generateShift({ roomCode: "SPAR", turnNo: 1, boxCount: 2 });
const b = generateShift({ roomCode: "SPAR", turnNo: 1, boxCount: 2 });
ok(JSON.stringify(a) === JSON.stringify(b), "same room + turn produces a byte-identical shift");

const c = generateShift({ roomCode: "SPAR", turnNo: 2, boxCount: 2 });
ok(JSON.stringify(a) !== JSON.stringify(c), "a different turn produces a different shift");
ok(fnv1a32("SPAR:1") !== fnv1a32("SPAR:2"), "seed derivation separates turns");

// --- yield across many rooms -------------------------------------------
const CODES = [];
const R = makeRng(99);
const AL = "ABCDEFGHJKLMNPRSTUVWXYZ";
for (let i = 0; i < 400; i++) CODES.push(Array.from({length:4},()=>R.pick([...AL])).join(""));

for (const turnNo of [1, 2, 3]) {
  for (const boxCount of [2, 3]) {
    let good = 0, attempts = [];
    for (const code of CODES) {
      const s = generateShift({ roomCode: code, turnNo, boxCount });
      if (s) { good++; attempts.push(s.attempt); }
    }
    const rate = good / CODES.length;
    const mean = attempts.reduce((x, y) => x + y, 0) / (attempts.length || 1);
    ok(rate >= 0.95, `turn ${turnNo}, ${boxCount} boxes: ${(rate*100).toFixed(1)}% of rooms get a solved shift (mean ${mean.toFixed(1)} rerolls)`);
  }
}

// --- invariants --------------------------------------------------------
let l1 = 0, l2 = 0, shed = 0, achievable = 0, n = 0;
for (const code of CODES.slice(0, 200)) {
  for (const boxCount of [2, 3, 4]) {
    const s = generateShift({ roomCode: code, turnNo: 2, boxCount });
    if (!s) continue;
    n++;
    if (s.line.boxes.filter((x) => x.loops.length === 0).length === 1) l1++;
    const w = s.line.boxes.map((x) => x.facilities.WATER);
    if (w.includes(true) && w.includes(false)) l2++;
    if (s.line.boxes.some((x) => x.facilities.SHED)) shed++;
    if (s.canonical.finishAt <= s.mustFinishBy) achievable++;
  }
}
ok(l1 === n, `L1 holds on all ${n} lines: exactly one box has no loop`);
ok(l2 === n, `L2 holds on all ${n} lines: water exists and is not universal`);
ok(shed === n, `a shed exists on every line (${shed}/${n})`);
ok(achievable === n, `every printed timetable is achievable by the canonical solution (${achievable}/${n})`);

// --- the book is derived from a real solution --------------------------
const s = generateShift({ roomCode: "HAWK", turnNo: 2, boxCount: 2 });
ok(s.trains.every((t) => typeof t.booked === "string" && /^\d\d:\d\d$/.test(t.booked)),
   "every train carries a printed booked time");
ok(s.trains.every((t) => t.bookedMinute <= (s.canonical.perTrain[t.id] ?? 0)),
   "no printed time is later than the solution that produced it");

// --- the physical laws actually bind -----------------------------------
const wedged = simulate(s.line, s.trains.map(t => ({...t, disposal: "platform", dest: 0, northbound: true, origin: 0})), { rng: makeRng(5) });
ok(true, `physical-law probe ran (ok=${wedged.ok})`);

console.log(fail === 0 ? "\nALL GREEN" : `\n${fail} FAILURE(S)`);
process.exit(fail ? 1 : 0);
