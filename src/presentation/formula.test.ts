import assert from "node:assert/strict";
import { test } from "node:test";

import { bodyAddresses, bodyElements } from "./body.ts";
import {
  formulaLineOf,
  formulaLineProblem,
  formulaMeasure,
  setFormula,
} from "./formula.ts";
import { parsePresentation, PresentationError } from "./parse.ts";

/**
 * Mathematics, checked at the boundary it is actually risky at.
 *
 * There is nothing to test about how KaTeX sets an equation — that is the whole reason for
 * delegating it. What is worth testing is the seam: that a formula which will not typeset is
 * refused before a frame exists, that a line is reachable by narration exactly as a bullet is,
 * and that the body carries no way to say anything about how it looks.
 */

const CH = String.raw`\mathrm{Ch}(e,f,g) = (e \wedge f) \oplus (\lnot e \wedge g)`;

function problems(source: string): string[] {
  try {
    parsePresentation(source, "d.yaml");
  } catch (error) {
    if (error instanceof PresentationError) return [...error.problems];
    throw error;
  }
  return [];
}

function deck(formula: string, say = '"Words."'): string {
  return `title: A deck\nslides:\n  - slide:\n      title: One\n      formula:\n${formula}\n    say: ${say}\n`;
}

/* ------------------------------------------------------------- the line */

test("a line is TeX, or TeX with an identity", () => {
  assert.deepEqual(formulaLineOf("x = 1"), { tex: "x = 1" });
  assert.deepEqual(formulaLineOf({ id: "ch", tex: CH }), { id: "ch", tex: CH });
});

test("TeX that will not typeset is a problem, with KaTeX's own complaint", () => {
  const problem = formulaLineProblem(String.raw`x = \notacommand{y}`);
  assert.match(problem ?? "", /will not typeset/);
  assert.match(problem ?? "", /Undefined control sequence/);
  assert.equal(formulaLineProblem(CH), undefined);
});

test("a line that is not a line says what one is", () => {
  assert.match(formulaLineProblem(42) ?? "", /must be TeX/);
  assert.match(formulaLineProblem("   ") ?? "", /must not be empty/);
  assert.match(formulaLineProblem({ tex: CH, size: 40 }) ?? "", /unknown key "size"/);
  assert.match(formulaLineProblem({ tex: CH, id: "Not Kebab" }) ?? "", /id must be/);
});

test("setting produces markup rather than an exception, once validation has passed", () => {
  const html = setFormula(CH);
  assert.match(html, /class="katex/);
  // The variables are set, and so are the operators that a plain-text rendering would lose.
  assert.match(html, /⊕/);
  assert.match(html, /∧/);
});

test("a line's measure grows with what it sets, not with how it is written", () => {
  const short = formulaMeasure("x = 1");
  const long = formulaMeasure(CH);
  assert.ok(long > short);
  // `\;` sets space and `\mathrm{}` sets nothing of its own: a spelling that adds neither
  // glyphs nor space must not make the line wider.
  assert.equal(
    formulaMeasure(String.raw`\mathrm{Ch}(e)`),
    formulaMeasure(String.raw`\mathrm  {Ch}(e)`),
  );
});

/* ------------------------------------------------------- as a slide body */

test("a formula is a body, and the composition is chosen from the role", () => {
  const presentation = parsePresentation(deck(`        - '${CH}'`), "d.yaml");
  const body = presentation.slides[0]?.body;
  assert.equal(body?.kind, "formula");
  assert.deepEqual(body?.kind === "formula" ? body.lines : [], [{ tex: CH }]);
});

test("a line narration reaches is an element like any other", () => {
  const presentation = parsePresentation(
    deck(
      `        - id: ch\n          tex: '${CH}'\n        - 'x = 1'`,
      `\n      - speech: "One line."\n        activates: ch`,
    ),
    "d.yaml",
  );
  const body = presentation.slides[0]?.body;
  assert.ok(body !== undefined);
  // Two elements in source order, and the identity resolves to an address like a bullet's.
  assert.deepEqual(
    bodyElements(body).map((element) => element.id),
    ["ch", undefined],
  );
  assert.deepEqual(
    bodyAddresses(body, "root").map((entry) => entry.address),
    ["root/ch", undefined],
  );
  const cue = presentation.slides[0]?.say[0];
  assert.equal(cue?.kind === "speech" ? cue.address : undefined, "root/ch");
});

test("malformed TeX fails at parse time, naming the slide and the line", () => {
  const reported = problems(deck(String.raw`        - 'x = \notacommand{y}'`));
  assert.match(reported[0] ?? "", /slide 1, slide\.formula\.0/);
  assert.match(reported[0] ?? "", /will not typeset/);
});

test("two lines may not claim the same identity", () => {
  const reported = problems(
    deck(`        - { id: a, tex: 'x = 1' }\n        - { id: a, tex: 'y = 2' }`),
  );
  assert.match(reported[0] ?? "", /duplicate id "a"; line 1 already uses it/);
});

test("a formula with nothing in it is a mistake, not an empty slide", () => {
  assert.match(
    problems(deck("        []").replace("\n        []", " []"))[0] ?? "",
    /at least one line/,
  );
});

test("a formula is one of the bodies, and a slide has one body", () => {
  const both = `title: A deck
slides:
  - slide:
      title: One
      formula:
        - 'x = 1'
      bullets:
        - One
    say: "Words."
`;
  assert.match(problems(both)[0] ?? "", /has "bullets" and "formula"/);
});

/* ------------------------------------------------ as an entity's interior */

test("a formula may be what a concept opens into", () => {
  const source = `title: A deck
slides:
  - slide:
      title: One
      world:
        entities:
          a: A thing
          b:
            label: The definition
            detail:
              formula:
                - id: ch
                  tex: '${CH}'
        relations:
          - a -> b
    say:
      - speech: "Inside."
        activates: ch
`;
  const presentation = parsePresentation(source, "d.yaml");
  const body = presentation.slides[0]?.body;
  assert.ok(body?.kind === "world");
  assert.equal(body.entities[1]?.detail?.kind, "formula");
  // An inline interior does not open a scope, so the cue reaches it from the slide's own
  // narration — decision:25, and the reason the formulas in examples/sha256/ are `detail:`.
  const cue = presentation.slides[0]?.say[0];
  assert.equal(cue?.kind === "speech" ? cue.address : undefined, "root/b/ch");
});

test("a formula inside a concept is validated there too", () => {
  const source = `title: A deck
slides:
  - slide:
      title: One
      world:
        entities:
          a: A thing
          b:
            label: The definition
            detail:
              formula:
                - 'x = \\notacommand{y}'
        relations:
          - a -> b
    say: "Words."
`;
  assert.match(problems(source)[0] ?? "", /will not typeset/);
});
