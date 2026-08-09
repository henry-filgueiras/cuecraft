/**
 * Which faces a film is set in, and what that costs the arithmetic.
 *
 * ## Why this is not the theming system decision:2 refuses
 *
 * `./theme.ts` is the one built-in look, and the first line of it says nothing there is reachable
 * from the YAML. That is still true. What this module adds is not a knob for choosing type — there
 * is no `font:`, no size, no weight, no per-slide anything — but a **closed set of two**, selected
 * by a single boolean that expresses a constraint about a *reader* rather than a preference about a
 * typeface (`accessibility.dyslexia`, see `../presentation/parse.ts`). An author still cannot say
 * what the deck looks like. They can say who has to be able to read it, and cuecraft decides the
 * rest, which is decision:10's rule rather than an exception to it.
 *
 * The set is closed on purpose and stays closed. A third entry added for taste rather than for a
 * reader is the first stone of the thing decision:2 rules out.
 *
 * ## Why the widths travel with the families
 *
 * Every fitter in `./theme.ts` predicts a line break by dividing a character count by an average
 * advance width, because composition has to resolve without a browser — `chooseLayout` runs in
 * Node, `fitSpecimen` runs before anything is drawn, and `bodyBox` is the input to both. Those five
 * numbers were measured against Helvetica Neue at the sizes this deck sets. They are not facts about
 * *type*; they are facts about *that face*.
 *
 * Atkinson Hyperlegible is a wider design, and deliberately so: the glyph differentiation that makes
 * an `I` unmistakable for a `l` is bought with width. Carrying the families without the metrics would
 * produce a film whose headings clip and whose plates overrun, silently, in exactly the deck that
 * asked to be easier to read. So a profile is the pair, never one without the other, and the numbers
 * below are measured rather than guessed (`../../scripts/calibrate-widths.ts`).
 *
 * ## Why it is a value and not a global
 *
 * A resolved profile is chosen once per render, in `buildTimeline`, and travels on the `Timeline` as
 * an identity. The composition resolves that identity here and hands the value down through
 * `TypographyContext` (`./fonts.tsx`), beside the two per-render contexts the renderer already has.
 *
 * Nothing here is mutable and nothing is module-scoped state. Two renders in one process — a batch,
 * a test that renders twice, a nested world drawn inside a recall — cannot see each other's
 * typography, because there is no `current` for either of them to write to.
 */

/**
 * The stable name of a profile, as it appears on a compiled `Timeline`.
 *
 * An identity rather than a font family, which is the whole of what keeps the compiled model free of
 * typography. `"hyperlegible"` says *the profile the accessibility constraint selected*; it does not
 * say Atkinson, and a later round that changed which face served that constraint would not change a
 * single byte of any compiled artifact.
 */
export type TypographyId = "default" | "hyperlegible";

export const TYPOGRAPHY_IDS: readonly TypographyId[] = ["default", "hyperlegible"];

export function isTypographyId(value: unknown): value is TypographyId {
  return typeof value === "string" && TYPOGRAPHY_IDS.includes(value as TypographyId);
}

/**
 * Average advance width per class of text, as a fraction of the font size.
 *
 * Five rather than one, because the mix of characters differs enough between them to move a line
 * break: display-size headings are mostly letters at large optical sizes, ordinary prose carries
 * more punctuation and spaces relative to the em, a monospace face has one width by construction,
 * and the two world faces are set at plate weight in a second coordinate system.
 *
 * Every one of them must be **pessimistic**: an estimate that says a heading fits when it wraps
 * takes room the body was promised, and `bodyBox` hands that room to a specimen which then runs off
 * the bottom of the frame. Erring the other way costs a slightly smaller type size on one slide.
 */
export interface AdvanceWidths {
  /** A heading, at display sizes. `fitHeading`, `headingLines`, the ledger's title. */
  readonly heading: number;
  /** Ordinary prose at text sizes: bullets, quoted sentences, subtitles, table cells. */
  readonly body: number;
  /** One monospace cell. Exact for a monospace face rather than an average. */
  readonly mono: number;
  /** A plate's label in a world or a machine, at plate weight. */
  readonly plate: number;
  /** A transition's event label, set a third smaller than a state's name. */
  readonly event: number;
}

/**
 * A family the browser has to have resident before a frame may be captured.
 *
 * Only stated for a profile whose faces are *bundled*. A system stack has nothing to wait for: the
 * face is either installed on the host or it is not, and no amount of waiting changes which
 * (dragon:4).
 */
export interface TypographyFace {
  readonly family: string;
  /** The weights this deck actually sets. Asking for one it never uses would block on nothing. */
  readonly weights: readonly number[];
}

export interface Typography {
  readonly id: TypographyId;
  /** The proportional stack: headings, prose, labels, everything that is not deliberately mono. */
  readonly prose: string;
  /** The monospace stack, wherever cuecraft already means monospace — code, specimens, measured
   * numbers, timestamps, ordinals, table figures. */
  readonly mono: string;
  readonly width: AdvanceWidths;
  /** Empty for a system stack; two entries for a bundled one. */
  readonly faces: readonly TypographyFace[];
}

/**
 * The look this repository has had since sprint:2, unchanged to the digit.
 *
 * A system stack rather than a downloaded family, which is what dragon:4 is still open about: on
 * macOS it resolves to Helvetica Neue, on a Linux runner to whatever fontconfig substitutes. This
 * round does not settle that. It leaves the default exactly where it was so that every existing
 * film renders exactly as it did, and proves the mechanism dragon:4 will eventually need against a
 * second profile instead.
 *
 * `heading` at 0.49 and `body` at 0.52 carry their own archaeology in `./theme.ts`'s history — 0.49
 * replaced a guessed 0.5 that rounded the wrong way at exactly one boundary and cost two titles in
 * `examples/` a phantom second line. `mono` at 0.602 is Menlo's advance. `plate` and `event` are the
 * world and machine label faces at their own weights.
 */
export const DEFAULT_TYPOGRAPHY: Typography = {
  id: "default",
  prose: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: 'Menlo, "SF Mono", "DejaVu Sans Mono", "Liberation Mono", Consolas, monospace',
  width: {
    heading: 0.49,
    body: 0.52,
    mono: 0.602,
    plate: 0.55,
    event: 0.53,
  },
  faces: [],
};

/**
 * Atkinson Hyperlegible Next and Atkinson Hyperlegible Mono, bundled and pinned.
 *
 * Two families from one design programme, which is why the mono is not simply left as Menlo. The
 * whole argument of this face is that ambiguous glyph pairs are drawn apart — `I` and `l`, `O` and
 * `0`, `rn` and `m` — and a film that fixed that in its prose and left its *code specimens*, the
 * densest and most ambiguous text on any frame, set in whatever monospace the host had would have
 * fixed it in the easy place only.
 *
 * The system stacks stay on the tail of both, unreached in a bootstrapped checkout and there for
 * dragon:4's fourth constraint: a missing face must render a different frame, never a blank one.
 *
 * ## The widths, and the thing they turned out not to be
 *
 * Measured, over 1353 samples drawn from the 28 decks in `examples/`, in Remotion's own Chrome,
 * against the exact WOFF2 `fonts.lock.json` pins — `../../scripts/calibrate-widths.ts`, which
 * re-derives every number below and is the reason none of them is a hand-tuned mystery.
 *
 * The round opened expecting all five to be *wider*. The reasoning was straightforward and wrong:
 * a face that draws `I` unmistakably apart from `l` must be spending width to do it. Four of the
 * five came back **narrower**:
 *
 *     heading   0.490 -> 0.480      body   0.520 -> 0.510
 *     plate     0.550 -> 0.530      event  0.530 -> 0.520
 *     mono      0.602 -> 0.633
 *
 * Atkinson Hyperlegible Next buys its differentiation from *shape* — a tailed `l`, a slashed zero,
 * an angled `1`, terminals cut at distinct angles — rather than from advance, and at these weights
 * and this tracking it sets a hair tighter than Helvetica Neue. The **monospace** is the one that
 * pays, by five percent, which is exactly where it should: a monospace face has one advance for
 * every glyph, so every distinction it wants has to fit in a cell that the widest letter sets.
 *
 * Copying the defaults across would therefore not have been merely imprecise. On `mono` it would
 * have been *optimistic* by five percent — a specimen sized to a line count that does not fit,
 * running off the right edge of the frame, in the profile a reader asked for because they were
 * struggling. That is the whole argument for measuring.
 *
 * Each value sits at the same **quantile of its own distribution** as the shipped default sits in
 * the default face's: 84% for a heading, 99% for body text, 93% for plates and events. So the
 * profile is neither more nor less cautious than cuecraft already is — the posture is inherited
 * rather than chosen, which is what makes it re-derivable rather than a matter of taste. The
 * monospace one is the exact measured advance rounded up, because a point mass has no quantiles.
 */
export const HYPERLEGIBLE_TYPOGRAPHY: Typography = {
  id: "hyperlegible",
  prose: '"Atkinson Hyperlegible Next", "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"Atkinson Hyperlegible Mono", Menlo, "SF Mono", "DejaVu Sans Mono", "Liberation Mono", Consolas, monospace',
  width: {
    heading: 0.48,
    body: 0.51,
    mono: 0.633,
    plate: 0.53,
    event: 0.52,
  },
  faces: [
    { family: "Atkinson Hyperlegible Next", weights: [400, 500, 600, 700] },
    { family: "Atkinson Hyperlegible Mono", weights: [400, 500, 600, 700] },
  ],
};

const PROFILES: Readonly<Record<TypographyId, Typography>> = {
  default: DEFAULT_TYPOGRAPHY,
  hyperlegible: HYPERLEGIBLE_TYPOGRAPHY,
};

/**
 * The profile an identity names.
 *
 * Total over `TypographyId`, so there is no "unknown profile" path and no place for a render to
 * silently fall back to the default because a string did not match. A `Timeline` that carries an
 * identity this does not know is a compiler bug, and `isTypographyId` is where that is caught.
 */
export function typographyOf(id: TypographyId): Typography {
  return PROFILES[id];
}

/**
 * Which profile an accessibility constraint selects.
 *
 * The one place the public boolean becomes an internal name, and it is deliberately a function of
 * *the whole constraint object* rather than of the boolean, so that a second constraint added later
 * resolves here rather than growing a second selection site.
 */
export interface AccessibilityIntent {
  readonly dyslexia: boolean;
}

export const NO_ACCESSIBILITY: AccessibilityIntent = { dyslexia: false };

export function typographyFor(intent: AccessibilityIntent): TypographyId {
  return intent.dyslexia ? "hyperlegible" : "default";
}

/**
 * The CSS `font` shorthands a profile's faces have to be requested by, in a stable order.
 *
 * The input to the loading gate (`./fonts.tsx`), and here rather than there so it can be tested
 * without a browser — `fonts.tsx` imports eight stylesheets and Node's test runner cannot load
 * either those or TSX.
 *
 * Only the weights the deck actually sets. Asking for a weight no composition uses would block the
 * render on a file nothing is going to draw with, and asking for a family a system-stack profile
 * merely *names* would block it on a file that does not exist. The size in a shorthand does not
 * affect which file loads and is required by the grammar; 16 is the conventional filler.
 */
export function faceDescriptors(type: Typography): readonly string[] {
  return type.faces.flatMap((face) =>
    face.weights.map((weight) => `${weight} 16px "${face.family}"`),
  );
}
