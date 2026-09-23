/**
 * BLOCK & BELL — one track, two signal boxes.
 *
 * The server is authoritative for everything, including which buttons exist.
 * Each client receives a per-seat SLICE of the world and never a delta:
 * a box can only ever be sent what that box is allowed to know.
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPRSTUVWXYZ"; // no I, O, Q — misread on a phone

const BOX_DEFS = [
  { id: "DUN", name: "DUNMERE BOX" },
  { id: "HAR", name: "HARTLE BOX" },
];

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

  // --- persistence ------------------------------------------------
  // State lives in SQLite, never in instance fields: hibernation wipes fields.

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
      phase: "TUTORIAL", // TUTORIAL -> READY
      seq: 0,
      clock: "22:40",
      paused: false,
      boxes: BOX_DEFS.map((b) => ({ ...b, seat: null, player: null })),
      section: {
        id: "S1",
        miles: SECTION_MILES,
        lamp: "CLEAR", // CLEAR | GIVEN | OCCUPIED
        grant: null,
        occupiedBy: null,
      },
      // The light engine: no orders, no deadline, cannot be got wrong.
      train: { id: "12", label: "12 LIGHT ENGINE", dir: "N", at: SOUTH, disposal: null },
      seats: {},
      register: [],
    };
  }

  // --- fetch / upgrade --------------------------------------------

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

    if (!this.load()) {
      this.save(this.freshState(url.searchParams.get("code") || "ROOM"));
    }

    const pair = new WebSocketPair();
    // Hibernation: the DO may be evicted between messages and keep its sockets.
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ seatToken: null, boxId: null });

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  // --- messaging ---------------------------------------------------

  async webSocketMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const state = this.load();
    if (!state) return;
    const att = ws.deserializeAttachment() || {};

    if (msg.t === "hello") return this.onHello(ws, att, state, msg);
    if (msg.t === "claim_seat") return this.onClaimSeat(ws, att, state, msg);
    if (msg.t === "act") return this.onAct(ws, att, state, msg);
    if (msg.t === "say") return this.onSay(ws, att, state, msg);
    if (msg.t === "ping") return this.send(ws, { t: "pong", at: msg.at });
  }

  onHello(ws, att, state, msg) {
    // A reload is just a re-hello. The resume token IS the seat.
    let seatToken = msg.resumeToken;
    let seat = seatToken ? state.seats[seatToken] : null;
    if (!seat) seatToken = makeToken();

    const boxId = seat ? seat.boxId : null;
    ws.serializeAttachment({ seatToken, boxId });

    if (seat) {
      seat.lastSeen = Date.now();
      // reattach the token to its box after a reload
      const box = state.boxes.find((b) => b.id === seat.boxId);
      if (box) box.seat = seatToken;
    }

    this.send(ws, {
      t: "hello_ack",
      v: 1,
      roomCode: state.code,
      seatToken,
      boxId,
      phase: state.phase,
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
    if (!att.boxId) return;
    const text = String(msg.text || "").slice(0, 240).trim();
    if (!text) return;
    const box = state.boxes.find((b) => b.id === att.boxId);
    state.register.push({ kind: "say", from: box.player || box.name, boxId: box.id, text });
    this.broadcast(state);
  }

  // --- the block cycle --------------------------------------------

  onAct(ws, att, state, msg) {
    if (!att.boxId) return this.toast(ws, "Take a box first.");

    const legal = this.legalActions(state, att.boxId).map((a) => a.action);
    if (!legal.includes(msg.action)) {
      return this.toast(ws, "Not yours to do, not just now.");
    }

    const s = state.section;
    const t = state.train;
    const me = state.boxes.find((b) => b.id === att.boxId);
    const who = me.player || me.name;
    const args = msg.args || {};

    if (msg.action === "ASK") {
      // TWO KEYS: you may not ask without naming where the train is going.
      s.grant = { from: att.boxId, disposalIntent: args.disposalIntent, acceptedDisposal: null };
      this.note(state, `${who} asks Line Clear for the ${t.label}.`);
    } else if (msg.action === "GIVE") {
      s.grant.acceptedDisposal = args.acceptedDisposal || s.grant.disposalIntent;
      s.lamp = "GIVEN";
      this.note(state, `${who} gives Line Clear.`);
    } else if (msg.action === "SEND_INTO_SECTION") {
      // compare-and-set: the section physically cannot hold two trains
      if (s.occupiedBy) return this.toast(ws, "There is already a train in that section.");
      s.occupiedBy = t.id;
      s.lamp = "OCCUPIED";
      t.at = NORTH;
      this.note(state, `${who} sends the ${t.label} into the section.`);
    } else if (msg.action === "TO_SHED") {
      t.disposal = "SHED";
      this.note(state, `${who} puts the ${t.label} to the shed.`);
    } else if (msg.action === "CLEAR_MY_SECTION") {
      s.occupiedBy = null;
      s.lamp = "CLEAR";
      s.grant = null;
      state.phase = "READY";
      this.note(state, `${who} clears the section. The light engine is away.`);
    }

    this.broadcast(state);
  }

  /** The server authors the buttons. The client renders exactly what it is given. */
  legalActions(state, boxId) {
    if (state.phase !== "TUTORIAL" || state.paused) return [];
    const s = state.section;
    const t = state.train;

    if (t.at === SOUTH && !s.grant && boxId === SOUTH) {
      return [{ action: "ASK", label: "ASK", hint: "Tap this. You do not have to type.",
                args: { sectionId: s.id, disposalIntent: "SHED" } }];
    }
    if (s.grant && !s.grant.acceptedDisposal && boxId === NORTH) {
      return [{ action: "GIVE", label: "GIVE LINE CLEAR", hint: "Your section is clear — say yes.",
                args: { sectionId: s.id, acceptedDisposal: "SHED" } }];
    }
    if (s.lamp === "GIVEN" && boxId === SOUTH) {
      return [{ action: "SEND_INTO_SECTION", label: "SEND INTO SECTION",
                hint: "Hartle can take it. Send it.", args: { sectionId: s.id } }];
    }
    if (s.lamp === "OCCUPIED" && t.at === NORTH && !t.disposal && boxId === NORTH) {
      return [{ action: "TO_SHED", label: "TO THE SHED", hint: "Put it somewhere.", args: {} }];
    }
    if (s.lamp === "OCCUPIED" && t.disposal && boxId === NORTH) {
      return [{ action: "CLEAR_MY_SECTION", label: "CLEAR MY SECTION",
                hint: "Tell Dunmere the section is clear.", args: { sectionId: s.id } }];
    }
    return [];
  }

  /** The ribbon never blames, never says "wire down", never uses an unglossed term. */
  ribbon(state, boxId) {
    if (state.paused) {
      const gone = state.boxes.find((b) => b.seat && !this.isManned(state, b.id));
      return gone ? `WAITING FOR ${gone.name.split(" ")[0]}` : "WAITING";
    }
    if (state.phase === "READY") {
      return "The light engine is away. That was the whole job — and you did it to each other.";
    }

    const s = state.section;
    const t = state.train;
    const south = boxId === SOUTH;

    if (t.at === SOUTH && !s.grant) {
      return south
        ? "The light engine wants to go north. Ask Hartle if they can take it."
        : "Nothing yet. Dunmere is about to ask you.";
    }
    if (s.grant && !s.grant.acceptedDisposal) {
      return south
        ? "Asked. Wait for Hartle."
        : "Dunmere is asking for the 12 Light Engine. Your section is clear — say yes.";
    }
    if (s.lamp === "GIVEN") {
      return south ? "Hartle can take it. Send it." : "Given. It is coming.";
    }
    if (s.lamp === "OCCUPIED" && !t.disposal) {
      return south
        ? "In the section. Nothing else may enter."
        : "It is in. Seven miles. Put it somewhere when it gets here.";
    }
    if (s.lamp === "OCCUPIED" && t.disposal) {
      return south
        ? "In the section. Nothing else may enter."
        : "Tell Dunmere the section is clear or nothing else can move.";
    }
    return "";
  }

  // --- per-seat slice ----------------------------------------------

  /**
   * THE SPLIT RULE, enforced at the wire.
   * A box is sent its own trains in full and the neighbour's only as a lamp.
   * Nothing a box may not know ever leaves the server.
   */
  snapshot(state, boxId) {
    const s = state.section;
    const t = state.train;
    const me = state.boxes.find((b) => b.id === boxId) || null;
    const other = state.boxes.find((b) => b.id !== boxId) || null;

    const mine = [];
    if (me && t.at === me.id) {
      mine.push({ id: t.id, label: t.label, dir: t.dir, disposal: t.disposal });
    }

    return {
      t: "snapshot",
      seq: state.seq,
      phase: state.phase,
      clock: state.clock,
      paused: state.paused,
      code: state.code,
      you: me ? { boxId: me.id, boxName: me.name, name: me.player } : { boxId: null },
      boxes: state.boxes.map((b) => ({
        id: b.id,
        name: b.name,
        manned: this.isManned(state, b.id),
        player: b.player,
        you: !!me && b.id === me.id,
      })),
      section: other
        ? {
            id: s.id,
            to: other.name,
            miles: s.miles,
            lamp: s.lamp,
            // the neighbour's grant reaches you as a lamp, never as their reasoning
            asked: !!s.grant,
            occupied: !!s.occupiedBy,
          }
        : null,
      trains: mine,
      ribbon: this.ribbon(state, boxId),
      legalActions: me ? this.legalActions(state, me.id) : [],
      register: state.register.slice(-40),
    };
  }

  broadcast(state) {
    state.seq += 1;
    if (state.register.length > 200) state.register = state.register.slice(-200);
    this.save(state);
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() || {};
      this.send(ws, this.snapshot(state, att.boxId));
    }
  }

  send(ws, obj) {
    try {
      ws.send(JSON.stringify(obj));
    } catch {
      /* socket going away; the next hello heals it */
    }
  }

  toast(ws, text) {
    this.send(ws, { t: "toast", text });
  }

  note(state, text) {
    state.register.push({ kind: "note", text });
  }

  isManned(state, boxId) {
    const box = state.boxes.find((b) => b.id === boxId);
    if (!box || !box.seat) return false;
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() || {};
      if (att.seatToken === box.seat) return true;
    }
    return false;
  }

  // A dropped socket pauses the clock. It never blames the player who left.
  async webSocketClose() {
    const state = this.load();
    if (!state) return;
    this.recomputePause(state);
    this.broadcast(state);
  }

  async webSocketError() {
    return this.webSocketClose();
  }

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
      return stub.fetch(
        new Request(`https://do/ws?code=${code}`, { headers: request.headers })
      );
    }

    return env.ASSETS.fetch(request);
  },
};
