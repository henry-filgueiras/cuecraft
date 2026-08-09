import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { compilePresentation } from "./compile/compile.ts";
import { buildTimeline } from "./compile/timeline.ts";
import { parsePresentation } from "./presentation/parse.ts";
import { describeRecalls, parseInvocation, readVersion, UsageError } from "./cli.ts";

test("no arguments prints help", () => {
  assert.deepEqual(parseInvocation([]), { kind: "help" });
});

test("--help and --version are recognised", () => {
  assert.deepEqual(parseInvocation(["--help"]), { kind: "help" });
  assert.deepEqual(parseInvocation(["--version"]), { kind: "version" });
});

test("render defaults its output path", () => {
  assert.deepEqual(parseInvocation(["render", "talk.yaml"]), {
    kind: "render",
    input: "talk.yaml",
    output: "presentation.mp4",
    quiet: false,
  });
});

test("render accepts an explicit output path", () => {
  for (const argv of [
    ["render", "talk.yaml", "-o", "out.mp4"],
    ["render", "talk.yaml", "--output", "out.mp4"],
  ]) {
    assert.deepEqual(parseInvocation(argv), {
      kind: "render",
      input: "talk.yaml",
      output: "out.mp4",
      quiet: false,
    });
  }
});

test("unknown commands and missing input are usage errors", () => {
  assert.throws(() => parseInvocation(["compile", "talk.yaml"]), UsageError);
  assert.throws(() => parseInvocation(["render"]), UsageError);
  assert.throws(() => parseInvocation(["render", "a.yaml", "b.yaml"]), UsageError);
});

test("the reported version comes from the package manifest", () => {
  assert.match(readVersion(), /^\d+\.\d+\.\d+/);
});

test("speak defaults its output path and leaves voice and speed unset", () => {
  assert.deepEqual(parseInvocation(["speak", "Good evening."]), {
    kind: "speak",
    text: "Good evening.",
    output: "speech.wav",
  });
});

test("speak accepts an output path, a voice, and a speed", () => {
  assert.deepEqual(
    parseInvocation([
      "speak",
      "Good evening.",
      "-o",
      "tmp/hello.wav",
      "--voice",
      "bm_george",
      "--speed",
      "1.25",
    ]),
    {
      kind: "speak",
      text: "Good evening.",
      output: "tmp/hello.wav",
      voice: "bm_george",
      speed: 1.25,
    },
  );
});

test("speak leaves voice and speed validation to the synthesis seam", () => {
  // The CLI must not grow a second, subtly different notion of a valid request; an
  // unknown voice has to fail the same way whether it arrives from argv or from code.
  const invocation = parseInvocation(["speak", "hi", "--voice", "af_nonexistent"]);
  assert.deepEqual(invocation, {
    kind: "speak",
    text: "hi",
    output: "speech.wav",
    voice: "af_nonexistent",
  });
});

test("speak rejects a non-numeric speed and unquoted text", () => {
  assert.throws(() => parseInvocation(["speak", "hi", "--speed", "fast"]), UsageError);
  assert.throws(() => parseInvocation(["speak"]), UsageError);
  assert.throws(() => parseInvocation(["speak", "Good", "evening."]), UsageError);
});

test("voices takes no arguments", () => {
  assert.deepEqual(parseInvocation(["voices"]), { kind: "voices" });
  assert.throws(() => parseInvocation(["voices", "af_heart"]), UsageError);
});

test("render can be quietened for scripts and CI", () => {
  assert.deepEqual(parseInvocation(["render", "talk.yaml", "--quiet"]), {
    kind: "render",
    input: "talk.yaml",
    output: "presentation.mp4",
    quiet: true,
  });
  assert.deepEqual(parseInvocation(["render", "-q", "talk.yaml"]), {
    kind: "render",
    input: "talk.yaml",
    output: "presentation.mp4",
    quiet: true,
  });
});

test("a recall is reported with both timecodes, and silence when there is none", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "cuecraft-cli-"));
  try {
    const timeline = buildTimeline(
      await compilePresentation(
        parsePresentation(
          `title: A deck
defaults:
  pre_say: 500ms
  post_say: 900ms
slides:
  - slide:
      title: One
      bullets: [{ id: settlement, text: Settled }]
    say:
      - speech: Twenty characters!!!
        activates: settlement
  - slide: { title: Two, bullets: [a thing] }
    say:
      - speech: Ten chars.
      - recall: settlement
`,
          "test.yaml",
        ),
        {
          workspace,
          synthesize: async (request) => {
            await writeFile(request.output, "not really a wav");
            return {
              durationSeconds: request.text.length / 5,
              leadingSilenceSeconds: 0.3,
              voice: "af_heart",
              speed: 1,
            };
          },
        },
      ),
    );

    const reported = describeRecalls(timeline);
    assert.match(reported, /slide 2 recalls "settlement" from slide 1/);
    assert.match(reported, /replays 00:00\.5 for 4\.0s/);

    assert.equal(
      describeRecalls({ ...timeline, scenes: [] }),
      "",
      "a deck that never recalls says nothing",
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
