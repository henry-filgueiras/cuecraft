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

export const COLORS = {
  /** Deck background. Everything fades to and from this. Flat — see Frame. */
  ink: "#0A0D12",
  /** Titles and statements. */
  paper: "#F5F7FB",
  /** Bullets, terms and rows: below title contrast, well above WCAG AA on ink. */
  muted: "#C2CBD9",
  /** Ordinals and secondary marks. Present, never competing. */
  dim: "#6B7688",
  /** Used sparingly: the rule, the ordinals, the cell edges, the progress bar. */
  accent: "#D9A05B",
  /** Structural lines. Visible at 1080p, invisible as decoration. */
  hairline: "rgba(255, 255, 255, 0.11)",
  /** The unfilled part of the progress rule. */
  track: "rgba(255, 255, 255, 0.07)",
} as const;

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
  /** A numbered row. */
  row: 54,
  /** An item in a stacked list. */
  item: 46,
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
