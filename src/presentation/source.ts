import { readFileSync, realpathSync } from "node:fs";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { parseDocument, parse as parseYaml } from "yaml";

import { repositoryRoot } from "../repository.ts";
import { CODE_LANGUAGES, type CodeLanguage } from "./language.ts";

/**
 * Quoting real source instead of copying it.
 *
 * Every specimen in the canonical deck used to be a hand-written copy of something that
 * already existed in the repository. That is the worst defect this product can have: a copy
 * that has drifted looks completely authoritative while quietly asserting something false,
 * and nothing anywhere can tell. A presentation that refuses to compile is strictly better
 * than one that displays stale source (idea:10).
 *
 * So a specimen may name a file and a region of it, and cuecraft fetches the text.
 *
 * **The addressing mechanism is deliberately not a query language.** decision:16 lets a deck
 * set exactly one language, YAML, and the only YAML cuecraft understands is a presentation —
 * so the only region worth naming is a *slide*, and a slide's durable identity is its title.
 *
 *     file:  examples/witnessglass.yaml
 *     slide: "Coding agents are black boxes"
 *
 * No line numbers, no ranges, no offsets, no path expressions. That is the same stance
 * `specimen.ts` takes for marks — address content by what it says — narrowed to the one thing
 * a presentation file has that is both structural and named by its author.
 *
 * The extracted text is **verbatim**, including comments, minus only the list marker and the
 * common indentation, which is exactly what YAML's own block scalar removes from an inline
 * specimen. Nothing is reformatted, reordered, or summarized; if the region is ugly, the file
 * is ugly, and the honest fix is in the file.
 *
 * **The repository is the boundary.** A presentation may quote files inside the checkout and
 * nothing else: no absolute paths, no traversal, no network. A deck must stay reproducible
 * from the checkout plus its documented local dependencies, and a format that can read
 * `/etc/passwd` onto a slide is a format nobody should run on a file they were sent.
 */

export class SourceError extends Error {}

/** How a specimen names a region of the repository. */
export interface QuotedRegion {
  readonly file: string;
  /** The title of the slide to quote. Titles are how a deck's author names its slides. */
  readonly slide: string;
}

/** Reads a repository-relative path, or explains why it cannot. Injected so tests stay pure. */
export type RepositoryReader = (file: string) => string;

/**
 * Resolve a repository-relative path, refusing anything that escapes the checkout.
 *
 * Both ends are realpath'd before comparison so that a symlink pointing out of the tree is
 * rejected rather than followed — on macOS the repository root itself is frequently reached
 * through one, so comparing the literal strings would be wrong in both directions.
 */
export function resolveRepositoryPath(root: string, file: string): string {
  if (file.trim() === "") {
    throw new SourceError("file must name something in the repository");
  }
  if (isAbsolute(file)) {
    throw new SourceError(
      `file ${JSON.stringify(file)} is absolute; a specimen quotes a path relative to the repository root`,
    );
  }

  const realRoot = realOrSelf(root);
  const resolved = resolve(realRoot, file);
  const within = relative(realRoot, realOrSelf(resolved));
  if (within === "" || within === ".." || within.startsWith(`..${sep}`)) {
    throw new SourceError(
      `file ${JSON.stringify(file)} resolves outside the repository; a specimen may only quote files inside it`,
    );
  }
  return resolved;
}

/** `realpathSync` on a path that may not exist yet — the containment check still has to run. */
function realOrSelf(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/** The default reader: repository-relative, contained, and read from disk. */
export function repositoryReader(root: string = repositoryRoot()): RepositoryReader {
  return (file) => {
    const path = resolveRepositoryPath(root, file);
    try {
      return readFileSync(path, "utf8");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "EISDIR") {
        throw new SourceError(
          `file ${JSON.stringify(file)} does not exist in the repository`,
        );
      }
      throw new SourceError(
        `file ${JSON.stringify(file)} could not be read: ${(error as Error).message}`,
      );
    }
  };
}

/**
 * Memoize a reader for one parse.
 *
 * A deck that quotes the same file three times should read it once, and — more importantly —
 * should quote three regions of *one* state of that file rather than of three reads that
 * could in principle disagree.
 */
export function onceReader(read: RepositoryReader): RepositoryReader {
  const seen = new Map<string, string>();
  return (file) => {
    const cached = seen.get(file);
    if (cached !== undefined) return cached;
    const text = read(file);
    seen.set(file, text);
    return text;
  };
}

/** The language a quoted file is set in, from its extension. */
export function languageOf(file: string): CodeLanguage {
  const extension = extname(file).toLowerCase();
  if (extension === ".yaml" || extension === ".yml") return "yaml";
  throw new SourceError(
    `file ${JSON.stringify(file)} is ${extension === "" ? "extensionless" : extension}; ` +
      `cuecraft can only set ${CODE_LANGUAGES.join(", ")} (.yaml, .yml)`,
  );
}

/**
 * The verbatim source of one slide of a presentation file.
 *
 * Found by title, which must match exactly one slide. Zero matches and two matches are both
 * hard failures for the same reason a mark's are: silently quoting the wrong region produces
 * a video that is entirely wrong and looks entirely right.
 */
export function quoteSlide(text: string, region: QuotedRegion): string {
  const document = parseDocument(text);
  if (document.errors.length > 0) {
    throw new SourceError(
      `file ${JSON.stringify(region.file)} is not valid YAML: ${document.errors[0]?.message ?? "unparseable"}`,
    );
  }

  const slides = document.get("slides");
  if (slides === undefined || !isSequence(slides)) {
    throw new SourceError(
      `file ${JSON.stringify(region.file)} is not a presentation; it has no list of slides to quote from`,
    );
  }

  const titles: string[] = [];
  const matches: SequenceItem[] = [];
  for (const item of slides.items) {
    const title = titleOf(item);
    if (title === undefined) continue;
    titles.push(title);
    if (title === region.slide) matches.push(item);
  }

  if (matches.length === 0) {
    throw new SourceError(
      `file ${JSON.stringify(region.file)} has no slide titled ${JSON.stringify(region.slide)}` +
        (titles.length === 0 ? "" : ` (it has: ${titles.map(quote).join(", ")})`),
    );
  }
  if (matches.length > 1) {
    throw new SourceError(
      `file ${JSON.stringify(region.file)} has ${matches.length} slides titled ` +
        `${JSON.stringify(region.slide)}; a quoted region must identify exactly one`,
    );
  }

  const match = matches[0];
  const range = match?.range;
  if (match === undefined || range === undefined) {
    throw new SourceError(
      `slide ${JSON.stringify(region.slide)} of ${JSON.stringify(region.file)} has no source range to quote`,
    );
  }

  const quoted = dedent(text.slice(range[0], range[1]));
  if (quoted.trim() === "") {
    throw new SourceError(
      `slide ${JSON.stringify(region.slide)} of ${JSON.stringify(region.file)} quotes to nothing`,
    );
  }

  // The region has been cut out of a larger document, so it has to be checked as a document
  // in its own right: an extraction that no longer parses is a bug in this function, and
  // putting broken YAML on a slide labelled "this is the source" is the failure that matters.
  let reparsed: unknown;
  try {
    reparsed = parseYaml(quoted);
  } catch (error) {
    throw new SourceError(
      `quoting slide ${JSON.stringify(region.slide)} of ${JSON.stringify(region.file)} ` +
        `produced text that is not valid YAML: ${(error as Error).message}`,
    );
  }
  if (typeof reparsed !== "object" || reparsed === null || !("slide" in reparsed)) {
    throw new SourceError(
      `quoting slide ${JSON.stringify(region.slide)} of ${JSON.stringify(region.file)} ` +
        "produced text that is not a slide",
    );
  }

  return quoted;
}

interface SequenceItem {
  readonly range?: readonly [number, number, number];
  getIn?: (path: readonly string[]) => unknown;
}

function isSequence(value: unknown): value is { items: readonly SequenceItem[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray((value as { items: unknown }).items)
  );
}

function titleOf(item: SequenceItem): string | undefined {
  const title = item.getIn?.(["slide", "title"]);
  return typeof title === "string" ? title : undefined;
}

function quote(value: string): string {
  return JSON.stringify(value);
}

/**
 * Remove the indentation the region inherited from its position in the file.
 *
 * The first line begins where the slice does — immediately after the `- ` list marker — so it
 * carries no indentation of its own and sets the zero. Every other line is shifted left by the
 * shallowest indentation any of them has, which for a slide entry is the column its keys sit
 * in. Relative indentation, which is the structure being shown, is untouched.
 */
function dedent(block: string): string {
  const lines = block
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""));
  const [first = "", ...rest] = lines;
  const indents = rest
    .filter((line) => line !== "")
    .map((line) => line.length - line.trimStart().length);
  const common = indents.length === 0 ? 0 : Math.min(...indents);
  return [
    first.trimStart(),
    ...rest.map((line) => (line === "" ? "" : line.slice(common))),
  ]
    .join("\n")
    .replace(/\n+$/, "");
}
