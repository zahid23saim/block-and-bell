/**
 * N signallers, N boxes, N-1 sections.  BOXES=4 node test/threebox.mjs
 * A middle box works a section at each end; the ends work one each.
 * The split rule must still hold across every book.
 */
const BASE = process.env.BB_BASE || "https://block-and-bell.zahid23saim.workers.dev";
const WS = BASE.replace(/^http/, "ws");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let fail = 0; const ok = (c,m)=>{console.log((c?"  PASS  ":"  FAIL  ")+m); if(!c)fail++;};

function client(code, name) {
  const c = { name, last: null, sock: new WebSocket(`${WS}/api/ws?room=${code}`) };
  c.ready = new Promise(res => (c._res = res));
  c.send = (o) => { try { c.sock.send(JSON.stringify(o)); } catch {} };
  c.sock.addEventListener("open", () => c.send({ t: "hello", v: 1 }));
  c.sock.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "hello_ack") { c.token = m.seatToken; c._res(); }
    else if (m.t === "snapshot") c.last = m;
  });
  return c;
}
const until = async (fn, ms = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(150); }
  return false;
};

const { code } = await (await fetch(`${BASE}/api/create`, { method: "POST" })).json();
console.log("room", code);

const N = Number(process.env.BOXES || 3);
const IDS = ["DUN", "HAR", "WES", "KEL"], NAMES = ["Sam", "Ada", "Wes", "Kel"];
const CL = [];
for (let i = 0; i < N; i++) CL.push(client(code, NAMES[i]));
await Promise.all(CL.map(c => c.ready));
CL.forEach((c, i) => c.send({ t: "claim_seat", boxId: IDS[i], name: NAMES[i] }));
const [A, B, C] = CL;
await until(() => CL.every(c => c.last?.you?.boxId));
ok(CL.every(c=>c.last?.you?.boxId), `${N} signallers can all take a seat in the lobby`);
ok(/light engine|Dunmere and Hartle/i.test(C.last.ribbon || ""),
   `a watching box is told what is happening: "${(C.last.ribbon||"").slice(0,60)}"`);

// tutorial between the first two
const act = (c, a) => c.send({ t: "act", action: a.action, args: { ...(a.args||{}), trainId: a.trainId } });
for (let i = 0; i < 30 && A.last.phase !== "READY"; i++) {
  for (const c of [A, B]) { const a = (c.last.legalActions || [])[0]; if (a) act(c, a); }
  await sleep(450);
}
ok(A.last.phase === "READY", `tutorial completes with ${N - 2} player(s) watching`);

C.send({ t: "begin" });
await until(() => A.last.phase === "SHIFT" && !!A.last.book, 20000);
ok(A.last.phase === "SHIFT", "the shift books on");

const boxes = CL.map(c => c.last.box?.name);
ok(new Set(boxes).size === N, `${N} distinct boxes on the line: ${boxes.join(", ")}`);
// booking on must NAME the boxes: five cold readers thought the rename
// meant they had been dropped into somebody else's game
const bookedOn = (A.last.register||[]).map(r=>r.text).join(" ");
ok(/Booking on/.test(bookedOn) && boxes.every(b => bookedOn.includes(b)),
   "booking on names every box on the line, so the rename is not a surprise");

// sections: the middle box works two, the ends work one
const counts = CL.map(c => (c.last.sections || []).length);
console.log(`   sections per box: ${boxes.map((b,i)=>`${b}=${counts[i]}`).join("  ")}`);
ok(counts.filter(n => n === 2).length === N - 2, `${N - 2} middle box(es) work two sections`);
ok(counts.filter(n => n === 1).length === 2, "the two end boxes work one section each");
ok(counts.every(n => n >= 1), "every box works at least one section");

// THE SPLIT RULE across three books
const books = CL.map(c => new Set((c.last.book||[]).map(x => x.id)));
let shared = 0;
for (let i = 0; i < N; i++) for (let j = i+1; j < N; j++)
  for (const id of books[i]) if (books[j].has(id)) shared++;
ok(shared === 0, "no card appears in more than one book");
ok(books.every(b => b.size > 0), `all ${N} books are stocked (${books.map(b=>b.size).join("/")})`);

const trains = CL.map(c => new Set((c.last.trains||[]).map(t=>t.id)));
let dup = 0;
for (let i = 0; i < N; i++) for (let j = i+1; j < N; j++)
  for (const id of trains[i]) if (trains[j].has(id)) dup++;
ok(dup === 0, "a train stands at exactly one box");

// orders are for somebody else's trains
for (const [i, c] of CL.entries()) {
  const own = trains[i];
  const bad = (c.last.book||[]).filter(x => x.kind === "ORDER" && x.about && own.has(x.about));
  ok(bad.length === 0, `${boxes[i]} holds no order for a train at its own platform`);
}

// and the line still runs
await until(() => CL.some(c => (c.last.legalActions||[]).some(a => a.action === "ASK")), 30000);
const asker = CL.find(c => (c.last.legalActions||[]).some(a => a.action === "ASK"));
ok(!!asker, `a box is offered ASK LINE CLEAR on the ${N}-box line`);
if (asker) {
  const a = asker.last.legalActions.find(x => x.action === "ASK");
  act(asker, a);
  const got = await until(() => CL.some(c => c !== asker && (c.last.legalActions||[]).some(x => x.action === "GIVE")));
  ok(got, "the ask reaches the right neighbour, not everybody");
  const givers = CL.filter(c => (c.last.legalActions||[]).some(x => x.action === "GIVE"));
  ok(givers.length === 1, `exactly one box is asked (${givers.length})`);
}

CL.forEach(c => c.sock.close());
console.log(fail===0?"\nALL GREEN":`\n${fail} FAILURE(S)`);
process.exit(fail?1:0);
