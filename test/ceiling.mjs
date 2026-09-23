import { generateShift, makeRng, fnv1a32 } from "../src/generator.js";
import { buildFacts, applyTraps } from "../src/traps.js";
import { beamPlanOrder, planAndExecute } from "../src/planner.js";

const AL="ABCDEFGHJKLMNPRSTUVWXYZ";
const R = makeRng(31337);
const codes = Array.from({length:14},()=>Array.from({length:4},()=>R.pick([...AL])).join(""));
const OPT = { makeRng, width: 32, iters: 8 };
const q=(a,p)=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length*p)]??NaN;};

for (const turnNo of [1,2,3]) {
  const ceil=[], halves=[], dumps=[];
  for (const code of codes) {
    const shift = generateShift({roomCode:code,turnNo,boxCount:2});
    if (!shift) continue;
    const facts = buildFacts(makeRng(fnv1a32(code+":f:"+turnNo)), shift, shift.config.traps);
    const actual = applyTraps(shift, facts);
    const par = beamPlanOrder(actual, OPT).delay;

    // absolute ceiling: know NOTHING at all
    const none = applyTraps(shift, []);
    const zero = planAndExecute(actual, none, OPT);

    // lose exactly one box's book
    const b0 = applyTraps(shift, facts.filter(f=>f.heldBy!==0));
    const half = planAndExecute(actual, b0, OPT);

    // know every card, but not live occupancy (the dump)
    const dump = planAndExecute(actual, actual, {...OPT, blindOccupancy:true});

    if (zero.ok) ceil.push(zero.actual - par);
    if (half.ok) halves.push(half.actual - par);
    if (dump.ok) dumps.push(dump.actual - par);
  }
  const m=(a)=>(a.reduce((x,y)=>x+y,0)/(a.length||1)).toFixed(1);
  console.log(`turn ${turnNo}:`);
  console.log(`   know NOTHING      : mean ${m(ceil)}  p90 ${q(ceil,.9)}  max ${Math.max(...ceil)}   <-- absolute ceiling`);
  console.log(`   lose one box book : mean ${m(halves)} p90 ${q(halves,.9)}  (R2 needs 15)`);
  console.log(`   dump, no occupancy: mean ${m(dumps)}  p90 ${q(dumps,.9)}  (R1 needs ${[12,20,30][turnNo-1]})`);
}
