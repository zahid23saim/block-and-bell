import { generateShift, simulate, makeRng, fnv1a32 } from "../src/generator.js";
import { perturb, buildFacts, applyTraps, computePar, R1_dumpTest, R2_noDecorativeSeat, R3_crossFactFloor } from "../src/traps.js";

const N = Number(process.env.N || 24);
const AL="ABCDEFGHJKLMNPRSTUVWXYZ";
const R = makeRng(4242);
const codes = Array.from({length:N},()=>Array.from({length:4},()=>R.pick([...AL])).join(""));
const mean = (x)=> (x.reduce((p,q)=>p+q,0)/(x.length||1)).toFixed(1);

// sanity: do the traps change the night AT ALL?
{
  const s = generateShift({roomCode:"SPAR",turnNo:2,boxCount:2});
  const facts = perturb(makeRng(1), s, 4);
  const clean = simulate(s.line, s.trains, {rng:makeRng(3),policy:"greedy"});
  const {line,trains} = applyTraps(s, facts);
  const dirty = simulate(line, trains, {rng:makeRng(3),policy:"greedy"});
  console.log(`sanity: ${facts.length} traps (${facts.map(f=>f.trap).join(",")}) | delay clean ${clean.totalDelay} -> trapped ${dirty.totalDelay}`);
}

for (const turnNo of [1,2,3]) {
  let r1=0,r2=0,r3=0,tot=0;
  const g1=[],g2=[],nec=[];
  for (const code of codes) {
    const shift = generateShift({ roomCode: code, turnNo, boxCount: 2 });
    if (!shift) continue;
    const facts = buildFacts(makeRng(fnv1a32(code+":p:"+turnNo)), shift, shift.config.traps);
    if (!facts.length) continue;
    const par = computePar(shift, facts, { restarts: 60, makeRng });
    if (!isFinite(par)) continue;
    tot++;
    const a = R1_dumpTest(shift, facts, par, makeRng);
    const b = R2_noDecorativeSeat(shift, facts, par, makeRng);
    const c = R3_crossFactFloor(shift, facts, par, makeRng);
    if (a.pass) r1++; if (b.pass) r2++; if (c.pass) r3++;
    g1.push(a.gap); g2.push(Math.min(...b.results.map(r=>r.gap))); nec.push(c.necessary);
  }
  console.log(
    `turn ${turnNo}: n=${tot} | R1 gap ${mean(g1)} (need ${[12,20,30][turnNo-1]}) -> ${r1}/${tot}` +
    ` | R2 worst-box gap ${mean(g2)} (need 15) -> ${r2}/${tot}` +
    ` | R3 necessary ${mean(nec)} (need ${[3,5,7][turnNo-1]}) -> ${r3}/${tot}`
  );
}
