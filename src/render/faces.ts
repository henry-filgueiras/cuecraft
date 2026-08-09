import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { repositoryRoot } from "../repository.ts";
import type { TypographyId } from "./typography.ts";

/**
 * Where the bundled faces live, and exactly which bytes they are.
 *
 * The pin is a plain JSON file at the repository root rather than a TypeScript constant, for
 * `../tts/model.ts`'s reason and by direct analogy with it: the bootstrap script and the runtime
 * read the same bytes, and a shell script drifting from a compiled module is precisely the failure
 * a pin exists to prevent.
 *
 * ## Why this is npm and not a downloader
 *
 * decision:8 pinned the Kokoro weights by writing a downloader, because Hugging Face is not a
 * package registry and nothing else would have given an immutable revision plus a checksum. Fonts
 * are not that shape of problem. decision:32 already bundles KaTeX — an npm dependency whose CSS
 * the composition imports and whose faces Remotion's own webpack resolves — and dragon:4 names that
 * exact arrangement as the affordable answer. Fontsource ships Atkinson Hyperlegible the same way.
 *
 * So the provisioning is `npm ci`, and it is stronger than a bespoke downloader rather than weaker:
 * the version is pinned exactly in `package.json`, the tarball is verified against a SHA-512 in
 * `package-lock.json` *before* it is unpacked, extraction is staged so an interrupted install
 * cannot leave a half-written package, and the cache key that invalidates a stale copy is the
 * version itself. None of that had to be written.
 *
 * What `fonts.lock.json` adds is the thing a tarball hash cannot answer afterwards: whether the
 * **eight files cuecraft actually draws with** are present and are those bytes. `npm run
 * bootstrap:fonts` is where that is checked in full; this module checks the cheap half of it — that
 * they exist — before a render spends a minute bundling something that will render in Arial.
 */

export interface PinnedFace {
  /** Package-relative, e.g. `files/atkinson-hyperlegible-next-latin-400-normal.woff2`. */
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface PinnedFamily {
  /** The CSS family name, exactly as the profile and the `@font-face` rules spell it. */
  readonly family: string;
  readonly package: string;
  readonly version: string;
  readonly role: "prose" | "mono";
  /** Package-relative path to the OFL-1.1 text that shipped with the face. */
  readonly license: string;
  readonly licenseId: string;
  readonly files: readonly PinnedFace[];
}

export interface FontPin {
  readonly families: readonly PinnedFamily[];
}

export const FONT_LOCK_FILE = "fonts.lock.json";

export function readFontPin(): FontPin {
  const path = join(repositoryRoot(), FONT_LOCK_FILE);
  return JSON.parse(readFileSync(path, "utf8")) as FontPin;
}

/**
 * Which profiles need something on disk before they can render.
 *
 * `default` needs nothing: it is a system stack, the host either has Helvetica Neue or substitutes
 * for it, and no amount of checking changes which (dragon:4). Only a profile whose faces are
 * *bundled* has anything that can be missing, which is why this is keyed by profile rather than
 * checked unconditionally — a deck that never asked for the accessibility profile must not be able
 * to fail for want of a font it does not use.
 */
export function requiresBundledFaces(id: TypographyId): boolean {
  return id === "hyperlegible";
}

/**
 * Every pinned file that is not where the lock says it should be. Absolute paths.
 *
 * The pin is an argument for the reason the repository reader is one in `../presentation/parse.ts`:
 * it is what lets the unbootstrapped case be tested on a machine that is bootstrapped. Defaulted
 * from the committed lock, so no caller in the render path passes one.
 */
export function missingFaces(pin: FontPin = readFontPin()): readonly string[] {
  const root = join(repositoryRoot(), "node_modules");
  return pin.families.flatMap((family) =>
    family.files
      .map((file) => join(root, family.package, file.path))
      .filter((path) => !existsSync(path)),
  );
}

/**
 * What to tell somebody whose render is about to be set in the wrong face, or nothing.
 *
 * `../tts/kokoro.ts`'s `describeMissingArtifacts` in the other half of the toolchain, and worded to
 * the same standard: name what is missing, name the one command that fixes it, and say what still
 * works without it. A render that silently fell back to a system stack would produce a film that
 * *looks* fine and quietly fails the only thing the deck asked for.
 */
export function describeMissingFaces(
  id: TypographyId,
  pin: FontPin = readFontPin(),
): string | undefined {
  if (!requiresBundledFaces(id)) return undefined;
  const missing = missingFaces(pin);
  if (missing.length === 0) return undefined;

  const root = join(repositoryRoot(), "node_modules");
  const named = missing.map((path) => path.slice(root.length + 1));
  return (
    `this presentation asks for the hyperlegible typography profile, but the faces it is ` +
    `set in are not installed (missing ${named.length} file(s), starting with ${named[0]}).\n` +
    `Run: npm run bootstrap:fonts\n` +
    `Rendering without them would silently fall back to a system stack, which is the one ` +
    `thing 'accessibility: dyslexia: true' exists to prevent. Decks that do not ask for it ` +
    `are unaffected.`
  );
}
