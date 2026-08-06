import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { chooseLayout } from "../render/layout.ts";
import { repositoryRoot } from "../tts/model.ts";
import {
  bodyElements,
  DEFAULT_MIN_SLIDE_MS,
  DEFAULT_POST_SAY_MS,
  DEFAULT_PRE_SAY_MS,
  parsePresentation,
  PresentationError,
  spokenText,
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
  assert.equal(first.body.kind === "bullets" ? first.body.items.length : 0, 4);
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

  // And it keeps exercising semantic anchors, which is the only place they are proven
  // against real content rather than a fixture.
  const anchored = presentation.slides.find((slide) =>
    bodyElements(slide.body).some((element) => element.id !== undefined),
  );
  assert.ok(anchored !== undefined, "no slide in the canonical deck carries anchors");
  const declared = bodyElements(anchored.body).flatMap((element) =>
    element.id === undefined ? [] : [element.id],
  );
  const reached = anchored.say.flatMap((cue) =>
    cue.kind === "speech" && cue.activates !== undefined ? [cue.activates] : [],
  );
  assert.deepEqual(
    reached,
    declared,
    "every declared identity should be reached, in order",
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

test("a slide need not have a body at all", () => {
  const presentation = parsePresentation(
    "title: A deck\nslides:\n  - slide: { title: One }\n    say: Hello.\n",
    "test.yaml",
  );
  assert.deepEqual(presentation.slides[0]?.body, { kind: "none" });

  // An empty list is the same thing said differently, and must not reach the renderer as a
  // body with nothing in it.
  const empty = parsePresentation(
    "title: A deck\nslides:\n  - slide: { title: One, bullets: [] }\n    say: Hello.\n",
    "test.yaml",
  );
  assert.deepEqual(empty.slides[0]?.body, { kind: "none" });
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
    ['slide 1, slide: unknown field "bulletz" (allowed: title, bullets, steps, code)'],
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
    /^slide 1, narration cue 2: a pause cue takes no other keys$/,
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

test("a bullet may carry a semantic identity, or stay a plain string", () => {
  const presentation = parsePresentation(
    `
title: A deck
slides:
  - slide:
      title: One
      bullets:
        - id: tool
          text: Which tool ran
        - How long it took
    say:
      - speech: "Which tool ran."
        activates: tool
`,
    "test.yaml",
  );
  assert.deepEqual(presentation.slides[0]?.body, {
    kind: "bullets",
    items: [{ text: "Which tool ran", id: "tool" }, { text: "How long it took" }],
  });
  assert.deepEqual(presentation.slides[0]?.say, [
    { kind: "speech", text: "Which tool ran.", activates: "tool" },
  ]);
});

test("a speech cue without an anchor is the same as a bare string", () => {
  const withObject = parsePresentation(
    'title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - speech: "Hello."\n',
    "test.yaml",
  );
  const withString = parsePresentation(
    'title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - "Hello."\n',
    "test.yaml",
  );
  assert.deepEqual(withObject.slides[0]?.say, withString.slides[0]?.say);
});

test("activating an identity no bullet declares is an error", () => {
  assert.deepEqual(
    problems(`
title: A deck
slides:
  - slide:
      title: One
      bullets:
        - id: tool
          text: Which tool ran
    say:
      - speech: "Timing."
        activates: timing
`),
    [
      'slide 1, narration cue 1: activates "timing", which nothing on this slide declares (declared: tool)',
    ],
  );

  assert.match(
    String(
      problems(
        'title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - speech: "Hi."\n        activates: nope\n',
      )[0],
    ),
    /this slide declares no ids$/,
  );
});

test("two bullets may not claim the same identity", () => {
  assert.deepEqual(
    problems(`
title: A deck
slides:
  - slide:
      title: One
      bullets:
        - id: tool
          text: First
        - id: tool
          text: Second
    say: Hello.
`),
    ['slide 1, slide.bullets.1: duplicate id "tool"; item 1 already uses it'],
  );
});

test("two cues may not activate the same identity", () => {
  assert.deepEqual(
    problems(`
title: A deck
slides:
  - slide:
      title: One
      bullets:
        - id: tool
          text: First
    say:
      - speech: "Once."
        activates: tool
      - speech: "Twice."
        activates: tool
`),
    ['slide 1, narration cue 2: activates "tool", which an earlier cue already reaches'],
  );
});

test("identifiers are kebab-case and start with a letter", () => {
  for (const id of ["Tool", "1st", "tool_name", "tool name", "-tool", "tool-"]) {
    const source =
      "title: A deck\nslides:\n  - slide:\n      title: One\n      bullets:\n" +
      `        - id: ${JSON.stringify(id)}\n          text: First\n    say: Hello.\n`;
    assert.match(
      String(problems(source)[0]),
      /must be lower-case letters, digits and hyphens/,
      `${JSON.stringify(id)} was accepted`,
    );
  }

  // And the ones that should work.
  const ok = parsePresentation(
    "title: A deck\nslides:\n  - slide:\n      title: One\n      bullets:\n" +
      '        - id: "semantic-context-2"\n          text: First\n    say: Hello.\n',
    "test.yaml",
  );
  assert.equal(
    bodyElements(ok.slides[0]?.body ?? { kind: "none" })[0]?.id,
    "semantic-context-2",
  );
});

test("a per-occurrence pronunciation replaces only that word, for synthesis only", () => {
  const presentation = parsePresentation(
    `
title: A deck
slides:
  - slide: { title: One }
    say:
      - speech: "WitnessGlass records the records."
        pronounce:
          records: rekords
`,
    "test.yaml",
  );
  const [cue] = presentation.slides[0]?.say ?? [];
  assert.ok(cue !== undefined && cue.kind === "speech");

  // The authored text is untouched; only what is spoken changes.
  assert.equal(cue.text, "WitnessGlass records the records.");
  assert.equal(spokenText(cue), "WitnessGlass rekords the rekords.");
});

test("a pronunciation for a word that is not in the cue is a mistake", () => {
  assert.deepEqual(
    problems(
      'title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - speech: "Hello there."\n        pronounce:\n          records: rekords\n',
    ),
    ["slide 1, narration cue 1: pronounce.records does not appear in this cue's speech"],
  );
});

test("pronunciation substitution does not corrupt neighbouring words", () => {
  const presentation = parsePresentation(
    'title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - speech: "It re-records recordings, and records."\n        pronounce:\n          records: rekords\n',
    "test.yaml",
  );
  const [cue] = presentation.slides[0]?.say ?? [];
  assert.ok(cue !== undefined && cue.kind === "speech");
  // "recordings" must not be touched; "re-records" contains a whole-word "records".
  assert.equal(spokenText(cue), "It re-rekords recordings, and rekords.");
});

test("unknown keys on a speech cue are rejected", () => {
  assert.match(
    String(
      problems(
        'title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - speech: "Hi."\n        emphasise: loud\n',
      )[0],
    ),
    /^slide 1, narration cue 1: unknown key "emphasise" on a speech cue \(allowed: speech, activates, pronounce\)$/,
  );
});

/**
 * The three bodies, and the failures that would otherwise be silent.
 *
 * A mark that resolves to the wrong region is the failure worth guarding hardest: the video
 * still renders, still looks deliberate, and emphasises the wrong lines while the narration
 * says something else.
 */

const SPECIMEN_DECK = `
title: A deck
slides:
  - slide:
      title: One slide
      code:
        language: yaml
        source: |
          slide:
            title: "A title"

          say:
            - "Some words."
        marks:
          - id: content
            line: "slide:"
          - id: narration
            line: "say:"
    say:
      - speech: "What is on the slide,"
        activates: content
      - speech: "and what to say about it."
        activates: narration
`;

test("a slide's content can be code, with marks narration reaches", () => {
  const presentation = parsePresentation(SPECIMEN_DECK, "test.yaml");
  const body = presentation.slides[0]?.body;
  assert.equal(body?.kind, "code");
  assert.equal(body?.kind === "code" ? body.language : undefined, "yaml");
  assert.deepEqual(body?.kind === "code" ? body.marks : undefined, [
    { id: "content", line: "slide:" },
    { id: "narration", line: "say:" },
  ]);
  assert.equal(chooseLayout(presentation.slides[0]!), "specimen");

  // Marks are anchor targets exactly as bullets are.
  assert.deepEqual(
    bodyElements(presentation.slides[0]!.body).map((element) => element.id),
    ["content", "narration"],
  );
});

test("a code block keeps its whitespace, because the whitespace is the content", () => {
  const body = parsePresentation(SPECIMEN_DECK, "test.yaml").slides[0]?.body;
  assert.ok(body?.kind === "code");
  assert.equal(body.source, 'slide:\n  title: "A title"\n\nsay:\n  - "Some words."\n');
});

test("a slide's content can be steps, which are bullets making a different claim", () => {
  const presentation = parsePresentation(
    `title: A deck
slides:
  - slide:
      title: One
      steps:
        - id: speech
          text: Speech
        - Timing
    say:
      - speech: "First it speaks."
        activates: speech
`,
    "test.yaml",
  );
  assert.deepEqual(presentation.slides[0]?.body, {
    kind: "steps",
    items: [{ text: "Speech", id: "speech" }, { text: "Timing" }],
  });
  assert.equal(chooseLayout(presentation.slides[0]!), "cascade");
});

test("a slide says what its content is once, not twice", () => {
  const error = problemsFrom(
    `title: A deck
slides:
  - slide:
      title: One
      bullets: [a]
      steps: [b]
    say: Hello.
`,
  );
  assert.equal(error.length, 1);
  assert.match(error[0] ?? "", /"bullets" and "steps"/);
});

test("a language cuecraft cannot set is refused rather than set plainly", () => {
  assert.deepEqual(
    problemsFrom(
      `title: A deck
slides:
  - slide:
      title: One
      code: { language: python, source: "x = 1" }
    say: Hello.
`,
    ),
    [
      "slide 1, slide.code.language: must be one of yaml; cuecraft bundles one grammar and would otherwise set your code unhighlighted",
    ],
  );
});

test("a mark that points at nothing is an error, not an unhighlighted slide", () => {
  const problems = problemsFrom(
    `title: A deck
slides:
  - slide:
      title: One
      code:
        language: yaml
        source: |
          a: 1
        marks:
          - id: ghost
            line: "b:"
    say: Hello.
`,
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? "", /"b:" does not appear/);
});

test("an ambiguous mark is an error, because it would emphasise a guess", () => {
  const problems = problemsFrom(
    `title: A deck
slides:
  - slide:
      title: One
      code:
        language: yaml
        source: |
          a: 1
          b: 1
        marks:
          - id: both
            line: "1"
    say: Hello.
`,
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? "", /matches 2 lines/);
});

test("two marks may not claim the same identity", () => {
  const problems = problemsFrom(
    `title: A deck
slides:
  - slide:
      title: One
      code:
        language: yaml
        source: |
          a: 1
          b: 2
        marks:
          - id: same
            line: "a:"
          - id: same
            line: "b:"
    say: Hello.
`,
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? "", /duplicate id "same"/);
});

test("a malformed mark is reported as a mark, not as invalid input", () => {
  const problems = problemsFrom(
    `title: A deck
slides:
  - slide:
      title: One
      code:
        language: yaml
        source: |
          a: 1
        marks:
          - id: "Not Kebab"
            line: "a:"
          - { id: fine, line: "a:", colour: red }
    say: Hello.
`,
  );
  assert.equal(problems.length, 2);
  assert.match(problems[0] ?? "", /id must be lower-case letters/);
  assert.match(problems[1] ?? "", /unknown key "colour"/);
});

test("narration may not activate an identity a code block never declares", () => {
  const problems = problemsFrom(
    `title: A deck
slides:
  - slide:
      title: One
      code:
        language: yaml
        source: |
          a: 1
        marks:
          - id: here
            line: "a:"
    say:
      - speech: "There."
        activates: elsewhere
`,
  );
  assert.equal(problems.length, 1);
  assert.match(
    problems[0] ?? "",
    /which nothing on this slide declares \(declared: here\)/,
  );
});

function problemsFrom(source: string): readonly string[] {
  try {
    parsePresentation(source, "test.yaml");
  } catch (error) {
    assert.ok(error instanceof PresentationError);
    return error.problems;
  }
  assert.fail("expected the source to be rejected");
}
