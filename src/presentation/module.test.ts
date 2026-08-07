import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkInclusion,
  ModuleError,
  readModuleDocument,
  resolveModuleSpec,
} from "./module.ts";
import { MAX_MODULE_DEPTH } from "./scope.ts";

/**
 * Where a child module points, and when it may not be opened.
 *
 * The property under test throughout is that a module's *identity* is a canonical path rather
 * than the string somebody typed. Everything else here depends on it: two spellings of the same
 * file have to be recognised as the same file, or a cycle written the long way round is not a
 * cycle and the compiler loops forever building a video.
 */

const BODY_KEYS = ["bullets", "steps", "code", "change", "world", "figure"];

function failure(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof ModuleError) return error.message;
    throw error;
  }
  return "";
}

test("a module is named relative to the file that declares it", () => {
  assert.equal(
    resolveModuleSpec("examples/order/order.yaml", "./paying.yaml"),
    "examples/order/paying.yaml",
  );
  // ...and relative to that one in turn, which is what lets the directory be moved whole.
  assert.equal(
    resolveModuleSpec("examples/order/paying.yaml", "./check.yaml"),
    "examples/order/check.yaml",
  );
});

test("the leading ./ is a convention rather than a requirement", () => {
  assert.equal(
    resolveModuleSpec("examples/order/order.yaml", "paying.yaml"),
    "examples/order/paying.yaml",
  );
});

test("a module may sit beside its caller's directory, but not outside the checkout", () => {
  assert.equal(
    resolveModuleSpec("examples/order/order.yaml", "../shared/money.yaml"),
    "examples/shared/money.yaml",
  );
  assert.match(
    failure(() => resolveModuleSpec("examples/order.yaml", "../../secrets.yaml")),
    /resolves outside the repository/,
  );
});

test("an absolute path is refused, because a module is named from where it is used", () => {
  assert.match(
    failure(() => resolveModuleSpec("examples/order.yaml", "/etc/passwd.yaml")),
    /is absolute/,
  );
});

test("a module is a YAML file, and says so if it is not", () => {
  assert.match(
    failure(() => resolveModuleSpec("examples/order.yaml", "./paying.json")),
    /is \.json; a module is a \.yaml file/,
  );
  assert.match(
    failure(() => resolveModuleSpec("examples/order.yaml", "./paying")),
    /is extensionless/,
  );
});

test("two spellings of one file are one file, so the long way round is still a cycle", () => {
  const chain = ["examples/order/order.yaml", "examples/order/paying.yaml"];
  const reported = failure(() =>
    checkInclusion(
      chain,
      resolveModuleSpec("examples/order/paying.yaml", "../order/order.yaml"),
    ),
  );
  assert.match(reported, /includes itself/);
  assert.match(reported, /examples\/order\/order\.yaml -> examples\/order\/paying\.yaml/);
});

test("a direct cycle names both ends of it", () => {
  const reported = failure(() => checkInclusion(["a.yaml", "b.yaml"], "b.yaml"));
  assert.match(reported, /b\.yaml -> b\.yaml/);
});

test("an indirect cycle reports the whole chain, not the pair that closed it", () => {
  const reported = failure(() =>
    checkInclusion(["a.yaml", "b.yaml", "c.yaml", "d.yaml"], "b.yaml"),
  );
  // From where the loop begins, because the files above it are not part of the cycle.
  assert.match(reported, /b\.yaml -> c\.yaml -> d\.yaml -> b\.yaml/);
  assert.doesNotMatch(reported, /a\.yaml/);
});

test("depth is bounded, and the diagnostic says what the bound is and which chain hit it", () => {
  const within = Array.from({ length: MAX_MODULE_DEPTH }, (_, i) => `${i}.yaml`);
  assert.doesNotThrow(() =>
    checkInclusion(["root.yaml", ...within.slice(1)], "deep.yaml"),
  );

  const reported = failure(() =>
    checkInclusion(["root.yaml", "one.yaml", "two.yaml"], "three.yaml"),
  );
  assert.match(reported, /is 4 modules deep/);
  assert.match(reported, new RegExp(`demonstrates ${MAX_MODULE_DEPTH}`));
  assert.match(reported, /root\.yaml -> one\.yaml -> two\.yaml -> three\.yaml/);
});

test("a module carries one body and its narration", () => {
  const document = readModuleDocument(
    { world: { entities: {}, relations: [] }, say: ["Hello."] },
    "m.yaml",
    BODY_KEYS,
  );
  assert.equal(document.key, "world");
  assert.deepEqual(document.say, ["Hello."]);
});

test("a module is not a presentation, and each way of trying says why", () => {
  assert.match(
    failure(() =>
      readModuleDocument({ title: "A deck", world: {} }, "m.yaml", BODY_KEYS),
    ),
    /has "title"; a module is titled by the entity that names it/,
  );
  assert.match(
    failure(() => readModuleDocument({ slides: [] }, "m.yaml", BODY_KEYS)),
    /has "slides"; a module is one body, not a deck/,
  );
  assert.match(
    failure(() => readModuleDocument({ defaults: { voice: "x" } }, "m.yaml", BODY_KEYS)),
    /has "defaults"; theme, voice and timing are the root presentation's/,
  );
});

test("a module with no body, or two, is refused rather than guessed at", () => {
  assert.match(
    failure(() => readModuleDocument({ say: ["Hi."] }, "m.yaml", BODY_KEYS)),
    /has no content; it must carry one of/,
  );
  assert.match(
    failure(() => readModuleDocument({ world: {}, bullets: [] }, "m.yaml", BODY_KEYS)),
    /has "bullets" and "world"/,
  );
});

test("an unknown key in a module is a typo doing nothing, and is reported", () => {
  assert.match(
    failure(() =>
      readModuleDocument({ world: {}, camera: "close" }, "m.yaml", BODY_KEYS),
    ),
    /unknown key "camera"/,
  );
});

test("an empty module file is a mistake with an obvious fix", () => {
  assert.match(
    failure(() => readModuleDocument(null, "m.yaml", BODY_KEYS)),
    /is empty/,
  );
  assert.match(
    failure(() => readModuleDocument(["a"], "m.yaml", BODY_KEYS)),
    /must be a mapping of one body and its narration/,
  );
});

test("a deck at the root of the checkout may still name a module beneath it", () => {
  assert.equal(resolveModuleSpec("deck.yaml", "./parts/one.yaml"), "parts/one.yaml");
});

test("a presentation outside the checkout is told why it cannot descend", () => {
  assert.match(
    failure(() => resolveModuleSpec("/tmp/scratch/deck.yaml", "./one.yaml")),
    /which is not inside this cuecraft checkout/,
  );
});
