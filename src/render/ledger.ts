import type {
  AuthoredMachine,
  AuthoredOccurrence,
  AuthoredState,
  AuthoredTransition,
} from "../presentation/machine.ts";
import { scenarioPath } from "../presentation/machine.ts";
import { FRAME, MACHINE } from "./theme.ts";
import type { Typography } from "./typography.ts";

/**
 * The execution ledger: what happened, in the order it happened.
 *
 * ## The thing the map cannot say
 *
 * sprint:19's composition answers "how did it get here" twice and both answers are **spatial**.
 * The wake says which edges have been taken and how recently; the `×N` counters say how many times.
 * Together they are a complete aggregate history and they are genuinely good — a frame paused
 * anywhere reconstructs the *set* of things that happened. What neither of them can say, and what
 * no amount of drawing on a map can say, is the **order**. A machine that goes
 * `Queued → Claimed → Running → Retry wait → Queued → Claimed → Running` draws exactly the same
 * wake as one that went round the other way, and the counts are identical.
 *
 * The old readout tried and could not. It listed the last four *states*, which loses the identity
 * of the transition — two parallel transitions between one pair of states produce the same two
 * names, and the only thing that tells them apart is what fired them, which is precisely what the
 * readout dropped. And when it ran out of room it printed `…`, which says "some things happened"
 * and is worse than saying nothing, because it looks like an answer.
 *
 * So this is a list of **occurrences**, not of states:
 *
 *     3   lease renewed             -> Running
 *     4   handler exceeds deadline  -> Retry wait
 *     5   backoff expires           -> Queued
 *
 * An ordinal, because a repeated transition has to be distinguishable from itself. What fired it,
 * because that is the transition's identity. Where it arrived, because that is what it did. Three
 * columns, no ellipsis, and when it overflows it says how many entries it is not showing.
 *
 * ## Fitted with foreknowledge, and degraded honestly
 *
 * Every row the ledger will ever show is known before the film starts, so the type is fitted once
 * across all of them (`fitLedger`) — decision:28's rule, and the reason is the same one that
 * applies to a subtitle: type that resized as the list grew would put a change of size under every
 * occurrence. Fitted across the **taken** labels only, which is a real saving rather than a trick:
 * a sixty-nine character label on a transition the run never takes never appears in the ledger and
 * has no business setting its measure.
 *
 * And when it will not fit, the type stops shrinking and the ledger **keeps fewer rows** instead.
 * That ordering is the whole discipline: a rail of nine unreadable entries is not more history
 * than a rail of four readable ones and a number saying six more happened.
 *
 * ## What it is not allowed to do
 *
 * It is screen-fixed and outside the camera transform, so it does not pan with the graph. Its
 * region is taken out of the camera's window before anything is laid out (`MACHINE.rail`), so no
 * state can ever be drawn under it and adding a row can never move a node or recompose a shot. And
 * it is set in the neutral steel of the topology rather than in the accent, because the accent
 * belongs to occupancy and a rail that competed with the current state would be answering
 * question two by breaking question one.
 */

/** One line of the ledger. */
export interface LedgerRow {
  /**
   * `start` is where the run began, which is inferred and is not a transition — so it carries no
   * ordinal and no event, and nothing about it is drawn in the voice of an occurrence.
   */
  readonly kind: "start" | "occurrence" | "earlier";
  /** 1-based position in the scenario. Absent on `start` and `earlier`. */
  readonly ordinal?: number;
  /** What fired it, wrapped to the rail's measure. Absent on `start` and `earlier`. */
  readonly lines?: readonly string[];
  /** Where the machine was after it. Absent on `earlier`. */
  readonly state?: string;
  /** How many occurrences this row is standing in for. Only on `earlier`. */
  readonly earlier?: number;
  /** How many occurrences ago. Zero is the latest; the `earlier` row has none. */
  readonly age?: number;
}

/** How the rail is set, for this film. One size, fitted across every row it will ever hold. */
export interface LedgerFit {
  readonly size: number;
  readonly stateSize: number;
  /** Characters an event label wraps to at that size. */
  readonly measure: number;
  /** How many occurrences the rail keeps. Reduced from `MACHINE.railRows` only under duress. */
  readonly rows: number;
}

type Machine = {
  readonly states: readonly AuthoredState[];
  readonly transitions: readonly AuthoredTransition[];
  readonly scenario: readonly AuthoredOccurrence[];
};

/**
 * How much of the frame's width the ledger takes.
 *
 * A constant, and the fact that it is a constant is the point: it is subtracted from the camera's
 * window before the machine is laid out, so "no state is ever under the ledger" is an invariant
 * rather than a thing that happens to be true of the machines that exist. It is the same trick
 * `useSubtitleBand` plays at the bottom of the frame, and it is the whole of the reservation now:
 * sprint:19's 216-pixel strip along the top is gone, and the deck title lives at the head of this
 * rail instead (`MACHINE.rail`).
 */
export function ledgerBand(): number {
  return MACHINE.rail;
}

/** The vertical room the rail has for rows, once the title at the head of it has taken its share. */
export function ledgerHeight(reduced: boolean = false): number {
  return (
    1080 - MACHINE.railTitleBlock - (reduced ? MACHINE.railScopeBlock : 0) - FRAME.marginY
  );
}

/** The width a row's text column has, inside the rail. */
export function ledgerTextWidth(): number {
  return MACHINE.rail - LEDGER_PAD_X - LEDGER_GUTTER - LEDGER_PAD_RIGHT;
}

/** Left inset of the rail's content, and the ordinal column beside it. */
export const LEDGER_PAD_X = 44;
export const LEDGER_GUTTER = 58;
export const LEDGER_PAD_RIGHT = 28;

/**
 * The sizes the rail may be set at, largest first.
 *
 * A short ladder with a floor rather than a continuous fit, and the floor is the important half.
 * Below about twenty pixels a line of prose on a dark field stops being read and starts being
 * texture, so a rail that kept shrinking to fit would eventually be showing eight entries none of
 * which is an entry. When the ladder runs out the row *count* gives way instead.
 */
const SIZES = [MACHINE.railEvent, 25, 23, 21, 20] as const;

/** How the rail is set for a given machine. Deterministic, and a pure function of its scenario. */
export function fitLedger(
  machine: Machine,
  type: Typography,
  reduced: boolean = false,
): LedgerFit {
  const available = ledgerHeight(reduced);
  const width = ledgerTextWidth();

  for (let rows = MACHINE.railRows; rows >= MIN_ROWS; rows -= 1) {
    for (const size of SIZES) {
      const measure = Math.max(8, Math.floor(width / (size * type.width.body)));
      const stateSize = Math.round((size * MACHINE.railState) / MACHINE.railEvent);
      const fit: LedgerFit = { size, stateSize, measure, rows };
      if (tallestWindow(machine, fit) <= available) return fit;
    }
  }
  const size = SIZES[SIZES.length - 1] as number;
  return {
    size,
    stateSize: Math.round((size * MACHINE.railState) / MACHINE.railEvent),
    measure: Math.max(8, Math.floor(width / (size * type.width.body))),
    rows: MIN_ROWS,
  };
}

/**
 * The fewest entries worth calling a chronology.
 *
 * Three, which is the shortest list from which a viewer can read a *direction* — two entries are a
 * pair and three are a sequence. Below it the ledger has stopped doing its job and the honest
 * response would be a dragon rather than a smaller number.
 */
const MIN_ROWS = 3;

/** The tallest the rail ever gets over the whole film, which is what has to fit. */
function tallestWindow(machine: Machine, fit: LedgerFit): number {
  let tallest = 0;
  for (let current = 0; current < machine.scenario.length; current += 1) {
    const rows = ledgerAt(machine, current, fit);
    tallest = Math.max(
      tallest,
      rows.reduce((sum, row) => sum + rowHeight(row, fit), 0),
    );
  }
  return tallest;
}

/** How tall one row is, at this fit. */
export function rowHeight(row: LedgerRow, fit: LedgerFit): number {
  if (row.kind === "earlier")
    return Math.ceil(fit.size * MACHINE.railLead) + MACHINE.railGap;
  const lines = row.lines?.length ?? 0;
  return (
    Math.ceil(fit.size * MACHINE.railLead * lines) +
    Math.ceil(fit.stateSize * MACHINE.railLead) +
    MACHINE.railGap
  );
}

/**
 * The ledger after occurrence `current`, oldest first.
 *
 * `current` is -1 before anything has happened, which is not an empty rail: the run is standing
 * somewhere while the overview is being established, and where it is standing is worth one row.
 * That row is deliberately not shaped like an occurrence — no ordinal, no event — because the
 * starting state is *inferred from the first occurrence's source* and drawing it as a transition
 * would be inventing one (decision:46).
 */
export function ledgerAt(
  machine: Machine,
  current: number,
  fit: LedgerFit,
): readonly LedgerRow[] {
  const path = scenarioPath(machine);
  const byId = new Map(machine.transitions.map((entry) => [entry.id, entry] as const));
  const named = new Map(machine.states.map((state) => [state.id, state.text] as const));

  const all: LedgerRow[] = [];
  if (path.start !== undefined) {
    all.push({ kind: "start", state: named.get(path.start) ?? path.start });
  }
  for (let index = 0; index <= current && index < machine.scenario.length; index += 1) {
    const occurrence = machine.scenario[index] as AuthoredOccurrence;
    const transition = byId.get(occurrence.take);
    const arriving = path.after[index];
    all.push({
      kind: "occurrence",
      ordinal: index + 1,
      lines: wrapRail(transition?.on ?? occurrence.take, fit.measure),
      state: arriving === undefined ? "" : (named.get(arriving) ?? arriving),
      age: current - index,
    });
  }

  if (all.length <= fit.rows) return all;

  // Elided from the front, and the elision is *counted*. "+6 earlier" is a fact a viewer can act
  // on — it says the run is longer than the rail and by how much — where an ellipsis says only
  // that something has been taken away.
  const shown = all.slice(all.length - fit.rows);
  const dropped = all.length - fit.rows;
  return [{ kind: "earlier", earlier: dropped }, ...shown];
}

/** Greedy, like an event label on the map: this is running text, not a card. */
export function wrapRail(label: string, measure: number): readonly string[] {
  const words = label.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [label];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (candidate.length > measure && line !== "") {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

/**
 * How the deck title is set at the head of the rail.
 *
 * Fitted rather than fixed, and for a reason a rendered frame supplied: "Why the elevator doors
 * changed their mind" wraps to four lines in a 380-pixel rail, which took the title block past the
 * room reserved for it and left the ledger's overflow row nearly touching the word "mind". A rail
 * whose two halves depend on the length of a string is not a layout.
 *
 * So the type steps down until the block fits — `fitHeading`'s move, and `fitLedger`'s, for the
 * third time in this composition — and the reserved height is a constant either way, so the ledger
 * below never moves whatever the title turns out to be.
 */
export function fitTitle(
  title: string,
  type: Typography,
): {
  readonly size: number;
  readonly lines: readonly string[];
} {
  const width = MACHINE.rail - LEDGER_PAD_X - LEDGER_PAD_RIGHT;
  const room = MACHINE.railTitleBlock - FRAME.marginY - TITLE_RULE;
  for (const size of TITLE_SIZES) {
    const measure = Math.max(6, Math.floor(width / (size * type.width.heading)));
    const lines = wrapRail(title, measure);
    if (Math.ceil(lines.length * size * TITLE_LEAD) <= room) return { size, lines };
  }
  const size = TITLE_SIZES[TITLE_SIZES.length - 1] as number;
  const measure = Math.max(6, Math.floor(width / (size * type.width.heading)));
  return { size, lines: wrapRail(title, measure) };
}

/** The accent rule above the title, and the gap under it. */
const TITLE_RULE = 40;
const TITLE_LEAD = 1.1;
const TITLE_SIZES = [MACHINE.railTitle, 38, 34, 31, 28] as const;

/** The ledger of a machine body, fitted, for callers that want both at once. */
export function ledgerFor(
  machine: AuthoredMachine,
  type: Typography,
): {
  readonly fit: LedgerFit;
  readonly at: (current: number) => readonly LedgerRow[];
} {
  const fit = fitLedger(machine, type);
  return { fit, at: (current: number) => ledgerAt(machine, current, fit) };
}
