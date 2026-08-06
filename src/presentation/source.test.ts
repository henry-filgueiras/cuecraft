import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  languageOf,
  onceReader,
  quoteSlide,
  repositoryReader,
  resolveRepositoryPath,
  SourceError,
} from "./source.ts";

/**
 * A presentation quoting a repository file is the one place cuecraft reads something the
 * author did not hand it, so the two things worth pinning are what it refuses to read and
 * what it does to what it reads.
 */

const DECK = `title: A deck

slides:
  - slide:
      title: "First"
      bullets:
        - One
        - Two

    say:
      - "Hello."

  # A comment between two entries belongs to neither.
  - slide:
      title: "Second"

    say: "Goodbye."
`;

/** Realpath'd, because macOS reaches its temporary directory through a symlink. */
function repository(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "cuecraft-source-")));
  mkdirSync(join(root, "examples"));
  writeFileSync(join(root, "examples", "deck.yaml"), DECK, "utf8");
  return root;
}

test("a quoted path stays inside the repository", () => {
  const root = repository();
  assert.equal(
    resolveRepositoryPath(root, "examples/deck.yaml"),
    join(root, "examples", "deck.yaml"),
  );

  for (const escape of ["../secrets.yaml", "examples/../../secrets.yaml", ".."]) {
    assert.throws(
      () => resolveRepositoryPath(root, escape),
      (error: Error) =>
        error instanceof SourceError && /outside the repository/.test(error.message),
      escape,
    );
  }
});

test("an absolute path is refused rather than resolved", () => {
  const root = repository();
  assert.throws(
    () => resolveRepositoryPath(root, "/etc/passwd"),
    (error: Error) => error instanceof SourceError && /is absolute/.test(error.message),
  );
});

test("a symlink pointing out of the repository is not a way back in", () => {
  const root = repository();
  const outside = realpathSync(mkdtempSync(join(tmpdir(), "cuecraft-outside-")));
  writeFileSync(join(outside, "elsewhere.yaml"), DECK, "utf8");
  symlinkSync(join(outside, "elsewhere.yaml"), join(root, "link.yaml"));

  assert.throws(
    () => resolveRepositoryPath(root, "link.yaml"),
    (error: Error) =>
      error instanceof SourceError && /outside the repository/.test(error.message),
  );
});

test("the repository root itself is not a file to quote", () => {
  const root = repository();
  assert.throws(() => resolveRepositoryPath(root, "."), SourceError);
});

test("a file that is not there says so, rather than throwing something raw", () => {
  const read = repositoryReader(repository());
  assert.throws(
    () => read("examples/missing.yaml"),
    (error: Error) =>
      error instanceof SourceError &&
      /does not exist in the repository/.test(error.message),
  );
});

test("a reader is consulted once per file, so one parse sees one state of it", () => {
  const reads: string[] = [];
  const read = onceReader((file) => {
    reads.push(file);
    return DECK;
  });
  read("examples/deck.yaml");
  read("examples/deck.yaml");
  assert.deepEqual(reads, ["examples/deck.yaml"]);
});

test("the language is the file's, not the author's", () => {
  assert.equal(languageOf("examples/deck.yaml"), "yaml");
  assert.equal(languageOf("examples/deck.yml"), "yaml");
  assert.throws(
    () => languageOf("src/render/theme.ts"),
    (error: Error) => error instanceof SourceError && /\.ts/.test(error.message),
  );
  assert.throws(() => languageOf("Makefile"), SourceError);
});

test("a slide is quoted verbatim, with only its inherited indentation removed", () => {
  assert.equal(
    quoteSlide(DECK, { file: "examples/deck.yaml", slide: "First" }),
    [
      "slide:",
      '  title: "First"',
      "  bullets:",
      "    - One",
      "    - Two",
      "",
      "say:",
      '  - "Hello."',
    ].join("\n"),
  );
});

test("a comment outside the entry is not part of it", () => {
  const quoted = quoteSlide(DECK, { file: "examples/deck.yaml", slide: "Second" });
  assert.equal(quoted.includes("#"), false);
  assert.equal(quoted, ["slide:", '  title: "Second"', "", 'say: "Goodbye."'].join("\n"));
});

test("a title that matches nothing lists the titles that exist", () => {
  assert.throws(
    () => quoteSlide(DECK, { file: "examples/deck.yaml", slide: "Third" }),
    (error: Error) =>
      error instanceof SourceError &&
      /has no slide titled "Third".*"First", "Second"/s.test(error.message),
  );
});

test("a title that matches twice is ambiguous, not the first one", () => {
  const twice = DECK.replace('title: "Second"', 'title: "First"');
  assert.throws(
    () => quoteSlide(twice, { file: "examples/deck.yaml", slide: "First" }),
    (error: Error) =>
      error instanceof SourceError && /has 2 slides titled "First"/.test(error.message),
  );
});

test("a file that is not a presentation cannot be quoted from", () => {
  assert.throws(
    () => quoteSlide("name: cuecraft\nversion: 0\n", { file: "x.yaml", slide: "First" }),
    (error: Error) =>
      error instanceof SourceError && /is not a presentation/.test(error.message),
  );
});

test("a file that is not YAML at all fails as a quote, not as a crash", () => {
  assert.throws(
    () => quoteSlide("slides: [\n  unterminated", { file: "x.yaml", slide: "First" }),
    SourceError,
  );
});
