/** One signaller, alone, must be able to finish the tutorial and book on. */
const BASE = process.env.BB_BASE || "https://block-and-bell.zahid23saim.workers.dev";
const WS = BASE.replace(/^http/, "ws");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let fail = 0; const ok = (c,m)=>{console.log((c?"  PASS  ":"  FAIL  ")+m); if(!c)fail++;};

const { code } = await (await fetch(`${BASE}/api/create`, { method: "POST" })).json();
const c = { last: null, sock: new WebSocket(`${WS}/api/ws?room=${code}`) };
const send = (o) => c.sock.send(JSON.stringify(o));
c.sock.addEventListener("open", () => send({ t: "hello", v: 1 }));
c.sock.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.t === "hello_ack") send({ t: "claim_seat", boxId: "DUN", name: "Alone" });
  else if (m.t === "snapshot") c.last = m;
});
await sleep(2500);
ok(!!c.last, `solo client connected to ${code}`);
ok((c.last.desks||[]).length === 2, `offered the two tutorial desks (${(c.last.desks||[]).map(d=>d.name).join(", ")})`);

// play the whole tutorial alone, switching desks as needed
for (let i = 0; i < 30 && c.last.phase !== "READY"; i++) {
  const a = (c.last.legalActions || [])[0];
  if (a) send({ t: "act", action: a.action, args: { ...(a.args||{}), trainId: a.trainId } });
  else {
    const other = (c.last.desks||[]).find(d => !d.viewing);
    if (other) send({ t: "view_box", boxId: other.id });
  }
  await sleep(500);
}
ok(c.last.phase === "READY", "a lone signaller can finish the tutorial by working both boxes");

send({ t: "begin" });
await sleep(2500);
ok(c.last.phase === "SHIFT", "and book on to a real shift alone");
ok(!!c.last.book, `with a book (${(c.last.book||[]).length} cards)`);
c.sock.close();
console.log(fail===0?"\nALL GREEN":`\n${fail} FAILURE(S)`);
process.exit(fail?1:0);
