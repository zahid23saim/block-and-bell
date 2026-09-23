import { newShift, tick, legalFor, applyAction, shiftOver } from "../src/shift.js";
const PREF = ["GIVE","SEND_INTO_SECTION","TO_YARD","TO_LOOP","TO_PLATFORM","TO_SHED",
              "TAKE_WATER","TAKE_COAL","DETACH","SHUNT","ASK"];
const AL = "ABCDEFGHJKLMNPRSTUVWXYZ";
const why = {};
for (let i = 0; i < 60; i++) {
  const code = AL[i%23]+AL[(i*3)%23]+AL[(i*7)%23]+AL[(i*11)%23];
  const sh = newShift(code, 1 + (i%3), 2);
  if (!sh) continue;
  for (let m = 0; m < sh.window + 90 && !shiftOver(sh); m++) {
    let acted = false;
    for (let pass = 0; pass < 6; pass++)
      for (const idx of [0,1]) {
        const legal = legalFor(sh, idx);
        for (const p of PREF) { const a = legal.find(x=>x.action===p);
          if (a) { applyAction(sh, idx, a.action, {...(a.args||{}), trainId:a.trainId}, "t"); acted = true; break; } }
      }
    const left = sh.trains.filter(t => t.state !== "DONE");
    if (!acted && left.length) {
      const sec = sh.sections[0];
      const running = left.some(t => t.state === "RUNNING");
      const waitingReady = left.some(t => t.state !== "RUNNING" && t.readyClock > sh.clockMin);
      const shunting = left.some(t => t.shuntUntil && sh.clockMin < t.shuntUntil);
      const k = running ? "a train is in the section"
        : sec.occupiedBy ? "section still occupied"
        : shunting ? "waiting on a shunt"
        : waitingReady ? "no train is due yet"
        : "trains present but nothing legal";
      why[k] = (why[k] || 0) + 1;
    }
    tick(sh);
  }
}
const total = Object.values(why).reduce((a,b)=>a+b,0);
console.log("what the silent minutes are waiting for:");
for (const [k,v] of Object.entries(why).sort((a,b)=>b[1]-a[1]))
  console.log(`   ${String(Math.round(v*100/total)).padStart(3)}%  ${k}  (${v} min)`);
