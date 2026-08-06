import hljs from "highlight.js/lib/core";
import yaml from "highlight.js/lib/languages/yaml";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

import { deriveChange } from "../presentation/change.ts";
import type { AuthoredItem, SlideBody } from "../presentation/body.ts";
import { resolveMarkSpans, specimenLines } from "../presentation/specimen.ts";
import type { Scene } from "../compile/timeline.ts";
import { anchorState, type AnchorState } from "./anchor.ts";
import {
  CODE,
  CODE_COLORS,
  COLORS,
  FONT_STACK,
  FRAME,
  MONO_STACK,
  MOTION,
  SPACE,
  TYPE,
  fitHeading,
  fitSpecimen,
  fitTerm,
  headingLines,
  mix,
} from "./theme.ts";

/**
 * The six curated compositions.
 *
 * `layout.ts` decides which one a slide gets from what its content means and what shape it has;
 * these render it. They share a frame, a type scale, one motion primitive and one activation
 * vocabulary, and nothing else — each is allowed to be an opinionated arrangement rather than a
 * parameterisation of a single template, which is the whole point of having six.
 *
 * What they deliberately do not have: cards, borders around content, drop shadows, gradients,
 * or icons. Structure is carried by scale, position, and hairlines.
 */

hljs.registerLanguage("yaml", yaml);

const ease = Easing.out(Easing.cubic);

/** One element arriving. Motion establishes hierarchy; it is not the hierarchy. */
function reveal(
  frame: number,
  delay: number,
  distance: number = MOTION.riseDistance,
): CSSProperties {
  const progress = interpolate(frame, [delay, delay + MOTION.rise], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return { opacity: progress, transform: `translateY(${(1 - progress) * distance}px)` };
}

/** Content elements follow the title, separated enough to read as a sequence. */
function contentDelay(index: number): number {
  return MOTION.contentDelay + index * MOTION.stagger;
}

/**
 * Every anchored element's state on this frame, by its index in the body.
 *
 * The frames are absolute because they come from measured audio on the deck's clock
 * (decision:13); re-deriving them against a shifting sequence origin is how synchronization
 * quietly goes wrong. An element the narration never reaches gets `ESTABLISHED`, which is every
 * element on every slide that names no identities — so nothing changes for them.
 */
function anchorStatesFor(
  scene: Scene,
  absoluteFrame: number,
): (index: number) => AnchorState {
  const frames = new Map(
    scene.anchors.map((anchor) => [anchor.elementIndex, anchor.frame]),
  );
  return (index: number) => anchorState(absoluteFrame, frames.get(index));
}

/** Text moving from recessive to established, shared by every archetype that has any. */
function establishedText(state: AnchorState, base: string): CSSProperties {
  return {
    color: mix(COLORS.dormant, base, state.degree),
    opacity: 0.6 + 0.4 * state.degree,
    transform: `translateY(${(1 - state.degree) * 4}px)`,
  };
}

const items = (body: SlideBody): readonly AuthoredItem[] =>
  body.kind === "bullets" || body.kind === "steps" ? body.items : [];

/**
 * The shared canvas: flat background, side margins, and a progress rule on the bottom edge.
 *
 * The background is flat on purpose. A soft radial highlight was tried and looked fine in
 * the browser; encoded to H.264 it banded into visible concentric arcs, because eight-bit
 * near-black has almost no room for a gradient.
 *
 * The progress rule replaces the footer chrome the first version carried. A deck title set
 * at 19px is unreadable from a room and does nothing for the person watching; a full-bleed
 * line that steps forward once per slide says the same thing structurally.
 */
function Frame({
  scene,
  slideCount,
  children,
}: {
  scene: Scene;
  slideCount: number;
  children: ReactNode;
}) {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, fontFamily: FONT_STACK }}>
      <AbsoluteFill
        style={{
          padding: `${FRAME.marginY}px ${FRAME.marginX}px`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: FRAME.progressHeight,
          backgroundColor: COLORS.track,
        }}
      >
        <div
          style={{
            width: `${(scene.ordinal / slideCount) * 100}%`,
            height: "100%",
            backgroundColor: COLORS.accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

/** The accent mark that opens every slide. The only decoration in the design language. */
function Rule({ frame, width = 88 }: { frame: number; width?: number }) {
  const drawn = interpolate(frame, [0, MOTION.ruleDraw], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return (
    <div
      style={{
        width,
        height: 6,
        flex: "none",
        backgroundColor: COLORS.accent,
        transform: `scaleX(${drawn})`,
        transformOrigin: "left center",
      }}
    />
  );
}

/** Every archetype's heading is capped at the same measure, so the deck shares a text edge. */
const HEADING_WIDTH = 1500;

const heading: CSSProperties = {
  margin: 0,
  fontWeight: 700,
  letterSpacing: "-0.024em",
  color: COLORS.paper,
};

/** Title, rule and spacing, identical across the four archetypes that stack under a heading. */
function Heading({ scene, frame }: { scene: Scene; frame: number }) {
  return (
    <>
      <Rule frame={frame} />
      <h1
        style={{
          ...heading,
          marginTop: SPACE.lg,
          fontSize: fitHeading(scene.title.length, TYPE.title),
          lineHeight: 1.06,
          maxWidth: HEADING_WIDTH,
          ...reveal(frame, 0),
        }}
      >
        {scene.title}
      </h1>
    </>
  );
}

/**
 * **statement** — the slide is one sentence, so the sentence is the slide.
 *
 * Nothing else on the canvas. Type at display scale, left-aligned against the margin, set
 * to wrap to two or three lines so the block has weight rather than floating as one thin
 * line across an empty frame.
 */
function Statement({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: SPACE.xl,
      }}
    >
      <Rule frame={frame} width={110} />
      <h1
        style={{
          ...heading,
          fontSize: fitHeading(scene.title.length, TYPE.display),
          lineHeight: 1.04,
          maxWidth: HEADING_WIDTH,
          ...reveal(frame, 0, 28),
        }}
      >
        {scene.title}
      </h1>
    </div>
  );
}

/**
 * **matrix** — a handful of short parallel labels.
 *
 * Four two-word phrases are not a list; presenting them as one stacked column with dashes
 * wastes both the parallelism and the canvas. They become a field of terms at large scale,
 * each sitting under its own hairline, arranged two or three to a row.
 *
 * The hairline is where activation happens here: it grows and flares when narration reaches
 * its term, then settles back to the weight every unanchored matrix cell carries. decision:14
 * left this archetype without a treatment and called the gap honest; the self-demo needed it.
 */
function Matrix({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  const cells = items(scene.body);
  const stateOf = anchorStatesFor(scene, absoluteFrame);
  const columns = cells.length > 4 ? 3 : 2;

  return (
    <>
      <Heading scene={scene} frame={frame} />
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          columnGap: SPACE.xxl,
          rowGap: SPACE.lg,
          // Rows stretch to fill the space under the heading rather than clustering at the
          // top (which floats) or the bottom (which leaves a hole in the middle). The
          // hairlines then divide the lower canvas at even intervals, which is what makes
          // this read as a field of terms instead of a list that lost its bullets.
          gridAutoRows: "1fr",
          alignContent: "stretch",
          marginTop: SPACE.xl,
        }}
      >
        {cells.map((cell, index) => {
          const state = stateOf(index);
          return (
            <div
              key={cell.text}
              style={{
                display: "flex",
                flexDirection: "column",
                ...reveal(frame, contentDelay(index)),
              }}
            >
              <div
                style={{
                  flex: "none",
                  height: 3,
                  backgroundColor: mix(COLORS.accent, COLORS.flare, state.heat),
                  opacity: 0.22 + 0.53 * state.degree + 0.25 * state.heat,
                  // Thickening rather than lengthening: the cell's width is its share of the
                  // grid and must not appear to change, but a rule that briefly doubles in
                  // weight under a term is impossible to miss and gone in half a second.
                  transform: `scaleY(${1 + 1.4 * state.heat})`,
                  transformOrigin: "bottom left",
                }}
              />
              {/* The term sits in the middle of its band rather than at the top of it. Pinned
                  to the hairline, a two-word label leaves the lower two thirds of a quarter
                  frame empty, and four of those read as a slide that failed to load. */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  paddingTop: SPACE.md,
                  paddingBottom: SPACE.md,
                }}
              >
                <div
                  style={{
                    fontSize: fitTerm(cells.length),
                    fontWeight: 500,
                    letterSpacing: "-0.016em",
                    lineHeight: 1.14,
                    ...establishedText(state, COLORS.paper),
                  }}
                >
                  {cell.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * **index** — compact phrases whose order is part of the content.
 *
 * Numbered rows separated by hairlines. The ordinals are the accent and the structure at
 * once, which is why this archetype needs no other mark.
 */
function IndexList({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  const rows = items(scene.body);
  const stateOf = anchorStatesFor(scene, absoluteFrame);

  return (
    <>
      <Heading scene={scene} frame={frame} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          marginTop: SPACE.lg,
        }}
      >
        {rows.map((row, index) => {
          const state = stateOf(index);
          return (
            <div
              key={row.text}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "baseline",
                gap: SPACE.xl,
                paddingTop: SPACE.lg,
                paddingBottom: SPACE.lg,
                borderTop: `1px solid ${COLORS.hairline}`,
                // The closing rule belongs to the last row, not to the container: on the
                // container it draws before any row has arrived, leaving a line under an
                // empty space during the entrance.
                ...(index === rows.length - 1
                  ? { borderBottom: `1px solid ${COLORS.hairline}` }
                  : {}),
                ...reveal(frame, contentDelay(index)),
              }}
            >
              {/* The row's own divider, drawn over in accent as narration arrives. It wipes
                  left to right on its own clock and stays, so the slide accumulates a visible
                  record of how far the narration has got. */}
              <div
                style={{
                  position: "absolute",
                  top: -1,
                  left: 0,
                  height: 2,
                  width: `${state.sweep * 100}%`,
                  backgroundColor: mix(COLORS.accent, COLORS.flare, state.heat),
                  opacity: state.degree === 0 ? 0 : 0.3 + 0.7 * state.heat,
                }}
              />
              <span
                style={{
                  flex: "none",
                  width: 92,
                  fontSize: TYPE.ordinal,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  fontVariantNumeric: "tabular-nums",
                  ...establishedText(state, mix(COLORS.accent, COLORS.flare, state.heat)),
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontSize: TYPE.row,
                  fontWeight: 400,
                  letterSpacing: "-0.014em",
                  lineHeight: 1.16,
                  ...establishedText(state, COLORS.paper),
                }}
              >
                {row.text}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * **cascade** — the stages of one transformation.
 *
 * A pipeline is not an enumerated list and must not look like one. The stages descend *and*
 * step right, each sitting on a rule that runs from its own left edge to the margin, so the
 * shorter-and-shorter rules form a staircase falling across the frame. Direction is carried by
 * the geometry rather than by arrows, which is both cheaper and quieter.
 *
 * Anchored stages establish in order as the narration walks them, so the diagram is built by
 * what is being said rather than shown complete and then talked over.
 */
function Cascade({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  const stages = items(scene.body);
  const stateOf = anchorStatesFor(scene, absoluteFrame);
  // Far enough that the descent is unmistakably diagonal rather than a slightly ragged
  // left edge; close enough that the last stage's rule still has real length.
  const step = stages.length > 4 ? SPACE.xxl : SPACE.huge;

  return (
    <>
      <Heading scene={scene} frame={frame} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          marginTop: SPACE.xl,
          paddingBottom: SPACE.md,
        }}
      >
        {stages.map((stage, index) => {
          const state = stateOf(index);
          const accent = mix(COLORS.accent, COLORS.flare, state.heat);
          return (
            <div
              key={stage.text}
              style={{
                marginLeft: index * step,
                display: "flex",
                flexDirection: "column",
                ...reveal(frame, contentDelay(index)),
              }}
            >
              <div
                style={{
                  fontSize: TYPE.stage,
                  fontWeight: 500,
                  letterSpacing: "-0.018em",
                  lineHeight: 1.1,
                  ...establishedText(state, COLORS.paper),
                }}
              >
                {stage.text}
              </div>
              <div
                style={{
                  position: "relative",
                  marginTop: SPACE.md,
                  height: 3,
                  backgroundColor: COLORS.hairline,
                }}
              >
                {/* The accent travelling along the stage's own rule. Every stage's rule starts
                    where that stage starts, so the set of them is the staircase. */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${state.sweep * 100}%`,
                    backgroundColor: accent,
                    opacity: state.degree === 0 ? 0 : 0.45 + 0.55 * state.heat,
                    transform: `scaleY(${1 + 1.6 * state.heat})`,
                    transformOrigin: "top left",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * **specimen** — the content is source code.
 *
 * Heading above, the block full width beneath it, monospace sized so that the longest line and
 * the whole block both fit. Code is the one content that is not reflowed, rewrapped or
 * rebalanced: its indentation is the thing being shown.
 *
 * Activation works by region rather than by element. A mark covers a line and everything
 * indented under it, so narration reaching "the `say:` section" lifts the whole section — a
 * band of the specimen brightening under a tint, which is unmistakable at a glance and needs no
 * pointer, arrow or callout. Regions may overlap, and a line takes the state of the most
 * established mark covering it.
 */
function Specimen({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  const body = scene.body;
  if (body.kind !== "code") return null;

  const lines = specimenLines(body.source);
  const spans = resolveMarkSpans(lines, body.marks);
  const stateOf = anchorStatesFor(scene, absoluteFrame);
  const anchored = scene.anchors.length > 0;

  const size = fitSpecimen(lines.length, longestLine(lines), codeBox(scene.title));

  /**
   * A line's state, combining every region that covers it.
   *
   * `degree` takes the maximum because establishment is cumulative — a line inside an
   * established section stays lit whatever else happens to it. `heat` takes the maximum
   * separately, so a nested mark firing inside an already-established section still flares:
   * without that, reaching `activates:` inside a settled `say:` block would do nothing
   * visible, which is precisely the moment the self-demo depends on.
   */
  const lineState = (index: number): AnchorState | undefined => {
    const covering = spans.filter((span) => index >= span.from && index <= span.to);
    if (covering.length === 0) return undefined;
    const states = covering.map((span) =>
      stateOf(body.marks.findIndex((mark) => mark.id === span.id)),
    );
    return {
      degree: Math.max(...states.map((state) => state.degree)),
      heat: Math.max(...states.map((state) => state.heat)),
      sweep: Math.max(...states.map((state) => state.sweep)),
    };
  };

  return (
    <>
      <style>{tokenStyles()}</style>
      <Heading scene={scene} frame={frame} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          marginTop: SPACE.xl,
          fontFamily: MONO_STACK,
          fontSize: size,
          lineHeight: CODE.lineHeight,
          // Anything the grammar does not classify — a bare scalar such as `600ms` — inherits
          // this rather than the browser's default, which is brighter than the strings beside
          // it and reads as accidental emphasis.
          color: COLORS.muted,
          ...reveal(frame, contentDelay(0)),
        }}
      >
        {lines.map((line, index) => {
          const state = lineState(index);

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "stretch",
                // A faint band that stays once narration has been here, brightening sharply as
                // it arrives. Regions accumulate down the specimen exactly as emphasis
                // accumulates down an index.
                backgroundColor:
                  state === undefined
                    ? "transparent"
                    : `rgba(217, 160, 91, ${(0.05 * state.degree + 0.11 * state.heat).toFixed(3)})`,
              }}
            >
              <div style={{ flex: "none", width: CODE.gutter, position: "relative" }}>
                {state === undefined ? null : (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      backgroundColor: mix(COLORS.accent, COLORS.flare, state.heat),
                      opacity: 0.35 + 0.65 * state.heat,
                      transform: `scaleX(${state.degree})`,
                      transformOrigin: "left center",
                    }}
                  />
                )}
              </div>
              <code
                style={{
                  whiteSpace: "pre",
                  opacity:
                    state === undefined
                      ? anchored
                        ? 0.72
                        : 1
                      : 0.72 + 0.28 * state.degree,
                }}
                dangerouslySetInnerHTML={{ __html: highlightLine(line, body.language) }}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

function longestLine(lines: readonly string[]): number {
  return lines.reduce((longest, line) => Math.max(longest, line.length), 0);
}

/**
 * What is left of the canvas once the heading has taken its share.
 *
 * The heading's *real* height — including the second line a long title takes — has to be part
 * of the arithmetic. It was not, once, and the close slide's last line sat on the bottom margin.
 */
function codeBox(title: string): { width: number; height: number } {
  const titleSize = fitHeading(title.length, TYPE.title);
  const titleHeight =
    headingLines(title.length, titleSize, HEADING_WIDTH) * titleSize * 1.06;
  return {
    width: 1920 - 2 * FRAME.marginX - CODE.gutter,
    height: 1080 - 2 * FRAME.marginY - 6 - SPACE.lg - titleHeight - SPACE.xl,
  };
}

/**
 * **revision** — one source becoming another.
 *
 * The obvious composition is the one every code-review tool uses: removed lines, then added
 * lines, in a stack. It is wrong here, and specifically wrong: it renders a change as a *list of
 * two things* when the claim being made is that one thing became another. A viewer reading a
 * unified diff has to reconstruct the transformation; a viewer watching a presentation should be
 * shown it.
 *
 * So the changed lines swap **in place**. Each hunk is a fixed stack of rows as tall as its
 * taller side (`../presentation/change.ts`), the outgoing line and the incoming line share a
 * row, and every unchanged line around them holds absolutely still. Nothing reflows, nothing
 * scrolls, and the eye has one place to be.
 *
 * The temporal model is decision:17's, unchanged and unextended: `degree` carries the swap and
 * the context's retreat, `heat` carries the flare at the moment narration arrives. The two
 * halves of the crossfade are staggered inside `degree` rather than given their own clock — the
 * outgoing line is gone before the incoming one is legible, so the frame never holds two
 * overlapping lines of code, which reads as a rendering fault rather than as a change.
 *
 * Colour stays where the rest of the deck keeps it: no red, no green, no diff gutter of `+` and
 * `-`. Removal is something leaving, addition is something arriving in the accent that means
 * "narration has been here" everywhere else in this design.
 */
function Revision({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  const body = scene.body;
  const derived = useMemo(
    () =>
      body.kind === "change"
        ? deriveChange(body.before, body.after)
        : { rows: [], changedRows: [], longestLine: 0 },
    [body],
  );
  if (body.kind !== "change") return null;

  // One derived element, at index 0 of `bodyElements` — so the narration that reaches "the
  // change" resolves through exactly the same machinery as a narration that reaches a bullet.
  const state = anchorStatesFor(scene, absoluteFrame)(0);
  const size = fitSpecimen(
    derived.rows.length,
    derived.longestLine,
    codeBox(scene.title),
  );
  const rowHeight = size * CODE.lineHeight;

  // Staggered halves of one ramp. The outgoing line is fully gone by 45% of `degree`; the
  // incoming one does not begin until 40%, so they cross rather than overlap.
  const leaving = clamp(1 - state.degree / 0.45);
  const arriving = clamp((state.degree - 0.4) / 0.6);
  const accent = mix(COLORS.accent, COLORS.flare, state.heat);

  return (
    <>
      <style>{tokenStyles()}</style>
      <Heading scene={scene} frame={frame} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          marginTop: SPACE.xl,
          fontFamily: MONO_STACK,
          fontSize: size,
          lineHeight: CODE.lineHeight,
          color: COLORS.muted,
          ...reveal(frame, contentDelay(0)),
        }}
      >
        {derived.rows.map((row, index) => {
          if (row.kind === "kept") {
            return (
              <div key={index} style={{ display: "flex", alignItems: "stretch" }}>
                <div style={{ flex: "none", width: CODE.gutter }} />
                <code
                  style={{
                    whiteSpace: "pre",
                    // Context recedes exactly as the change lands, so the frame's focus moves
                    // without anything having to move on it.
                    opacity: 0.7 - 0.22 * state.degree,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: highlightLine(row.text, body.language),
                  }}
                />
              </div>
            );
          }

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "stretch",
                height: rowHeight,
                backgroundColor: `rgba(217, 160, 91, ${(0.035 + 0.05 * state.degree + 0.13 * state.heat).toFixed(3)})`,
              }}
            >
              <div style={{ flex: "none", width: CODE.gutter, position: "relative" }}>
                {/* The band's own edge. Present from the first frame at low contrast, because
                    the viewer should know where to look before the sentence arrives, and in
                    full accent once it has. */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    backgroundColor: mix(COLORS.dormant, accent, state.degree),
                    opacity: 0.4 + 0.6 * state.heat,
                  }}
                />
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                {row.removed === undefined ? null : (
                  <code
                    style={{
                      position: "absolute",
                      inset: 0,
                      whiteSpace: "pre",
                      opacity: leaving * 0.92,
                      transform: `translateY(${-7 * state.degree}px)`,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: highlightLine(row.removed, body.language),
                    }}
                  />
                )}
                {row.added === undefined ? null : (
                  <code
                    style={{
                      position: "absolute",
                      inset: 0,
                      whiteSpace: "pre",
                      opacity: arriving,
                      transform: `translateY(${13 * (1 - arriving)}px)`,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: highlightLine(row.added, body.language),
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function clamp(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * One line, tokenized.
 *
 * Line by line rather than block at once, because the archetype needs a DOM element per line to
 * hang a region's tint and mark on, and splitting highlight.js's output back apart would mean
 * re-balancing spans that cross a newline. The cost is that a construct spanning several lines
 * — a YAML block scalar, say — is tokenized as if each of its lines stood alone. A specimen is
 * an excerpt chosen to be legible from across a room, so it does not contain one; if a deck
 * ever needs one, that is the moment to reach for a block-aware emitter rather than now.
 *
 * An empty line becomes a non-breaking space so it keeps its height without a magic minimum.
 */
function highlightLine(line: string, language: string): string {
  if (line.trim() === "") return "&nbsp;";
  return hljs.highlight(line, { language, ignoreIllegals: true }).value;
}

/**
 * highlight.js token classes mapped onto the deck's palette.
 *
 * A `<style>` element rather than inline styles because the tokens arrive as markup from the
 * library. This is the one place in the renderer where CSS is written as text, and it exists so
 * that the vendor's default theme — six hues, none of them ours — never reaches a frame.
 */
function tokenStyles(): string {
  return Object.entries(CODE_COLORS)
    .map(([token, style]) => {
      const weight = style.weight === undefined ? "" : `font-weight:${style.weight};`;
      return `.${token}{color:${style.color};${weight}}`;
    })
    .join("");
}

/**
 * **lead** — a title worth dwelling on, and points too long to be labels.
 *
 * The only fully asymmetric composition: the heading holds a column of its own on the left, a
 * hairline divides, and the points stack on the right. This is what the list archetypes fall
 * back to, so it has to survive both many items and long ones.
 */
function Lead({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const points = items(scene.body);

  return (
    <div style={{ flex: 1, display: "flex", gap: SPACE.xxl, alignItems: "stretch" }}>
      <div
        style={{
          flex: "0 0 36%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: SPACE.lg,
        }}
      >
        <Rule frame={frame} />
        <h1
          style={{
            ...heading,
            fontSize: fitHeading(scene.title.length, TYPE.lead),
            lineHeight: 1.08,
            ...reveal(frame, 0),
          }}
        >
          {scene.title}
        </h1>
      </div>

      <div style={{ flex: "none", width: 1, backgroundColor: COLORS.hairline }} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: SPACE.xl,
        }}
      >
        {points.map((point, index) => (
          <div key={point.text} style={{ ...reveal(frame, contentDelay(index)) }}>
            {/* The same accent mark the matrix cells carry, at half the width. Without it
                this column reads as a caption rather than as part of the deck. */}
            <div
              style={{
                width: 44,
                height: 3,
                marginBottom: SPACE.md,
                backgroundColor: COLORS.accent,
                opacity: 0.7,
              }}
            />
            <div
              style={{
                fontSize: TYPE.item,
                fontWeight: 400,
                lineHeight: 1.28,
                letterSpacing: "-0.008em",
                color: COLORS.muted,
                // A point that wraps to "...remembering / it" reads as a mistake. Balanced
                // wrapping splits the line evenly instead of leaving one orphaned word.
                textWrap: "balance",
              }}
            >
              {point.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Slide({
  scene,
  slideCount,
  absoluteFrame,
}: {
  scene: Scene;
  slideCount: number;
  /**
   * The composition's own frame, not the sequence-local one. Anchor frames are absolute
   * because they come from measured audio on the deck's clock, and re-deriving them
   * against a shifting sequence origin is how synchronization quietly goes wrong.
   */
  absoluteFrame: number;
}) {
  return (
    <Frame scene={scene} slideCount={slideCount}>
      {scene.layout === "statement" ? (
        <Statement scene={scene} />
      ) : scene.layout === "matrix" ? (
        <Matrix scene={scene} absoluteFrame={absoluteFrame} />
      ) : scene.layout === "index" ? (
        <IndexList scene={scene} absoluteFrame={absoluteFrame} />
      ) : scene.layout === "cascade" ? (
        <Cascade scene={scene} absoluteFrame={absoluteFrame} />
      ) : scene.layout === "specimen" ? (
        <Specimen scene={scene} absoluteFrame={absoluteFrame} />
      ) : scene.layout === "revision" ? (
        <Revision scene={scene} absoluteFrame={absoluteFrame} />
      ) : (
        <Lead scene={scene} />
      )}
    </Frame>
  );
}
