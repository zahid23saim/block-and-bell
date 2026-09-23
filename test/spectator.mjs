/**
 * A watcher with no seat must not break the room. This used to throw inside
 * broadcast() and stop the clock for everyone, permanently.
 */
const BASE = process.env.BB_BASE || "https://block-and-bell.zahid23saim.workers.dev";
const WS = BASE.replace(/^http/, "ws");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let fail = 0; const ok = (c,m)=>{console.log((c?"  PASS  ":"  FAIL  ")+m); if(!c)fail++;};

function client(code) {
  const c = { last: null, sock: new WebSocket(`${WS}/api/ws?room=${code}`) };
  c.send = (o) => { try { c.sock.send(JSON.stringify(o)); } catch {} };
  c.sock.addEventListener("open", () => c.send({ t: "hello", v: 1 }));
  c.sock.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "hello_ack") c.token = m.seatToken;
    else if (m.t === "snapshot") c.last = m;
  });
  return c;
}

const { code } = await (await fetch(`${BASE}/api/create`, { method: "POST" })).json();
const A = client(code);
await sleep(1500);
A.send({ t: "claim_seat", boxId: "DUN", name: "Sam" });
await sleep(1200);

// through the tutorial, working both desks
for (let i = 0; i < 30 && A.last?.phase !== "READY"; i++) {
  const a = (A.last?.legalActions || [])[0];
  if (a) A.send({ t: "act", action: a.action, args: { ...(a.args||{}), trainId: a.trainId } });
  else { const o = (A.last?.desks||[]).find(d=>!d.viewing); if (o) A.send({ t:"view_box", boxId:o.id }); }
  await sleep(400);
}
ok(A.last?.phase === "READY", "tutorial done");
A.send({ t: "begin" });
await sleep(2500);
ok(A.last?.phase === "SHIFT", "shift under way");

const before = A.last.clock;

// a stranger opens the link and just watches
const W = client(code);
await sleep(2500);
ok(!!W.last, "the watcher receives a snapshot rather than nothing");
ok(W.last.waiting === true, "the watcher is told to take a box, and is sent no shift data");
ok(!W.last.book && !W.last.trains?.length, "the watcher gets no book and no workings");

// the room must still be running
await sleep(9000);
const after = A.last.clock;
ok(after !== before, `the clock kept running with a watcher attached (${before} -> ${after})`);
ok(!!A.last.legalActions, "the seated player still has a live board");

// a socket that never says hello must not be able to claim a box
const raw = new WebSocket(`${WS}/api/ws?room=${code}`);
await new Promise(r => raw.addEventListener("open", r));
raw.send(JSON.stringify({ t: "claim_seat", boxId: "HAR", name: "ghost" }));
await sleep(2000);
const har = A.last.boxes.find(b => b.id === "HAR");
ok(!har.player || har.player !== "ghost", "a socket that skipped hello cannot claim a box");
await sleep(4000);
ok(A.last.clock !== after, "and the clock is still running after that attempt");

A.sock.close(); W.sock.close(); raw.close();
console.log(fail===0?"\nALL GREEN":`\n${fail} FAILURE(S)`);
process.exit(fail?1:0);
