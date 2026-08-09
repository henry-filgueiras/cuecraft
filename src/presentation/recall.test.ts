import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePresentation, PresentationError } from "./parse.ts";
import { ROOT_SCOPE } from "./scope.ts";
import { SourceError, type RepositoryReader } from "./source.ts";

/**
 * What a `recall:` may name, and what it may not.
 *
 * Every assertion here goes through `parsePresentation`, because the rule is only meaningful
 * deck-wide: "exactly one earlier slide's root-scoped `activates`" is a sentence about a
 * presentation, and a unit test against `resolveRecalls` with hand-built surfaces would prove the
 * resolver agrees with itself while saying nothing about whether the parser hands it the deck.
 *
 * The refusals are checked by their *messages* rather than by the fact that they are refusals,
 * because the whole argument for making these compile errors is that the author can act on them.
 * "Invalid input" would be a rejection and not a diagnosis.
 */

function deck(body: string): string {
  return `title: A deck\n${body}`;
}

/** Parse and return the problems, so failure assertions can be about the message. */
function problems(source: string): readonly string[] {
  try {
    parsePresentation(source, "test.yaml");
  } catch (error) {
    assert.ok(error instanceof PresentationError, `unexpected error: ${String(error)}`);
    return error.problems;
  }
  assert.fail("expected the source to be rejected");
}

/** Two slides: the first anchors `settlement`, the second says what `later` says. */
function pair(later: string): string {
  return deck(`slides:
  - slide:
      title: The first charge
      bullets:
        - id: settlement
          text: Settlement completed
    say:
      - speech: The first charge reached settlement.
        activates: settlement
  - slide:
      title: Retry analysis
      bullets: [The retry was classified as harmless]
    say:
${later}
`);
}

/* ------------------------------------------------------------------ the cue */

test("a recall resolves to the earlier slide that activated the id", () => {
  const presentation = parsePresentation(
    pair(`      - speech: We saw this fail once already.
      - recall: settlement
      - pause: 700ms
      - speech: That was the first charge.`),
    "test.yaml",
  );

  const say = presentation.slides[1]?.say ?? [];
  assert.deepEqual(
    say.map((cue) => cue.kind),
    ["speech", "recall", "pause", "speech"],
  );

  const recall = say[1];
  assert.ok(recall?.kind === "recall");
  assert.equal(recall.target, "settlement");
  assert.equal(recall.scope, ROOT_SCOPE);
  assert.equal(recall.sourceOrdinal, 1, "the slide that first said it");
  assert.ok(
    !("milliseconds" in recall),
    "a recall carries no duration; the measurement it borrows lives on the clip",
  );
});

test("a narration that is nothing but a recall is valid; one that is nothing but pauses is not", () => {
  const only = parsePresentation(pair(`      - recall: settlement`), "test.yaml");
  assert.deepEqual(
    (only.slides[1]?.say ?? []).map((cue) => cue.kind),
    ["recall"],
    "a slide whose whole narration is an earlier sentence has a clock, sound and a subtitle",
  );

  assert.match(
    problems(pair(`      - pause: 700ms`)).join("\n"),
    /must contain something to say, not only pauses/,
  );
});

/* -------------------------------------------------------------- the spelling */

test("a recall takes no other key", () => {
  for (const extra of [
    "narrator: nadia",
    "activates: settlement",
    "fills: settlement",
    "speech: And again.",
    "pronounce: { charge: charj }",
  ]) {
    assert.match(
      problems(pair(`      - recall: settlement\n        ${extra}`)).join("\n"),
      /a recall cue takes no other keys/,
      extra,
    );
  }
});

test("a recall must name an identity", () => {
  assert.match(
    problems(pair(`      - recall: "not an id!"`)).join("\n"),
    /recall must name an anchor an earlier cue activates/,
  );
});

test("an unknown cue is told that recall exists", () => {
  assert.match(problems(pair(`      - replay: settlement`)).join("\n"), /recall: <id>/);
});

/* ------------------------------------------------------------- the refusals */

test("a recall of nothing lists what is recallable", () => {
  const reported = problems(pair(`      - recall: refund`)).join("\n");
  assert.match(reported, /slide 2, narration cue 1/);
  assert.match(reported, /recalls "refund", which no earlier slide activates/);
  assert.match(reported, /recallable: settlement/);
});

test("a recall on the first slide is told nothing has been anchored yet", () => {
  assert.match(
    problems(
      deck(`slides:
  - slide: { title: One, bullets: [a thing] }
    say:
      - recall: settlement`),
    ).join("\n"),
    /no slide before this one anchors anything/,
  );
});

test("an ambiguous recall names the slides that are candidates", () => {
  const reported = problems(
    deck(`slides:
  - slide:
      title: One
      bullets: [{ id: settlement, text: Settled }]
    say:
      - speech: The first charge settled.
        activates: settlement
  - slide:
      title: Two
      bullets: [{ id: settlement, text: Settled again }]
    say:
      - speech: The second charge settled.
        activates: settlement
  - slide:
      title: Three
      bullets: [Which one]
    say:
      - recall: settlement`),
  ).join("\n");

  assert.match(reported, /slides 1 and 2 all activate/);
  assert.match(reported, /exactly one earlier moment/);
});

test("two slides may anchor the same id forever, as long as nobody recalls it", () => {
  const presentation = parsePresentation(
    deck(`slides:
  - slide:
      title: One
      bullets: [{ id: check, text: Checked }]
    say:
      - speech: The first check ran.
        activates: check
  - slide:
      title: Two
      bullets: [{ id: check, text: Checked again }]
    say:
      - speech: The second check ran.
        activates: check`),
    "test.yaml",
  );
  assert.equal(presentation.slides.length, 2, "no new uniqueness restriction");
});

test("a same-slide recall is refused as a recall rather than as a missing anchor", () => {
  assert.match(
    problems(
      deck(`slides:
  - slide: { title: One, bullets: [{ id: settlement, text: Settled }] }
    say:
      - speech: The charge settled.
        activates: settlement
      - recall: settlement`),
    ).join("\n"),
    /which this slide activates; a recall reaches back to an earlier slide/,
  );
});

test("a forward recall names the slide it was reaching for", () => {
  assert.match(
    problems(
      deck(`slides:
  - slide: { title: One, bullets: [a thing] }
    say:
      - recall: settlement
  - slide: { title: Two, bullets: [{ id: settlement, text: Settled }] }
    say:
      - speech: The charge settled.
        activates: settlement`),
    ).join("\n"),
    /which slide 2 activates; a recall only reaches backwards/,
  );
});

test("a recall of a fills is told what a fills is", () => {
  assert.match(
    problems(
      deck(`slides:
  - slide:
      title: One
      series:
        - id: retries
          count: 4
          text: retries
    say:
      - speech: Four retries went out over the same window.
        fills: retries
  - slide: { title: Two, bullets: [a thing] }
    say:
      - recall: retries`),
    ).join("\n"),
    /which slide 1 fills across a sentence rather than activating at a moment/,
  );
});

/* ---------------------------------------------------------------- modules */

const ORIGIN = "decks/deck.yaml";

function reader(files: Record<string, string>): RepositoryReader {
  return (file) => {
    const text = files[file];
    if (text === undefined) {
      throw new SourceError(`file ${JSON.stringify(file)} does not exist`);
    }
    return text;
  };
}

const PAYING = `
world:
  entities:
    asks: The shop asks
    verdict: The bank answers
  relations:
    - asks -> verdict
say:
  - speech: The shop asks.
    activates: asks
  - speech: The bank answers.
    activates: verdict
`;

/** A deck whose first slide descends, and whose second slide says `later`. */
function descending(later: string, paying = PAYING): string {
  return `title: A deck
slides:
  - slide:
      title: One
      world:
        entities:
          buy: You press Buy
          paying:
            label: Paying
            child: ./paying.yaml
        relations:
          - buy -> paying
    say:
      - speech: You press Buy.
        activates: buy
      - enter: paying
  - slide: { title: Two, bullets: [a thing] }
    say:
${later}
`;
}

function moduleProblems(source: string, paying: string): readonly string[] {
  try {
    parsePresentation(source, ORIGIN, {
      read: reader({ "decks/paying.yaml": paying }),
      origin: ORIGIN,
    });
  } catch (error) {
    assert.ok(error instanceof PresentationError, `unexpected error: ${String(error)}`);
    return error.problems;
  }
  assert.fail("expected the source to be rejected");
}

test("an anchor inside a child module is not recallable from the deck around it", () => {
  const reported = moduleProblems(descending(`      - recall: verdict`), PAYING).join(
    "\n",
  );
  assert.match(reported, /recalls "verdict", which no earlier slide activates/);
  assert.match(reported, /recallable: buy/, "only the slide's own anchors are offered");
});

test("a module may not recall, because it does not know what came before it", () => {
  const reported = moduleProblems(
    descending(`      - speech: And that was that.`),
    `${PAYING}  - recall: buy\n`,
  ).join("\n");
  assert.match(
    reported,
    /recalls "buy", and a recall belongs to a slide's own narration/,
  );
});
