import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { SlideBody } from "./presentation/body.ts";
import { columnId, rowId } from "./presentation/exhibit.ts";
import { parsePresentation } from "./presentation/parse.ts";
import { repositoryRoot } from "./repository.ts";

/**
 * Whether the shipped decks are telling the truth.
 *
 * Every other test in this repository checks the *compiler*. This one checks an **artifact**,
 * and it exists because `examples/sha256/` makes claims that are checkable and would otherwise
 * be checked by nobody. A mis-transcribed rotation amount produces a film that renders
 * beautifully and teaches something false, which is the exact failure a presentation compiler is
 * supposed to make impossible — decision:18 refuses to display source that has drifted, and this
 * is the same principle applied to mathematics that cannot be quoted from anywhere.
 *
 * The mechanism is deliberately not "compare the TeX against a string in this file", because
 * that only proves two copies agree. The rotation and shift amounts are **read out of the deck's
 * own formulas**, a reference SHA-256 is built from *those* numbers, and its output is compared
 * against `node:crypto` on standard vectors. If the film says `ROTR^8` where FIPS 180-4 says
 * `ROTR^7`, the digest is wrong and this fails.
 *
 * The reference below is a **test fixture**: not exported, unreachable from anywhere else, and
 * no part of what cuecraft ships. It exists so the deck can be interrogated rather than trusted.
 */

const SHA_DIR = join(repositoryRoot(), "examples", "sha256");

function deckBody(): SlideBody {
  const path = join(SHA_DIR, "sha256.yaml");
  const body = parsePresentation(readFileSync(path, "utf8"), path).slides[0]?.body;
  assert.ok(body !== undefined, "the SHA-256 deck has no body");
  return body;
}

/** Every line of mathematics anywhere in the deck, at any depth. */
function formulas(body: SlideBody): readonly string[] {
  if (body.kind === "formula") return body.lines.map((line) => line.tex);
  if (body.kind !== "world") return [];
  return body.entities.flatMap((entity) =>
    entity.detail === undefined ? [] : formulas(entity.detail),
  );
}

/** Every group of every population anywhere in the deck. */
function populations(body: SlideBody): readonly { count: number; text: string }[] {
  if (body.kind === "series") return body.groups;
  if (body.kind !== "world") return [];
  return body.entities.flatMap((entity) =>
    entity.detail === undefined ? [] : populations(entity.detail),
  );
}

/**
 * The rotation and shift amounts the deck claims, pulled out of its own TeX.
 *
 * `\sigma_0(x) \;=\; \mathrm{ROTR}^{7}(x) \oplus ...` yields `[7, 18, 3]`, in the order written,
 * which is the order FIPS 180-4 writes them in and the order the reference consumes them.
 */
function amounts(tex: readonly string[], defines: string): readonly number[] {
  const line = tex.find((entry) => entry.startsWith(defines));
  assert.ok(line !== undefined, `the deck never defines ${defines}`);
  const found = [...line.matchAll(/\\mathrm\{(?:ROTR|SHR)\}\^\{(\d+)\}/g)].map((match) =>
    Number(match[1]),
  );
  assert.equal(found.length, 3, `${defines} should fold three shifted copies together`);
  return found;
}

/* ------------------------------------------------------ the test fixture */

/** The first `howMany` primes, so nothing about the constants is copied. */
function primes(howMany: number): number[] {
  const found: number[] = [];
  for (let candidate = 2; found.length < howMany; candidate += 1) {
    if (found.every((prime) => candidate % prime !== 0)) found.push(candidate);
  }
  return found;
}

/** Round constants: fractional parts of the cube roots of the first sixty-four primes. */
const K = primes(64).map((prime) => Math.floor((Math.cbrt(prime) % 1) * 2 ** 32) >>> 0);
/** Initial hash value: the same, from the square roots of the first eight. */
const H0 = primes(8).map((prime) => Math.floor((Math.sqrt(prime) % 1) * 2 ** 32) >>> 0);

const rotr = (x: number, n: number): number => ((x >>> n) | (x << (32 - n))) >>> 0;
const shr = (x: number, n: number): number => x >>> n;
const fold = (a: number, b: number, c: number): number => (a ^ b ^ c) >>> 0;

interface Claimed {
  readonly smallSigma0: readonly number[];
  readonly smallSigma1: readonly number[];
  readonly bigSigma0: readonly number[];
  readonly bigSigma1: readonly number[];
}

const at = (list: readonly number[], index: number): number => list[index] as number;

/**
 * SHA-256, parameterised by what the film says.
 *
 * Everything structural — the padding, the recurrence, `T1`, `T2`, both injections, the shift,
 * the feed-forward — is written the way the deck describes it *in words*, in the order FIPS
 * 180-4 states it. Everything numeric comes from `claimed`, which was read out of the deck's
 * formulas. So this is not a second implementation to keep in step: it is the film, executed.
 */
function digestAs(claimed: Claimed, message: string): string {
  const bytes = Buffer.from(message, "utf8");

  // "A single one bit, then zeros, then the original length written into the last sixty-four,
  // until the whole thing divides exactly into five hundred and twelve."
  const padded = Buffer.alloc((Math.floor((bytes.length + 8) / 64) + 1) * 64);
  bytes.copy(padded);
  padded[bytes.length] = 0x80;
  padded.writeBigUInt64BE(BigInt(bytes.length) * 8n, padded.length - 8);

  const h = [...H0];
  const w = new Array<number>(64).fill(0);

  for (let block = 0; block < padded.length; block += 64) {
    // "The first sixteen words are the block itself, unchanged."
    for (let t = 0; t < 16; t += 1) w[t] = padded.readUInt32BE(block + t * 4);

    // "Every word after that is built from four earlier ones. Two of them are smeared first."
    for (let t = 16; t < 64; t += 1) {
      const s0 = fold(
        rotr(at(w, t - 15), at(claimed.smallSigma0, 0)),
        rotr(at(w, t - 15), at(claimed.smallSigma0, 1)),
        shr(at(w, t - 15), at(claimed.smallSigma0, 2)),
      );
      const s1 = fold(
        rotr(at(w, t - 2), at(claimed.smallSigma1, 0)),
        rotr(at(w, t - 2), at(claimed.smallSigma1, 1)),
        shr(at(w, t - 2), at(claimed.smallSigma1, 2)),
      );
      w[t] = (s1 + at(w, t - 7) + s0 + at(w, t - 16)) >>> 0;
    }

    // "The eight words being carried are copied into eight working slots, a through h."
    let [a, b, c, d, e, f, g, hh] = h as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];

    // "And that same round runs sixty-four times."
    for (let t = 0; t < 64; t += 1) {
      const big1 = fold(
        rotr(e, at(claimed.bigSigma1, 0)),
        rotr(e, at(claimed.bigSigma1, 1)),
        rotr(e, at(claimed.bigSigma1, 2)),
      );
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (hh + big1 + ch + at(K, t) + at(w, t)) >>> 0;

      const big0 = fold(
        rotr(a, at(claimed.bigSigma0, 0)),
        rotr(a, at(claimed.bigSigma0, 1)),
        rotr(a, at(claimed.bigSigma0, 2)),
      );
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (big0 + maj) >>> 0;

      // In the order the standard states it, so that `e` gets the *old* `d`: six shift down,
      // and two receive. "Two of the eight get new values, not one."
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    // "Then the eight working slots are added back into the eight words that came in."
    const worked = [a, b, c, d, e, f, g, hh];
    for (let index = 0; index < 8; index += 1) {
      h[index] = (at(h, index) + at(worked, index)) >>> 0;
    }
  }

  return h.map((word) => word.toString(16).padStart(8, "0")).join("");
}

/* ------------------------------------------------------------ the checks */

/** The claims, read from the deck rather than restated here. */
function claimed(): Claimed {
  const tex = formulas(deckBody());
  return {
    smallSigma0: amounts(tex, "\\sigma_0"),
    smallSigma1: amounts(tex, "\\sigma_1"),
    bigSigma0: amounts(tex, "\\Sigma_0"),
    bigSigma1: amounts(tex, "\\Sigma_1"),
  };
}

test("the deck defines four sigmas, and the small pair is not the big pair", () => {
  const claims = claimed();
  assert.notDeepEqual(
    claims.smallSigma0,
    claims.bigSigma0,
    "the schedule's sigma and the round's sigma must not be the same function",
  );
  assert.notDeepEqual(claims.smallSigma1, claims.bigSigma1);
});

test("SHA-256 as the film describes it produces SHA-256", () => {
  const claims = claimed();
  for (const message of ["", "abc", "hello", "cuecraft", "a".repeat(200)]) {
    assert.equal(
      digestAs(claims, message),
      createHash("sha256").update(message).digest("hex"),
      `the deck's own rotation amounts do not produce SHA-256 for ${JSON.stringify(message.slice(0, 12))}`,
    );
  }
});

test("the check has teeth: one wrong rotation breaks the digest", () => {
  const claims = claimed();
  const wrong: Claimed = {
    ...claims,
    bigSigma1: [
      at(claims.bigSigma1, 0) + 1,
      at(claims.bigSigma1, 1),
      at(claims.bigSigma1, 2),
    ],
  };
  assert.notEqual(
    digestAs(wrong, "abc"),
    createHash("sha256").update("abc").digest("hex"),
    "a deck that misstated a rotation would have passed, so this test proves nothing",
  );
});

test("the counts on screen are the counts in the standard", () => {
  const groups = populations(deckBody());
  const totals = groups.map((group) => group.count);
  // Sixteen arrive with the block, forty-eight are derived, and sixty-four rounds run.
  assert.deepEqual(totals, [16, 48, 64]);
  assert.equal(
    (totals[0] as number) + (totals[1] as number),
    totals[2] as number,
    "one schedule word is spent per round, so the schedule and the rounds must agree",
  );
});

test("the digest arithmetic the film states is the arithmetic that happens", () => {
  const words = 8;
  const bits = 32;
  assert.equal(words * bits, 256);
  assert.equal(createHash("sha256").update("abc").digest("hex").length, 64);
  assert.equal((words * bits) / 4, 64, "one hexadecimal digit is four bits");
});

test("the film makes no absolute claim about reversal", () => {
  const path = join(SHA_DIR, "sha256.yaml");
  const spoken = readFileSync(path, "utf8");
  for (const forbidden of [
    "impossible",
    "no way at all",
    "cannot be reversed",
    "never be",
  ]) {
    assert.ok(
      !spoken.toLowerCase().includes(forbidden),
      `the narration says ${JSON.stringify(forbidden)}, which is stronger than the truth`,
    );
  }
});

/* --------------------------------------------------- examples/revenue/ */

/**
 * Whether the revenue deck's spoken and drawn claims match the CSV it ships beside.
 *
 * The same principle as everything above, applied to the one deck whose picture cuecraft does not
 * draw. Nothing here renders anything or runs R — what is checked is that the numbers the deck
 * *states* are the numbers in the file R will be handed. A deck that says "four hundred and
 * sixty-eight transactions" over a chart built from four hundred and twelve rows renders
 * beautifully and asserts something false, which is the failure decision:18 refuses for source and
 * the exhibit body refuses for images.
 *
 * It also holds the line the exhibit body exists to hold: **no image may be committed here**. The
 * moment one is, the claim the deck makes about itself stops being true.
 */
const REVENUE_DIR = join(repositoryRoot(), "examples", "revenue");

interface Transaction {
  readonly region: string;
  readonly quarter: number;
  readonly revenue: number;
}

function transactions(): readonly Transaction[] {
  const text = readFileSync(join(REVENUE_DIR, "transactions.csv"), "utf8").trim();
  const [header, ...rows] = text.split("\n");
  assert.equal(header, "date,region,product,revenue");
  return rows.map((row) => {
    const [date = "", region = "", , revenue = ""] = row.split(",");
    const month = Number(date.slice(5, 7));
    return { region, quarter: Math.floor((month - 1) / 3) + 1, revenue: Number(revenue) };
  });
}

test("the revenue deck's population is the population in the CSV", () => {
  const path = join(REVENUE_DIR, "revenue.yaml");
  const deck = parsePresentation(readFileSync(path, "utf8"), path);
  const groups = deck.slides.flatMap((slide) =>
    slide.body.kind === "series" ? slide.body.groups : [],
  );
  assert.ok(
    groups.length > 0,
    "the revenue deck no longer shows its rows as a population",
  );

  const rows = transactions();
  const counted = new Map<string, number>();
  for (const row of rows) counted.set(row.region, (counted.get(row.region) ?? 0) + 1);

  // Group text is the region name, so the drawn field and the file are the same fact.
  for (const group of groups) {
    assert.equal(
      group.count,
      counted.get(group.text),
      `the deck draws ${group.count} for ${group.text}, and the CSV has ${counted.get(group.text)}`,
    );
  }
  assert.equal(
    groups.reduce((sum, group) => sum + group.count, 0),
    rows.length,
  );

  // And the narration says the same number out loud, spelled the way it is spoken.
  const spoken = readFileSync(path, "utf8");
  assert.ok(
    spoken.includes("Four hundred and sixty-eight"),
    "the narration states a total that is no longer the file's",
  );
  assert.equal(rows.length, 468);
});

test("the revenue deck's spoken reading of the chart is what the data does", () => {
  const rows = transactions();
  const totals = (region: string, quarter: number): number =>
    rows
      .filter((row) => row.region === region && row.quarter === quarter)
      .reduce((sum, row) => sum + row.revenue, 0);

  // "Asia Pacific doubles across the year."
  assert.ok(
    totals("Asia Pacific", 4) >= 2 * totals("Asia Pacific", 1),
    "the narration claims Asia Pacific doubles, and it does not",
  );
  // "Latin America does not move."
  const latam = [1, 2, 3, 4].map((quarter) => totals("Latin America", quarter));
  const drift = (Math.max(...latam) - Math.min(...latam)) / Math.min(...latam);
  assert.ok(
    drift < 0.25,
    `Latin America moves by ${(drift * 100).toFixed(0)}%, which is movement`,
  );
});

test("what the revenue deck shows is what the R program names", () => {
  const path = join(REVENUE_DIR, "revenue.yaml");
  const deck = parsePresentation(readFileSync(path, "utf8"), path);
  const body = deck.slides.find((slide) => slide.body.kind === "exhibit")?.body;
  assert.ok(body?.kind === "exhibit", "the revenue deck no longer carries an exhibit");

  // Materialization checks this against R on every render (decision:57). This checks it against
  // the *data*, without running anything: the program names its regions after the regions in the
  // CSV, so a region added to the data with no `shows:` entry fails here rather than in a render.
  const regions = [...new Set(transactions().map((row) => row.region))]
    .map((region) => region.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
    .sort();
  assert.deepEqual([...body.shows].sort(), regions);

  // And the two the narration actually reaches are among them, spelled the same way.
  const spoken = readFileSync(path, "utf8");
  for (const reached of ["asia-pacific", "latin-america"]) {
    assert.ok(spoken.includes(`activates: ${reached}`), `nothing activates ${reached}`);
    assert.ok(body.shows.includes(reached), `${reached} is reached but not shown`);
  }
});

test("no image is committed beside the deck that claims none is", () => {
  const entries = readdirSync(REVENUE_DIR);
  const images = entries.filter((entry) =>
    /\.(png|jpe?g|gif|webp|svg|pdf)$/i.test(entry),
  );
  assert.deepEqual(
    images,
    [],
    "an image in examples/revenue/ makes the deck's central claim false",
  );
  assert.deepEqual(entries.sort(), [
    "quarterly-revenue.R",
    "revenue.yaml",
    "transactions.csv",
  ]);
});

/* ----------------------------------------------------- examples/pivot/ */

/**
 * Whether the pivot deck's spoken claims are true of the CSV it ships beside.
 *
 * The revenue block above checks a deck whose picture cuecraft cannot read. This one checks a deck
 * that gets **data** back, which makes the same failure both easier to commit and easier to catch:
 * every row identity the narration reaches is derived from a cell, so a deck can be left pointing
 * at a row that no longer exists by an edit to the transactions and nothing else.
 *
 * Nothing here renders anything or runs R. What is asserted is that the arithmetic the narration
 * *states* is the arithmetic in the file, and that every `shows:` name is one the data will
 * actually generate — which is the parse-time half of a check materialization does again for real.
 */
const PIVOT_DIR = join(repositoryRoot(), "examples", "pivot");

function pivotTransactions(): readonly {
  readonly region: string;
  readonly product: string;
  readonly quarter: number;
  readonly revenue: number;
}[] {
  const [header = "", ...rows] = readFileSync(join(PIVOT_DIR, "transactions.csv"), "utf8")
    .trim()
    .split("\n");
  assert.equal(header, "date,region,product,revenue");
  return rows.map((row) => {
    const [date = "", region = "", product = "", revenue = ""] = row.split(",");
    const month = Number(date.slice(5, 7));
    return {
      region,
      product,
      quarter: Math.floor((month - 1) / 3) + 1,
      revenue: Number(revenue),
    };
  });
}

/** The same grouping `quarterly-table.R` does, in the language the deck is written in. */
function segments(): ReadonlyMap<string, readonly number[]> {
  const totals = new Map<string, number[]>();
  for (const row of pivotTransactions()) {
    const key = `${row.region} ${row.product}`;
    const quarters = totals.get(key) ?? [0, 0, 0, 0];
    quarters[row.quarter - 1] = (quarters[row.quarter - 1] ?? 0) + row.revenue;
    totals.set(key, quarters);
  }
  return totals;
}

test("the pivot deck says how many transactions there are, and there are", () => {
  const spoken = readFileSync(join(PIVOT_DIR, "pivot.yaml"), "utf8");
  assert.equal(pivotTransactions().length, 673);
  assert.ok(
    spoken.includes("Six hundred and seventy-three"),
    "the deck no longer states the population it was written against",
  );
  assert.ok(
    spoken.includes("Twenty-four segments"),
    "the deck no longer states how many segments the pivot produces",
  );
  assert.equal(segments().size, 24);
});

test("every row the pivot deck reaches is a row the data will generate", () => {
  const path = join(PIVOT_DIR, "pivot.yaml");
  const deck = parsePresentation(readFileSync(path, "utf8"), path);
  const body = deck.slides.find(
    (slide) => slide.body.kind === "exhibit" && slide.body.key !== undefined,
  )?.body;
  assert.ok(body?.kind === "exhibit", "the pivot deck no longer carries a table exhibit");

  // The identities materialization will generate, derived here from the raw data rather than from
  // the program's output — so a segment renamed in the CSV fails against the deck immediately.
  const generated = new Set([
    ...[...segments().keys()].map((key) => rowId(key)),
    ...["segment", "Q1", "Q2", "Q3", "Q4", "movement"].map((header) => columnId(header)),
  ]);
  for (const name of body.shows) {
    assert.ok(
      generated.has(name),
      `${name} is shown and the data generates no such identity`,
    );
  }

  // And the key column is one the program writes, spelled the way the deck spells it.
  assert.equal(body.key, "segment");
});

test("the pivot deck's reading of the regional chart is what the data does", () => {
  const byRegion = new Map<string, number[]>();
  for (const row of pivotTransactions()) {
    const quarters = byRegion.get(row.region) ?? [0, 0, 0, 0];
    quarters[row.quarter - 1] = (quarters[row.quarter - 1] ?? 0) + row.revenue;
    byRegion.set(row.region, quarters);
  }
  const at = (region: string, quarter: number): number =>
    byRegion.get(region)?.[quarter - 1] ?? 0;

  // "West opened the year as the largest region." / "It closed the year slightly smaller."
  const openers = [...byRegion].map(([region]) => [region, at(region, 1)] as const);
  assert.equal(openers.sort((a, b) => b[1] - a[1])[0]?.[0], "West");
  assert.ok(at("West", 4) < at("West", 1));

  // "South opened as the smallest by some distance." / "It closed level with West."
  assert.equal(openers.at(-1)?.[0], "South");
  assert.ok(Math.abs(at("South", 4) - at("West", 4)) / at("West", 4) < 0.05);

  // "It also wrote a name onto each of the sixteen bars."
  assert.equal(byRegion.size * 4, 16);
});

test("the pivot deck's reading of the table is what the segments do", () => {
  const totals = [...segments()].map(
    ([key, quarters]) => [key, quarters, quarters.reduce((a, b) => a + b, 0)] as const,
  );
  const ordered = [...totals].sort((a, b) => b[2] - a[2]);

  // "The largest is East's Fathom line, and it grew all year."
  const [largest] = ordered;
  assert.equal(largest?.[0], "East Fathom");
  assert.ok((largest?.[1][3] ?? 0) > (largest?.[1][0] ?? 0));

  // "West's Cirrus line lost two thirds of its revenue, and it is twelve rows down."
  const cirrus = ordered.findIndex(([key]) => key === "West Cirrus");
  assert.equal(cirrus + 1, 12, "West Cirrus is no longer the twelfth row");
  const west = ordered[cirrus]?.[1] ?? [];
  assert.ok(
    (west[3] ?? 0) / (west[0] ?? 1) < 0.4,
    "West Cirrus no longer loses two thirds",
  );

  // "South's Ember line is further down still, and it more than quadrupled."
  const ember = ordered.findIndex(([key]) => key === "South Ember");
  assert.ok(ember > cirrus, "South Ember is no longer further down than West Cirrus");
  const south = ordered[ember]?.[1] ?? [];
  assert.ok((south[3] ?? 0) / (south[0] ?? 1) > 4, "South Ember no longer quadruples");

  // The claim the whole slide rests on: the two rows narration goes and finds are not on screen
  // when it asks for them. Seven is the most a register ever shows in this deck's room, so a row
  // past it is offscreen whatever the subtitle band turns out to cost.
  assert.ok(cirrus >= 7, "West Cirrus is now visible without the table moving");
  assert.ok(ember >= 7, "South Ember is now visible without the table moving");
});

test("no artifact is committed beside the pivot deck either", () => {
  const entries = readdirSync(PIVOT_DIR);
  const artifacts = entries.filter((entry) =>
    /\.(png|jpe?g|gif|webp|svg|pdf)$/i.test(entry),
  );
  assert.deepEqual(
    artifacts,
    [],
    "a committed artifact in examples/pivot/ makes the deck's central claim false",
  );
  assert.deepEqual(entries.sort(), [
    "pivot.yaml",
    "quarterly-chart.R",
    "quarterly-table.R",
    "transactions.csv",
  ]);
});

/* --------------------------------------------------- examples/phantom/ */

/**
 * Whether the showpiece deck's spoken claims are true of the model it ships beside.
 *
 * This one is checked for a reason the others are not: it is the first film a stranger watches,
 * and the sentences in it quote a *simulation* rather than a file. `examples/sha256/` can be
 * wrong about mathematics; this deck can be wrong about a run that no longer happens the way it
 * did when the words were written. Nudging a parameter in `model.R` by a hair would leave a film
 * that renders beautifully and narrates a jam that arrives at a different time — which is the
 * failure decision:18 refuses for quoted source, applied to arithmetic that cannot be quoted.
 *
 * The R is not executed here; `npm run check` must pass on a machine with no R at all. What is
 * checked is everything about the deck that can be checked without it: that the states the
 * narration names are the states the program declares, that the picture's names and the slide's
 * `shows:` agree, and that nothing generated has been committed beside them.
 */

const PHANTOM_DIR = join(repositoryRoot(), "examples", "phantom");

function phantomSource(file: string): string {
  return readFileSync(join(PHANTOM_DIR, file), "utf8");
}

test("the deck only stops the film at states the program declares", () => {
  const deck = phantomSource("phantom.yaml");
  const program = phantomSource("ring.R");

  // What the film will name, read out of the program rather than listed here: `states_of()`
  // returns a vector whose names become `#cuecraft moment` lines, one per state.
  const declared = new Set(
    [...program.matchAll(/^\s{2}c\((.*)\)$/gm)]
      .flatMap((match) => (match[1] ?? "").split(","))
      .map((pair) => pair.trim().split("=")[0]?.trim() ?? "")
      .filter((name) => name.length > 0),
  );
  const model = phantomSource("model.R");
  for (const name of [...model.matchAll(/^\s+c\((\w+ = .*)\)$/gm)]
    .flatMap((match) => (match[1] ?? "").split(","))
    .map((pair) => pair.trim().split("=")[0]?.trim() ?? "")) {
    if (name.length > 0) declared.add(name);
  }

  const named = [...deck.matchAll(/^\s+(?:during|replay): (\S+)$/gm)].map(
    (match) => match[1] ?? "",
  );
  assert.ok(named.length > 0, "the deck no longer stops the film at all");
  for (const state of named) {
    assert.ok(
      declared.has(state),
      `the deck names ${state}, which model.R does not reach`,
    );
  }
});

test("the deck reaches every element the drawing names, and no others", () => {
  const path = join(PHANTOM_DIR, "phantom.yaml");
  const deck = parsePresentation(readFileSync(path, "utf8"), path);

  // Non-empty rather than merely present: the film's slide is an exhibit too, and it shows
  // nothing, so `shows !== undefined` finds the wrong slide and passes an empty comparison.
  const slide = deck.slides.find(
    (candidate) =>
      candidate.body.kind === "exhibit" && (candidate.body.shows?.length ?? 0) > 0,
  );
  assert.ok(slide !== undefined, "no slide in the phantom deck shows anything");
  const body = slide.body;
  assert.ok(body.kind === "exhibit");

  // What the program writes onto the shapes it draws, read out of the program.
  const drawing = phantomSource("wave.R");
  // Up to the first close-paren, not the last: the program subsets the role list to the marks it
  // actually drew, and a greedy match swallows the subscript along with the names.
  const roles = (drawing.match(/names\(named\) <- c\(([^)]*)\)/)?.[1] ?? "")
    .split(",")
    .map((quoted) => quoted.trim().replace(/^"|"$/g, ""));

  assert.deepEqual(
    [...(body.shows ?? [])].sort(),
    [...roles].sort(),
    "wave.R and the slide disagree about what the picture shows",
  );

  const spoken = readFileSync(path, "utf8");
  for (const role of roles) {
    assert.ok(
      spoken.includes(`activates: ${role}`),
      `${role} is drawn and shown, and nothing says it`,
    );
  }
});

test("no artifact is committed beside the phantom deck", () => {
  const entries = readdirSync(PHANTOM_DIR);
  const artifacts = entries.filter((entry) =>
    /\.(png|jpe?g|gif|webp|svg|pdf|mp4|mov|webm)$/i.test(entry),
  );
  assert.deepEqual(
    artifacts,
    [],
    "a committed artifact in examples/phantom/ makes the deck's central claim false",
  );
  assert.deepEqual(entries.sort(), ["model.R", "phantom.yaml", "ring.R", "wave.R"]);
});
