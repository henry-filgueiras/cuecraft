import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";

import { deriveChange } from "../presentation/change.ts";
import {
  interiorRange,
  type AuthoredEntity,
  type AuthoredItem,
  type SlideBody,
} from "../presentation/body.ts";
import { resolveMarkSpans, specimenLines } from "../presentation/specimen.ts";
import type { Scene } from "../compile/timeline.ts";
import {
  anchorState,
  type AnchorState,
  type AnchorTiming,
  WORLD_TIMING,
} from "./anchor.ts";
import {
  CONTINUATION,
  type Fragment,
  fitProjection,
  projectLines,
  wrapLine,
} from "./projection.ts";
import { Figure } from "./figures.tsx";
import { chooseLayout } from "./layout.ts";
import { sliceTokens, tokenizeLine } from "./tokens.ts";
import {
  cameraAt,
  cameraPlan,
  layoutWorld,
  portalAt,
  viewportTransform,
  worldOf,
  type PortalPass,
  type Point,
  type Rect,
  type WorldLayout,
  type WorldNode,
} from "./world.ts";
import {
  CODE,
  CODE_COLORS,
  COLORS,
  FONT_STACK,
  FRAME,
  HEADING_WIDTH,
  MONO_STACK,
  MOTION,
  SPACE,
  TYPE,
  WORLD,
  codeBox,
  fitHeading,
  fitTerm,
  flowColor,
  mix,
  withAlpha,
} from "./theme.ts";

/**
 * The eight curated compositions.
 *
 * `layout.ts` decides which one a slide gets from what its content means and what shape it has;
 * these render it. They share a frame, a type scale, one motion primitive and one activation
 * vocabulary, and nothing else — each is allowed to be an opinionated arrangement rather than a
 * parameterisation of a single template, which is the whole point of having eight.
 *
 * Seven of them deliberately do not have: cards, borders around content, drop shadows, gradients,
 * or icons. Structure is carried by scale, position, and hairlines. The eighth — `atlas` — has a
 * plate, a glow and a camera, because it is not composing a page: it is looking at a place that
 * does not fit on one. Where the other seven end at the frame's edge, it begins there.
 */

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
  timing?: AnchorTiming,
): (index: number) => AnchorState {
  const frames = new Map(
    scene.anchors.map((anchor) => [anchor.elementIndex, anchor.frame]),
  );
  return (index: number) => anchorState(absoluteFrame, frames.get(index), timing);
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
  bleed = false,
  children,
}: {
  scene: Scene;
  slideCount: number;
  /**
   * Drop the margins and the progress rule.
   *
   * Exactly one composition asks for this, and its reason is structural rather than stylistic:
   * the atlas has no edges to respect, because what it is showing extends past all four of them.
   * Chrome drawn over a window is chrome drawn over a window.
   */
  bleed?: boolean;
  children: ReactNode;
}) {
  if (bleed) {
    return (
      <AbsoluteFill style={{ backgroundColor: COLORS.ink, fontFamily: FONT_STACK }}>
        {children}
      </AbsoluteFill>
    );
  }
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
 *
 * What reaches the frame is a *projection* of those lines rather than the lines themselves
 * (`./projection.ts`), and the marks did not have to learn that: a fragment carries the logical
 * line it came from, so a region resolved against the source covers every fragment the source
 * produced. Every specimen in this deck is height-bound and the projection leaves all of them
 * exactly as written — the search only wraps where it buys type.
 */
function Specimen({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  const body = scene.body;
  if (body.kind !== "code") return null;

  const lines = specimenLines(body.source);
  const spans = resolveMarkSpans(lines, body.marks);
  const stateOf = anchorStatesFor(scene, absoluteFrame);
  const anchored = scene.anchors.length > 0;

  const fit = fitProjection(
    lines.map((line) => [line]),
    codeBox(scene.title),
  );
  const fragments = projectLines(lines, fit.columns);
  const size = fit.size;

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
        {fragments.map((fragment, index) => {
          const state = lineState(fragment.source);

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
              <Line
                fragment={fragment}
                line={lines[fragment.source] ?? ""}
                language={body.language}
                opacity={
                  state === undefined ? (anchored ? 0.72 : 1) : 0.72 + 0.28 * state.degree
                }
              />
            </div>
          );
        })}
      </div>
    </>
  );
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
 *
 * This is the archetype the projection was built for, and the one where a row and a rendered
 * line stop being the same thing. A swap row is as tall as its taller *side*, and a side is now
 * as tall as the fragments it wrapped to — so the row holding the deck's longest line is two
 * lines tall on one side and one on the other. The band, the gutter mark and the single derived
 * identity cover the whole of it: one semantic endpoint, several rendered regions, and nothing
 * upstream of here had to hear about it.
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
  // Both states of a swap row are measured, because the row has to hold whichever is taller
  // throughout the crossfade — a row that grew as the change landed would move the code beneath
  // it, which is the one thing this composition exists to prevent.
  const fit = fitProjection(
    derived.rows.map((row) =>
      row.kind === "kept"
        ? [row.text]
        : [row.removed, row.added].filter((text): text is string => text !== undefined),
    ),
    codeBox(scene.title),
  );
  const size = fit.size;
  const rowHeight = size * CODE.lineHeight;
  const project = (text: string): readonly Fragment[] => wrapLine(text, fit.columns);

  // Staggered halves of one ramp. The outgoing line is fully gone by 45% of `degree`; the
  // incoming one does not begin until 40%, so they cross rather than overlap.
  const leaving = clamp(1 - state.degree / 0.45);
  const arriving = clamp((state.degree - 0.4) / 0.6);
  const accent = mix(COLORS.accent, COLORS.flare, state.heat);

  return (
    <>
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
                <div>
                  {project(row.text).map((fragment, at) => (
                    <Line
                      key={at}
                      fragment={fragment}
                      line={row.text}
                      language={body.language}
                      // Context recedes exactly as the change lands, so the frame's focus moves
                      // without anything having to move on it.
                      opacity={0.7 - 0.22 * state.degree}
                    />
                  ))}
                </div>
              </div>
            );
          }

          const removed = row.removed === undefined ? [] : project(row.removed);
          const added = row.added === undefined ? [] : project(row.added);

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "stretch",
                height: Math.max(removed.length, added.length, 1) * rowHeight,
                backgroundColor: `rgba(217, 160, 91, ${(0.035 + 0.05 * state.degree + 0.13 * state.heat).toFixed(3)})`,
              }}
            >
              <div style={{ flex: "none", width: CODE.gutter, position: "relative" }}>
                {/* The band's own edge. Present from the first frame at low contrast, because
                    the viewer should know where to look before the sentence arrives, and in
                    full accent once it has. One edge for the whole row however many lines the
                    projection gave it — the row is one change, not two. */}
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
                {removed.length === 0 ? null : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: leaving * 0.92,
                      transform: `translateY(${-7 * state.degree}px)`,
                    }}
                  >
                    {removed.map((fragment, at) => (
                      <Line
                        key={at}
                        fragment={fragment}
                        line={row.removed ?? ""}
                        language={body.language}
                      />
                    ))}
                  </div>
                )}
                {added.length === 0 ? null : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: arriving,
                      transform: `translateY(${13 * (1 - arriving)}px)`,
                    }}
                  >
                    {added.map((fragment, at) => (
                      <Line
                        key={at}
                        fragment={fragment}
                        line={row.added ?? ""}
                        language={body.language}
                      />
                    ))}
                  </div>
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
 * One rendered line: a projected fragment of one logical line of source.
 *
 * The whole logical line is tokenized and the fragment's character range sliced out of it
 * (`./tokens.ts`), so a sentence that wraps keeps the colours it had as a sentence. Tokenizing
 * the fragment alone would classify the tail of a quoted string as three bare scalars, and the
 * viewer would watch one string change colour halfway through — which is the specimen telling
 * them something false about the file.
 *
 * A continuation carries the deck's dimmest grey and a glyph in the column the list marker
 * occupies: `-` opens an item and `↳` continues one, so a projected line is never mistaken for
 * a line of the file. It is the only mark in the renderer that is not source and does not come
 * from source.
 *
 * An empty line becomes a non-breaking space so it keeps its height without a magic minimum.
 */
function Line({
  fragment,
  line,
  language,
  opacity,
}: {
  fragment: Fragment;
  /** The whole logical line. Tokenized as a whole; drawn one fragment at a time. */
  line: string;
  language: string;
  opacity?: number;
}) {
  const tokens = sliceTokens(tokenizeLine(line, language), fragment.from, fragment.to);
  return (
    <code
      style={{
        display: "block",
        whiteSpace: "pre",
        ...(opacity === undefined ? {} : { opacity }),
      }}
    >
      {fragment.continuation ? (
        <span style={{ color: COLORS.dim }}>
          {`${" ".repeat(fragment.indent)}${CONTINUATION} `}
        </span>
      ) : null}
      {tokens.length === 0
        ? " "
        : tokens.map((token, index) => (
            <span key={index} style={CODE_COLORS[token.className ?? ""]}>
              {token.text}
            </span>
          ))}
    </code>
  );
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

/**
 * **atlas** — the content is a semantic world, and the world is bigger than the frame.
 *
 * Every other composition fits a slide into 1920x1080 and stops. This one lays the world out once
 * in its own coordinates (`./world.ts`), which come out several times wider than the viewport,
 * and then *looks at part of it*. The camera is the composition.
 *
 * What the author wrote is what exists and what relates to what. What is derived here is the
 * position of every plate, the route of every relation, the colour of both, which bounds each
 * narration event wants on screen, how long the move to those bounds should take, and the wide
 * shot at the end. There is no key in the source format that could change any of it.
 *
 * The activation vocabulary is recalibrated rather than reused, because this is the composition
 * where the old one visibly failed. Three states, and only one of them is tinted:
 *
 *     future        latent — the structure is there, dim, and readable as structure
 *     hot           ignition — accent stroke, bloom, a signal running down the relation
 *     established   normal — full white label, the plate's own colour, no residue
 *
 * The deck's earlier reading gave *established* a dull colour of its own, so a slide accumulated
 * grey. Here established is the visual baseline and `future` is the only attenuated state, which
 * means the world gets brighter as it is explained instead of duller. Contrast is spent on the
 * moment rather than smeared across the aftermath — and while anything is hot, everything else
 * steps back, so the newly relevant concept is the brightest thing on the frame by a margin
 * nobody has to look for.
 */
function Atlas({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  const world = worldOf(scene.body);
  const layout = useMemo(
    () => (world === undefined ? undefined : layoutWorld(world)),
    [world],
  );

  const plan = useMemo(() => {
    if (layout === undefined || world === undefined) return undefined;
    // Which anchors are inside something is read off the element ordering `bodyElements`
    // publishes, so the renderer and the compiler agree by construction rather than by
    // convention. An anchor past the last entity is inside whichever interior contains it.
    const inside = interiorOwners(world.entities);
    const openable = new Set(
      world.entities.filter((entity) => entity.detail !== undefined).map((e) => e.id),
    );
    return cameraPlan(
      layout,
      scene.anchors.map((anchor) => {
        // Either the narration reached something in there, or it reached the concept itself and
        // the concept has an inside. Both are the same request.
        const owner =
          inside.get(anchor.elementIndex) ??
          (openable.has(anchor.id) ? anchor.id : undefined);
        return {
          frame: anchor.frame,
          id: anchor.id,
          ...(owner === undefined ? {} : { inside: owner }),
        };
      }),
      { from: scene.from, until: revealFrom(scene) },
    );
  }, [layout, world, scene]);

  if (layout === undefined || world === undefined || plan === undefined) return null;

  const view = cameraAt(plan.track, absoluteFrame);
  const viewport = { width: 1920, height: 1080 };
  const scale = viewport.width / view.width;
  /** How wide the shot that holds the whole world is, for judging how wide this one is. */
  const whole = plan.track[0]?.view.width ?? view.width;

  const stateOf = anchorStatesFor(scene, absoluteFrame, WORLD_TIMING);
  const states = new Map(
    layout.nodes.map((node, index) => [node.id, stateOf(index)] as const),
  );
  const heat = (id: string): number => states.get(id)?.heat ?? 0;
  const degree = (id: string): number => states.get(id)?.degree ?? 0;
  const sweep = (id: string): number => states.get(id)?.sweep ?? 0;

  // Everything that is not the moment steps back while the moment lasts. An entity being
  // *entered* holds the frame's attention for as long as the excursion lasts, not just for the
  // length of a transient, so the portal contributes its own progress to the same number.
  const open = plan.portals.find(
    (pass) =>
      absoluteFrame > pass.enterFrame && absoluteFrame < pass.exitFrame + pass.exitFrames,
  );
  const portal = open === undefined ? 0 : portalAt(open, absoluteFrame);
  const attention = Math.max(portal, ...[...states.values()].map((state) => state.heat));

  // The world layer, and a fainter copy of the field behind it moving at a fraction of the rate.
  // Parallax is the cheapest honest depth cue there is, and it is what makes a lateral move read
  // as travel rather than as a diagram sliding sideways.
  const place = (factor: number): CSSProperties => {
    const put = viewportTransform(view, viewport, factor);
    return {
      position: "absolute",
      left: 0,
      top: 0,
      transformOrigin: "0 0",
      transform: `translate(${put.x}px, ${put.y}px) scale(${put.scale})`,
    };
  };

  const opening = interpolate(frame, [0, MOTION.opener * 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, overflow: "hidden" }}>
      <div style={place(WORLD.gridParallax)}>
        <Field
          opacity={0.5 * opening * (1 - portal)}
          step={WORLD.gridStep * 3}
          scale={scale * WORLD.gridParallax}
        />
      </div>
      <div style={place(1)}>
        <Field
          opacity={0.85 * opening * (1 - portal)}
          step={WORLD.gridStep}
          scale={scale}
        />
        <Relations
          layout={layout}
          degree={degree}
          sweep={sweep}
          heat={heat}
          attention={attention}
        />
        {layout.nodes.map((node) => {
          const pass = plan.portals.find((entry) => entry.id === node.id);
          const entity = world.entities.find((candidate) => candidate.id === node.id);
          if (pass !== undefined && entity?.detail !== undefined) {
            return (
              <Portal
                key={node.id}
                node={node}
                entity={entity}
                entities={world.entities}
                scene={scene}
                pass={pass}
                progress={portalAt(pass, absoluteFrame)}
                state={states.get(node.id) as AnchorState}
                attention={attention}
                opening={opening}
                absoluteFrame={absoluteFrame}
              />
            );
          }
          return (
            <Plate
              key={node.id}
              node={node}
              state={states.get(node.id) as AnchorState}
              attention={attention}
              opening={opening}
              explored={plan.portals.some(
                (entry) => entry.id === node.id && absoluteFrame > entry.exitFrame,
              )}
            />
          );
        })}
      </div>

      {/* Screen space, and the only thing in the composition that does not move: a horizon the
          travelling world is seen against. It lifts while the camera is inside something, so an
          interior reads as a lit room rather than as the same void with a diagram in it. */}
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse 78% 74% at 50% 48%, ${withAlpha("#05070B", 0)} 0%, ` +
            `${withAlpha("#05070B", 0.22 * (1 - portal))} 62%, ` +
            `${withAlpha("#04060A", 0.62 - 0.42 * portal)} 100%)`,
          pointerEvents: "none",
        }}
      />
      {/* The deck's title labels the *world*, so it is present exactly when the world is.
          It is at full strength on the establishing shot and on the reveal, absent on every close
          shot in between, and it steps aside entirely inside a concept — down there the concept's
          name is the title, and two titles on one frame is one too many.

          Derived from the camera rather than scheduled: how much of the world is on screen is
          already known, and it answers the question better than a keyframe would. It also fixes
          the one thing v1 never solved, which is that a fixed caption over a moving world collides
          with whatever happens to be behind it. */}
      <div
        style={{
          position: "absolute",
          left: FRAME.marginX,
          top: FRAME.marginY,
          ...reveal(frame, 0),
          // Combined with the entrance rather than layered over it: `reveal` sets opacity too.
          opacity:
            (reveal(frame, 0).opacity as number) *
            (1 - Math.min(1, portal * 2.2)) *
            interpolate(view.width / whole, [0.62, 0.88], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
        }}
      >
        <Rule frame={frame} width={72} />
        <h1
          style={{
            ...heading,
            marginTop: SPACE.md,
            fontSize: TYPE.row,
            lineHeight: 1.08,
            maxWidth: 1220,
            textShadow: `0 2px 34px ${withAlpha("#05070B", 0.9)}`,
          }}
        >
          {scene.title}
        </h1>
      </div>
    </AbsoluteFill>
  );
}

/**
 * Which entity each reachable element belongs to, for the elements that are inside one.
 *
 * Read from `interiorRange`, which owns the ordering rule, so this cannot drift from what the
 * compiler resolved an `activates:` against.
 */
function interiorOwners(entities: readonly AuthoredEntity[]): Map<number, string> {
  const owners = new Map<number, string>();
  for (const entity of entities) {
    const range = interiorRange(entities, entity.id);
    if (range === undefined || range.count === 0) continue;
    for (let index = 0; index < range.count; index += 1) {
      owners.set(range.offset + index, entity.id);
    }
  }
  return owners;
}

/**
 * When the camera stops looking at concepts and shows the machine.
 *
 * A closing cue that reaches no entity, after every cue that reaches one, is a remark about the
 * world rather than about anything in it — so that is where the pull back begins, and the closing
 * lines are spoken over it. A slide whose narration ends on an activation gets the reveal in its
 * `post_say` instead.
 *
 * Derived from which cues name an entity and which do not, which is a fact the author already
 * wrote down for an entirely different reason. Nothing here is a camera instruction, and there is
 * no key that could become one.
 */
function revealFrom(scene: Scene): number {
  const lastAnchored = Math.max(-1, ...scene.anchors.map((anchor) => anchor.clipIndex));
  const trailing = scene.clips[lastAnchored + 1];
  if (trailing !== undefined) return trailing.from;

  const last = scene.clips.at(-1);
  return last === undefined
    ? scene.narrationFrom + scene.narrationDurationInFrames
    : last.from + last.durationInFrames;
}

/**
 * The blueprint field the world is suspended in.
 *
 * Lines rather than a wash, because the deck already learned what eight-bit near-black does to a
 * gradient. Two of these run at different rates; together they are the only thing that tells a
 * viewer the camera is moving rather than the diagram.
 *
 * The *spacing* scales with the camera and the *thickness* does not, which is the compromise a
 * blueprint has to make. Scaling both is technically consistent and perceptually useless: at the
 * wide shot the lines land under a pixel and the field disappears in exactly the frame that needs
 * it most. Spacing carries the zoom; thickness carries the legibility.
 */
function Field({
  opacity,
  step,
  scale,
}: {
  opacity: number;
  step: number;
  scale: number;
}) {
  const stroke = 1.2 / Math.max(scale, 0.05);
  const ink = withAlpha("#546A8C", 0.55);
  return (
    <div
      style={{
        position: "absolute",
        left: -24000,
        top: -24000,
        width: 48000,
        height: 48000,
        opacity,
        backgroundImage:
          `linear-gradient(${ink} ${stroke}px, transparent ${stroke}px), ` +
          `linear-gradient(90deg, ${ink} ${stroke}px, transparent ${stroke}px)`,
        backgroundSize: `${step}px ${step}px`,
      }}
    />
  );
}

/**
 * The relations, drawn in the world's own coordinates.
 *
 * A relation draws itself as its later end arrives — a line growing from the concept already
 * established towards the one being introduced — with a short bright dash riding the leading edge
 * and an arrow head fading in behind it. Direction is carried by the motion, so the head can stay
 * small enough not to be a diagram convention.
 *
 * A relation neither of whose ends has been reached is still there, faintly. The world has to
 * read as a machine from the first frame; the narration lights it, it does not build it.
 */
function Relations({
  layout,
  degree,
  sweep,
  heat,
  attention,
}: {
  layout: WorldLayout;
  degree: (id: string) => number;
  sweep: (id: string) => number;
  heat: (id: string) => number;
  attention: number;
}) {
  const { bounds } = layout;
  return (
    <svg
      width={bounds.width}
      height={bounds.height}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      style={{ position: "absolute", left: bounds.x, top: bounds.y, overflow: "visible" }}
    >
      {layout.edges.map((edge) => {
        const source = layout.byId.get(edge.from);
        const hue = flowColor(source?.depth ?? 0);
        const drawn = Math.min(sweep(edge.from), sweep(edge.to));
        const live = Math.min(degree(edge.from), degree(edge.to));
        const arriving = heat(edge.to);
        // A relation that touches the moment is part of the moment. Lighting the wires into and
        // out of a hot concept is what makes it read as *connected* rather than merely bright,
        // and it costs one `max` — the edge already knows both of its endpoints' states.
        const touched = Math.max(heat(edge.from), heat(edge.to));
        const dim = 1 - 0.34 * attention * (1 - touched);

        return (
          <g key={`${edge.from}-${edge.to}`}>
            {/* The latent run. Present from the first frame at the brightness of structure. */}
            <path
              d={edge.path}
              fill="none"
              stroke={withAlpha("#647B9C", 0.42 * dim)}
              strokeWidth={WORLD.edgeStroke * 0.55}
              strokeLinecap="round"
            />
            {/* The established run, drawn as it establishes, and lit while it carries a moment. */}
            <path
              d={edge.path}
              fill="none"
              stroke={withAlpha(
                mix(hue, "#FFFFFF", 0.45 * touched),
                (0.34 + 0.34 * live + 0.5 * touched) * dim,
              )}
              strokeWidth={WORLD.edgeStroke * (1 + 0.6 * touched)}
              strokeLinecap="round"
              strokeDasharray={edge.length}
              strokeDashoffset={edge.length * (1 - drawn)}
            />
            {/* The signal. Rides the leading edge and is gone with it. */}
            {drawn > 0 && drawn < 1 ? (
              <path
                d={edge.path}
                fill="none"
                stroke={withAlpha(hue, 0.95)}
                strokeWidth={WORLD.edgeStroke * 1.5}
                strokeLinecap="round"
                // The dash sits immediately *behind* the leading edge of the line being drawn:
                // the pattern repeats every `pulse + length`, so offsetting by
                // `pulse - drawn * length` puts its start at `drawn * length - pulse` and its
                // end exactly where the line has got to. Offsetting by the remaining length
                // instead — which is what the drawing line itself uses — runs it backwards,
                // from the concept being introduced towards the one already established.
                strokeDasharray={`${WORLD.pulseLength} ${edge.length}`}
                strokeDashoffset={WORLD.pulseLength - drawn * edge.length}
                style={{ filter: `drop-shadow(0 0 22px ${withAlpha(hue, 0.9)})` }}
              />
            ) : null}
            <ArrowHead points={edge.points} color={hue} opacity={live * dim} />
          </g>
        );
      })}
    </svg>
  );
}

/** The head of a relation, built from its own last segment rather than from an SVG marker. */
function ArrowHead({
  points,
  color,
  opacity,
}: {
  points: readonly Point[];
  color: string;
  opacity: number;
}) {
  const tip = points.at(-1);
  const before = points.at(-2);
  if (tip === undefined || before === undefined || opacity <= 0.01) return null;

  const angle = Math.atan2(tip.y - before.y, tip.x - before.x);
  const size = 26;
  const spread = 0.42;
  const corner = (turn: number) => ({
    x: tip.x - size * Math.cos(angle + turn),
    y: tip.y - size * Math.sin(angle + turn),
  });
  const [left, right] = [corner(spread), corner(-spread)];

  return (
    <polygon
      points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
      fill={withAlpha(color, 0.85 * opacity)}
    />
  );
}

/**
 * One entity, as a plate in the world.
 *
 * Future is dim but complete; established is bright, white-labelled and untinted; hot is a
 * momentary bloom in the entity's own colour that also lifts it a little towards the viewer. The
 * bloom is long by the deck's standards (`WORLD_TIMING`) because the camera is still travelling
 * when it starts — the plate ignites at the word and is still burning when the shot arrives,
 * which is what makes the arrival feel caused rather than scheduled.
 */
function Plate({
  node,
  state,
  attention,
  opening,
  explored = false,
}: {
  node: WorldNode;
  state: AnchorState;
  attention: number;
  opening: number;
  /** The camera has been inside this one and come back out. */
  explored?: boolean;
}) {
  const hue = flowColor(node.depth);
  const { degree, heat } = state;

  // Everything that is not the moment steps back while the moment lasts. Half a stop is a lot,
  // and it is the single most effective thing on this frame: the eye finds the brightest object
  // before it finds anything else, so making the moment brightest is the whole job.
  const dim = 1 - 0.55 * attention * (1 - heat);
  const presence = (0.4 + 0.6 * degree) * dim * opening;

  // Hot is the entity's own colour *brightened*, not washed towards white. A white border is
  // merely light; a saturated one is lit, and lit is what a viewer reads as "this one".
  const ignited = mix(hue, "#FFFFFF", 0.42);
  const fill = node.terminal
    ? mix("#0A0F16", hue, 0.07 + 0.1 * degree + 0.08 * heat)
    : mix("#0B1017", hue, 0.02 + 0.05 * degree + 0.09 * heat);
  const stroke = mix(mix("#465873", hue, 0.42 + 0.58 * degree), ignited, heat);
  const label = mix(mix(COLORS.dim, COLORS.paper, degree), "#FFFFFF", 0.6 * heat);

  return (
    <div
      style={{
        position: "absolute",
        left: node.rect.x,
        top: node.rect.y,
        width: node.rect.width,
        height: node.rect.height,
        opacity: presence,
        transform: `scale(${1 + 0.05 * heat})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: WORLD.plateRadius,
        border: `${WORLD.plateStroke + 1.5 * heat}px solid ${stroke}`,
        backgroundColor: fill,
        // Tight and bright rather than wide and faint. A 200-unit bloom at eight percent alpha
        // is a gradient with about four values in it, and H.264 renders four values over three
        // hundred pixels as visible rectangular steps — the same eight-bit near-black problem
        // that flattened the deck's background. Halving the radius and doubling the alpha puts
        // the same amount of light into a ramp steep enough to survive the encoder.
        boxShadow:
          `0 0 ${28 + 74 * heat}px ${withAlpha(hue, 0.09 + 0.2 * degree + 0.62 * heat)}, ` +
          `inset 0 0 ${30 + 60 * heat}px ${withAlpha(hue, 0.05 + 0.18 * heat)}`,
      }}
    >
      {node.terminal ? <Gate hue={hue} degree={degree} /> : null}
      {/* A concept the camera has been inside keeps a second line just within its own, so the
          final wide shot distinguishes the things that were opened from the things that were
          only named. No badge, no tick — the plate is simply built a little more deeply. */}
      {explored ? (
        <div
          style={{
            position: "absolute",
            inset: 9,
            borderRadius: WORLD.plateRadius - 4,
            border: `1.5px solid ${withAlpha(hue, 0.34)}`,
          }}
        />
      ) : null}
      {/* Ignition. One ring, once, expanding away from the plate as it lights — the thing that
          makes an activation visible from the corner of the eye while the camera is still on its
          way there. Driven by `sweep` because a ring that came back would be absurd. */}
      {state.sweep > 0 && state.sweep < 1 ? (
        <div
          style={{
            position: "absolute",
            inset: -32,
            borderRadius: WORLD.plateRadius + 32,
            border: `5px solid ${withAlpha(ignited, 0.8 * (1 - state.sweep) ** 1.6)}`,
            transform: `scale(${1 + 0.2 * state.sweep})`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "relative",
          padding: `0 ${WORLD.padX}px`,
          textAlign: "center",
          fontSize: WORLD.label,
          fontWeight: 600,
          letterSpacing: "-0.018em",
          lineHeight: WORLD.lineHeight,
          color: label,
          textShadow: heat > 0.01 ? `0 0 ${44 * heat}px ${withAlpha(hue, heat)}` : "none",
        }}
      >
        {node.lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

/**
 * An entity being entered, and the same entity being a box in a diagram.
 *
 * One component for both, because they are one object. The plate's rectangle is interpolated
 * from where it sits in the world to the chamber it opens into — same centre, so the thing does
 * not travel and then become something else; it stays where it is and opens — while the camera
 * closes on the chamber at exactly the same rate. What the viewer sees is the node's own outline
 * arriving at the edge of the picture and stopping there.
 *
 * The interior is an **ordinary cuecraft composition**, drawn in a 1920x1080 box scaled into the
 * chamber, so at the portal shot it lands at about one composition pixel per screen pixel. That
 * is the whole of the semantic zoom: at world scale the entity is two words, and at concept scale
 * it is whichever of the seven compositions its content selected — here a source specimen with
 * regions the narration lights. Nothing about the interior knows it is inside anything.
 *
 * The label is the same string in both states, so the handoff is a fade between two settings of
 * one word while both are travelling to the same place. It reads as reflow rather than as a
 * substitution, which is the difference between "we went inside this" and "a slide arrived".
 */
function Portal({
  node,
  entity,
  entities,
  scene,
  pass,
  progress,
  state,
  attention,
  opening,
  absoluteFrame,
}: {
  node: WorldNode;
  entity: AuthoredEntity;
  entities: readonly AuthoredEntity[];
  scene: Scene;
  pass: PortalPass;
  progress: number;
  state: AnchorState;
  attention: number;
  opening: number;
  absoluteFrame: number;
}) {
  const hue = flowColor(node.depth);
  const { degree, heat } = state;
  const p = progress;

  // The boundary, between its two rectangles.
  const box = {
    x: node.rect.x + (pass.chamber.x - node.rect.x) * p,
    y: node.rect.y + (pass.chamber.y - node.rect.y) * p,
    width: node.rect.width + (pass.chamber.width - node.rect.width) * p,
    height: node.rect.height + (pass.chamber.height - node.rect.height) * p,
  };
  const inner = box.width / 1920;

  const ignited = mix(hue, "#FFFFFF", 0.42);
  const stroke = mix(
    mix("#465873", hue, 0.42 + 0.58 * degree),
    ignited,
    Math.max(heat, p),
  );
  const label = mix(mix(COLORS.dim, COLORS.paper, degree), "#FFFFFF", 0.6 * heat);
  const dim = 1 - 0.55 * attention * (1 - Math.max(heat, p));
  const presence = ((0.4 + 0.6 * degree) * dim + p) * opening;

  // Where the interior's own heading will be, in world units. The plate label travels to it.
  const detail = entity.detail;
  const headingSize = fitHeading(node.label.length, TYPE.title);
  const headingAt = {
    x: box.x + FRAME.marginX * inner,
    y: box.y + (FRAME.marginY + 6 + SPACE.lg) * inner,
    size: headingSize * inner,
  };

  const plateLabel = interpolate(p, [0, 0.42], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const interior = interpolate(p, [0.34, 0.78], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        // In front of the world once it starts opening. Plates are drawn in entity order, and an
        // entity that comes later in the source is not thereby in front of the room you are
        // standing in.
        zIndex: p > 0 ? 2 : 1,
        opacity: Math.min(1, presence),
        transform: `scale(${1 + 0.05 * heat * (1 - p)})`,
        borderRadius: WORLD.plateRadius * (1 + 1.6 * p),
        border: `${(WORLD.plateStroke + 1.5 * heat) * (1 + p)}px solid ${stroke}`,
        backgroundColor: mix(
          "#0B1017",
          hue,
          (0.02 + 0.05 * degree + 0.09 * heat) * (1 - p) + 0.012 * p,
        ),
        boxShadow:
          `0 0 ${(28 + 74 * heat) * (1 + 4 * p)}px ${withAlpha(hue, 0.09 + 0.2 * degree + 0.62 * heat)}, ` +
          `inset 0 0 ${30 + 60 * heat}px ${withAlpha(hue, (0.05 + 0.18 * heat) * (1 - p))}`,
        overflow: "hidden",
      }}
    >
      {/* The interior, at its own scale, choreographing itself as the camera arrives. */}
      {detail !== undefined && interior > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            transformOrigin: "0 0",
            transform: `scale(${inner})`,
            opacity: interior,
          }}
        >
          <Sequence
            from={Math.max(0, pass.enterFrame - scene.from)}
            layout="none"
            name={`interior-${node.id}`}
          >
            <Interior
              entity={entity}
              entities={entities}
              scene={scene}
              absoluteFrame={absoluteFrame}
            />
          </Sequence>
        </div>
      ) : null}

      {/* The label, on its way to becoming the heading. */}
      {plateLabel > 0 ? (
        <div
          style={{
            position: "absolute",
            left: box.x + (headingAt.x - box.x) * p - box.x,
            top: box.y + (headingAt.y - box.y) * p - box.y,
            width: box.width,
            height: box.height * (1 - p) + headingAt.size * 1.2 * p,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: plateLabel,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              padding: `0 ${WORLD.padX}px`,
              textAlign: "center",
              fontSize: WORLD.label + (headingAt.size - WORLD.label) * p,
              fontWeight: 600,
              letterSpacing: "-0.018em",
              lineHeight: WORLD.lineHeight,
              color: label,
              textShadow:
                heat > 0.01 ? `0 0 ${44 * heat}px ${withAlpha(hue, heat)}` : "none",
            }}
          >
            {node.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The composition inside an entity.
 *
 * A synthesized scene rather than a special case: the entity's label is the title, its `detail`
 * is the body, `chooseLayout` picks the composition from that body exactly as it would for a
 * slide, and the anchors are the slide's own anchors with the interior's offset subtracted. So
 * an interior is rendered by code that has no idea interiors exist, which is the test of whether
 * `detail` was a real reuse or a costume.
 */
function Interior({
  entity,
  entities,
  scene,
  absoluteFrame,
}: {
  entity: AuthoredEntity;
  entities: readonly AuthoredEntity[];
  scene: Scene;
  absoluteFrame: number;
}) {
  const detail = entity.detail;
  const range = interiorRange(entities, entity.id);
  if (detail === undefined || range === undefined) return null;

  const inner: Scene = {
    ...scene,
    title: entity.text,
    body: detail,
    layout: chooseLayout({ title: entity.text, body: detail }),
    anchors: scene.anchors
      .filter(
        (anchor) =>
          anchor.elementIndex >= range.offset &&
          anchor.elementIndex < range.offset + range.count,
      )
      .map((anchor) => ({ ...anchor, elementIndex: anchor.elementIndex - range.offset })),
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: `${FRAME.marginY}px ${FRAME.marginX}px`,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT_STACK,
      }}
    >
      <Composition scene={inner} absoluteFrame={absoluteFrame} />
    </div>
  );
}

/**
 * What the world produces, marked as an artifact rather than another concept.
 *
 * The terminal entity — the one no relation leaves — gets an inset frame, so the plate reads as
 * something with a picture in it rather than as one more box in a diagram. Which entity that is
 * is a fact about the graph, not something anybody wrote down: cuecraft finds the sink.
 *
 * A first cut put a working miniature of the whole world in here, and it was the right idea at
 * the wrong scale — at the sizes this plate actually appears at, an eleven-node schematic inside
 * it is indistinguishable from a compression artifact. The recursion is parked, not abandoned.
 */
function Gate({ hue, degree }: { hue: string; degree: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 16,
        borderRadius: 4,
        border: `1.5px solid ${withAlpha(hue, 0.16 + 0.3 * degree)}`,
      }}
    />
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
    <Frame scene={scene} slideCount={slideCount} bleed={scene.layout === "atlas"}>
      <Composition scene={scene} absoluteFrame={absoluteFrame} />
    </Frame>
  );
}

/**
 * The archetype switch, separated from the frame that usually surrounds it.
 *
 * Separated because a composition is now drawn in two places: on a slide, and inside a world
 * entity that the camera has entered. The interior gets the same eight-way choice from the same
 * function with no branch for being an interior — which is the evidence that `detail` reused the
 * composition layer rather than resembling it.
 */
function Composition({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  // Unconditionally, at the top: one branch below needs the sequence-local frame, and a hook
  // called inside a conditional is a hook called sometimes.
  const frame = useCurrentFrame();
  return scene.layout === "atlas" ? (
    <Atlas scene={scene} absoluteFrame={absoluteFrame} />
  ) : scene.layout === "figure" ? (
    <>
      <Heading scene={scene} frame={frame} />
      <div style={{ flex: 1, display: "flex", marginTop: SPACE.xl }}>
        <Figure
          kind={scene.body.kind === "figure" ? scene.body.figure : "timing"}
          absoluteFrame={absoluteFrame}
        />
      </div>
    </>
  ) : scene.layout === "statement" ? (
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
  );
}
