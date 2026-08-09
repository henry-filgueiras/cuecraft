import assert from "node:assert/strict";
import test from "node:test";

import { readSvg } from "./svg.ts";

/**
 * What cuecraft reads out of a drawing, and — more importantly — what it does not.
 *
 * Two things: how large the picture is, and which names the program wrote into it. There is no test
 * below that asserts anything about a shape, a position or a colour, and there should never be one:
 * the moment cuecraft can say where a tagged element *is*, decision:55's boundary has moved and the
 * exhibit has started to become a plotting API.
 */

const CAIRO = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="576pt" height="288pt" viewBox="0 0 576 288">
<defs><g><g id="glyph-0-0"><path d="M 0 0 L 1 1 Z"/></g></g></defs>
<rect x="0" y="0" width="576" height="288" fill="rgb(6.27451%, 7.843137%, 9.411765%)"/>
<path data-cuecraft="west" fill="#e8833a" d="M 1 2 L 3 4 Z"/>
<path data-cuecraft="east" fill="#e8833a" d="M 5 6 L 7 8 Z"/>
</svg>`;

test("the names a program wrote come back, in the order they appear", () => {
  const { artifact } = readSvg(CAIRO);
  assert.deepEqual(artifact?.elements, ["west", "east"]);
});

test("cairo's own glyph ids are not identities", () => {
  // They are in `<defs>` and referenced by `<use xlink:href>`, which is exactly the collision
  // idea:24 flagged and the reason the attribute is namespaced rather than being `id`.
  assert.deepEqual(readSvg(CAIRO).artifact?.elements, ["west", "east"]);
});

test("the viewBox is preferred over the point-valued width and height", () => {
  const { artifact } = readSvg(CAIRO);
  assert.equal(artifact?.width, 576);
  assert.equal(artifact?.height, 288);
});

test("width and height carry the picture when there is no viewBox", () => {
  const { artifact } = readSvg('<svg width="800pt" height="400pt"></svg>');
  assert.equal(artifact?.width, 800);
  assert.equal(artifact?.height, 400);
});

test("one semantic object may be several elements", () => {
  // A bar and its outline, or the four rectangles of a panel. Requiring a program to merge them
  // into one element to give them one name would be cuecraft having an opinion about geometry.
  const { artifact } = readSvg(
    '<svg viewBox="0 0 10 10">' +
      '<path data-cuecraft="west" d="M0 0"/>' +
      '<path data-cuecraft="west" d="M1 1"/>' +
      "</svg>",
  );
  assert.deepEqual(artifact?.elements, ["west"]);
});

test("a picture with no names is a picture, not a failure", () => {
  const { artifact, problem } = readSvg('<svg viewBox="0 0 4 2"></svg>');
  assert.equal(problem, undefined);
  assert.deepEqual(artifact?.elements, []);
});

test("a file with no svg root is refused", () => {
  assert.match(readSvg("<html><body/></html>").problem ?? "", /no <svg> root/);
});

test("a picture with no dimensions is refused, because it has no aspect to be fitted to", () => {
  assert.match(readSvg("<svg></svg>").problem ?? "", /neither a viewBox nor a width/);
});

test("a zero-area viewBox falls through to width and height, then is refused", () => {
  assert.match(
    readSvg('<svg viewBox="0 0 0 0"></svg>').problem ?? "",
    /neither a viewBox/,
  );
});

test("a tag that is not an identity is refused, and quoted back", () => {
  const { problem } = readSvg(
    '<svg viewBox="0 0 1 1"><path data-cuecraft="2024 Q1"/></svg>',
  );
  assert.match(problem ?? "", /"2024 Q1" is tagged in the picture/);
  assert.match(problem ?? "", /starts with a letter/);
});
