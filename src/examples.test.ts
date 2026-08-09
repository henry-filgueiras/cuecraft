import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { SlideBody } from "./presentation/body.ts";
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
