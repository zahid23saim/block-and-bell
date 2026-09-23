/** An automatic second signaller, so the UI can be exercised by hand. */
const BASE = "https://block-and-bell.zahid23saim.workers.dev";
const WS = BASE.replace(/^http/, "ws");
const code = process.env.BB_ROOM;
const sock = new WebSocket(`${WS}/api/ws?room=${code}`);
let last = null;
const send = (o) => sock.send(JSON.stringify(o));
sock.addEventListener("open", () => send({ t: "hello", v: 1 }));
sock.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.t === "hello_ack") { send({ t: "claim_seat", boxId: "HAR", name: "Ada" }); return; }
  if (m.t !== "snapshot") return;
  last = m;
  const legal = m.legalActions || [];
  // play along: accept everything, put trains away where offered
  const prefer = ["GIVE","TO_SHED","CLEAR_MY_SECTION","TO_YARD","TO_LOOP","TO_PLATFORM","TAKE_WATER","TAKE_COAL","SEND_INTO_SECTION","ASK"];
  for (const p of prefer) {
    const a = legal.find(x => x.action === p);
    if (a) { setTimeout(()=>send({t:"act",action:a.action,args:{...(a.args||{}),trainId:a.trainId}}), 900); break; }
  }
});
setInterval(()=>{ if (sock.readyState===1) send({t:"ping",at:Date.now()}); }, 15000);
process.on("SIGTERM", ()=>sock.close());
