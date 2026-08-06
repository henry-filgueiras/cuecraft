import { diffLines } from "diff";

import { specimenLines } from "./specimen.ts";

/**
 * Two source states, and the change between them — derived, never annotated.
 *
 * The self-demo's most important claim is that changing the source re-derives everything
 * downstream, and until now it only *said* so over a static frame (idea:11). A specimen has
 * one state, so there was no way to show a source becoming another source.
 *
 * A change has two. The author names both — inline, or quoted from the repository — and says
 * nothing else. Which lines were removed, which were added, and which are context are not
 * authored, because they are a **function of the two states** and anything the compiler can
 * work out for itself is not the author's to get wrong. That is the same trade decision:14
 * makes with timing, one level up: state the relationship, derive the mechanics.
 *
 * The diffing itself is `jsdiff`'s, per CLAUDE.md — line granularity, no word-level splitting
 * inside a line, which at presentation scale is noise rather than information.
 *
 * ## The display model
 *
 * A diff is usually shown as removed lines *followed by* added lines, which makes a change
 * read as a list of two things rather than as one thing becoming another. Here each hunk is
 * laid out as a fixed stack of **swap rows**: removed line *i* and added line *i* occupy the
 * same row, and the hunk is as tall as its taller side. Unchanged lines never move, whatever
 * the change does to the line count — so the frame shows a transformation happening in place
 * rather than two blocks of code side by side.
 *
 * Pure and free of React, so the derivation is unit-testable and the renderer only decides
 * what a swap row *looks* like.
 */

export type ChangeRow =
  | { readonly kind: "kept"; readonly text: string }
  | {
      readonly kind: "swap";
      /** Absent when this row is pure addition. */
      readonly removed?: string;
      /** Absent when this row is pure removal. */
      readonly added?: string;
    };

export interface DerivedChange {
  readonly rows: readonly ChangeRow[];
  /** Row indices belonging to the change: the compiler's answer to "what is different". */
  readonly changedRows: readonly number[];
  /** Longest line either state puts on the frame, for sizing. */
  readonly longestLine: number;
}

/**
 * Derive the change between two source states.
 *
 * Both states are trimmed the way a specimen is — trailing whitespace and surrounding blank
 * lines are accidents of authoring rather than content — so that a change is never reported
 * between two texts a viewer would read as identical.
 */
export function deriveChange(before: string, after: string): DerivedChange {
  const beforeLines = specimenLines(before);
  const afterLines = specimenLines(after);

  const rows: ChangeRow[] = [];
  const changedRows: number[] = [];

  let pendingRemoved: string[] = [];
  let pendingAdded: string[] = [];

  const flush = (): void => {
    const height = Math.max(pendingRemoved.length, pendingAdded.length);
    for (let index = 0; index < height; index += 1) {
      const removed = pendingRemoved[index];
      const added = pendingAdded[index];
      changedRows.push(rows.length);
      rows.push({
        kind: "swap",
        ...(removed === undefined ? {} : { removed }),
        ...(added === undefined ? {} : { added }),
      });
    }
    pendingRemoved = [];
    pendingAdded = [];
  };

  for (const part of diffLines(text(beforeLines), text(afterLines))) {
    const lines = partLines(part.value);
    if (part.removed === true) {
      pendingRemoved.push(...lines);
    } else if (part.added === true) {
      pendingAdded.push(...lines);
    } else {
      flush();
      for (const line of lines) rows.push({ kind: "kept", text: line });
    }
  }
  flush();

  const longestLine = [...beforeLines, ...afterLines].reduce(
    (longest, line) => Math.max(longest, line.length),
    0,
  );

  return { rows, changedRows, longestLine };
}

function text(lines: readonly string[]): string {
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

/** A diff part's value is newline-terminated; the final empty segment is not a line. */
function partLines(value: string): readonly string[] {
  const lines = value.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}
