import assert from "node:assert/strict";
import { test } from "node:test";

import { bodyAddresses, bodyElements, type SlideBody } from "./body.ts";
import { scenarioPath, takeId } from "./machine.ts";
import { parsePresentation, PresentationError } from "./parse.ts";
import { ROOT_SCOPE } from "./scope.ts";
import { SourceError, type RepositoryReader } from "./source.ts";

/**
 * What a machine is, and every way of writing one that is not.
 *
 * The refusals carry more weight in this body than in any other, because a machine is the first
 * one whose two halves are *cross-referenced by hand in three directions*: a transition names two
 * states, an occurrence names a transition, and each occurrence has to begin where the last one
 * ended. Two of those the author types twice; the third is a property of the whole list and is
 * invisible when you are looking at any single line of it. A discontinuous scenario that compiled
 * would render a traveller crossing an edge that is not there — a film that is beautiful and false,
 * which is the exact failure decision:14 exists to make impossible.
 */

function problems(source: string): readonly string[] {
  try {
    parsePresentation(source, "deck.yaml");
  } catch (error) {
    if (error instanceof PresentationError) return error.problems;
    throw error;
  }
  return [];
}

/** A machine with everything the round is about: a loop, a revisit, a repeat, and a road not taken. */
const DECK = `
title: A deck
slides:
  - slide:
      title: A door that changes its mind
      machine:
        states:
          closed: Closed
          opening: Opening
          open: Open
          closing: Closing
          stuck: Out of service
        transitions:
          call:      { from: closed,  to: opening, on: call accepted }
          opened:    { from: opening, to: open,    on: open limit reached }
          dwelt:     { from: open,    to: closing, on: dwell timer expires }
          reversed:  { from: closing, to: opening, on: safety beam interrupted }
          shut:      { from: closing, to: closed,  on: closed limit reached }
          abandoned: { from: closing, to: stuck,   on: door remains obstructed }
        scenario:
          - take: call
            say: A call releases the door from its closed state.
          - take: opened
          - take: dwelt
            say: The dwell timer expires and it starts to close.
          - take: reversed
            say: Breaking the safety beam sends it back the other way.
          - take: opened
          - take: dwelt
          - take: shut
            say: Nothing interrupts it this time.
`;

function body(source: string = DECK): SlideBody {
  const parsed = parsePresentation(source, "deck.yaml").slides[0];
  assert.ok(parsed !== undefined);
  return parsed.body;
}

function machine(source: string = DECK) {
  const parsed = body(source);
  assert.equal(parsed.kind, "machine");
  if (parsed.kind !== "machine") throw new Error("not a machine");
  return parsed;
}

/* ------------------------------------------------------------ what it is */

test("a machine is states, transitions, and one ordered scenario over them", () => {
  const parsed = machine();
  assert.deepEqual(
    parsed.states.map((state) => state.id),
    ["closed", "opening", "open", "closing", "stuck"],
  );
  assert.deepEqual(
    parsed.transitions.map((entry) => `${entry.from} -${entry.on}-> ${entry.to}`),
    [
      "closed -call accepted-> opening",
      "opening -open limit reached-> open",
      "open -dwell timer expires-> closing",
      "closing -safety beam interrupted-> opening",
      "closing -closed limit reached-> closed",
      "closing -door remains obstructed-> stuck",
    ],
  );
  assert.deepEqual(
    parsed.scenario.map((occurrence) => occurrence.take),
    ["call", "opened", "dwelt", "reversed", "opened", "dwelt", "shut"],
  );
});

test("topology is timeless: a transition carries no narration, and an occurrence does", () => {
  const parsed = machine();
  for (const transition of parsed.transitions) {
    assert.ok(
      !Object.hasOwn(transition, "say"),
      `${transition.id} carries narration, which belongs to an occurrence`,
    );
  }
  // The same transition, narrated once and silent the next time. This is the whole reason `say`
  // cannot live on the transition: `opened` happens twice and is worth nothing either time.
  const takes = parsed.scenario.filter((occurrence) => occurrence.take === "dwelt");
  assert.equal(takes.length, 2);
  assert.ok(takes[0]?.say !== undefined);
  assert.ok(takes[1]?.say === undefined);
});

test("the scenario's start and stop are inferred, and nothing is declared final", () => {
  const path = scenarioPath(machine());
  assert.equal(path.start, "closed");
  assert.equal(path.stop, "closed");
  assert.deepEqual(path.before, [
    "closed",
    "opening",
    "open",
    "closing",
    "opening",
    "open",
    "closing",
  ]);
  assert.deepEqual(path.after, [
    "opening",
    "open",
    "closing",
    "opening",
    "open",
    "closing",
    "closed",
  ]);
  // `stuck` exists, is reachable, and is never occupied. That is the road not taken, and the
  // machine says nothing at all about it.
  assert.ok(!path.after.includes("stuck"));
});

test("a scenario may stop anywhere, including where it started", () => {
  const path = scenarioPath(
    machine(
      DECK.replace(
        "          - take: shut\n            say: Nothing interrupts it this time.\n",
        "",
      ),
    ),
  );
  assert.equal(path.stop, "closing");
});

test("a machine may declare a state nothing in the explanation reaches", () => {
  // No connectedness check, unlike a world: "this exists and this explanation never gets you
  // there" is a legitimate and often important thing to say about a system.
  assert.deepEqual(
    problems(`
title: A deck
slides:
  - slide:
      title: An island
      machine:
        states:
          a: A
          b: B
          island: Unreachable
        transitions:
          go: { from: a, to: b, on: go }
        scenario:
          - take: go
`),
    [],
  );
});

/* --------------------------------------------------------- what it is not */

test("a transition to a state nobody declared is refused, and the message lists the real ones", () => {
  const found = problems(
    DECK.replace(
      "{ from: closed,  to: opening, on: call accepted }",
      "{ from: closed, to: ajar, on: call accepted }",
    ),
  );
  assert.equal(found.length, 1);
  assert.match(found[0] as string, /machine\.transitions\.call/);
  assert.match(found[0] as string, /"ajar", which no state declares/);
  assert.match(found[0] as string, /declared: closed, opening, open, closing, stuck/);
});

test("an occurrence naming a transition nobody declared is refused", () => {
  const found = problems(DECK.replace("- take: reversed", "- take: revrsed"));
  assert.equal(found.length, 1);
  assert.match(found[0] as string, /machine\.scenario\.3/);
  assert.match(found[0] as string, /"revrsed", which no transition declares/);
  assert.match(
    found[0] as string,
    /declared: call, opened, dwelt, reversed, shut, abandoned/,
  );
});

test("a discontinuous scenario is refused, and the message says where the run actually was", () => {
  // `shut` leaves `closing`, and after `opened` the run is in `open`.
  const found = problems(
    DECK.replace(
      "          - take: dwelt\n          - take: shut",
      "          - take: shut",
    ),
  );
  assert.equal(found.length, 1);
  assert.match(found[0] as string, /machine\.scenario\.5/);
  assert.match(found[0] as string, /which leaves "closing", but the run is in "open"/);
  assert.match(found[0] as string, /leaving there: dwelt/);
});

test("the discontinuity message says so when nothing at all leaves where the run is", () => {
  const found = problems(`
title: A deck
slides:
  - slide:
      title: A cul-de-sac
      machine:
        states:
          a: A
          b: B
          c: C
        transitions:
          go:   { from: a, to: b, on: go }
          away: { from: c, to: a, on: away }
        scenario:
          - take: go
          - take: away
`);
  assert.equal(found.length, 1);
  assert.match(found[0] as string, /the run is in "b" and nothing leaves there/);
});

test("an empty scenario is refused; a machine with no run is a diagram", () => {
  const found = problems(
    DECK.replace(/        scenario:[\s\S]*$/, "        scenario: []\n"),
  );
  assert.equal(found.length, 1);
  assert.match(found[0] as string, /at least one occurrence/);
});

test("one state, or none between them, is not a machine", () => {
  assert.match(
    problems(`
title: A deck
slides:
  - slide:
      title: Alone
      machine:
        states: { only: Only }
        transitions: { go: { from: only, to: only, on: go } }
        scenario: [{ take: go }]
`)[0] as string,
    /at least 2 states/,
  );
});

test("a name cannot be a state and a transition at once", () => {
  const found = problems(DECK.replace("          shut:      ", "          open:      "));
  assert.equal(found.length, 1);
  assert.match(found[0] as string, /"open" is already a state/);
});

test("the occurrence address space is reserved against both kinds of name", () => {
  for (const [what, source] of [
    [
      "a state",
      DECK.replace("          open: Open", "          take-1: Open").replace(
        /\bopen\b(?!:)/g,
        "take-1",
      ),
    ],
    [
      "a transition",
      DECK.replace("          shut:      ", "          take-2:    ").replace(
        "- take: shut",
        "- take: take-2",
      ),
    ],
  ] as const) {
    const found = problems(source);
    assert.ok(
      found.some((problem) =>
        /is reserved: an occurrence is addressed as take-1/.test(problem),
      ),
      `${what} was allowed to take a reserved name: ${found.join(" | ")}`,
    );
  }
});

test("a transition with no event label is refused", () => {
  const found = problems(DECK.replace(",  on: closed limit reached }", " }"));
  assert.equal(found.length, 1);
  assert.match(found[0] as string, /on must say what fires this transition/);
});

test("an unknown key anywhere in a machine is refused with the allowed set", () => {
  assert.match(
    problems(
      DECK.replace("        scenario:", "        initial: closed\n        scenario:"),
    )[0] as string,
    /unknown key "initial" \(allowed: states, transitions, scenario\)/,
  );
  assert.match(
    problems(
      DECK.replace(
        "{ from: closed,  to: opening, on: call accepted }",
        "{ from: closed, to: opening, on: call accepted, guard: true }",
      ),
    )[0] as string,
    /unknown key "guard" \(allowed: from, to, on\)/,
  );
  assert.match(
    problems(
      DECK.replace(
        "          - take: opened\n",
        "          - take: opened\n            dwell: 900ms\n",
      ),
    )[0] as string,
    /unknown key "dwell" \(allowed: take, say, pronounce\)/,
  );
});

test("a spelling for a word that is not in this occurrence's say is refused", () => {
  assert.match(
    problems(
      DECK.replace(
        "            say: A call releases the door from its closed state.",
        "            say: A call releases the door from its closed state.\n            pronounce: { elevator: elevaytor }",
      ),
    )[0] as string,
    /pronounce\.elevator does not appear in this occurrence's say/,
  );
});

/* ------------------------------------------------- what narration may reach */

test("states are reachable by name and occurrences are not", () => {
  const parsed = machine();
  assert.deepEqual(
    bodyElements(parsed).map((element) => element.id),
    [
      "closed",
      "opening",
      "open",
      "closing",
      "stuck",
      ...parsed.scenario.map((_, index) => takeId(index)),
    ],
  );

  const addresses = bodyAddresses(parsed, ROOT_SCOPE);
  // A state is addressed under the slide and reachable from the slide's own narration.
  assert.equal(addresses[0]?.scope, ROOT_SCOPE);
  // An occurrence is addressed under the slide and reachable only from the narration the compiler
  // generated for it, which is what makes `activates: take-3` an unknown identity.
  const occurrence = addresses[5];
  assert.ok(occurrence !== undefined);
  assert.notEqual(occurrence.scope, ROOT_SCOPE);
  assert.equal(occurrence.scope, occurrence.address);
});

test("a prologue may light a state up by name", () => {
  assert.deepEqual(
    problems(
      DECK.replace("      machine:", "      machine:").replace(/^slides:$/m, "slides:") +
        `
    say:
      - speech: The door starts shut, which is where a door spends most of its life.
        activates: closed
`,
    ),
    [],
  );
});

test("a prologue may not reach an occurrence", () => {
  const found = problems(
    DECK +
      `
    say:
      - speech: Something about the third thing that happens.
        activates: take-3
`,
  );
  assert.equal(found.length, 1);
  assert.match(found[0] as string, /take-3/);
});

test("a machine needs no prologue, because its scenario supplies the clock", () => {
  assert.deepEqual(problems(DECK), []);
});

/* --------------------------------------------------------------- nesting */

test("a machine may not be an entity's interior, in either spelling", () => {
  const found = problems(`
title: A deck
slides:
  - slide:
      title: A world
      world:
        entities:
          a:
            label: A
            detail:
              machine:
                states: { x: X, y: Y }
                transitions: { go: { from: x, to: y, on: go } }
                scenario: [{ take: go }]
          b: B
        relations:
          - a -> b
    say:
      - speech: One sentence about a world.
`);
  assert.match(found[0] as string, /slide\.world\.entities\.a\.detail\.machine/);
  assert.match(found[0] as string, /a machine cannot be an interior/);
  assert.match(found[0] as string, /two cameras compose/);
});

test("a machine may not arrive as a child module either", () => {
  // A world may — that is decision:31, and it is what makes this refusal a statement about
  // cameras rather than about nesting.
  const files = {
    "decks/inner.yaml": `
machine:
  states: { x: X, y: Y }
  transitions: { go: { from: x, to: y, on: go } }
  scenario: [{ take: go }]
say:
  - speech: One sentence from inside.
`,
  };
  const read: RepositoryReader = (file) => {
    const text = files[file as keyof typeof files];
    if (text === undefined) throw new SourceError(`no ${file}`);
    return text;
  };

  let found: readonly string[] = [];
  try {
    parsePresentation(
      `
title: A deck
slides:
  - slide:
      title: A world
      world:
        entities:
          a: { label: A, child: ./inner.yaml }
          b: B
        relations:
          - a -> b
    say:
      - speech: One sentence about a world.
        activates: a
`,
      "deck.yaml",
      { read, origin: "decks/deck.yaml" },
    );
  } catch (error) {
    if (!(error instanceof PresentationError)) throw error;
    found = error.problems;
  }
  assert.match(found[0] as string, /a machine cannot be an interior/);
});
