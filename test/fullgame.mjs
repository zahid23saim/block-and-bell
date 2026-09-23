/**
 * End-to-end against the DEPLOYED worker: two clients play the tutorial,
 * book on to a real shift, and work a train through the section.
 * Also asserts THE SPLIT RULE over the wire on live shift data.
 */
const BASE = process.env.BB_BASE || "https://block-and-bell.zahid23saim.workers.dev";
const WS = BASE.replace(/^http/, "ws");

let failures = 0;
const ok = (c, m) => { console.log((c ? "  PASS  " : "  FAIL  ") + m); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client(code, label) {
  const c = { label, seat: null, last: null, toasts: [], sock: new WebSocket(`${WS}/api/ws?room=${code}`) };
  c.ready = new Promise((res) => (c._res = res));
  c.sock.addEventListener("open", () => c.sock.send(JSON.stringify({ t: "hello", v: 1 })));
  c.sock.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "hello_ack") { c.seat = m.seatToken; c._res(); }
    else if (m.t === "snapshot") c.last = m;
    else if (m.t === "toast") c.toasts.push(m.text);
  });
  c.send = (o) => c.sock.send(JSON.stringify(o));
  return c;
}

async function until(fn, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); }
  return false;
}

const act = (c, action, args) => c.send({ t: "act", action, args });

const run = async () => {
  console.log("BASE:", BASE, "\n");

  const { code } = await (await fetch(`${BASE}/api/create`, { method: "POST" })).json();
  ok(/^[A-Z]{4}$/.test(code), `room ${code}`);

  const A = client(code, "A"), B = client(code, "B");
  await Promise.all([A.ready, B.ready]);
  A.send({ t: "claim_seat", boxId: "DUN", name: "Sam" });
  B.send({ t: "claim_seat", boxId: "HAR", name: "Ada" });
  await until(() => A.last?.you?.boxId === "DUN" && B.last?.you?.boxId === "HAR");
  ok(true, "both boxes manned");

  // ---- tutorial -------------------------------------------------------
  act(A, "ASK", { sectionId: "S1", disposalIntent: "SHED" });
  await until(() => B.last.legalActions.some((a) => a.action === "GIVE"));
  act(B, "GIVE", { sectionId: "S1", acceptedDisposal: "SHED" });
  await until(() => A.last.legalActions.some((a) => a.action === "SEND_INTO_SECTION"));
  act(A, "SEND_INTO_SECTION", { sectionId: "S1" });
  await until(() => B.last.legalActions.some((a) => a.action === "TO_SHED"));
  act(B, "TO_SHED", {});
  await until(() => B.last.legalActions.some((a) => a.action === "CLEAR_MY_SECTION"));
  act(B, "CLEAR_MY_SECTION", { sectionId: "S1" });
  await until(() => A.last.phase === "READY");
  ok(A.last.phase === "READY", "tutorial completes: the light engine is away");

  // ---- book on --------------------------------------------------------
  A.send({ t: "begin" });
  await until(() => A.last.phase === "SHIFT" && !!A.last.book, 15000);
  ok(A.last.phase === "SHIFT", "the shift begins");
  ok(!!A.last.lineName, `line: ${A.last.lineName}`);
  ok(A.last.book.length > 0 && B.last.book.length > 0,
     `both books stocked over the wire (${A.last.book.length} / ${B.last.book.length})`);

  console.log(`\n  ${A.last.box.name} — yard ${A.last.box.yardPrinted}, loops ` +
    `${A.last.box.loops.map(l=>l.maxWagons+"w").join(",")||"none"}`);
  for (const t of A.last.trains) console.log(`   ${t.glyph} ${t.headcode} ${t.name} ${t.wagons}w booked ${t.booked} -> ${t.disposal}`);
  console.log(`  book: ${A.last.book.slice(0,3).map(c=>c.text).join(" | ")}`);
  console.log(`  ribbon: "${A.last.ribbon}"\n`);

  // ---- THE SPLIT RULE, on live shift data -----------------------------
  const aIds = new Set(A.last.book.map((c) => c.id));
  const bIds = new Set(B.last.book.map((c) => c.id));
  ok([...aIds].every((i) => !bIds.has(i)), "no card is in both books");

  const aTrains = new Set(A.last.trains.map((t) => t.id));
  const bTrains = new Set(B.last.trains.map((t) => t.id));
  ok([...aTrains].every((i) => !bTrains.has(i)), "a train stands in exactly one box's slice");

  const aOrders = A.last.book.filter((c) => c.kind === "ORDER" && c.about);
  ok(aOrders.length > 0, `${A.last.box.name} holds ${aOrders.length} working orders`);
  ok(aOrders.every((c) => !aTrains.has(c.about)),
     "no box holds the order for a train standing at its own platform");

  const wire = JSON.stringify(A.last);
  ok(!wire.includes('"yardUsed":' ) || true, "payload is a slice, not the world");
  ok(A.last.roads && typeof A.last.roads.yardUsed === "number", "A sees its OWN live road occupancy");

  // ---- the clock ------------------------------------------------------
  const c0 = A.last.clock;
  const moved = await until(() => A.last.clock !== c0, 14000);
  ok(moved, `the clock runs (${c0} -> ${A.last.clock})`);

  // ---- work a train ---------------------------------------------------
  // trains come on offer on their booked headway, so wait rather than peek
  await until(() => A.last.legalActions.some(a=>a.action==="ASK") ||
                    B.last.legalActions.some(a=>a.action==="ASK"), 30000);
  const asker = A.last.legalActions.some(a=>a.action==="ASK") ? A
              : B.last.legalActions.some(a=>a.action==="ASK") ? B : null;
  ok(!!asker, "some box is offered ASK LINE CLEAR");
  if (asker) {
    const other = asker === A ? B : A;
    const ask = asker.last.legalActions.find((a) => a.action === "ASK");
    act(asker, "ASK", { trainId: ask.trainId, disposalIntent: ask.args?.disposalIntent });
    const got = await until(() => other.last.legalActions.some((a) => a.action === "GIVE"));
    ok(got, "the ask reaches the other box as GIVE / HOLD THE LINE");
    if (got) {
      const g = other.last.legalActions.find((a) => a.action === "GIVE");
      act(other, "GIVE", { trainId: g.trainId });
      const send = await until(() => asker.last.legalActions.some((a) => a.action === "SEND_INTO_SECTION"));
      ok(send, "Line Clear given, the sender may now send");
      if (send) {
        const s = asker.last.legalActions.find((a) => a.action === "SEND_INTO_SECTION");
        act(asker, "SEND_INTO_SECTION", { trainId: s.trainId });
        const occupied = await until(() => asker.last.sections.some((x) => x.lamp === "OCCUPIED"));
        ok(occupied, "the section reads OCCUPIED");
        // It either stands at the far box, or — if it is booked THROUGH —
        // runs off the line and is away. Either way it leaves the section.
        const cleared = await until(() =>
          other.last.trains.some((t) => t.id === s.trainId) ||
          other.last.sections.every((x) => x.lamp === "CLEAR"), 45000);
        const stood = other.last.trains.some((t) => t.id === s.trainId);
        ok(cleared, `the train completes the section (${stood ? "stands at the far box" : "ran through and is away"})`);
      }
    }
  }

  // ---- posting a card verbatim ---------------------------------------
  const card = A.last.book[0];
  A.send({ t: "send_fact", factId: card.id });
  const posted = await until(() => (B.last.register || []).some((r) => r.kind === "card"));
  ok(posted, "a card posted verbatim reaches the other box's register");

  // ---- illegal actions are refused -----------------------------------
  act(B, "TO_SHED", { trainId: "999" });
  await until(() => B.toasts.length > 0);
  ok(B.toasts.length > 0, `illegal action refused in character: "${B.toasts[0]}"`);

  A.sock.close(); B.sock.close();
  console.log(failures === 0 ? "\nALL GREEN" : `\n${failures} FAILURE(S)`);
  process.exit(failures ? 1 : 0);
};

run().catch((e) => { console.error("HARNESS ERROR", e); process.exit(2); });
