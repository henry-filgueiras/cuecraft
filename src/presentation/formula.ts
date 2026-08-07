import katex from "katex";

import { ANCHOR_ID, ANCHOR_ID_HINT } from "./identity.ts";

/**
 * Mathematics as a body.
 *
 * The tenth role, and the first added because a subject stopped being a *shape* rather than
 * because it wanted a different arrangement of one. Every other body in this format is a
 * sequence of prose, of source, or of things and relations. At the bottom of an explanation of a
 * hash function there is none of those left: there is a definition, it is one line, and a graph
 * of two-word plates cannot say it.
 *
 *     formula:
 *       - id: choose
 *         tex: '\mathrm{Ch}(e,f,g) = (e \wedge f) \oplus (\lnot e \wedge g)'
 *
 * **A list of lines, exactly as `bullets` is.** That is not a coincidence and it is not laziness:
 * a formula body is a sequence of things a sentence can point at, which is precisely what an
 * anchored list is, so it resolves through `bodyElements` with no new addressing and no new
 * portal mechanism. A body that needed its own way of being reached would have been a second
 * content language.
 *
 * **The typesetting is delegated and the vocabulary is TeX's.** decision:5's rule applies with
 * no interpretation needed — putting mathematics on a screen is a solved problem with a mature,
 * pure, offline answer, and the alternative is a hand-rolled approximation that will be wrong
 * about spacing in a way nobody can articulate and everybody can see. Inventing a semantic
 * mathematics vocabulary on top of it was considered and refused: TeX notation *is* how
 * mathematics is written down, in the same way `->` is how a relation is written down
 * (decision:22), and a cuecraft-specific spelling of `\oplus` would be a worse notation that
 * fewer people can read.
 *
 * **What is deliberately absent** is everything that would make this a typesetting system rather
 * than a role: no alignment environments, no numbering, no multi-line derivations, no display
 * versus inline distinction, no size, no colour. A line is a line. A body that could express a
 * proof would be a document format living inside a presentation format, which is the mistake
 * decision:25 avoided by making an interior an ordinary slide body.
 *
 * **It is validated here, at parse time**, for the same reason a mark is: a formula that will not
 * typeset would otherwise put a broken picture on a frame under a heading claiming it is
 * mathematics, and that is the failure this whole layer exists to prevent.
 */

/** One line of mathematics, which may carry an identity narration can reach. */
export interface AuthoredFormulaLine {
  readonly tex: string;
  readonly id?: string;
}

export const FORMULA_LINE_HINT = 'TeX, or { id: some-name, tex: "..." }';

const LINE_KEYS = ["tex", "id"];

/**
 * Whether one line is a line, and whether KaTeX will set it.
 *
 * The two checks are not separated, unlike a mark's, because there is nothing useful to say
 * between them: a well-formed entry carrying TeX that does not parse is not half-right, it is a
 * line that cannot be drawn. KaTeX's own message is carried through verbatim — it points at the
 * offending token with a caret, which is better than anything this could paraphrase.
 */
export function formulaLineProblem(value: unknown): string | undefined {
  const read = texOf(value);
  if (read.problem !== undefined) return read.problem;

  try {
    katex.renderToString(read.tex, { throwOnError: true, displayMode: true });
  } catch (error) {
    if (error instanceof katex.ParseError) {
      return error.message.replace(/^KaTeX parse error: /, "will not typeset: ");
    }
    throw error;
  }
  return undefined;
}

/**
 * The TeX of a well-formed line, or what is wrong with the entry that should have carried it.
 *
 * A record with two fields rather than a string that is *either* the TeX or the complaint,
 * which is what this was first written as. That version could not tell them apart — a complaint
 * is a string and so is TeX, so every malformed line was handed to KaTeX, typeset as prose, and
 * accepted. The tests caught it; the type would have.
 */
function texOf(
  value: unknown,
): { tex: string; problem?: undefined } | { tex?: undefined; problem: string } {
  if (typeof value === "string") {
    return value.trim().length === 0 ? { problem: "must not be empty" } : { tex: value };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { problem: `must be ${FORMULA_LINE_HINT}` };
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter((key) => !LINE_KEYS.includes(key));
  if (extra.length > 0) {
    return {
      problem: `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${LINE_KEYS.join(", ")})`,
    };
  }
  const tex = record["tex"];
  if (typeof tex !== "string" || tex.trim().length === 0) {
    return { problem: "tex must not be empty" };
  }
  if (record["id"] !== undefined) {
    const id = record["id"];
    if (typeof id !== "string" || !ANCHOR_ID.test(id)) {
      return { problem: `id must be ${ANCHOR_ID_HINT}` };
    }
  }
  return { tex };
}

/** A validated line, in either of its two authored forms. */
export function formulaLineOf(value: unknown): AuthoredFormulaLine {
  if (typeof value === "string") return { tex: value.trim() };
  const record = value as { tex: string; id?: string };
  return record.id === undefined
    ? { tex: record.tex.trim() }
    : { tex: record.tex.trim(), id: record.id };
}

/**
 * The set, as markup.
 *
 * `displayMode` because every line here is a displayed equation — there is no inline mathematics
 * in this format, since there is no prose for it to be inline *in*. `trust` and macros are left
 * off: a presentation that can define TeX macros is a presentation with a preprocessor in it.
 */
export function setFormula(tex: string): string {
  return katex.renderToString(tex, {
    throwOnError: false,
    displayMode: true,
    output: "html",
  });
}

/**
 * Roughly how wide this line will set, in multiples of its font size.
 *
 * Estimated rather than measured, for the reason `headingLines` estimates and `fitSpecimen`
 * counts characters: composition has to resolve without a browser, and a formula's size has to be
 * a fact the compiler could report. Control sequences are collapsed to the one glyph they
 * usually produce, spacing commands to nothing, and braces dropped — which for the class of
 * material this body exists for (a definition, a couple of operators, some subscripts) predicts
 * the set width closely enough to choose between three sizes.
 */
export function formulaMeasure(tex: string): number {
  const glyphs = tex
    // `\mathrm{Ch}` and friends keep their argument; the command itself sets nothing.
    .replace(/\\(?:mathrm|mathit|mathbf|text|operatorname)\s*/g, "")
    // Spacing commands set space, and the widest of them is about a quad.
    .replace(/\\[,;:!]|\\quad|\\qquad/g, "  ")
    // Every other control sequence sets about one glyph: \oplus, \wedge, \sigma, \Rightarrow.
    .replace(/\\[A-Za-z]+/g, "x")
    .replace(/[{}]/g, "")
    .replace(/\^|_/g, "");
  // Subscripts and superscripts set smaller; counting them whole is close enough and errs wide.
  return glyphs.length * FORMULA_CHAR_WIDTH;
}

/**
 * Average advance width of KaTeX's math faces, as a fraction of the font size.
 *
 * Computer Modern is narrower than the deck's sans, and mathematics is mostly italic letters and
 * spaced operators. Measured across the definitions in `examples/sha256/`, which is exactly the
 * material this was added for.
 */
const FORMULA_CHAR_WIDTH = 0.52;
