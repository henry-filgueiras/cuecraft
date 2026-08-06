import assert from "node:assert/strict";
import { join, relative } from "node:path";
import { test } from "node:test";

import { renderPresentationFile, StageError, workspaceFor } from "./pipeline.ts";
import { repositoryRoot } from "./tts/model.ts";

/**
 * The pipeline's cheap edges. Everything past `parse` needs either a 325 MB model or a
 * headless browser and lives in `*.render-test.ts` instead.
 */

function underRepo(path: string): string {
  return relative(repositoryRoot(), path);
}

test("render state lives beside the other projections, keyed by source name", () => {
  assert.equal(
    underRepo(workspaceFor("examples/witnessglass.yaml")),
    join(".cuecraft", "renders", "witnessglass"),
  );
  assert.equal(
    underRepo(workspaceFor("/somewhere/else/Q3 Review.YAML")),
    join(".cuecraft", "renders", "Q3-Review"),
  );
});

test("two decks do not share a workspace", () => {
  assert.notEqual(workspaceFor("a.yaml"), workspaceFor("b.yaml"));
});

test("an unreadable source fails at the read stage, not with a stack trace", async () => {
  await assert.rejects(
    renderPresentationFile("does-not-exist.yaml", "out/nope.mp4"),
    (error: unknown) => {
      assert.ok(error instanceof StageError);
      assert.equal(error.stage, "read");
      assert.match(error.message, /does-not-exist\.yaml/);
      return true;
    },
  );
});

test("an invalid presentation fails before anything is synthesized", async () => {
  // The source parses as YAML and is nonsense as a presentation; reaching synthesis would
  // mean paying a model load to find that out.
  const bad = join(repositoryRoot(), "package.json");
  await assert.rejects(
    renderPresentationFile(bad, "out/nope.mp4"),
    /not a valid presentation/,
  );
});
