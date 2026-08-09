import assert from "node:assert/strict";
import { test } from "node:test";

import type { SlideBody } from "../presentation/parse.ts";
import { childScope, ROOT_SCOPE } from "../presentation/scope.ts";
import { anchorAt, around, clipAt } from "./facts.ts";
import type { CompiledPresentation, CompiledSlide, SpeechClip } from "./compile.ts";
import { buildTimeline, DEFAULT_FPS } from "./timeline.ts";

/**
 * What the compiler is willing to say about itself.
 *
 * The property under test throughout is the one that makes this safe rather than clever: the
 * facts are a *function of* a finished timeline and can never be an input to one. So the tests
 * that matter most are not about the numbers — they are about a deck compiling identically
 * whether or not it looks at them.
 */

function clip(index: number, seconds: number, text: string): SpeechClip {
  return {
    ordinal: index + 1,
    text,
    path: `/tmp/${index}.wav`,
    src: `narration/${index}.wav`,
    offsetSeconds: 0,
    durationSeconds: seconds,
    leadingSilenceSeconds: 0.3,
    scope: ROOT_SCOPE,
    voice: "af_heart",
    speed: 1,
  };
}

function deck(
  body: SlideBody,
  activates: readonly (string | undefined)[],
): CompiledPresentation {
  const words = ["First sentence.", "Second sentence.", "Third sentence."];
  const durations = [2, 3.5, 1.25];
  let offset = 0;
  const clips = words.map((text, index) => {
    const made = {
      ...clip(index, durations[index] as number, text),
      offsetSeconds: offset,
    };
    offset += durations[index] as number;
    const reached = activates[index];
    return reached === undefined
      ? made
      : { ...made, activates: reached, address: childScope(ROOT_SCOPE, reached) };
  });

  const slide: CompiledSlide = {
    ordinal: 1,
    title: "A slide",
    body,
    say: words.map((text) => ({ kind: "speech", scope: ROOT_SCOPE, text }) as const),
    preSayMs: 500,
    postSayMs: 900,
    minSlideMs: 3000,
    modules: [],
    sceneMs: 0,
    narration: {
      clips,
      calls: [],
      dwells: [],
      recalls: [],
      durationSeconds: offset,
      voice: "af_heart",
      speed: 1,
    },
  };
  return { title: "A deck", slides: [slide], publicDir: "/tmp/public", subtitles: false };
}

const WORLD: SlideBody = {
  kind: "world",
  entities: [
    { id: "one", text: "One" },
    { id: "two", text: "Two", detail: { kind: "figure", figure: "timing" } },
  ],
  relations: [{ from: "one", to: "two" }],
};

const timeline = buildTimeline(deck(WORLD, ["one", "two", undefined]));
const facts = timeline.facts;

test("every synthesized sentence is a fact, in the order it is heard", () => {
  assert.deepEqual(
    facts.clips.map((entry) => [entry.ordinal, entry.text, entry.seconds]),
    [
      [1, "First sentence.", 2],
      [2, "Second sentence.", 3.5],
      [3, "Third sentence.", 1.25],
    ],
  );
  assert.equal(facts.fps, DEFAULT_FPS);
  assert.equal(facts.totalFrames, timeline.totalFrames);
  assert.ok(Math.abs(facts.totalSeconds - timeline.totalFrames / DEFAULT_FPS) < 1e-9);
});

test("a clip's frames are the frames the timeline placed it on, not a restatement", () => {
  const placed = timeline.scenes[0]?.clips ?? [];
  assert.deepEqual(
    facts.clips.map((entry) => [entry.from, entry.durationInFrames]),
    placed.map((entry) => [entry.from, entry.durationInFrames]),
  );
});

test("every resolved relationship is a fact, ordered by when it becomes true", () => {
  assert.deepEqual(
    facts.anchors.map((anchor) => [anchor.id, anchor.clipOrdinal, anchor.frame]),
    [
      ["one", 1, timeline.scenes[0]?.anchors[0]?.frame],
      ["two", 2, timeline.scenes[0]?.anchors[1]?.frame],
    ],
  );
  // Each carries the sentence that reached it: the authored half of the pair.
  assert.equal(facts.anchors[0]?.text, "First sentence.");
  assert.equal(facts.anchors[1]?.text, "Second sentence.");
});

test("facts are frozen, and so are the collections in them", () => {
  assert.ok(Object.isFrozen(facts));
  assert.ok(Object.isFrozen(facts.clips));
  assert.ok(Object.isFrozen(facts.anchors));
});

/* ------------------------------------------------------ the invariant that matters */

test("a deck that reads its compilation compiles exactly like one that does not", () => {
  // The acyclicity claim, stated as an identity. A figure contributes no elements and no text,
  // so every number the facts describe is the same number it would have been without them.
  const withFigure = buildTimeline(deck(WORLD, ["one", "two", undefined]));
  const plain: SlideBody = {
    kind: "world",
    entities: [
      { id: "one", text: "One" },
      { id: "two", text: "Two" },
    ],
    relations: [{ from: "one", to: "two" }],
  };
  const without = buildTimeline(deck(plain, ["one", "two", undefined]));

  assert.equal(withFigure.totalFrames, without.totalFrames);
  assert.deepEqual(withFigure.scenes[0]?.clips, without.scenes[0]?.clips);
  assert.deepEqual(withFigure.scenes[0]?.anchors, without.scenes[0]?.anchors);
  assert.deepEqual(withFigure.facts, without.facts);
});

test("a figure declares nothing narration could reach, which is what closes the loop", () => {
  const bare = buildTimeline(
    deck({ kind: "figure", figure: "anchors" }, [undefined, undefined, undefined]),
  );
  assert.deepEqual(bare.scenes[0]?.anchors, []);
  assert.equal(bare.facts.anchors.length, 0);
  assert.equal(bare.facts.clips.length, 3, "the narration is still measured");
});

/* --------------------------------------------------------------- current-moment lookup */

test("the clip being heard is the one that has started most recently", () => {
  const [first, second, third] = facts.clips;
  assert.ok(first !== undefined && second !== undefined && third !== undefined);
  assert.equal(
    clipAt(facts, first.from),
    first,
    "a clip counts from its own first frame",
  );
  assert.equal(clipAt(facts, second.from - 1), first);
  assert.equal(clipAt(facts, second.from), second);
  assert.equal(
    clipAt(facts, timeline.totalFrames),
    third,
    "the tail belongs to the last clip",
  );
  assert.equal(clipAt(facts, -1), undefined, "before the first, there is none");
});

test("a pause belongs to the sentence before it, not to nothing", () => {
  const [first, second] = facts.clips;
  assert.ok(first !== undefined && second !== undefined);
  const gap = first.from + first.durationInFrames + 1;
  if (gap < second.from) assert.equal(clipAt(facts, gap), first);
});

test("the relationship in force is the one that resolved most recently", () => {
  const [first, second] = facts.anchors;
  assert.ok(first !== undefined && second !== undefined);
  assert.equal(anchorAt(facts, first.frame - 1), undefined);
  assert.equal(anchorAt(facts, first.frame), first);
  assert.equal(anchorAt(facts, second.frame + 500), second);
});

/* ------------------------------------------------------------------- the projection */

test("a neighbourhood is a window, and it does not run off either end", () => {
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  assert.deepEqual(around(items, 5, 3), { items: [4, 5, 6], offset: 4 });
  assert.deepEqual(around(items, 0, 3), { items: [0, 1, 2], offset: 0 });
  assert.deepEqual(around(items, 9, 3), { items: [7, 8, 9], offset: 7 });
  // Fewer than the window asks for is all of them, unshifted.
  assert.deepEqual(around([1, 2], 0, 5), { items: [1, 2], offset: 0 });
});

test("the window keeps the current item in a stable place while it can", () => {
  // A list that re-centres on every step reads as churn. Between the ends the offset advances
  // one at a time, so a row moves up by one rather than the whole table jumping.
  const items = Array.from({ length: 12 }, (_, index) => index);
  const offsets = items.map((_, index) => around(items, index, 5).offset);
  for (let index = 1; index < offsets.length; index += 1) {
    const step = (offsets[index] as number) - (offsets[index - 1] as number);
    assert.ok(step === 0 || step === 1, `window jumped by ${step}`);
  }
});
