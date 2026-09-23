/**
 * BLOCK & BELL — one track, two signal boxes.
 *
 * The server is authoritative for everything, including which buttons exist.
 * Each client receives a per-seat SLICE of the world and never a delta:
 * a box can only ever be sent what that box is allowed to know.
 */

import { newShift, sliceFor, tick, canPlace, place, shiftOver, buildReport, legalFor, applyAction } from "./shift.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPRSTUVWXYZ"; // no I, O, Q — misread on a phone

const BOX_IDS = ["DUN", "HAR", "WES", "KEL"];
const TICK_MS = 3000;    // one simulated minute every three real seconds
// At 4s a quiet stretch ran to 40 real seconds of "nothing to do"; measured
// silences are 6-10 sim minutes, so 3s keeps the worst of them under 30s.
const SECTION_MILES = 7;
const SOUTH = "DUN";
const NORTH = "HAR";

function makeCode() {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  return [...b].map((n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("");
}

function makeToken() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------- Durable Object

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY CHECK (id = 1), doc TEXT NOT NULL)"
    );
  }

  // --- persistence (never instance fields: hibernation wipes them) ---

  load() {
    const rows = [...this.sql.exec("SELECT doc FROM room WHERE id = 1")];
    return rows.length ? JSON.parse(rows[0].doc) : null;
  }

  save(state) {
    this.sql.exec(
      "INSERT INTO room (id, doc) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET doc = excluded.doc",
      JSON.stringify(state)
    );
  }

  freshState(code) {
    return {
      code,
      phase: "TUTORIAL", // TUTORIAL -> READY -> SHIFT -> REPORT
      seq: 0,
      clock: "22:40",
      paused: false,
      boxes: [
        { id: "DUN", idx: 0, name: "DUNMERE BOX", seat: null, player: null },
        { id: "HAR", idx: 1, name: "HARTLE BOX", seat: null, player: null },
      ],
      section: { id: "S1", miles: SECTION_MILES, lamp: "CLEAR", grant: null, occupiedBy: null },
      train: { id: "12", label: "12 LIGHT ENGINE", dir: "N", at: SOUTH, disposal: null },
      seats: {},
      register: [],
      shift: null,
    };
  }

  // --- fetch / upgrade ---------------------------------------------

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/init") {
      const existing = this.load();
      if (existing) return Response.json({ existed: true, code: existing.code });
      const state = this.freshState(url.searchParams.get("code") || "ROOM");
      this.save(state);
      return Response.json({ existed: false, code: state.code });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    if (!this.load()) this.save(this.freshState(url.searchParams.get("code") || "ROOM"));

    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ seatToken: null, boxId: null });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  // --- the clock ----------------------------------------------------

  async alarm() {
    const state = this.load();
    if (!state || state.phase !== "SHIFT" || !state.shift) return;

    this.recomputePause(state);
    if (!state.paused) {
      tick(state.shift);
      // release any train that has become ready to be offered
      if (shiftOver(state.shift) || state.shift.clockMin > state.shift.window + 30) {
        state.phase = "REPORT";
        this.note(state, "The shift is over. The district office wants its report.");
      }
    }
    this.broadcast(state);
    if (state.phase === "SHIFT") await this.ctx.storage.setAlarm(Date.now() + TICK_MS);
  }

  // --- messaging ----------------------------------------------------

  async webSocketMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const state = this.load();
    if (!state) return;
    const att = ws.deserializeAttachment() || {};

    if (msg.t === "hello") return this.onHello(ws, att, state, msg);
    if (msg.t === "claim_seat") return this.onClaimSeat(ws, att, state, msg);
    if (msg.t === "say") return this.onSay(ws, att, state, msg);
    if (msg.t === "ping") return this.send(ws, { t: "pong", at: msg.at });
    if (msg.t === "begin") return this.onBegin(ws, att, state);
    if (msg.t === "send_fact") return this.onSendFact(ws, att, state, msg);
    if (msg.t === "view_box") return this.onViewBox(ws, att, state, msg);
    if (msg.t === "act") {
      return state.phase === "SHIFT"
        ? this.onShiftAct(ws, att, state, msg)
        : this.onTutorialAct(ws, att, state, msg);
    }
  }

  /**
   * WORKING BOTH BOXES.
   *
   * A judge who opens the link alone at two in the morning must find a game,
   * not a lobby. So a seated signaller may also work any box nobody is in —
   * switching between them — and the Notice records that they worked two desks.
   */
  viewBoxOf(state, att) {
    const seat = state.seats[att.seatToken];
    if (!seat) return null;
    const want = seat.viewBox || seat.boxId;
    const box = state.boxes.find((b) => b.id === want);
    if (!box) return seat.boxId;
    const mine = want === seat.boxId;
    return mine || !this.isManned(state, want) ? want : seat.boxId;
  }

  soloBoxes(state, att) {
    const seat = state.seats[att.seatToken];
    if (!seat) return [];
    return state.boxes
      .filter((b) => b.id === seat.boxId || !this.isManned(state, b.id))
      .map((b) => ({ id: b.id, name: b.name, viewing: b.id === this.viewBoxOf(state, att) }));
  }

  onViewBox(ws, att, state, msg) {
    const seat = state.seats[att.seatToken];
    if (!seat) return;
    const box = state.boxes.find((b) => b.id === msg.boxId);
    if (!box) return;
    if (box.id !== seat.boxId && this.isManned(state, box.id)) {
      return this.toast(ws, "Somebody is working that box.");
    }
    seat.viewBox = box.id;
    ws.serializeAttachment({ seatToken: att.seatToken, boxId: box.id });
    this.broadcast(state);
  }

  onHello(ws, att, state, msg) {
    let seatToken = msg.resumeToken;
    let seat = seatToken ? state.seats[seatToken] : null;
    if (!seat) seatToken = makeToken();

    const boxId = seat ? seat.boxId : null;
    ws.serializeAttachment({ seatToken, boxId });
    if (seat) {
      seat.lastSeen = Date.now();
      const box = state.boxes.find((b) => b.id === seat.boxId);
      if (box) box.seat = seatToken;
    }

    this.send(ws, {
      t: "hello_ack", v: 1, roomCode: state.code, seatToken, boxId, phase: state.phase,
    });
    this.recomputePause(state);
    this.broadcast(state);
  }

  onClaimSeat(ws, att, state, msg) {
    const box = state.boxes.find((b) => b.id === msg.boxId);
    if (!box) return;
    if (box.seat && box.seat !== att.seatToken && this.isManned(state, box.id)) {
      return this.toast(ws, "That box is already worked. Take the other one.");
    }
    for (const b of state.boxes) if (b.seat === att.seatToken) b.seat = null;

    box.seat = att.seatToken;
    box.player = String(msg.name || "").trim().slice(0, 24) || "Signaller";
    state.seats[att.seatToken] = { boxId: box.id, name: box.player, lastSeen: Date.now() };
    ws.serializeAttachment({ seatToken: att.seatToken, boxId: box.id });

    this.note(state, `${box.player} has the duty at ${box.name}.`);
    this.recomputePause(state);
    this.broadcast(state);
  }

  onSay(ws, att, state, msg) {
    if (!this.viewBoxOf(state, att)) return;
    const text = String(msg.text || "").slice(0, 240).trim();
    if (!text) return;
    const box = state.boxes.find((b) => b.id === this.viewBoxOf(state, att));
    state.register.push({ kind: "say", from: box.player || box.name, boxId: box.id, text });
    this.broadcast(state);
  }

  /** Post a card VERBATIM. You may not paraphrase what you have not read. */
  onSendFact(ws, att, state, msg) {
    const viewing = this.viewBoxOf(state, att);
    if (state.phase !== "SHIFT" || !viewing) return;
    const idx = state.boxes.findIndex((b) => b.id === viewing);
    const fact = state.shift.facts.find((f) => f.id === msg.factId && f.heldBy === idx);
    if (!fact) return this.toast(ws, "That card is not in your book.");
    if ((fact.knownFrom ?? 0) > state.shift.clockMin) return;

    const box = state.boxes[idx];
    const slice = sliceFor(state.shift, idx);
    const card = slice.book.find((c) => c.id === fact.id);
    fact.posted = true;
    state.register.push({
      kind: "card", from: box.player || box.name, boxId: box.id,
      text: card ? card.text : "(card)",
    });
    this.broadcast(state);
  }

  onBegin(ws, att, state) {
    if (state.phase !== "READY") return;
    const manned = state.boxes.filter((b) => this.isManned(state, b.id)).length;
    state.shift = newShift(state.code, 1, 2);
    if (!state.shift) return this.toast(ws, "The district office could not raise a shift. Try again.");
    state.phase = "SHIFT";
    this.note(state, `Booking on — ${state.shift.lineName}. ${manned} of 2 boxes manned.`);
    this.broadcast(state);
    this.ctx.storage.setAlarm(Date.now() + TICK_MS);
  }

  // --- the tutorial block cycle -------------------------------------

  onTutorialAct(ws, att, state, msg) {
    const viewing = this.viewBoxOf(state, att);
    if (!viewing) return this.toast(ws, "Take a box first.");
    const legal = this.tutorialLegal(state, viewing).map((a) => a.action);
    if (!legal.includes(msg.action)) return this.toast(ws, "Not yours to do, not just now.");

    const s = state.section, t = state.train;
    const me = state.boxes.find((b) => b.id === viewing);
    const who = me.player || me.name;

    if (msg.action === "ASK") {
      s.grant = { from: viewing, disposalIntent: msg.args?.disposalIntent, acceptedDisposal: null };
      this.note(state, `${who} asks Line Clear for the ${t.label}.`);
    } else if (msg.action === "GIVE") {
      s.grant.acceptedDisposal = msg.args?.acceptedDisposal || s.grant.disposalIntent;
      s.lamp = "GIVEN";
      this.note(state, `${who} gives Line Clear.`);
    } else if (msg.action === "SEND_INTO_SECTION") {
      if (s.occupiedBy) return this.toast(ws, "There is already a train in that section.");
      s.occupiedBy = t.id; s.lamp = "OCCUPIED"; t.at = NORTH;
      this.note(state, `${who} sends the ${t.label} into the section.`);
    } else if (msg.action === "TO_SHED") {
      t.disposal = "SHED";
      this.note(state, `${who} puts the ${t.label} to the shed.`);
    } else if (msg.action === "CLEAR_MY_SECTION") {
      s.occupiedBy = null; s.lamp = "CLEAR"; s.grant = null;
      state.phase = "READY";
      this.note(state, `${who} clears the section. The light engine is away.`);
    }
    this.broadcast(state);
  }

  tutorialLegal(state, boxId) {
    if (state.phase !== "TUTORIAL" || state.paused) return [];
    const s = state.section, t = state.train;
    if (t.at === SOUTH && !s.grant && boxId === SOUTH)
      return [{ action: "ASK", label: "ASK", hint: "Tap this. You do not have to type.",
                args: { sectionId: s.id, disposalIntent: "SHED" } }];
    if (s.grant && !s.grant.acceptedDisposal && boxId === NORTH)
      return [{ action: "GIVE", label: "GIVE LINE CLEAR", hint: "Your section is clear — say yes.",
                args: { sectionId: s.id, acceptedDisposal: "SHED" } }];
    if (s.lamp === "GIVEN" && boxId === SOUTH)
      return [{ action: "SEND_INTO_SECTION", label: "SEND INTO SECTION",
                hint: "Hartle can take it. Send it.", args: { sectionId: s.id } }];
    if (s.lamp === "OCCUPIED" && t.at === NORTH && !t.disposal && boxId === NORTH)
      return [{ action: "TO_SHED", label: "TO THE SHED", hint: "Put it somewhere.", args: {} }];
    if (s.lamp === "OCCUPIED" && t.disposal && boxId === NORTH)
      return [{ action: "CLEAR_MY_SECTION", label: "CLEAR MY SECTION",
                hint: "Tell Dunmere the section is clear.", args: { sectionId: s.id } }];
    return [];
  }

  // --- the real shift ------------------------------------------------

  onShiftAct(ws, att, state, msg) {
    const viewing = this.viewBoxOf(state, att);
    if (!viewing) return this.toast(ws, "Take a box first.");
    const idx = state.boxes.findIndex((b) => b.id === viewing);
    const sh = state.shift;
    const legal = this.shiftLegal(state, idx);
    const match = legal.find((a) => a.action === msg.action && a.trainId === msg.args?.trainId);
    if (!match) return this.toast(ws, "Not yours to do, not just now.");

    const me = state.boxes[idx];
    const who = me.player || me.name;
    const t = sh.trains.find((x) => x.id === msg.args.trainId);
    const sec = sh.sections[0];

    const line = applyAction(sh, idx, msg.action, msg.args, who);
    if (line) this.note(state, line);

    if (shiftOver(sh)) {
      state.phase = "REPORT";
      this.note(state, "Every working is away. That is the shift.");
    }
    this.broadcast(state);
  }

  /** The server authors the buttons; the logic itself lives in shift.js. */
  shiftLegal(state, idx) {
    if (state.phase !== "SHIFT") return [];
    return legalFor(state.shift, idx, { paused: state.paused });
  }

  ribbon(state, boxId) {
    if (state.paused) {
      const gone = state.boxes.find((b) => b.seat && !this.isManned(state, b.id));
      return gone ? `WAITING FOR ${gone.name.split(" ")[0]}` : "WAITING";
    }
    if (state.phase === "READY")
      return "The light engine is away. That was the whole job — and you did it to each other.";
    if (state.phase === "REPORT") return "The shift is over.";

    if (state.phase === "SHIFT") {
      const idx = state.boxes.findIndex((b) => b.id === boxId);
      const legal = this.shiftLegal(state, idx);
      const sec = state.shift.sections[0];
      if (sec.grant && !sec.grant.given && sec.grant.from !== idx)
        return "Your neighbour is asking for the road. Can you take it?";
      if (legal.some((a) => a.action === "SEND_INTO_SECTION")) return "Line Clear given. Send it.";

      if (legal.length === 0) {
        // A crossing takes a few minutes and neither box has a lever to pull.
        // That is the time the book is FOR, so say so specifically rather than
        // printing "nothing to do" and letting the screen look broken.
        const slice = sliceFor(state.shift, idx);
        const unposted = slice.book.filter((c) => !c.posted).length;
        const train = state.shift.trains.find((t) => t.id === sec.occupiedBy);
        const where = train ? `The ${train.headcode} ${train.name} is in the section` : "The section is busy";
        if (unposted > 0) {
          return `${where}. ${unposted} thing${unposted === 1 ? "" : "s"} in your book your neighbour cannot see.`;
        }
        return `${where}. Nothing for you to do but watch it.`;
      }
      const first = legal[0];
      return `${first.train} is at your box. ${first.hint ?? "Deal with it."}`;
    }

    // tutorial
    const s = state.section, t = state.train, south = boxId === SOUTH;
    if (t.at === SOUTH && !s.grant)
      return south ? "The light engine wants to go north. Ask Hartle if they can take it."
                   : "Nothing yet. Dunmere is about to ask you.";
    if (s.grant && !s.grant.acceptedDisposal)
      return south ? "Asked. Wait for Hartle."
                   : "Dunmere is asking for the 12 Light Engine. Your section is clear — say yes.";
    if (s.lamp === "GIVEN") return south ? "Hartle can take it. Send it." : "Given. It is coming.";
    if (s.lamp === "OCCUPIED" && !t.disposal)
      return south ? "In the section. Nothing else may enter."
                   : "It is in. Seven miles. Put it somewhere when it gets here.";
    if (s.lamp === "OCCUPIED" && t.disposal)
      return south ? "In the section. Nothing else may enter."
                   : "Tell Dunmere the section is clear or nothing else can move.";
    return "";
  }

  // --- per-seat slice -------------------------------------------------

  snapshot(state, boxId) {
    const me = state.boxes.find((b) => b.id === boxId) || null;
    const idx = me ? state.boxes.indexOf(me) : -1;

    const base = {
      t: "snapshot", seq: state.seq, phase: state.phase, code: state.code,
      paused: state.paused,
      you: me ? { boxId: me.id, boxName: me.name, name: me.player } : { boxId: null },
      boxes: state.boxes.map((b) => ({
        id: b.id, name: b.name, manned: this.isManned(state, b.id),
        player: b.player, you: !!me && b.id === me.id,
      })),
      ribbon: this.ribbon(state, boxId),
      register: state.register.slice(-40),
    };

    if (state.phase === "SHIFT" || state.phase === "REPORT") {
      if (!me) return { ...base, clock: state.shift?.startClock ?? state.clock, waiting: true };
      const slice = sliceFor(state.shift, idx);
      return {
        ...base,
        clock: slice.clock,
        lineName: slice.lineName,
        box: slice.box,
        roads: slice.roads,
        trains: slice.trains,
        sections: slice.sections,
        book: slice.book,
        delay: slice.delay,
        legalActions: this.shiftLegal(state, idx),
        report: state.phase === "REPORT"
          ? buildReport(state.shift, state.register, state.boxes.map((b) => b.player || b.name))
          : null,
      };
    }

    // tutorial / lobby
    const s = state.section;
    const other = state.boxes.find((b) => b.id !== boxId) || null;
    const t = state.train;
    return {
      ...base,
      clock: state.clock,
      section: other ? {
        id: s.id, to: other.name, miles: s.miles, lamp: s.lamp,
        asked: !!s.grant, occupied: !!s.occupiedBy,
      } : null,
      trains: me && t.at === me.id
        ? [{ id: t.id, headcode: "12", name: "LIGHT ENGINE", disposal: t.disposal }]
        : [],
      legalActions: me ? this.tutorialLegal(state, me.id) : [],
    };
  }

  broadcast(state) {
    state.seq += 1;
    if (state.register.length > 200) state.register = state.register.slice(-200);
    this.save(state);
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() || {};
      const viewing = att.seatToken ? this.viewBoxOf(state, att) : att.boxId;
      const snap = this.snapshot(state, viewing);
      const desks = att.seatToken ? this.soloBoxes(state, att) : [];
      this.send(ws, desks.length > 1 ? { ...snap, desks } : snap);
    }
  }

  send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch {} }
  toast(ws, text) { this.send(ws, { t: "toast", text }); }
  note(state, text) { state.register.push({ kind: "note", text }); }

  isManned(state, boxId) {
    const box = state.boxes.find((b) => b.id === boxId);
    if (!box || !box.seat) return false;
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() || {};
      if (att.seatToken === box.seat) return true;
    }
    return false;
  }

  async webSocketClose() {
    const state = this.load();
    if (!state) return;
    this.recomputePause(state);
    this.broadcast(state);
  }
  async webSocketError() { return this.webSocketClose(); }

  recomputePause(state) {
    const seated = state.boxes.filter((b) => b.seat);
    state.paused = seated.length > 0 && !seated.every((b) => this.isManned(state, b.id));
  }
}

// ---------------------------------------------------------------- Worker

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/create") {
      for (let i = 0; i < 6; i++) {
        const code = makeCode();
        const stub = env.ROOM.get(env.ROOM.idFromName(code));
        const res = await stub.fetch(new Request(`https://do/init?code=${code}`));
        const body = await res.json();
        if (!body.existed) return Response.json({ code });
      }
      return Response.json({ error: "could not allocate a code" }, { status: 503 });
    }

    if (url.pathname === "/api/ws") {
      const code = (url.searchParams.get("room") || "").toUpperCase();
      if (!/^[A-Z]{4}$/.test(code)) return new Response("bad room code", { status: 400 });
      const stub = env.ROOM.get(env.ROOM.idFromName(code));
      return stub.fetch(new Request(`https://do/ws?code=${code}`, { headers: request.headers }));
    }

    return env.ASSETS.fetch(request);
  },
};
