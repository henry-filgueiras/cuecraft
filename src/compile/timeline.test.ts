import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CompiledPresentation,
  CompiledSlide,
  NarrationArtifact,
} from "./compile.ts";
import { buildTimeline, DEFAULT_FPS, framesFor } from "./timeline.ts";

type SlideOverrides = Omit<Partial<CompiledSlide>, "narration"> & {
  ordinal: number;
  narration?: Partial<NarrationArtifact>;
};

function slide(overrides: SlideOverrides): CompiledSlide {
  const narrationSeconds = overrides.narration?.durationSeconds ?? 4;
  return {
    ordinal: overrides.ordinal,
    title: overrides.title ?? `Slide ${overrides.ordinal}`,
    bullets: overrides.bullets ?? [],
    say: overrides.say ?? "Words.",
    preSayMs: overrides.preSayMs ?? 750,
    postSayMs: overrides.postSayMs ?? 1200,
    minSlideMs: overrides.minSlideMs ?? 3000,
    sceneMs: overrides.sceneMs ?? 0,
    narration: {
      path: `/tmp/slide-${overrides.ordinal}.wav`,
      src: `narration/slide-0${overrides.ordinal}.wav`,
      durationSeconds: narrationSeconds,
      voice: "af_heart",
      speed: 1,
      ...overrides.narration,
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
    presentation([slide({ ordinal: 1, narration: { durationSeconds: 4.02 } })]),
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
    presentation([
      slide({ ordinal: 1, narration: { durationSeconds: 0.2 }, minSlideMs: 3000 }),
    ]),
  );
  assert.equal(short.scenes[0]?.durationInFrames, 90, "3s floor should apply");

  const long = buildTimeline(
    presentation([
      slide({ ordinal: 1, narration: { durationSeconds: 9 }, minSlideMs: 3000 }),
    ]),
  );
  assert.equal(long.scenes[0]?.durationInFrames, 23 + 270 + 36);
});

test("scenes abut exactly, and narration never crosses into the next one", () => {
  const timeline = buildTimeline(
    presentation([
      slide({ ordinal: 1, narration: { durationSeconds: 4.017 } }),
      slide({ ordinal: 2, narration: { durationSeconds: 6.983 } }),
      slide({ ordinal: 3, narration: { durationSeconds: 2.5 } }),
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
      slide({ ordinal: 1, preSayMs: 0, narration: { durationSeconds: 1 } }),
      slide({ ordinal: 2, preSayMs: 2000, narration: { durationSeconds: 1 } }),
    ]),
  );
  assert.equal(timeline.scenes[0]?.narrationFrom, 0);
  assert.equal(timeline.scenes[1]?.narrationFrom, (timeline.scenes[1]?.from ?? 0) + 60);
});

test("timing does not drift over a long deck", () => {
  // Durations chosen so every one of them lands between frames.
  const slides = Array.from({ length: 200 }, (_, index) =>
    slide({ ordinal: index + 1, narration: { durationSeconds: 3.0166666 } }),
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
    timeline.scenes.map((scene) => scene.narrationSrc),
    ["narration/slide-01.wav", "narration/slide-02.wav"],
  );
});
