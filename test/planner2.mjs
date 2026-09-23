import { generateShift, makeRng, fnv1a32 } from "../src/generator.js";
import { perturb, applyTraps } from "../src/traps.js";
import { planAndExecute } from "../src/planner.js";

const AL="ABCDEFGHJKLMNPRSTUVWXYZ";
const R = makeRng(77);
const codes = Array.from({length:10},()=>Array.from({length:4},()=>R.pick([...AL])).join(""));

for (const [w,i,f] of [[24,5,6],[48,12,8],[80,20,10]]) {
  const OPT = { makeRng, width:w, iters:i, fanout:f };
  let v=0,n=0; const gaps=[];
  for (const code of codes) for (const turnNo of [1,2,3]) {
    const shift = generateShift({roomCode:code,turnNo,boxCount:2});
    if (!shift) continue;
    const facts = perturb(makeRng(fnv1a32(code+":p:"+turnNo)), shift, shift.config.traps);
    if (!facts.length) continue;
    const actual = applyTraps(shift, facts), nothing = applyTraps(shift, []);
    const full = planAndExecute(actual, actual, OPT);
    const blind = planAndExecute(actual, nothing, OPT);
    if (!full.ok || !blind.ok) continue;
    n++; if (full.actual > blind.actual + 1e-9) v++;
    gaps.push(blind.actual - full.actual);
  }
  const mean=(x)=>(x.reduce((p,q)=>p+q,0)/(x.length||1)).toFixed(1);
  console.log(`width ${String(w).padStart(3)} iters ${String(i).padStart(2)} fanout ${f}: violations ${v}/${n}  | knowledge worth mean ${mean(gaps)} (min ${Math.min(...gaps)})`);
}
