import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CompiledPresentation,
  CompiledSlide,
  NarrationCall,
  SpeechClip,
} from "./compile.ts";
import type { SlideBody } from "../presentation/parse.ts";
import { childScope, ROOT_SCOPE } from "../presentation/scope.ts";
import { buildTimeline, DEFAULT_FPS, framesFor } from "./timeline.ts";

function bodyOf(overrides: SlideOverrides): SlideBody {
  if (overrides.change !== undefined) {
    return {
      kind: "change",
      language: "yaml",
      before: overrides.change[0],
      after: overrides.change[1],
    };
  }
  if (overrides.steps !== undefined && overrides.steps.length > 0) {
    return { kind: "steps", items: overrides.steps };
  }
  if (overrides.bullets !== undefined && overrides.bullets.length > 0) {
    return { kind: "bullets", items: overrides.bullets };
  }
  return { kind: "none" };
}

type SlideOverrides = Omit<Partial<CompiledSlide>, "narration" | "body"> & {
  /** Convenience for the common body; becomes `{ kind: "bullets" }`, or `none` when empty. */
  bullets?: readonly { text: string; id?: string }[];
  steps?: readonly { text: string; id?: string }[];
  ordinal: number;
  /** Speech durations in seconds; pauses are expressed by the gaps in `offsets`. */
  speech?: readonly number[];
  offsets?: readonly number[];
  narrationSeconds?: number;
  leadingSilence?: number;
  /** Two source states, which become the one body whose elements the compiler derives. */
  change?: readonly [string, string];
  /** Per speech cue; an empty string means this cue reaches nothing. */
  activates?: readonly string[];
  /** Scope transitions, already measured, for the tests that assert on the call stack. */
  calls?: readonly NarrationCall[];
  modules?: readonly string[];
};

/**
 * A compiled slide whose narration is one clip of `narrationSeconds`, unless `speech` says
 * otherwise. Keeps the single-clip tests readable while letting the track tests be explicit.
 */
function slide(overrides: SlideOverrides): CompiledSlide {
  const durations = overrides.speech ?? [overrides.narrationSeconds ?? 4];
  let running = 0;
  const clips = durations.map((duration, index): SpeechClip => {
    const offset = overrides.offsets?.[index] ?? running;
    running = offset + duration;
    return {
      ordinal: index + 1,
      text: `clip ${index + 1}`,
      path: `/tmp/slide-${overrides.ordinal}-${index + 1}.wav`,
      src: `narration/slide-0${overrides.ordinal}-0${index + 1}.wav`,
      offsetSeconds: offset,
      durationSeconds: duration,
      leadingSilenceSeconds: overrides.leadingSilence ?? 0,
      scope: ROOT_SCOPE,
      ...(overrides.activates?.[index]
        ? {
            activates: overrides.activates[index] as string,
            address: childScope(ROOT_SCOPE, overrides.activates[index] as string),
          }
        : {}),
    };
  });

  return {
    ordinal: overrides.ordinal,
    title: overrides.title ?? `Slide ${overrides.ordinal}`,
    body: bodyOf(overrides),
    say: overrides.say ?? [{ kind: "speech", scope: ROOT_SCOPE, text: "Words." }],
    preSayMs: overrides.preSayMs ?? 750,
    postSayMs: overrides.postSayMs ?? 1200,
    minSlideMs: overrides.minSlideMs ?? 3000,
    modules: overrides.modules ?? [],
    sceneMs: overrides.sceneMs ?? 0,
    narration: {
      clips,
      calls: overrides.calls ?? [],
      durationSeconds: overrides.narrationSeconds ?? running,
      voice: "af_heart",
      speed: 1,
    },
  };
}

function presentation(slides: readonly CompiledSlide[]): CompiledPresentation {
  return { title: "A deck", slides, publicDir: "/tmp/public" };
}

test("a duration occupies every frame it touches", () => {
  assert.equal(framesFor(0, 30), 0);
  assert.equal(framesFor(1, 30), 30);
  assert.equal(framesFor(0.75, 30), 23, "22.5 frames must not be truncated to 22");
  assert.equal(framesFor(0.001, 30), 1, "a nonzero duration is never zero frames");
  assert.equal(framesFor(4.0333333, 30), 121);
});

test("nonsense conversions are refused rather than rounded", () => {
  for (const seconds of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => framesFor(seconds, 30), RangeError);
  }
  for (const fps of [0, -30, 29.97]) {
    assert.throws(() => framesFor(1, fps), RangeError);
  }
});

test("a scene is padding plus narration, rounded up", () => {
  const timeline = buildTimeline(
    presentation([slide({ ordinal: 1, narrationSeconds: 4.02 })]),
  );
  const [scene] = timeline.scenes;
  assert.ok(scene !== undefined);

  // 750ms -> 23, 4.02s -> 121, 1200ms -> 36.
  assert.equal(scene.from, 0);
  assert.equal(scene.narrationFrom, 23);
  assert.equal(scene.narrationDurationInFrames, 121);
  assert.equal(scene.durationInFrames, 23 + 121 + 36);
  assert.equal(timeline.totalFrames, 180);
});

test("the minimum slide duration is a floor, not an override", () => {
  const short = buildTimeline(
    presentation([slide({ ordinal: 1, narrationSeconds: 0.2, minSlideMs: 3000 })]),
  );
  assert.equal(short.scenes[0]?.durationInFrames, 90, "3s floor should apply");

  const long = buildTimeline(
    presentation([slide({ ordinal: 1, narrationSeconds: 9, minSlideMs: 3000 })]),
  );
  assert.equal(long.scenes[0]?.durationInFrames, 23 + 270 + 36);
});

test("scenes abut exactly, and narration never crosses into the next one", () => {
  const timeline = buildTimeline(
    presentation([
      slide({ ordinal: 1, narrationSeconds: 4.017 }),
      slide({ ordinal: 2, narrationSeconds: 6.983 }),
      slide({ ordinal: 3, narrationSeconds: 2.5 }),
    ]),
  );

  let expected = 0;
  for (const scene of timeline.scenes) {
    assert.equal(
      scene.from,
      expected,
      `slide ${scene.ordinal} starts where the last ended`,
    );
    expected += scene.durationInFrames;

    const narrationEnd = scene.narrationFrom + scene.narrationDurationInFrames;
    assert.ok(
      scene.narrationFrom >= scene.from,
      `slide ${scene.ordinal} narration starts before its slide`,
    );
    assert.ok(
      narrationEnd <= expected,
      `slide ${scene.ordinal} narration runs past its scene`,
    );
  }
  assert.equal(timeline.totalFrames, expected);
});

test("narration starts after pre_say, measured in frames", () => {
  const timeline = buildTimeline(
    presentation([
      slide({ ordinal: 1, preSayMs: 0, narrationSeconds: 1 }),
      slide({ ordinal: 2, preSayMs: 2000, narrationSeconds: 1 }),
    ]),
  );
  assert.equal(timeline.scenes[0]?.narrationFrom, 0);
  assert.equal(timeline.scenes[1]?.narrationFrom, (timeline.scenes[1]?.from ?? 0) + 60);
});

test("timing does not drift over a long deck", () => {
  // Durations chosen so every one of them lands between frames.
  const slides = Array.from({ length: 200 }, (_, index) =>
    slide({ ordinal: index + 1, narrationSeconds: 3.0166666 }),
  );
  const timeline = buildTimeline(presentation(slides));

  const perScene = 23 + 91 + 36;
  assert.equal(timeline.totalFrames, perScene * 200);
  assert.equal(timeline.scenes.at(-1)?.from, perScene * 199);
});

test("the composition is 1080p at 30fps unless told otherwise", () => {
  const timeline = buildTimeline(presentation([slide({ ordinal: 1 })]));
  assert.equal(timeline.fps, DEFAULT_FPS);
  assert.equal(timeline.width, 1920);
  assert.equal(timeline.height, 1080);
  assert.equal(timeline.width / timeline.height, 16 / 9);

  const at60 = buildTimeline(presentation([slide({ ordinal: 1 })]), { fps: 60 });
  assert.equal(at60.scenes[0]?.narrationFrom, 45);
});

test("the timeline carries the deck title and each slide's audio", () => {
  const timeline = buildTimeline(
    presentation([slide({ ordinal: 1 }), slide({ ordinal: 2 })]),
  );
  assert.equal(timeline.title, "A deck");
  assert.deepEqual(
    timeline.scenes.flatMap((scene) => scene.clips.map((clip) => clip.src)),
    ["narration/slide-01-01.wav", "narration/slide-02-01.wav"],
  );
});

test("clips are placed at their measured offsets, in whole frames", () => {
  const timeline = buildTimeline(
    presentation([
      // Two clips of 2s with a 0.5s authored pause between them.
      slide({ ordinal: 1, speech: [2, 2], offsets: [0, 2.5], narrationSeconds: 4.5 }),
    ]),
  );
  const scene = timeline.scenes[0];
  assert.ok(scene !== undefined);
  assert.equal(scene.narrationFrom, 23); // 750ms
  assert.deepEqual(scene.clips, [
    { src: "narration/slide-01-01.wav", from: 23, durationInFrames: 60, scope: "root" },
    {
      src: "narration/slide-01-02.wav",
      from: 23 + 75,
      durationInFrames: 60,
      scope: "root",
    },
  ]);
  assert.equal(scene.narrationDurationInFrames, 135); // 4.5s
});

test("a pause lengthens the slide by exactly the pause", () => {
  const without = buildTimeline(
    presentation([slide({ ordinal: 1, speech: [2, 2], narrationSeconds: 4 })]),
  );
  const withPause = buildTimeline(
    presentation([
      slide({ ordinal: 1, speech: [2, 2], offsets: [0, 2.5], narrationSeconds: 4.5 }),
    ]),
  );
  assert.equal(
    (withPause.scenes[0]?.durationInFrames ?? 0) -
      (without.scenes[0]?.durationInFrames ?? 0),
    15,
  );
});

test("clips never overlap, even when every duration lands between frames", () => {
  // Rounding each offset up independently would let `ceil(a) + ceil(b) > ceil(a + b)`
  // push a clip's end past the next clip's start. Positions accumulate in frames instead.
  const speech = [0.517, 1.517, 0.517, 2.017, 0.683];
  const timeline = buildTimeline(
    presentation([slide({ ordinal: 1, speech, preSayMs: 0 })]),
  );
  const scene = timeline.scenes[0];
  assert.ok(scene !== undefined);

  let previousEnd = scene.narrationFrom;
  for (const clip of scene.clips) {
    assert.ok(
      clip.from >= previousEnd,
      `clip at ${clip.from} starts before the previous ended at ${previousEnd}`,
    );
    previousEnd = clip.from + clip.durationInFrames;
  }
  assert.ok(
    previousEnd <= scene.from + scene.durationInFrames,
    "the last clip runs past its scene",
  );
});

test("a trailing pause is counted even though no clip follows it", () => {
  const timeline = buildTimeline(
    presentation([slide({ ordinal: 1, speech: [2], narrationSeconds: 3 })]),
  );
  const scene = timeline.scenes[0];
  assert.ok(scene !== undefined);
  assert.equal(scene.clips.at(-1)?.durationInFrames, 60);
  assert.equal(scene.narrationDurationInFrames, 90, "the trailing second still counts");
});

test("every scene carries the composition its content selected", () => {
  const timeline = buildTimeline(
    presentation([
      slide({ ordinal: 1, title: "A statement", bullets: [] }),
      slide({
        ordinal: 2,
        title: "Terms",
        bullets: [{ text: "Read" }, { text: "Write" }],
      }),
      slide({
        ordinal: 3,
        title: "Steps",
        bullets: [{ text: "Which tool the agent invoked" }],
      }),
      slide({ ordinal: 4, title: "Points", bullets: [{ text: "a".repeat(60) }] }),
    ]),
  );
  assert.deepEqual(
    timeline.scenes.map((scene) => scene.layout),
    ["statement", "matrix", "index", "lead"],
  );
});

test("an anchor activates when its clip's sound starts, not when the clip does", () => {
  const timeline = buildTimeline(
    presentation([
      slide({
        ordinal: 1,
        preSayMs: 500,
        bullets: [
          { text: "First", id: "one" },
          { text: "Second", id: "two" },
        ],
        speech: [2, 2],
        activates: [undefined, "one", "two"].slice(1) as readonly string[],
        leadingSilence: 0.3,
      }),
    ]),
  );
  const scene = timeline.scenes[0];
  assert.ok(scene !== undefined);

  // pre_say 500ms -> frame 15. Clip one starts there; its sound starts 0.3s (9 frames)
  // later. Clip two starts at 15 + 60 = 75, sound at 84.
  assert.deepEqual(scene.anchors, [
    { id: "one", address: "root/one", elementIndex: 0, clipIndex: 0, frame: 24 },
    { id: "two", address: "root/two", elementIndex: 1, clipIndex: 1, frame: 84 },
  ]);
});

test("anchors keep both ends of the relationship addressable", () => {
  const timeline = buildTimeline(
    presentation([
      slide({
        ordinal: 1,
        bullets: [{ text: "A" }, { text: "B", id: "b" }],
        speech: [1, 1],
        activates: ["", "b"],
      }),
    ]),
  );
  const [anchor] = timeline.scenes[0]?.anchors ?? [];
  assert.ok(anchor !== undefined);

  // Visual end, and narration end, from the same record.
  const body = timeline.scenes[0]?.body;
  assert.equal(
    body?.kind === "bullets" ? body.items[anchor.elementIndex]?.text : undefined,
    "B",
  );
  assert.equal(timeline.scenes[0]?.clips[anchor.clipIndex]?.from, 23 + 30);
});

test("an anchor sits inside its own clip", () => {
  const timeline = buildTimeline(
    presentation([
      slide({
        ordinal: 1,
        bullets: [{ text: "A", id: "a" }],
        speech: [3],
        activates: ["a"],
        leadingSilence: 0.31,
      }),
    ]),
  );
  const scene = timeline.scenes[0];
  const anchor = scene?.anchors[0];
  const clip = scene?.clips[anchor?.clipIndex ?? 0];
  assert.ok(scene !== undefined && anchor !== undefined && clip !== undefined);
  assert.ok(anchor.frame >= clip.from, "activation precedes its own clip");
  assert.ok(
    anchor.frame < clip.from + clip.durationInFrames,
    "activation lands after its own clip ends",
  );
});

test("anchors survive a pause between the cues that carry them", () => {
  const timeline = buildTimeline(
    presentation([
      slide({
        ordinal: 1,
        preSayMs: 0,
        bullets: [
          { text: "A", id: "a" },
          { text: "B", id: "b" },
        ],
        speech: [1, 1],
        offsets: [0, 2],
        activates: ["a", "b"],
        leadingSilence: 0.2,
      }),
    ]),
  );
  // A one-second pause sits between the clips, so the second anchor moves with it.
  assert.deepEqual(
    timeline.scenes[0]?.anchors.map((anchor) => anchor.frame),
    [6, 66],
  );
});

test("a slide with no anchors carries none, and is otherwise unchanged", () => {
  const timeline = buildTimeline(
    presentation([slide({ ordinal: 1, bullets: [{ text: "Plain" }], speech: [2] })]),
  );
  assert.deepEqual(timeline.scenes[0]?.anchors, []);
  assert.equal(timeline.scenes[0]?.clips.length, 1);
});

/**
 * A derived endpoint is an endpoint like any other.
 *
 * The point of these two is negative: resolving an anchor onto an element the *compiler*
 * declared takes no special path through `buildTimeline`. If that ever stops being true, the
 * seam `bodyElements` exists to provide has been broken.
 */
test("narration reaches a region the compiler derived, not one the author named", () => {
  const timeline = buildTimeline(
    presentation([
      slide({
        ordinal: 1,
        change: ["a: 1\nb: 2\n", "a: 1\nb: 3\n"],
        speech: [3, 4],
        activates: ["", "change"],
        preSayMs: 0,
        leadingSilence: 0.2,
      }),
    ]),
  );

  const scene = timeline.scenes[0];
  assert.ok(scene !== undefined);
  assert.deepEqual(scene.anchors, [
    // Element 0 is the only element a change has, and it is not in the source anywhere.
    {
      id: "change",
      address: "root/change",
      elementIndex: 0,
      clipIndex: 1,
      frame: 90 + framesFor(0.2, DEFAULT_FPS),
    },
  ]);
  assert.equal(scene.layout, "revision");
});

test("a change with no narration reaching it still lays out, with no anchors", () => {
  const timeline = buildTimeline(
    presentation([
      slide({ ordinal: 1, change: ["a: 1\n", "a: 2\n"], narrationSeconds: 5 }),
    ]),
  );
  assert.deepEqual(timeline.scenes[0]?.anchors, []);
  assert.equal(timeline.scenes[0]?.layout, "revision");
});
