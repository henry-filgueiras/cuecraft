import assert from "node:assert/strict";
import { test } from "node:test";

import { parseInvocation, readVersion, UsageError } from "./cli.ts";

test("no arguments prints help", () => {
  assert.deepEqual(parseInvocation([]), { kind: "help" });
});

test("--help and --version are recognised", () => {
  assert.deepEqual(parseInvocation(["--help"]), { kind: "help" });
  assert.deepEqual(parseInvocation(["--version"]), { kind: "version" });
});

test("render defaults its output path", () => {
  assert.deepEqual(parseInvocation(["render", "talk.yaml"]), {
    kind: "render",
    input: "talk.yaml",
    output: "presentation.mp4",
  });
});

test("render accepts an explicit output path", () => {
  for (const argv of [
    ["render", "talk.yaml", "-o", "out.mp4"],
    ["render", "talk.yaml", "--output", "out.mp4"],
  ]) {
    assert.deepEqual(parseInvocation(argv), {
      kind: "render",
      input: "talk.yaml",
      output: "out.mp4",
    });
  }
});

test("unknown commands and missing input are usage errors", () => {
  assert.throws(() => parseInvocation(["compile", "talk.yaml"]), UsageError);
  assert.throws(() => parseInvocation(["render"]), UsageError);
  assert.throws(() => parseInvocation(["render", "a.yaml", "b.yaml"]), UsageError);
});

test("the reported version comes from the package manifest", () => {
  assert.match(readVersion(), /^\d+\.\d+\.\d+/);
});
