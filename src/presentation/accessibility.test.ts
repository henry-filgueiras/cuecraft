import assert from "node:assert/strict";
import { test } from "node:test";

import { PresentationError, parsePresentation } from "./parse.ts";

/**
 * The one thing a presentation may say about who is watching it.
 *
 *     accessibility:
 *       dyslexia: true
 *
 * These tests are about the *surface* rather than about what it looks like: that it is at the root
 * and only at the root, that it means one thing, that the absence of it is indistinguishable from
 * saying no, and that getting it slightly wrong is reported rather than ignored. Whether the
 * resulting film is easier to read is a question for a person; whether the deck said so is a
 * question for a parser, and this is it.
 */

function deck(extra: string): string {
  return `title: "A deck"\n${extra}slides:\n  - slide:\n      title: "One"\n    say: "Hello."\n`;
}

function problems(source: string): readonly string[] {
  try {
    parsePresentation(source, "test.yaml");
  } catch (error) {
    assert.ok(error instanceof PresentationError, `unexpected error: ${String(error)}`);
    return error.problems;
  }
  assert.fail("expected the source to be rejected");
}

/* ------------------------------------------------------------- the three cases */

/**
 * The case that matters most, and the one nobody would think to write a test for.
 *
 * Every deck in `examples/` and every deck anybody has ever written is this case. If it stopped
 * resolving to `default` the feature would have changed the typography of the entire repository
 * while adding an opt-in setting, which is the failure mode this whole round is arranged around.
 */
test("a deck that says nothing gets the profile it always had", () => {
  assert.equal(parsePresentation(deck(""), "test.yaml").typography, "default");
});

test("an explicit false is indistinguishable from saying nothing", () => {
  const silent = parsePresentation(deck(""), "test.yaml");
  const refused = parsePresentation(
    deck("accessibility:\n  dyslexia: false\n"),
    "test.yaml",
  );
  assert.equal(refused.typography, "default");
  assert.equal(refused.typography, silent.typography);

  // ...and an empty object is the same again: writing the key without answering it is not an
  // answer, and must not become a third meaning.
  assert.equal(
    parsePresentation(deck("accessibility: {}\n"), "test.yaml").typography,
    "default",
  );
});

test("dyslexia: true resolves to the hyperlegible profile", () => {
  assert.equal(
    parsePresentation(deck("accessibility:\n  dyslexia: true\n"), "test.yaml").typography,
    "hyperlegible",
  );
});

/* ------------------------------------------------------------- what is refused */

/**
 * A misspelling is a silent no-op unless somebody refuses it.
 *
 * Worse here than anywhere else in this format. `pre_say` spelled wrong produces a deck that is
 * visibly mistimed; `dyslexia` spelled wrong produces a deck that renders beautifully, looks
 * exactly like the author intended, and helps nobody — and the person it fails is not the person
 * reading the YAML.
 */
test("a misspelled key inside accessibility is refused, and the allowed set is named", () => {
  const reported = problems(deck("accessibility:\n  dislexia: true\n"));
  assert.equal(reported.length, 1);
  assert.match(reported[0] as string, /unknown field "dislexia"/);
  assert.match(reported[0] as string, /allowed: dyslexia/);
});

test("accessibility does not become a place to ask for a font", () => {
  for (const key of ["font", "typeface", "family", "size", "line_height", "theme"]) {
    const reported = problems(deck(`accessibility:\n  ${key}: "whatever"\n`));
    assert.match(reported[0] as string, new RegExp(`unknown field "${key}"`));
  }
});

test("dyslexia is a boolean and nothing else", () => {
  for (const written of ['"true"', "1", "yes-please", "[true]"]) {
    const reported = problems(deck(`accessibility:\n  dyslexia: ${written}\n`));
    assert.match(reported[0] as string, /accessibility\.dyslexia/);
  }
});

/* ------------------------------------------------------------- where it may not go */

/**
 * The placement rule, stated three times because there are three places somebody would try.
 *
 * A film that changed face partway through would be worse for the reader than either face alone —
 * which is why this is not "ignored where it does not belong" but refused there.
 */
test("accessibility on a slide entry is refused", () => {
  const reported = problems(
    `title: "A deck"\nslides:\n  - slide:\n      title: "One"\n    accessibility:\n      dyslexia: true\n    say: "Hello."\n`,
  );
  assert.match(reported[0] as string, /unknown field "accessibility"/);
});

test("accessibility inside a slide's content is refused", () => {
  const reported = problems(
    `title: "A deck"\nslides:\n  - slide:\n      title: "One"\n      accessibility:\n        dyslexia: true\n    say: "Hello."\n`,
  );
  assert.match(reported[0] as string, /unknown field "accessibility"/);
});

test("accessibility under defaults is refused", () => {
  const reported = problems(deck("defaults:\n  accessibility:\n    dyslexia: true\n"));
  assert.match(reported[0] as string, /unknown field "accessibility"/);
});

/* ------------------------------------------------------------- nesting */

/**
 * A module inherits the root's answer and has no way to state its own.
 *
 * Checked through the real module reader rather than through a mock, because the guarantee is
 * about the message an author gets: `../presentation/module.ts` names `accessibility` among the
 * keys a module may not carry, beside `defaults`, and says why.
 */
test("a module may not carry an accessibility setting", async () => {
  const { readModuleDocument, ModuleError } = await import("./module.ts");
  assert.throws(
    () =>
      readModuleDocument(
        { world: { entities: [] }, accessibility: { dyslexia: true } },
        "child.yaml",
        ["world"],
      ),
    (error: unknown) => {
      assert.ok(error instanceof ModuleError);
      assert.match(error.message, /accessibility/);
      assert.match(error.message, /presentation root/);
      return true;
    },
  );
});

/**
 * The compiled model carries the intent and never a typeface.
 *
 * The property that keeps `accessibility` from being `font:` with extra steps. A downstream
 * consumer of a parsed presentation can learn *which profile was selected* and cannot learn what
 * it is set in — so a later round that changed the face serving this constraint would not change
 * a single byte of any compiled artifact.
 */
test("nothing in the parsed presentation names a font", () => {
  const parsed = parsePresentation(
    deck("accessibility:\n  dyslexia: true\n"),
    "test.yaml",
  );
  assert.equal(parsed.typography, "hyperlegible");
  const serialized = JSON.stringify(parsed);
  assert.doesNotMatch(serialized, /Atkinson|Helvetica|Menlo|font-family/i);
});
