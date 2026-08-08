import assert from "node:assert/strict";
import { test } from "node:test";

import { bodyAddresses } from "./body.ts";
import type { NarrationCue } from "./cue.ts";
import { parsePresentation, PresentationError } from "./parse.ts";
import { SourceError, type RepositoryReader } from "./source.ts";

/**
 * A narration that descends, and comes back.
 *
 * The property under test throughout is that the *tree* survives being flattened. A module's
 * cues have to land between its own two thresholds and nowhere else, its identities have to stay
 * inside it, and a parent has to resume exactly where it stopped — because if any of those fail,
 * the compiler still produces a video, and the video is quietly about the wrong thing.
 *
 * Everything here parses against an injected reader, so no test in this file touches the disk.
 */

const ORIGIN = "decks/order.yaml";

function reader(files: Record<string, string>): RepositoryReader {
  return (file) => {
    const text = files[file];
    if (text === undefined) {
      throw new SourceError(
        `file ${JSON.stringify(file)} does not exist in the repository`,
      );
    }
    return text;
  };
}

const ROOT = `
title: A deck
slides:
  - slide:
      title: One
      world:
        entities:
          buy: You press Buy
          paying:
            label: Paying
            child: ./paying.yaml
          done: It turns up
        relations:
          - buy -> paying
          - paying -> done
    say:
      - speech: "You press Buy."
        activates: buy
      - enter: paying
      - speech: "And it turns up."
        activates: done
`;

const PAYING = `
world:
  entities:
    asks: The shop asks
    check:
      label: The check
      child: ./check.yaml
    answer: Yes or no
  relations:
    - asks -> check
    - check -> answer
say:
  - speech: "The shop asks."
    activates: asks
  - speech: "First, a check."
    activates: check
  - enter: check
  - speech: "Then the answer."
    activates: answer
`;

const CHECK = `
world:
  entities:
    known: What is known
    allowed: Allowed
  relations:
    - known -> allowed
say:
  - speech: "What is known."
    activates: known
  - speech: "Allowed."
    activates: allowed
`;

const FILES: Record<string, string> = {
  "decks/paying.yaml": PAYING,
  "decks/check.yaml": CHECK,
};

function parse(root: string = ROOT, files: Record<string, string> = FILES) {
  return parsePresentation(root, "order.yaml", {
    read: reader(files),
    origin: ORIGIN,
  });
}

function problems(root: string, files: Record<string, string> = FILES): string[] {
  try {
    parse(root, files);
  } catch (error) {
    if (error instanceof PresentationError) return [...error.problems];
    throw error;
  }
  return [];
}

/** The compiled stack as a readable transcript, which is what most of these assert on. */
function transcript(cues: readonly NarrationCue[]): string[] {
  return cues.map((cue) =>
    cue.kind === "speech"
      ? `narrate ${cue.scope}${cue.address === undefined ? "" : ` -> ${cue.address}`}`
      : cue.kind === "pause"
        ? `pause ${cue.scope}`
        : cue.kind === "dwell"
          ? `dwell ${cue.scope} -> ${cue.address}`
          : `${cue.kind} ${cue.scope} ${cue.into}`,
  );
}

/* -------------------------------------------------------------- loading */

test("a child module is resolved relative to the file that declared it", () => {
  const slide = parse().slides[0];
  assert.deepEqual(slide?.modules, ["decks/paying.yaml", "decks/check.yaml"]);
});

test("a module's body becomes the entity's interior, and may be a world", () => {
  const body = parse().slides[0]?.body;
  assert.equal(body?.kind, "world");
  const paying = body?.kind === "world" ? body.entities[1] : undefined;
  assert.equal(paying?.id, "paying");
  assert.equal(paying?.detail?.kind, "world");
  assert.equal(paying?.module?.path, "decks/paying.yaml");
  assert.equal(paying?.module?.scope, "root/paying");
});

/* ---------------------------------------------------------- call/return */

test("the descent is depth-first, and unwinds through the scopes it entered", () => {
  assert.deepEqual(transcript(parse().slides[0]?.say ?? []), [
    "narrate root -> root/buy",
    "enter root root/paying",
    "narrate root/paying -> root/paying/asks",
    "narrate root/paying -> root/paying/check",
    "enter root/paying root/paying/check",
    "narrate root/paying/check -> root/paying/check/known",
    "narrate root/paying/check -> root/paying/check/allowed",
    "exit root/paying root/paying/check",
    "narrate root/paying -> root/paying/answer",
    "exit root root/paying",
    "narrate root -> root/done",
  ]);
});

test("a grandchild returns to the child that called it, not to the root", () => {
  const cues = parse().slides[0]?.say ?? [];
  const exits = cues.filter((cue) => cue.kind === "exit");
  assert.deepEqual(
    exits.map((cue) => (cue.kind === "exit" ? `${cue.into} -> ${cue.scope}` : "")),
    ["root/paying/check -> root/paying", "root/paying -> root"],
  );
});

test("child narration is inserted before the parent resumes, not appended after it", () => {
  const cues = parse().slides[0]?.say ?? [];
  const lastChild = cues.findLastIndex((cue) => cue.scope === "root/paying");
  const resumed = cues.findLastIndex((cue) => cue.scope === "root");
  assert.ok(lastChild < resumed, "the parent's last cue comes after the child's");
  // ...and the parent said nothing at all in between.
  const inside = cues.slice(1, cues.length - 1);
  assert.ok(!inside.some((cue) => cue.kind === "speech" && cue.scope === "root"));
});

test("entry and exit occupy real time, and are the only silence around the descent", () => {
  const cues = parse().slides[0]?.say ?? [];
  for (const cue of cues) {
    if (cue.kind === "enter" || cue.kind === "exit") assert.ok(cue.milliseconds > 0);
  }
  assert.equal(cues.filter((cue) => cue.kind === "pause").length, 0);
});

test("compiling the same source twice produces the same stack", () => {
  assert.deepEqual(
    transcript(parse().slides[0]?.say ?? []),
    transcript(parse().slides[0]?.say ?? []),
  );
});

/* ------------------------------------------------------------ addresses */

test("two scopes may both declare the same name without colliding", () => {
  const files = {
    ...FILES,
    "decks/check.yaml": CHECK.replace(/known/g, "answer"),
  };
  const body = parse(ROOT, files).slides[0]?.body;
  assert.ok(body !== undefined);

  const addresses = bodyAddresses(body, "root").map((entry) => entry.address);
  assert.ok(addresses.includes("root/paying/answer"));
  assert.ok(addresses.includes("root/paying/check/answer"));

  // Each cue reached the one in its own scope, and the two are different elements.
  const reached = (parse(ROOT, files).slides[0]?.say ?? [])
    .filter((cue) => cue.kind === "speech" && cue.activates === "answer")
    .map((cue) => (cue.kind === "speech" ? cue.address : undefined));
  assert.deepEqual(reached, ["root/paying/check/answer", "root/paying/answer"]);
});

test("an inline detail's elements stay reachable from the narration around them", () => {
  // decision:25, unchanged: `detail` does not open a scope, because it brought no narration.
  const deck = `
title: A deck
slides:
  - slide:
      title: One
      world:
        entities:
          a: A thing
          b:
            label: Another
            detail:
              bullets:
                - id: inner
                  text: Something inside
        relations:
          - a -> b
    say:
      - speech: "Inside."
        activates: inner
`;
  const cue = parsePresentation(deck, "d.yaml").slides[0]?.say[0];
  assert.equal(cue?.kind === "speech" ? cue.address : undefined, "root/b/inner");
});

test("a cue may not reach into a module, because the module has its own narration", () => {
  const reported = problems(ROOT.replace("activates: done", "activates: asks"));
  assert.match(
    reported[0] ?? "",
    /activates "asks", which nothing on this slide declares/,
  );
  assert.match(reported[0] ?? "", /declared: buy, paying, done/);
});

/* ---------------------------------------------------------- diagnostics */

test("a missing module fails at parse time, before anything is synthesized", () => {
  const reported = problems(ROOT, { "decks/check.yaml": CHECK });
  assert.match(
    reported[0] ?? "",
    /"decks\/paying\.yaml" does not exist in the repository/,
  );
});

test("a malformed module is reported against the file it is in", () => {
  const reported = problems(ROOT, {
    ...FILES,
    "decks/check.yaml": "world: [1, 2]\nsay: hi\n",
  });
  assert.match(reported[0] ?? "", /module "decks\/check\.yaml"/);
});

test("a module that is not valid YAML says so, and names itself", () => {
  const reported = problems(ROOT, { ...FILES, "decks/check.yaml": "world: {\n" });
  assert.match(reported[0] ?? "", /module "decks\/check\.yaml" is not valid YAML/);
});

test("a module that includes itself reports the whole chain", () => {
  const reported = problems(ROOT, {
    ...FILES,
    "decks/check.yaml": CHECK.replace(
      "    allowed: Allowed",
      "    allowed:\n      label: Allowed\n      child: ./paying.yaml",
    ),
  });
  assert.match(reported[0] ?? "", /includes itself/);
  assert.match(
    reported[0] ?? "",
    /decks\/paying\.yaml -> decks\/check\.yaml -> decks\/paying\.yaml/,
  );
});

test("a module deeper than cuecraft has watched is refused, with the chain", () => {
  const deeper = CHECK.replace(
    "    allowed: Allowed",
    "    allowed:\n      label: Allowed\n      child: ./deeper.yaml",
  );
  const reported = problems(ROOT, {
    ...FILES,
    "decks/check.yaml": deeper,
    "decks/deeper.yaml": "bullets:\n  - One\nsay: Hello.\n",
  });
  assert.match(reported[0] ?? "", /is 4 modules deep/);
  assert.match(reported[0] ?? "", /decks\/deeper\.yaml/);
});

test("entering something that has no module says what could be entered instead", () => {
  const reported = problems(ROOT.replace("enter: paying", "enter: buy"));
  assert.match(reported[0] ?? "", /enters "buy", which has nothing inside it/);
  assert.match(reported[0] ?? "", /entered with: paying/);
});

test("entering an inline detail is refused, and the message says why", () => {
  const deck = `
title: A deck
slides:
  - slide:
      title: One
      world:
        entities:
          a: A thing
          b:
            label: Another
            detail:
              bullets:
                - Something inside
        relations:
          - a -> b
    say:
      - enter: b
      - "Done."
`;
  const reported = problems(deck, {});
  assert.match(reported[0] ?? "", /has an inline detail rather than a child module/);
});

test("an entity may be entered once, because a scope is a place rather than a visit", () => {
  const reported = problems(
    ROOT.replace(
      '      - speech: "And it turns up."\n        activates: done',
      "      - enter: paying",
    ),
  );
  assert.match(reported[0] ?? "", /enters "paying", which an earlier cue already enters/);
});

test("an entity carries one inside, written here or in a file, and not both", () => {
  const reported = problems(
    ROOT.replace(
      "            child: ./paying.yaml",
      "            child: ./paying.yaml\n            detail:\n              bullets:\n                - One",
    ),
  );
  assert.match(reported[0] ?? "", /has both "detail" and "child"/);
});

/* --------------------------------------------------- backward compatible */

test("a deck that never descends is parsed exactly as it was, in one scope", () => {
  const deck = `
title: A deck
slides:
  - slide:
      title: One
      bullets:
        - id: a
          text: First
        - Second
    say:
      - speech: "First."
        activates: a
      - pause: 400ms
      - "Second."
`;
  const slide = parsePresentation(deck, "d.yaml").slides[0];
  assert.deepEqual(slide?.modules, []);
  assert.deepEqual(transcript(slide?.say ?? []), [
    "narrate root -> root/a",
    "pause root",
    "narrate root",
  ]);
});
