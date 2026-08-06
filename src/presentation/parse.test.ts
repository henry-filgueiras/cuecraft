import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { chooseLayout } from "../render/layout.ts";
import { repositoryRoot } from "../tts/model.ts";
import {
  DEFAULT_MIN_SLIDE_MS,
  DEFAULT_POST_SAY_MS,
  DEFAULT_PRE_SAY_MS,
  parsePresentation,
  PresentationError,
} from "./parse.ts";

const MINIMAL = `
title: A deck
slides:
  - slide:
      title: One
      bullets: [first, second]
    say: Hello there.
`;

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

test("the canonical example parses", () => {
  const path = join(repositoryRoot(), "examples", "witnessglass.yaml");
  const presentation = parsePresentation(readFileSync(path, "utf8"), path);

  assert.equal(presentation.title, "WitnessGlass: What Did the Agent Actually Do?");
  assert.equal(presentation.slides.length, 4);

  const [first, second] = presentation.slides;
  assert.ok(first !== undefined && second !== undefined);
  assert.equal(first.ordinal, 1);
  assert.equal(second.ordinal, 2);
  assert.equal(first.title, "Coding agents are black boxes");
  assert.equal(first.bullets.length, 4);
  assert.equal(first.preSayMs, 750);
  assert.equal(first.postSayMs, 1200);

  // The deck is the design laboratory: its slides must keep selecting different
  // compositions, or it stops exercising what it exists to exercise.
  assert.deepEqual(presentation.slides.map(chooseLayout), [
    "matrix",
    "statement",
    "index",
    "lead",
  ]);

  // The canonical deck uses the cue grammar: speech, a pause, then more speech.
  assert.deepEqual(
    first.say.map((cue) => cue.kind),
    ["speech", "pause", "speech"],
  );
});

test("defaults apply where the source is silent", () => {
  const presentation = parsePresentation(MINIMAL, "test.yaml");
  const [slide] = presentation.slides;
  assert.ok(slide !== undefined);
  assert.equal(slide.preSayMs, DEFAULT_PRE_SAY_MS);
  assert.equal(slide.postSayMs, DEFAULT_POST_SAY_MS);
  assert.equal(slide.minSlideMs, DEFAULT_MIN_SLIDE_MS);
  assert.equal(presentation.speed, 1);
  assert.equal(presentation.voice, undefined);
  assert.deepEqual(presentation.warnings, []);
});

test("a slide may override deck defaults", () => {
  const presentation = parsePresentation(
    `
title: A deck
defaults:
  pre_say: 1s
  post_say: 1s
slides:
  - slide: { title: One }
    say: Hello.
  - slide: { title: Two }
    say: Goodbye.
    pre_say: 2s
`,
    "test.yaml",
  );
  assert.deepEqual(
    presentation.slides.map((slide) => [slide.preSayMs, slide.postSayMs]),
    [
      [1000, 1000],
      [2000, 1000],
    ],
  );
});

test("bullets are optional", () => {
  const presentation = parsePresentation(
    "title: A deck\nslides:\n  - slide: { title: One }\n    say: Hello.\n",
    "test.yaml",
  );
  assert.deepEqual(presentation.slides[0]?.bullets, []);
});

test("delivery instructions are accepted but reported as inert", () => {
  const presentation = parsePresentation(
    `${MINIMAL}defaults:\n  instructions: "Warm and slow."\n`,
    "test.yaml",
  );
  assert.equal(presentation.warnings.length, 1);
  assert.match(String(presentation.warnings[0]), /no effect/);
});

test("malformed YAML is reported as such", () => {
  assert.throws(
    () => parsePresentation("title: [unclosed\n", "test.yaml"),
    (error: unknown) =>
      error instanceof PresentationError && /not valid YAML/.test(error.message),
  );
});

test("empty input is rejected", () => {
  for (const source of ["", "\n\n", "# just a comment\n"]) {
    assert.throws(() => parsePresentation(source, "test.yaml"), PresentationError);
  }
});

test("a deck needs a title and at least one slide", () => {
  assert.deepEqual(problems("slides: []\ntitle: A deck\n"), [
    "slides: must list at least one slide",
  ]);
  assert.match(
    String(problems("slides:\n  - slide: {title: A}\n    say: Hi.\n")[0]),
    /^title: is required/,
  );
});

test("a missing slide title names the slide", () => {
  assert.deepEqual(
    problems(`
title: A deck
slides:
  - slide: { title: Fine }
    say: Hello.
  - slide: { bullets: [a] }
    say: Hello.
`),
    ["slide 2, slide.title: is required (expected string)"],
  );
});

test("missing narration names the slide", () => {
  assert.deepEqual(problems("title: A deck\nslides:\n  - slide: { title: One }\n"), [
    "slide 1, say: is required",
  ]);
});

test("empty strings are rejected wherever prose is expected", () => {
  assert.deepEqual(
    problems(`
title: A deck
slides:
  - slide:
      title: "  "
      bullets: ["ok", ""]
    say: "   "
`),
    [
      "slide 1, slide.title: must not be empty",
      "slide 1, slide.bullets.1: must not be empty",
      "slide 1, say: must not be empty",
    ],
  );
});

test("bullets must be a list of strings", () => {
  assert.match(
    String(
      problems(
        "title: A deck\nslides:\n  - slide: { title: One, bullets: nope }\n    say: Hi.\n",
      )[0],
    ),
    /^slide 1, slide\.bullets: /,
  );
  assert.match(
    String(
      problems(
        "title: A deck\nslides:\n  - slide: { title: One, bullets: [{a: 1}] }\n    say: Hi.\n",
      )[0],
    ),
    /^slide 1, slide\.bullets\.0: /,
  );
});

test("timing values must be durations, not bare numbers", () => {
  assert.deepEqual(
    problems(`
title: A deck
defaults:
  pre_say: 750
slides:
  - slide: { title: One }
    say: Hello.
`),
    ['defaults.pre_say: must be a duration like "750ms", "1.5s" or "2s"'],
  );
});

test("unknown fields are typos, not extensions", () => {
  assert.deepEqual(
    problems(`
title: A deck
slides:
  - slide:
      title: One
      bulletz: [a]
    say: Hello.
`),
    ['slide 1, slide: unknown field "bulletz" (allowed: title, bullets)'],
  );

  assert.deepEqual(
    problems(`
title: A deck
duration: 30s
slides:
  - slide: { title: One }
    say: Hello.
`),
    ['presentation: unknown field "duration" (allowed: title, defaults, slides)'],
  );

  assert.match(
    String(
      problems(
        "title: A deck\ndefaults:\n  voise: af_heart\nslides:\n  - slide: {title: One}\n    say: Hi.\n",
      )[0],
    ),
    /^defaults: unknown field "voise" \(allowed: pre_say, post_say, min_slide_duration, voice, speed, instructions\)$/,
  );
});

test("every problem is reported, not just the first", () => {
  assert.equal(
    problems(`
title: A deck
slides:
  - slide: { bullets: [a] }
    say: ""
  - slide: { title: Two }
    say: Hello.
    post_say: soon
`).length,
    3,
  );
});

test("a scalar say is shorthand for one speech cue", () => {
  const presentation = parsePresentation(
    "title: A deck\nslides:\n  - slide: { title: One }\n    say: |\n      Two lines\n      of prose.\n",
    "test.yaml",
  );
  // Line breaks are a reading convenience, not an instruction: a newline is not a pause.
  assert.deepEqual(presentation.slides[0]?.say, [
    { kind: "speech", text: "Two lines of prose." },
  ]);
});

test("a cue list becomes speech and pauses in order", () => {
  const presentation = parsePresentation(
    `
title: A deck
slides:
  - slide: { title: One }
    say:
      - "First phrase."
      - pause: 400ms
      - "Second phrase."
      - pause: 1.5s
      - "Third."
`,
    "test.yaml",
  );
  assert.deepEqual(presentation.slides[0]?.say, [
    { kind: "speech", text: "First phrase." },
    { kind: "pause", milliseconds: 400 },
    { kind: "speech", text: "Second phrase." },
    { kind: "pause", milliseconds: 1500 },
    { kind: "speech", text: "Third." },
  ]);
});

test("a bad cue is reported by its position, counting from one", () => {
  assert.deepEqual(
    problems(`
title: A deck
slides:
  - slide: { title: One }
    say:
      - "Fine."
      - pause: soon
      - "Also fine."
`),
    ['slide 1, narration cue 2: pause must be a duration like "750ms", "1.5s" or "2s"'],
  );

  assert.match(
    String(
      problems(
        'title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - "Fine."\n      - silence: 400ms\n',
      )[0],
    ),
    /^slide 1, narration cue 2: unknown cue "silence"/,
  );

  assert.match(
    String(
      problems(
        "title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - 42\n",
      )[0],
    ),
    /^slide 1, narration cue 1: must be narration text/,
  );
});

test("a pause cue takes no other keys", () => {
  assert.match(
    String(
      problems(
        'title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - "Hi."\n      - {pause: 400ms, voice: af_heart}\n',
      )[0],
    ),
    /^slide 1, narration cue 2: unknown cue/,
  );
});

test("zero-length pauses are rejected as almost certainly a mistake", () => {
  assert.deepEqual(
    problems(
      'title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - "Hi."\n      - pause: 0ms\n',
    ),
    ["slide 1, narration cue 2: pause must be longer than zero"],
  );
});

test("narration that is only silence is rejected", () => {
  assert.deepEqual(
    problems(
      "title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - pause: 400ms\n",
    ),
    ["slide 1, say: must contain something to say, not only pauses"],
  );
});

test("an empty cue list is rejected", () => {
  assert.deepEqual(
    problems("title: A deck\nslides:\n  - slide: {title: One}\n    say: []\n"),
    ["slide 1, say: must list at least one narration cue"],
  );
});

test("say must be text or cues, not something else entirely", () => {
  assert.match(
    String(
      problems("title: A deck\nslides:\n  - slide: {title: One}\n    say: {a: 1}\n")[0],
    ),
    /^slide 1, say: must be narration text/,
  );
});
