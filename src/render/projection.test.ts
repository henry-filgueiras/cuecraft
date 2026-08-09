import { DEFAULT_TYPOGRAPHY as TYPO } from "./typography.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { deriveChange } from "../presentation/change.ts";
import { parsePresentation } from "../presentation/parse.ts";
import { specimenLines } from "../presentation/specimen.ts";
import { repositoryRoot } from "../repository.ts";
import {
  CONTINUATION,
  type Fragment,
  fitProjection,
  fragmentWidth,
  projectLines,
  wrapLine,
} from "./projection.ts";
import { CODE, codeBox, fitSpecimen } from "./theme.ts";

/**
 * The projection is where truthful source stops being the same shape as the frame, so these
 * tests are mostly about what must *not* change: the text, its order, its structure, and which
 * logical line each rendered piece belongs to.
 */

const LONG = '  - "They read files, search code, run tools, and decide what to do next."';

/** What a fragment actually puts on the frame, glyph included. */
function draw(line: string, fragment: Fragment): string {
  const text = line.slice(fragment.from, fragment.to);
  return fragment.continuation
    ? `${" ".repeat(fragment.indent)}${CONTINUATION} ${text}`
    : text;
}

test("a line inside the measure is one fragment and is not touched", () => {
  const fragments = wrapLine("  - short", 40);
  assert.equal(fragments.length, 1);
  assert.equal(fragments[0]?.continuation, false);
  assert.equal(draw("  - short", fragments[0]!), "  - short");
});

test("wrapping preserves the line exactly, break spaces included", () => {
  for (let columns = 24; columns <= LONG.length; columns += 1) {
    const fragments = wrapLine(LONG, columns);
    const rejoined = fragments
      .map((fragment) => LONG.slice(fragment.from, fragment.to))
      .join(" ");
    assert.equal(rejoined, LONG, `columns=${columns} did not reconstruct the line`);
  }
});

test("every line of every specimen in the canonical deck survives every measure", () => {
  const deck = parsePresentation(
    readFileSync(join(repositoryRoot(), "examples", "cuecraft.yaml"), "utf8"),
    "examples/cuecraft.yaml",
  );
  const lines = deck.slides.flatMap((slide) =>
    slide.body.kind === "code"
      ? specimenLines(slide.body.source)
      : slide.body.kind === "change"
        ? [...specimenLines(slide.body.before), ...specimenLines(slide.body.after)]
        : [],
  );
  assert.ok(lines.length > 20, "the deck should be quoting real source");

  for (const line of lines) {
    for (let columns = 24; columns <= 80; columns += 1) {
      const rejoined = wrapLine(line, columns)
        .map((fragment) => line.slice(fragment.from, fragment.to))
        .join(" ");
      assert.equal(rejoined, line, `columns=${columns} damaged ${JSON.stringify(line)}`);
    }
  }
});

test("breaks land on whitespace, never inside a word", () => {
  for (let columns = 24; columns <= LONG.length; columns += 1) {
    for (const fragment of wrapLine(LONG, columns)) {
      if (fragment.from > 0) {
        assert.equal(
          LONG[fragment.from - 1],
          " ",
          `columns=${columns} broke mid-word at ${fragment.from}`,
        );
      }
      if (fragment.to < LONG.length) {
        assert.equal(LONG[fragment.to], " ", `columns=${columns} broke mid-word`);
      }
    }
  }
});

test("a continuation hangs at its line's own indentation, where the list marker was", () => {
  const fragments = wrapLine(LONG, 60);
  assert.equal(fragments.length, 2);
  const [, second] = fragments;
  assert.equal(second?.continuation, true);
  assert.equal(second?.indent, 2);
  assert.match(draw(LONG, second!), /^ {2}↳ /);
});

test("a fragment's measured width includes the glyph it will be drawn with", () => {
  for (const fragment of wrapLine(LONG, 60)) {
    assert.equal(fragmentWidth(fragment), draw(LONG, fragment).length);
  }
});

test("no projection ever exceeds the measure it was asked for", () => {
  for (let columns = 30; columns <= LONG.length; columns += 1) {
    for (const fragment of wrapLine(LONG, columns)) {
      assert.ok(
        fragmentWidth(fragment) <= columns,
        `columns=${columns} produced a ${fragmentWidth(fragment)}-column fragment`,
      );
    }
  }
});

test("a line with no break opportunity is returned whole rather than cut", () => {
  const unbreakable = "  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const fragments = wrapLine(unbreakable, 20);
  assert.equal(fragments.length, 1);
  assert.equal(draw(unbreakable, fragments[0]!), unbreakable);
  // And it is measured at its real width, so the search cannot mistake it for a fit.
  assert.equal(fragmentWidth(fragments[0]!), unbreakable.length);
});

test("indentation is never a break opportunity", () => {
  const deep = `${" ".repeat(20)}value here`;
  for (const fragment of wrapLine(deep, 24)) {
    assert.ok(fragment.from === 0 || deep.slice(fragment.from).trimStart() !== "");
  }
  // Nothing to gain: a hanging indent of 20 plus a glyph leaves no room, so it is left alone.
  assert.equal(wrapLine(deep, 24).length, 1);
});

test("a fragment carries the logical line it came from", () => {
  const lines = ["say:", LONG, "  - other"];
  const fragments = projectLines(lines, 60);
  assert.deepEqual(
    fragments.map((fragment) => fragment.source),
    [0, 1, 1, 2],
  );
});

test("a mark's line range covers every fragment those lines produced", () => {
  const lines = ["say:", LONG, "  - other"];
  const fragments = projectLines(lines, 60);
  // A mark resolved against the source covers lines 1..1; the renderer keys off `source`.
  const covered = fragments.filter(
    (fragment) => fragment.source >= 1 && fragment.source <= 1,
  );
  assert.equal(covered.length, 2, "one semantic line, two rendered regions");
  assert.deepEqual(
    covered.map((fragment) => fragment.continuation),
    [false, true],
  );
});

test("a height-bound block is left exactly as written", () => {
  // Fourteen short lines in a shallow box: wrapping can only make it taller.
  const lines = Array.from({ length: 14 }, (_, index) => `  - line ${index} of text`);
  const box = { width: 1622, height: 644 };
  const fit = fitProjection(
    lines.map((line) => [line]),
    box,
    TYPO,
  );
  assert.equal(fit.wrapped, false);
  assert.equal(projectLines(lines, fit.columns).length, lines.length);
});

test("a width-bound block wraps, and the measure chosen is the least that pays", () => {
  const box = { width: 1622, height: 644 };
  const rows = [["say:"], [LONG]];
  const fit = fitProjection(rows, box, TYPO);

  assert.equal(fit.wrapped, true);
  assert.ok(
    fit.size > fitSpecimen(rows.length, LONG.length, box, TYPO),
    `wrapping should have bought type, got ${fit.size}px`,
  );

  // Widest wins: no measure above the chosen one reaches this size, so nothing is being
  // broken that did not have to be.
  for (let columns = fit.columns + 1; columns <= LONG.length; columns += 1) {
    const fragments = rows.flatMap((variants) =>
      variants.flatMap((text) => wrapLine(text, columns)),
    );
    const height = rows.reduce(
      (total, variants) =>
        total + Math.max(...variants.map((text) => wrapLine(text, columns).length), 1),
      0,
    );
    const widest = Math.max(...fragments.map(fragmentWidth));
    assert.ok(
      fitSpecimen(height, widest, box, TYPO) < fit.size,
      `columns=${columns} matches the winner and is wider`,
    );
  }
});

test("the canonical deck's evidence scene reaches the ceiling with one break", () => {
  const deck = parsePresentation(
    readFileSync(join(repositoryRoot(), "examples", "cuecraft.yaml"), "utf8"),
    "examples/cuecraft.yaml",
  );
  const slide = deck.slides.find((candidate) => candidate.body.kind === "change");
  assert.ok(slide !== undefined, "the deck should still contain a change");
  assert.equal(slide.body.kind, "change");
  if (slide.body.kind !== "change") return;

  const derived = deriveChange(slide.body.before, slide.body.after);
  const rows = derived.rows.map((row) =>
    row.kind === "kept"
      ? [row.text]
      : [row.removed, row.added].filter((text): text is string => text !== undefined),
  );
  const box = codeBox(slide.title, TYPO);

  // Set literally, this scene is width-bound below the ceiling. That is the defect.
  const literal = fitSpecimen(derived.rows.length, derived.longestLine, box, TYPO);
  assert.ok(
    literal < CODE.maxSize,
    "the literal scene should still be the problem this fixes",
  );

  const fit = fitProjection(rows, box, TYPO);
  assert.equal(fit.size, CODE.maxSize, "the scene should now set at the deck's ceiling");
  assert.equal(fit.wrapped, true);

  const height = rows.reduce(
    (total, variants) =>
      total + Math.max(...variants.map((text) => wrapLine(text, fit.columns).length), 1),
    0,
  );
  assert.equal(
    height,
    derived.rows.length + 1,
    "exactly one line should have needed a break",
  );
});
