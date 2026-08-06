import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveWorld } from "./world.ts";

/**
 * What a world has to be before cuecraft will lay one out.
 *
 * The property under test throughout is that the *coherence* checks are real checks and not
 * shape checks. A relation to an entity that does not exist and an entity nothing relates to are
 * both well-formed YAML and both nonsense, and the compiler is the only thing between them and a
 * silently wrong picture.
 */

const WORLD = {
  entities: { source: "The source", speech: "Local speech", timing: "Derived timing" },
  relations: ["source -> speech", "speech -> timing"],
};

function problems(value: unknown): string[] {
  return resolveWorld(value).issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
}

test("a world is its entities in the order they were written, and its relations", () => {
  const { world, issues } = resolveWorld(WORLD);
  assert.deepEqual(issues, []);
  assert.deepEqual(world?.entities, [
    { id: "source", text: "The source" },
    { id: "speech", text: "Local speech" },
    { id: "timing", text: "Derived timing" },
  ]);
  assert.deepEqual(world?.relations, [
    { from: "source", to: "speech" },
    { from: "speech", to: "timing" },
  ]);
});

test("entity keys are identities, so they obey the identity rule", () => {
  const broken = { ...WORLD, entities: { ...WORLD.entities, "Not An Id": "x" } };
  assert.match(problems(broken)[0] ?? "", /identity must be lower-case/);
});

test("an entity with no label is a missing entity", () => {
  assert.deepEqual(problems({ ...WORLD, entities: { ...WORLD.entities, empty: "  " } }), [
    "entities.empty: label must not be empty",
  ]);
});

test("duplicate identities cannot be expressed, because entities are keyed by them", () => {
  // YAML itself collapses a repeated key, so this is the shape that reaches the resolver.
  const { world } = resolveWorld({
    entities: { a: "second wins", b: "b" },
    relations: ["a -> b"],
  });
  assert.equal(world?.entities.length, 2);
});

test("a relation names two entities that exist", () => {
  const missing = { ...WORLD, relations: ["source -> nowhere"] };
  assert.match(problems(missing)[0] ?? "", /names "nowhere", which no entity declares/);
  assert.match(problems(missing)[0] ?? "", /declared: source, speech, timing/);
});

test("a relation is an arrow, and anything else is reported as one", () => {
  assert.match(problems({ ...WORLD, relations: ["source speech"] })[0] ?? "", /-> to/);
  assert.match(problems({ ...WORLD, relations: [{ from: "a" }] })[0] ?? "", /-> to/);
});

test("whitespace around the arrow is optional", () => {
  const { world, issues } = resolveWorld({
    entities: { source: "The source", speech: "Local speech" },
    relations: ["source->speech"],
  });
  assert.deepEqual(issues, []);
  assert.deepEqual(world?.relations, [{ from: "source", to: "speech" }]);
});

test("an identity may contain a hyphen without being read as an arrow", () => {
  const { world, issues } = resolveWorld({
    entities: { "semantic-source": "A", "measured-audio": "B" },
    relations: ["semantic-source -> measured-audio"],
  });
  assert.deepEqual(issues, []);
  assert.deepEqual(world?.relations, [{ from: "semantic-source", to: "measured-audio" }]);
});

test("an entity cannot feed itself, and a relation cannot be written twice", () => {
  assert.match(
    problems({ ...WORLD, relations: ["source -> source"] })[0] ?? "",
    /relates "source" to itself/,
  );
  assert.match(
    problems({ ...WORLD, relations: ["source -> speech", "source -> speech"] })[0] ?? "",
    /repeats the relation/,
  );
});

test("a world is one world: a stranded entity is an error, not a floating box", () => {
  const stranded = {
    entities: { ...WORLD.entities, orphan: "Unrelated" },
    relations: WORLD.relations,
  };
  assert.match(problems(stranded)[0] ?? "", /"orphan" is not related to anything/);
});

test("relation direction does not decide membership", () => {
  // `timing` is only ever a `to`, and is still part of the world.
  assert.deepEqual(problems(WORLD), []);
});

test("a world needs two entities and one relation, or it is a list", () => {
  assert.match(
    problems({ entities: { only: "One" }, relations: [] })[0] ?? "",
    /at least 2 entities/,
  );
  assert.match(
    problems({ entities: { a: "A", b: "B" }, relations: [] })[0] ?? "",
    /at least one relation/,
  );
});

test("unknown keys are named alongside what was allowed", () => {
  assert.match(
    problems({ ...WORLD, groups: [] })[0] ?? "",
    /unknown key "groups" \(allowed: entities, relations\)/,
  );
});

test("a cycle is allowed, because a layered layout has an answer for one", () => {
  const cyclic = {
    entities: { a: "A", b: "B" },
    relations: ["a -> b", "b -> a"],
  };
  assert.deepEqual(problems(cyclic), []);
});
