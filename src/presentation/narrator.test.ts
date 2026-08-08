import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { repositoryRoot } from "../repository.ts";
import { parsePresentation, PresentationError } from "./parse.ts";
import { SourceError } from "./source.ts";

/**
 * Who says what, and — much more importantly — what a narrator does *not* do.
 *
 * Almost every test here is about the second half. Selecting a voice per utterance is four lines of
 * lookup; the property worth defending is that selection is **lexical**, so that a cue means the
 * same thing wherever it is read from, and that the narration stream is unchanged in every other
 * respect. Two of these tests would pass under a "last narrator wins" implementation and the rest
 * would not, which is the point.
 *
 * Tested on the resolved cues rather than on whether the YAML parsed: the question is never "is
 * this valid", it is "who did this turn out to be spoken by".
 */

/** Who each speech cue on each slide resolved to, `null` for the deck's own voice. */
function speakers(source: string): readonly (readonly (string | null)[])[] {
  return parsePresentation(source, "test.yaml").slides.map((slide) =>
    slide.say.flatMap((cue) => (cue.kind === "speech" ? [cue.narrator ?? null] : [])),
  );
}

function problems(source: string, files: Record<string, string> = {}): readonly string[] {
  try {
    parsePresentation(source, "test.yaml", {
      read: (file) => {
        const text = files[file];
        if (text === undefined) throw new SourceError(`file "${file}" does not exist`);
        return text;
      },
    });
  } catch (error) {
    assert.ok(error instanceof PresentationError, `unexpected error: ${String(error)}`);
    return error.problems;
  }
  assert.fail("expected the source to be rejected");
}

const CAST = `narrators:
  ada: { voice: af_heart }
  meta: { voice: am_adam }
`;

/* ------------------------------------------------ the compatibility baseline */

test("a deck that names no narrator resolves none, and keeps the deck's voice", () => {
  const presentation = parsePresentation(
    `title: A deck
defaults:
  voice: bm_george
  speed: 1.1
slides:
  - slide: { title: One }
    say:
      - "First."
      - pause: 400ms
      - speech: "Second."
`,
    "test.yaml",
  );

  assert.equal(presentation.narrators.size, 0);
  assert.equal(presentation.voice, "bm_george");
  assert.equal(presentation.speed, 1.1);
  // Not "the default narrator" and not an empty string: the key is absent, so a deck written
  // before a cast existed compiles to exactly the cues it always did.
  for (const cue of presentation.slides[0]?.say ?? []) {
    assert.ok(!("narrator" in cue), `${cue.kind} cue acquired a narrator`);
  }
});

/* ------------------------------------------------------- the three scopes */

test("the deck's narrator speaks every cue that does not say otherwise", () => {
  assert.deepEqual(
    speakers(`title: A deck
${CAST}defaults:
  narrator: ada
slides:
  - slide: { title: One }
    say:
      - "First."
      - "Second."
  - slide: { title: Two }
    say: "Third."
`),
    [["ada", "ada"], ["ada"]],
  );
});

test("a slide may speak in a different narrator, and only that slide does", () => {
  assert.deepEqual(
    speakers(`title: A deck
${CAST}defaults:
  narrator: ada
slides:
  - slide: { title: One }
    say: "Ada."
  - slide: { title: Two }
    narrator: meta
    say:
      - "Meta."
      - "Still meta."
  - slide: { title: Three }
    say: "Ada again."
`),
    [["ada"], ["meta", "meta"], ["ada"]],
  );
});

test("a slide may name a narrator on a deck that declares no default", () => {
  assert.deepEqual(
    speakers(`title: A deck
${CAST}slides:
  - slide: { title: One }
    say: "The deck's own voice."
  - slide: { title: Two }
    narrator: meta
    say: "Meta."
`),
    [[null], ["meta"]],
  );
});

/* ------------------------------- the property the whole design turns on */

test("an utterance's narrator reaches that utterance and stops", () => {
  assert.deepEqual(
    speakers(`title: A deck
${CAST}defaults:
  narrator: ada
slides:
  - slide: { title: One }
    say:
      - "Ada."
      - speech: "Meta."
        narrator: meta
      - "Ada again."
`),
    [["ada", "meta", "ada"]],
  );
});

test("an override does not survive a pause, a slide boundary, or repetition", () => {
  assert.deepEqual(
    speakers(`title: A deck
${CAST}defaults:
  narrator: ada
slides:
  - slide: { title: One }
    say:
      - speech: "Meta."
        narrator: meta
      - pause: 300ms
      - "Ada."
      - speech: "Meta twice."
        narrator: meta
      - speech: "Meta again."
        narrator: meta
      - "Ada."
  - slide: { title: Two }
    say: "Ada, on a new slide."
`),
    [["meta", "ada", "meta", "meta", "ada"], ["ada"]],
  );
});

test("an utterance may override a slide that already overrode the deck", () => {
  assert.deepEqual(
    speakers(`title: A deck
${CAST}defaults:
  narrator: ada
slides:
  - slide: { title: One }
    narrator: meta
    say:
      - "Meta."
      - speech: "Ada, briefly."
        narrator: ada
      - "Meta."
`),
    [["meta", "ada", "meta"]],
  );
});

/* --------------------------------------------------- what a narrator is */

test("a narrator resolves to a voice, and to the deck's speed unless it sets one", () => {
  const presentation = parsePresentation(
    `title: A deck
narrators:
  ada: { voice: af_heart }
  meta: { voice: am_adam, speed: 0.9 }
defaults:
  speed: 1.2
slides:
  - slide: { title: One }
    say: "Hello."
`,
    "test.yaml",
  );

  assert.deepEqual(
    [...presentation.narrators.values()],
    [
      { id: "ada", voice: "af_heart", speed: 1.2 },
      { id: "meta", voice: "am_adam", speed: 0.9 },
    ],
  );
});

test("two narrators may not share a voice's name by accident — they are separate entries", () => {
  const presentation = parsePresentation(
    `title: A deck
narrators:
  narrator: { voice: af_heart }
  aside: { voice: af_heart }
slides:
  - slide: { title: One }
    say:
      - speech: "One."
        narrator: narrator
      - speech: "Two."
        narrator: aside
`,
    "test.yaml",
  );

  // Two names for one voice is legal and means what it says: the cast is a set of identities, and
  // what each currently sounds like is a separate fact that may coincide.
  assert.deepEqual(
    [...presentation.narrators.values()].map((narrator) => narrator.voice),
    ["af_heart", "af_heart"],
  );
});

/* -------------------------------------------------- invalid configuration */

test("an unknown narrator is refused wherever it is named, with the cast listed", () => {
  const cast = "(declared: ada, meta)";

  assert.deepEqual(
    problems(`title: A deck
${CAST}defaults:
  narrator: adah
slides:
  - slide: { title: One }
    say: "Hello."
`),
    [`defaults.narrator: names narrator "adah", which the deck does not declare ${cast}`],
  );

  assert.deepEqual(
    problems(`title: A deck
${CAST}slides:
  - slide: { title: One }
    narrator: nobody
    say: "Hello."
`),
    [
      `slide 1, narrator: names narrator "nobody", which the deck does not declare ${cast}`,
    ],
  );

  assert.deepEqual(
    problems(`title: A deck
${CAST}slides:
  - slide: { title: One }
    say:
      - "Hello."
      - speech: "There."
        narrator: metta
`),
    [
      `slide 1, narration cue 2: names narrator "metta", which the deck does not declare ${cast}`,
    ],
  );
});

test("a deck with no cast at all is told how to declare one", () => {
  assert.deepEqual(
    problems(`title: A deck
slides:
  - slide: { title: One }
    say:
      - speech: "Hello."
        narrator: meta
`),
    [
      'slide 1, narration cue 1: names narrator "meta", which the deck does not declare; ' +
        "a deck names its narrators in a top-level narrators: mapping",
    ],
  );
});

test("a cast that is not a cast is rejected entry by entry", () => {
  assert.deepEqual(
    problems(`title: A deck
narrators:
  ada: af_heart
slides:
  - slide: { title: One }
    say: "Hello."
`),
    ["narrators.ada: must be { voice: <a voice name> }, optionally with a speed"],
  );

  assert.deepEqual(
    problems(`title: A deck
narrators:
  ada: { speed: 1.1 }
slides:
  - slide: { title: One }
    say: "Hello."
`),
    [
      "narrators.ada: voice is required; a narrator is a name for a voice, so there is " +
        "nothing else it could be",
    ],
  );

  assert.deepEqual(
    problems(`title: A deck
narrators:
  ada: { voice: af_heart, style: warm }
slides:
  - slide: { title: One }
    say: "Hello."
`),
    ['narrators.ada: unknown key "style" (allowed: voice, speed)'],
  );

  assert.deepEqual(
    problems(`title: A deck
narrators:
  "Ada Lovelace": { voice: af_heart }
slides:
  - slide: { title: One }
    say: "Hello."
`),
    [
      "narrators.Ada Lovelace: a narrator's name must be lower-case letters, digits and " +
        "hyphens, starting with a letter",
    ],
  );

  assert.deepEqual(
    problems(`title: A deck
narrators: [ada, meta]
slides:
  - slide: { title: One }
    say: "Hello."
`),
    [
      "narrators: must be a mapping of name to { voice: <a voice name>, speed: <optional rate> }",
    ],
  );

  assert.deepEqual(
    problems(`title: A deck
narrators: {}
slides:
  - slide: { title: One }
    say: "Hello."
`),
    [
      "narrators: declares no narrators; a deck that does not name one speaks in the deck's " +
        "own voice and needs no cast",
    ],
  );
});

test("a narrator is not a voice, and saying a voice name where a narrator goes fails", () => {
  // The mistake an author will actually make. It has to fail loudly rather than synthesize
  // something: `af_heart` is a real voice and a fine name for a narrator, and cuecraft cannot tell
  // which was meant except by whether it was declared.
  assert.deepEqual(
    problems(`title: A deck
${CAST}slides:
  - slide: { title: One }
    say:
      - speech: "Hello."
        narrator: am_adam
`),
    [
      "slide 1, narration cue 1: narrator must be lower-case letters, digits and hyphens, " +
        "starting with a letter",
    ],
  );
});

/* ------------------------------------------------- the rest of the format */

test("a protocol's steps are spoken by the slide's narrator, not by their actors", () => {
  const [slide] = parsePresentation(
    `title: A deck
${CAST}defaults:
  narrator: ada
slides:
  - slide:
      title: One
      protocol:
        actors:
          you: You
          bank: Your bank
        steps:
          - from: you
            to: bank
            message: ask
            say: "You ask."
          - from: bank
            to: you
            message: answer
            say: "It answers."
    narrator: meta
    say: "A prologue."
`,
    "test.yaml",
  ).slides;

  assert.deepEqual(
    slide?.say.flatMap((cue) => (cue.kind === "speech" ? [cue.narrator] : [])),
    ["meta", "meta", "meta"],
    "an actor is a party to the exchange; who narrates it is the slide's business",
  );
});

test("a module's narration is spoken by the slide that entered it", () => {
  const deck = `title: A deck
${CAST}defaults:
  narrator: ada
slides:
  - slide:
      title: One
      world:
        entities:
          basket: A basket
          payment:
            label: Payment
            child: ./payment.yaml
        relations:
          - basket -> payment
    narrator: meta
    say:
      - "Meta, outside."
      - enter: payment
      - "Meta again."
`;
  const payment = `bullets: [taken, settled]
say:
  - "Inside, in the caller's voice."
  - speech: "And this line is not."
    narrator: ada
`;

  const presentation = parsePresentation(deck, "test.yaml", {
    read: (file) => {
      if (file === "payment.yaml") return payment;
      throw new SourceError(`file "${file}" does not exist`);
    },
  });

  // A module may not declare defaults of its own, so it has no narrator of its own; its cues take
  // the slide's and may override it one at a time exactly as the slide's own cues may.
  assert.deepEqual(
    presentation.slides[0]?.say.flatMap((cue) =>
      cue.kind === "speech" ? [cue.narrator] : [],
    ),
    ["meta", "meta", "ada", "meta"],
  );
});

test("a module naming a narrator the deck does not declare is refused, with the module named", () => {
  // The first problem only: an entity whose module failed to resolve is an entity the relation
  // below it can no longer name, and that second complaint is noise about the first.
  assert.equal(
    problems(
      `title: A deck
${CAST}slides:
  - slide:
      title: One
      world:
        entities:
          basket: A basket
          payment:
            label: Payment
            child: ./payment.yaml
        relations:
          - basket -> payment
    say:
      - enter: payment
`,
      {
        "payment.yaml": `bullets: [taken]
say:
  - speech: "Inside."
    narrator: mehta
`,
      },
    )[0],
    'slide 1, slide.world.entities.payment.child.say.0: module "payment.yaml": names narrator ' +
      '"mehta", which the deck does not declare (declared: ada, meta)',
  );
});

/* -------------------------------------------------------- the shipped deck */

test("the two-voice example alternates, and comes back", () => {
  const path = join(repositoryRoot(), "examples", "aside.yaml");
  const presentation = parsePresentation(readFileSync(path, "utf8"), path);

  assert.deepEqual(
    [...presentation.narrators.values()],
    [
      { id: "reader", voice: "af_heart", speed: 1 },
      { id: "aside", voice: "bm_george", speed: 1 },
    ],
  );

  // The perceptual claim, as a fact about the source: primary, other, primary — on the first
  // slide by one cue saying so, and on the second by the slide saying so and one cue disagreeing.
  const spoken = presentation.slides.map((slide) =>
    slide.say.flatMap((cue) => (cue.kind === "speech" ? [cue.narrator] : [])),
  );
  assert.deepEqual(spoken, [
    ["reader", "aside", "reader", "reader"],
    ["aside", "reader", "aside"],
  ]);

  // Two voices that are actually two voices. An example whose narrators shared a voice would
  // render identically to a deck with no cast at all and would prove nothing by ear.
  const voices = new Set([...presentation.narrators.values()].map((n) => n.voice));
  assert.equal(voices.size, 2);
});
