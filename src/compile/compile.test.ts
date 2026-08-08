import assert from "node:assert/strict";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { parsePresentation } from "../presentation/parse.ts";
import {
  compilePresentation,
  deriveSceneMs,
  narrationFileName,
  type SynthesizeNarration,
} from "./compile.ts";

/**
 * Compilation is tested against a stand-in narrator rather than Kokoro. The seam exists so
 * that the ordering constraint of dragon:1 can be exercised in milliseconds, on a machine
 * that has never downloaded the model.
 */

const workspaces: string[] = [];
after(() =>
  Promise.all(workspaces.map((path) => rm(path, { recursive: true, force: true }))),
);

async function workspace(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "cuecraft-compile-"));
  workspaces.push(path);
  return path;
}

/** Reports one second of speech per five characters, and writes a file to prove it ran. */
function fakeNarrator(): SynthesizeNarration & { calls: string[] } {
  const calls: string[] = [];
  const synthesize = async (request: {
    text: string;
    output: string;
    voice?: string;
    speed?: number;
  }) => {
    calls.push(request.text);
    await writeFile(request.output, "not really a wav");
    return {
      durationSeconds: request.text.length / 5,
      leadingSilenceSeconds: 0.3,
      voice: request.voice ?? "af_heart",
      speed: request.speed ?? 1,
    };
  };
  return Object.assign(synthesize, { calls });
}

test("scene duration is padding plus narration, floored by the minimum", () => {
  assert.equal(
    deriveSceneMs({
      minSlideMs: 3000,
      preSayMs: 750,
      narrationMs: 8000,
      postSayMs: 1200,
    }),
    9950,
  );
  assert.equal(
    deriveSceneMs({ minSlideMs: 3000, preSayMs: 750, narrationMs: 200, postSayMs: 1200 }),
    3000,
    "a very short line still gets a readable slide",
  );
  assert.equal(
    deriveSceneMs({ minSlideMs: 0, preSayMs: 0, narrationMs: 0, postSayMs: 0 }),
    0,
  );
});

test("narration files are named by slide and clip, zero-padded so they sort", () => {
  assert.equal(narrationFileName({ ordinal: 1 }, 1), "slide-01-01.wav");
  assert.equal(narrationFileName({ ordinal: 12 }, 3), "slide-12-03.wav");
});

test("every slide is synthesized exactly once, in order", async () => {
  const narrator = fakeNarrator();
  const presentation = parsePresentation(
    `
title: A deck
defaults:
  pre_say: 500ms
  post_say: 1s
slides:
  - slide: { title: One }
    say: Alpha.
  - slide: { title: Two }
    say: Beta beta.
`,
    "test.yaml",
  );

  const compiled = await compilePresentation(presentation, {
    workspace: await workspace(),
    synthesize: narrator,
  });

  assert.deepEqual(narrator.calls, ["Alpha.", "Beta beta."]);
  assert.equal(compiled.slides.length, 2);
  assert.equal(compiled.title, "A deck");
});

test("compiled slides carry their measured audio and derived duration", async () => {
  const narrator = fakeNarrator();
  const presentation = parsePresentation(
    "title: A deck\ndefaults:\n  pre_say: 500ms\n  post_say: 1s\nslides:\n" +
      "  - slide: { title: One, bullets: [a, b] }\n    say: Twenty characters!!!\n",
    "test.yaml",
  );

  const compiled = await compilePresentation(presentation, {
    workspace: await workspace(),
    synthesize: narrator,
  });

  const [slide] = compiled.slides;
  assert.ok(slide !== undefined);
  const [clip] = slide.narration.clips;
  assert.ok(clip !== undefined);
  assert.equal(slide.narration.durationSeconds, 4);
  assert.equal(clip.src, "narration/slide-01-01.wav");
  assert.equal(clip.offsetSeconds, 0);
  assert.equal(slide.sceneMs, 500 + 4000 + 1000);
  assert.deepEqual(slide.body, {
    kind: "bullets",
    items: [{ text: "a" }, { text: "b" }],
  });

  // The audio must exist where the composition will look for it.
  assert.equal(join(compiled.publicDir, clip.src), clip.path);
  assert.equal(await readFile(clip.path, "utf8"), "not really a wav");
});

test("deck-wide voice and speed reach the narrator", async () => {
  const seen: Array<{ voice: string | undefined; speed: number | undefined }> = [];
  const synthesize: SynthesizeNarration = async (request) => {
    seen.push({ voice: request.voice, speed: request.speed });
    await writeFile(request.output, "");
    return {
      durationSeconds: 1,
      leadingSilenceSeconds: 0.3,
      voice: request.voice ?? "af_heart",
      speed: request.speed ?? 1,
    };
  };

  await compilePresentation(
    parsePresentation(
      "title: A deck\ndefaults:\n  voice: bm_george\n  speed: 1.15\nslides:\n" +
        "  - slide: { title: One }\n    say: Hello.\n",
      "test.yaml",
    ),
    { workspace: await workspace(), synthesize },
  );

  assert.deepEqual(seen, [{ voice: "bm_george", speed: 1.15 }]);
});

test("stale narration from a previous render is cleared, not reused", async () => {
  const path = await workspace();
  const narrationDir = join(path, "public", "narration");

  const presentation = parsePresentation(
    "title: A deck\nslides:\n  - slide: { title: One }\n    say: Alpha.\n" +
      "  - slide: { title: Two }\n    say: Beta.\n",
    "test.yaml",
  );
  await compilePresentation(presentation, {
    workspace: path,
    synthesize: fakeNarrator(),
  });
  assert.deepEqual((await readdir(narrationDir)).sort(), [
    "slide-01-01.wav",
    "slide-02-01.wav",
  ]);

  // Re-render a deck that lost a slide. Without content addressing (decision:3), the only
  // safe answer is to leave nothing behind that could be picked up by mistake.
  const shorter = parsePresentation(
    "title: A deck\nslides:\n  - slide: { title: One }\n    say: Alpha.\n",
    "test.yaml",
  );
  await compilePresentation(shorter, { workspace: path, synthesize: fakeNarrator() });
  assert.deepEqual(await readdir(narrationDir), ["slide-01-01.wav"]);
});

test("a failing narrator fails the compile rather than producing a silent deck", async () => {
  await assert.rejects(
    compilePresentation(
      parsePresentation(
        "title: A deck\nslides:\n  - slide: { title: One }\n    say: Hello.\n",
        "test.yaml",
      ),
      {
        workspace: await workspace(),
        synthesize: () => Promise.reject(new Error("model exploded")),
      },
    ),
    /model exploded/,
  );
});

test("progress is reported per slide as narration lands", async () => {
  const seen: Array<[number, number]> = [];
  await compilePresentation(
    parsePresentation(
      "title: A deck\nslides:\n  - slide: { title: One }\n    say: Alpha.\n" +
        "  - slide: { title: Two }\n    say: Beta beta beta.\n",
      "test.yaml",
    ),
    {
      workspace: await workspace(),
      synthesize: fakeNarrator(),
      onProgress: (slide, narration) =>
        seen.push([slide.ordinal, narration.durationSeconds]),
    },
  );
  assert.deepEqual(seen, [
    [1, 1.2],
    [2, 3],
  ]);
});

test("each speech cue becomes its own clip, offset past the pauses before it", async () => {
  const narrator = fakeNarrator();
  const compiled = await compilePresentation(
    parsePresentation(
      `
title: A deck
slides:
  - slide: { title: One }
    say:
      - "Alpha."
      - pause: 500ms
      - "Beta beta."
`,
      "test.yaml",
    ),
    { workspace: await workspace(), synthesize: narrator },
  );

  // "Alpha." is 6 characters, so 1.2s; "Beta beta." is 10, so 2s.
  assert.deepEqual(narrator.calls, ["Alpha.", "Beta beta."]);
  const narration = compiled.slides[0]?.narration;
  assert.ok(narration !== undefined);
  assert.deepEqual(
    narration.clips.map((clip) => [clip.src, clip.offsetSeconds, clip.durationSeconds]),
    [
      ["narration/slide-01-01.wav", 0, 1.2],
      ["narration/slide-01-02.wav", 1.7, 2],
    ],
  );
  assert.equal(narration.durationSeconds, 3.7);
});

test("narration duration includes authored pauses, so timing accounts for silence", async () => {
  const source = (pause: string) =>
    `title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - "Alpha."\n      - pause: ${pause}\n      - "Beta."\n`;

  const [quick, slow] = await Promise.all([
    compilePresentation(parsePresentation(source("100ms"), "t.yaml"), {
      workspace: await workspace(),
      synthesize: fakeNarrator(),
    }),
    compilePresentation(parsePresentation(source("1s"), "t.yaml"), {
      workspace: await workspace(),
      synthesize: fakeNarrator(),
    }),
  ]);

  const difference =
    (slow.slides[0]?.narration.durationSeconds ?? 0) -
    (quick.slides[0]?.narration.durationSeconds ?? 0);
  assert.equal(Math.round(difference * 1000), 900);
  assert.equal(
    (slow.slides[0]?.sceneMs ?? 0) - (quick.slides[0]?.sceneMs ?? 0),
    900,
    "a pause must lengthen the slide, not be absorbed by it",
  );
});

test("a trailing pause extends the track past the last clip", async () => {
  const compiled = await compilePresentation(
    parsePresentation(
      'title: A deck\nslides:\n  - slide: {title: One}\n    say:\n      - "Alpha."\n      - pause: 800ms\n',
      "test.yaml",
    ),
    { workspace: await workspace(), synthesize: fakeNarrator() },
  );
  const narration = compiled.slides[0]?.narration;
  assert.ok(narration !== undefined);
  assert.equal(narration.clips.length, 1);
  assert.equal(narration.durationSeconds, 2);
});

test("a legacy scalar say still compiles to exactly one clip", async () => {
  const narrator = fakeNarrator();
  const compiled = await compilePresentation(
    parsePresentation(
      "title: A deck\nslides:\n  - slide: {title: One}\n    say: |\n      Ten chars.\n",
      "test.yaml",
    ),
    { workspace: await workspace(), synthesize: narrator },
  );
  assert.deepEqual(narrator.calls, ["Ten chars."]);
  assert.equal(compiled.slides[0]?.narration.clips.length, 1);
  assert.equal(compiled.slides[0]?.narration.durationSeconds, 2);
});

/* ------------------------------------------------------------- narrators */

/**
 * What was asked of the synthesizer, in order.
 *
 * The clip records say what came *back*; this says what went out, which is the only place the
 * per-cue voice choice is observable and therefore the only honest place to test it.
 */
function recordingNarrator(): SynthesizeNarration & {
  requests: { text: string; voice: string | undefined; speed: number | undefined }[];
} {
  const requests: {
    text: string;
    voice: string | undefined;
    speed: number | undefined;
  }[] = [];
  const synthesize = async (request: {
    text: string;
    output: string;
    voice?: string;
    speed?: number;
  }) => {
    requests.push({ text: request.text, voice: request.voice, speed: request.speed });
    await writeFile(request.output, "not really a wav");
    return {
      durationSeconds: request.text.length / 5,
      leadingSilenceSeconds: 0.3,
      voice: request.voice ?? "af_heart",
      speed: request.speed ?? 1,
    };
  };
  return Object.assign(synthesize, { requests });
}

const DUET = `title: A deck
narrators:
  ada: { voice: af_heart }
  meta: { voice: am_adam, speed: 0.9 }
defaults:
  narrator: ada
slides:
  - slide: { title: One }
    say:
      - "Alpha."
      - speech: "Beta."
        narrator: meta
      - "Gamma."
`;

test("each cue is synthesized in its own narrator's voice, and the next cue is not", async () => {
  const narrator = recordingNarrator();
  const compiled = await compilePresentation(parsePresentation(DUET, "test.yaml"), {
    workspace: await workspace(),
    synthesize: narrator,
  });

  assert.deepEqual(narrator.requests, [
    { text: "Alpha.", voice: "af_heart", speed: 1 },
    { text: "Beta.", voice: "am_adam", speed: 0.9 },
    { text: "Gamma.", voice: "af_heart", speed: 1 },
  ]);

  // And the compiled record says who, not only what it sounded like.
  const clips = compiled.slides[0]?.narration.clips ?? [];
  assert.deepEqual(
    clips.map((clip) => [clip.narrator, clip.voice, clip.speed]),
    [
      ["ada", "af_heart", 1],
      ["meta", "am_adam", 0.9],
      ["ada", "af_heart", 1],
    ],
  );
});

test("changing who speaks changes nothing about when anything happens", async () => {
  // The invariant of the whole feature. Two decks with the same words and different speakers must
  // produce the same track: same clips, same offsets, same scene length. Narration is one totally
  // ordered stream and a narrator is not allowed to be a second clock.
  const plain = `title: A deck
narrators:
  ada: { voice: af_heart }
  meta: { voice: am_adam }
defaults:
  narrator: ada
slides:
  - slide: { title: One }
    say:
      - "Alpha."
      - "Beta."
      - "Gamma."
`;
  const alternating = plain.replace(
    '      - "Beta."\n',
    '      - speech: "Beta."\n        narrator: meta\n',
  );

  const [one, two] = await Promise.all(
    [plain, alternating].map(async (source) =>
      compilePresentation(parsePresentation(source, "test.yaml"), {
        workspace: await workspace(),
        synthesize: fakeNarrator(),
      }),
    ),
  );

  const track = (compiled: typeof one) =>
    (compiled?.slides[0]?.narration.clips ?? []).map((clip) => [
      clip.ordinal,
      clip.text,
      clip.offsetSeconds,
      clip.durationSeconds,
      clip.src,
    ]);

  assert.deepEqual(track(two), track(one));
  assert.equal(two?.slides[0]?.sceneMs, one?.slides[0]?.sceneMs);
  assert.equal(
    two?.slides[0]?.narration.durationSeconds,
    one?.slides[0]?.narration.durationSeconds,
  );

  // Different in exactly one respect.
  assert.deepEqual(
    (two?.slides[0]?.narration.clips ?? []).map((clip) => clip.narrator),
    ["ada", "meta", "ada"],
  );
});

test("a deck with no cast sends exactly what it always sent", async () => {
  const narrator = recordingNarrator();
  await compilePresentation(
    parsePresentation(
      "title: A deck\ndefaults:\n  voice: bm_george\nslides:\n" +
        "  - slide: { title: One }\n    say: Hello.\n",
      "test.yaml",
    ),
    { workspace: await workspace(), synthesize: narrator },
  );

  assert.deepEqual(narrator.requests, [{ text: "Hello.", voice: "bm_george", speed: 1 }]);
});

test("a narrator the presentation does not declare fails the compile rather than picking one", async () => {
  // Unreachable through the parser, which rejects it with the cast listed. Reachable by building a
  // Presentation by hand, and a compiler that quietly synthesized the deck's voice instead would be
  // shipping the wrong film.
  const presentation = parsePresentation(
    "title: A deck\nslides:\n  - slide: { title: One }\n    say: Hello.\n",
    "test.yaml",
  );
  const forged = {
    ...presentation,
    slides: presentation.slides.map((slide) => ({
      ...slide,
      say: slide.say.map((cue) =>
        cue.kind === "speech" ? { ...cue, narrator: "ghost" } : cue,
      ),
    })),
  };

  await assert.rejects(
    compilePresentation(forged, {
      workspace: await workspace(),
      synthesize: fakeNarrator(),
    }),
    /names narrator "ghost"/,
  );
});
