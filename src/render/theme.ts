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
  /** Deck background. Everything fades to and from this. */
  ink: "#0B0E14",
  /** Titles. */
  paper: "#F3F6FB",
  /** Bullets: below title contrast, still comfortably above WCAG AA on ink. */
  muted: "#B7C1D1",
  /** Footer furniture. Present, never competing. */
  faint: "#5B6578",
  /** Used three times per frame and nowhere else. */
  accent: "#D9A05B",
  /** Inactive progress segments. */
  inactive: "rgba(255, 255, 255, 0.13)",
} as const;

export const LAYOUT = {
  paddingX: 150,
  paddingY: 96,
  contentMaxWidth: 1380,
  ruleWidth: 64,
  ruleHeight: 5,
  ruleGap: 44,
  titleSize: 88,
  titleGap: 62,
  bulletSize: 40,
  bulletGap: 30,
  dashWidth: 22,
  dashHeight: 3,
  dashGap: 26,
  footerSize: 19,
  segmentWidth: 34,
  segmentHeight: 4,
  segmentGap: 10,
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
  titleRise: 14,
  ruleDraw: 16,
  bulletRise: 12,
  bulletDelay: 10,
  bulletStagger: 5,
} as const;
