/**
 * Source code as slide content, and the parts of it narration can reach.
 *
 * A code block is the one kind of content whose *whitespace is meaning*. Everything else on a
 * slide is a phrase that the renderer may set, wrap and balance as it likes; a specimen's
 * indentation is the structure the viewer is being shown, so it survives untouched from the
 * YAML to the frame.
 *
 * The interesting question is how narration reaches part of one. A bullet is an obvious unit
 * with an obvious identity. A code block is a wall of text, and the tempting handles for
 * addressing it are all bad:
 *
 * - **Line numbers** are coordinates. They are projection data smuggled into source — exactly
 *   what decision:14 rejected for timing — and they go stale the moment a line is inserted.
 * - **Character ranges** are worse coordinates.
 * - **Markers embedded in the source** contaminate the thing being displayed. The specimen has
 *   to stay a believable piece of code, because being believable is its entire job.
 *
 * So a mark names a line by *what that line says*: `line: "say:"` means "the line where `say:`
 * begins", which is how a person would point at it out loud. Matching is exact-substring and
 * must hit exactly one line — zero matches and ambiguous matches are both hard errors, because
 * a mark that silently addressed the wrong region would produce a video that emphasises the
 * wrong thing while looking entirely correct.
 *
 * A mark covers the line it names **plus everything indented beneath it**, so `say:` means the
 * `say:` section rather than four naked characters. That rule is about indentation, not about
 * YAML, and it degrades to a single line in a language that does not carry structure that way.
 *
 * Pure and free of React, so validation and rendering agree by construction rather than by two
 * implementations happening to match.
 */

export interface AuthoredMark {
  readonly id: string;
  /** Identifies the line this mark opens, by a substring of it. */
  readonly line: string;
}

/** A resolved mark: the inclusive line range it covers in `specimenLines(source)`. */
export interface MarkSpan {
  readonly id: string;
  readonly from: number;
  readonly to: number;
}

/**
 * The lines that will actually be displayed.
 *
 * YAML's block scalar has already removed the block's common indentation by the time this sees
 * it, so the only work left is at the edges: trailing whitespace on a line is invisible and
 * only ever an accident, and leading or trailing blank lines would push the block off-centre
 * for no reason the author intended. Interior blank lines are kept — they are the author
 * separating one part of the specimen from another, which is exactly the sort of thing a
 * reader is being asked to see.
 */
export function specimenLines(source: string): readonly string[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n").map(trimEnd);
  let first = 0;
  let last = lines.length - 1;
  while (first <= last && lines[first] === "") first += 1;
  while (last >= first && lines[last] === "") last -= 1;
  return lines.slice(first, last + 1);
}

/** Every line index containing `needle`. Exact and case-sensitive: this is code. */
export function matchingLines(
  lines: readonly string[],
  needle: string,
): readonly number[] {
  const found: number[] = [];
  lines.forEach((line, index) => {
    if (line.includes(needle)) found.push(index);
  });
  return found;
}

/**
 * Why a mark cannot be resolved, phrased for the author rather than for the schema.
 *
 * Returns `undefined` when the mark is fine, so validation and resolution can share one rule.
 */
export function markProblem(
  lines: readonly string[],
  mark: AuthoredMark,
): string | undefined {
  const matches = matchingLines(lines, mark.line);
  if (matches.length === 0) {
    return `line ${JSON.stringify(mark.line)} does not appear in this slide's code`;
  }
  if (matches.length > 1) {
    const where = matches.map((index) => index + 1).join(", ");
    return (
      `line ${JSON.stringify(mark.line)} matches ${matches.length} lines of this slide's ` +
      `code (${where}); it must identify exactly one`
    );
  }
  return undefined;
}

/**
 * Resolve every mark to the line range it covers.
 *
 * Marks may nest — a mark on `say:` covers the `activates:` line inside it, and both are
 * legitimate things for narration to reach — so this returns spans rather than a partition, and
 * leaves the renderer to decide what an overlapped line looks like.
 *
 * Marks that do not resolve are dropped rather than thrown on: validation rejects them at parse
 * time with a message naming the slide, and by the time a frame is being drawn there is nobody
 * left to tell.
 */
export function resolveMarkSpans(
  lines: readonly string[],
  marks: readonly AuthoredMark[],
): readonly MarkSpan[] {
  const spans: MarkSpan[] = [];
  for (const mark of marks) {
    const matches = matchingLines(lines, mark.line);
    const from = matches[0];
    if (from === undefined || matches.length > 1) continue;
    spans.push({ id: mark.id, from, to: blockEnd(lines, from) });
  }
  return spans;
}

/**
 * The last line belonging to the block opened at `from`: everything indented more deeply,
 * with interior blank lines carried along rather than ending the block.
 *
 * A blank line inside a section is a breath, not a boundary. A blank line followed by something
 * at the original indentation is the boundary, and is not included.
 *
 * Exported because this one rule does two jobs. A mark uses it to decide how much of a specimen
 * to emphasise; `./source.ts` uses it to decide how much of a file to *show* — the construct a
 * line opens is both the semantic point of interest and the smallest unit that contains it, in
 * a language where indentation carries structure.
 */
export function blockEnd(lines: readonly string[], from: number): number {
  const base = indentOf(lines[from] ?? "");
  let end = from;
  for (let index = from + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line === "") continue;
    if (indentOf(line) <= base) break;
    end = index;
  }
  return end;
}

export function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function trimEnd(line: string): string {
  return line.replace(/\s+$/, "");
}
