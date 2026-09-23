/**
 * BLOCK & BELL — the content tables.
 *
 * Authored as data, in one voice: a working signalman's register at night in
 * 1897. Notices are TEMPLATES; the generator substitutes {BOX} {TIME} {TRAIN}
 * {WAGONS} {LOOP} {MILES} {SECTION} {OTHERBOX} {CLASS}.
 */

export const TABLES = {
  "identities": {
    "trains": [
      {
        "headcode": "4-B",
        "name": "FISH",
        "flavour": "Off the night boat. Late fish is worthless fish."
      },
      {
        "headcode": "M2",
        "name": "NIGHT MAIL",
        "flavour": "Timed to the minute. They write letters about held mail."
      },
      {
        "headcode": "231",
        "name": "THE 8.05 DOWN",
        "flavour": "Half the village aboard. Every stop gets noticed."
      },
      {
        "headcode": "9-F",
        "name": "BALLAST",
        "flavour": "Stone for the track gangs. Crawls, stops where it pleases."
      },
      {
        "headcode": "K7",
        "name": "MILK",
        "flavour": "Churns for the morning. Sour milk comes back as complaints."
      },
      {
        "headcode": "606",
        "name": "EMPTIES",
        "flavour": "Empty wagons going back to the pit. In no hurry."
      },
      {
        "headcode": "L1",
        "name": "LIGHT ENGINE",
        "flavour": "Engine alone, no train. Tuck it anywhere and forget it."
      },
      {
        "headcode": "88",
        "name": "THE QUARRY",
        "flavour": "Loaded to the springs. Slow to start, slower to stop."
      },
      {
        "headcode": "A3",
        "name": "CATTLE",
        "flavour": "Beasts stood in the dark. Long waits tell on them."
      },
      {
        "headcode": "64",
        "name": "THE PARLIAMENTARY",
        "flavour": "Cheap fares, every station. Slow, but the law says it runs."
      },
      {
        "headcode": "3-D",
        "name": "PAPERS",
        "flavour": "Morning editions. Worthless by breakfast if we hold them."
      },
      {
        "headcode": "S4",
        "name": "SHUNTER",
        "flavour": "Works the yard. Wanders out without warning. Watch it."
      },
      {
        "headcode": "17",
        "name": "THE MARKET",
        "flavour": "Traders and crates. Misses the market, misses the day."
      },
      {
        "headcode": "G8",
        "name": "THE STONE",
        "flavour": "Stone for the track gangs. Tipped where the ganger points."
      },
      {
        "headcode": "460",
        "name": "THE RELIEF",
        "flavour": "Second train on the same timing. The first one filled."
      },
      {
        "headcode": "W4",
        "name": "SLEEPERS",
        "flavour": "New sleepers for the relayers. Long loads, and in no hurry."
      },
      {
        "headcode": "T5",
        "name": "THE BOAT",
        "flavour": "Passengers for the steamer. The tide will not wait."
      },
      {
        "headcode": "512",
        "name": "THE LONG DRAG",
        "flavour": "Forty wagons of nothing urgent. Takes an age to pass."
      },
      {
        "headcode": "6-J",
        "name": "PIGEONS",
        "flavour": "Baskets to be released at dawn. Early, or not at all."
      },
      {
        "headcode": "305",
        "name": "THE 9.40 UP",
        "flavour": "Stops everywhere. Two passengers and a guard, most nights."
      },
      {
        "headcode": "H2",
        "name": "EXCURSION",
        "flavour": "Day trippers, extra coaches. Nobody warned us before this morning."
      },
      {
        "headcode": "X9",
        "name": "THE PILOT",
        "flavour": "Running light to fetch the breakdown vans. Everything else waits."
      },
      {
        "headcode": "2-C",
        "name": "COAL",
        "flavour": "Loaded for the gasworks. Heavy, patient, in no hurry."
      },
      {
        "headcode": "780",
        "name": "MEAT",
        "flavour": "Chilled vans off the docks. Warm meat is ruined meat."
      }
    ],
    "classes": [
      {
        "id": "EXPRESS_PASSENGER",
        "label": "Express passenger",
        "glyph": "»",
        "gloss": "A fast train full of people that stops almost nowhere, so clear the road ahead of it and hold everything else back.",
        "typicalWagons": [
          6,
          7,
          8
        ],
        "perishable": false,
        "priorityHint": 5
      },
      {
        "id": "STOPPING_PASSENGER",
        "label": "Stopping passenger",
        "glyph": "›",
        "gloss": "Calls at every platform, so it is slow and often in the way, but people are standing about waiting for it, so do not leave it parked all night.",
        "typicalWagons": [
          3,
          4,
          5
        ],
        "perishable": false,
        "priorityHint": 3
      },
      {
        "id": "MAIL",
        "label": "Mail",
        "glyph": "◆",
        "gloss": "Post vans running to a fixed timing; every minute you hold it is post that misses its connection at the far end, so give it a clear run.",
        "typicalWagons": [
          4,
          5,
          6
        ],
        "perishable": true,
        "priorityHint": 4
      },
      {
        "id": "MILK",
        "label": "Milk",
        "glyph": "○",
        "gloss": "Churns for the town's breakfast; the milk turns if it sits in a siding, so pass it on rather than stabling it.",
        "typicalWagons": [
          8,
          10,
          12
        ],
        "perishable": true,
        "priorityHint": 4
      },
      {
        "id": "EXPRESS_FREIGHT",
        "label": "Express freight",
        "glyph": "▸",
        "gloss": "Goods that spoil — fish, meat, fruit — run at passenger speed, so handle it like a passenger train and not like an ordinary goods.",
        "typicalWagons": [
          10,
          12,
          14
        ],
        "perishable": true,
        "priorityHint": 4
      },
      {
        "id": "BALLAST",
        "label": "Ballast",
        "glyph": "▬",
        "gloss": "Stone for repairing the track; it crawls and stops wherever the gang is working, so give it a long empty stretch instead of a tight gap.",
        "typicalWagons": [
          16,
          18,
          20
        ],
        "perishable": false,
        "priorityHint": 2
      },
      {
        "id": "COAL_EMPTIES",
        "label": "Coal empties",
        "glyph": "□",
        "gloss": "Empty wagons going back to the pit with nothing aboard worth hurrying, so this is the train to shunt into a loop when something better wants the line.",
        "typicalWagons": [
          24,
          28,
          32
        ],
        "perishable": false,
        "priorityHint": 1
      },
      {
        "id": "LIGHT_ENGINE",
        "label": "Light engine",
        "glyph": "•",
        "gloss": "An engine running on its own with no wagons behind it: short, quick and easy to move, so use it to fill the gaps nothing else fits.",
        "typicalWagons": [
          0
        ],
        "perishable": false,
        "priorityHint": 1
      }
    ]
  },
  "places": {
    "boxNames": [
      "ABBOTSCROSS",
      "ACRELEIGH",
      "ADDERCOMBE",
      "AINSTOKE",
      "ALDGRAVE",
      "AMBERDEN",
      "ARKWELL",
      "ASHFORD SIDINGS",
      "BAINTHORPE",
      "BECKSTONE",
      "BIRCHANGER",
      "BLACKWATER JUNCTION",
      "BOWDEN HEATH",
      "BRAMBLEHOW",
      "BUCKLAND ROAD",
      "CALDERBANK",
      "CARNFORTH GATE",
      "CHELLOW",
      "CLAYBURN",
      "COLDHARBOUR",
      "CRANHOLT",
      "CULVERTON",
      "DALEFOOT",
      "DENBROOK",
      "DUNMERE",
      "EASTHOPE",
      "EDGWORTH",
      "ELMSTEAD",
      "FARNDALE",
      "FENWICK",
      "FLAXBY",
      "FORDHAM LANE",
      "GARSDYKE",
      "GLENTHORNE",
      "GRIMSHAW",
      "HALLOWFIELD",
      "HARBURY",
      "HETHERSETT",
      "HIGHMOOR",
      "HOLLINGROVE",
      "IRONBRIDGE",
      "KEMBLE",
      "KIRKSTALL",
      "LANGCLIFFE",
      "LEAHURST",
      "LOWTHER",
      "MARCHWOOD",
      "MELDRUM",
      "MIDGEHOLME",
      "NORBRECK",
      "ORMSKIRK",
      "PENRUDDOCK",
      "PILLING",
      "RAINHAM",
      "REDMIRE",
      "RIVELIN",
      "ROWDITCH",
      "RUFFORD",
      "SALTMARSH",
      "STOKENCHURCH"
    ],
    "lineNames": [
      "the Hawksmere branch",
      "the Nettlebed loop",
      "the Warkley line",
      "the Stanhope curve",
      "the Coldrake spur",
      "the Merrowfield branch",
      "the Threpton loop",
      "the Vane Hill line",
      "the Ivybridge chord",
      "the Yarlet cut-off",
      "the Duddon bank",
      "the Whinfell incline",
      "the Talbourne branch",
      "the Pennard loop",
      "the Oxhey line",
      "the Ghyllwood spur",
      "the Marle Green branch",
      "the Sedgerow curve"
    ]
  },
  "notices": {
    "facilityNotices": [
      {
        "id": "fac01",
        "need": "WATER",
        "template": "Water column at {BOX} frozen. Out of use until {TIME}.",
        "gloss": "Tell your neighbour no engine can take water at {BOX} before {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac02",
        "need": "WATER",
        "template": "No water at {BOX} tonight. Tank empty, main under repair.",
        "gloss": "Tell your neighbour that {BOX} has no water at all until morning.",
        "untilTime": false
      },
      {
        "id": "fac03",
        "need": "WATER",
        "template": "Wire from {BOX}: column leaking badly, shut off till {TIME}.",
        "gloss": "Tell your neighbour the water column at {BOX} is shut off until {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac04",
        "need": "WATER",
        "template": "Water column at {BOX} out all night. Crane arm fractured.",
        "gloss": "Tell your neighbour the water column at {BOX} is broken and stays out all night.",
        "untilTime": false
      },
      {
        "id": "fac05",
        "need": "WATER",
        "template": "Column at {BOX} out of use to {TIME}. Take water at {OTHERBOX}.",
        "gloss": "Tell your neighbour to water engines at {OTHERBOX} until {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac06",
        "need": "WATER",
        "template": "Pump at {BOX} under repair. Water again from {TIME}.",
        "gloss": "Tell your neighbour that water returns at {BOX} at {TIME}, not before.",
        "untilTime": true
      },
      {
        "id": "fac07",
        "need": "WATER",
        "template": "Tank at {BOX} drained for cleaning. No water before morning.",
        "gloss": "Tell your neighbour that {BOX} cannot water any engine for the rest of the night.",
        "untilTime": false
      },
      {
        "id": "fac08",
        "need": "WATER",
        "template": "Column at {BOX} out of use. Warn drivers. Water restored {TIME}.",
        "gloss": "Tell your neighbour to warn drivers that {BOX} has no water until {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac09",
        "need": "WATER",
        "template": "Water at {BOX} muddy since the main burst. Not fit till {TIME}.",
        "gloss": "Tell your neighbour the water at {BOX} is unfit to use until {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac10",
        "need": "COAL",
        "template": "Coal stage at {BOX} closed until {TIME}. Men short-handed.",
        "gloss": "Tell your neighbour that nothing can be coaled at {BOX} before {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac11",
        "need": "COAL",
        "template": "No coaling at {BOX} tonight. Stage road blocked by {WAGONS} wagons.",
        "gloss": "Tell your neighbour the coal stage at {BOX} is blocked and stays shut all night.",
        "untilTime": false
      },
      {
        "id": "fac12",
        "need": "COAL",
        "template": "Coal stage at {BOX} out of use, hoist jammed. Working by {TIME}.",
        "gloss": "Tell your neighbour the coal stage at {BOX} works again at {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac13",
        "need": "COAL",
        "template": "Wire from {BOX}: no coal to be taken there before {TIME}.",
        "gloss": "Tell your neighbour that {BOX} will not coal any engine until {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac14",
        "need": "COAL",
        "template": "Coal stage at {BOX} stopped for repairs to the ramp. Open {TIME}.",
        "gloss": "Tell your neighbour the coal stage at {BOX} reopens at {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac15",
        "need": "COAL",
        "template": "Coal stage at {BOX} out of use to {TIME}. Engines to coal at {OTHERBOX}.",
        "gloss": "Tell your neighbour to send engines to {OTHERBOX} for coal until {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac16",
        "need": "COAL",
        "template": "Coal at {BOX} short. Stage closed for the night by order.",
        "gloss": "Tell your neighbour that {BOX} has no coal to give out for the rest of the night.",
        "untilTime": false
      },
      {
        "id": "fac17",
        "need": "SHED",
        "template": "Engine shed at {BOX} shut until {TIME}. Turntable out of order.",
        "gloss": "Tell your neighbour that no engine can be put away at {BOX} before {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac18",
        "need": "SHED",
        "template": "Shed at {BOX} closed all night. No engine to be stabled there.",
        "gloss": "Tell your neighbour that {BOX} cannot take an engine into its shed at all tonight.",
        "untilTime": false
      },
      {
        "id": "fac19",
        "need": "SHED",
        "template": "Shed road at {BOX} occupied. Nothing to be sent in before {TIME}.",
        "gloss": "Tell your neighbour the shed at {BOX} is full until {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac20",
        "need": "SHED",
        "template": "Roof work at {BOX} shed. Closed till morning. Stable at {OTHERBOX}.",
        "gloss": "Tell your neighbour to put engines away at {OTHERBOX} for the rest of the night.",
        "untilTime": false
      },
      {
        "id": "fac21",
        "need": "SHED",
        "template": "Wire from {BOX}: shed doors off their runners, shut till {TIME}.",
        "gloss": "Tell your neighbour the shed at {BOX} cannot be opened until {TIME}.",
        "untilTime": true
      },
      {
        "id": "fac22",
        "need": "SHED",
        "template": "{BOX} shed fitters away till {TIME}. No engine to go on shed.",
        "gloss": "Tell your neighbour that {BOX} will take no engine into its shed until {TIME}.",
        "untilTime": true
      }
    ],
    "sectionNotices": [
      {
        "id": "sec01",
        "template": "Permanent way men in {SECTION}. All trains to run at caution.",
        "gloss": "Tell your neighbour that track workers are in {SECTION}, so every train through it loses three minutes.",
        "slowsBy": 3
      },
      {
        "id": "sec02",
        "template": "Bridge in {SECTION} weak. One train on it at a time.",
        "gloss": "Tell your neighbour the bridge in {SECTION} is weak, so trains crawl over it and lose four minutes.",
        "slowsBy": 4
      },
      {
        "id": "sec03",
        "template": "Fog in {SECTION}. Fogmen out. Signals may not be seen.",
        "gloss": "Tell your neighbour that fog in {SECTION} adds four minutes to every train through it.",
        "slowsBy": 4
      },
      {
        "id": "sec04",
        "template": "Washout in {SECTION}. One line only over {MILES} miles.",
        "gloss": "Tell your neighbour that only one track is usable in {SECTION}, costing five minutes a train.",
        "slowsBy": 5
      },
      {
        "id": "sec05",
        "template": "Slack in {SECTION} over new ballast. Drivers warned.",
        "gloss": "Tell your neighbour that fresh stone in {SECTION} slows each train by two minutes.",
        "slowsBy": 2
      },
      {
        "id": "sec06",
        "template": "Rail renewals in {SECTION}. {CLASS} trains to keep to walking pace.",
        "gloss": "Tell your neighbour that rails are being replaced in {SECTION}, costing three minutes a train.",
        "slowsBy": 3
      },
      {
        "id": "sec07",
        "template": "Points at the {LOOP} end stiff. Allow extra time in {SECTION}.",
        "gloss": "Tell your neighbour the stiff points at {LOOP} add a minute to anything through {SECTION}.",
        "slowsBy": 1
      },
      {
        "id": "sec08",
        "template": "Cattle reported on the line in {SECTION}. Caution until {TIME}.",
        "gloss": "Tell your neighbour that animals are on the line in {SECTION}, costing two minutes a train until {TIME}.",
        "slowsBy": 2
      },
      {
        "id": "sec09",
        "template": "Sleeper chairs renewed near the {LOOP}. {SECTION} restricted, all classes.",
        "gloss": "Tell your neighbour that work near {LOOP} slows every train through {SECTION} by two minutes.",
        "slowsBy": 2
      },
      {
        "id": "sec10",
        "template": "Gale has loosened the fencing in {SECTION}. Run with care.",
        "gloss": "Tell your neighbour that wind damage in {SECTION} costs each train a minute.",
        "slowsBy": 1
      },
      {
        "id": "sec11",
        "template": "Sleepers being changed in {SECTION}. Train {TRAIN} to pass at caution.",
        "gloss": "Tell your neighbour that track work in {SECTION} holds train {TRAIN} back by three minutes.",
        "slowsBy": 3
      },
      {
        "id": "sec12",
        "template": "Bridge girders under examination in {SECTION}. Loads over {WAGONS} wagons to crawl.",
        "gloss": "Tell your neighbour that long goods trains crawl through {SECTION} and lose four minutes.",
        "slowsBy": 4
      },
      {
        "id": "sec13",
        "template": "Rain has loosened the bank in {SECTION}. {MILES} miles at caution.",
        "gloss": "Tell your neighbour that the wet embankment in {SECTION} costs three minutes a train.",
        "slowsBy": 3
      },
      {
        "id": "sec14",
        "template": "Ballast train standing in the {LOOP}. {SECTION} obstructed, proceed slowly.",
        "gloss": "Tell your neighbour that a works train at {LOOP} adds two minutes to anything through {SECTION}.",
        "slowsBy": 2
      }
    ]
  },
  "orders": {
    "priorityArchetypes": [
      {
        "id": "mail-contract",
        "kind": "ABSOLUTE",
        "template": "{TRAIN} works the Post Office mails under contract. Nothing stands in front of it.",
        "gloss": "Mail trains outrank everything. Clear the road and hold your own train instead."
      },
      {
        "id": "boat-train",
        "kind": "ABSOLUTE",
        "template": "{TRAIN} is the boat train. It is not to be put into {LOOP}.",
        "gloss": "Boat trains outrank ordinary traffic. Never divert one into the loop to let another by."
      },
      {
        "id": "perishable-fish",
        "kind": "ABSOLUTE",
        "template": "{TRAIN} is fish for the early market. It spoils standing. Give it the road.",
        "gloss": "Perishable loads outrank passenger and goods alike. Let it run straight through."
      },
      {
        "id": "milk-traffic",
        "kind": "ABSOLUTE",
        "template": "{TRAIN} runs with milk churns for town. It passes ahead of all goods.",
        "gloss": "Milk outranks ordinary goods traffic. Hold your goods train, not this one."
      },
      {
        "id": "breakdown-van",
        "kind": "ABSOLUTE",
        "template": "The breakdown vans run as {TRAIN}. There are men under a wagon at {MILES}.",
        "gloss": "A rescue train. It outranks everything, the mails included. Do not delay it."
      },
      {
        "id": "class-rank",
        "kind": "ABSOLUTE",
        "template": "A {CLASS} train takes the road before any goods or light engine.",
        "gloss": "Ranking by class. A light engine is one running with no train behind it, and yields to all."
      },
      {
        "id": "meet-the-mail",
        "kind": "CONNECTION",
        "template": "{TRAIN} must be at {OTHERBOX} by {TIME} to take on the mails.",
        "gloss": "Mail bags are exchanged at the other box. Arrive late and the exchange is missed."
      },
      {
        "id": "crew-relief",
        "kind": "CONNECTION",
        "template": "{TRAIN} carries the relief crew. Without them the {TIME} cannot leave {OTHERBOX}.",
        "gloss": "A fresh driver and fireman ride this train. A later service cannot start without them."
      },
      {
        "id": "empty-stock-forms",
        "kind": "CONNECTION",
        "template": "{TRAIN} is empty stock. It forms the {TIME} passenger train out of {OTHERBOX}.",
        "gloss": "This train becomes a later service. Every minute lost now is lost twice."
      },
      {
        "id": "branch-connection",
        "kind": "CONNECTION",
        "template": "Passengers off {TRAIN} change at {OTHERBOX}. The branch will not wait past {TIME}.",
        "gloss": "Passengers must change trains there. The connecting service leaves at that time regardless."
      },
      {
        "id": "market-cattle",
        "kind": "CONNECTION",
        "template": "Cattle in {TRAIN} must be at {OTHERBOX} by {TIME} for the market.",
        "gloss": "Livestock must arrive before the market opens. After that the whole journey is wasted."
      }
    ],
    "conditionalStops": [
      {
        "id": "loop-occupied-count",
        "template": "Stop {TRAIN} at {LOOP} only if fewer than {WAGONS} wagons stand in it.",
        "gloss": "A loop is a side track a train waits in. Only the other box can count what is already standing there.",
        "conditionReadableBy": "NEIGHBOUR"
      },
      {
        "id": "length-as-counted",
        "template": "If {TRAIN} passed {OTHERBOX} with more than {WAGONS} wagons, stop it at {BOX}.",
        "gloss": "Only the box that watched it go by knows its length. Ask for the count.",
        "conditionReadableBy": "NEIGHBOUR"
      },
      {
        "id": "preceding-train",
        "template": "Stop {TRAIN} at {BOX} unless the {CLASS} has already passed {OTHERBOX}.",
        "gloss": "You cannot see whether the earlier train has gone through. The other box can.",
        "conditionReadableBy": "NEIGHBOUR"
      },
      {
        "id": "water-column-out",
        "template": "Stop {TRAIN} for water only if the column at {OTHERBOX} is out of order.",
        "gloss": "A water column is the trackside pipe for refilling engines. Only its own box knows if it works.",
        "conditionReadableBy": "NEIGHBOUR"
      },
      {
        "id": "pilot-engine-standing",
        "template": "Stop {TRAIN} at {BOX} only if the pilot engine stands idle at {OTHERBOX}.",
        "gloss": "The pilot is a spare shunting engine. Only the box beside it can see whether it is there.",
        "conditionReadableBy": "NEIGHBOUR"
      },
      {
        "id": "branch-still-standing",
        "template": "Hold {TRAIN} at {BOX} only while the branch train still stands at {OTHERBOX}.",
        "gloss": "If the connecting train has already left, holding yours gains nothing. Ask first.",
        "conditionReadableBy": "NEIGHBOUR"
      },
      {
        "id": "passed-after-time",
        "template": "If {TRAIN} passed {OTHERBOX} after {TIME}, stop it and let the mail by.",
        "gloss": "Only the other box logged the passing time. Without it you cannot judge how late it runs.",
        "conditionReadableBy": "NEIGHBOUR"
      },
      {
        "id": "crossing-gates",
        "template": "Stop {TRAIN} short of {MILES} if the gates at {OTHERBOX} stand across the line.",
        "gloss": "Level crossing gates swing either across the road or across the rails. Only the box working them knows which.",
        "conditionReadableBy": "NEIGHBOUR"
      }
    ]
  },
  "decoys": {
    "decoys": [
      {
        "id": "decoy-01",
        "template": "Lamp oil delivered to {BOX}, four gallons. Signed for at {TIME}."
      },
      {
        "id": "decoy-02",
        "template": "Sweep booked for the {BOX} chimney, Thursday week. He is usually late."
      },
      {
        "id": "decoy-03",
        "template": "District inspector walked {SECTION} last month. No remarks entered in the book."
      },
      {
        "id": "decoy-04",
        "template": "The box clock gains two minutes a week. Set right each Monday."
      },
      {
        "id": "decoy-05",
        "template": "New kettle for {BOX}. The old one leaked at the seam."
      },
      {
        "id": "decoy-06",
        "template": "The yard dog got in again near {TIME}. Nobody claims him."
      },
      {
        "id": "decoy-07",
        "template": "Roster pinned by the door. {BOX} nights, Wednesday to Sunday."
      },
      {
        "id": "decoy-08",
        "template": "Pane cracked in the {BOX} window. Glazier notified. Not yet come."
      },
      {
        "id": "decoy-09",
        "template": "Coal up threepence the hundredweight. The Company has been informed."
      },
      {
        "id": "decoy-10",
        "template": "Fencing repainted this summer, {BOX} to {OTHERBOX}. It wanted doing."
      },
      {
        "id": "decoy-11",
        "template": "Permanent way men lifted and packed {SECTION} in June. The ballast has held."
      },
      {
        "id": "decoy-12",
        "template": "Train register at {BOX} filled to the last page. New book issued."
      },
      {
        "id": "decoy-13",
        "template": "The stove draws badly when the wind sits in the north."
      },
      {
        "id": "decoy-14",
        "template": "{OTHERBOX} has a new man, three weeks out of his training."
      },
      {
        "id": "decoy-15",
        "template": "Lamp room key hangs on the second hook. It always has."
      },
      {
        "id": "decoy-16",
        "template": "Water for the kettle comes from the tap by the lamp room."
      },
      {
        "id": "decoy-17",
        "template": "Mileposts through {SECTION} repainted. The figures read plainly from the box now."
      },
      {
        "id": "decoy-18",
        "template": "{TRAIN} brought the sweep's brushes down on Tuesday. No charge made."
      },
      {
        "id": "decoy-19",
        "template": "Telegraph wires hum loudest in frost. It means nothing at all."
      },
      {
        "id": "decoy-20",
        "template": "Floor of {BOX} scrubbed Saturday. Sand bucket filled at the same time."
      },
      {
        "id": "decoy-21",
        "template": "The Company has ordered new blinds for {BOX}. Measurements taken already."
      },
      {
        "id": "decoy-22",
        "template": "Lamp wicks trimmed weekly. Two spare wicks in the desk drawer."
      },
      {
        "id": "decoy-23",
        "template": "{CLASS} traffic over {SECTION} ran heavier in August than in July."
      },
      {
        "id": "decoy-24",
        "template": "A barn owl nests in the lamp hut roof. Leave it be."
      },
      {
        "id": "decoy-25",
        "template": "The {LOOP} was weeded in April. Chickweed back again by August."
      },
      {
        "id": "decoy-26",
        "template": "Ganger's trolley kept in the hut, {MILES} miles beyond {BOX}. Padlocked."
      },
      {
        "id": "decoy-27",
        "template": "Stationmaster at the {OTHERBOX} end retires at Christmas. A collection is begun."
      },
      {
        "id": "decoy-28",
        "template": "{WAGONS} of ballast tipped in the sidings last spring. Long since used."
      },
      {
        "id": "decoy-29",
        "template": "Boots to be left on the mat. The floor was newly oiled."
      },
      {
        "id": "decoy-30",
        "template": "Wages paid Friday at the station office, not at {BOX}."
      },
      {
        "id": "decoy-31",
        "template": "Tea ration for nights. One quarter-pound tin, issued monthly."
      },
      {
        "id": "decoy-32",
        "template": "Rain came through the {BOX} roof in March. Felt patched since."
      },
      {
        "id": "decoy-33",
        "template": "The {TIME} down passenger whistles at the overbridge. Habit, not rule."
      },
      {
        "id": "decoy-34",
        "template": "Inspector's book kept in the locker. Last entry made in June."
      },
      {
        "id": "decoy-35",
        "template": "Signal lamps through {SECTION} were re-glassed in the spring. All sound."
      },
      {
        "id": "decoy-36",
        "template": "Three cats live about the goods shed. One of them is friendly."
      },
      {
        "id": "decoy-37",
        "template": "Fog signals stored dry in the tin box beneath the desk."
      },
      {
        "id": "decoy-38",
        "template": "Working cards for {CLASS} trains reprinted. The old cards may be burnt."
      },
      {
        "id": "decoy-39",
        "template": "Telegraph office closes at nine. Messages after that go by hand."
      },
      {
        "id": "decoy-40",
        "template": "A platelayer lost a spanner near the {LOOP}. It has not turned up."
      }
    ]
  },
  "vignettes": {
    "vignettes": [
      {
        "classId": "EXPRESS_PASSENGER",
        "lines": [
          "Every window dark. Due in Scotland by breakfast, and standing here.",
          "Ninety tons of sleeping passengers, waiting on your lamp.",
          "The driver leans out and says nothing. He knows the time.",
          "Twelve coaches standing, one stop left before the sea.",
          "In the dining car a steward steadies the plates.",
          "Hold this one and the whole night runs late behind it.",
          "She will not settle. Anything under sixty insults her.",
          "A gentleman lowers the window, sees fog, raises it again.",
          "She drinks from troughs between stations. Standing is unnatural.",
          "The guard has one watch and keeps looking at it.",
          "Boat train. The tide will not be asked to wait.",
          "Somebody's supper is going cold two hundred miles from home.",
          "Four sleeping carriages. Every curtain drawn, end to end.",
          "First line of the timetable. Everything else gives way.",
          "No goods, no parcels. People only, and their hurry.",
          "The fireman rests on his shovel for the first time tonight.",
          "A child asleep against a stranger's coat.",
          "Luggage labelled for towns you will never see.",
          "Brakes on every coach. She stops short and hates it.",
          "Two hundred travellers, and not one of them knows your name.",
          "Metal ticking as she cools. Every second here costs a mile.",
          "Somewhere ahead a junction is being set against her.",
          "An inspector walks the length of her, checking nothing.",
          "She carries men who expect London by nine.",
          "The last stop was forty miles back. The next is further.",
          "Restaurant car shuttered. They dined an hour ago."
        ]
      },
      {
        "classId": "STOPPING_PASSENGER",
        "lines": [
          "Stops at every platform, whether anyone is there or not.",
          "Two passengers, neither speaking to the other.",
          "The guard knows the farm names of everyone aboard.",
          "Four coaches, six stops, nine miles, one whole hour.",
          "A woman with a basket of eggs, minding the corner.",
          "A bicycle in the van, and a crate of hens.",
          "The lamps are lit for nobody in particular.",
          "She calls at halts too small for a booking clerk.",
          "Doors bang along the train, then nothing, then another door.",
          "Last train of the night. After this, people walk.",
          "An old man asks where he is. Nobody is certain.",
          "A small engine that has done this run for thirty years.",
          "Nobody aboard is in a hurry. They expected to be late.",
          "A boy leans out and is pulled back by his collar.",
          "Parcels for three villages stacked by the guard's knee.",
          "Fourteen empty seats for every full one.",
          "Market day is over. The baskets go home lighter.",
          "She gives way to everything. She is used to it.",
          "A courting couple at the far end, sharing one seat.",
          "The last stationmaster waved. He waves at everything.",
          "Soot on the window, and a name scratched through it.",
          "Someone has left a newspaper folded to the shipping news.",
          "Nobody aboard is going more than eleven miles.",
          "Tickets collected already. The guard has nothing left to do.",
          "A dog under a seat, well behaved, going two stations.",
          "Shunt her aside and she will forgive you by morning."
        ]
      },
      {
        "classId": "MAIL",
        "lines": [
          "Sorters standing at their frames inside, working while she waits.",
          "Forty thousand letters, every one later than it was.",
          "Bags hung ready. The lineside apparatus takes them without stopping.",
          "A clerk licks his thumb and goes on sorting.",
          "A Post Office carriage. No passenger may set foot inside.",
          "She carries the Crown's business. Late becomes a written report.",
          "Letters for Dublin, if the boat is still there.",
          "Somebody's answer is in that van. Nobody knows which bag.",
          "A lamp swings over the sorting frame while she stands.",
          "Registered bags chained down and counted twice.",
          "Even the driver is timed to the half minute.",
          "Sealed at one end of the country, opened at the other.",
          "No windows. They work by lamplight from dusk to dawn.",
          "A postmaster is waiting at a station you will never see.",
          "Pouches marked for towns, and towns marked for hours.",
          "Christmas week. She runs in two parts tonight.",
          "A minute lost here is a delivery missed tomorrow.",
          "The men inside have not sat down since eight o'clock.",
          "Twine, wax, and the smell of new paper.",
          "Nothing perishable aboard, and still nothing keeps.",
          "She does not carry people. She carries what people said.",
          "The guard signs for every bag. His hand has cramped.",
          "Bags for the outward ships, counted and counted again.",
          "One sack of newspapers. The rest is private business.",
          "A working office in the dark, doing the country's post.",
          "She runs whether the country notices her or not."
        ]
      },
      {
        "classId": "MILK",
        "lines": [
          "Churns to the roof, every one of them warm this morning.",
          "On doorsteps by six, or it is worth nothing.",
          "Fifty churns, seventeen gallons each, and none of them still.",
          "It turns sour while you are deciding.",
          "Gathered at halts from carts and farm boys.",
          "The smell of the byre, clinging to the van doors.",
          "Wet straw on the floor and a sweet, turning smell.",
          "She calls at every dairy siding between here and the city.",
          "The churns knock together each time she moves.",
          "Empty churns go back tomorrow. Full ones cannot wait.",
          "Ice would help. There is no ice.",
          "Water dripping from the van. A lid is loose.",
          "A dairy cart waits under a gas lamp at four.",
          "Cows keep no timetable. This train must.",
          "Rain on the churn lids, like a slow drum.",
          "Farmers' names chalked on the ends of the churns.",
          "Breakfast for a city, or waste. Nothing between.",
          "She looks like goods and is treated like passengers.",
          "A boy ran beside her from the last farm, and missed.",
          "The van floor is scrubbed daily and smells anyway.",
          "Nine hours old. Six more and it is finished.",
          "Hold her an hour and a county drinks tea black.",
          "Cold metal rings when it is struck.",
          "Explaining a soured load takes longer than clearing the road.",
          "Out full every night, back empty before dawn.",
          "Churn lids rattle when nothing else is moving."
        ]
      },
      {
        "classId": "EXPRESS_FREIGHT",
        "lines": [
          "Fish packed in ice that is already half water.",
          "Goods, timed like an express and braked like one.",
          "Meat for the market, and the market opens regardless.",
          "Vans, not open wagons. Everything inside is spoiling by degrees.",
          "Soft fruit that was on the bush this morning.",
          "Forty vans, all coupled tight, all in a hurry.",
          "Barrels of ale for a town that expects them by opening.",
          "Melt water runs off her and freezes on the rail.",
          "Nothing aboard will be worth money on Thursday.",
          "Her timetable is written in the same ink as the expresses.",
          "Sixty miles an hour, and every mile costs coal.",
          "Crates of cheese. The guard can smell them from the van.",
          "The load is why she is fast. Goods usually are not.",
          "Flowers from the west, wrapped in damp paper.",
          "She takes the curves like a coach. Slow goods cannot.",
          "Salt water dripping through the boards onto the track.",
          "A consignment note pinned to a van door, still wet.",
          "Eggs and butter, a hundred miles before morning.",
          "No stall will be held open for a late train.",
          "Speed is half the cargo. The other half is perishing.",
          "Rabbits hung in rows, going to the city by dawn.",
          "First among goods. That is what express means here.",
          "The guard rides at the back and never sees the load.",
          "Hampers for the hotels, ticketed and stacked.",
          "Sawdust in the corners, and the smell of the sea.",
          "Ice by the ton, and the ice is losing."
        ]
      },
      {
        "classId": "BALLAST",
        "lines": [
          "Stone for the track bed, and a gang waiting ahead.",
          "It runs when nothing else does, and stops where nothing is.",
          "Twenty men with picks riding in the rear van.",
          "No timetable for this one. Only the engineer's word.",
          "Granite dropped between the rails, a yard at a time.",
          "Works trains go where the work is. Tonight, here.",
          "A foreman counting minutes he has already been given.",
          "She holds the section until the foreman gives it back.",
          "Dust off the stone settles on everything, including you.",
          "Pick handles worn pale by hands.",
          "Heavy, slow, and answerable to no clock.",
          "The line ahead is closed for them, and only them.",
          "Sand, stone, and a crane older than the line.",
          "Fresh sleepers stacked in one wagon, oily and heavy.",
          "They will finish by four and be gone by five.",
          "Packing stone under the track is patient work.",
          "The foreman walks back to the driver. Again.",
          "She is not going anywhere. She has arrived.",
          "Tools in one van, tea in the other.",
          "An engine at each end, so nobody must turn round.",
          "Rails lying beside the track, waiting for daylight.",
          "Old ballast out, new stone in, and one night for it.",
          "Ten wagons of stone outweigh any express on the line.",
          "Nobody here is a passenger. Everybody is working.",
          "The permanent way stays permanent because somebody mends it.",
          "A line of lamps set out along the track, each a man."
        ]
      },
      {
        "classId": "COAL_EMPTIES",
        "lines": [
          "Fifty empty wagons going back to the pit for more.",
          "Loose couplings. She snatches and bangs her whole length.",
          "Nothing in them but coal dust and rainwater.",
          "The lowest priority on the railway, and she knows it.",
          "Wagon sides stencilled with collieries you will never visit.",
          "She has been put away three times already tonight.",
          "An hour here costs nobody anything but the guard's temper.",
          "Empty wagons weigh little and behave badly.",
          "The brake van at the back has a stove and kettle.",
          "She takes a mile to stop and two to start.",
          "North empty, south full. That is the whole of it.",
          "Seventy wagons, all alike, all rattling differently.",
          "No brakes but the engine and the guard's handbrake.",
          "The guard screws his brake down and waits for the jolt.",
          "Nobody expects her anywhere at any hour.",
          "Dust lifts off her whenever she is touched.",
          "See her tail lamp before you call the road clear.",
          "Put her in the loop and let the night pass her.",
          "Wagons lettered for companies that no longer exist.",
          "She creaks standing still, the way old timber does.",
          "Twelve hours down to the port, twelve back.",
          "Somebody's fire, eventually. Not tonight, and not soon.",
          "The couplings take up one by one, like knuckles.",
          "Nothing aboard is worth stealing. Men still try.",
          "Paid for by the ton, and tonight she carries none.",
          "The pit works all night. It wants its wagons back."
        ]
      },
      {
        "classId": "LIGHT_ENGINE",
        "lines": [
          "An engine and nothing behind it.",
          "Running to the shed. The crew started at noon.",
          "No train at all. A boiler and two tired men.",
          "She is going to fetch something and is late already.",
          "Short enough to fit anywhere. Remember that.",
          "The fire is being let down for the night.",
          "Tender first, and the wind straight in their faces.",
          "A minute of your time and she is gone.",
          "To the junction, then a goods train to work.",
          "The fireman has nothing to do, and does it sitting.",
          "No load, no guard, no van. The engine only.",
          "She stands high and light, with nothing pressing her down.",
          "Off to relieve an engine that has failed up the line.",
          "Half a platform would hold her.",
          "The driver wants his bed and says so with the whistle.",
          "Coming back from a train she has already delivered.",
          "Nothing lost by stopping her. Nothing gained either.",
          "She can be away in seconds. Most trains cannot.",
          "An engine alone sounds hollow. You learn to hear it.",
          "Blowing off steam she does not need.",
          "Going home empty-handed, and certain of the way.",
          "Coal for ten miles, and ten miles to go.",
          "The turntable is waiting, and so is the fitter.",
          "She pushed trains up the bank all evening. Finished now.",
          "One engine, two men, and lamps that say nothing follows.",
          "Nobody's journey depends on her. Only the next one."
        ]
      }
    ]
  }
};

export const IS_PLACEHOLDER = false;
