import { spawn } from "node:child_process";
import { mkdir, rm, stat } from "node:fs/promises";
import { open } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

/**
 * Handing one computation to R, and taking back what it declared.
 *
 * cuecraft understands every body it has: a list, a specimen, a diff, a graph, an exchange, a
 * machine. Understanding them is what lets decision:10 choose the composition, the size and the
 * colour without an author naming any of it. Some content will never be understood that way, and
 * a quarterly revenue chart is the cheapest honest example — grouping transaction rows by quarter
 * and summing them is not a shape a presentation format should learn, and it is a shape R has
 * known for thirty years.
 *
 * So this is a **boundary, not a framework**. It is named for R, it runs R, and it is deliberately
 * small enough to copy rather than parameterise if a second environment ever earns one. There is no
 * language registry, no runtime abstraction, no daemon, and no cache.
 *
 * ## What crosses the boundary
 *
 *     in     the program's source, over stdin, and a set of named input paths
 *     out    files the program declared, in a directory this module chose
 *
 * The asymmetry is the whole protocol: **stdout describes outputs, the filesystem carries them.**
 * Nothing is discovered by looking at what appeared on disk afterwards, because a runner that
 * scans is a runner whose behaviour depends on what was already lying around.
 *
 * ## How a program is told where it is
 *
 * Through the environment, so that an R program parses nothing to find its bearings:
 *
 *     CUECRAFT_OUTPUT_DIR      the directory to write into; also the process's working directory
 *     CUECRAFT_INPUT_NAMES     every declared input name, space separated
 *     CUECRAFT_INPUT_<NAME>    the absolute path of one declared input
 *     CUECRAFT_WIDTH  / _HEIGHT / _POINTSIZE / _BACKGROUND / _FOREGROUND / _MUTED / _ACCENT
 *                              the box the result has to fill, when the caller supplies one
 *
 * The last group is decision:42 reaching across a process boundary. A cuecraft composition is laid
 * out inside the box it was given; an exhibit is a composition drawn by something else, so it is
 * given the same box. The author of the R program *receives* the palette rather than choosing one,
 * which is what keeps `decision:10`'s line — no author sets a colour — true through the escape
 * hatch rather than only up to it.
 *
 * ## How a program says what it made
 *
 * One line per output on stdout, and every other line is ordinary R diagnostics:
 *
 *     #cuecraft output png quarterly-revenue quarterly-revenue.png
 *
 * Line-oriented rather than a JSON document because base R can emit this with `cat()` and cannot
 * emit JSON without a package, and because reserving a prefix leaves `print()` and `message()`
 * working the way an R programmer expects. The file is named *relative to the output directory*,
 * which is what makes "resolve the path safely" a containment check rather than a policy.
 */

/** The program cuecraft runs. Not configurable: the environment is the experiment. */
export const RSCRIPT = "Rscript";

/**
 * `--vanilla` is `--no-init-file --no-site-file --no-environ --no-restore --no-save`, and `-`
 * reads the program from stdin. Together they mean a run depends on the source it was handed and
 * on nothing in the invoking user's home directory.
 */
export const RSCRIPT_ARGS = ["--vanilla", "-"] as const;

/** The one output type this round validates. A second format needs a reason the first did not. */
export const R_OUTPUT_TYPES = ["png"] as const;
export type ROutputType = (typeof R_OUTPUT_TYPES)[number];

/** Why a run did not produce a result. Distinct kinds because the fixes are distinct. */
export type RFailure =
  /** No `Rscript` on PATH. Fixed by the bootstrap, not by editing the program. */
  | "missing"
  /** R ran and exited nonzero. Fixed in the R program; its stderr says how. */
  | "failed"
  /** R exited zero and said something this module cannot accept. Fixed in the program. */
  | "protocol"
  /** R did not finish. */
  | "timeout";

export class RError extends Error {
  readonly failure: RFailure;
  /** Everything R wrote to stderr, verbatim. Empty when the process never started. */
  readonly stderr: string;
  /** Everything R wrote to stdout that was not a declaration. */
  readonly stdout: string;
  readonly exitCode?: number;

  constructor(
    failure: RFailure,
    message: string,
    detail: { stderr?: string; stdout?: string; exitCode?: number } = {},
  ) {
    super(message);
    this.failure = failure;
    this.stderr = detail.stderr ?? "";
    this.stdout = detail.stdout ?? "";
    if (detail.exitCode !== undefined) this.exitCode = detail.exitCode;
  }

  /** The message plus whatever R said, for a CLI that has one line and then a wall of text. */
  report(): string {
    const parts = [this.message];
    if (this.stderr.trim() !== "") parts.push(indent("R stderr", this.stderr));
    if (this.stdout.trim() !== "") parts.push(indent("R stdout", this.stdout));
    return parts.join("\n\n");
  }
}

function indent(label: string, text: string): string {
  const body = text
    .replace(/\s+$/, "")
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
  return `  ${label}:\n${body}`;
}

/** One named path the program is allowed to read. Absolute by the time it gets here. */
export interface RInput {
  readonly name: string;
  readonly path: string;
}

/** The box a result has to fill, handed across the boundary so the program can fill it. */
export interface RFrame {
  readonly width: number;
  readonly height: number;
  /** Base type size, in points, for whatever the program sets its labels with. */
  readonly pointSize: number;
  readonly background: string;
  readonly foreground: string;
  readonly muted: string;
  readonly accent: string;
}

export interface RRequest {
  /** The program itself. Supplied over stdin; nothing writes it to a file to be executed. */
  readonly source: string;
  /** What to call this program in a diagnostic. Usually where it was read from. */
  readonly label: string;
  /** The directory this run may write into. Created empty; owned by the caller, not the program. */
  readonly outputDir: string;
  readonly inputs?: readonly RInput[];
  readonly frame?: RFrame;
  readonly timeoutMs?: number;
}

export interface ROutput {
  readonly name: string;
  readonly type: ROutputType;
  /** As the program declared it: relative to the output directory. */
  readonly file: string;
  readonly path: string;
  readonly bytes: number;
  /** Read out of the PNG header, so the run can be checked against the box it was given. */
  readonly width: number;
  readonly height: number;
}

/**
 * Somewhere the program says it drew something, in fractions of the picture it produced.
 *
 * The second and last thing that crosses the boundary (decision:57). Fractions rather than pixels so
 * that a region survives the picture being fitted into a room whose size the program was never told
 * — the same reason the composition positions it in percentages and does no arithmetic.
 *
 * Top-left origin, because that is what a frame uses. R's device origin is bottom-left, so a program
 * emits `1 - grconvertY(...)`; that flip is a fact about R and stays on R's side.
 */
export interface RRegion {
  readonly name: string;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface RResult {
  readonly outputs: readonly ROutput[];
  /** Every place the program named. Empty on a program that declares none, which is most. */
  readonly regions: readonly RRegion[];
  /** Everything on stdout that was not a declaration, so a `print()` is not swallowed. */
  readonly notes: string;
  readonly stderr: string;
  readonly elapsedSeconds: number;
}

/** Two minutes. Long enough for real analysis, short enough that a hung run is not a hung build. */
export const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * The declaration line, and the whole of the output protocol.
 *
 * The name is constrained to an identifier so that the file — which may contain spaces, and on a
 * macOS checkout frequently does somewhere up its path — can be the unconstrained remainder of the
 * line. Three fixed fields and a tail is the smallest grammar that parses without quoting rules.
 */
const DECLARATION =
  /^#cuecraft\s+output\s+(\S+)\s+([A-Za-z][A-Za-z0-9_-]*)\s+(\S.*?)\s*$/;

/** How a program is expected to write one. Quoted in errors so the fix is on screen. */
export const DECLARATION_SHAPE = "#cuecraft output <type> <name> <file>";

/**
 * The region line — the same grammar with four numbers instead of a filename tail.
 *
 * Fixed arity, because unlike a filename there is nothing here that could contain a space, so there
 * is no reason to leave a remainder unconstrained.
 */
const REGION =
  /^#cuecraft\s+region\s+([A-Za-z][A-Za-z0-9_-]*)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$/;

export const REGION_SHAPE = "#cuecraft region <name> <left> <top> <right> <bottom>";

/** The first eight bytes of every PNG. Checked so that "it exists" is not mistaken for "it is one". */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Whether this machine can run R at all, phrased as advice.
 *
 * The same shape as the model's `describeMissingArtifacts()`, and for the same reason: a test that
 * needs an external runtime, and a bootstrap that installs one, both want to ask before they fail.
 */
export async function describeMissingR(): Promise<string | undefined> {
  try {
    const { code } = await capture(RSCRIPT, ["--version"], {}, process.cwd(), 15_000);
    if (code !== 0) {
      return `${RSCRIPT} is on PATH but exited ${code}; the R installation is broken`;
    }
    return undefined;
  } catch {
    return (
      `${RSCRIPT} is not on PATH. Run ./scripts/bootstrap-r.sh to install R, ` +
      "or install it yourself and rerun"
    );
  }
}

/**
 * Run one R program and return what it declared.
 *
 * The output directory is emptied first. Nothing about a run may depend on what a previous run
 * left behind — without that, a program that stopped writing its chart would keep "succeeding"
 * against the stale one, which is the exact failure decision:18 refuses for quoted source.
 */
export async function runR(request: RRequest): Promise<RResult> {
  const outputDir = resolve(request.outputDir);
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const started = performance.now();
  let captured: {
    code: number | null;
    signal: NodeJS.Signals | null;
    out: string;
    err: string;
  };
  try {
    captured = await capture(
      RSCRIPT,
      [...RSCRIPT_ARGS],
      environmentFor(request, outputDir),
      outputDir,
      request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      request.source,
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new RError(
        "missing",
        `cannot run ${request.label}: ${RSCRIPT} is not on PATH. ` +
          "Run ./scripts/bootstrap-r.sh to install R.",
      );
    }
    throw error;
  }
  const elapsedSeconds = (performance.now() - started) / 1000;

  const { declared, notes } = split(captured.out);

  if (captured.signal !== null) {
    throw new RError(
      "timeout",
      `${request.label} did not finish within ${((request.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000).toFixed(0)}s ` +
        `and was stopped (${captured.signal})`,
      { stderr: captured.err, stdout: notes },
    );
  }

  if (captured.code !== 0) {
    throw new RError("failed", `${request.label} exited ${captured.code}`, {
      stderr: captured.err,
      stdout: notes,
      ...(captured.code === null ? {} : { exitCode: captured.code }),
    });
  }

  const outputs = await resolveOutputs(declared, outputDir, request.label, {
    stderr: captured.err,
    stdout: notes,
  });

  const regions = resolveRegions(declared, request.label, {
    stderr: captured.err,
    stdout: notes,
  });

  return { outputs, regions, notes, stderr: captured.err, elapsedSeconds };
}

/** Which protocol verb a line carries, so two resolvers can walk one list without a pre-filter. */
function verbOf(line: string): string | undefined {
  return /^#cuecraft\s+(\S+)/.exec(line)?.[1];
}

/**
 * Every place a run said it drew something.
 *
 * Walks the same list `resolveOutputs` does and takes only its own lines, so neither resolver needs
 * the caller to sort the protocol out first. The unknown-verb refusal lives in `resolveOutputs`
 * because it runs first; a line neither of them claims never reaches here.
 *
 * Fractions are checked hard for the reason a declared file is: a region outside the picture, or
 * inverted, or not a number, produces a highlight over the wrong part of a chart — and a highlight
 * over the wrong part of a chart is a film that teaches something false while rendering perfectly.
 */
export function resolveRegions(
  declared: readonly string[],
  label: string,
  said: { stderr: string; stdout: string } = { stderr: "", stdout: "" },
): readonly RRegion[] {
  const regions: RRegion[] = [];
  const seen = new Set<string>();

  const refuse = (message: string): never => {
    throw new RError("protocol", `${label}: ${message}`, said);
  };

  for (const line of declared) {
    if (verbOf(line) !== "region") continue;

    const match = REGION.exec(line);
    if (match === null) {
      return refuse(
        `cannot read the region declaration ${JSON.stringify(line.trim())}; ` +
          `a region is ${JSON.stringify(REGION_SHAPE)}, where <name> is an identifier and the ` +
          "four numbers are fractions of the picture",
      );
    }

    const [, name = "", ...raw] = match;
    const numbers = raw.map(Number);
    if (numbers.some((value) => !Number.isFinite(value))) {
      return refuse(
        `region ${JSON.stringify(name)} has a coordinate that is not a number: ` +
          raw.map((value) => JSON.stringify(value)).join(" "),
      );
    }
    if (numbers.some((value) => value < 0 || value > 1)) {
      return refuse(
        `region ${JSON.stringify(name)} is outside the picture; a coordinate is a fraction ` +
          `between 0 and 1, and these are ${numbers.join(" ")}`,
      );
    }

    const [left = 0, top = 0, right = 0, bottom = 0] = numbers;
    if (left >= right || top >= bottom) {
      return refuse(
        `region ${JSON.stringify(name)} has no area: left must be less than right and top less ` +
          `than bottom, and these are ${numbers.join(" ")}`,
      );
    }
    if (seen.has(name)) {
      return refuse(
        `declared two regions named ${JSON.stringify(name)}; each name must be distinct`,
      );
    }

    seen.add(name);
    regions.push({ name, left, top, right, bottom });
  }
  return regions;
}

/**
 * Every declaration a run produced, checked all the way to the bytes on disk.
 *
 * Separated from `runR` and exported because it is the half of this module that has opinions and
 * the half that has none: spawning a process is either possible or it is not, while *what cuecraft
 * will accept back* is a set of refusals worth arguing about, and every one of them should be
 * testable on a machine with no R installed.
 */
export async function resolveOutputs(
  declared: readonly string[],
  outputDir: string,
  label: string,
  said: { stderr: string; stdout: string } = { stderr: "", stdout: "" },
): Promise<readonly ROutput[]> {
  const outputs: ROutput[] = [];
  const seen = new Set<string>();
  for (const line of declared) {
    const verb = verbOf(line);
    if (verb === "region") continue;
    // The one place a mistyped verb is caught. `#cuecraft outputs ...` would otherwise be dropped
    // silently by both resolvers and the slide would fail with "declared no output", which names
    // the symptom instead of the typo.
    if (verb !== "output") {
      throw new RError(
        "protocol",
        `${label}: ${JSON.stringify(line.trim())} is not something cuecraft understands; ` +
          `a program declares ${JSON.stringify(DECLARATION_SHAPE)} or ` +
          `${JSON.stringify(REGION_SHAPE)}`,
        said,
      );
    }
    const output = await resolveDeclaration(line, resolve(outputDir), label, said);
    if (seen.has(output.name)) {
      throw new RError(
        "protocol",
        `${label} declared two outputs named ${JSON.stringify(output.name)}; ` +
          "each name must be distinct",
        said,
      );
    }
    seen.add(output.name);
    outputs.push(output);
  }
  return outputs;
}

/**
 * What the program is told about where it is.
 *
 * The process's own environment is inherited, because `Rscript` finds its library and its own
 * installation through it and a scrubbed environment would mean re-deriving `R_HOME` here. What is
 * added is namespaced under `CUECRAFT_`, which is the whole of the discovery surface.
 */
export function environmentFor(
  request: Pick<RRequest, "inputs" | "frame">,
  outputDir: string,
): Record<string, string> {
  const env: Record<string, string> = {
    CUECRAFT_OUTPUT_DIR: outputDir,
    CUECRAFT_INPUT_NAMES: (request.inputs ?? []).map((input) => input.name).join(" "),
  };
  for (const input of request.inputs ?? []) {
    env[`CUECRAFT_INPUT_${envName(input.name)}`] = resolve(input.path);
  }
  const frame = request.frame;
  if (frame !== undefined) {
    env["CUECRAFT_WIDTH"] = String(frame.width);
    env["CUECRAFT_HEIGHT"] = String(frame.height);
    env["CUECRAFT_POINTSIZE"] = String(frame.pointSize);
    env["CUECRAFT_BACKGROUND"] = frame.background;
    env["CUECRAFT_FOREGROUND"] = frame.foreground;
    env["CUECRAFT_MUTED"] = frame.muted;
    env["CUECRAFT_ACCENT"] = frame.accent;
  }
  return env;
}

/** `quarterly-revenue` becomes `QUARTERLY_REVENUE`, which is the only thing a shell can hold. */
export function envName(name: string): string {
  return name.replace(/-/g, "_").toUpperCase();
}

/** Protocol lines out, everything else kept as the program's own diagnostics. */
export function split(stdout: string): { declared: string[]; notes: string } {
  const declared: string[] = [];
  const notes: string[] = [];
  for (const line of stdout.split("\n")) {
    if (line.startsWith("#cuecraft")) declared.push(line);
    else notes.push(line);
  }
  return { declared, notes: notes.join("\n").replace(/\s+$/, "") };
}

/**
 * One declaration, checked all the way to the bytes on disk.
 *
 * Every refusal below is a program that ran to completion and produced something cuecraft would
 * otherwise put on a slide. A slide showing the wrong picture under a heading that says what it is
 * is the failure this whole mechanism exists to prevent, so none of these has a fallback.
 */
async function resolveDeclaration(
  line: string,
  outputDir: string,
  label: string,
  said: { stderr: string; stdout: string },
): Promise<ROutput> {
  const refuse = (message: string): never => {
    throw new RError("protocol", `${label}: ${message}`, {
      stderr: said.stderr,
      stdout: said.stdout,
    });
  };

  const match = DECLARATION.exec(line);
  if (match === null) {
    return refuse(
      `cannot read the output declaration ${JSON.stringify(line.trim())}; ` +
        `a declaration is ${JSON.stringify(DECLARATION_SHAPE)}, where <name> is an identifier`,
    );
  }

  const [, type = "", name = "", file = ""] = match;
  if (!(R_OUTPUT_TYPES as readonly string[]).includes(type)) {
    return refuse(
      `declared output ${JSON.stringify(name)} has type ${JSON.stringify(type)}; ` +
        `cuecraft can take back ${R_OUTPUT_TYPES.join(", ")}`,
    );
  }

  if (isAbsolute(file)) {
    return refuse(
      `declared output ${JSON.stringify(name)} names the absolute path ${JSON.stringify(file)}; ` +
        "a declaration names a file inside CUECRAFT_OUTPUT_DIR",
    );
  }
  const path = resolve(outputDir, file);
  const within = relative(outputDir, path);
  if (within === "" || within === ".." || within.startsWith(`..${sep}`)) {
    return refuse(
      `declared output ${JSON.stringify(name)} resolves outside CUECRAFT_OUTPUT_DIR; ` +
        "a program may only declare files it wrote into the directory it was given",
    );
  }

  let info: Awaited<ReturnType<typeof stat>>;
  try {
    info = await stat(path);
  } catch {
    return refuse(
      `declared output ${JSON.stringify(name)} does not exist: ${JSON.stringify(file)} ` +
        "was declared but never written",
    );
  }
  // Outside the `try`: a refusal raised inside it would be caught by its own handler and
  // reported as "never written", which is a different mistake with a different fix.
  if (!info.isFile()) {
    return refuse(
      `declared output ${JSON.stringify(name)} is not a file: ${JSON.stringify(file)}`,
    );
  }
  const bytes = info.size;

  if (bytes === 0) {
    return refuse(
      `declared output ${JSON.stringify(name)} is empty: ${JSON.stringify(file)}`,
    );
  }
  const size = await pngSize(path);
  if (size === undefined) {
    return refuse(
      `declared output ${JSON.stringify(name)} is not a PNG: ${JSON.stringify(file)} ` +
        "has no PNG signature and header",
    );
  }

  return { name, type: type as ROutputType, file, path, bytes, ...size };
}

/**
 * A PNG's pixel dimensions, or nothing if the file is not one.
 *
 * The header rather than the signature alone, because "does this file begin with eight known
 * bytes" and "is this an image cuecraft can put on a frame" are different questions, and the
 * second one is the one being asked. A PNG's first chunk is required by the specification to be
 * `IHDR`, and its first eight payload bytes are the width and height as big-endian integers — so
 * twenty-four bytes settle it, with no decoder and no dependency.
 */
export async function pngSize(
  path: string,
): Promise<{ width: number; height: number } | undefined> {
  const handle = await open(path, "r");
  try {
    const header = Buffer.alloc(24);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead < header.length) return undefined;
    if (!header.subarray(0, 8).equals(PNG_SIGNATURE)) return undefined;
    if (header.subarray(12, 16).toString("latin1") !== "IHDR") return undefined;
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    if (width === 0 || height === 0) return undefined;
    return { width, height };
  } finally {
    await handle.close();
  }
}

/**
 * Spawn, feed stdin, collect both streams separately, and wait.
 *
 * Separately because they mean different things: stdout is the protocol plus whatever the program
 * printed, and stderr is where R puts warnings and the traceback that says what actually broke. A
 * merged stream would make a warning look like a malformed declaration.
 */
function capture(
  command: string,
  args: readonly string[],
  env: Record<string, string>,
  cwd: string,
  timeoutMs: number,
  stdin?: string,
): Promise<{
  code: number | null;
  signal: NodeJS.Signals | null;
  out: string;
  err: string;
}> {
  return new Promise((fulfil, reject) => {
    const child = spawn(command, [...args], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      err += chunk;
    });

    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    timer.unref?.();

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      fulfil({ code, signal, out, err });
    });

    // A program that never reads stdin still needs the stream closed, or R waits for more source.
    child.stdin.on("error", () => {
      // The child can exit before the source is fully written — a syntax error near the top will
      // do it. That is a failed run to be reported from its exit status, not a broken pipe here.
    });
    child.stdin.end(stdin ?? "");
  });
}

/** Where one exhibit's run happens, under a directory the caller owns. */
export function workDirFor(root: string, slug: string): string {
  return join(root, slug);
}
