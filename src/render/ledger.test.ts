import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  AuthoredOccurrence,
  AuthoredState,
  AuthoredTransition,
} from "../presentation/machine.ts";
import {
  fitLedger,
  fitTitle,
  ledgerAt,
  ledgerBand,
  ledgerHeight,
  rowHeight,
  wrapRail,
  type LedgerRow,
} from "./ledger.ts";
import { MACHINE } from "./theme.ts";

/**
 * What the rail is allowed to say, and what it may never say.
 *
 * The properties here are about **identity and honesty** rather than about pixels. A ledger that
 * lists states has lost the thing it exists to carry; a ledger that drops entries without saying so
 * is worse than one that shows fewer. Both of those are assertable, and both were true of the
 * readout this replaced.
 */

const LEASES = {
  states: [
    { id: "queued", text: "Queued" },
    { id: "claimed", text: "Claimed" },
    { id: "running", text: "Running" },
    { id: "retry", text: "Retry wait" },
  ] as readonly AuthoredState[],
  transitions: [
    { id: "claim", from: "queued", to: "claimed", on: "a worker takes the lease" },
    { id: "start", from: "claimed", to: "running", on: "handler begins" },
    { id: "heartbeat", from: "running", to: "running", on: "lease renewed" },
    { id: "timed-out", from: "running", to: "retry", on: "handler exceeds its deadline" },
    { id: "rate-limited", from: "running", to: "retry", on: "downstream returns 429" },
    { id: "backoff", from: "retry", to: "queued", on: "backoff expires" },
  ] as readonly AuthoredTransition[],
  scenario: [
    { take: "claim" },
    { take: "start" },
    { take: "heartbeat" },
    { take: "timed-out" },
    { take: "backoff" },
    { take: "claim" },
    { take: "start" },
    { take: "rate-limited" },
    { take: "backoff" },
    { take: "claim" },
  ] as readonly AuthoredOccurrence[],
};

const FIT = fitLedger(LEASES);

test("the ledger records occurrences, not the states they landed in", () => {
  // The whole reason it replaced the readout. A list of destinations cannot tell two parallel
  // transitions apart, and cannot say a transition happened twice rather than once.
  const rows = ledgerAt(LEASES, 3, FIT);
  const occurrences = rows.filter((row) => row.kind === "occurrence");
  for (const row of occurrences) {
    assert.ok(
      row.ordinal !== undefined,
      "every occurrence row carries its position in the run",
    );
    assert.ok(
      row.lines !== undefined && row.lines.join(" ").length > 0,
      "every occurrence row says what fired the transition",
    );
  }
});

test("two parallel transitions between one pair of states are told apart", () => {
  // `timed-out` and `rate-limited` both run Running -> Retry wait. A list of states would show
  // "Retry wait" twice and nothing else; the ledger shows what fired each of them.
  const rows = ledgerAt(LEASES, 9, fitLedger(LEASES));
  const all = ledgerAt(LEASES, 9, { ...FIT, rows: 99 });
  void rows;
  const fourth = all.find((row) => row.ordinal === 4);
  const eighth = all.find((row) => row.ordinal === 8);
  assert.ok(fourth !== undefined && eighth !== undefined);
  assert.equal(fourth.state, "Retry wait");
  assert.equal(eighth.state, "Retry wait");
  assert.notDeepEqual(fourth.lines, eighth.lines);
});

test("a transition taken three times is three rows, each with its own ordinal", () => {
  const all = ledgerAt(LEASES, 9, { ...FIT, rows: 99 });
  const claims = all.filter((row) => row.lines?.join(" ") === "a worker takes the lease");
  assert.equal(claims.length, 3);
  assert.deepEqual(
    claims.map((row) => row.ordinal),
    [1, 6, 10],
  );
});

test("the run's starting occupancy is a row, and it is not shaped like a transition", () => {
  const rows = ledgerAt(LEASES, -1, FIT);
  assert.equal(rows.length, 1);
  const first = rows[0] as LedgerRow;
  assert.equal(first.kind, "start");
  assert.equal(first.state, "Queued");
  assert.equal(first.ordinal, undefined, "the inferred start is not an occurrence");
  assert.equal(first.lines, undefined, "and nothing fired it, because nothing did");
});

test("overflow says how many entries it is standing in for, and never elides anonymously", () => {
  const rows = ledgerAt(LEASES, 9, FIT);
  assert.equal(
    rows.length,
    FIT.rows + 1,
    "the overflow row is extra, not one of the kept rows",
  );
  const first = rows[0] as LedgerRow;
  assert.equal(first.kind, "earlier");
  // Eleven entries exist at the end of this run: the inferred start plus ten occurrences.
  assert.equal(first.earlier, 11 - FIT.rows);
  for (const row of rows) {
    assert.ok(
      !JSON.stringify(row).includes("…"),
      "nothing in the ledger is allowed to be an ellipsis",
    );
  }
});

test("the latest entry is last, and the order is chronological throughout", () => {
  for (let current = 0; current < LEASES.scenario.length; current += 1) {
    const rows = ledgerAt(LEASES, current, FIT).filter(
      (row) => row.kind === "occurrence",
    );
    const ordinals = rows.map((row) => row.ordinal as number);
    assert.deepEqual(
      [...ordinals].sort((a, b) => a - b),
      ordinals,
      "chronological",
    );
    assert.equal(ordinals.at(-1), current + 1, "the latest occurrence is the last row");
    assert.equal(rows.at(-1)?.age, 0, "...and it is the one marked freshest");
  }
});

test("the rail never overflows its own region, at any point in the run", () => {
  for (const machine of [LEASES, longLabelled()]) {
    const fit = fitLedger(machine);
    for (let current = -1; current < machine.scenario.length; current += 1) {
      const total = ledgerAt(machine, current, fit).reduce(
        (sum, row) => sum + rowHeight(row, fit),
        0,
      );
      assert.ok(
        total <= ledgerHeight(),
        `occurrence ${current}: the rail wanted ${total}px of ${ledgerHeight()}`,
      );
    }
  }
});

test("under pressure the row count gives way before the type does", () => {
  // The discipline the round is built on, stated as a property: a rail of nine unreadable entries
  // is not more history than four readable ones and a number.
  const fit = fitLedger(longLabelled());
  assert.ok(fit.size >= 20, "the type never goes below the legibility floor");
  assert.ok(fit.rows <= MACHINE.railRows);
});

test("a long event label wraps rather than being cut", () => {
  const lines = wrapRail(
    "visibility timeout expires while the result commit is in flight",
    17,
  );
  assert.ok(lines.length > 3);
  assert.equal(
    lines.join(" "),
    "visibility timeout expires while the result commit is in flight",
  );
});

test("the rail is a reservation, so it cannot depend on the machine in it", () => {
  // Adding an entry may never move a node. The only thing that guarantees that is the region
  // being a constant, decided before anything is laid out.
  assert.equal(ledgerBand(), MACHINE.rail);
  assert.equal(ledgerBand(), ledgerBand());
});

test("the title is fitted into the block reserved for it, whatever its length", () => {
  for (const title of [
    "A job with a lease on it",
    "Why the elevator doors changed their mind",
    "An extraordinarily long deck title that nobody should have written but somebody will",
  ]) {
    const fitted = fitTitle(title);
    assert.equal(fitted.lines.join(" "), title, "a title is never shortened");
    assert.ok(fitted.size >= 28, "and never set below where a heading stops being one");
  }
});

/** A machine whose taken labels are long enough to put the rail under real pressure. */
function longLabelled() {
  return {
    states: [
      { id: "a", text: "Waiting for the upstream acknowledgement" },
      { id: "b", text: "Reconciling" },
    ] as readonly AuthoredState[],
    transitions: [
      {
        id: "there",
        from: "a",
        to: "b",
        on: "the upstream acknowledgement arrives after the reconciliation window has closed",
      },
      {
        id: "back",
        from: "b",
        to: "a",
        on: "reconciliation completes and the next window opens",
      },
    ] as readonly AuthoredTransition[],
    scenario: [
      { take: "there" },
      { take: "back" },
      { take: "there" },
      { take: "back" },
      { take: "there" },
      { take: "back" },
      { take: "there" },
    ] as readonly AuthoredOccurrence[],
  };
}
