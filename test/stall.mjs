/**
 * Can a night always be finished? Plays many shifts locally with a greedy
 * pair and reports any minute where nobody has a legal move and trains remain.
 */
import { newShift, tick, legalFor, applyAction, shiftOver } from "../src/shift.js";

const PREF = ["GIVE","SEND_INTO_SECTION","TO_YARD","TO_LOOP","TO_PLATFORM","TO_SHED",
              "TAKE_WATER","TAKE_COAL","DETACH","SHUNT","ASK"];
const AL = "ABCDEFGHJKLMNPRSTUVWXYZ";
const N = Number(process.env.N || 60);
const BOXES = Number(process.env.BOXES || 2);

let stalls = 0, finished = 0, timeouts = 0; const runs = [];
const stallDetail = [];

for (let i = 0; i < N; i++) {
  const code = AL[i%23] + AL[(i*3)%23] + AL[(i*7)%23] + AL[(i*11)%23];
  const turnNo = 1 + (i % 3);
  const boxCount = BOXES;
  const sh = newShift(code, turnNo, boxCount);
  if (!sh) continue;

  let deadMinutes = 0, firstDead = null, run = 0, maxRun = 0;
  const LIMIT = sh.window + 90;
  for (let m = 0; m < LIMIT && !shiftOver(sh); m++) {
    let acted = false;
    for (let pass = 0; pass < 6; pass++) {
      for (let idx = 0; idx < boxCount; idx++) {
        const legal = legalFor(sh, idx);
        for (const p of PREF) {
          const a = legal.find(x => x.action === p);
          if (a) { applyAction(sh, idx, a.action, { ...(a.args||{}), trainId: a.trainId }, "test"); acted = true; break; }
        }
      }
    }
    const remaining = sh.trains.filter(t => t.state !== "DONE").length;
    const running = sh.trains.some(t => t.state === "RUNNING");
    if (!acted && remaining > 0) {
      deadMinutes++; run++; if (run > maxRun) maxRun = run;
      if (firstDead == null) firstDead = sh.clockMin;
    } else run = 0;
    tick(sh);
  }

  if (shiftOver(sh)) finished++;
  else {
    timeouts++;
    const stuck = sh.trains.filter(t => t.state !== "DONE");
    stallDetail.push({ code, turnNo, clock: sh.clockMin,
      stuck: stuck.map(t => `${t.headcode} ${t.name} at box${t.at} ${t.state} ->${t.disposal} need=${t.facilityNeed} serviced=${t.serviced} ready=${t.readyClock}`) });
  }
  if (deadMinutes > 0) stalls++;
  runs.push(maxRun);
}

runs.sort((a,b)=>a-b);
const q=(p)=>runs[Math.floor(runs.length*p)]??0;
console.log(`boxes: ${BOXES} | nights: ${N} | finished ${finished} | did not finish ${timeouts} | had dead minutes ${stalls}`);
console.log(`longest silence per night (sim minutes): p50 ${q(.5)}  p80 ${q(.8)}  p95 ${q(.95)}  max ${runs[runs.length-1]}`);
console.log(`(R4 in the spec: no box should sit more than 5 sim minutes with nothing to decide)`);
for (const d of stallDetail.slice(0, 5)) {
  console.log(`  ${d.code} turn ${d.turnNo} stuck at min ${d.clock}:`);
  for (const s of d.stuck) console.log("     " + s);
}
process.exit(timeouts === 0 ? 0 : 1);
