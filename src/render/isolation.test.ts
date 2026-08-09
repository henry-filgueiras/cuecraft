import assert from "node:assert/strict";
import { test } from "node:test";

import { buildTimeline } from "../compile/timeline.ts";
import type { CompiledPresentation } from "../compile/compile.ts";
import { parsePresentation } from "../presentation/parse.ts";
import { electLayout } from "./audition.ts";
import { machineOf } from "./machine.ts";
import { bodyBox, fitIndex, fitSpecimen, headingLines, quoteLines } from "./theme.ts";
import { layoutWorld, worldOf } from "./world.ts";
import {
  DEFAULT_TYPOGRAPHY,
  HYPERLEGIBLE_TYPOGRAPHY,
  typographyOf,
  type TypographyId,
} from "./typography.ts";

/**
 * Whether two renders in one process can contaminate each other's typography.
 *
 * The question the architecture was chosen to make unaskable, and therefore the one worth
 * asserting rather than asserting *about*. cuecraft has no mutable "current profile" — a render's
 * profile is a field on its own `Timeline` and a value passed down its own React tree — so the
 * interesting property is not "the isolation works" but "there is no shared thing for isolation to
 * be needed between", and these are the observations that would fail if somebody introduced one.
 *
 * Concurrency in cuecraft is genuine rather than hypothetical. `buildTimeline` is pure and cheap,
 * so a batch renders several decks from one process; a nested world is laid out inside the film
 * that entered it; a recall re-lays-out an earlier slide inside the frame of a later one; and
 * `cuecraft explain` builds a whole second geometry beside the render's. Every one of those is two
 * layouts alive at once.
 */

function deck(accessibility: string): CompiledPresentation {
  const source =
    `title: "A deck"\n${accessibility}slides:\n` +
    `  - slide:\n      title: "A heading long enough that a face can change where it breaks"\n` +
    `      bullets:\n        - One thing worth saying about it\n        - And a second\n` +
    `    say: "Hello."\n`;
  const presentation = parsePresentation(source, "test.yaml");
  return {
    title: presentation.title,
    slides: presentation.slides.map((slide) => ({
      ...slide,
      sceneMs: 3000,
      narration: {
        clips: [],
        calls: [],
        dwells: [],
        recalls: [],
        durationSeconds: 1,
        voice: "af_heart",
        speed: 1,
      },
    })),
    publicDir: "/tmp/public",
    subtitles: presentation.subtitles,
    typography: presentation.typography,
  };
}

const PLAIN = "";
const DYSLEXIC = "accessibility:\n  dyslexia: true\n";

/* ------------------------------------------------------ the value, not a global */

test("a timeline carries its own profile, and building another does not move it", () => {
  const plain = buildTimeline(deck(PLAIN));
  const dyslexic = buildTimeline(deck(DYSLEXIC));
  // Built again, after the other one, in the same process.
  const plainAgain = buildTimeline(deck(PLAIN));

  assert.equal(plain.typography, "default");
  assert.equal(dyslexic.typography, "hyperlegible");
  assert.equal(plainAgain.typography, "default");

  // ...and the first timeline is still what it was after two more were built beside it.
  assert.equal(plain.typography, "default");
});

/**
 * The order the two are built in changes nothing.
 *
 * A module-level "current profile" would pass the test above and fail this one, because the last
 * writer would win and the answer would depend on which deck happened to be compiled second.
 */
test("interleaving two profiles produces the same answers in either order", () => {
  const forwards = [PLAIN, DYSLEXIC, PLAIN, DYSLEXIC].map(
    (setting) => buildTimeline(deck(setting)).typography,
  );
  const backwards = [DYSLEXIC, PLAIN, DYSLEXIC, PLAIN].map(
    (setting) => buildTimeline(deck(setting)).typography,
  );

  assert.deepEqual(forwards, ["default", "hyperlegible", "default", "hyperlegible"]);
  assert.deepEqual(backwards, ["hyperlegible", "default", "hyperlegible", "default"]);
});

/**
 * Every fitter is a pure function of the profile it is handed.
 *
 * The mechanism underneath the two tests above. Interleaved calls with alternating profiles must
 * produce exactly the sequence the un-interleaved calls do — which is only true if none of them
 * reads anything that a previous call could have written.
 */
test("interleaved fitting calls do not see each other's profile", () => {
  const title = "A heading long enough that a face can change where it breaks";
  const rows = ["One thing worth saying about it", "And a second"];
  const box = { width: 1656, height: 700 };

  const measure = (type: typeof DEFAULT_TYPOGRAPHY) => [
    headingLines(title.length, 104, 1500, type),
    quoteLines(120, 1500, 42, type),
    fitSpecimen(12, 80, box, type),
    fitIndex(rows, box, type).size,
    Math.round(bodyBox(title, type).height),
  ];

  const alone = {
    plain: measure(DEFAULT_TYPOGRAPHY),
    dys: measure(HYPERLEGIBLE_TYPOGRAPHY),
  };

  // The same calls, alternating, twenty times over.
  for (let round = 0; round < 20; round += 1) {
    assert.deepEqual(measure(DEFAULT_TYPOGRAPHY), alone.plain);
    assert.deepEqual(measure(HYPERLEGIBLE_TYPOGRAPHY), alone.dys);
  }

  // ...and the two profiles genuinely disagree, or none of the above proves anything.
  assert.notDeepEqual(alone.plain, alone.dys);
});

/**
 * The same, for the two compositions that lay out a whole coordinate system.
 *
 * A world and a machine are the most expensive layouts cuecraft does and the ones most likely to
 * acquire a cache. A cache keyed on the graph alone would return the first profile's geometry for
 * the second profile's film, which is exactly the leak this asserts against.
 */
test("a world and a machine lay out per profile, however they are interleaved", () => {
  const worldDeck = parsePresentation(
    `title: "A deck"\nslides:\n  - slide:\n      title: "A world"\n      world:\n` +
      `        entities:\n` +
      `          source: The presentation source everybody writes\n` +
      `          film: A narrated film that came out of it\n` +
      `        relations:\n          - source -> film\n` +
      `    say: "Hello."\n`,
    "test.yaml",
  );
  const world = worldOf(worldDeck.slides[0]?.body as never);
  assert.ok(world !== undefined);

  const plain = layoutWorld(world, DEFAULT_TYPOGRAPHY);
  const dyslexic = layoutWorld(world, HYPERLEGIBLE_TYPOGRAPHY);
  const plainAgain = layoutWorld(world, DEFAULT_TYPOGRAPHY);

  assert.deepEqual(plainAgain.bounds, plain.bounds);
  assert.notDeepEqual(dyslexic.bounds, plain.bounds);

  // Alternating, so a first-call-wins cache would show up as the second answer repeating.
  for (let round = 0; round < 5; round += 1) {
    assert.deepEqual(layoutWorld(world, DEFAULT_TYPOGRAPHY).bounds, plain.bounds);
    assert.deepEqual(layoutWorld(world, HYPERLEGIBLE_TYPOGRAPHY).bounds, dyslexic.bounds);
  }
});

/**
 * A profile identity always resolves to the same immutable value.
 *
 * `typographyOf` returns a shared frozen-by-convention constant rather than a fresh object, which
 * is what makes it safe to put in a React context and compare by identity. If it ever started
 * returning a copy, `useMemo` dependencies keyed on it would invalidate every frame.
 */
test("resolving a profile twice yields the same value, not a copy", () => {
  for (const id of ["default", "hyperlegible"] as TypographyId[]) {
    assert.equal(typographyOf(id), typographyOf(id));
  }
});

/**
 * A machine's elected layout is a function of the profile too.
 *
 * `electLayout` auditions several dagre policies and picks a winner by score. The score depends on
 * plate sizes, plate sizes depend on the advance width, so the *winning policy itself* can differ
 * between profiles — which is the deepest place a leaked profile could change a film without
 * changing anything obviously typographic.
 */
test("a machine's audition runs under the profile it was given", () => {
  const machineDeck = parsePresentation(
    `title: "A deck"\nslides:\n  - slide:\n      title: "A machine"\n      machine:\n` +
      `        states:\n` +
      `          idle: Waiting for the lease\n` +
      `          held: Holding the lease under a fence\n` +
      `        transitions:\n` +
      `          claim:\n            from: idle\n            to: held\n            on: a worker takes the lease\n` +
      `          expire:\n            from: held\n            to: idle\n            on: the lease expired\n` +
      `        scenario:\n          - take: claim\n` +
      `    say: "Hello."\n`,
    "test.yaml",
  );
  const machine = machineOf(machineDeck.slides[0]?.body as never);
  assert.ok(machine !== undefined);
  const viewport = { width: 1540, height: 1080 };

  const plain = electLayout(machine, viewport, DEFAULT_TYPOGRAPHY);
  const dyslexic = electLayout(machine, viewport, HYPERLEGIBLE_TYPOGRAPHY);
  assert.deepEqual(
    electLayout(machine, viewport, DEFAULT_TYPOGRAPHY).bounds,
    plain.bounds,
  );
  assert.notDeepEqual(dyslexic.bounds, plain.bounds);
});
