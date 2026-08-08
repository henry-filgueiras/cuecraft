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
  minSize: 34,
  maxSize: 88,
  /** Space between stacked lines, as a fraction of the size. Displayed maths wants air. */
  leading: 0.75,
  /**
   * How tall a set line actually is, as a multiple of its size.
   *
   * More than one, and that is the whole reason this constant exists. A displayed equation is
   * not a line of text: superscripts sit above its cap height and subscripts below its baseline,
   * so KaTeX's box for `ROTR^{22}(a)` is half again as tall as the type it is set in. Sizing a
   * six-line formula by its longest line alone put four of them off the bottom of the frame.
   */
  line: 1.42,
  /** The vertical room a formula gets, under the heading. */
  height: 555,
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
 * How an ordered exchange is set, in world units.
 *
 * The second coordinate system's second inhabitant, and the axes mean something this time. In a
 * world both axes are "wherever dagre put it"; here **x is who and y is when**, and every constant
 * below defends one of those two readings.
 *
 * The pitch is *uniform* — every lane the same distance from its neighbour, whatever its name is
 * — because irregular spacing would make the gap between two lanes look like a fact about the
 * protocol. It is the widest plate plus a fixed gap, so the widest name sets the rhythm and nobody
 * else's does.
 *
 * A row's height is not uniform, and that asymmetry is the whole of the long-label policy. A label
 * is wrapped to a measure derived from the arrow it belongs to; the arrow is as long as the
 * distance between two lanes, which is a fact about the protocol; so a message between neighbours
 * gets a narrow measure and several lines, and one across the whole cast gets a wide measure and
 * one. The row then grows to hold whatever that came to. Nothing is ever cut, and no row ever
 * overlaps its neighbour, because the height is computed from the wrap rather than assumed.
 *
 * `message` is smaller than `actor` by about a fifth: a lane's name has to be readable in the
 * widest shot the camera ever takes, and a message label only has to be readable in the shot that
 * is *about* it. That is the hierarchy, expressed as the only two sizes this composition has.
 */
export const TRANSCRIPT = {
  /** A lane's name. Large, because the establishing shot has to work. */
  actor: 46,
  actorLineHeight: 1.18,
  actorMaxLines: 2,
  actorPadX: 40,
  actorPadY: 30,
  actorMinWidth: 300,
  /** Between one lane's plate and the next. Fixed, so the pitch is uniform. */
  laneGap: 160,

  /** A message label. */
  message: 36,
  messageLineHeight: 1.26,
  /** Room between the bottom of a label and the arrow it sits on. */
  messageGap: 20,
  /** Between one row's arrow and the top of the next row's label. */
  rowGap: 92,
  /**
   * Least a row may occupy.
   *
   * Measured against the lane pitch rather than chosen in isolation, and that ratio is the whole
   * number. A shot holds `minLanesInShot` of the cast, so a 16:9 frame at that width has room for
   * about five rows — and five is about how much of a trace a viewer can hold at once. At the
   * first value tried, 132, the same frame held nine, which made the early shots of every protocol
   * two thirds empty (nothing has happened yet) and the late ones a wall.
   */
  rowMin: 200,

  /** How far a label may hang past the arrow it belongs to, into the lane gap either side. */
  labelOverhang: 0.34,
  /** ...and the narrowest measure it will ever be wrapped to, whatever the arrow is doing. */
  labelMinMeasure: 250,

  /** A message an actor sends to itself: out to the right, down, and back. */
  selfWidth: 200,
  selfDrop: 84,

  /** Lifeline above the first row and below the last. */
  headroom: 96,
  tail: 120,

  plateRadius: 10,
  plateStroke: 2.5,
  lifeline: 2,
  arrow: 4.5,
  arrowHead: 26,
  /** The bar on a lifeline while that actor is holding a call it has not answered. */
  activation: 20,
  /**
   * Half-width of the cap that closes a lifeline where its column changes hands, and how far above
   * it the line stops being dashed.
   *
   * The one piece of notation this composition draws that is about the *picture* rather than about
   * the protocol: it says "this column stops being this party here", which is true of the layout
   * and makes no claim about the exchange. It carries most of the weight of the reuse policy, so it
   * is sized to be read at the scale a whole cast is framed at rather than at the scale a label is
   * — the first attempt was half this and read as a stray tick in the grid. The run-in is solid
   * where the lifeline is dashed, so the column visibly *closes* rather than merely stopping.
   *
   * It appears only where a slot is actually reclaimed — see `./tenancy.ts`.
   */
  terminator: 76,
  terminatorRun: 150,

  /** The blueprint field behind it, as the atlas has. */
  gridStep: 130,
  gridParallax: 0.55,

  /* ---- what the camera is told about the space, rather than about the graph ---- */

  /**
   * The least of the cast a shot may contain, in lane pitches.
   *
   * Framing exactly two lanes is the correct answer to "what is this message" and the wrong answer
   * to "where does this happen". A viewer who cannot see a neighbour has lost the one thing a
   * sequence diagram gives them for free, which is that the parties are laid out in a fixed order.
   * So a shot is widened to hold this much of the cast before the camera is consulted at all —
   * which keeps the policy in the layout, where it is about *this space*, rather than in
   * `./camera.ts`, where it would be about every space.
   */
  minLanesInShot: 3.4,
  /**
   * Breathing room around a shot, and the widest one the camera will take.
   *
   * `shotPad` is much smaller than the world's, because a protocol's shot is not a subject in a
   * field — it is a band, and the bounds handed to the camera already contain their own margins:
   * a minimum span of the cast either side, and a row of unhappened traffic below. Padding that
   * again pads it twice, and the first render of `examples/tap.yaml` spent about a quarter of
   * every frame on it.
   *
   * `widest` is derived from typography rather than picked. An actor's name is set at `actor`
   * world units; below about nineteen screen pixels a name stops being readable at 1080p; so the
   * widest legible shot is `1920 * actor / 19`, and that is the number. A cast wider than this
   * cannot be shown whole, and the rail is the answer to that rather than a smaller type size.
   */
  shotPad: 0.1,
  widest: 4650,
  /**
   * Rows of already-happened traffic a shot always keeps, and how far it will go beyond that when
   * the frame has room going spare. `lookaheadRows` is the space left *below* the active row, so
   * the moment sits above the middle of the picture rather than clinging to its lower edge.
   *
   * One is forced, and the rest is the room's to give. Forcing more turned out to fight the room
   * rather than add to it: on a short protocol three forced rows reach the cast, the subject
   * becomes taller than the width called for, and the shot silently widens to hold it — which
   * showed up as the framing changing during an exchange that had not moved anywhere.
   */
  historyRows: 1,
  maxHistoryRows: 9,
  lookaheadRows: 1,
  /**
   * How long the establishing shot is held before the camera may start moving.
   *
   * A protocol opens on its cast, and a cast a viewer never got to look at is a cast they will be
   * tracking blind for the rest of the film. Nine tenths of a second is the floor; a deck that
   * writes a prologue gets however long the prologue takes, which is the right way to ask for more.
   */
  establish: 27,
} as const;

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

/**
 * How the narration is set when it is put on screen (`./subtitle.ts`).
 *
 * Presentation type, not caption type. Every other size in this file was chosen for a viewer
 * across a room, and a subtitle set at the 34px a figure quotes a sentence at would be the one
 * thing on the frame nobody could read from the back — which is the opposite of what it is for.
 *
 * The measure is `HEADING_WIDTH`, deliberately: every heading in the deck is capped at it, so a
 * subtitle wraps on the same text edge as the title above it rather than on an edge of its own.
 * Left-aligned against the same margin for the same reason. cuecraft has no centred text anywhere
 * and a centred subtitle is the single strongest visual signal that captions were bolted on.
 *
 * `bottom` clears the progress rule; `gap` is the air between the composition and the band, and it
 * is the deck's largest ordinary gap because the two are unrelated things that happen to share a
 * frame.
 */
export const SUBTITLE = {
  /** Largest a subtitle is ever set at. */
  maxSize: 42,
  /** Below this it stops being presentation type. */
  minSize: 30,
  lineHeight: 1.34,
  /**
   * Lines a subtitle is set to before the type steps down instead.
   *
   * A preference, not a limit. A sentence that will not fit in two lines at `minSize` takes the
   * lines it needs, because unreadably small and cut off are two ways of doing the same forbidden
   * thing to an utterance (decision:28).
   */
  lines: 2,
  /** The speaker's name, in the deck's small-caps idiom. */
  label: 24,
  labelTracking: "0.18em",
  labelGap: 14,
  /** Above the progress rule. */
  bottom: 44,
  /** Between the composition and the band beneath it. */
  gap: SPACE.lg,
  /**
   * The difference between counting characters and breaking at spaces.
   *
   * Every fitting rule in this file estimates a line break by dividing a character count by an
   * average advance width, because composition has to resolve without a browser. That estimate is
   * good for a *measure* and optimistic for a *wrap*: a real line ends at the last space that
   * fits, so it gives back up to a word. A figure absorbs the difference by growing a row. A
   * subtitle cannot — the room it occupies was subtracted from the composition above it before
   * anything was drawn, so a third line where two were reserved would hang off the bottom of the
   * frame.
   *
   * So the fit is computed against a slightly narrower measure than the one the text is set to.
   * Six percent of `HEADING_WIDTH` at the largest size is about four characters, which is a long
   * word, and stepping down two pixels early is invisible where an overflowing line is not.
   */
  wrapSlack: 0.94,
} as const;

/**
 * A colour per narrator, in the order the film first hears them.
 *
 * Four, and every one of them is a colour this deck already owns: the accent that means "narration
 * has been here" everywhere else in cuecraft, then the three the figures use to separate what was
 * authored from what was derived from what was measured. Nothing new was mixed, and no hue rotation
 * or generated ramp stands behind this — narrators are a small closed set in a deck, not a
 * continuum, so a list is the honest shape.
 *
 * The first entry is the accent because the first voice is the deck's own voice. Past the fourth
 * the list repeats, which is a limit rather than a failure: colour here is a *second* carrier of
 * identity and never the only one, so a fifth narrator sharing the first one's hue still has their
 * name written above every line they speak.
 */
export const SPEAKER_COLORS: readonly string[] = [
  COLORS.accent,
  FIGURE.authored,
  FIGURE.time,
  "#C6CBEA",
];

/**
 * The largest size at which every subtitle in the deck fits its measure in `SUBTITLE.lines`.
 *
 * Fitted across every sentence the film will show rather than one at a time — `fitQuote`'s move,
 * for `fitQuote`'s reason, and it matters more here than it does there. Type that resized whenever
 * the narration moved on would put a change of size under every full stop, and a subtitle is
 * supposed to be the least eventful thing on the frame.
 */
export function fitSubtitle(
  displayed: readonly string[],
  width: number,
): { readonly size: number; readonly lines: number } {
  const longest = Math.max(1, ...displayed.map((text) => text.length));
  const measure = width * SUBTITLE.wrapSlack;
  for (let size = SUBTITLE.maxSize; size >= SUBTITLE.minSize; size -= 2) {
    if (quoteLines(longest, measure, size) <= SUBTITLE.lines) {
      return { size, lines: SUBTITLE.lines };
    }
  }
  return {
    size: SUBTITLE.minSize,
    lines: quoteLines(longest, measure, SUBTITLE.minSize),
  };
}

/**
 * The room a composition gives up so that a subtitle is never read over it.
 *
 * The alternative — lay the deck out exactly as before and put the words on top — is what a caption
 * track does to a video it was added to afterwards, and it is wrong here for a specific reason:
 * cuecraft's compositions do not leave space, they *fill* the box they are given. A specimen is
 * sized to its box, a formula to its height, a figure counts how many whole sentences fit under its
 * heading. Every one of them would run underneath a subtitle, and the subtitle would be sitting on
 * the part of the explanation the sentence was about.
 *
 * So the band is subtracted from the box before anything is laid out, and it is deck-wide and
 * derived: one number, from the fitted size and the lines the deck's longest sentence needs, so
 * that the composition above it never moves between slides.
 *
 * Zero when the deck asked for no subtitles, which is every deck written before they existed.
 */
export function subtitleBand(
  fitted: { size: number; lines: number; labelled: boolean } | undefined,
): number {
  if (fitted === undefined) return 0;
  return (
    SUBTITLE.bottom +
    Math.ceil(fitted.size * SUBTITLE.lineHeight * fitted.lines) +
    (fitted.labelled ? SUBTITLE.labelGap + Math.ceil(SUBTITLE.label * 1.1) : 0) +
    SUBTITLE.gap
  );
}

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
export function bodyBox(title: string, band = 0): { width: number; height: number } {
  const titleSize = fitHeading(title.length, TYPE.title);
  const titleHeight =
    headingLines(title.length, titleSize, HEADING_WIDTH) * titleSize * 1.06;
  return {
    width: 1920 - 2 * FRAME.marginX,
    // The 6 is the accent rule above the heading; SPACE.lg sits under it, SPACE.xl under
    // the title. `band` is the room a subtitle takes out of the bottom (`subtitleBand`), and it
    // is zero unless the deck asked for one — which is what makes every existing deck lay out
    // exactly as it did before.
    height: 1080 - 2 * FRAME.marginY - 6 - SPACE.lg - titleHeight - SPACE.xl - band,
  };
}

/** The same box, less the gutter a specimen keeps for its activation marks. */
export function codeBox(title: string, band = 0): { width: number; height: number } {
  const box = bodyBox(title, band);
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
