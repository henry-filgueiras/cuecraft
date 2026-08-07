import { ANCHOR_ID, ANCHOR_ID_HINT } from "./identity.ts";

/**
 * A bounded population: many of the same thing, in named groups, in order.
 *
 * The eleventh role, and the first that is a *quantity* rather than a thing. Every other body is a
 * list of items the author wrote out — bullets, stages, marks, entities, lines of mathematics — so
 * every other body's size is the size of what was typed. This one is not. The author writes one
 * line and means sixty-four.
 *
 *     series:
 *       - count: 16
 *         text: Arrive with the block
 *       - id: derived
 *         count: 48
 *         text: Built from four earlier words
 *
 * **A group is an item with a cardinality**, which is why this needed almost nothing underneath
 * it. Groups are elements: they resolve through `bodyElements`, address through `bodyAddresses`,
 * activate through the same three-state envelope, and open as an interior through decision:25.
 * The *members* are not elements and can never become them — they have no identity, no content,
 * and no way to acquire either. The moment a member could carry something of its own this would
 * stop being a quantifier and become a table.
 *
 * **What it exists for** is the sentence a presentation could not previously make true. cuecraft
 * could show one unit of work and could only *assert* that unit becoming repeated work; narration
 * said "sixty-four of them" over a frame showing one. A count is a fact about the subject, and a
 * viewer watching sixty-four discrete pieces of work come into being has observed something rather
 * than been told it.
 *
 * **What is deliberately absent** is everything that would make this control flow. There is no
 * condition, no bound that could be unknown, no per-member value, no index the author can name, no
 * nesting, and no way to express "until". A series states a finite cardinality that was true
 * before the presentation existed. It does not *run*.
 */

/** One group of alike members, which may carry an identity narration can reach. */
export interface AuthoredSeriesGroup {
  readonly text: string;
  readonly count: number;
  readonly id?: string;
}

export const SERIES_GROUP_HINT =
  "{ count: <how many>, text: <what they are> }, optionally with an id";

const GROUP_KEYS = ["count", "text", "id"];

/**
 * The most members cuecraft will draw.
 *
 * Reasoned rather than picked. The field is laid out across the frame's content box, about 1650
 * pixels wide at 1080p, and a member has to stay a *discrete object* — something a viewer could
 * in principle count, or at least count a row of and multiply. At five hundred and twelve the
 * arrangement is thirty-two by sixteen and a cell is about forty pixels across, which is still
 * plainly a grid of things. An order of magnitude above that it is texture, the count stops being
 * checkable by looking, and the composition would be asserting a number again — which is the
 * failure this role was added to fix.
 *
 * So the ceiling is where the promise breaks, not where the arithmetic does.
 */
export const MAX_SERIES_TOTAL = 512;

/**
 * Whether one group is a group.
 *
 * `count` is checked hard because it is the only number an author writes anywhere in this format
 * that is not a duration, and every wrong shape of it is a different mistake: a float is a
 * misunderstanding of what a member is, zero is a group that should not have been written, and a
 * string is a typo that would otherwise render an empty field.
 */
export function seriesGroupProblem(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return `must be ${SERIES_GROUP_HINT}`;
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter((key) => !GROUP_KEYS.includes(key));
  if (extra.length > 0) {
    return `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${GROUP_KEYS.join(", ")})`;
  }

  const count = record["count"];
  if (count === undefined)
    return "count is required; a group of unknown size is not a group";
  if (typeof count !== "number" || !Number.isFinite(count)) {
    return "count must be a whole number of members";
  }
  if (!Number.isInteger(count)) {
    return `count is ${count}; members are counted, so a group cannot have a fraction of one`;
  }
  if (count < 1) {
    return `count is ${count}; a group has at least one member, and a group of none is written by not writing it`;
  }
  if (count > MAX_SERIES_TOTAL) {
    return `count is ${count}, and cuecraft draws at most ${MAX_SERIES_TOTAL} members; beyond that a member stops being something a viewer could count, which is the whole of what a series is for`;
  }

  if (typeof record["text"] !== "string" || record["text"].trim().length === 0) {
    return "text must say what the members are";
  }
  if (record["id"] !== undefined) {
    const id = record["id"];
    if (typeof id !== "string" || !ANCHOR_ID.test(id)) {
      return `id must be ${ANCHOR_ID_HINT}`;
    }
  }
  return undefined;
}

/** A validated group. */
export function seriesGroupOf(value: unknown): AuthoredSeriesGroup {
  const record = value as { text: string; count: number; id?: string };
  return record.id === undefined
    ? { text: record.text.trim(), count: record.count }
    : { text: record.text.trim(), count: record.count, id: record.id };
}

/** How many members the whole series has. */
export function seriesTotal(groups: readonly AuthoredSeriesGroup[]): number {
  return groups.reduce((sum, group) => sum + group.count, 0);
}

/** Where a group's members begin, in the flat member order. */
export function groupOffset(
  groups: readonly AuthoredSeriesGroup[],
  index: number,
): number {
  return groups.slice(0, index).reduce((sum, group) => sum + group.count, 0);
}
