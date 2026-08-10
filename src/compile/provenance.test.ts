import assert from "node:assert/strict";
import { test } from "node:test";

import type { CompiledPresentation, CompiledSlide, SpeechClip } from "./compile.ts";
import { ROOT_SCOPE } from "../presentation/scope.ts";
import {
  canonicalize,
  matchRender,
  renderIdFor,
  renderIdIn,
  shortRenderId,
  STAMP_TAG,
  stampFor,
} from "./provenance.ts";
import { buildTimeline } from "./timeline.ts";

/**
 * The birth certificate, without a film.
 *
 * Everything below is a property of the digest or of the comparison, and none of it needs an MP4 —
 * which is the point of `provenance.ts` being pure. The half that does need one (does the stamp
 * survive Remotion's encoder, does ffprobe read it back) is in `../render/pipeline.render-test.ts`,
 * because that is a claim about a toolchain and cannot be asserted against a mock.
 */

function slide(
  ordinal: number,
  seconds: number,
  title = `Slide ${ordinal}`,
): CompiledSlide {
  const clip: SpeechClip = {
    ordinal: 1,
    text: `Sentence ${ordinal}`,
    path: `/tmp/${ordinal}.wav`,
    src: `narration/slide-0${ordinal}-01.wav`,
    offsetSeconds: 0,
    durationSeconds: seconds,
    leadingSilenceSeconds: 0.3,
    scope: ROOT_SCOPE,
    voice: "af_heart",
    speed: 1,
  };
  return {
    ordinal,
    title,
    body: { kind: "bullets", items: [{ text: "A point" }] },
    say: [{ kind: "speech", scope: ROOT_SCOPE, text: "Words." }],
    preSayMs: 400,
    postSayMs: 600,
    minSlideMs: 0,
    modules: [],
    sceneMs: 0,
    narration: {
      clips: [clip],
      calls: [],
      dwells: [],
      recalls: [],
      playbacks: [],
      durationSeconds: seconds,
      voice: "af_heart",
      speed: 1,
    },
  };
}

function deck(...slides: readonly CompiledSlide[]): CompiledPresentation {
  return {
    title: "A deck",
    slides,
    publicDir: "/tmp/public",
    subtitles: false,
    typography: "default",
  };
}

const idFor = (presentation: CompiledPresentation): string =>
  renderIdFor(buildTimeline(presentation));

test("a render identity is a stable digest of the compiled timeline", () => {
  const id = idFor(deck(slide(1, 2), slide(2, 3)));
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.equal(id, idFor(deck(slide(1, 2), slide(2, 3))), "the same timeline twice");
});

test("it changes whenever anything that could move a frame changes", () => {
  const base = idFor(deck(slide(1, 2), slide(2, 3)));

  // A duration: every frame after it shifts.
  assert.notEqual(base, idFor(deck(slide(1, 2.5), slide(2, 3))));
  // An order: the frames are the same numbers against different slides, which is exactly the
  // failure a stale sidecar produces and the case a byte digest of an identical-length film would
  // be least likely to catch.
  assert.notEqual(base, idFor(deck(slide(2, 3), slide(1, 2))));
  // A title: it moves no frame, but it does move a *key*, and a symbol table whose keys have
  // changed no longer describes the same film in the way that matters.
  assert.notEqual(base, idFor(deck(slide(1, 2, "Renamed"), slide(2, 3))));
  // A slide: added at the end, so every earlier frame is unmoved and the film is still different.
  assert.notEqual(base, idFor(deck(slide(1, 2), slide(2, 3), slide(3, 1))));
});

/**
 * The property that stops a refactor invalidating every sidecar in existence.
 *
 * `JSON.stringify` emits keys in insertion order, so without sorting the digest would be a function
 * of the order fields are assigned in `timeline.ts` — and reordering two lines of an object literal
 * would change every render identity while changing no frame.
 */
test("key order in the source cannot change the digest", () => {
  assert.equal(
    canonicalize({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } }),
    canonicalize({ a: { c: [3, { e: 5, f: 4 }], d: 2 }, b: 1 }),
  );
  assert.equal(canonicalize({ a: 1, b: 2 }), '{"a":1,"b":2}');
});

test("array order is meaning, and is preserved", () => {
  assert.notEqual(canonicalize({ scenes: [1, 2] }), canonicalize({ scenes: [2, 1] }));
});

test("an absent field and an explicitly undefined one cannot disagree", () => {
  assert.equal(canonicalize({ a: 1 }), canonicalize({ a: 1, b: undefined }));
});

/**
 * Machine independence, asserted rather than assumed.
 *
 * A timeline carrying an absolute path would give two checkouts two different identities for the
 * same compilation. Real timelines were dumped and checked for this; the invariant is pinned here
 * so that a future field carrying `repositoryRoot()` into the timeline fails in the suite rather
 * than in somebody's second checkout.
 */
test("nothing machine-specific reaches the digest", () => {
  const timeline = buildTimeline(deck(slide(1, 2), slide(2, 3)));
  const serialized = canonicalize(timeline);
  assert.doesNotMatch(serialized, /\/(Users|home|tmp|private|var)\//);
  assert.doesNotMatch(serialized, /\.cuecraft/);
});

test("the stamp survives being prefixed by whatever wrote the tag", () => {
  const id = "a".repeat(64);
  // Remotion always writes its own comment and prepends it to anything it is given, so the stamp is
  // never at the start of the value it rides in.
  assert.equal(renderIdIn(`Made with Remotion 4.0.506; ${stampFor(id)}`), id);
  assert.equal(renderIdIn(stampFor(id)), id);
  assert.equal(STAMP_TAG, "comment");
});

test("a tag with no stamp in it, or a stamp from a digest this cannot read, is nothing", () => {
  assert.equal(renderIdIn(undefined), undefined);
  assert.equal(renderIdIn(""), undefined);
  assert.equal(renderIdIn("Made with Remotion 4.0.506"), undefined);
  assert.equal(renderIdIn("cuecraft renderId=deadbeef"), undefined, "unqualified");
  assert.equal(
    renderIdIn(`cuecraft renderId=blake3:${"f".repeat(64)}`),
    undefined,
    "a future digest reads as unknown rather than as a mismatch",
  );
});

test("a short identity is for reading, never for deciding", () => {
  const id = idFor(deck(slide(1, 2)));
  assert.equal(shortRenderId(id), id.slice(0, 12));
  assert.equal(shortRenderId(id).length, 12);
});

test("a pair agrees, disagrees, or cannot be told apart", () => {
  assert.deepEqual(matchRender("abc", "abc"), { verdict: "matched", renderId: "abc" });
  assert.deepEqual(matchRender("abc", "xyz"), {
    verdict: "mismatched",
    symbols: "abc",
    film: "xyz",
  });
});

/**
 * The three ways of not knowing, kept apart.
 *
 * Collapsing them would cost the only useful thing the state carries: which of the two artifacts
 * predates the check, which is what tells somebody whether re-rendering would fix it.
 */
test("an unstamped artifact is unknown, and says which one it was", () => {
  assert.deepEqual(matchRender(undefined, "xyz"), {
    verdict: "unknown",
    because: "symbols",
  });
  assert.deepEqual(matchRender("abc", undefined), {
    verdict: "unknown",
    because: "film",
  });
  assert.deepEqual(matchRender(undefined, undefined), {
    verdict: "unknown",
    because: "both",
  });
});
