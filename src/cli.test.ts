import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { compilePresentation } from "./compile/compile.ts";
import { buildTimeline } from "./compile/timeline.ts";
import { parsePresentation } from "./presentation/parse.ts";
import { SYMBOLS_FORMAT, SYMBOLS_VERSION, type SymbolTable } from "./compile/symbols.ts";
import {
  describeMismatch,
  describeRecalls,
  describeUnverified,
  fileNameFor,
  parseInvocation,
  readVersion,
  USAGE,
  UsageError,
} from "./cli.ts";

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

test("inspect takes a symbols file, and optionally one kind", () => {
  assert.deepEqual(parseInvocation(["inspect", "out/deck.symbols.json"]), {
    kind: "inspect",
    symbols: "out/deck.symbols.json",
  });
  assert.deepEqual(parseInvocation(["inspect", "s.json", "--kind", "slide"]), {
    kind: "inspect",
    symbols: "s.json",
    only: "slide",
  });
  assert.throws(() => parseInvocation(["inspect"]), UsageError);
  assert.throws(
    () => parseInvocation(["inspect", "s.json", "--kind", "scene"]),
    UsageError,
  );
});

test("snapshot needs a key, and finds its symbols beside the video by default", () => {
  assert.deepEqual(
    parseInvocation(["snapshot", "out/deck.mp4", "--symbol", "slide:intro"]),
    {
      kind: "snapshot",
      video: "out/deck.mp4",
      symbol: "slide:intro",
    },
  );
  assert.deepEqual(
    parseInvocation([
      "snapshot",
      "out/deck.mp4",
      "--symbol",
      "slide:intro",
      "--symbols",
      "elsewhere.json",
      "-o",
      "intro.png",
    ]),
    {
      kind: "snapshot",
      video: "out/deck.mp4",
      symbol: "slide:intro",
      symbols: "elsewhere.json",
      output: "intro.png",
    },
  );
  assert.throws(() => parseInvocation(["snapshot", "out/deck.mp4"]), UsageError);
});

test("snapshots defaults its directory and takes every symbol unless filtered", () => {
  assert.deepEqual(parseInvocation(["snapshots", "out/deck.mp4"]), {
    kind: "snapshots",
    video: "out/deck.mp4",
    dir: "snapshots",
  });
  assert.deepEqual(
    parseInvocation(["snapshots", "out/deck.mp4", "--kind", "anchor", "-d", "frames"]),
    { kind: "snapshots", video: "out/deck.mp4", dir: "frames", only: "anchor" },
  );
});

test("a symbol key becomes a filename without escaping", () => {
  assert.equal(fileNameFor("slide:architecture"), "slide-architecture");
  assert.equal(
    fileNameFor("anchor:outside/payment/check"),
    "anchor-outside-payment-check",
  );
  assert.equal(fileNameFor("utterance:intro/3"), "utterance-intro-3");
});

test("the usage text advertises the symbol table", () => {
  assert.match(USAGE, /cuecraft inspect/);
  assert.match(USAGE, /cuecraft snapshots/);
  assert.match(USAGE, /symbol table beside the MP4/);
});

/** A symbol table with only the fields the provenance messages read. */
function tableNamed(file: string, renderId?: string): SymbolTable {
  return {
    format: SYMBOLS_FORMAT,
    version: SYMBOLS_VERSION,
    coordinates: { unit: "frame", interval: "[fromFrame, toFrame)", seconds: "derived" },
    presentation: { title: "A deck" },
    media: {
      file,
      ...(renderId === undefined ? {} : { renderId }),
      fps: 30,
      width: 1920,
      height: 1080,
      durationFrames: 100,
      durationSeconds: 3.333333,
    },
    symbols: [],
  };
}

const A = "a".repeat(64);
const B = "b".repeat(64);

/**
 * The basename check survives as the diagnostic, not the gate.
 *
 * "You pointed this at the wrong file" and "this film has been re-rendered since" produce the same
 * mismatched digest and have completely different fixes, and the only thing that can tell them
 * apart is whether the name the sidecar carries is the name of the film it was handed.
 */
test("a mismatch says which kind of wrong it is", () => {
  const rerendered = describeMismatch(
    "out/deck.mp4",
    "out/deck.symbols.json",
    tableNamed("deck.mp4", A),
    { verdict: "mismatched", symbols: A, film: B },
  );
  assert.match(rerendered, /describes a different render/);
  assert.match(rerendered, /no frame was extracted/);
  assert.match(rerendered, /re-rendered since/);
  assert.match(rerendered, /aaaaaaaaaaaa.*bbbbbbbbbbbb/, "both identities, shortened");
  assert.doesNotMatch(rerendered, new RegExp(A), "not the full sixty-four characters");

  const misaimed = describeMismatch(
    "out/other.mp4",
    "out/deck.symbols.json",
    tableNamed("deck.mp4", A),
    { verdict: "mismatched", symbols: A, film: B },
  );
  assert.match(misaimed, /written beside deck\.mp4.*pointed them at other\.mp4/s);
  assert.doesNotMatch(misaimed, /re-rendered since/);
});

test("an unverifiable pair names which artifact predates the check, and proceeds", () => {
  const noStamp = describeUnverified(
    "out/deck.mp4",
    "out/deck.symbols.json",
    tableNamed("deck.mp4", A),
    { verdict: "unknown", because: "film" },
  );
  assert.match(noStamp, /out\/deck\.mp4 carries no render stamp/);
  assert.match(noStamp, /Proceeding/);

  const noId = describeUnverified(
    "out/deck.mp4",
    "out/deck.symbols.json",
    tableNamed("deck.mp4"),
    { verdict: "unknown", because: "symbols" },
  );
  assert.match(noId, /carries no render id/);

  const neither = describeUnverified(
    "out/deck.mp4",
    "out/deck.symbols.json",
    tableNamed("deck.mp4"),
    { verdict: "unknown", because: "both" },
  );
  assert.match(neither, /neither .* nor .* carries a render stamp/);

  // The name disagreement is still worth saying when the digests cannot settle it.
  const misaimed = describeUnverified(
    "out/other.mp4",
    "out/deck.symbols.json",
    tableNamed("deck.mp4"),
    { verdict: "unknown", because: "both" },
  );
  assert.match(misaimed, /name deck\.mp4 rather than other\.mp4/);
});
