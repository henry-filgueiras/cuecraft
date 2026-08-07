/**
 * The one built-in look.
 *
 * decision:2 allows exactly one, and this is it: constants, not a theming system. The
 * source expresses intent — a title and some bullets — and this file decides how that
 * intent looks (decision:5). Nothing here is reachable from the YAML, deliberately.
 *
 * Fonts are a system stack rather than a downloaded family. Remotion renders in a headless
 * Chromium that resolves fonts against the host machine, so a bundled or fetched webfont
 * is the reproducible answer and a system stack is the *offline* one; this round chose
 * offline. On macOS this resolves to Helvetica Neue. See dragon:4.
 */

export const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * Code is set in a monospace stack for the reason code is always set in one: the alignment is
 * the content. Menlo is macOS's, and the fallbacks cover the platforms Remotion runs on.
 */
export const MONO_STACK =
  'Menlo, "SF Mono", "DejaVu Sans Mono", "Liberation Mono", Consolas, monospace';

export const COLORS = {
  /** Deck background. Everything fades to and from this. Flat — see Frame. */
  ink: "#0A0D12",
  /** Titles and statements. */
  paper: "#F5F7FB",
  /** Bullets, terms and rows: below title contrast, well above WCAG AA on ink. */
  muted: "#C2CBD9",
  /** Ordinals and secondary marks. Present, never competing. */
  dim: "#6B7688",
  /** An anchored element the narration has not reached yet: legible, recessive. */
  dormant: "#78849B",
  /** Used sparingly: the rule, the ordinals, the cell edges, the progress bar. */
  accent: "#D9A05B",
  /** The accent at full heat: the transient overshoot, never a resting colour. */
  flare: "#FFE3B8",
  /** Structural lines. Visible at 1080p, invisible as decoration. */
  hairline: "rgba(255, 255, 255, 0.11)",
  /** The unfilled part of the progress rule. */
  track: "rgba(255, 255, 255, 0.07)",
} as const;

/**
 * How a code specimen is coloured.
 *
 * Two hues and the accent. A vendor highlighting theme puts six on a frame in a deck that has
 * one accent and four greys, and the result looks like a screenshot pasted into a presentation
 * — which is precisely the impression a specimen must not give. But the first cut of this went
 * the whole way to monochrome, and monochrome had a specific defect: the brightest thing in a
 * cuecraft specimen was the *keys*, and the dimmest was the strings, which are the author's own
 * prose and the only part of the frame a viewer is actually being asked to read.
 *
 * So brightness now follows what matters and hue carries the structure instead. Keys are cool
 * and mid-bright — identifiable at a glance without competing; prose is near-paper; durations
 * and literals keep the deck's accent; dashes and punctuation stay out of the way. Three
 * classifications a viewer can name, not a theme.
 *
 * Keyed by highlight.js token class. The library tokenizes; the palette is ours (decision:16).
 */
export const CODE_COLORS: Record<string, CodeTokenStyle> = {
  /** Mapping keys: the structure of the specimen, and the brightest thing in it. */
  "hljs-attr": { color: "#9FD8E8", fontWeight: 600 },
  /** Values, which on a cuecraft specimen are mostly the author's own prose. */
  "hljs-string": { color: "#EDF1F8" },
  /** List dashes. Present, never read. */
  "hljs-bullet": { color: "#6B7688" },
  "hljs-punctuation": { color: "#6B7688" },
  "hljs-number": { color: "#D9A05B" },
  "hljs-literal": { color: "#D9A05B" },
  "hljs-comment": { color: "#6B7688" },
};

export interface CodeTokenStyle {
  readonly color: string;
  readonly fontWeight?: number;
}

/**
 * A modular type scale, in pixels at 1920x1080.
 *
 * The First Light deck set titles at 88px and bullets at 40px, which is laptop-reading size:
 * on a projector across a room the bullets disappeared and two thirds of the canvas went
 * unused. Everything here is substantially larger, and the archetypes are built so that the
 * largest element on a slide is genuinely large.
 *
 * Not exposed to authors. Typography is a decision cuecraft makes, not a knob it offers.
 */
export const TYPE = {
  /** A slide that is one sentence. */
  display: 150,
  /** A heading above a composition. */
  title: 104,
  /** A heading holding its own column. */
  lead: 88,
  /** A short parallel label in the matrix field. */
  term: 66,
  /** A stage in the cascade. */
  stage: 76,
  /** A numbered row. */
  row: 54,
  /** An item in a stacked list. */
  item: 54,
  /** Ordinals: 01, 02, 03. */
  ordinal: 34,
} as const;

/** An 8px rhythm. Every gap in the archetypes is one of these. */
export const SPACE = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 40,
  xl: 64,
  xxl: 96,
  huge: 132,
} as const;

export const FRAME = {
  /** Side margin. Generous, and the same on every archetype so the deck shares an edge. */
  marginX: 132,
  marginY: 108,
  /** Full-bleed rule along the bottom edge showing progress through the deck. */
  progressHeight: 5,
} as const;

/**
 * Frames. Every one of these is capped at run time by the padding it has to fit inside, so
 * motion can never run over narration.
 *
 * The transition dips through the deck background rather than cross-dissolving. A true
 * crossfade was tried first and looks like a printing error: both slides put their title
 * in the same place, so mid-transition the frame holds two legible overlapping headlines.
 * Fading out, holding on the background for a beat, and fading in reads as a deliberate
 * page turn and costs a fifth of a second.
 */
export const MOTION = {
  /** Slide one arriving out of the deck background. */
  opener: 20,
  /** A later slide leaving, inside its own post-say padding. */
  fadeOut: 9,
  /** Background-only beat between two slides. */
  hold: 6,
  /** A later slide arriving, inside its own pre-say padding. */
  fadeIn: 12,
  /** The deck settling back to background at the end. */
  closer: 18,
  /** How long any one element takes to arrive. */
  rise: 13,
  /** How far it travels while arriving. */
  riseDistance: 22,
  /** The accent rule drawing itself. */
  ruleDraw: 16,
  /** Delay before the first content element follows the title. */
  contentDelay: 9,
  /** Separation between successive content elements. */
  stagger: 5,
} as const;

/** How a code specimen is set. Line height is generous: this is read from across a room. */
export const CODE = {
  /** Largest size a specimen is ever set at. */
  maxSize: 44,
  /** Below this it stops being presentation type, so the deck should not need it. */
  minSize: 26,
  lineHeight: 1.52,
  /** Advance width of one monospace character, as a fraction of the font size. */
  charWidth: 0.602,
  /** Space to the left of the block, holding the activation mark. */
  gutter: 34,
} as const;

/**
 * Step a heading down as it gets longer, so a long title wraps to two readable lines
 * instead of three cramped ones or one that overflows.
 *
 * Deterministic and derived from the content, like layout selection itself — authors do not
 * set sizes (decision:10).
 */
export function fitHeading(length: number, base: number): number {
  if (length > 58) return Math.round(base * 0.7);
  if (length > 38) return Math.round(base * 0.84);
  return base;
}

/**
 * Average advance width of the heading face, as a fraction of the font size.
 *
 * Helvetica Neue Bold at display sizes, measured across the deck's own titles. Close enough to
 * predict a line break, which is all it is for.
 */
const HEADING_CHAR_WIDTH = 0.5;

/**
 * How many lines a heading of this length wraps to.
 *
 * Only the specimen needs this, and it needs it badly: the block is sized to the space left
 * under the title, so a title that silently wraps to a second line pushes the code off the
 * bottom of the frame. Estimating rather than measuring keeps composition resolvable without a
 * browser, which is the same constraint every other sizing rule here works under.
 */
export function headingLines(length: number, size: number, width: number): number {
  const perLine = Math.max(1, Math.floor(width / (size * HEADING_CHAR_WIDTH)));
  return Math.max(1, Math.ceil(length / perLine));
}

/**
 * A matrix term, sized to how many of them share the canvas.
 *
 * Four terms in a 1920x1080 frame are each given a quarter of it, and 66px type floats in that
 * much space. Six are not. Derived from the count for the same reason everything else here is
 * derived from the content.
 */
export function fitTerm(count: number): number {
  return count <= 4 ? Math.round(TYPE.term * 1.28) : TYPE.term;
}

/**
 * The largest size at which a specimen fits both its box and its longest line.
 *
 * Monospace makes this arithmetic rather than measurement: every glyph is the same width, so
 * the widest line's length is the whole constraint. Derived from the content for the same
 * reason `fitHeading` is — an author who had to pick a font size for their code would be
 * authoring a projection.
 */
export function fitSpecimen(
  lineCount: number,
  longestLine: number,
  box: { width: number; height: number },
): number {
  const byWidth = box.width / Math.max(1, longestLine * CODE.charWidth);
  const byHeight = box.height / Math.max(1, lineCount * CODE.lineHeight);
  return Math.max(
    CODE.minSize,
    Math.min(CODE.maxSize, Math.floor(Math.min(byWidth, byHeight))),
  );
}

/**
 * How a bounded population is drawn.
 *
 * A height rather than a box, because the *arrangement* comes from the count and only the size
 * comes from the frame — so what is actually a design decision is how much vertical room a
 * population gets, and the width is whatever that arrangement then needs.
 *
 * A near-square field in a 16:9 frame can never fill the width, and the first cut left a third of
 * the frame occupied and the rest empty. The answer is not to stretch the field — a strip cannot
 * be counted — but to give the space to the two things that belong beside it: the running number,
 * which is the fact the whole composition exists to make checkable, and the legend that says what
 * the members are.
 *
 * `stroke` is the deck's hairline weight. A member that has not happened yet is an outline, so the
 * *size* of the population is legible from the first frame and only its state changes — which is
 * what makes accumulation readable as accumulation rather than as things appearing.
 */
export const FIELD = {
  /** The field takes the height under the heading; its width follows from the arrangement. */
  height: 590,
  /** ...but never more than this, so the count and the legend keep a column of their own. */
  maxWidth: 980,
  stroke: 1.5,
} as const;

/**
 * How mathematics is set.
 *
 * Three numbers, and the range between the two sizes is narrow on purpose: this body exists for
 * one-line definitions, and a range wide enough to hold a page of derivation would be a range
 * wide enough to set one of them illegibly. `minSize` is where a formula stops being readable
 * across a room; `maxSize` is where a short definition stops looking set and starts looking
 * shouted.
 */
export const FORMULA = {
  minSize: 46,
  maxSize: 88,
  /** Space between stacked lines, as a fraction of the size. Displayed maths wants air. */
  leading: 0.75,
} as const;

/**
 * How a semantic world is set, in world units.
 *
 * A second coordinate system, and the only one in cuecraft: everything here is measured in the
 * world's own space, and what a viewer sees is that space through a derived camera
 * (`./world.ts`). A plate 340 units wide is about 750 screen pixels when the camera is close and
 * about 150 when it pulls back to the whole machine, which is the point of having a camera.
 */
export const WORLD = {
  /** Label size. Large in world units because a plate is read from across the room, close up. */
  label: 52,
  lineHeight: 1.2,
  /** Advance width of the heading face at plate weight, as a fraction of the size. */
  charWidth: 0.55,
  /**
   * How many lines a label may be broken into, and what shape the result should aim for.
   *
   * A plate is chosen, not filled: `wrapLabel` balances the label into one, two or three lines
   * and keeps whichever produces a plate nearest `plateAspect`, with a small penalty per extra
   * line so a two-line break has to actually earn itself. 2.3:1 is where a two-line plate stops
   * looking like a column and starts looking like a card.
   */
  maxLines: 3,
  plateAspect: 2.3,
  linePenalty: 0.35,
  /** Room around the text. Generous: v1's plates were the right size and the wrong shape. */
  padX: 46,
  padY: 44,
  minPlateWidth: 340,
  /**
   * Space between ranks, and between plates within a rank.
   *
   * Not symmetric, and the asymmetry is the whole tuning. A layered layout of a transformation is
   * naturally long and flat; separating the *lanes* more than the *stages* pushes it back towards
   * a shape a 16:9 frame can hold, and it separates the narration lane from the content lane,
   * which is a thing the world is actually claiming.
   */
  ranksep: 90,
  nodesep: 520,
  edgesep: 30,
  plateRadius: 10,
  /** Stroke of a plate's edge, and of a relation. */
  plateStroke: 2.5,
  edgeStroke: 4,
  /** The travelling accent that runs along a relation as it establishes. */
  pulseLength: 190,
  /** The blueprint field behind the world, and the fainter one behind that. */
  gridStep: 130,
  gridParallax: 0.55,
} as const;

/**
 * A world's colour, read off the flow.
 *
 * Three stops, and the two ends are colours the deck already owns: the cool of a specimen's keys
 * at the source end, the deck accent at the output end, through a warm near-white in between.
 * So the ramp is not a new palette, it is the palette arranged along the machine — cool where
 * cuecraft is reading, warm where it is producing.
 *
 * Nothing authored reaches this. An entity's position in the ramp is its position in the graph.
 */
const FLOW = ["#63C6EA", "#C6CBEA", "#F0A94F"] as const;

export function flowColor(depth: number): string {
  const t = depth < 0 ? 0 : depth > 1 ? 1 : depth;
  const [cool, middle, warm] = FLOW;
  return t < 0.5 ? mix(cool, middle, t * 2) : mix(middle, warm, (t - 0.5) * 2);
}

/**
 * How the compilation's own facts are set.
 *
 * Two colours carry the whole argument and neither is decorative: **authored** is the cool of a
 * specimen's keys, used for everything a person typed, and **derived** is the deck accent, used
 * for everything the compiler worked out. Put a sentence in one and its resolved time in the
 * other, side by side, and the thesis needs no caption.
 *
 * Time gets a third identity — a mint that appears nowhere else — because measured duration is
 * neither of those two things. It is not an intention and it is not a consequence; it is a
 * physical fact about a sound file, and it earns its own colour by being the only one.
 *
 * Numbers are set large and in the mono face. These are the only graphics in cuecraft where a
 * number is the subject rather than an annotation, and a measured value set at caption size reads
 * as debugging output no matter how true it is.
 */
export const FIGURE = {
  /** What a person typed. */
  authored: "#8FD4EA",
  /** What the compiler worked out. */
  derived: "#E9A85E",
  /** Measured time, which is neither. */
  time: "#5FD9BC",
  timeLit: "#8BF0D8",

  /** The temporal rail, its anchor ticks, and the scale under it. */
  rail: 16,
  tick: 22,
  railBlock: 118,
  scale: 24,

  /** A measured duration, at the size a headline is set. */
  measure: 116,
  /** A resolved time in a row of them. */
  resolved: 56,
  /** An identity somebody typed twice. */
  identity: 38,
  /** A sentence, quoted back — and the smallest it may be set at before it stops being read. */
  quote: 34,
  quoteMin: 24,
  /**
   * Lines a quoted sentence is set to before the type steps down instead.
   *
   * Two, because a caption-like line of narration wants to be read in one movement of the eye and
   * three lines of 34px prose in a figure is a paragraph. It is a *preference*, not a limit: if a
   * sentence will not fit in two lines even at `quoteMin`, it takes the lines it needs. Nothing
   * here may drop a word (decision:28).
   */
  quoteLines: 2,
  /** The small caps that name a column. */
  label: 22,

  /** The most resolved relationships worth showing at once, if that many will fit whole. */
  rows: 5,
  /** ...and the fewest worth calling a neighbourhood. */
  minRows: 3,
} as const;

/**
 * Average advance width of the body face, as a fraction of the font size.
 *
 * Same estimate as `HEADING_CHAR_WIDTH` and for the same reason — composition has to resolve
 * without a browser — but measured at text sizes rather than display sizes, where the mix of
 * characters in ordinary prose runs slightly wider relative to the em.
 */
export const BODY_CHAR_WIDTH = 0.52;

/** Leading a quoted sentence is set on, and the height a block of `lines` of it occupies. */
export const QUOTE_LEADING = 1.26;

export function quoteHeight(size: number, lines: number): number {
  return Math.ceil(size * QUOTE_LEADING * lines);
}

export function quoteLines(length: number, width: number, size: number): number {
  const perLine = Math.max(1, Math.floor(width / (size * BODY_CHAR_WIDTH)));
  return Math.max(1, Math.ceil(length / perLine));
}

/**
 * How a quoted sentence is set, so that all of it is on the frame.
 *
 * The two figures are the only place in cuecraft where narration appears *as text while it is
 * being spoken*, which makes it behave like a caption whether or not it was meant to: a viewer
 * who starts reading along expects to finish the sentence. The first cut cut it off with an
 * ellipsis at a fixed character count, and the ellipsis was permanent — the words behind it were
 * not reachable later, at any point, in any state. That is the one thing a caption may not do
 * (decision:28).
 *
 * So the sentence is never shortened. It wraps to `FIGURE.quoteLines`, and when it will not fit
 * in that many lines the *type* steps down rather than the words dropping off — the same move
 * `fitHeading` makes for a long title, for the same reason. Below `FIGURE.quoteMin` it stops
 * stepping down and takes the lines it needs instead, because unreadably small is another way of
 * discarding an utterance.
 *
 * Fitted across every sentence that will appear rather than one at a time, so the size is a
 * property of the figure and not of whichever cue happens to be lit. Type that changed size every
 * time the narration moved on would be the most distracting thing on the frame.
 *
 * Honest elision remains available for *evidence*: a quoted region of a source file is a
 * different kind of text, and idea:14 parks marking an omission in one. It is not available for
 * an utterance.
 */
export function fitQuote(
  displayed: readonly string[],
  width: number,
): { readonly size: number; readonly lines: number } {
  const longest = Math.max(1, ...displayed.map((text) => text.length));
  for (let size = FIGURE.quote; size >= FIGURE.quoteMin; size -= 2) {
    if (quoteLines(longest, width, size) <= FIGURE.quoteLines) {
      return { size, lines: FIGURE.quoteLines };
    }
  }
  return { size: FIGURE.quoteMin, lines: quoteLines(longest, width, FIGURE.quoteMin) };
}

/** Every archetype's heading is capped at the same measure, so the deck shares a text edge. */
export const HEADING_WIDTH = 1500;

/**
 * What is left of the canvas once the heading has taken its share.
 *
 * The heading's *real* height — including the second line a long title takes — has to be part
 * of the arithmetic. It was not, once, and the close slide's last line sat on the bottom margin.
 *
 * Here rather than in the archetype that draws it, because it is the input to every sizing
 * decision made before anything is drawn: `fitSpecimen` needs it, so does the projection search
 * that calls `fitSpecimen` (`./projection.ts`), and so does a figure deciding how many rows of
 * complete sentences it has room for (`./figures.tsx`).
 */
export function bodyBox(title: string): { width: number; height: number } {
  const titleSize = fitHeading(title.length, TYPE.title);
  const titleHeight =
    headingLines(title.length, titleSize, HEADING_WIDTH) * titleSize * 1.06;
  return {
    width: 1920 - 2 * FRAME.marginX,
    // The 6 is the accent rule above the heading; SPACE.lg sits under it, SPACE.xl under
    // the title.
    height: 1080 - 2 * FRAME.marginY - 6 - SPACE.lg - titleHeight - SPACE.xl,
  };
}

/** The same box, less the gutter a specimen keeps for its activation marks. */
export function codeBox(title: string): { width: number; height: number } {
  const box = bodyBox(title);
  return { width: box.width - CODE.gutter, height: box.height };
}

/**
 * Blend two `#rrggbb` colours.
 *
 * Six lines rather than a colour library, and it stays six lines: the archetypes need to move
 * a value between two palette entries as an anchor establishes, and nothing here needs a colour
 * space, an alpha channel, or a named-colour table.
 */
export function mix(from: string, to: string, amount: number): string {
  const t = amount < 0 ? 0 : amount > 1 ? 1 : amount;
  const a = channels(from);
  const b = channels(to);
  const blended = a.map((value, index) =>
    Math.round(value + ((b[index] ?? 0) - value) * t),
  );
  return `#${blended.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A `#rrggbb` colour at an alpha.
 *
 * The atlas needs glows and washes that sit *over* things rather than replacing them, which is
 * the one thing `mix` cannot express. Four lines, and it stays four lines.
 */
export function withAlpha(hex: string, alpha: number): string {
  const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`;
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}
