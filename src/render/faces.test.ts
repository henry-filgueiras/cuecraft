import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { repositoryRoot } from "../repository.ts";
import {
  describeMissingFaces,
  missingFaces,
  readFontPin,
  requiresBundledFaces,
} from "./faces.ts";
import {
  DEFAULT_TYPOGRAPHY,
  faceDescriptors,
  HYPERLEGIBLE_TYPOGRAPHY,
} from "./typography.ts";

/**
 * Whether the pin, the profile and what is actually installed all say the same thing.
 *
 * Three separate statements of the same fact, and the reason they are worth checking against each
 * other is that each one is edited for a different reason. `fonts.lock.json` moves when a font is
 * upgraded, `./typography.ts` moves when the deck's typography changes, and `node_modules` moves
 * when anybody runs `npm install`. A round that upgraded the face and forgot the profile would
 * render in the right family and wait on a weight that no longer exists.
 */

test("the committed font pin names both families and only the weights the deck sets", () => {
  const pin = readFontPin();

  assert.equal(pin.families.length, 2);
  const prose = pin.families.find((family) => family.role === "prose");
  const mono = pin.families.find((family) => family.role === "mono");
  assert.ok(prose !== undefined && mono !== undefined);

  assert.equal(prose.family, "Atkinson Hyperlegible Next");
  assert.equal(mono.family, "Atkinson Hyperlegible Mono");

  for (const family of pin.families) {
    // Exactly the four this deck draws with. The packages ship eight weights and two styles each,
    // and pinning a catalogue would be pinning bytes nothing renders.
    assert.equal(family.files.length, 4);
    assert.equal(family.licenseId, "OFL-1.1");
    // Pinned exactly, never a range: a caret here would let a font upgrade change every line break
    // in every hyperlegible film without anything in the repository moving.
    assert.match(family.version, /^\d+\.\d+\.\d+$/);
    for (const file of family.files) {
      assert.match(file.sha256, /^[0-9a-f]{64}$/);
      assert.ok(file.bytes > 0);
      assert.match(file.path, /^files\/[\w-]+-latin-[4-7]00-normal\.woff2$/);
    }
  }
});

test("the pin, package.json and the installed packages agree on one version", () => {
  const manifest = JSON.parse(
    readFileSync(join(repositoryRoot(), "package.json"), "utf8"),
  ) as { dependencies: Record<string, string> };

  for (const family of readFontPin().families) {
    assert.equal(
      manifest.dependencies[family.package],
      family.version,
      `${family.package} must be pinned exactly, and to the version fonts.lock.json names`,
    );
    const installed = JSON.parse(
      readFileSync(
        join(repositoryRoot(), "node_modules", family.package, "package.json"),
        "utf8",
      ),
    ) as { version: string };
    assert.equal(installed.version, family.version);
  }
});

test("every pinned file is present and is exactly those bytes", () => {
  assert.deepEqual(missingFaces(), []);

  for (const family of readFontPin().families) {
    for (const file of family.files) {
      const path = join(repositoryRoot(), "node_modules", family.package, file.path);
      const bytes = readFileSync(path);
      assert.equal(bytes.length, file.bytes, file.path);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256, path);
    }
  }
});

test("the licence ships with the face it licenses", () => {
  for (const family of readFontPin().families) {
    const path = join(repositoryRoot(), "node_modules", family.package, family.license);
    assert.ok(existsSync(path), `${family.package} must ship its licence`);
    assert.match(readFileSync(path, "utf8"), /SIL Open Font License, Version 1\.1/);
  }
});

test("the profile asks for exactly the families and weights the pin provides", () => {
  const pin = readFontPin();

  const pinned = pin.families
    .flatMap((family) =>
      family.files.map((file) => {
        const weight = /-latin-(\d+)-normal\.woff2$/.exec(file.path)?.[1];
        return `${weight} 16px "${family.family}"`;
      }),
    )
    .sort();

  assert.deepEqual([...faceDescriptors(HYPERLEGIBLE_TYPOGRAPHY)].sort(), pinned);
});

/**
 * The default profile must be unable to fail for want of a font it does not use.
 *
 * Not a nicety. A check that ran unconditionally would make every existing deck in this repository
 * depend on two packages it never draws with, which is a worse regression than the feature is an
 * improvement.
 */
test("only the bundled profile has anything that can be missing", () => {
  assert.equal(requiresBundledFaces(DEFAULT_TYPOGRAPHY.id), false);
  assert.equal(requiresBundledFaces(HYPERLEGIBLE_TYPOGRAPHY.id), true);
  assert.equal(describeMissingFaces("default"), undefined);
});

test("a bootstrapped checkout reports nothing missing for either profile", () => {
  assert.equal(describeMissingFaces("default"), undefined);
  assert.equal(describeMissingFaces("hyperlegible"), undefined);
});

/**
 * What an unbootstrapped machine is actually told.
 *
 * Asserted against the *message* rather than against the absence of files, because the message is
 * the deliverable: somebody who has just cloned this repository and rendered a dyslexia deck has to
 * learn the command without reading the source. Constructed from a pin pointing at a package that
 * is not installed, so the check runs its real path.
 */
test("a missing face is reported by name, with the command that fixes it", () => {
  const absent = {
    families: [
      {
        family: "Atkinson Hyperlegible Next",
        package: "@fontsource/not-installed",
        version: "5.3.0",
        role: "prose" as const,
        license: "LICENSE",
        licenseId: "OFL-1.1",
        files: [
          { path: "files/nothing.woff2", bytes: 1, sha256: "0".repeat(64) },
          { path: "files/nothing-else.woff2", bytes: 1, sha256: "0".repeat(64) },
        ],
      },
    ],
  };

  assert.equal(missingFaces(absent).length, 2);

  const message = describeMissingFaces("hyperlegible", absent);
  assert.ok(message !== undefined);
  assert.match(message, /npm run bootstrap:fonts/);
  assert.match(message, /@fontsource\/not-installed\/files\/nothing\.woff2/);
  // It has to say what still works, or the reader concludes cuecraft is broken.
  assert.match(message, /Decks that do not ask for it are unaffected/);

  // ...and the profile that does not use them is still unaffected by their absence.
  assert.equal(describeMissingFaces("default", absent), undefined);
});
