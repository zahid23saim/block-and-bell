import { generateShift, simulate, makeRng } from "../src/generator.js";
import { perturb, applyTraps } from "../src/traps.js";

const shift = generateShift({roomCode:"SPAR",turnNo:2,boxCount:2});
const facts = perturb(makeRng(1), shift, 4);
console.log("facts:", facts.map(f=>`${f.trap}(owner${f.owner}->held${f.heldBy}@${f.knownFrom})`).join("  "));

const actual = applyTraps(shift, facts);
const none   = applyTraps(shift, []);
console.log("actual  yardCap:", actual.line.boxes.map(b=>b.yard.actualCapacity ?? b.yard.printedCapacity).join(","),
            "| believed:", none.line.boxes.map(b=>b.yard.actualCapacity ?? b.yard.printedCapacity).join(","));
console.log("actual  prios  :", actual.trains.map(t=>t.priority).join(","),
            "| believed:", none.trains.map(t=>t.priority).join(","));
console.log("actual  ready  :", actual.trains.map(t=>t.readyAt).join(","),
            "| believed:", none.trains.map(t=>t.readyAt).join(","));
console.log("disposals      :", actual.trains.map(t=>`${t.disposal}@${t.dest}`).join(" "));

function mean(bel,label) {
  let s=0,n=0,w=0;
  for (let i=0;i<120;i++){
    const r = simulate(actual.line, actual.trains, {
      rng: makeRng(7000+i), policy:"greedy",
      believedLine: bel?.line, believedTrains: bel?.trains,
    });
    if (r.ok){s+=r.totalDelay;n++;} else w++;
  }
  console.log(`${label}: mean=${((s + w*60)/(n+w)).toFixed(2)} solved=${n} wedged=${w}`);
}
mean(actual,"INFORMED (believed=actual) ");
mean(none,  "IGNORANT (believed=no traps)");

const r = simulate(actual.line, actual.trains, { rng: makeRng(7000), policy:"greedy",
  believedLine: actual.line, believedTrains: actual.trains });
console.log("\nstuck trains:", JSON.stringify(r.stuck, null, 1));
console.log("boxes:", actual.line.boxes.map(b=>`${b.id} plat1 loops[${b.loops.map(l=>l.maxWagons+(l.outOfUse?"X":"")).join("/")}] yard${b.yard.actualCapacity ?? b.yard.printedCapacity} W${b.facilities.WATER?1:0}C${b.facilities.COAL?1:0}S${b.facilities.SHED?1:0}`).join(" | "));
