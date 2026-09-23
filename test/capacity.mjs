import { TURN, buildLine, drawTrains, simulate, makeRng, fnv1a32 } from "../src/generator.js";

// What does the line actually carry? Measure canonical finish time with no window cap.
for (const turnNo of [1,2,3]) {
  for (const boxCount of [2,3,4]) {
    const cfg = TURN[turnNo-1];
    const fin = [];
    for (let i=0;i<400;i++){
      const rng = makeRng(fnv1a32("PROBE"+i+":"+turnNo+":"+boxCount));
      const line = buildLine(rng, boxCount);
      const trains = drawTrains(rng, cfg.trains, line);
      trains.forEach((t,k)=>{ t.readyAt = Math.floor(k*cfg.window/(cfg.trains*2.2)) + rng.int(0,2); });
      const r = simulate(line, trains, { rng: makeRng(i), policy:"greedy" });
      if (r.ok) fin.push(r.finishAt);
    }
    fin.sort((a,b)=>a-b);
    const pct = (p)=> fin[Math.floor(fin.length*p)] ?? NaN;
    console.log(
      `turn ${turnNo} boxes ${boxCount}: solved ${fin.length}/400  ` +
      `p50=${pct(.5)} p80=${pct(.8)} p90=${pct(.9)}  ` +
      `| window ${cfg.window}, must finish by ${Math.floor(cfg.window*(1-cfg.slack))}`
    );
  }
}
