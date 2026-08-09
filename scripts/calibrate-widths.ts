/**
 * What a face actually costs per character, measured rather than guessed.
 *
 * Every fitter in `src/render/theme.ts` predicts a line break by dividing a character count by an
 * average advance width, because composition has to resolve without a browser. Those five numbers
 * are facts about a *face*, so a second typography profile needs its own five, and "wider than
 * Helvetica, add a bit" is not a calibration — it is a guess with a decimal point on it.
 *
 * ## What this does
 *
 * 1. Builds a corpus out of the decks in `examples/`: every title, bullet, stage, source line,
 *    world label, state name, transition event, actor and message this repository actually sets,
 *    plus a small hostile set of the strings a real deck does not happen to contain.
 * 2. Opens **Remotion's own Chrome Headless Shell** — the exact browser a render uses — and
 *    measures each string with the exact WOFF2 `fonts.lock.json` pins, embedded as data URIs so
 *    no bundler, server or cache sits between the pin and the measurement.
 * 3. Reports, per class, the distribution of `width / (characters × size)` for both profiles.
 *
 * ## The rule for choosing a number
 *
 * The estimate must be **pessimistic**: `perLine = floor(width / (size × ratio))`, so a ratio
 * below the truth over-reports how much fits, under-counts lines, and hands a composition room it
 * does not have. A heading that wraps where the estimator said it would not takes that room from
 * the body underneath it.
 *
 * But "use the maximum" is not the answer either: one pathological all-caps label would push every
 * ordinary sentence into a smaller type size across the whole repository.
 *
 * So the value is chosen by **matching the default profile's own risk posture**. The shipped
 * default constants are known-good over four years of rendered films; this measures where each one
 * sits as a quantile of its own distribution, and puts the hyperlegible constant at the same
 * quantile of *its* distribution. Nobody has to decide how conservative to be — the answer is
 * "exactly as conservative as cuecraft already is", and it is re-derivable.
 *
 * ## Running it
 *
 *     node scripts/calibrate-widths.ts            # report
 *     node scripts/calibrate-widths.ts --json     # machine-readable
 *     node scripts/calibrate-widths.ts --write    # update src/render/calibration.json
 *
 * `--write` is what keeps this from being a thing somebody ran once. The fixture it produces
 * records the font versions the measurement was taken against and the value each class needs, and
 * `src/render/typography.test.ts` fails if the shipped constants no longer cover it or if
 * `fonts.lock.json` has moved since. So a font upgrade cannot silently change a line break: it
 * fails the ordinary suite, on a machine with no browser, and says to rerun this.
 *
 * Needs the fonts installed (`npm run bootstrap:fonts`) and downloads Remotion's browser on first
 * use, exactly as a render does. It is a developer tool: nothing in `src/` imports it, and no
 * render path runs it.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { SlideBody } from "../src/presentation/body.ts";
import { parsePresentation } from "../src/presentation/parse.ts";
import { readFontPin } from "../src/render/faces.ts";
import { repositoryRoot } from "../src/repository.ts";
import {
  DEFAULT_TYPOGRAPHY,
  HYPERLEGIBLE_TYPOGRAPHY,
  type AdvanceWidths,
  type Typography,
} from "../src/render/typography.ts";
import {
  CODE,
  MACHINE,
  TRANSCRIPT,
  TYPE,
  WORLD,
  fitHeading,
} from "../src/render/theme.ts";

/* ------------------------------------------------------------------ the classes */

type WidthClass = keyof AdvanceWidths;

/**
 * How each class of text is actually set, taken from the components that set it.
 *
 * Weight and tracking are not decoration here: `letter-spacing: -0.024em` at 104px is two and a
 * half pixels off every character, which is five percent of the advance and more than the gap
 * between the two profiles' body ratios. A calibration that measured untracked text would be
 * calibrating a face this deck never sets.
 */
interface Setting {
  readonly weight: number;
  /** CSS `letter-spacing`, exactly as the component writes it. */
  readonly tracking: string;
  /** Which of the profile's two stacks. */
  readonly stack: "prose" | "mono";
  /** The sizes this class is genuinely set at, in the components that set it. */
  readonly sizes: readonly number[];
}

const SETTINGS: Record<WidthClass, readonly Setting[]> = {
  // `heading` in layouts.tsx, at the three sizes `fitHeading` steps between, plus the two other
  // display roles that share the style.
  heading: [
    {
      weight: 700,
      tracking: "-0.024em",
      stack: "prose",
      sizes: [
        TYPE.display,
        TYPE.title,
        fitHeading(45, TYPE.title),
        fitHeading(70, TYPE.title),
        TYPE.lead,
      ],
    },
  ],
  // Numbered rows, subtitles, quoted sentences and table cells: everything set as running text.
  body: [
    { weight: 400, tracking: "-0.014em", stack: "prose", sizes: [TYPE.row, TYPE.item] },
    { weight: 400, tracking: "-0.011em", stack: "prose", sizes: [42, 34, 30] },
  ],
  // A specimen. One width by construction, so the sizes are there to catch hinting rather than
  // to average anything.
  mono: [
    {
      weight: 400,
      tracking: "normal",
      stack: "mono",
      sizes: [CODE.maxSize, 36, CODE.minSize],
    },
  ],
  // A plate's label, in the two compositions that draw plates.
  plate: [
    { weight: 600, tracking: "-0.018em", stack: "prose", sizes: [WORLD.label] },
    { weight: 600, tracking: "-0.015em", stack: "prose", sizes: [MACHINE.label] },
    { weight: 600, tracking: "-0.01em", stack: "prose", sizes: [TRANSCRIPT.actor] },
  ],
  // A transition's event, and a message on a lifeline: the same class at the same scale.
  event: [
    { weight: 500, tracking: "normal", stack: "prose", sizes: [MACHINE.event] },
    { weight: 500, tracking: "-0.005em", stack: "prose", sizes: [TRANSCRIPT.message] },
  ],
};

/* ------------------------------------------------------------------ the corpus */

/**
 * Strings a real deck does not happen to contain, but a real deck could.
 *
 * Deliberately small beside the shipped corpus. The point of calibrating against `examples/` is
 * that it is what cuecraft is *for*; a set of adversarial strings weighted equally would calibrate
 * for text nobody writes. These are here so the distribution has a tail rather than to move its
 * middle: the widest characters at display size, digits and timestamps in the mono face, and the
 * ambiguous pairs the hyperlegible profile exists to separate.
 */
const HOSTILE: Record<WidthClass, readonly string[]> = {
  heading: [
    "WHY THE LEASE EXPIRED",
    "MMMMMMMM WWWWWWWW",
    "Il1 O0 rn/m cl/d — the whole problem",
    "A title with (parentheses), a dash — and “quotes”",
  ],
  body: [
    "Il1lI1 O0Oo0 rn/m cl/d vv/w",
    "The runner claimed the lease at 09:41:07.482Z and renewed it 14 times.",
    "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
    "iiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
    "99.997% of 1,048,576 requests — p99 at 4.2ms",
  ],
  mono: [
    "  lease_id: 0xO0Il1 # rn m cl d",
    "2026-08-09T09:41:07.482Z  WARN  renew failed (attempt 3/5)",
    "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
    "iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
  ],
  plate: ["Waiting for the lease", "MMMMMMMM", "Il1 O0", "Fenced write rejected"],
  event: ["renew() times out", "MMMMMMMMMMMMMMMM", "lease_expired[epoch=17]", "Il1O0rn"],
};

/** Everything the shipped decks set, by class. */
function shippedCorpus(): Record<WidthClass, string[]> {
  const found: Record<WidthClass, string[]> = {
    heading: [],
    body: [],
    mono: [],
    plate: [],
    event: [],
  };

  for (const path of decks()) {
    let slides;
    try {
      slides = parsePresentation(readFileSync(path, "utf8"), path).slides;
    } catch {
      // A deck that will not parse standalone — one whose exhibit has not been materialized — is
      // not a corpus problem. Skipped loudly enough to be noticed in the report's deck count.
      continue;
    }
    for (const slide of slides) {
      found.heading.push(slide.title);
      walk(slide.body, found);
    }
  }

  return found;
}

function walk(body: SlideBody, found: Record<WidthClass, string[]>): void {
  switch (body.kind) {
    case "bullets":
    case "steps":
      for (const item of body.items) found.body.push(item.text);
      return;
    case "code":
      for (const line of body.source.split("\n")) if (line !== "") found.mono.push(line);
      return;
    case "change":
      for (const source of [body.before, body.after]) {
        for (const line of source.split("\n")) if (line !== "") found.mono.push(line);
      }
      return;
    case "series":
      for (const group of body.groups) found.body.push(group.text);
      return;
    case "world":
      for (const entity of body.entities) {
        found.plate.push(entity.text);
        // A nested world is the same kind of text one level down, and `examples/cuecraft.yaml`'s
        // interiors are where the longest plate labels in the repository live.
        if (entity.detail !== undefined) walk(entity.detail, found);
      }
      for (const relation of body.relations) {
        if (relation.label !== undefined) found.event.push(relation.label);
      }
      return;
    case "protocol":
      for (const actor of body.actors) found.plate.push(actor.text);
      for (const step of body.steps) found.event.push(step.message);
      return;
    case "machine":
      for (const state of body.states) found.plate.push(state.text);
      for (const transition of body.transitions) found.event.push(transition.on);
      return;
    default:
      return;
  }
}

function decks(): string[] {
  const root = join(repositoryRoot(), "examples");
  const found: string[] = [];
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) visit(path);
      else if (name.endsWith(".yaml")) found.push(path);
    }
  };
  visit(root);
  return found;
}

/* ------------------------------------------------------------------ measuring */

interface Sample {
  readonly klass: WidthClass;
  readonly text: string;
  readonly size: number;
  readonly weight: number;
  readonly tracking: string;
  readonly stack: "prose" | "mono";
}

function samples(): Sample[] {
  const shipped = shippedCorpus();
  const out: Sample[] = [];
  for (const klass of Object.keys(SETTINGS) as WidthClass[]) {
    // Deduplicated: `examples/` repeats a handful of labels across decks, and a repeated string is
    // not a second observation of anything.
    const texts = [...new Set([...shipped[klass], ...HOSTILE[klass]])]
      // Below about eight characters the ratio is dominated by which two letters they happen to be,
      // and no fitter in cuecraft makes a decision that a five-character string can change.
      .filter((text) => text.trim().length >= 8);
    for (const setting of SETTINGS[klass]) {
      for (const size of setting.sizes) {
        for (const text of texts) {
          out.push({
            klass,
            text,
            size,
            weight: setting.weight,
            tracking: setting.tracking,
            stack: setting.stack,
          });
        }
      }
    }
  }
  return out;
}

/** The pinned WOFF2, inline, so the measurement cannot be of some other copy of the face. */
function faceRules(): string {
  const pin = readFontPin();
  const root = join(repositoryRoot(), "node_modules");
  return pin.families
    .flatMap((family) =>
      family.files.map((file) => {
        const weight = /-latin-(\d+)-normal\.woff2$/.exec(file.path)?.[1];
        const data = readFileSync(join(root, family.package, file.path)).toString(
          "base64",
        );
        return (
          `@font-face{font-family:"${family.family}";font-style:normal;` +
          `font-weight:${weight};font-display:block;` +
          `src:url(data:font/woff2;base64,${data}) format("woff2")}`
        );
      }),
    )
    .join("\n");
}

async function measure(
  type: Typography,
  batch: readonly Sample[],
): Promise<readonly number[]> {
  const { ensureBrowser, openBrowser } = await import("@remotion/renderer");
  await ensureBrowser();
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    const page = await browser.newPage({ logLevel: "error", indent: false });
    const page_ = page as unknown as {
      goto(options: { url: string; timeoutInMilliseconds: number }): Promise<unknown>;
      evaluate(script: string): Promise<unknown>;
    };
    const html =
      `<!doctype html><meta charset="utf-8"><style>${faceRules()}` +
      `body{margin:0}span{white-space:pre;display:inline-block}</style><body>`;
    await page_.goto({
      url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
      timeoutInMilliseconds: 60_000,
    });

    // Every family the profile names, resident before a single string is measured. This is the
    // same gate `src/render/fonts.tsx` puts in front of a render, for the same reason: a width
    // measured against the fallback is a width measured against the wrong face.
    const wanted = JSON.stringify(
      type.faces.flatMap((face) =>
        face.weights.map((weight) => `${weight} 16px "${face.family}"`),
      ),
    );
    const ready = await page_.evaluate(
      `Promise.all(${wanted}.map((f) => document.fonts.load(f)))
         .then((loaded) => loaded.every((faces) => faces.length > 0))`,
    );
    if (ready !== true && type.faces.length > 0) {
      throw new Error(
        `the ${type.id} faces did not load; run 'npm run bootstrap:fonts' and retry`,
      );
    }

    const payload = JSON.stringify(
      batch.map((sample) => [
        sample.text,
        sample.size,
        sample.weight,
        sample.tracking,
        sample.stack === "prose" ? type.prose : type.mono,
      ]),
    );
    const widths = await page_.evaluate(
      `(() => {
        const out = [];
        const span = document.createElement("span");
        document.body.appendChild(span);
        for (const [text, size, weight, tracking, family] of ${payload}) {
          span.style.fontFamily = family;
          span.style.fontSize = size + "px";
          span.style.fontWeight = String(weight);
          span.style.letterSpacing = tracking;
          span.textContent = text;
          out.push(span.getBoundingClientRect().width);
        }
        span.remove();
        return out;
      })()`,
    );
    return widths as readonly number[];
  } finally {
    await browser.close({ silent: true });
  }
}

/* ------------------------------------------------------------------ statistics */

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const at = (sorted.length - 1) * q;
  const low = Math.floor(at);
  const high = Math.ceil(at);
  const a = sorted[low] as number;
  const b = sorted[high] as number;
  return a + (b - a) * (at - low);
}

/** Where `value` sits in `sorted`, as a fraction. The inverse of `quantile`. */
function quantileOf(sorted: readonly number[], value: number): number {
  let below = 0;
  for (const entry of sorted) if (entry <= value) below += 1;
  return sorted.length === 0 ? Number.NaN : below / sorted.length;
}

interface ClassReport {
  readonly klass: WidthClass;
  readonly n: number;
  readonly current: number;
  readonly defaultRatios: readonly number[];
  readonly hyperlegibleRatios: readonly number[];
  /** Where the shipped default constant sits in the default face's own distribution. */
  readonly posture: number;
  /** The same quantile of the hyperlegible distribution, rounded up to two places. */
  readonly recommended: number;
}

function ratiosOf(batch: readonly Sample[], widths: readonly number[]): number[] {
  return batch.map(
    (sample, index) => (widths[index] as number) / (sample.text.length * sample.size),
  );
}

/* ------------------------------------------------------------------ the report */

function bar(value: number, low: number, high: number, width = 28): string {
  const at = Math.round(((value - low) / (high - low)) * (width - 1));
  const cells = Array.from({ length: width }, (_, i) => (i === at ? "|" : "-"));
  return cells.join("");
}

async function main(): Promise<void> {
  const asJson = process.argv.includes("--json");
  const write = process.argv.includes("--write");
  const batch = samples();

  const defaultWidths = await measure(DEFAULT_TYPOGRAPHY, batch);
  const hyperWidths = await measure(HYPERLEGIBLE_TYPOGRAPHY, batch);

  const reports: ClassReport[] = [];
  for (const klass of Object.keys(SETTINGS) as WidthClass[]) {
    const indices = batch
      .map((sample, index) => ({ sample, index }))
      .filter((entry) => entry.sample.klass === klass);
    const pick = (widths: readonly number[]) =>
      ratiosOf(
        indices.map((entry) => entry.sample),
        indices.map((entry) => widths[entry.index] as number),
      ).sort((a, b) => a - b);

    const base = pick(defaultWidths);
    const hyper = pick(hyperWidths);
    const current = DEFAULT_TYPOGRAPHY.width[klass];

    // A monospace face has one advance, so its "distribution" is a point mass and matching a
    // quantile of it means nothing: every quantile is the same number. The right value is the
    // advance itself, rounded up so the estimate can never be under it. Handled explicitly rather
    // than left to fall out of the general rule, because the general rule falling out correctly
    // here would be luck.
    const pointMass = (hyper.at(-1) as number) - (hyper[0] as number) < 1e-3;
    const posture = pointMass ? 1 : quantileOf(base, current);
    const target = pointMass ? (hyper.at(-1) as number) : quantile(hyper, posture);

    // Rounded up, at the precision the default constant already uses. Two places for the four
    // proportional classes and three for the monospace one, because that is what those numbers
    // are and inventing a digit would suggest a precision the corpus does not support.
    const places = decimalsOf(current);
    const scale = 10 ** places;
    const recommended = Math.ceil(target * scale) / scale;

    reports.push({
      klass,
      n: base.length,
      current,
      defaultRatios: base,
      hyperlegibleRatios: hyper,
      posture,
      recommended,
    });
  }

  if (write) {
    const pin = readFontPin();
    const fixture = {
      $comment: [
        "Measured by scripts/calibrate-widths.ts. Do not hand-edit.",
        "",
        "src/render/typography.test.ts asserts that the shipped advance widths still cover what",
        "was measured here, and that these are still the fonts fonts.lock.json pins. A font",
        "upgrade therefore fails the ordinary suite — with no browser and no render — instead of",
        "quietly moving every line break in every hyperlegible film.",
        "",
        "Re-derive with: node scripts/calibrate-widths.ts --write",
      ],
      fonts: Object.fromEntries(
        pin.families.map((family) => [family.package, family.version]),
      ),
      deckCount: decks().length,
      sampleCount: batch.length,
      classes: Object.fromEntries(
        reports.map((report) => [
          report.klass,
          {
            samples: report.n,
            // Where the shipped default constant sits in the default face's own distribution:
            // the risk posture the hyperlegible value is matched to.
            posture: Number(report.posture.toFixed(4)),
            default: {
              measuredAtPosture: round(quantile(report.defaultRatios, report.posture)),
              max: round(report.defaultRatios.at(-1) as number),
            },
            hyperlegible: {
              /** What the profile's constant must be at least. */
              required: report.recommended,
              max: round(report.hyperlegibleRatios.at(-1) as number),
            },
          },
        ]),
      ),
    };
    const path = join(repositoryRoot(), "src", "render", "calibration.json");
    writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`);
    console.log(`wrote ${path}`);
    return;
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          deckCount: decks().length,
          sampleCount: batch.length,
          classes: reports.map((report) => ({
            class: report.klass,
            samples: report.n,
            default: {
              shipped: report.current,
              quantileOfShipped: Number(report.posture.toFixed(4)),
              mean: mean(report.defaultRatios),
              p50: round(quantile(report.defaultRatios, 0.5)),
              p90: round(quantile(report.defaultRatios, 0.9)),
              max: round(report.defaultRatios.at(-1) as number),
            },
            hyperlegible: {
              shipped: HYPERLEGIBLE_TYPOGRAPHY.width[report.klass],
              recommended: report.recommended,
              mean: mean(report.hyperlegibleRatios),
              p50: round(quantile(report.hyperlegibleRatios, 0.5)),
              p90: round(quantile(report.hyperlegibleRatios, 0.9)),
              max: round(report.hyperlegibleRatios.at(-1) as number),
            },
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(
    `\nCalibrated over ${decks().length} decks, ${batch.length} measurements, in Remotion's own Chrome.\n`,
  );
  console.log(
    "class     n     ------------------ default ------------------   -------------- hyperlegible --------------",
  );
  console.log(
    "                mean   p50    p90    max    shipped  quantile   mean   p50    p90    max    at quantile  shipped",
  );
  for (const report of reports) {
    const d = report.defaultRatios;
    const h = report.hyperlegibleRatios;
    console.log(
      [
        report.klass.padEnd(9),
        String(report.n).padEnd(5),
        f(mean(d)),
        f(quantile(d, 0.5)),
        f(quantile(d, 0.9)),
        f(d.at(-1) as number),
        f(report.current).padStart(8),
        `${(report.posture * 100).toFixed(0)}%`.padStart(9),
        "  ",
        f(mean(h)),
        f(quantile(h, 0.5)),
        f(quantile(h, 0.9)),
        f(h.at(-1) as number),
        f(report.recommended).padStart(12),
        f(HYPERLEGIBLE_TYPOGRAPHY.width[report.klass]).padStart(8),
        HYPERLEGIBLE_TYPOGRAPHY.width[report.klass] >= report.recommended ? "ok" : "LOW",
      ].join(" "),
    );
  }

  console.log(
    "\nHow much wider the hyperlegible face sets, per class, at the shipped constants:\n",
  );
  for (const report of reports) {
    const shipped = HYPERLEGIBLE_TYPOGRAPHY.width[report.klass];
    const ratio = shipped / report.current;
    console.log(
      `  ${report.klass.padEnd(9)} ${f(report.current)} -> ${f(shipped)}  ` +
        `${((ratio - 1) * 100).toFixed(1)}% wider   ${bar(ratio, 1, 1.25)}`,
    );
  }
  console.log("");
}

/** How many decimal places a constant is written to, so a recommendation matches its precision. */
function decimalsOf(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function mean(values: readonly number[]): number {
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
function round(value: number): number {
  return Number(value.toFixed(4));
}
function f(value: number): string {
  return value.toFixed(3).padStart(6);
}

await main();
