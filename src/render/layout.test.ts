import assert from "node:assert/strict";
import { test } from "node:test";

import {
  analyzeContent,
  chooseLayout,
  COMPACT_BULLET,
  MAX_CURATED_BULLETS,
  TERSE_BULLET,
  type LayoutArchetype,
} from "./layout.ts";

/**
 * Layout selection is the whole of the "content analysis" step, and it is deliberately
 * simple enough to test by inspection. If these tests start needing fixtures, the
 * heuristics have grown past what decision:10 allows.
 */

function layoutOf(title: string, bullets: readonly string[]): LayoutArchetype {
  return chooseLayout({ title, bullets });
}

const TERSE = ["Read files", "Search code", "Run tools", "Decide"];
const COMPACT = [
  "Which tool the agent invoked",
  "How long the call took",
  "What the tool returned",
];
const LONG = [
  "Replay a session instead of remembering it",
  "Review an agent's work the way you review a colleague's",
];

test("content shape is measured, not guessed", () => {
  const shape = analyzeContent({ title: "A title", bullets: ["ab", "abcd"] });
  assert.equal(shape.bulletCount, 2);
  assert.equal(shape.longestBullet, 4);
  assert.equal(shape.averageBullet, 3);
  assert.equal(shape.titleLength, 7);
  assert.equal(shape.terse, true);
  assert.equal(shape.compact, true);
});

test("a slide with no bullets is a statement", () => {
  assert.equal(layoutOf("You see the answer. You never see the work.", []), "statement");
  assert.equal(layoutOf("Short", []), "statement");
});

test("a few short parallel labels become a matrix", () => {
  assert.equal(layoutOf("Coding agents are black boxes", TERSE), "matrix");
  assert.equal(layoutOf("A title", ["One", "Two"]), "matrix");
  assert.equal(
    layoutOf("A title", ["a".repeat(TERSE_BULLET), "b"]),
    "matrix",
    "the threshold is inclusive",
  );
});

test("compact phrases become a numbered index", () => {
  assert.equal(layoutOf("WitnessGlass records the work", COMPACT), "index");
  assert.equal(
    layoutOf("A title", ["a".repeat(TERSE_BULLET + 1)]),
    "index",
    "one character past terse is enough to stop being a label",
  );
  assert.equal(layoutOf("A title", ["a".repeat(COMPACT_BULLET)]), "index");
});

test("long items fall back to the lead composition", () => {
  assert.equal(layoutOf("So the session stops being a black box", LONG), "lead");
  assert.equal(layoutOf("A title", ["a".repeat(COMPACT_BULLET + 1)]), "lead");
});

test("too many bullets fall back rather than crowding a curated composition", () => {
  const many = Array.from({ length: MAX_CURATED_BULLETS + 1 }, (_, i) => `Item ${i}`);
  assert.equal(layoutOf("A title", many), "lead");

  const most = Array.from({ length: MAX_CURATED_BULLETS }, (_, i) => `Item ${i}`);
  assert.equal(layoutOf("A title", most), "matrix");
});

test("selection depends on the bullets, never on the title", () => {
  for (const title of ["Hi", "A".repeat(120)]) {
    assert.equal(layoutOf(title, TERSE), "matrix");
    assert.equal(layoutOf(title, COMPACT), "index");
    assert.equal(layoutOf(title, LONG), "lead");
    assert.equal(layoutOf(title, []), "statement");
  }
});

test("selection is total and deterministic", () => {
  const cases: Array<readonly string[]> = [
    [],
    [""],
    ["x"],
    TERSE,
    COMPACT,
    LONG,
    Array.from({ length: 40 }, () => "many"),
  ];
  for (const bullets of cases) {
    const first = layoutOf("A title", bullets);
    assert.equal(
      layoutOf("A title", bullets),
      first,
      "the same input must agree with itself",
    );
    assert.ok(
      ["statement", "matrix", "index", "lead"].includes(first),
      `unexpected archetype ${first}`,
    );
  }
});
