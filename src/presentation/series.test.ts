import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { compilePresentation, type SynthesizeNarration } from "../compile/compile.ts";
import { buildTimeline } from "../compile/timeline.ts";
import { bodyAddresses, bodyElements } from "./body.ts";
import { parsePresentation, PresentationError } from "./parse.ts";
import { MAX_SERIES_TOTAL, seriesGroupProblem } from "./series.ts";
import { SourceError, type RepositoryReader } from "./source.ts";

/**
 * A bounded population, and the narration interval that fills it.
 *
 * Two properties are under test and they are not the same one. That the *count* is a semantic
 * fact the author states and everything else is derived — so a wrong count is a compile error and
 * a right one costs one line. And that the *interval* is measured rather than authored: rewording
 * a sentence retimes the field, and there is no key anywhere that could set how long it takes.
 */

const workspaces: string[] = [];
after(() =>
  Promise.all(workspaces.map((path) => rm(path, { recursive: true, force: true }))),
);

/** One second of speech per five characters, so a longer sentence is measurably longer. */
const narrator: SynthesizeNarration = async (request) => {
  await writeFile(request.output, "not really a wav");
  return {
    durationSeconds: request.text.length / 5,
    leadingSilenceSeconds: 0.3,
    voice: request.voice ?? "af_heart",
    speed: request.speed ?? 1,
  };
};

function problems(source: string, read?: RepositoryReader): string[] {
  try {
    parsePresentation(source, "d.yaml", {
      ...(read === undefined ? {} : { read, origin: "decks/d.yaml" }),
    });
  } catch (error) {
    if (error instanceof PresentationError) return [...error.problems];
    throw error;
  }
  return [];
}

function deck(series: string, say: string): string {
  return `title: A deck
slides:
  - slide:
      title: One
      series:
${series}
    say:
${say}
`;
}

const SIMPLE = deck(
  `        - id: many
          count: 64
          text: units of work`,
  `      - speech: "Sixty-four of them, one after another."
        fills: many`,
);

async function compile(source: string) {
  const workspace = await mkdtemp(join(tmpdir(), "cuecraft-series-"));
  workspaces.push(workspace);
  const compiled = await compilePresentation(parsePresentation(source, "d.yaml"), {
    workspace,
    synthesize: narrator,
  });
  const timeline = buildTimeline(compiled);
  const scene = timeline.scenes[0];
  assert.ok(scene !== undefined);
  return scene;
}

/* ------------------------------------------------------------- the count */

test("a group is a count and what the members are", () => {
  const body = parsePresentation(SIMPLE, "d.yaml").slides[0]?.body;
  assert.equal(body?.kind, "series");
  assert.deepEqual(body?.kind === "series" ? body.groups : [], [
    { id: "many", count: 64, text: "units of work" },
  ]);
});

test("sixty-four members cost one entry", () => {
  const body = parsePresentation(SIMPLE, "d.yaml").slides[0]?.body;
  assert.equal(body?.kind === "series" ? body.groups.length : -1, 1);
  // The groups are the elements. The members are not, and never will be.
  assert.ok(body !== undefined);
  assert.equal(bodyElements(body).length, 1);
});

test("a count that is not a count is refused, and each way says which", () => {
  assert.match(seriesGroupProblem({ text: "x" }) ?? "", /count is required/);
  assert.match(seriesGroupProblem({ text: "x", count: 0 }) ?? "", /at least one member/);
  assert.match(seriesGroupProblem({ text: "x", count: -3 }) ?? "", /at least one member/);
  assert.match(seriesGroupProblem({ text: "x", count: 1.5 }) ?? "", /fraction of one/);
  assert.match(seriesGroupProblem({ text: "x", count: "64" }) ?? "", /whole number/);
  assert.match(seriesGroupProblem({ text: "x", count: NaN }) ?? "", /whole number/);
  assert.match(
    seriesGroupProblem({ text: "x", count: MAX_SERIES_TOTAL + 1 }) ?? "",
    new RegExp(`at most ${MAX_SERIES_TOTAL}`),
  );
});

test("a group says what its members are, and takes no other keys", () => {
  assert.match(
    seriesGroupProblem({ count: 4 }) ?? "",
    /text must say what the members are/,
  );
  assert.match(
    seriesGroupProblem({ count: 4, text: "x", colour: "red" }) ?? "",
    /unknown key/,
  );
  assert.match(
    seriesGroupProblem({ count: 4, text: "x", rows: 2 }) ?? "",
    /unknown key "rows"/,
  );
  assert.equal(seriesGroupProblem({ count: 4, text: "x", id: "some-name" }), undefined);
});

test("a series too big in total is refused even when every group is legal", () => {
  // Each group is exactly at the ceiling and therefore legal on its own; two of them are not.
  const reported = problems(
    deck(
      `        - { count: ${MAX_SERIES_TOTAL}, text: one }\n        - { count: ${MAX_SERIES_TOTAL}, text: two }`,
      `      - "Words."`,
    ),
  );
  assert.match(reported[0] ?? "", /members in total/);
});

test("two groups may not claim the same identity", () => {
  const reported = problems(
    deck(
      `        - { id: a, count: 2, text: one }\n        - { id: a, count: 2, text: two }`,
      `      - "Words."`,
    ),
  );
  assert.match(reported[0] ?? "", /duplicate id "a"; group 1 already uses it/);
});

test("a series with no groups is a mistake, not an empty field", () => {
  const reported = problems(
    `title: A deck\nslides:\n  - slide: { title: One, series: [] }\n    say: "Words."\n`,
  );
  assert.match(reported[0] ?? "", /at least one group/);
});

/* ---------------------------------------------------------- the interval */

test("fills resolves to an address, exactly as activates does", () => {
  const cue = parsePresentation(SIMPLE, "d.yaml").slides[0]?.say[0];
  assert.equal(cue?.kind === "speech" ? cue.fills : undefined, "many");
  assert.equal(cue?.kind === "speech" ? cue.fillsAddress : undefined, "root/many");
  assert.equal(cue?.kind === "speech" ? cue.activates : undefined, undefined);
});

test("a cue reaches at a moment or fills across itself, and not both", () => {
  const reported = problems(
    deck(
      `        - { id: many, count: 4, text: units }`,
      `      - speech: "Both."\n        activates: many\n        fills: many`,
    ),
  );
  assert.match(reported[0] ?? "", /has both activates and fills/);
});

test("only a population fills; everything else is reached at a moment", () => {
  const reported = problems(
    `title: A deck
slides:
  - slide:
      title: One
      bullets:
        - id: point
          text: A point
    say:
      - speech: "Filling a bullet."
        fills: point
`,
  );
  assert.match(reported[0] ?? "", /is not a group of a series/);
  assert.match(reported[0] ?? "", /reached at a moment with activates/);
});

test("filling something nothing declares names the scope", () => {
  const reported = problems(
    deck(
      `        - { id: many, count: 4, text: units }`,
      `      - speech: "X."\n        fills: nope`,
    ),
  );
  assert.match(reported[0] ?? "", /fills "nope", which nothing on this slide declares/);
  assert.match(reported[0] ?? "", /declared: many/);
});

test("a group may be filled once", () => {
  const reported = problems(
    deck(
      `        - { id: many, count: 4, text: units }`,
      `      - speech: "One."\n        fills: many\n      - speech: "Two."\n        fills: many`,
    ),
  );
  assert.match(reported[0] ?? "", /which an earlier cue already reaches/);
});

/* ---------------------------------------------- the interval is measured */

test("a span begins at the first audible sample and runs to the end of the clip", async () => {
  const scene = await compile(SIMPLE);
  assert.equal(scene.spans.length, 1);
  const span = scene.spans[0];
  const clip = scene.clips[0];
  assert.ok(span !== undefined && clip !== undefined);

  assert.equal(span.id, "many");
  assert.equal(span.address, "root/many");
  assert.equal(span.elementIndex, 0);
  // 0.3s of leading silence at 30fps is nine frames — decision:13's rule, the one anchors use.
  assert.equal(span.from, clip.from + 9);
  assert.equal(span.from + span.durationInFrames, clip.from + clip.durationInFrames);
});

test("rewording the sentence retimes the field, with no timing edit anywhere", async () => {
  const shorter = await compile(SIMPLE);
  const longer = await compile(
    SIMPLE.replace(
      '"Sixty-four of them, one after another."',
      '"Sixty-four of them, one after another, each one stirring the state a little further than the last."',
    ),
  );
  const before = shorter.spans[0];
  const after = longer.spans[0];
  assert.ok(before !== undefined && after !== undefined);
  assert.ok(
    after.durationInFrames > before.durationInFrames * 1.5,
    "a much longer sentence must fill much more slowly",
  );
});

test("a population costs no extra narration", async () => {
  const scene = await compile(SIMPLE);
  assert.equal(scene.clips.length, 1, "sixty-four members, one clip");
});

test("compiling the same source twice produces the same span", async () => {
  const [first, second] = await Promise.all([compile(SIMPLE), compile(SIMPLE)]);
  assert.deepEqual(first.spans, second.spans);
});

test("a deck with no population carries no spans", async () => {
  const scene = await compile(
    `title: A deck\nslides:\n  - slide: { title: One }\n    say: "Words."\n`,
  );
  assert.deepEqual(scene.spans, []);
});

/* ------------------------------------------------------ inside a module */

const CHILD = `
series:
  - id: derived
    count: 48
    text: built from earlier ones
say:
  - speech: "Forty-eight more."
    fills: derived
`;

const HOST = `
title: A deck
slides:
  - slide:
      title: One
      world:
        entities:
          a: A thing
          inner:
            label: The population
            child: ./child.yaml
        relations:
          - a -> inner
    say:
      - speech: "Going in."
        activates: a
      - enter: inner
`;

test("a population inside a child module resolves in its own scope", () => {
  const read: RepositoryReader = (file) => {
    if (file === "decks/child.yaml") return CHILD;
    throw new SourceError(
      `file ${JSON.stringify(file)} does not exist in the repository`,
    );
  };
  const slide = parsePresentation(HOST, "d.yaml", { read, origin: "decks/d.yaml" })
    .slides[0];
  const filling = (slide?.say ?? []).find(
    (cue) => cue.kind === "speech" && cue.fills !== undefined,
  );
  assert.equal(
    filling?.kind === "speech" ? filling.fillsAddress : undefined,
    "root/inner/derived",
  );
});

test("two modules may both call a group `derived` without colliding", () => {
  const read: RepositoryReader = (file) => {
    if (file === "decks/child.yaml") return CHILD;
    if (file === "decks/other.yaml") return CHILD.replace("48", "16");
    throw new SourceError(
      `file ${JSON.stringify(file)} does not exist in the repository`,
    );
  };
  const host = HOST.replace(
    "        relations:",
    `          second:
            label: Another population
            child: ./other.yaml
        relations:
          - inner -> second`,
  ).replace("      - enter: inner", "      - enter: inner\n      - enter: second");

  const slide = parsePresentation(host, "d.yaml", { read, origin: "decks/d.yaml" })
    .slides[0];
  const filling = (slide?.say ?? [])
    .filter((cue) => cue.kind === "speech" && cue.fillsAddress !== undefined)
    .map((cue) => (cue.kind === "speech" ? cue.fillsAddress : undefined));
  assert.deepEqual(filling, ["root/inner/derived", "root/second/derived"]);

  // ...and they resolve to two different elements of one flat list.
  const body = slide?.body;
  assert.ok(body !== undefined);
  const addresses = bodyAddresses(body, "root").map((entry) => entry.address);
  assert.ok(addresses.includes("root/inner/derived"));
  assert.ok(addresses.includes("root/second/derived"));
});
