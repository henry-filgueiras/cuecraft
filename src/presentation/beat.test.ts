import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dwellFor,
  dwellMs,
  machineCues,
  occurrenceDwellFor,
  ARRIVAL_MS,
  MAXIMUM_DWELL_MS,
  MINIMUM_DWELL_MS,
  protocolCues,
  RUN_FLOOR,
  TRANSIT_MS,
} from "./beat.ts";
import type { NarrationCue } from "./cue.ts";
import type { AuthoredMachine, AuthoredOccurrence } from "./machine.ts";
import type { AuthoredProtocol, AuthoredStep } from "./protocol.ts";
import { ROOT_SCOPE } from "./scope.ts";

/**
 * The one derived clock in the format.
 *
 * These assertions are about the *shape* of the policy rather than about its constants, because
 * the constants are meant to move when a rendered minute says they should and a test that pinned
 * them would make the artifact unable to overrule the archaeology.
 */

function step(message: string, say?: string): AuthoredStep {
  return say === undefined
    ? { from: "a", to: "b", message }
    : { from: "a", to: "b", message, say };
}

function protocol(...steps: readonly AuthoredStep[]): AuthoredProtocol {
  return {
    actors: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
    steps,
  };
}

function shape(cues: readonly NarrationCue[]): string[] {
  return cues.map((cue) =>
    cue.kind === "speech"
      ? `speak ${cue.address} "${cue.text}"`
      : cue.kind === "dwell"
        ? `dwell ${cue.address} ${cue.milliseconds}ms`
        : cue.kind,
  );
}

/* ------------------------------------------------------------- lowering */

test("a narrated step becomes a speech cue that activates it, in written order", () => {
  assert.deepEqual(
    shape(
      protocolCues(
        protocol(step("go", "It goes."), step("back", "It comes back.")),
        ROOT_SCOPE,
      ),
    ),
    ['speak root/step-1 "It goes."', 'speak root/step-2 "It comes back."'],
  );
});

test("a silent step becomes a dwell carrying the same address", () => {
  const cues = protocolCues(protocol(step("validate token")), ROOT_SCOPE);
  assert.equal(cues.length, 1);
  const only = cues[0];
  assert.ok(only?.kind === "dwell");
  assert.equal(only.address, "root/step-1");
  assert.equal(only.scope, ROOT_SCOPE);
});

test("the lowering resolves both ends itself and never looks a name up", () => {
  const cues = protocolCues(protocol(step("go", "It goes.")), ROOT_SCOPE);
  const spoken = cues[0];
  assert.ok(spoken?.kind === "speech");
  // Both halves present at once: `activates` is what a diagnostic prints, `address` is what
  // resolution matches on, and nothing in between had to be looked up.
  assert.equal(spoken.activates, "step-1");
  assert.equal(spoken.address, "root/step-1");
});

test("a step's spelling repair travels with its cue", () => {
  const cues = protocolCues(
    protocol({
      from: "a",
      to: "b",
      message: "read records",
      say: "It reads the records.",
      pronounce: new Map([["records", "rekords"]]),
    }),
    ROOT_SCOPE,
  );
  const spoken = cues[0];
  assert.ok(spoken?.kind === "speech");
  assert.equal(spoken.pronounce?.get("records"), "rekords");
});

/* --------------------------------------------------------------- pacing */

test("a longer label buys more time, up to a ceiling", () => {
  const brief = dwellMs(step("ok"));
  const middling = dwellMs(step("validate the bearer token"));
  const enormous = dwellMs(step("x".repeat(400)));
  assert.ok(brief < middling, "a longer label should take longer to read");
  assert.equal(brief, MINIMUM_DWELL_MS, "a two-character label still gets the floor");
  assert.equal(enormous, MAXIMUM_DWELL_MS, "past the ceiling a label wanted a sentence");
});

test("every dwell outlasts the transition it contains", () => {
  for (let run = 0; run < 12; run += 1) {
    assert.ok(
      dwellMs(step("ok"), run) > TRANSIT_MS,
      `run ${run} finished before its arrow landed`,
    );
  }
});

test("a run of silent steps accelerates, monotonically, to a floor", () => {
  const cues = protocolCues(
    protocol(...Array.from({ length: 8 }, () => step("validate token"))),
    ROOT_SCOPE,
  );
  const times = cues.map((cue) => (cue.kind === "dwell" ? cue.milliseconds : 0));
  for (let index = 1; index < times.length; index += 1) {
    assert.ok(
      (times[index] as number) <= (times[index - 1] as number),
      `step ${index + 1} took longer than the one before it`,
    );
  }
  assert.ok(
    (times.at(-1) as number) >= MINIMUM_DWELL_MS * RUN_FLOOR,
    "the run decayed past its floor",
  );
});

test("narration resets the run: a silent step after a sentence starts from full", () => {
  const cues = protocolCues(
    protocol(
      step("one"),
      step("two"),
      step("three"),
      step("four", "And then it says something."),
      step("five"),
    ),
    ROOT_SCOPE,
  );
  const times = cues.flatMap((cue) => (cue.kind === "dwell" ? [cue.milliseconds] : []));
  assert.equal(times.length, 4);
  assert.equal(times[0], times[3], "the run should have restarted after the sentence");
  assert.ok((times[2] as number) < (times[0] as number));
});

test("nothing an author writes can reach the clock", () => {
  // The assertion is structural: a dwell is produced only for a step with no `say`, and its
  // duration is a function of the message and the run alone. There is no key in `STEP_KEYS` that
  // appears in this call, and adding one is the thing the sprint's non-goals refuse.
  assert.equal(dwellMs(step("hello")), dwellMs({ from: "x", to: "y", message: "hello" }));
});

/* ------------------------------------------------ the clock's second caller */

/**
 * A machine's scenario, through the same policy.
 *
 * decision:35 wrote four rules and calibrated them against arrows between lanes. The claim this
 * section makes is that none of the four was ever about arrows: what is read is whatever label the
 * picture is putting up, and the run decay is about a viewer with nobody talking to them. So the
 * numbers are asserted to be *identical* for a transition whose event label is a step's message,
 * character for character — if they ever diverge, one of the two bodies has grown a clock of its
 * own and the sprint's claim about sharing is false.
 */

function machine(...scenario: readonly AuthoredOccurrence[]): AuthoredMachine {
  return {
    states: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
    transitions: [
      { id: "there", from: "a", to: "b", on: "off we go" },
      { id: "back", from: "b", to: "a", on: "and back again" },
    ],
    scenario,
  };
}

test("a narrated occurrence becomes a speech cue that activates it, in scenario order", () => {
  assert.deepEqual(
    shape(
      machineCues(
        machine(
          { take: "there", say: "It leaves." },
          { take: "back", say: "It comes back." },
        ),
        ROOT_SCOPE,
      ),
    ),
    ['speak root/take-1 "It leaves."', 'speak root/take-2 "It comes back."'],
  );
});

test("a silent occurrence becomes a dwell carrying the same address", () => {
  const cues = machineCues(machine({ take: "there" }), ROOT_SCOPE);
  const only = cues[0];
  assert.ok(only?.kind === "dwell");
  assert.equal(only.address, "root/take-1");
  assert.equal(only.milliseconds, occurrenceDwellFor("off we go"));
});

test("a machine's silent occurrence outlasts a protocol's, and it is the arrival that costs", () => {
  // The divergence sprint:20 introduced, stated as the property rather than as the constant. A
  // step's arrow only has to be traced; an occurrence has to be *seen to have arrived somewhere*,
  // and decision:47's occupancy is what makes the difference real rather than stylistic.
  for (const label of ["off we go", "tap", "validate the token"]) {
    assert.ok(
      occurrenceDwellFor(label) > dwellFor(label),
      `${label}: an arrival should cost more than tracing an arrow`,
    );
    assert.ok(
      occurrenceDwellFor(label) - TRANSIT_MS >= ARRIVAL_MS,
      `${label}: the stable window after the crossing should be at least the arrival floor`,
    );
  }
});

test("the arrival floor decays across a run, and never below the run floor", () => {
  const isolated = occurrenceDwellFor("off we go", 0);
  const fourth = occurrenceDwellFor("off we go", 3);
  assert.ok(fourth < isolated, "a run should accelerate");
  assert.ok(
    fourth - TRANSIT_MS >= ARRIVAL_MS * RUN_FLOOR - 1,
    "...and never below the floor an arrival keeps",
  );
  // One decay, not two stacked: the tenth in a run is the same as the twentieth.
  assert.equal(occurrenceDwellFor("off we go", 10), occurrenceDwellFor("off we go", 20));
});

test("a silent occurrence is timed by the event label, so rewording it retimes the frame", () => {
  const brief = machineCues(machine({ take: "there" }), ROOT_SCOPE)[0];
  const wordy = machineCues(
    {
      ...machine({ take: "there" }),
      transitions: [
        {
          id: "there",
          from: "a",
          to: "b",
          on: "visibility timeout expires while the result commit is still in flight",
        },
      ],
    },
    ROOT_SCOPE,
  )[0];
  assert.ok(brief?.kind === "dwell" && wordy?.kind === "dwell");
  assert.ok(wordy.milliseconds > brief.milliseconds);
});

test("the two bodies share one clock rather than two that agree today", () => {
  for (const label of ["tap", "validate token", "x".repeat(200)]) {
    for (const run of [0, 1, 5, 40]) {
      assert.equal(
        dwellMs({ from: "a", to: "b", message: label }, run),
        dwellFor(label, run),
        `the protocol's dwell and the shared policy disagree about ${JSON.stringify(label.slice(0, 12))} at run ${run}`,
      );
    }
  }
});

test("the same transition, taken twice, is two occurrences with two addresses", () => {
  assert.deepEqual(
    shape(
      machineCues(
        machine({ take: "there" }, { take: "back" }, { take: "there" }),
        ROOT_SCOPE,
      ),
    ).map((entry) => entry.split(" ")[1]),
    ["root/take-1", "root/take-2", "root/take-3"],
  );
});

test("a run of silent occurrences accelerates, exactly as a run of silent steps does", () => {
  const cues = machineCues(
    machine({ take: "there" }, { take: "back" }, { take: "there" }, { take: "back" }),
    ROOT_SCOPE,
  );
  const times = cues.map((cue) => (cue.kind === "dwell" ? cue.milliseconds : 0));
  // Alternating labels, so compare like with like: occurrences 0 and 2 take the same transition.
  assert.ok((times[2] as number) < (times[0] as number));
  assert.ok((times[3] as number) < (times[1] as number));
});

test("narration inside a scenario resets the run", () => {
  const cues = machineCues(
    machine(
      { take: "there" },
      { take: "back", say: "Something is said here." },
      { take: "there" },
    ),
    ROOT_SCOPE,
  );
  const first = cues[0];
  const third = cues[2];
  assert.ok(first?.kind === "dwell" && third?.kind === "dwell");
  assert.equal(first.milliseconds, third.milliseconds);
});
