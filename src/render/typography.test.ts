import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { repositoryRoot } from "../repository.ts";
import { readFontPin } from "./faces.ts";
import {
  DEFAULT_TYPOGRAPHY,
  HYPERLEGIBLE_TYPOGRAPHY,
  NO_ACCESSIBILITY,
  TYPOGRAPHY_IDS,
  faceDescriptors,
  isTypographyId,
  typographyFor,
  typographyOf,
  type AdvanceWidths,
} from "./typography.ts";

interface Calibration {
  readonly fonts: Record<string, string>;
  readonly deckCount: number;
  readonly sampleCount: number;
  readonly classes: Record<
    keyof AdvanceWidths,
    {
      readonly samples: number;
      readonly posture: number;
      readonly default: { readonly measuredAtPosture: number; readonly max: number };
      readonly hyperlegible: { readonly required: number; readonly max: number };
    }
  >;
}

function calibration(): Calibration {
  return JSON.parse(
    readFileSync(join(repositoryRoot(), "src", "render", "calibration.json"), "utf8"),
  ) as Calibration;
}

const CLASSES = ["heading", "body", "mono", "plate", "event"] as const;

/* --------------------------------------------------- the shape of the surface */

test("the set of profiles is closed, and both are reachable by name", () => {
  assert.deepEqual([...TYPOGRAPHY_IDS], ["default", "hyperlegible"]);
  assert.equal(typographyOf("default"), DEFAULT_TYPOGRAPHY);
  assert.equal(typographyOf("hyperlegible"), HYPERLEGIBLE_TYPOGRAPHY);

  assert.ok(isTypographyId("default"));
  assert.ok(isTypographyId("hyperlegible"));
  for (const wrong of ["Default", "atkinson", "", "helvetica", 1, null, undefined]) {
    assert.equal(isTypographyId(wrong), false);
  }
});

/**
 * The public boolean means one thing, and the absence of it means today.
 *
 * Asserted here rather than only in the parser because this is where the *meaning* lives: the
 * parser's job is to decide whether the key was written, and this function's job is to decide what
 * having written it selects.
 */
test("only an explicit dyslexia constraint selects the second profile", () => {
  assert.equal(typographyFor(NO_ACCESSIBILITY), "default");
  assert.equal(typographyFor({ dyslexia: false }), "default");
  assert.equal(typographyFor({ dyslexia: true }), "hyperlegible");
});

/**
 * The default profile is what this repository has rendered since sprint:2, to the digit.
 *
 * The strongest guard in this file, and the bluntest on purpose. Every film in `examples/` was
 * framed against these five numbers and these two stacks; a change to any of them moves line
 * breaks in decks that never asked for anything. If a later round genuinely means to move one, it
 * changes this test deliberately and re-renders the showpieces — which is exactly the friction the
 * assertion is for.
 */
test("the default profile is unchanged, to the digit", () => {
  assert.equal(DEFAULT_TYPOGRAPHY.id, "default");
  assert.equal(
    DEFAULT_TYPOGRAPHY.prose,
    '"Helvetica Neue", Helvetica, Arial, sans-serif',
  );
  assert.equal(
    DEFAULT_TYPOGRAPHY.mono,
    'Menlo, "SF Mono", "DejaVu Sans Mono", "Liberation Mono", Consolas, monospace',
  );
  assert.deepEqual(DEFAULT_TYPOGRAPHY.width, {
    heading: 0.49,
    body: 0.52,
    mono: 0.602,
    plate: 0.55,
    event: 0.53,
  });
  // Nothing to wait for: a system stack is on the host or it is not (dragon:4).
  assert.deepEqual(DEFAULT_TYPOGRAPHY.faces, []);
  assert.deepEqual(faceDescriptors(DEFAULT_TYPOGRAPHY), []);
});

/**
 * Both stacks degrade rather than fail.
 *
 * dragon:4's fourth constraint. A checkout whose faces did not install renders a different frame,
 * never a blank one — so the hyperlegible stacks end in exactly the stacks the default profile is.
 */
test("the bundled profile falls back to the default's stacks", () => {
  assert.ok(HYPERLEGIBLE_TYPOGRAPHY.prose.startsWith('"Atkinson Hyperlegible Next", '));
  assert.ok(HYPERLEGIBLE_TYPOGRAPHY.prose.endsWith(DEFAULT_TYPOGRAPHY.prose));
  assert.ok(HYPERLEGIBLE_TYPOGRAPHY.mono.startsWith('"Atkinson Hyperlegible Mono", '));
  assert.ok(HYPERLEGIBLE_TYPOGRAPHY.mono.endsWith(DEFAULT_TYPOGRAPHY.mono));
});

/**
 * KaTeX is not in either stack, in either profile.
 *
 * Mathematics sets in the faces decision:32 bundled and in nothing else. An `accessibility` key
 * that reached a formula would be changing what a definition *says* — an italic `x` is a variable
 * and an upright one is not — rather than how it is set.
 */
test("no profile names a mathematics face", () => {
  for (const id of TYPOGRAPHY_IDS) {
    const type = typographyOf(id);
    assert.doesNotMatch(type.prose, /KaTeX/);
    assert.doesNotMatch(type.mono, /KaTeX/);
    for (const face of type.faces) assert.doesNotMatch(face.family, /KaTeX/);
  }
});

/* --------------------------------------------------- the calibration guard */

/**
 * Whether the measured numbers still describe the fonts that are installed.
 *
 * The trip-wire for a font upgrade. `scripts/calibrate-widths.ts` needs a browser and two minutes;
 * this needs neither, and it fails the moment `fonts.lock.json` names a version the calibration was
 * not taken against. Without it, bumping a Fontsource dependency would move every line break in
 * every hyperlegible film and nothing in the repository would say so.
 */
test("the calibration was measured against the fonts that are pinned", () => {
  const measured = calibration().fonts;
  for (const family of readFontPin().families) {
    assert.equal(
      measured[family.package],
      family.version,
      `${family.package} is pinned at ${family.version} but the width calibration was taken ` +
        `against ${measured[family.package] ?? "nothing"}. ` +
        `Rerun: node scripts/calibrate-widths.ts --write`,
    );
  }
});

/**
 * Whether the shipped constants still cover what was measured.
 *
 * The direction matters and only one direction is dangerous. `perLine = floor(width / (size ×
 * ratio))`, so a ratio *below* the truth over-reports how many characters fit, under-counts lines,
 * and hands a composition room it does not have — a heading that wraps where the estimator said it
 * would not takes that room from the body beneath it. A ratio above the truth costs a slightly
 * smaller type size and nothing else.
 */
test("every shipped advance width covers its measured corpus", () => {
  const measured = calibration().classes;
  for (const klass of CLASSES) {
    assert.ok(
      HYPERLEGIBLE_TYPOGRAPHY.width[klass] >= measured[klass].hyperlegible.required,
      `hyperlegible ${klass} is ${HYPERLEGIBLE_TYPOGRAPHY.width[klass]} but the corpus needs ` +
        `at least ${measured[klass].hyperlegible.required}`,
    );
  }
});

/**
 * ...and that it is not *gratuitously* above it.
 *
 * The other half of "conservative without wrapping for nothing". A ratio far above the measured
 * posture would wrap text that had room, step type down a size on slides that did not need it, and
 * be indistinguishable from a defect in every rendered frame. Ten percent of headroom over the
 * required value is the ceiling: enough to round a number to two places and keep it, nowhere near
 * enough to hide a stale calibration.
 */
test("no shipped advance width wraps text that had room", () => {
  const measured = calibration().classes;
  for (const klass of CLASSES) {
    const required = measured[klass].hyperlegible.required;
    assert.ok(
      HYPERLEGIBLE_TYPOGRAPHY.width[klass] <= required * 1.1,
      `hyperlegible ${klass} is ${HYPERLEGIBLE_TYPOGRAPHY.width[klass]}, more than ten percent ` +
        `above the ${required} the corpus asks for; that is gratuitous wrapping`,
    );
  }
});

/**
 * The monospace face is the one that pays, and it is worth asserting rather than remembering.
 *
 * The round opened expecting every class to widen and four of the five came back narrower: the
 * differentiation is bought in glyph *shape* rather than in advance. A monospace face cannot do
 * that — every distinction has to fit a cell the widest letter sets — so `mono` is the only class
 * where copying the default across would have been *optimistic*, which is the one direction that
 * clips a specimen off the edge of a frame.
 */
test("the monospace profile is wider and the proportional ones are not", () => {
  assert.ok(HYPERLEGIBLE_TYPOGRAPHY.width.mono > DEFAULT_TYPOGRAPHY.width.mono);
  for (const klass of ["heading", "body", "plate", "event"] as const) {
    assert.ok(
      HYPERLEGIBLE_TYPOGRAPHY.width[klass] < DEFAULT_TYPOGRAPHY.width[klass],
      `${klass} was measured narrower than the default; a value at or above it means the ` +
        `calibration was not applied`,
    );
  }
});

/* --------------------------------------------------- the loading gate's input */

test("the gate asks for every bundled weight and nothing else", () => {
  const descriptors = faceDescriptors(HYPERLEGIBLE_TYPOGRAPHY);
  assert.equal(descriptors.length, 8);
  for (const descriptor of descriptors) {
    assert.match(
      descriptor,
      /^(400|500|600|700) 16px "Atkinson Hyperlegible (Next|Mono)"$/,
    );
  }
  // Stable across calls: the gate keys a `delayRender` effect on this list, and a list that
  // reordered itself between frames would re-enter a handle that was already continued.
  assert.deepEqual(descriptors, faceDescriptors(HYPERLEGIBLE_TYPOGRAPHY));
});
