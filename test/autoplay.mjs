/** Two automatic signallers play a whole night through to the Notice. */
const BASE = process.env.BB_BASE || "https://block-and-bell.zahid23saim.workers.dev";
const WS = BASE.replace(/^http/, "ws");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function client(code, box, name) {
  const c = { box, name, last: null, sock: new WebSocket(`${WS}/api/ws?room=${code}`) };
  c.ready = new Promise(res => (c._res = res));
  c.send = (o) => { try { c.sock.send(JSON.stringify(o)); } catch {} };
  c.sock.addEventListener("open", () => c.send({ t: "hello", v: 1 }));
  c.sock.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "hello_ack") { c.send({ t: "claim_seat", boxId: box, name }); c._res(); }
    else if (m.t === "snapshot") c.last = m;
  });
  return c;
}

const PREF = ["GIVE","SEND_INTO_SECTION","TO_YARD","TO_LOOP","TO_PLATFORM","TO_SHED",
              "TAKE_WATER","TAKE_COAL","SHUNT","ASK","CLEAR_MY_SECTION"];

const run = async () => {
  const { code } = await (await fetch(`${BASE}/api/create`, { method: "POST" })).json();
  console.log("room", code);
  const A = client(code, "DUN", "Sam"), B = client(code, "HAR", "Ada");
  await Promise.all([A.ready, B.ready]);
  await sleep(1200);

  // tutorial
  for (let i = 0; i < 40 && (A.last?.phase !== "READY"); i++) {
    for (const c of [A, B]) {
      const a = (c.last?.legalActions || [])[0];
      if (a) c.send({ t: "act", action: a.action, args: { ...(a.args || {}), trainId: a.trainId } });
    }
    await sleep(700);
  }
  console.log("tutorial ->", A.last?.phase);
  A.send({ t: "begin" });
  await sleep(2500);
  console.log("shift ->", A.last?.phase, A.last?.lineName);

  const t0 = Date.now();
  let posted = 0;
  while (Date.now() - t0 < 560000 && A.last?.phase === "SHIFT") {
    for (const c of [A, B]) {
      const legal = c.last?.legalActions || [];
      for (const p of PREF) {
        const a = legal.find(x => x.action === p);
        if (a) { c.send({ t: "act", action: a.action, args: { ...(a.args || {}), trainId: a.trainId } }); break; }
      }
      // read a card aloud now and then, so the Notice has something to quote
      const card = (c.last?.book || []).find(x => !x.posted);
      if (card && posted < 6 && Math.random() < 0.25) { c.send({ t: "send_fact", factId: card.id }); posted++; }
    }
    await sleep(800);
  }

  const r = A.last?.report;
  console.log("final phase:", A.last?.phase, "| clock", A.last?.clock, "| delay", A.last?.delay);
  if (r) {
    console.log(`\nNOTICE OF DELAY — ${r.line}  ${r.from}–${r.to}   ${r.boxes.join(" & ")}`);
    for (const row of r.rows)
      console.log("   " + `${row.headcode} ${row.name}`.padEnd(22) + `${row.booked} -> ${row.actual}`.padEnd(18) + (row.late ? "+" + row.late : "—"));
    console.log(`   TOTAL ${r.total} minutes lost against the book — GRADE ${r.grade.letter}`);
    console.log(`   ${r.grade.line}`);
    if (r.quote) console.log(`   "${r.quote.text}" — ${r.quote.from}`);
    console.log(`   all away: ${r.allAway}`);
  } else console.log("NO REPORT PRODUCED");
  A.sock.close(); B.sock.close();
  process.exit(r ? 0 : 1);
};
run().catch(e => { console.error(e); process.exit(2); });
