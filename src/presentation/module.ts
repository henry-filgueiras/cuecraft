import { posix } from "node:path";

import { MAX_MODULE_DEPTH } from "./scope.ts";

/**
 * A child module: one body, its own narration, in its own file.
 *
 * decision:25 let an entity have an inside and refused to let that inside be a world. The refusal
 * was scoped to what it was testing — whether a concept can have an interior at all — and it left
 * the interesting half alone: an inline `detail` is narrated by the slide that contains it, so a
 * concept's inside cannot say anything on its own. Everything in there is a sentence the parent
 * happened to aim downwards.
 *
 * A module is a different proposition from a nested `world:` key, and the difference is the whole
 * argument for it:
 *
 *     a file            a name, a resolution rule, a canonical identity, a cycle check
 *     its own `say`     a descent that is a call, not a camera move
 *     one body          not a deck, not a presentation, not a package
 *
 * The last one is a boundary and it is enforced by refusal rather than by omission. `title`,
 * `slides` and `defaults` are named in the error, because an author who writes one of them has a
 * clear and wrong idea about what this is, and "unknown key" would not correct it.
 *
 * This module owns the parts that are pure: where a path points, whether the chain has folded
 * back on itself, how deep it has gone, and whether the document is shaped like a module. What a
 * body *is* stays in the parser, which is the only thing that knows how to resolve one.
 */

export class ModuleError extends Error {}

/** Everything a module may hold, before its body is resolved. */
export interface ModuleDocument {
  /** The one body key that was present, and the value under it. */
  readonly key: string;
  readonly body: unknown;
  readonly say: unknown;
}

const FORBIDDEN_KEYS: Record<string, string> = {
  title:
    "a module is titled by the entity that names it, so that the label on the plate and the " +
    "heading inside it cannot disagree",
  slides:
    "a module is one body, not a deck; a presentation that wants several slides is a presentation",
  defaults:
    "theme, voice and timing are the root presentation's, inherited whole; a module that could " +
    "set its own would be a second deck wearing an entity's name",
};

/**
 * Where `spec`, written in `from`, points.
 *
 * Relative to the declaring file, which is the only rule that lets a directory of modules be
 * moved without rewriting anything inside it. The result is repository-relative, so it goes
 * through the same injected reader every quoted specimen uses and inherits the same containment
 * guarantee (`./source.ts`): no absolute paths, no traversal out of the checkout, no network.
 *
 * It is also the module's **canonical identity** — the thing an inclusion chain is compared on,
 * so that `./risk.yaml` and `../order/risk.yaml` are recognised as the same file.
 */
export function resolveModuleSpec(from: string, spec: string): string {
  const written = spec.trim();
  if (written === "") {
    throw new ModuleError("child must name a file, relative to this one");
  }
  if (posix.isAbsolute(written) || /^[A-Za-z]:/.test(written)) {
    throw new ModuleError(
      `child ${JSON.stringify(spec)} is absolute; a module is named relative to the file that ` +
        "declares it",
    );
  }

  const extension = posix.extname(written).toLowerCase();
  if (extension !== ".yaml" && extension !== ".yml") {
    throw new ModuleError(
      `child ${JSON.stringify(spec)} is ${extension === "" ? "extensionless" : extension}; ` +
        "a module is a .yaml file",
    );
  }

  // The declaring file has to be somewhere inside the checkout, because that is the boundary
  // everything cuecraft reads is contained by (`./source.ts`). A presentation living outside it
  // can still be compiled — only quoting and descent are contained — and this is where an author
  // finds that out, with the reason rather than with "path is absolute".
  const base = posix.dirname(toPosix(from));
  if (posix.isAbsolute(base)) {
    throw new ModuleError(
      `child ${JSON.stringify(spec)} is declared by ${JSON.stringify(from)}, which is not ` +
        "inside this cuecraft checkout; a module is resolved relative to its caller and read " +
        "through the same boundary a quoted specimen is",
    );
  }
  const resolved = posix.normalize(posix.join(base, toPosix(written)));
  if (resolved === ".." || resolved.startsWith("../")) {
    throw new ModuleError(
      `child ${JSON.stringify(spec)} resolves outside the repository; a module may only name ` +
        "files inside it",
    );
  }
  return resolved;
}

function toPosix(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Whether this file may be opened from here, and why not if it may not.
 *
 * `chain` is every file currently open, outermost first, beginning with the presentation itself.
 * Both failures are reported with the whole chain, because neither is diagnosable from the pair
 * of files at the fold — a cycle three modules long looks like a perfectly reasonable include
 * from either end of it.
 */
export function checkInclusion(chain: readonly string[], resolved: string): void {
  const cut = chain.indexOf(resolved);
  if (cut !== -1) {
    throw new ModuleError(
      `child ${JSON.stringify(resolved)} includes itself: ` +
        [...chain.slice(cut), resolved].join(" -> "),
    );
  }
  if (chain.length > MAX_MODULE_DEPTH) {
    throw new ModuleError(
      `child ${JSON.stringify(resolved)} is ${chain.length + 1} modules deep; cuecraft ` +
        `demonstrates ${MAX_MODULE_DEPTH} (a child and a grandchild) and refuses to advertise ` +
        `more until something has been watched at that depth: ` +
        [...chain, resolved].join(" -> "),
    );
  }
}

/**
 * Check that a parsed module document is one, and say which body it carries.
 *
 * Hand-checked rather than expressed as a schema for the reason everything else in this format is
 * hand-checked: the failures worth reporting are semantic — "this is a deck", "this has two kinds
 * of content", "this has nothing to say" — and a union would report all three as "invalid input".
 */
export function readModuleDocument(
  document: unknown,
  file: string,
  bodyKeys: readonly string[],
): ModuleDocument {
  const where = JSON.stringify(file);
  if (document === null || document === undefined) {
    throw new ModuleError(`module ${where} is empty`);
  }
  if (typeof document !== "object" || Array.isArray(document)) {
    throw new ModuleError(
      `module ${where} must be a mapping of one body and its narration, ` +
        `such as { world: ..., say: [...] }`,
    );
  }

  const record = document as Record<string, unknown>;
  for (const [key, why] of Object.entries(FORBIDDEN_KEYS)) {
    if (record[key] !== undefined) {
      throw new ModuleError(`module ${where} has ${JSON.stringify(key)}; ${why}`);
    }
  }

  const allowed = [...bodyKeys, "say"];
  const extra = Object.keys(record).filter((key) => !allowed.includes(key));
  if (extra.length > 0) {
    throw new ModuleError(
      `module ${where} has unknown key ${JSON.stringify(extra.join(", "))} ` +
        `(allowed: ${allowed.join(", ")})`,
    );
  }

  const present = bodyKeys.filter((key) => record[key] !== undefined);
  if (present.length === 0) {
    throw new ModuleError(
      `module ${where} has no content; it must carry one of ${bodyKeys.join(", ")}`,
    );
  }
  if (present.length > 1) {
    throw new ModuleError(
      `module ${where} has ${present.map((key) => JSON.stringify(key)).join(" and ")}; ` +
        "a module's content is one of those, because each says something different about what " +
        "it means",
    );
  }

  const key = present[0] as string;
  return { key, body: record[key], say: record["say"] };
}
