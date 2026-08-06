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

/** Every archetype's heading is capped at the same measure, so the deck shares a text edge. */
export const HEADING_WIDTH = 1500;

/**
 * What is left of the canvas once the heading has taken its share.
 *
 * The heading's *real* height — including the second line a long title takes — has to be part
 * of the arithmetic. It was not, once, and the close slide's last line sat on the bottom margin.
 *
 * Here rather than in the archetype that draws it, because it is the input to every sizing
 * decision a code block makes and those are now decided before anything is drawn: `fitSpecimen`
 * needs it, and so does the projection search that calls `fitSpecimen` (`./projection.ts`).
 */
export function codeBox(title: string): { width: number; height: number } {
  const titleSize = fitHeading(title.length, TYPE.title);
  const titleHeight =
    headingLines(title.length, titleSize, HEADING_WIDTH) * titleSize * 1.06;
  return {
    width: 1920 - 2 * FRAME.marginX - CODE.gutter,
    // The 6 is the accent rule above the heading; SPACE.lg sits under it, SPACE.xl under
    // the title.
    height: 1080 - 2 * FRAME.marginY - 6 - SPACE.lg - titleHeight - SPACE.xl,
  };
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

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}
