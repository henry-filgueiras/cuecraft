/**
 * An exhibit: content cuecraft did not draw, and could not have.
 *
 * The eleventh body, and the first whose content cuecraft does not understand. Every other body is
 * something the compiler can read — a list has a length, a specimen has lines, a world has a
 * topology — and that understanding is what lets decision:10 pick the composition, the size and the
 * colour with the author naming none of them. An exhibit is a rectangle of pixels produced by a
 * program in another language, and there is nothing in it to read.
 *
 * That would be a hole in the thesis if the pixels could come from anywhere. They cannot:
 *
 *     exhibit:
 *       run: examples/revenue/quarterly-revenue.R
 *       with:
 *         transactions: examples/revenue/transactions.csv
 *
 * **There is deliberately no `image:` key.** A deck cannot name a PNG in the checkout and show it.
 * The only way to get pixels onto a cuecraft frame is to say what computes them, from what — and
 * the computation happens on every render. This is the same stance decision:18 takes for source:
 * a copy that has drifted looks completely authoritative while asserting something false, and the
 * cure is to quote rather than copy. An exhibit quotes a *computation*.
 *
 * What that buys, stated as the property worth testing: **deleting the generated image changes
 * nothing, and editing the input data changes the film.** A checked-in chart has neither.
 *
 * What is still authored is a program path and some input paths. What is derived is everything
 * else — where the picture goes, how large, on what ground, in which colours, and when. The R
 * program is *handed* the box and the palette rather than choosing them (`../compute/r.ts`), which
 * is decision:42 applied across a process boundary.
 */

/** One input the program may read, named so the program can find it without ordering. */
export interface AuthoredExhibitInput {
  /** How the R program refers to it: `CUECRAFT_INPUT_TRANSACTIONS`. */
  readonly name: string;
  /** Repository-relative, checked the way a quoted specimen's path is. */
  readonly file: string;
}

/** What materialization put where, once the program has actually run. */
export interface ExhibitResource {
  /** Relative to the render workspace's public directory, for `staticFile()`. */
  readonly src: string;
  /** Which output the program declared. Carried so a diagnostic can name it. */
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
}

export const EXHIBIT_KEYS = ["run", "with"] as const;

export const EXHIBIT_HINT =
  "{ run: <path to an .R program>, with: { <name>: <path to an input> } }";

/** What cuecraft can run. One entry, and the extension is how a deck says which. */
export const EXHIBIT_PROGRAM_EXTENSIONS = [".R", ".r"] as const;

/**
 * An input name, and the reason it is narrow.
 *
 * It becomes an environment variable on the far side (`CUECRAFT_INPUT_TRANSACTIONS`), so it has to
 * survive uppercasing and a shell. An identifier with hyphens is the largest set that does, and
 * anything wider would be a name that means one thing in the YAML and another in the program.
 */
const INPUT_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

export interface AuthoredExhibit {
  /** Repository-relative path of the R program. */
  readonly program: string;
  /**
   * The program's source, read at parse time.
   *
   * Eagerly, exactly as a quoted specimen is (idea:10): a program that has moved should fail the
   * deck before a second of narration is synthesized, not after. It is also what lets the runner
   * be handed source over stdin rather than a path — the file is read once, by the parser, through
   * the same reader every other repository access uses.
   */
  readonly source: string;
  readonly inputs: readonly AuthoredExhibitInput[];
}

export interface ExhibitIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

/** Reads a repository-relative file, or throws. The parser's injected reader. */
export type ExhibitReader = (file: string) => string;

/**
 * Validate an authored exhibit and fetch the program it names.
 *
 * Hand-checked rather than expressed as a `z.union`, for the reason every other body here is: a
 * union reports its branch failures nested three deep, and an author who wrote `runs:` should be
 * told the two keys rather than shown a tree.
 */
export function resolveExhibit(
  value: unknown,
  read: ExhibitReader,
): { exhibit?: AuthoredExhibit; issues: readonly ExhibitIssue[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { issues: [{ path: [], message: `must be ${EXHIBIT_HINT}` }] };
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter(
    (key) => !(EXHIBIT_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    return {
      issues: [
        {
          path: [],
          message:
            `unknown key ${JSON.stringify(extra.join(", "))} ` +
            `(allowed: ${EXHIBIT_KEYS.join(", ")})`,
        },
      ],
    };
  }

  const issues: ExhibitIssue[] = [];
  const program = record["run"];
  if (typeof program !== "string" || program.trim() === "") {
    issues.push({ path: ["run"], message: "must name an .R program in the repository" });
  } else if (!EXHIBIT_PROGRAM_EXTENSIONS.some((suffix) => program.endsWith(suffix))) {
    issues.push({
      path: ["run"],
      message:
        `${JSON.stringify(program)} is not an R program; cuecraft runs ` +
        `${EXHIBIT_PROGRAM_EXTENSIONS.join(", ")} files and nothing else`,
    });
  }

  const inputs: AuthoredExhibitInput[] = [];
  const declared = record["with"];
  if (declared !== undefined) {
    if (typeof declared !== "object" || declared === null || Array.isArray(declared)) {
      issues.push({ path: ["with"], message: "must be a mapping of name to file" });
    } else {
      for (const [name, file] of Object.entries(declared as Record<string, unknown>)) {
        if (!INPUT_NAME.test(name)) {
          issues.push({
            path: ["with", name],
            message:
              `${JSON.stringify(name)} is not a usable input name; a name starts with a letter ` +
              "and continues with letters, digits, hyphens or underscores",
          });
          continue;
        }
        const problem = pathProblem(file);
        if (problem !== undefined) {
          issues.push({ path: ["with", name], message: problem });
          continue;
        }
        inputs.push({ name, file: file as string });
      }
    }
  }

  if (issues.length > 0) return { issues };

  // Read last, so a deck with two mistakes reports both rather than failing on the filesystem
  // before the cheap checks have run.
  let source: string;
  try {
    source = read(program as string);
  } catch (error) {
    return { issues: [{ path: ["run"], message: (error as Error).message }] };
  }
  if (source.trim() === "") {
    return {
      issues: [{ path: ["run"], message: `${JSON.stringify(program)} is empty` }],
    };
  }

  return { exhibit: { program: program as string, source, inputs }, issues: [] };
}

/**
 * Whether a declared input path is one a presentation may name.
 *
 * Syntactic only, and deliberately so: the containment arithmetic that actually decides is
 * `resolveRepositoryPath`, which realpaths both ends and runs when the file is opened. This is the
 * cheap half, run at parse time so that `../../../etc/passwd` is refused against the slide that
 * wrote it rather than against a directory it never reached.
 */
export function pathProblem(file: unknown): string | undefined {
  if (typeof file !== "string" || file.trim() === "") {
    return "must name a file in the repository";
  }
  if (file.startsWith("/") || /^[A-Za-z]:[\\/]/.test(file)) {
    return `${JSON.stringify(file)} is absolute; an input is a path relative to the repository root`;
  }
  if (file.split(/[\\/]/).includes("..")) {
    return `${JSON.stringify(file)} leaves the repository; an input must be inside the checkout`;
  }
  return undefined;
}
