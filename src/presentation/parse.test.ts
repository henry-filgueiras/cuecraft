import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { chooseLayout } from "../render/layout.ts";
import { repositoryRoot } from "../tts/model.ts";
import { CHANGE_ELEMENT_ID } from "./body.ts";
import { SourceError } from "./source.ts";
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

  // The canonical deck uses the cue grammar, and its first slide is anchored — so the
  // matrix archetype's activation treatment is exercised by real content, not only by the
  // index archetype further down.
  assert.deepEqual(
    first.say.map((cue) => cue.kind),
    ["speech", "speech", "speech"],
  );
  assert.equal(
    first.say.filter((cue) => cue.kind === "speech" && cue.activates !== undefined)
      .length,
    1,
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
    [
      'slide 1, slide: unknown field "bulletz" (allowed: title, bullets, steps, code, change, world, figure, formula, series)',
    ],
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
    { kind: "speech", scope: "root", text: "Two lines of prose." },
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
    { kind: "speech", scope: "root", text: "First phrase." },
    { kind: "pause", scope: "root", milliseconds: 400 },
    { kind: "speech", scope: "root", text: "Second phrase." },
    { kind: "pause", scope: "root", milliseconds: 1500 },
    { kind: "speech", scope: "root", text: "Third." },
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
    {
      kind: "speech",
      scope: "root",
      text: "Which tool ran.",
      activates: "tool",
      address: "root/tool",
    },
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
    /^slide 1, narration cue 1: unknown key "emphasise" on a speech cue \(allowed: speech, activates, fills, pronounce\)$/,
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

/**
 * Quoted specimens and derived changes.
 *
 * The reader is injected throughout, so every one of these is deterministic and never touches
 * the disk — the repository boundary itself is proven in `source.test.ts`.
 */

const QUOTED_DECK_FILE = `title: Another deck

slides:
  - slide:
      title: "Quoted"
      bullets:
        - id: tools
          text: Run tools

    say:
      - speech: "They run tools."
        activates: tools
`;

/** Parses with one file available to quote, and nothing else. */
function withFile(source: string, files: Record<string, string> = {}) {
  return parsePresentation(source, "test.yaml", {
    read: (file) => {
      const text = files[file] ?? (file === "other.yaml" ? QUOTED_DECK_FILE : undefined);
      if (text === undefined) throw new SourceError(`file "${file}" does not exist`);
      return text;
    },
  });
}

function quotedProblems(source: string, files: Record<string, string> = {}) {
  try {
    withFile(source, files);
  } catch (error) {
    assert.ok(error instanceof PresentationError, `unexpected error: ${String(error)}`);
    return error.problems;
  }
  assert.fail("expected the source to be rejected");
}

const QUOTING_DECK = `title: A deck
slides:
  - slide:
      title: One
      code:
        file: other.yaml
        slide: "Quoted"
        marks:
          - id: link
            line: "activates:"
    say:
      - speech: "Look here."
        activates: link
`;

test("a specimen may quote a repository file instead of carrying a copy of it", () => {
  const body = withFile(QUOTING_DECK).slides[0]?.body;
  assert.ok(body?.kind === "code");
  // Verbatim, dedented, and the language came from the file rather than from the author.
  assert.equal(body.language, "yaml");
  assert.equal(
    body.source,
    [
      "slide:",
      '  title: "Quoted"',
      "  bullets:",
      "    - id: tools",
      "      text: Run tools",
      "",
      "say:",
      '  - speech: "They run tools."',
      "    activates: tools",
    ].join("\n"),
  );
});

test("a mark on a quoted specimen is the drift detector", () => {
  // The file no longer says what the mark names, which is exactly the silent staleness
  // quoting exists to prevent — so it is loud instead.
  const drifted = QUOTED_DECK_FILE.replace("        activates: tools\n", "");
  assert.deepEqual(quotedProblems(QUOTING_DECK, { "other.yaml": drifted }), [
    'slide 1, slide.code.marks.0: line "activates:" does not appear in this slide\'s code',
  ]);
});

test("a quote that cannot be resolved names the slide and the reason", () => {
  assert.match(
    quotedProblems(QUOTING_DECK.replace('slide: "Quoted"', 'slide: "Missing"'))[0] ?? "",
    /^slide 1, slide\.code: file "other\.yaml" has no slide titled "Missing"/,
  );
  assert.match(
    quotedProblems(QUOTING_DECK.replace("file: other.yaml", "file: gone.yaml"))[0] ?? "",
    /^slide 1, slide\.code: file "gone\.yaml" does not exist/,
  );
});

test("a specimen is written here or quoted, never both, and never neither", () => {
  assert.match(
    quotedProblems(
      QUOTING_DECK.replace('        slide: "Quoted"', '        source: "x"'),
    )[0] ?? "",
    /has both "source" and "file"/,
  );
  assert.match(
    quotedProblems(`title: A deck
slides:
  - slide:
      title: One
      code:
        language: yaml
    say: Hello.
`)[0] ?? "",
    /^slide 1, slide\.code: must be /,
  );
});

test("a quoted specimen may not also claim a language", () => {
  assert.match(
    quotedProblems(
      QUOTING_DECK.replace(
        "        file: other.yaml",
        "        language: yaml\n        file: other.yaml",
      ),
    )[0] ?? "",
    /^slide 1, slide\.code\.language: is derived from the quoted file's extension/,
  );
});

const CHANGE_DECK = `title: A deck
slides:
  - slide:
      title: One
      change:
        before:
          language: yaml
          source: |
            say:
              - "Words."
        after:
          file: other.yaml
          slide: "Quoted"
    say:
      - speech: "It changed."
        activates: change
`;

test("a change carries two states and nothing about what differs between them", () => {
  const presentation = withFile(CHANGE_DECK);
  const slide = presentation.slides[0];
  assert.ok(slide !== undefined);
  assert.equal(slide.body.kind, "change");
  assert.equal(chooseLayout(slide), "revision");
});

test("a change declares the identity nobody typed", () => {
  const slide = withFile(CHANGE_DECK).slides[0];
  assert.ok(slide !== undefined);
  // One derived element, reachable by narration through exactly the machinery a bullet uses.
  assert.deepEqual(
    bodyElements(slide.body).map((element) => element.id),
    [CHANGE_ELEMENT_ID],
  );
});

test("the derived identity is scoped to its slide and statically checkable", () => {
  // Spelled wrong: the error lists what the slide actually declares, exactly as it would
  // for a mistyped bullet id. Nothing about this identity is global or implicit.
  assert.deepEqual(
    quotedProblems(CHANGE_DECK.replace("activates: change", "activates: changed")),
    [
      'slide 1, narration cue 1: activates "changed", which nothing on this slide declares (declared: change)',
    ],
  );

  // And a slide with no change does not declare it.
  assert.match(
    problems(`title: A deck
slides:
  - slide:
      title: One
      bullets: [a]
    say:
      - speech: "Hi."
        activates: change
`)[0] ?? "",
    /activates "change", which nothing on this slide declares/,
  );
});

test("a change between two identical states is rejected rather than rendered", () => {
  assert.match(
    quotedProblems(`title: A deck
slides:
  - slide:
      title: One
      change:
        before:
          language: yaml
          source: |
            say: "Words."
        after:
          language: yaml
          source: |
            say: "Words."
    say: Nothing happened.
`)[0] ?? "",
    /^slide 1, slide\.change: before and after are the same source/,
  );
});

test("a change says what is compared, never how the comparison should look", () => {
  assert.match(
    quotedProblems(
      CHANGE_DECK.replace("        after:", "        highlight: red\n        after:"),
    )[0] ?? "",
    /unknown key "highlight".*which lines differ is derived, not authored/,
  );
  assert.match(
    quotedProblems(CHANGE_DECK.replace(/        after:\n.*\n.*\n/, ""))[0] ?? "",
    /^slide 1, slide\.change\.after: is required/,
  );
});

test("a slide's content is one thing, and a change is one of the things it can be", () => {
  assert.match(
    quotedProblems(
      CHANGE_DECK.replace("      change:", "      bullets: [a]\n      change:"),
    )[0] ?? "",
    /has "bullets" and "change"/,
  );
});

const NARROWING_DECK = `title: A deck
slides:
  - slide:
      title: One
      code:
        file: other.yaml
        slide: "Quoted"
        opens: "say:"
        marks:
          - id: link
            line: "activates:"
    say:
      - speech: "Look here."
        activates: link
`;

test("a quoted specimen may narrow to the construct the story is about", () => {
  const body = withFile(NARROWING_DECK).slides[0]?.body;
  assert.ok(body?.kind === "code");
  // Only the construct, and nothing of the slide around it.
  assert.equal(
    body.source,
    ["say:", '  - speech: "They run tools."', "    activates: tools"].join("\n"),
  );
});

test("narrowing failures name the slide and never fall back to more source", () => {
  assert.match(
    quotedProblems(NARROWING_DECK.replace('opens: "say:"', 'opens: "steps:"'))[0] ?? "",
    /^slide 1, slide\.code: no line of slide "Quoted" of "other\.yaml" opens with "steps:"/,
  );
  assert.match(
    quotedProblems(NARROWING_DECK.replace('opens: "say:"', 'opens: "- "'))[0] ?? "",
    /^slide 1, slide\.code: "- " matches 2 lines of/,
  );
});

test("marks resolve against the narrowed region, not the slide it came from", () => {
  // `title:` is in the slide but not in the `say:` construct, so a mark naming it is a dangling
  // reference rather than a silently wider specimen.
  assert.match(
    quotedProblems(NARROWING_DECK.replace('line: "activates:"', 'line: "title:"'))[0] ??
      "",
    /^slide 1, slide\.code\.marks\.0: line "title:" does not appear/,
  );
});

test("a specimen written out has nothing left to select", () => {
  assert.match(
    quotedProblems(`title: A deck
slides:
  - slide:
      title: One
      code:
        language: yaml
        opens: "say:"
        source: |
          say: "Words."
    say: Hello.
`)[0] ?? "",
    /^slide 1, slide\.code\.opens: selects a region of a file/,
  );
});

const NARROWED_CHANGE = `title: A deck
slides:
  - slide:
      title: One
      change:
        before:
          language: yaml
          source: |
            say:
              - speech: "They run tools."
        after:
          file: other.yaml
          slide: "Quoted"
          opens: "say:"
    say:
      - speech: "It changed."
        activates: change
`;

test("a change narrows the same way, and still derives its own endpoint", () => {
  const slide = withFile(NARROWED_CHANGE).slides[0];
  assert.ok(slide !== undefined && slide.body.kind === "change");
  assert.equal(slide.body.after.split("\n").length, 3);
  assert.deepEqual(
    bodyElements(slide.body).map((element) => element.id),
    [CHANGE_ELEMENT_ID],
  );
});

test("two states may not select two different constructs", () => {
  // cuecraft does not work out that one revision's `say:` is another's `narration:`. A stable
  // selector is the narrow, checkable version of that guarantee.
  assert.match(
    quotedProblems(`title: A deck
slides:
  - slide:
      title: One
      change:
        before:
          file: other.yaml
          slide: "Quoted"
          opens: "bullets:"
        after:
          file: other.yaml
          slide: "Quoted"
          opens: "say:"
    say:
      - speech: "It changed."
        activates: change
`)[0] ?? "",
    /selects "bullets:" before and "say:" after; both states must name the same construct/,
  );
});

test("two regions with no line in common are a replacement, not a change", () => {
  // The signature of a mis-selection: rendering it as a diff would claim a correspondence
  // between the two states that is not there.
  assert.match(
    quotedProblems(`title: A deck
slides:
  - slide:
      title: One
      change:
        before:
          language: yaml
          source: |
            first: 1
        after:
          language: yaml
          source: |
            second: 2
    say:
      - speech: "It changed."
        activates: change
`)[0] ?? "",
    /before and after have no line in common; that is a replacement rather than a change/,
  );
});

const WORLD_DECK = `
title: A deck
slides:
  - slide:
      title: A world
      world:
        entities:
          source: The source you write
          speech: Speech, measured here
          video: One video file
        relations:
          - source -> speech
          - speech -> video
    say:
      - speech: It starts here.
        activates: source
      - speech: And ends here.
        activates: video
`;

test("a world is a body, and its entities are what narration can reach", () => {
  const presentation = parsePresentation(WORLD_DECK, "test.yaml");
  const [slide] = presentation.slides;
  assert.ok(slide !== undefined);
  assert.equal(slide.body.kind, "world");
  assert.equal(chooseLayout(slide), "atlas");

  // The same seam every other body resolves through: an anchor is an index into this list,
  // and adding the fifth role needed no change to anchoring, timing or validation.
  assert.deepEqual(
    bodyElements(slide.body).map((element) => element.id),
    ["source", "speech", "video"],
  );
});

test("a cue reaching an entity nobody declared is reported with the entities that exist", () => {
  const reported = problems(WORLD_DECK.replace("activates: video", "activates: audio"));
  assert.equal(reported.length, 1);
  assert.match(reported[0] ?? "", /activates "audio"/);
  assert.match(reported[0] ?? "", /declared: source, speech, video/);
});

test("a world is one of the body keys, not an addition to them", () => {
  const reported = problems(
    WORLD_DECK.replace("      world:", "      bullets: [a]\n      world:"),
  );
  assert.match(reported[0] ?? "", /"bullets" and "world"/);
});

test("a malformed world is reported under the key that holds it", () => {
  const reported = problems(WORLD_DECK.replace("speech -> video", "speech -> nowhere"));
  assert.match(reported[0] ?? "", /world\.relations\.1/);
  assert.match(reported[0] ?? "", /no entity declares/);
});

const INTERIOR_DECK = `
title: A deck
slides:
  - slide:
      title: A world
      world:
        entities:
          source: The source you write
          anchors:
            label: Semantic anchors
            detail:
              steps:
                - id: cue
                  text: A sentence
                - id: link
                  text: The thing it names
          video: One video file
        relations:
          - source -> anchors
          - anchors -> video
    say:
      - speech: It starts here.
        activates: source
      - speech: A sentence.
        activates: cue
      - speech: And what it names.
        activates: link
      - speech: And out again.
        activates: video
`;

test("an entity may have an inside, and narration reaches into it by name", () => {
  const presentation = parsePresentation(INTERIOR_DECK, "test.yaml");
  const [slide] = presentation.slides;
  assert.ok(slide !== undefined && slide.body.kind === "world");

  // The interior is an ordinary slide body, resolved by the same code paths as a slide's.
  const anchors = slide.body.entities.find((entity) => entity.id === "anchors");
  assert.equal(anchors?.detail?.kind, "steps");

  // And its elements are reachable exactly as an entity is: one flat list, one index.
  assert.deepEqual(
    bodyElements(slide.body).map((element) => element.id),
    ["source", "anchors", "video", "cue", "link"],
  );
});

test("an interior may not contain another world", () => {
  const nested = INTERIOR_DECK.replace(
    "              steps:\n                - id: cue\n                  text: A sentence\n                - id: link\n                  text: The thing it names",
    "              world:\n                entities:\n                  a: A\n                  b: B\n                relations:\n                  - a -> b",
  );
  const reported = problems(nested);
  assert.match(reported[0] ?? "", /a world written here cannot contain a world/);
});

test("an identity inside an entity is scoped to the slide like every other one", () => {
  const reported = problems(INTERIOR_DECK.replace("activates: link", "activates: linkk"));
  assert.match(reported[0] ?? "", /activates "linkk"/);
  assert.match(reported[0] ?? "", /declared: source, anchors, video, cue, link/);
});

test("a specimen inside an entity is quoted through the same reader as one on a slide", () => {
  const quoting = INTERIOR_DECK.replace(
    "              steps:\n                - id: cue\n                  text: A sentence\n                - id: link\n                  text: The thing it names",
    '              code:\n                file: examples/witnessglass.yaml\n                slide: "Coding agents are black boxes"\n                marks:\n                  - id: cue\n                    line: "id: tools"\n                  - id: link\n                    line: "activates:"',
  );
  const presentation = parsePresentation(quoting, "test.yaml");
  const world = presentation.slides[0]?.body;
  assert.ok(world?.kind === "world");
  const detail = world.entities.find((entity) => entity.id === "anchors")?.detail;
  assert.ok(detail?.kind === "code");
  assert.match(detail.source, /activates: tools/);
});

const OBSERVATORY = `
title: A deck
slides:
  - slide:
      title: A world
      world:
        entities:
          intent: What you meant
          timing:
            label: Derived timing
            detail:
              figure: timing
          video: This video
        relations:
          - intent -> timing
          - timing -> video
    say:
      - speech: It starts here.
        activates: intent
      - speech: And it is measured.
        activates: timing
      - speech: And out it comes.
        activates: video
`;

test("an entity's inside may be the compilation's own facts", () => {
  const presentation = parsePresentation(OBSERVATORY, "test.yaml");
  const body = presentation.slides[0]?.body;
  assert.ok(body?.kind === "world");
  const timing = body.entities.find((entity) => entity.id === "timing");
  assert.deepEqual(timing?.detail, { kind: "figure", figure: "timing" });

  // A figure reaches nothing, so the only identities on this slide are its entities.
  assert.deepEqual(
    bodyElements(body).map((element) => element.id),
    ["intent", "timing", "video"],
  );
});

test("a figure names a kind from a closed set, and mistyping one says what the set is", () => {
  const reported = problems(OBSERVATORY.replace("figure: timing", "figure: timings"));
  assert.match(reported[0] ?? "", /unknown figure "timings"/);
  assert.match(reported[0] ?? "", /one of timing, anchors/);
});

test("a figure is a body in its own right, not only an interior", () => {
  const asSlide = parsePresentation(
    "title: A deck\nslides:\n  - slide:\n      title: Timing\n      figure: anchors\n    say: Here it is.\n",
    "test.yaml",
  );
  assert.deepEqual(asSlide.slides[0]?.body, { kind: "figure", figure: "anchors" });
  assert.equal(chooseLayout(asSlide.slides[0]!), "figure");
});

test("a figure cannot name anything the compiler did not offer", () => {
  // No path syntax, no expression, no field. The only thing an author may say is which kind.
  const reported = problems(
    "title: A deck\nslides:\n  - slide:\n      title: T\n      figure:\n        clip: 3\n    say: Hi.\n",
  );
  assert.match(reported[0] ?? "", /must be one of timing, anchors/);
});
