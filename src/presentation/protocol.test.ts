import assert from "node:assert/strict";
import { test } from "node:test";

import { bodyAddresses, bodyElements, type SlideBody } from "./body.ts";
import { parsePresentation, PresentationError } from "./parse.ts";
import { resolveProtocol, stepId } from "./protocol.ts";
import { ROOT_SCOPE } from "./scope.ts";

/**
 * What a protocol is, and every way of writing one that is not.
 *
 * The refusals matter more here than in most bodies, because a protocol's two halves reference
 * each other by name and a step naming a lane that does not exist would otherwise render as an
 * arrow to nowhere — the exact silent desynchronisation decision:14 exists to prevent, in a body
 * where the author never types an identity at all.
 */

function problems(source: string): readonly string[] {
  try {
    parsePresentation(source, "deck.yaml");
  } catch (error) {
    if (error instanceof PresentationError) return error.problems;
    throw error;
  }
  return [];
}

const DECK = `
title: A deck
slides:
  - slide:
      title: How an order is placed
      protocol:
        actors:
          client: Client
          gateway: API gateway
          auth: Auth service
        steps:
          - from: client
            to: gateway
            message: POST /orders
            say: The client sends its request.
          - from: gateway
            to: auth
            message: validate token
          - from: auth
            to: gateway
            message: valid
`;

function body(source: string = DECK): SlideBody {
  const parsed = parsePresentation(source, "deck.yaml").slides[0];
  assert.ok(parsed !== undefined);
  return parsed.body;
}

test("a protocol is actors and an ordered list of steps", () => {
  const parsed = body();
  assert.equal(parsed.kind, "protocol");
  if (parsed.kind !== "protocol") return;
  assert.deepEqual(
    parsed.actors.map((actor) => actor.id),
    ["client", "gateway", "auth"],
  );
  assert.deepEqual(
    parsed.steps.map((step) => `${step.from} -> ${step.to}: ${step.message}`),
    [
      "client -> gateway: POST /orders",
      "gateway -> auth: validate token",
      "auth -> gateway: valid",
    ],
  );
});

test("a protocol slide needs no say of its own", () => {
  assert.deepEqual(
    problems(DECK.replace(/^ *say: The client sends its request\.$/m, "")),
    [],
  );
});

test("a protocol picks the transcript composition", () => {
  const parsed = parsePresentation(DECK, "deck.yaml").slides[0];
  assert.ok(parsed !== undefined);
  assert.equal(parsed.body.kind, "protocol");
});

/* ------------------------------------------------------------ addressing */

test("actors come first in the element order, then steps in written order", () => {
  const parsed = body();
  assert.deepEqual(
    bodyElements(parsed).map((element) => element.id),
    ["client", "gateway", "auth", "step-1", "step-2", "step-3"],
  );
  assert.deepEqual(
    bodyAddresses(parsed, ROOT_SCOPE).map((entry) => entry.address),
    [
      "root/client",
      "root/gateway",
      "root/auth",
      "root/step-1",
      "root/step-2",
      "root/step-3",
    ],
  );
});

test("a prologue may reach an actor", () => {
  assert.deepEqual(
    problems(
      `${DECK}    say:\n      - speech: Three services.\n        activates: gateway\n`,
    ),
    [],
  );
});

test("a prologue may not reach inside the lowering", () => {
  assert.deepEqual(
    problems(
      `${DECK}    say:\n      - speech: Three services.\n        activates: step-1\n`,
    ),
    [
      'slide 1, narration cue 1: activates "step-1", which nothing on this slide declares ' +
        "(declared: client, gateway, auth)",
    ],
  );
});

test("a step's derived identity is reserved against an actor taking it", () => {
  const found = problems(DECK.replace("client: Client", "step-1: Client"));
  assert.match(found[0] ?? "", /slide\.protocol\.actors\.step-1: "step-1" is reserved/);
});

test("step identities count from one, in written order", () => {
  assert.deepEqual([stepId(0), stepId(1), stepId(9)], ["step-1", "step-2", "step-10"]);
});

/* -------------------------------------------------------------- refusals */

test("a protocol needs two actors to be an exchange", () => {
  assert.deepEqual(
    resolveProtocol({
      actors: { a: "Alone" },
      steps: [{ from: "a", to: "a", message: "thinking" }],
    }).issues,
    [
      {
        path: ["actors"],
        message: "has 1; a protocol is an exchange, so it needs at least 2 actors",
      },
    ],
  );
});

test("a step naming an undeclared actor is refused, with the cast listed", () => {
  assert.deepEqual(
    resolveProtocol({
      actors: { a: "A", b: "B" },
      steps: [{ from: "a", to: "c", message: "hello" }],
    }).issues,
    [
      {
        path: ["steps", 0],
        message: 'to is "c", which no actor declares (declared: a, b)',
      },
    ],
  );
});

test("an actor nothing ever touches is refused", () => {
  assert.deepEqual(
    resolveProtocol({
      actors: { a: "A", b: "B", ghost: "Nobody" },
      steps: [{ from: "a", to: "b", message: "hello" }],
    }).issues,
    [
      {
        path: ["actors"],
        message:
          '"ghost" is an actor that never sends or receives; an untouched lane is empty ' +
          "space in every frame",
      },
    ],
  );
});

test("a step with no message is refused; an arrow with no label is a line", () => {
  const issues = resolveProtocol({
    actors: { a: "A", b: "B" },
    steps: [{ from: "a", to: "b", say: "Something happens." }],
  }).issues;
  assert.equal(issues.length, 1);
  assert.deepEqual(issues[0]?.path, ["steps", 0]);
  assert.match(issues[0]?.message ?? "", /^message must say what is being sent/);
});

test("a protocol with no steps is a cast list", () => {
  const issues = resolveProtocol({ actors: { a: "A", b: "B" }, steps: [] }).issues;
  assert.deepEqual(issues[0]?.path, ["steps"]);
  assert.match(issues[0]?.message ?? "", /at least one step/);
});

test("unknown keys are typos, on the protocol and on a step", () => {
  assert.deepEqual(
    resolveProtocol({ actors: { a: "A", b: "B" }, steps: [], theme: "dark" }).issues,
    [
      {
        path: [],
        message: 'unknown key "theme" (allowed: actors, steps)',
      },
    ],
  );
  assert.deepEqual(
    resolveProtocol({
      actors: { a: "A", b: "B" },
      steps: [{ from: "a", to: "b", message: "hi", dwell: "2s" }],
    }).issues,
    [
      {
        path: ["steps", 0],
        message: 'unknown key "dwell" (allowed: from, to, message, say, pronounce)',
      },
    ],
  );
});

test("an actor sending to itself is a step, not an error", () => {
  const resolved = resolveProtocol({
    actors: { a: "A", b: "B" },
    steps: [
      { from: "a", to: "b", message: "start" },
      { from: "b", to: "b", message: "retry with backoff" },
    ],
  });
  assert.deepEqual(resolved.issues, []);
  assert.equal(resolved.protocol?.steps[1]?.from, "b");
  assert.equal(resolved.protocol?.steps[1]?.to, "b");
});

test("a spelling repairs a step's narration, and only a word that is in it", () => {
  assert.deepEqual(
    resolveProtocol({
      actors: { a: "A", b: "B" },
      steps: [
        {
          from: "a",
          to: "b",
          message: "read records",
          say: "It reads the records.",
          pronounce: { records: "rekords" },
        },
      ],
    }).issues,
    [],
  );
  assert.deepEqual(
    resolveProtocol({
      actors: { a: "A", b: "B" },
      steps: [
        {
          from: "a",
          to: "b",
          message: "read",
          say: "It reads them.",
          pronounce: { records: "rekords" },
        },
      ],
    }).issues,
    [
      {
        path: ["steps", 0],
        message: "pronounce.records does not appear in this step's say",
      },
    ],
  );
});

test("a protocol may not be entered, and says so", () => {
  const found = problems(`${DECK}    say:\n      - enter: gateway\n`);
  assert.equal(found.length, 1);
  assert.match(
    found[0] ?? "",
    /only an entity of a world, carrying a child module, can be/,
  );
});
