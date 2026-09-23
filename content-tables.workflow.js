export const meta = {
  name: 'block-bell-content-tables',
  description: 'Author the BLOCK & BELL content tables in the 1897 signalling voice, as structured data',
  phases: [{ title: 'Author', detail: 'one agent per table group' }],
}

const VOICE = `
You are writing content tables for BLOCK & BELL, a two-to-four player co-operative browser game about
signalling a single-track railway at night in 1897. Players are signallers in separate signal boxes who
cannot see each other's line. The game is played on phones, by strangers, with no host explaining anything.

THE VOICE - non-negotiable:
- Terse, practical, in character. A working signalman's register, not a museum placard.
- Period-plausible British railway usage, but NEVER a jargon term that a modern player cannot infer
  from context or from a short gloss. If a term needs explaining, supply the gloss yourself.
- Understated. No whimsy, no exclamation marks, no winking at the player, no steampunk.
- Short. Most lines are under 14 words. A notice is a thing someone wrote in a hurry, by lamplight.
- British spelling throughout.

TEMPLATE PLACEHOLDERS - notices are filled in by a generator, so write them as templates using ONLY
these tokens, which will be substituted: {BOX} {OTHERBOX} {TIME} {TRAIN} {CLASS} {LOOP} {WAGONS} {MILES} {SECTION}
Not every template needs every token. Never invent a token outside this list.

ACCESSIBILITY: no line may depend on colour, and every line must read correctly aloud in a screen reader.
`

const IDENT_SCHEMA = {
  type: 'object',
  properties: {
    trains: {
      type: 'array',
      description: 'exactly 24 train identities',
      items: {
        type: 'object',
        properties: {
          headcode: { type: 'string', description: 'short working identity as printed, e.g. "9-F" or "231"' },
          name: { type: 'string', description: 'short working name, e.g. "FISH", "MAIL", "THE 8.05 DOWN"' },
          flavour: { type: 'string', description: 'at most 12 words a signaller might mutter about it' },
        },
        required: ['headcode', 'name', 'flavour'],
      },
    },
    classes: {
      type: 'array',
      description: 'exactly 8 classes',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'SCREAMING_SNAKE id, e.g. EXPRESS_PASSENGER' },
          label: { type: 'string', description: 'as printed on screen, e.g. "Express passenger"' },
          glyph: { type: 'string', description: 'one text glyph, no emoji, e.g. "\u25b8"' },
          gloss: { type: 'string', description: 'one sentence a cold player can act on: what this class needs and why it matters' },
          typicalWagons: { type: 'array', items: { type: 'number' } },
          perishable: { type: 'boolean', description: 'true if delay is especially costly (fish, milk)' },
          priorityHint: { type: 'number', description: '1 (gets out of the way) to 5 (everything waits for it)' },
        },
        required: ['id', 'label', 'glyph', 'gloss', 'typicalWagons', 'perishable', 'priorityHint'],
      },
    },
  },
  required: ['trains', 'classes'],
}

const PLACE_SCHEMA = {
  type: 'object',
  properties: {
    boxNames: {
      type: 'array',
      description: 'exactly 60 signal box names, one or two words, no "BOX" suffix (the game appends it)',
      items: { type: 'string' },
    },
    lineNames: {
      type: 'array',
      description: 'exactly 18 branch/line names, e.g. "the Hawksmere branch"',
      items: { type: 'string' },
    },
  },
  required: ['boxNames', 'lineNames'],
}

const NOTICE_SCHEMA = {
  type: 'object',
  properties: {
    facilityNotices: {
      type: 'array',
      description: 'exactly 22 templates about a facility being unavailable (water column, coal stage, engine shed)',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          need: { type: 'string', enum: ['WATER', 'COAL', 'SHED'] },
          template: { type: 'string', description: 'the printed notice, using only the allowed tokens' },
          gloss: { type: 'string', description: 'one plain sentence: what the holder must tell their neighbour' },
          untilTime: { type: 'boolean', description: 'true if this notice lifts at {TIME}, false if it is out all night' },
        },
        required: ['id', 'need', 'template', 'gloss', 'untilTime'],
      },
    },
    sectionNotices: {
      type: 'array',
      description: 'exactly 14 templates about the running line itself being restricted or slow',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          template: { type: 'string' },
          gloss: { type: 'string' },
          slowsBy: { type: 'number', description: 'extra minutes a train takes through the section, 1-5' },
        },
        required: ['id', 'template', 'gloss', 'slowsBy'],
      },
    },
  },
  required: ['facilityNotices', 'sectionNotices'],
}

const ORDER_SCHEMA = {
  type: 'object',
  properties: {
    priorityArchetypes: {
      type: 'array',
      description: 'exactly 11 archetypes for why one train must be given precedence over another',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          kind: { type: 'string', enum: ['ABSOLUTE', 'CONNECTION'] },
          template: { type: 'string' },
          gloss: { type: 'string' },
        },
        required: ['id', 'kind', 'template', 'gloss'],
      },
    },
    conditionalStops: {
      type: 'array',
      description: 'exactly 8 archetypes for a train that stops ONLY IF some condition holds - the condition must be something the OTHER box can see',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          template: { type: 'string' },
          gloss: { type: 'string' },
          conditionReadableBy: { type: 'string', enum: ['NEIGHBOUR'], description: 'always NEIGHBOUR - that is the point' },
        },
        required: ['id', 'template', 'gloss', 'conditionReadableBy'],
      },
    },
  },
  required: ['priorityArchetypes', 'conditionalStops'],
}

const DECOY_SCHEMA = {
  type: 'object',
  properties: {
    decoys: {
      type: 'array',
      description: 'exactly 40 notices that are TRUE but INERT - they never affect play',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          template: { type: 'string' },
        },
        required: ['id', 'template'],
      },
    },
  },
  required: ['decoys'],
}

const VIGNETTE_SCHEMA = {
  type: 'object',
  properties: {
    vignettes: {
      type: 'array',
      description: 'one entry per class id given in the prompt',
      items: {
        type: 'object',
        properties: {
          classId: { type: 'string' },
          lines: { type: 'array', description: 'exactly 26 lines for this class', items: { type: 'string' } },
        },
        required: ['classId', 'lines'],
      },
    },
  },
  required: ['vignettes'],
}

const CLASS_IDS = [
  'EXPRESS_PASSENGER', 'STOPPING_PASSENGER', 'MAIL', 'MILK',
  'EXPRESS_FREIGHT', 'BALLAST', 'COAL_EMPTIES', 'LIGHT_ENGINE',
]

phase('Author')
log('6 authors writing the content tables in one voice')

const TASKS = [
  { key: 'identities', schema: IDENT_SCHEMA, prompt:
`Write the train identity table and the class table.

24 TRAIN IDENTITIES. These are the working names printed on a signaller's screen. Mix numbered workings
("231", "9-F") with named ones ("FISH", "MAIL", "THE 8.05 DOWN", "BALLAST"). They must be instantly
distinguishable from each other when two people are reading them aloud down a wire in a hurry - avoid
pairs that sound alike. The flavour line is what a signaller mutters when it turns up.

8 CLASSES with the ids exactly: ${CLASS_IDS.join(', ')}.
The gloss is the most important field: a cold player who has never heard the term must be able to act on it.
priorityHint drives whether other trains wait; perishable marks the ones where delay genuinely costs something.` },

  { key: 'places', schema: PLACE_SCHEMA, prompt:
`Write 60 signal box names and 18 line names.

Box names must sound like real British signal boxes and must be distinguishable over a wire - no two
beginning with the same three letters, and none that rhyme with another. They will be shown as
"DUNMERE BOX", so do not include the word BOX. One or two words each.

Line names read as "tonight you work {the Hawksmere branch}", so include the article.` },

  { key: 'notices', schema: NOTICE_SCHEMA, prompt:
`Write 22 facility notices and 14 section notices.

A facility notice says a water column, coal stage or engine shed is unavailable - and crucially, it is
printed in the NEIGHBOUR's book, not in the book of the box that owns the facility. So write them as
something one signaller reads ABOUT ANOTHER BOX: e.g. "Water column at {BOX} out of use until {TIME}."
Vary the reason and the register: some are curt, some explain, some are clearly copied from a wire.
Roughly two thirds should lift at {TIME}; the rest are out all night.

Section notices restrict the running line itself - permanent way work, a weak bridge, fog, a washout,
a speed restriction. slowsBy is how many extra minutes a train takes through the section.` },

  { key: 'orders', schema: ORDER_SCHEMA, prompt:
`Write 11 priority archetypes and 8 conditional-stop archetypes.

PRIORITY: reasons one train must be let through ahead of another. ABSOLUTE means it simply outranks
(a Royal Mail contract, a boat train, a perishable). CONNECTION means it must reach somewhere by {TIME}
to meet something else. These are printed in the NEIGHBOUR's book, so the person who can act on them
is never the person holding them.

CONDITIONAL STOPS are the sharpest tool in the game: a train stops only if some condition holds, and
the condition must be something only the OTHER box can see - how many wagons are standing on a road,
whether a facility is working, whether another train has already passed. Write them so that the holder
of the order physically cannot evaluate it alone. That is the entire point.` },

  { key: 'decoys', schema: DECOY_SCHEMA, prompt:
`Write 40 decoy notices: true, plausible, period-correct, and completely inert - they never change what
anyone should do.

They must be indistinguishable in TONE and SHAPE from real notices, or they do not work. Draw on the
texture of a real night railway: lamp oil deliveries, a chimney sweep booked, the district inspector's
rounds, a clock gaining two minutes a week, a new kettle, a dog that gets into the yard, staff rosters,
a broken pane in the box window, the price of coal.

Their cost is the partner's attention. Make a player want to read them out, and then feel the seconds go.` },

  { key: 'vignettes', schema: VIGNETTE_SCHEMA, prompt:
`Write 26 vignette lines for EACH of these 8 classes: ${CLASS_IDS.join(', ')}. That is 208 lines total,
and every one must be different.

A vignette is one short line shown when a train of that class is standing at your box - atmosphere that
also quietly teaches what the class is. "The fish is iced and will not wait." "Three passengers, all asleep."
Under 12 words. No exclamation marks. Never repeat an image across classes.` },
]

const results = await parallel(TASKS.map(t => () =>
  agent(`${VOICE}\n\n${t.prompt}\n\nReturn the data. Do not explain it.`,
        { label: `author:${t.key}`, phase: 'Author', schema: t.schema })
))

const out = {}
TASKS.forEach((t, i) => { out[t.key] = results[i] })
log(`tables authored: ${TASKS.filter((t,i)=>results[i]).map(t=>t.key).join(', ')}`)
return out
