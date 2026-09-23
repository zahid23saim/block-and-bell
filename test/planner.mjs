import { generateShift, makeRng, fnv1a32 } from "../src/generator.js";
import { perturb, applyTraps } from "../src/traps.js";
import { beamPlanOrder, planAndExecute } from "../src/planner.js";

const AL="ABCDEFGHJKLMNPRSTUVWXYZ";
const R = makeRng(77);
const codes = Array.from({length: Number(process.env.N||20)},()=>Array.from({length:4},()=>R.pick([...AL])).join(""));
const OPT = { makeRng, width: 24, iters: 5 };

let violations = 0, n = 0;
const gaps = [], parGain = [];

for (const code of codes) {
  for (const turnNo of [1,2,3]) {
    const shift = generateShift({roomCode:code, turnNo, boxCount:2});
    if (!shift) continue;
    const facts = perturb(makeRng(fnv1a32(code+":p:"+turnNo)), shift, shift.config.traps);
    if (!facts.length) continue;

    const actual = applyTraps(shift, facts);
    const nothing = applyTraps(shift, []);

    // how much the planner beats the reactive greedy baseline
    const greedySeed = actual.trains.slice().sort((a,b)=>b.priority-a.priority).map(t=>t.id);
    const planned = beamPlanOrder(actual, OPT);

    const full = planAndExecute(actual, actual, OPT);
    const blind = planAndExecute(actual, nothing, OPT);
    if (!full.ok || !blind.ok) continue;
    n++;
    if (full.actual > blind.actual + 1e-9) violations++;   // knowing more was WORSE
    gaps.push(blind.actual - full.actual);
    parGain.push(planned.delay);
  }
}
const mean = (x)=>(x.reduce((p,q)=>p+q,0)/(x.length||1)).toFixed(1);
console.log(`monotonicity: ${n-violations}/${n} shifts where full knowledge was at least as good as none`);
console.log(`knowledge is worth a mean of ${mean(gaps)} delay-minutes (max ${Math.max(...gaps)}, min ${Math.min(...gaps)})`);
console.log(violations === 0 ? "NO VIOLATIONS — knowledge never hurt" : `${violations} VIOLATIONS`);
