import assert from "node:assert/strict";
import { test } from "node:test";

import { sliceTokens, tokenizeLine } from "./tokens.ts";

/**
 * The grammar is highlight.js's; what is tested here is that turning its markup back into
 * offsets loses nothing, and that a slice of a line is coloured as part of the line.
 */

const text = (tokens: readonly { text: string }[]): string =>
  tokens.map((token) => token.text).join("");

test("tokenizing a line and rejoining it returns the line exactly", () => {
  const lines = [
    "say:",
    '  - "Coding agents do a surprising amount of invisible work."',
    "  - pause: 350ms",
    "    activates: tools",
    "    file: examples/witnessglass.yaml",
    "# a comment",
    "",
    '  - "quotes \' and & and < and >"',
  ];
  for (const line of lines) {
    assert.equal(text(tokenizeLine(line, "yaml")), line, JSON.stringify(line));
  }
});

test("entities the library escapes come back as the characters they were", () => {
  const tokens = tokenizeLine('  - "a & b < c > d"', "yaml");
  assert.equal(text(tokens), '  - "a & b < c > d"');
});

test("a key and its value are classified apart", () => {
  const tokens = tokenizeLine("    activates: tools", "yaml");
  const key = tokens.find((token) => token.text.includes("activates"));
  assert.equal(key?.className, "hljs-attr");
  assert.notEqual(
    tokens.find((token) => token.text.includes("tools"))?.className,
    "hljs-attr",
  );
});

test("slicing a token run reproduces the substring", () => {
  const line =
    '  - "They read files, search code, run tools, and decide what to do next."';
  const tokens = tokenizeLine(line, "yaml");
  for (let at = 0; at <= line.length; at += 7) {
    assert.equal(text(sliceTokens(tokens, 0, at)), line.slice(0, at));
    assert.equal(text(sliceTokens(tokens, at, line.length)), line.slice(at));
  }
});

test("a fragment of a string is still a string — the defect projection would have caused", () => {
  const line =
    '  - "They read files, search code, run tools, and decide what to do next."';
  const tokens = tokenizeLine(line, "yaml");
  const tail = sliceTokens(tokens, 58, line.length);

  assert.equal(text(tail), line.slice(58));
  assert.ok(tail.length > 0);
  for (const token of tail) {
    assert.equal(
      token.className,
      "hljs-string",
      `${JSON.stringify(token.text)} lost the string it belongs to`,
    );
  }

  // Tokenized alone, that same text is three bare scalars with unclassified spaces between
  // them, which is what would have reached the frame.
  const alone = tokenizeLine(line.slice(58), "yaml");
  assert.ok(
    alone.some((token) => token.className !== "hljs-string"),
    "the standalone tokenization was expected to be wrong",
  );
});

test("an empty slice is empty rather than a stray token", () => {
  const tokens = tokenizeLine("say:", "yaml");
  assert.deepEqual(sliceTokens(tokens, 2, 2), []);
});

test("adjacent runs of the same classification are one token", () => {
  const tokens = tokenizeLine("  - pause: 350ms", "yaml");
  for (let index = 1; index < tokens.length; index += 1) {
    assert.notEqual(
      tokens[index]?.className,
      tokens[index - 1]?.className,
      "neighbouring tokens should never share a classification",
    );
  }
});
