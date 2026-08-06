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

test("narration files are named by slide, zero-padded so they sort", () => {
  assert.equal(narrationFileName({ ordinal: 1 }), "slide-01.wav");
  assert.equal(narrationFileName({ ordinal: 12 }), "slide-12.wav");
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
  assert.equal(slide.narration.durationSeconds, 4);
  assert.equal(slide.narration.src, "narration/slide-01.wav");
  assert.equal(slide.sceneMs, 500 + 4000 + 1000);
  assert.deepEqual(slide.bullets, ["a", "b"]);

  // The audio must exist where the composition will look for it.
  assert.equal(join(compiled.publicDir, slide.narration.src), slide.narration.path);
  assert.equal(await readFile(slide.narration.path, "utf8"), "not really a wav");
});

test("deck-wide voice and speed reach the narrator", async () => {
  const seen: Array<{ voice: string | undefined; speed: number | undefined }> = [];
  const synthesize: SynthesizeNarration = async (request) => {
    seen.push({ voice: request.voice, speed: request.speed });
    await writeFile(request.output, "");
    return {
      durationSeconds: 1,
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
    "slide-01.wav",
    "slide-02.wav",
  ]);

  // Re-render a deck that lost a slide. Without content addressing (decision:3), the only
  // safe answer is to leave nothing behind that could be picked up by mistake.
  const shorter = parsePresentation(
    "title: A deck\nslides:\n  - slide: { title: One }\n    say: Alpha.\n",
    "test.yaml",
  );
  await compilePresentation(shorter, { workspace: path, synthesize: fakeNarrator() });
  assert.deepEqual(await readdir(narrationDir), ["slide-01.wav"]);
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
