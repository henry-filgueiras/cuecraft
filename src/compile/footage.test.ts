import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { RRequest, RResult } from "../compute/r.ts";
import { parsePresentation, PresentationError } from "../presentation/parse.ts";
import { materializePresentation, MaterializeError } from "./materialize.ts";

/**
 * A film becoming an occupant of the narration track, without R and without ffmpeg.
 *
 * The runner is injected, so what is under test is cuecraft's own half of decision:64: which
 * disagreements between a deck and its program are refused, and what a `play:` lowers to once the
 * film has been measured. `../compute/mp4.test.ts` covers the measurement; `../compute/r.live-test.ts`
 * runs the boundary against a real interpreter.
 */

const workspaces: string[] = [];

async function scratch(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "cuecraft-footage-"));
  workspaces.push(path);
  return path;
}

after(async () => {
  for (const path of workspaces) await rm(path, { recursive: true, force: true });
});

const PROGRAM = 'cat("#cuecraft output video run run.mp4\\n")\n';

/** A deck whose second slide is an exhibit, with whatever narration the test wants over it. */
function deck(say: readonly string[]): ReturnType<typeof parsePresentation> {
  return parsePresentation(
    [
      "title: T",
      "slides:",
      "  - slide:",
      "      title: Before",
      '    say: "One."',
      "  - slide:",
      "      title: A run",
      "      exhibit:",
      "        run: run.R",
      "    say:",
      ...say.map((line) => `      ${line}`),
    ].join("\n"),
    "deck.yaml",
    {
      read: (file) => {
        if (file === "run.R") return PROGRAM;
        throw new Error(`file ${JSON.stringify(file)} does not exist in the repository`);
      },
    },
  );
}

/** A runner that hands back one declared output of whatever shape the test wants. */
function runner(
  output: Record<string, unknown>,
  moments: readonly { name: string; seconds: number }[] = [],
): (request: RRequest) => Promise<RResult> {
  return async (request) => {
    await mkdir(request.outputDir, { recursive: true });
    return {
      outputs: [
        {
          name: "run",
          file: "run.mp4",
          path: join(request.outputDir, "run.mp4"),
          bytes: 500_000,
          type: "video",
          durationSeconds: 8,
          width: 3312,
          height: 1104,
          hasAudio: false,
          ...output,
        } as never,
      ],
      regions: [],
      moments,
      notes: "",
      stderr: "",
      elapsedSeconds: 0.4,
    };
  };
}

async function materialize(
  presentation: ReturnType<typeof parsePresentation>,
  output: Record<string, unknown> = {},
  moments: readonly { name: string; seconds: number }[] = [],
): ReturnType<typeof materializePresentation> {
  return materializePresentation(presentation, {
    workspace: await scratch(),
    run: runner(output, moments),
  });
}

/** The lowered `play` cues of the exhibit slide, which is where the whole design lands. */
function slices(presentation: ReturnType<typeof parsePresentation>) {
  return (presentation.slides[1]?.say ?? []).filter((cue) => cue.kind === "play");
}

test("a played film becomes a slice covering the whole of it, at rate one", async () => {
  const { presentation, exhibits } = await materialize(
    deck(['- "Watch."', "- play: run"]),
  );

  assert.deepEqual(exhibits[0]?.resource, {
    kind: "footage",
    src: "exhibits/slide-02-run/run.mp4",
    name: "run",
    width: 3312,
    height: 1104,
    durationSeconds: 8,
    moments: [],
    bytes: 500_000,
  });
  assert.deepEqual(slices(presentation), [
    { kind: "play", scope: "root", source: "run", fromSeconds: 0, toSeconds: 8, rate: 1 },
  ]);
});

test("the narration around a film is left exactly as it was", async () => {
  const { presentation } = await materialize(
    deck(['- "Before."', "- play: run", "- pause: 400ms", '- "After."']),
  );

  assert.deepEqual(
    (presentation.slides[1]?.say ?? []).map((cue) => cue.kind),
    ["speech", "play", "pause", "speech"],
  );
});

test("a deck that plays what the program did not declare is refused", async () => {
  await assert.rejects(
    materialize(deck(['- "Watch."', "- play: kmeans"])),
    (error: unknown) =>
      error instanceof MaterializeError &&
      /plays "kmeans", and its program declared "run"/.test(error.message),
  );
});

test("a film nobody plays is refused, rather than shown as a still first frame", async () => {
  await assert.rejects(
    materialize(deck(['- "Watch."'])),
    (error: unknown) =>
      error instanceof MaterializeError && /no cue plays it/.test(error.message),
  );
});

test("playing a still is refused, and the message says what came back instead", async () => {
  await assert.rejects(
    materialize(deck(['- "Watch."', "- play: run"]), {
      type: "png",
      file: "run.png",
      width: 3312,
      height: 1104,
    }),
    (error: unknown) =>
      error instanceof MaterializeError &&
      /only a film can be played/.test(error.message) &&
      /a picture/.test(error.message),
  );
});

test("a film with a sound track is refused rather than muted", async () => {
  await assert.rejects(
    materialize(deck(['- "Watch."', "- play: run"]), { hasAudio: true }),
    (error: unknown) =>
      error instanceof MaterializeError &&
      /one producer of sound/.test(error.message) &&
      /-an/.test(error.message),
  );
});

test("a film longer than cuecraft will play is refused with the ceiling named", async () => {
  await assert.rejects(
    materialize(deck(['- "Watch."', "- play: run"]), { durationSeconds: 400 }),
    (error: unknown) =>
      error instanceof MaterializeError && /plays at most 150s/.test(error.message),
  );
});

test("a film cannot be given identities to show, because it declares none", async () => {
  const source = deck(['- "Watch."', "- play: run"]);
  const slide = source.slides[1];
  assert.ok(slide !== undefined && slide.body.kind === "exhibit");
  const withShows = {
    ...source,
    slides: [
      source.slides[0] as (typeof source.slides)[number],
      { ...slide, body: { ...slide.body, shows: ["centre"] } },
    ],
  };

  await assert.rejects(
    materialize(withShows),
    (error: unknown) =>
      error instanceof MaterializeError &&
      /a film declares no parts narration can point at/.test(error.message),
  );
});

test("a play cue over a slide with no exhibit is refused at parse", () => {
  assert.throws(
    () =>
      parsePresentation(
        [
          "title: T",
          "slides:",
          "  - slide:",
          "      title: Plain",
          "    say:",
          "      - play: run",
        ].join("\n"),
        "deck.yaml",
      ),
    (error: unknown) =>
      error instanceof PresentationError && /has no exhibit/.test(error.report()),
  );
});

test("one film cannot be played twice, because a second run would be a second clock", () => {
  assert.throws(
    () => deck(["- play: run", '- "Again."', "- play: run"]),
    (error: unknown) =>
      error instanceof PresentationError &&
      /an earlier cue already plays/.test(error.report()),
  );
});

test("a play cue takes no other key", () => {
  assert.throws(
    () => deck(["- play: run", "  rate: 0.5"]),
    (error: unknown) =>
      error instanceof PresentationError && /takes no other keys/.test(error.report()),
  );
});

test("a slide whose whole narration is a film is allowed, because a film is a clock", async () => {
  const { presentation } = await materialize(deck(["- play: run"]));

  assert.equal(slices(presentation).length, 1);
});

/* ----------------------------------------------------------- rendezvous */

const REACHES = [
  { name: "initialised", seconds: 1 },
  { name: "pass-1", seconds: 2 },
  { name: "pass-2", seconds: 3 },
  { name: "converged", seconds: 7 },
] as const;

/** A film that names four states, of which a deck usually talks about one. */
function annotated(say: readonly string[]) {
  return materialize(deck(say), {}, REACHES);
}

test("a moment nothing subscribes to does nothing at all", async () => {
  const { presentation, exhibits } = await annotated(['- "Watch."', "- play: run"]);

  assert.equal(
    (exhibits[0]?.resource as { moments: readonly unknown[] }).moments.length,
    4,
  );
  assert.deepEqual(
    slices(presentation).map((cue) => [cue.fromSeconds, cue.toSeconds]),
    [[0, 8]],
    "a densely annotated film that nobody holds is still one slice",
  );
});

test("a subscribed moment cuts the film exactly once, at its own local time", async () => {
  const { presentation } = await annotated([
    "- play: run",
    '- speech: "Look at that."',
    "  during: pass-2",
    '- "And on it goes."',
  ]);

  assert.deepEqual(
    (presentation.slides[1]?.say ?? []).map((cue) =>
      cue.kind === "play" ? `slice ${cue.fromSeconds}-${cue.toSeconds}` : cue.kind,
    ),
    ["slice 0-3", "speech", "slice 3-8", "speech"],
  );
});

test("the slices still consume exactly the whole film", async () => {
  const { presentation } = await annotated([
    "- play: run",
    '- speech: "One."',
    "  during: pass-1",
    '- speech: "Two."',
    "  during: converged",
  ]);

  const cut = slices(presentation);
  assert.deepEqual(
    cut.map((cue) => [cue.fromSeconds, cue.toSeconds]),
    [
      [0, 2],
      [2, 7],
      [7, 8],
    ],
  );
  assert.equal(
    cut.reduce(
      (total, cue) => total + ((cue.toSeconds ?? 0) - (cue.fromSeconds ?? 0)),
      0,
    ),
    8,
  );
});

test("several cues on one moment are one rendezvous, in the order the deck wrote them", async () => {
  const { presentation } = await annotated([
    "- play: run",
    '- speech: "First."',
    "  during: pass-2",
    "- pause: 400ms",
    '- speech: "Second."',
    "  during: pass-2",
    '- "After."',
  ]);

  assert.deepEqual(
    (presentation.slides[1]?.say ?? []).map((cue) =>
      cue.kind === "speech" ? cue.text : cue.kind,
    ),
    ["play", "First.", "pause", "Second.", "play", "After."],
    "one split, not two: the film stops once and both sentences are spoken there",
  );
});

test("a state the film does not reach is refused, and the message lists the ones it does", async () => {
  await assert.rejects(
    annotated(["- play: run", '- speech: "Look."', "  during: pass-9"]),
    (error: unknown) =>
      error instanceof MaterializeError &&
      /holds at "pass-9"/.test(error.message) &&
      /"initialised", "pass-1"/.test(error.message),
  );
});

test("holding two states in the order the film does not reach them is refused", async () => {
  await assert.rejects(
    annotated([
      "- play: run",
      '- speech: "Late."',
      "  during: converged",
      '- speech: "Early."',
      "  during: pass-1",
    ]),
    (error: unknown) =>
      error instanceof MaterializeError && /the other way round/.test(error.message),
  );
});

test("a moment past the end of the film is refused", async () => {
  await assert.rejects(
    materialize(deck(["- play: run"]), {}, [{ name: "late", seconds: 9 }]),
    (error: unknown) =>
      error instanceof MaterializeError &&
      /after the end of a 8.00s film/.test(error.message),
  );
});

test("a still that declares moments is refused, because it reaches none", async () => {
  await assert.rejects(
    materialize(
      deck(['- "Look."']),
      { type: "png", file: "run.png", width: 100, height: 100 },
      [{ name: "somehow", seconds: 1 }],
    ),
    (error: unknown) =>
      error instanceof MaterializeError && /a still reaches none/.test(error.message),
  );
});

test("a during cue with no film running is refused at parse", () => {
  assert.throws(
    () => deck(['- "Watch."', '- speech: "Look."', "  during: pass-2", "- play: run"]),
    (error: unknown) =>
      error instanceof PresentationError &&
      /no film is running here/.test(error.report()),
  );
});

test("a sentence between the film and its aside closes the region", () => {
  assert.throws(
    () =>
      deck([
        "- play: run",
        '- "Ordinary narration, after the film."',
        '- speech: "Too late."',
        "  during: pass-2",
      ]),
    (error: unknown) =>
      error instanceof PresentationError &&
      /no film is running here/.test(error.report()),
  );
});

/* --------------------------------------------------------------- replay */

test("a replay is an ordinary slice reaching backwards at a slower rate", async () => {
  const { presentation } = await annotated([
    "- play: run",
    '- speech: "Watch that again."',
    "  during: pass-2",
    "- replay: pass-1",
    '- speech: "There."',
    "  during: pass-2",
  ]);

  assert.deepEqual(
    (presentation.slides[1]?.say ?? []).map((cue) =>
      cue.kind === "play"
        ? `slice ${cue.fromSeconds}-${cue.toSeconds}@${cue.rate}`
        : cue.kind,
    ),
    ["slice 0-3@1", "speech", "slice 2-3@0.4", "speech", "slice 3-8@1"],
    "no replay survives the lowering; the timeline never sees one",
  );
});

test("a replay does not move the primary cursor", async () => {
  const { presentation } = await annotated([
    "- play: run",
    '- speech: "Again."',
    "  during: pass-2",
    "- replay: initialised",
  ]);

  const primary = slices(presentation).filter((cue) => cue.rate === 1);
  assert.deepEqual(
    primary.map((cue) => [cue.fromSeconds, cue.toSeconds]),
    [
      [0, 3],
      [3, 8],
    ],
    "the film is still cut once, and still consumes all of itself",
  );
});

test("a replay of a state the film has not reached yet is refused", async () => {
  await assert.rejects(
    annotated([
      "- play: run",
      '- speech: "Look."',
      "  during: pass-1",
      "- replay: converged",
    ]),
    (error: unknown) =>
      error instanceof MaterializeError && /already watched/.test(error.message),
  );
});

test("a replay of a state the film never names is refused", async () => {
  await assert.rejects(
    annotated([
      "- play: run",
      '- speech: "Look."',
      "  during: pass-2",
      "- replay: pass-9",
    ]),
    (error: unknown) =>
      error instanceof MaterializeError && /replays "pass-9"/.test(error.message),
  );
});

test("a replay outside an aside is refused at parse", () => {
  assert.throws(
    () => deck(["- play: run", "- replay: pass-1"]),
    (error: unknown) =>
      error instanceof PresentationError &&
      /nothing is being held here/.test(error.report()),
  );
});

test("a replay cue takes no other key, and there is no rate to write", () => {
  assert.throws(
    () => deck(["- play: run", "- replay: pass-1", "  rate: 0.2"]),
    (error: unknown) =>
      error instanceof PresentationError &&
      /would be setting a projection/.test(error.report()),
  );
});
