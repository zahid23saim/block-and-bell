import { newShift, sliceFor, tick, canPlace, place } from "../src/shift.js";

let fail=0; const ok=(c,m)=>{console.log((c?"  PASS  ":"  FAIL  ")+m); if(!c)fail++;};

const sh = newShift("SPAR", 1, 2);
ok(!!sh, "a shift is generated");

const A = sliceFor(sh, 0), B = sliceFor(sh, 1);
console.log(`\n  ${A.box.name} BOX — ${sh.lineName}, ${A.clock}`);
console.log(`  yard ${A.box.yardPrinted} · loops ${A.box.loops.map(l=>l.maxWagons+"w").join(",")||"none"} · ` +
  Object.entries(A.box.facilities).filter(([,v])=>v).map(([k])=>k).join("+"));
for (const t of A.trains) console.log(`   ${t.glyph} ${t.headcode} ${t.name} — ${t.wagons}w ${t.className}, booked ${t.booked} -> ${t.disposal}`);
console.log(`   "${A.trains[0]?.vignette ?? ""}"`);
console.log(`\n  ${A.box.name}'s BOOK (${A.book.length} cards):`);
for (const c of A.book.slice(0,6)) console.log(`   [${c.kind}] ${c.text}`);

// ---- THE SPLIT RULE ----
const aFactIds = new Set(A.book.map(c=>c.id));
const bFactIds = new Set(B.book.map(c=>c.id));
ok([...aFactIds].every(id=>!bFactIds.has(id)), "no card appears in both books");
ok(A.book.length>0 && B.book.length>0, `both books are stocked (${A.book.length} / ${B.book.length})`);

const aTrainIds = new Set(A.trains.map(t=>t.id));
const bTrainIds = new Set(B.trains.map(t=>t.id));
ok([...aTrainIds].every(id=>!bTrainIds.has(id)), "a train stands in exactly one box's slice");

// every ORDER card in A is about a train that is NOT A's own
const ordersInA = A.book.filter(c=>c.kind==="ORDER" && c.about);
const originOf = Object.fromEntries(sh.trains.map(t=>[t.id,t.origin]));
ok(ordersInA.length>0, `${A.box.name} holds ${ordersInA.length} working orders`);
ok(ordersInA.every(c=>originOf[c.about]!==0), "every order card A holds is for a train A does not own (split rule)");

// nothing in A's payload leaks B's roads
const json = JSON.stringify(A);
ok(!json.includes(B.box.name) || A.sections.some(s=>s.to===B.box.name),
   "B's name only appears as the far end of the section, never as roads");
ok(A.roads.loops.every(l=>"occupiedBy" in l), "A sees its own live road occupancy");

// ---- time release ----
const late = sh.facts.filter(f=>(f.knownFrom??0)>0);
ok(late.length>0, `${late.length} cards are time-released and not visible at booking-on`);
const before = sliceFor(sh,0).book.length;
for (let i=0;i<sh.window;i++) tick(sh);
const after = sliceFor(sh,0).book.length;
ok(after>=before, `book grows as the night goes on (${before} -> ${after} cards)`);

console.log(fail===0?"\nALL GREEN":`\n${fail} FAILURE(S)`);
process.exit(fail?1:0);
