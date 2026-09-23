/**
 * End-to-end: two independent clients pass the light engine through the section.
 * Also asserts THE SPLIT RULE at the wire — the south box must never be sent
 * the north box's train, and vice versa.
 */
const BASE = process.env.BB_BASE || "https://block-and-bell.zahid23saim.workers.dev";
const WS = BASE.replace(/^http/, "ws");

let failures = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  PASS  " : "  FAIL  ") + msg);
  if (!cond) failures++;
};

function client(code, label) {
  const c = {
    label, seat: null, box: null, snaps: [], last: null,
    sock: new WebSocket(`${WS}/api/ws?room=${code}`),
  };
  c.ready = new Promise((res) => (c._res = res));
  c.sock.addEventListener("open", () =>
    c.sock.send(JSON.stringify({ t: "hello", v: 1 }))
  );
  c.sock.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "hello_ack") { c.seat = m.seatToken; c._res(); }
    else if (m.t === "snapshot") { c.snaps.push(m); c.last = m; }
    else if (m.t === "toast") { c.toast = m.text; console.log(`  [toast->${label}] ${m.text}`); }
  });
  c.send = (o) => c.sock.send(JSON.stringify(o));
  return c;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(80); }
  return false;
}

const run = async () => {
  console.log("BASE:", BASE);

  const page = await fetch(BASE);
  ok(page.status === 200, `landing page 200 (got ${page.status})`);
  const html = await page.text();
  ok(html.includes("BLOCK &amp; BELL"), "landing page renders the title card");

  const res = await fetch(`${BASE}/api/create`, { method: "POST" });
  const { code } = await res.json();
  ok(/^[A-Z]{4}$/.test(code), `room code allocated: ${code}`);

  const A = client(code, "A/south");
  const B = client(code, "B/north");
  await Promise.all([A.ready, B.ready]);
  ok(!!A.seat && !!B.seat && A.seat !== B.seat, "two distinct seat tokens issued");

  A.send({ t: "claim_seat", boxId: "DUN", name: "Sam" });
  B.send({ t: "claim_seat", boxId: "HAR", name: "Ada" });
  await until(() => A.last?.you?.boxId === "DUN" && B.last?.you?.boxId === "HAR");
  ok(A.last?.you?.boxId === "DUN", "A seated at DUNMERE");
  ok(B.last?.you?.boxId === "HAR", "B seated at HARTLE");

  // --- the split rule --------------------------------------------------
  ok(A.last.trains.length === 1 && A.last.trains[0].id === "12",
     "south box sees the light engine standing at its own box");
  ok(B.last.trains.length === 0,
     "north box is NOT sent the train standing at the south box (split rule)");

  // --- legal actions are authored by the server ------------------------
  ok(A.last.legalActions.map(a => a.action).join() === "ASK",
     "only the south box may ASK, and it is its only legal action");
  ok(B.last.legalActions.length === 0,
     "north box has no legal action until it is asked");

  // an illegal action must be refused in character
  B.send({ t: "act", action: "SEND_INTO_SECTION", args: {} });
  await until(() => !!B.toast);
  ok(/not yours/i.test(B.toast || ""), "illegal action refused in character");

  // --- the block cycle -------------------------------------------------
  A.send({ t: "act", action: "ASK", args: { sectionId: "S1", disposalIntent: "SHED" } });
  await until(() => B.last.legalActions.some(a => a.action === "GIVE"));
  ok(B.last.legalActions.some(a => a.action === "GIVE"), "ASK unlocks GIVE at the north box");
  ok(A.last.legalActions.length === 0, "south box has nothing to do while it waits");

  B.send({ t: "act", action: "GIVE", args: { sectionId: "S1", acceptedDisposal: "SHED" } });
  await until(() => A.last.section.lamp === "GIVEN");
  ok(A.last.section.lamp === "GIVEN", "lamp reads LINE CLEAR GIVEN at the south box");

  A.send({ t: "act", action: "SEND_INTO_SECTION", args: { sectionId: "S1" } });
  await until(() => B.last.trains.length === 1);
  ok(A.last.section.lamp === "OCCUPIED", "section reads OCCUPIED");
  ok(B.last.trains.length === 1, "the train has arrived at the north box");
  ok(A.last.trains.length === 0, "south box no longer holds the train");

  B.send({ t: "act", action: "TO_SHED", args: {} });
  await until(() => B.last.legalActions.some(a => a.action === "CLEAR_MY_SECTION"));
  ok(B.last.legalActions.some(a => a.action === "CLEAR_MY_SECTION"), "disposal unlocks CLEAR MY SECTION");

  B.send({ t: "act", action: "CLEAR_MY_SECTION", args: { sectionId: "S1" } });
  await until(() => A.last.phase === "READY");
  ok(A.last.phase === "READY", "the shift reaches READY — the light engine is away");
  ok(A.last.section.lamp === "CLEAR", "section back to CLEAR");

  // --- reconnect -------------------------------------------------------
  const tok = A.seat;
  A.sock.close();
  await sleep(600);
  const A2 = client(code, "A/reconnect");
  await A2.ready;
  A2.sock.send(JSON.stringify({ t: "hello", v: 1, resumeToken: tok }));
  await until(() => A2.last?.you?.boxId === "DUN");
  ok(A2.last?.you?.boxId === "DUN", "a reload restores the SAME seat from the resume token");
  ok(A2.last.register.length > 0, "the returning player is sent the register they missed");

  // --- persistence across a cold read ---------------------------------
  const C = client(code, "C/fresh");
  await C.ready;
  await until(() => !!C.last);
  ok(C.last.phase === "READY", "room state survived in Durable Object SQLite");

  [A2, B, C].forEach((c) => c.sock.close());
  console.log(failures === 0 ? "\nALL GREEN" : `\n${failures} FAILURE(S)`);
  process.exit(failures ? 1 : 0);
};

run().catch((e) => { console.error("HARNESS ERROR", e); process.exit(2); });
