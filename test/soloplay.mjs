/** One signaller works both desks through a whole night, to the Notice. */
const BASE = process.env.BB_BASE || "https://block-and-bell.zahid23saim.workers.dev";
const WS = BASE.replace(/^http/, "ws");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PREF = ["GIVE","SEND_INTO_SECTION","TO_YARD","TO_LOOP","TO_PLATFORM","TO_SHED",
              "TAKE_WATER","TAKE_COAL","DETACH","SHUNT","ASK","CLEAR_MY_SECTION"];

const { code } = await (await fetch(`${BASE}/api/create`, { method: "POST" })).json();
console.log("room", code);
let last = null, sock = null, token = null;
const send = (o) => { try { sock.send(JSON.stringify(o)); } catch {} };
function connect() {
  sock = new WebSocket(`${WS}/api/ws?room=${code}`);
  sock.addEventListener("open", () => send({ t: "hello", v: 1, resumeToken: token || undefined }));
  sock.addEventListener("close", () => setTimeout(connect, 800));
  sock.addEventListener("error", () => {});
  sock.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "hello_ack") {
      token = m.seatToken;
      if (!m.boxId) send({ t: "claim_seat", boxId: "DUN", name: "Alone" });
    } else if (m.t === "snapshot") last = m;
  });
}
connect();
await sleep(2000);

const step = () => {
  const legal = last?.legalActions || [];
  for (const p of PREF) {
    const a = legal.find(x => x.action === p);
    if (a) { send({ t: "act", action: a.action, args: { ...(a.args||{}), trainId: a.trainId } }); return true; }
  }
  return false;
};
const swap = () => {
  const other = (last?.desks || []).find(d => !d.viewing);
  if (other) send({ t: "view_box", boxId: other.id });
};

for (let i = 0; i < 40 && last?.phase !== "READY"; i++) { if (!step()) swap(); await sleep(450); }
console.log("tutorial ->", last?.phase);
send({ t: "begin" });
await sleep(2500);
console.log("shift ->", last?.phase, "|", last?.lineName);

const t0 = Date.now(); let tick = 0, posted = 0, lastLog = "";
while (Date.now() - t0 < 420000 && last?.phase === "SHIFT") {
  if (!step()) swap();
  const card = (last?.book || []).find(x => !x.posted);
  if (card && posted < 5 && Math.random() < 0.2) { send({ t: "send_fact", factId: card.id }); posted++; }
  if (++tick % 18 === 0) {
    const line = `  ${last?.clock} delay=${last?.delay} acts=${(last?.legalActions||[]).length} desk=${last?.you?.boxName}`;
    if (line !== lastLog) { console.log(line); lastLog = line; }
  }
  await sleep(450);
}

const r = last?.report;
console.log("final:", last?.phase, "clock", last?.clock);
if (r) {
  console.log(`\nNOTICE OF DELAY — ${r.line}  ${r.from}-${r.to}   ${r.boxes.join(" & ")}`);
  for (const row of r.rows)
    console.log("   " + `${row.headcode} ${row.name}`.padEnd(22) + `${row.booked} -> ${row.actual}`.padEnd(20) + (row.late ? "+"+row.late : "-"));
  console.log(`   TOTAL ${r.total} minutes lost against the book — GRADE ${r.grade.letter}`);
  console.log(`   ${r.grade.line}`);
  if (r.quote) console.log(`   "${r.quote.text}" — ${r.quote.from}`);
  console.log(`   all away: ${r.allAway}`);
  console.log("ROOM=" + code);
} else console.log("NO REPORT — trains left:", (last?.trains||[]).map(t=>t.headcode+" "+t.name).join(", "));
try { sock.close(); } catch {}
process.exit(r ? 0 : 1);
