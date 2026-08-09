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
import { formulaMeasure, setFormula } from "../presentation/formula.ts";
import { groupOffset, seriesTotal } from "../presentation/series.ts";
import { cellSize, fieldShape, memberFill, membersDone } from "./series.ts";
import { MATH_RESET, useMathFonts } from "./mathfonts.tsx";
import { childScope, ROOT_SCOPE, type Scope } from "../presentation/scope.ts";
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
  type ScheduledCall,
  type Rect,
  type WorldLayout,
  type WorldNode,
} from "./world.ts";
import { smootherstep, viewRect, type Viewport } from "./camera.ts";
import {
  layoutProtocol,
  protocolOf,
  transcriptPlan,
  type Activation,
  type Lane,
  type Message,
  type ProtocolLayout,
} from "./protocol.ts";
import {
  elisionsOf,
  machineOf,
  machinePlan,
  reductionOf,
  runProgress,
  startingState,
  type MachineEdge,
  type MachineLayout,
  type MachineNode,
  type MachineReduction,
  type Elision,
} from "./machine.ts";
import type { AuthoredMachine } from "../presentation/machine.ts";
import { electLayout } from "./audition.ts";
import {
  LEDGER_GUTTER,
  LEDGER_PAD_RIGHT,
  LEDGER_PAD_X,
  fitLedger,
  fitTitle,
  ledgerAt,
  ledgerBand,
  ledgerHeight,
  type LedgerFit,
  type LedgerRow,
} from "./ledger.ts";
import { pointAlong } from "./polyline.ts";
import { tenantAt } from "./tenancy.ts";
import { useSubtitleBand } from "./subtitles.tsx";
import {
  CASCADE,
  CODE,
  CODE_COLORS,
  COLORS,
  FIELD,
  FORMULA,
  FONT_STACK,
  FRAME,
  HEADING_WIDTH,
  INDEX,
  MACHINE,
  MONO_STACK,
  MOTION,
  SPACE,
  TRANSCRIPT,
  TYPE,
  WORLD,
  bodyBox,
  codeBox,
  frameBottom,
  fitCascade,
  fitHeading,
  fitIndex,
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
  // What a subtitle costs the composition: nothing at all unless the deck asked for one, and
  // otherwise a strip along the bottom that nothing is laid out into (`./subtitles.tsx`). A
  // bleeding composition has no margin to give up and is overlaid instead — dragon:21.
  const band = useSubtitleBand();

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
          padding: `${FRAME.marginY}px ${FRAME.marginX}px ${frameBottom(band)}px`,
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
  // How much room there is, and what size and air the rows can afford in it. This composition
  // used to answer both questions with constants, which was invisible for as long as the box was
  // always the same box — see `fitIndex` for what a subtitle band did to that. sprint:14.
  const band = useSubtitleBand();
  const fitted = fitIndex(
    rows.map((row) => row.text),
    bodyBox(scene.title, band),
  );

  return (
    <>
      <Heading scene={scene} frame={frame} />
      <div
        style={{
          flex: 1,
          // Without this the stack keeps its intrinsic height and runs straight past `Frame`'s
          // bottom padding — which is the band — because a flex item's `min-height` resolves to
          // `auto`. `fitIndex` is what stops it coming to that; this is what stops it being a
          // collision when it does.
          minHeight: 0,
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
                gap: INDEX.gutter,
                paddingTop: fitted.pad,
                paddingBottom: fitted.pad,
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
                  width: INDEX.ordinal,
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
                  fontSize: fitted.size,
                  fontWeight: 400,
                  letterSpacing: "-0.014em",
                  lineHeight: INDEX.lineHeight,
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
  // The staircase, sized to the room it actually has. Air goes before type, because the descent
  // is carried by the indent and the rules rather than by the space around them. sprint:14.
  const band = useSubtitleBand();
  const fitted = fitCascade(
    stages.map((stage) => stage.text),
    bodyBox(scene.title, band),
    step,
  );

  return (
    <>
      <Heading scene={scene} frame={frame} />
      <div
        style={{
          flex: 1,
          // See `IndexList`: a flex item's `min-height` is `auto`, so without this the staircase
          // keeps its intrinsic height and descends through the narration.
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          // Whatever `fitCascade` did not have to spend is spread between the stages rather than
          // pooled under the last one, which is what keeps a short staircase from sitting in the
          // top half of an empty frame.
          justifyContent: "space-between",
          marginTop: SPACE.xl,
          paddingBottom: fitted.gap,
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
                  fontSize: fitted.size,
                  fontWeight: 500,
                  letterSpacing: "-0.018em",
                  lineHeight: CASCADE.lineHeight,
                  ...establishedText(state, COLORS.paper),
                }}
              >
                {stage.text}
              </div>
              <div
                style={{
                  position: "relative",
                  marginTop: fitted.gap,
                  height: CASCADE.ruleHeight,
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
  const band = useSubtitleBand();
  const body = scene.body;
  if (body.kind !== "code") return null;

  const lines = specimenLines(body.source);
  const spans = resolveMarkSpans(lines, body.marks);
  const stateOf = anchorStatesFor(scene, absoluteFrame);
  const anchored = scene.anchors.length > 0;

  const fit = fitProjection(
    lines.map((line) => [line]),
    codeBox(scene.title, band),
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
  const band = useSubtitleBand();
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
    codeBox(scene.title, band),
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
 * **formula** — the content is mathematics, so it is set as mathematics.
 *
 * The tenth archetype, and the plainest. There is nothing to arrange: a definition is one line
 * whose *spacing* is part of its meaning, and every layout decision worth making — where the
 * subscript sits, how much air goes around a binary operator, which letters are italic — belongs
 * to the typesetter rather than to this file (`../presentation/formula.ts`). What is left here is
 * three things: how big, where, and what activation means.
 *
 * **How big** is derived from the longest line, exactly as a specimen's size is derived from its
 * widest one. An author who had to pick a point size for an equation would be authoring a
 * projection.
 *
 * **Where** is centred, and it is the only archetype that centres anything. Everything else in
 * this deck hangs off the left margin because it is *read*, left to right, and a ragged left edge
 * is a reading obstacle. An equation is not read that way — it is looked at whole, and its own
 * relation sign is its axis. Setting it flush left would put that axis somewhere arbitrary.
 *
 * **Activation** is the deck's, unchanged: a line the narration has not reached is legible and
 * recessive, a line it reaches flares and settles. The one thing added is that the flare is a
 * glow behind the line rather than a colour change, because recolouring mathematics fights the
 * one distinction the typesetting is making — upright against italic — and a hash function's
 * definitions are mostly operators.
 */
function Formula({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  useMathFonts();
  const body = scene.body;
  if (body.kind !== "formula") return null;

  const stateOf = anchorStatesFor(scene, absoluteFrame);
  // The largest size at which the longest line clears both margins *and* the whole stack clears
  // the frame — the same two-constraint fit `fitSpecimen` makes, and for the same reason: a
  // formula sized by its width alone will happily set six lines off the bottom of the picture.
  const widest = Math.max(...body.lines.map((line) => formulaMeasure(line.tex)), 1);
  const byWidth = (1920 - 2 * FRAME.marginX) / widest;
  const byHeight =
    FORMULA.height /
    (body.lines.length * FORMULA.line + (body.lines.length - 1) * FORMULA.leading);
  const size = Math.max(
    FORMULA.minSize,
    Math.min(FORMULA.maxSize, Math.floor(Math.min(byWidth, byHeight))),
  );

  return (
    <>
      <style>{MATH_RESET}</style>
      <Heading scene={scene} frame={frame} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: size * FORMULA.leading,
          // The heading has its own margin; this pulls the block back to the optical centre of
          // what is left, which is where a single equation wants to sit.
          paddingBottom: SPACE.xxl,
        }}
      >
        {body.lines.map((line, index) => {
          const state = stateOf(index);
          return (
            <div
              key={line.tex}
              style={{
                ...reveal(frame, contentDelay(index)),
                fontSize: size,
                color: mix(COLORS.dormant, COLORS.paper, state.degree),
                opacity: 0.55 + 0.45 * state.degree,
                filter:
                  state.heat > 0.01
                    ? `drop-shadow(0 0 ${34 * state.heat}px ${withAlpha(COLORS.flare, 0.55 * state.heat)})`
                    : "none",
                transform: `translateY(${(1 - state.degree) * 5}px) scale(${1 + 0.012 * state.heat})`,
              }}
              dangerouslySetInnerHTML={{ __html: setFormula(line.tex) }}
            />
          );
        })}
      </div>
    </>
  );
}

/**
 * **series** — the content is a bounded population, and the composition is its size.
 *
 * The eleventh archetype, and the only one whose extent comes from a *number* rather than from how
 * much the author wrote. Everything else here draws what was typed; this draws sixty-four things
 * from one line, which is the entire reason the role exists — a presentation could previously show
 * one unit of work and could only assert that unit becoming repeated work.
 *
 * Three derivations, none of them reachable from the source:
 *
 *     count            ->  the arrangement            (`./series.ts`)
 *     arrangement+box  ->  the size of a member
 *     measured span    ->  how much of it has happened
 *
 * **Members fill in reading order** — left to right, top to bottom — because that is the order a
 * viewer will count them in, and an order nobody has to be told is an order that costs no
 * narration. The frontier is a *wave* rather than a switch: the member the fill is passing is part
 * way in, so a population accumulating over four seconds reads as something happening rather than
 * as sixty-four separate pops.
 *
 * **The colour vocabulary is the deck's, unchanged** (decision:23). A member that has not happened
 * is `future`: present, dim, and legible as structure, so the field's *size* is readable from the
 * first frame and only its state changes. A member that has happened is normal. The accent is
 * spent on the frontier alone, which is the moment, and it settles behind it.
 *
 * **Groups are the elements** and their own state drives their own members, which is what lets a
 * schedule show sixteen words already present while forty-eight accumulate — with no second visual
 * language for "given" against "derived", because the *state* already says it and then stops
 * saying it once they are all just words.
 */
function Series({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  const body = scene.body;
  if (body.kind !== "series") return null;

  const groups = body.groups;
  const total = seriesTotal(groups);
  const shape = fieldShape(total);

  // How far each group has got: a span fills it across a sentence, an anchor lands it at a
  // moment, and a group the narration never mentions is simply there — the same default every
  // unanchored element in this deck has had since decision:14.
  const stateOf = anchorStatesFor(scene, absoluteFrame);
  const spanOf = new Map(scene.spans.map((span) => [span.elementIndex, span]));
  const progressOf = (index: number): number => {
    const span = spanOf.get(index);
    if (span === undefined) return stateOf(index).degree;
    return clamp((absoluteFrame - span.from) / span.durationInFrames);
  };

  const { cell, gap } = cellSize(shape, {
    width: FIELD.maxWidth,
    height: FIELD.height,
  });
  const done = groups.reduce(
    (sum, group, index) => sum + membersDone(group.count, progressOf(index)),
    0,
  );

  return (
    <>
      <Heading scene={scene} frame={frame} />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: SPACE.xxl,
          marginTop: SPACE.lg,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${shape.columns}, ${cell}px)`,
            gap,
          }}
        >
          {groups.flatMap((group, groupIndex) => {
            const progress = progressOf(groupIndex);
            const before = groupOffset(groups, groupIndex);
            return Array.from({ length: group.count }, (_, member) => {
              const filled = memberFill(member, group.count, progress);
              // The frontier: bright while the wave is on it, gone once it has passed.
              const edge = filled > 0 && filled < 1 ? filled : 0;
              return (
                <div
                  key={before + member}
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: Math.max(2, cell * 0.16),
                    border: `${FIELD.stroke}px solid ${mix(
                      COLORS.hairline,
                      COLORS.flare,
                      Math.max(filled * 0.5, edge),
                    )}`,
                    backgroundColor: withAlpha(
                      COLORS.paper,
                      0.02 + 0.46 * filled * filled,
                    ),
                    boxShadow:
                      edge > 0.01
                        ? `0 0 ${20 * edge}px ${withAlpha(COLORS.accent, 0.75 * edge)}`
                        : "none",
                    ...reveal(frame, contentDelay(0)),
                  }}
                />
              );
            });
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xl }}>
          {/* The running count, derived from the same progress the field is drawn from, so it
              cannot disagree with what is on screen. Large, because it is the fact the whole
              composition exists to make checkable rather than a readout beside one. */}
          <div style={{ display: "flex", alignItems: "baseline", gap: SPACE.sm }}>
            <span
              style={{
                ...heading,
                fontSize: TYPE.title,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                ...reveal(frame, contentDelay(0)),
              }}
            >
              {done}
            </span>
            <span
              style={{
                ...heading,
                fontSize: TYPE.row,
                lineHeight: 1,
                color: COLORS.dim,
                ...reveal(frame, contentDelay(0)),
              }}
            >
              of {total}
            </span>
          </div>

          {/* What the members are. One row per group, in the deck's item voice, carrying its own
              group's state — so a group that has not happened reads recessive exactly as an
              unreached bullet does, and stops doing so once it has. */}
          <div style={{ display: "flex", flexDirection: "column", gap: SPACE.md }}>
            {groups.map((group, index) => (
              <div
                key={group.text}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: SPACE.sm,
                  fontSize: TYPE.ordinal,
                  maxWidth: 620,
                  ...establishedText(stateOf(index), COLORS.muted),
                  ...reveal(frame, contentDelay(index + 1)),
                }}
              >
                <span
                  style={{
                    ...heading,
                    fontSize: TYPE.ordinal,
                    color: COLORS.accent,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {group.count}
                </span>
                <span>{group.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
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
function Atlas({
  scene,
  absoluteFrame,
  scope = ROOT_SCOPE,
  span,
  trail = [],
}: {
  scene: Scene;
  absoluteFrame: number;
  /** Which scope's world this is. `root` on a slide; deeper inside a child module. */
  scope?: Scope;
  /** The frames this world is on screen for, when that is not the whole scene. */
  span?: { from: number; until: number; revealTravel?: number };
  /** The labels of the scopes above this one, outermost first. Empty at the root. */
  trail?: readonly string[];
}) {
  const frame = useCurrentFrame();
  const world = worldOf(scene.body);
  // The one composition that has no margin to give up, so it gives up the shot instead.
  //
  // `Frame` lets an atlas bleed because a place larger than the window has no edges to respect,
  // and dragon:21 accepted that a subtitle would therefore be *overlaid* on it. Watched on
  // `examples/orpheus-failover.yaml`, that turned out to be worse than it sounds: a world node is
  // a filled plate with its own glow, and `HALO` is tuned for text over a field, so the node's
  // label and the sentence annihilate each other rather than one winning. The frame that decided
  // it prints "traffic" on top of "that now".
  //
  // So the camera is handed the region the narration left rather than the whole frame. It is told
  // about a smaller *viewport*, and nothing else: the same events, the same span, the same shots
  // in the same order at the same frames. Zero without subtitles, which is why every world deck
  // written before this renders byte-identical.
  const band = useSubtitleBand();
  const viewport = { width: 1920, height: 1080 - band };
  const aspect = viewport.width / viewport.height;
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
    // Only an *inline* interior opens by being talked about. A module is entered because the
    // narration said `enter:`, and merely lighting up the concept that has one is not that —
    // an author who mentions paying before going inside it should get a plate, not a room.
    const openable = new Set(
      world.entities
        .filter((entity) => entity.detail !== undefined && entity.module === undefined)
        .map((entity) => entity.id),
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
      { from: span?.from ?? scene.from, until: span?.until ?? revealFrom(scene) },
      aspect,
      {
        calls: scheduledCalls(scene, scope),
        ...(span?.revealTravel === undefined ? {} : { revealTravel: span.revealTravel }),
      },
    );
  }, [layout, world, scene, scope, span, aspect]);

  if (layout === undefined || world === undefined || plan === undefined) return null;

  const view = cameraAt(plan.track, absoluteFrame);
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
                scope={scope}
                trail={[...trail, scene.title]}
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
        {/* Where the viewer is, when "here" has stopped being obvious.
            One world looks like a world; three worlds nested inside each other look like a
            world, and the frame has no other way to say which one. So a scope — and only a
            scope — carries the labels it was reached through, in the order they were entered.
            Nothing is authored: the trail is the structural address (`scope.ts`) with each
            segment shown as the label already on the plate it came from, which is why it cannot
            drift from what the viewer actually saw. A deck that never descends never sees it. */}
        {trail.length > 0 ? (
          <div
            style={{
              marginTop: SPACE.md,
              fontSize: TYPE.ordinal,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: COLORS.dim,
              textShadow: `0 2px 24px ${withAlpha("#05070B", 0.9)}`,
            }}
          >
            {trail.join("  ›  ")}
          </div>
        ) : null}
        <h1
          style={{
            ...heading,
            marginTop: trail.length > 0 ? SPACE.sm : SPACE.md,
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
/**
 * The excursions this scope was told to make, paired up.
 *
 * `scene.calls` is the whole scene's descent, at every depth, in one list; a world only wants the
 * ones made *from* where it is standing. Pairing is by the scope entered, which is unique per
 * call because an entity may be entered at most once — so a missing half is a compiler bug and
 * is dropped rather than half-rendered.
 */
function scheduledCalls(scene: Scene, scope: Scope): readonly ScheduledCall[] {
  const opened = scene.calls.filter(
    (call) => call.scope === scope && call.kind === "enter",
  );
  return opened.flatMap((enter) => {
    const exit = scene.calls.find(
      (call) => call.kind === "exit" && call.into === enter.into,
    );
    return exit === undefined
      ? []
      : [
          {
            target: enter.target,
            enterFrame: enter.frame,
            enterWindow: enter.durationInFrames,
            exitFrame: exit.frame,
            exitWindow: exit.durationInFrames,
          },
        ];
  });
}

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
/**
 * The edges a plate lost, as one stub per direction with the count it stands for.
 *
 * decision:54's counts under the title are an aggregate — they say how many transitions are missing
 * and cannot say *where*. In `examples/leases-narrated.yaml`, `Running` draws four of its seven
 * exits, and without this nothing on the frame says so. Omitting a state is announced in the counts;
 * understating a state that was **kept** was announced nowhere, and that is the more damaging of the
 * two because it is a claim about a state the picture chose to show.
 *
 * Four decisions, and each has a refusal behind it.
 *
 * **One stub per direction, not one per dropped edge.** Three separate stubs off `Running` would be
 * three roads to nowhere and would read as topology. One stub carrying `3` is a footnote.
 *
 * **It carries a number.** A stub without one says "something is missing", which is the `…`
 * decision:49 threw out of the ledger for saying less than nothing.
 *
 * **Horizontal, on the flanks.** Every real transition in a top-down layout arrives from above and
 * leaves below, so a mark on the left or right cannot be misread as part of the flow. Incoming sits
 * left and points *into* the plate; outgoing sits right and points *away*. Both arrowheads run the
 * same direction, so the pair reads as through-flow rather than as two unrelated ornaments — and
 * the outgoing one starts outside `node.box`, which is past any room reserved for a self-loop.
 *
 * **Dashed, in the topology's steel, below the weight of a real edge.** Never the accent: the one
 * warm thing on a machine frame is occupancy, and a footnote competing with it would be answering a
 * question nobody asked at the cost of the one the composition exists to answer.
 */
function ElisionStubs({
  layout,
  elisions,
  opening,
}: {
  layout: MachineLayout;
  elisions: ReadonlyMap<string, Elision>;
  opening: number;
}) {
  const { bounds } = layout;
  if (elisions.size === 0) return null;

  // On the plate's own boundary, at no distance at all, and on a diagonal.
  //
  // sprint:23 put these on the flank, outside everything reserved beside the plate. That is right
  // from the geometry and wrong from the frame: `Running` has a self-loop whose reserved room
  // includes its caption, so its stub landed some five hundred units away, vertically aligned with
  // the plate and directly right of `lease renewed`. A mark that far off has to be worked out
  // rather than read, and the gap that fixed the crowding made every uncrowded plate worse.
  //
  // A diagonal off the pill's corner is one rule for every plate, with no branch on whether a loop
  // is present. It works because a self-loop attaches within the plate's middle band
  // (`MACHINE.loopSpread`) and bulges sideways, so a corner diagonal is always outside it — and
  // because every real transition in a top-down layout runs broadly vertically, so forty-five
  // degrees is not a direction the flow uses.
  const marks: {
    key: string;
    from: Point;
    to: Point;
    at: Point;
    count: number;
    anchor: "start" | "end";
  }[] = [];
  const DIAGONAL = Math.SQRT1_2;
  for (const node of layout.nodes) {
    const mark = elisions.get(node.id);
    if (mark === undefined) continue;
    const { x, y, width, height } = node.rect;
    const radius = Math.min(MACHINE.plateRadius, height / 2);
    const middle = y + height / 2;
    const step = (n: number) => n * DIAGONAL;

    if (mark.in > 0) {
      // Straight into the plate's left edge, level with it.
      //
      // Not the mirror of the outgoing diagonal, and the asymmetry is the finding rather than an
      // oversight. Up-and-left was tried first and clipped: `Queued` is the topmost plate, the
      // layout's bounds end at its top edge, and the canonical overview is fitted to those bounds —
      // so a mark reaching above the highest node is drawn outside the only frame the film has.
      // The composition has room below its lowest plate and beside its leftmost. It has none above
      // its highest, and a stub is not allowed to ask for any.
      //
      // Level-left is available because the left flank is the one side never reserved: a self-loop
      // always lives on the right (`selfLoop`). So each direction takes the side that is free for
      // it, which is one rule per mark rather than one rule with a branch inside it.
      const tip = { x, y: middle };
      const tail = { x: tip.x - MACHINE.stubReach, y: middle };
      marks.push({
        key: `${node.id}-in`,
        from: tail,
        to: tip,
        at: { x: tail.x - MACHINE.stubGap, y: middle },
        count: mark.in,
        anchor: "end",
      });
    }
    if (mark.out > 0) {
      // Leaves the lower-right, travelling down and right away from the plate.
      const root = { x: x + width - radius + step(radius), y: middle + step(radius) };
      const tip = {
        x: root.x + step(MACHINE.stubReach),
        y: root.y + step(MACHINE.stubReach),
      };
      marks.push({
        key: `${node.id}-out`,
        from: root,
        to: tip,
        at: { x: tip.x + step(MACHINE.stubGap), y: tip.y + step(MACHINE.stubGap) },
        count: mark.out,
        anchor: "start",
      });
    }
  }

  return (
    <svg
      width={bounds.width}
      height={bounds.height}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      style={{
        position: "absolute",
        left: bounds.x,
        top: bounds.y,
        overflow: "visible",
        opacity: opening,
      }}
    >
      {marks.map((mark) => (
        <g key={mark.key}>
          <path
            d={`M ${mark.from.x} ${mark.from.y} L ${mark.to.x} ${mark.to.y}`}
            fill="none"
            stroke={withAlpha(MACHINE.edge, 0.5)}
            strokeWidth={MACHINE.edgeStroke * 0.8}
            strokeLinecap="round"
            strokeDasharray="14 12"
          />
          <ArrowHead points={[mark.from, mark.to]} color={MACHINE.edge} opacity={0.55} />
          <text
            x={mark.at.x}
            y={mark.at.y}
            fill={withAlpha(MACHINE.edge, 0.92)}
            fontSize={MACHINE.event}
            fontFamily={FONT_STACK}
            fontWeight={600}
            textAnchor={mark.anchor === "start" ? "start" : "end"}
            dominantBaseline="central"
          >
            {mark.count}
          </text>
        </g>
      ))}
    </svg>
  );
}

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
  scope,
  trail,
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
  /** The scope this plate lives in; what is inside it is one deeper. */
  scope: Scope;
  trail: readonly string[];
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
              pass={pass}
              absoluteFrame={absoluteFrame}
              scope={scope}
              trail={trail}
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
  pass,
  absoluteFrame,
  scope,
  trail,
}: {
  entity: AuthoredEntity;
  entities: readonly AuthoredEntity[];
  scene: Scene;
  pass: PortalPass;
  absoluteFrame: number;
  scope: Scope;
  trail: readonly string[];
}) {
  const detail = entity.detail;
  const range = interiorRange(entities, entity.id);
  if (detail === undefined || range === undefined) return null;

  const layout = chooseLayout({ title: entity.text, body: detail });
  const inner: Scene = {
    ...scene,
    title: entity.text,
    body: detail,
    layout,
    anchors: scene.anchors
      .filter(
        (anchor) =>
          anchor.elementIndex >= range.offset &&
          anchor.elementIndex < range.offset + range.count,
      )
      .map((anchor) => ({ ...anchor, elementIndex: anchor.elementIndex - range.offset })),
    // Spans are reindexed by the same rule, and the fact that this line was missing is worth a
    // comment. An interior whose population kept the *slide's* element index looked up nothing,
    // fell through to the unanchored default — established, because that is what an element the
    // narration never reaches is — and drew a field that was complete on its first frame and
    // never moved. It rendered perfectly and taught the opposite of the truth.
    spans: scene.spans
      .filter(
        (span) =>
          span.elementIndex >= range.offset &&
          span.elementIndex < range.offset + range.count,
      )
      .map((span) => ({ ...span, elementIndex: span.elementIndex - range.offset })),
    // The interior's own clock origin. Everything inside is sequenced from the moment the
    // chamber opened, so a portal nested one deeper measures its own opening against this
    // rather than against the slide — which is what keeps the offsets from compounding.
    from: pass.enterFrame,
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        // A world is the one composition larger than its frame, so it gets the frame whole —
        // the same full-bleed rule `Slide` applies to an atlas, applied one scale down.
        ...(layout === "atlas"
          ? {}
          : { padding: `${FRAME.marginY}px ${FRAME.marginX}px` }),
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT_STACK,
      }}
    >
      <Composition
        scene={inner}
        absoluteFrame={absoluteFrame}
        scope={childScope(scope, entity.id)}
        trail={trail}
        // The world inside opens as the chamber does, and has pulled back to the whole of
        // itself by the time the chamber starts closing — so the two scales contract together
        // and leaving reads as one movement rather than as a diagram being put away.
        span={{
          from: pass.enterFrame,
          until: pass.exitFrame,
          revealTravel: pass.exitFrames,
        }}
      />
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
/* ------------------------------------------------------------- transcript */

/**
 * How an exchange behaves over time.
 *
 * The atlas activates things a viewer is already looking at, and the world stretches that envelope
 * because the camera is still travelling when a plate ignites. A transcript needs a third shape
 * again, and the reason is the one thing this composition has that neither of the others does: an
 * event here is not an *arrival*, it is a *current step*, and it stays current until the next one
 * starts — however long the sentence over it runs.
 *
 * So the envelope below covers only the arrival, and everything about "is this the thing happening
 * now" is read off the beat instead (`Beat.durationInFrames`). `sweep` is the arrow crossing, which
 * is the one number a viewer times their reading against, and it is deliberately quick: an arrow
 * that takes a second to cross is a diagram animating itself, and an arrow that snaps is an edit.
 */
const TRANSCRIPT_TIMING: AnchorTiming = {
  establish: 14,
  heatRise: 4,
  heatHold: 11,
  heatFall: 26,
  sweep: 13,
} as const;

/**
 * How much of its presence a message keeps once the explanation has moved on.
 *
 * A protocol accumulates, which is the problem this composition has and the atlas does not: after
 * twenty messages a frame drawn at one contrast is a wall of arrows, and the twenty-first has to
 * be findable in it without anything having been thrown away. decision:23 already settled the
 * principle — spend the contrast on the moment, and let established be normal — and this is that
 * principle applied to a *sequence* rather than a set, where "established" has a depth.
 *
 * Two floors rather than one, and the gap between them is the whole policy. The **arrow** keeps
 * more, because the shape of what has happened is the causal chain and a viewer glancing back
 * needs to see it. The **label** keeps less, because the words are detail: nobody re-reads message
 * four while message twelve is being explained, and a frame of twenty legible labels competes with
 * the one being spoken about. Halving per step reaches the floor after three, which is about how
 * far back a viewer's working memory of a trace actually goes.
 */
const HISTORY = {
  arrow: 0.28,
  label: 0.15,
  decay: 0.5,
} as const;

function presence(age: number, floor: number): number {
  if (age <= 0) return 1;
  return floor + (1 - floor) * HISTORY.decay ** age;
}

/**
 * An ordered exchange, as a place the camera moves down through.
 *
 * Two things distinguish it from the atlas, and both are consequences of time being an axis.
 *
 * **What has not happened is not drawn.** A world is a structure that exists before anything is
 * said about it, so the atlas draws all of it faintly from the first frame and lets narration light
 * it. A protocol is not like that: a message that has not been sent is not context, it is a
 * spoiler, and `targetBounds` already refuses to frame one for exactly this reason. So the lanes
 * and the lifelines are there from the start — that is the cast and the running time, and both are
 * facts before the film begins — and the traffic arrives as it happens.
 *
 * **The camera scrolls rather than tours.** `shotFor` is doing all of the work and no rule was
 * added for it: a step whose lanes are already well inside the frame produces no key at all, which
 * is why repeated traffic between two services sits perfectly still, and a step that leaves the
 * frame produces one, which is why the picture descends in deliberate moves rather than creeping.
 */
function Transcript({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  const protocol = protocolOf(scene.body);
  const layout = useMemo(
    () => (protocol === undefined ? undefined : layoutProtocol(protocol)),
    [protocol],
  );
  // The atlas's argument, applied to the other composition that bleeds. A transcript has never
  // actually been caught printing traffic on a sentence — `TRANSCRIPT.lookaheadRows` keeps a row
  // of unhappened messages below the active one, so the bottom of the frame is usually field —
  // but "usually" is what dragon:21 said about the atlas too, and the same one-line answer is
  // available here. Zero without subtitles.
  const band = useSubtitleBand();
  const viewport = { width: 1920, height: 1080 - band };
  const aspect = viewport.width / viewport.height;
  const plan = useMemo(
    () =>
      layout === undefined
        ? undefined
        : transcriptPlan(
            layout,
            scene.beats,
            { from: scene.from, until: scene.from + scene.durationInFrames },
            aspect,
          ),
    [layout, scene, aspect],
  );

  if (layout === undefined || plan === undefined) return null;

  const view = cameraAt(plan.track, absoluteFrame);
  const scale = viewport.width / view.width;

  // Which step the film is on, and therefore how far back every other one is. One number, read
  // off the beats, and the only piece of state this composition has.
  const current = scene.beats.reduce(
    (latest, beat) => (beat.from <= absoluteFrame ? beat.index : latest),
    -1,
  );
  const active = layout.messages[current];
  const involved = new Set(active === undefined ? [] : [active.from, active.to]);

  // An actor is an ordinary element, so a prologue may reach one by name exactly as it reaches a
  // bullet — and when it does, the lane lights up. The camera is deliberately *not* told: before
  // any traffic there is nothing to frame but the cast, and a shot that chased a mentioned name
  // would be leaving the establishing shot to look at a column.
  const laneStates = anchorStatesFor(scene, absoluteFrame, TRANSCRIPT_TIMING);
  const lit = (lane: Lane): boolean =>
    involved.has(lane.id) || laneStates(lane.index).heat > 0.12;

  const stateOf = (index: number): AnchorState => {
    const beat = scene.beats.find((entry) => entry.index === index);
    return beat === undefined
      ? { degree: 0, heat: 0, sweep: 0 }
      : anchorState(absoluteFrame, beat.from, TRANSCRIPT_TIMING);
  };

  /**
   * How far a lane has arrived, 0 to 1.
   *
   * A column's **first** tenant has held it since before the film began, so it is simply there —
   * that is the cast, and the cast is a fact before anything is sent. A **later** tenant is not:
   * the column belonged to somebody else until the terminator above it, and a plate that had merely
   * always been sitting there would read as the previous party's name changing, which is the one
   * thing this round is not allowed to let happen. So a reclaiming actor is *established*, on the
   * approach to the step that brings it into the story, and the camera is already travelling
   * towards that step when it lands.
   */
  const arrivedAt = (lane: Lane): number => {
    if (lane.ordinal === 0) return 1;
    const beat = scene.beats.find((entry) => entry.index === lane.first);
    if (beat === undefined) return 1;
    return interpolate(absoluteFrame, [beat.from - 20, beat.from - 2], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease,
    });
  };

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

  // The deck's title labels the exchange, and it is only wanted while the exchange has not started
  // — after that the rail is at the top of the frame and two things there is one too many. Derived
  // from the first beat rather than scheduled: the title is present exactly while nothing has
  // happened yet, which is what an establishing shot is.
  const opened = scene.beats[0]?.from ?? Number.POSITIVE_INFINITY;
  const titling = interpolate(absoluteFrame, [opened - 10, opened + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, overflow: "hidden" }}>
      <div style={place(TRANSCRIPT.gridParallax)}>
        <Field
          opacity={0.42 * opening}
          step={TRANSCRIPT.gridStep * 3}
          scale={scale * TRANSCRIPT.gridParallax}
        />
      </div>
      <div style={place(1)}>
        <Field opacity={0.7 * opening} step={TRANSCRIPT.gridStep} scale={scale} />
        <Traffic
          layout={layout}
          current={current}
          stateOf={stateOf}
          lit={lit}
          opening={opening}
          arrivedAt={arrivedAt}
        />
        {layout.lanes.map((lane) => (
          <LanePlate
            key={lane.id}
            lane={lane}
            live={lit(lane)}
            opening={opening}
            arrived={arrivedAt(lane)}
          />
        ))}
        {layout.messages.map((message) => (
          <MessageLabel
            key={message.index}
            message={message}
            lane={layout.byId.get(message.from) as Lane}
            age={current - message.index}
            state={stateOf(message.index)}
          />
        ))}
      </div>

      {/* Screen space: the horizon the descending exchange is seen against, and the reason the
          edges of the frame do not read as the edges of the diagram. */}
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse 80% 76% at 50% 46%, ${withAlpha("#05070B", 0)} 0%, ` +
            `${withAlpha("#05070B", 0.2)} 60%, ${withAlpha("#04060A", 0.66)} 100%)`,
          pointerEvents: "none",
        }}
      />

      <Rail
        layout={layout}
        view={view}
        aspect={aspect}
        lit={lit}
        opening={opening}
        current={current}
      />

      <div
        style={{
          position: "absolute",
          left: FRAME.marginX,
          top: FRAME.marginY,
          ...reveal(frame, 0),
          opacity: (reveal(frame, 0).opacity as number) * titling,
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
 * The lifelines, the arrows, and the bars that say who is holding what.
 *
 * One SVG in world coordinates, exactly as `Relations` is, because these are strokes rather than
 * text and a stroke wants to be in the coordinate system it is measured in.
 *
 * Three pieces of notation here were derived rather than authored, and none of them has a key:
 * a **reply** is dashed, because the stack the message order implies already knows which messages
 * answer which; an actor **holding an unanswered call** carries a bar for exactly as long as it is
 * holding it; and the arrow takes its **colour from the sender's lane**, so a message's origin is
 * legible even where the tail of it is off the frame.
 */
function Traffic({
  layout,
  current,
  stateOf,
  lit,
  opening,
  arrivedAt,
}: {
  layout: ProtocolLayout;
  current: number;
  stateOf: (index: number) => AnchorState;
  lit: (lane: Lane) => boolean;
  opening: number;
  arrivedAt: (lane: Lane) => number;
}) {
  const { bounds } = layout;
  return (
    <svg
      width={bounds.width}
      height={bounds.height}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      style={{ position: "absolute", left: bounds.x, top: bounds.y, overflow: "visible" }}
    >
      {/* A lifeline is drawn over its **tenancy**, not over the whole film. On every protocol that
          reclaims nothing that is the whole film, and the picture is the one it always was. Where a
          column does change hands, the outgoing line stops in a cap — a fact about the slot, and
          never a claim that the party is finished — and the incoming one starts under its own new
          plate, with a stretch of empty column between them that reads as what it is. */}
      {layout.lanes.map((lane) => {
        const arrived = arrivedAt(lane);
        if (arrived <= 0) return null;
        const hue = flowColor(lane.depth);
        return (
          <g key={lane.id} opacity={arrived}>
            <line
              x1={lane.x}
              y1={lane.lifelineTop}
              x2={lane.x}
              y2={lane.lifelineBottom}
              stroke={withAlpha(hue, (lit(lane) ? 0.5 : 0.19) * opening)}
              strokeWidth={TRANSCRIPT.lifeline}
              strokeDasharray={`${TRANSCRIPT.lifeline * 5} ${TRANSCRIPT.lifeline * 7}`}
            />
            {lane.handsOver ? (
              <>
                <line
                  x1={lane.x}
                  y1={lane.lifelineBottom - TRANSCRIPT.terminatorRun}
                  x2={lane.x}
                  y2={lane.lifelineBottom}
                  stroke={withAlpha(hue, 0.62 * opening)}
                  strokeWidth={TRANSCRIPT.lifeline * 1.6}
                />
                <line
                  x1={lane.x - TRANSCRIPT.terminator}
                  y1={lane.lifelineBottom}
                  x2={lane.x + TRANSCRIPT.terminator}
                  y2={lane.lifelineBottom}
                  stroke={withAlpha(hue, 0.72 * opening)}
                  strokeWidth={TRANSCRIPT.lifeline * 3.2}
                  strokeLinecap="round"
                />
              </>
            ) : null}
          </g>
        );
      })}

      {layout.activations.map((bar, index) => (
        <ActivationBar
          key={index}
          bar={bar}
          layout={layout}
          current={current}
          stateOf={stateOf}
        />
      ))}

      {layout.messages.map((message) => (
        <Arrow
          key={message.index}
          message={message}
          hue={flowColor((layout.byId.get(message.from) as Lane).depth)}
          age={current - message.index}
          state={stateOf(message.index)}
        />
      ))}
    </svg>
  );
}

/**
 * One message, drawn as it crosses.
 *
 * The stroke is dashed onto the path rather than animated as a length, so a self-message's hook
 * draws itself in the same gesture and with the same code as a straight arrow — direction and
 * shape are the path's problem, and crossing is this function's.
 */
function Arrow({
  message,
  hue,
  age,
  state,
}: {
  message: Message;
  hue: string;
  age: number;
  state: AnchorState;
}) {
  if (state.sweep <= 0) return null;

  const strength = presence(age, HISTORY.arrow);
  const color = mix(hue, COLORS.flare, 0.7 * state.heat);
  const opacity = Math.min(1, strength + 0.4 * state.heat);
  const drawn = state.sweep;

  const path = message.self
    ? `M ${message.x1} ${message.y} ` +
      `L ${message.x1 + TRANSCRIPT.selfWidth} ${message.y} ` +
      `L ${message.x1 + TRANSCRIPT.selfWidth} ${message.y + TRANSCRIPT.selfDrop} ` +
      `L ${message.x1} ${message.y + TRANSCRIPT.selfDrop}`
    : `M ${message.x1} ${message.y} L ${message.x2} ${message.y}`;
  const length = message.self
    ? TRANSCRIPT.selfWidth * 2 + TRANSCRIPT.selfDrop
    : Math.abs(message.x2 - message.x1);

  // Where the head sits, and which way it points. Both are the path's last leg, which is
  // horizontal in every case this composition can produce.
  const tipX = message.self ? message.x1 : message.x2;
  const tipY = message.self ? message.y + TRANSCRIPT.selfDrop : message.y;
  const leftward = message.self || message.x2 < message.x1;

  return (
    <g opacity={opacity}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={TRANSCRIPT.arrow}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={
          message.reply
            ? `${TRANSCRIPT.arrow * 3.4} ${TRANSCRIPT.arrow * 2.6}`
            : `${length} ${length}`
        }
        strokeDashoffset={message.reply ? 0 : length * (1 - drawn)}
        // A dashed reply cannot also be dashed *on*, so it wipes with a clip instead.
        clipPath={message.reply ? `url(#reply-${message.index})` : undefined}
      />
      {message.reply ? (
        <defs>
          <clipPath id={`reply-${message.index}`}>
            <rect
              x={Math.min(message.x1, message.x2) - TRANSCRIPT.arrow}
              y={message.y - TRANSCRIPT.arrow * 3}
              width={Math.abs(message.x2 - message.x1) * drawn + TRANSCRIPT.arrow * 2}
              height={TRANSCRIPT.arrow * 6}
              transform={
                leftward
                  ? `translate(${Math.abs(message.x2 - message.x1) * (1 - drawn)}, 0)`
                  : undefined
              }
            />
          </clipPath>
        </defs>
      ) : null}
      <polygon
        points={headPoints(tipX, tipY, leftward)}
        fill={color}
        opacity={interpolate(drawn, [0.72, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
    </g>
  );
}

/** A horizontal arrow head. Every arrow this composition draws ends on a horizontal leg. */
function headPoints(x: number, y: number, leftward: boolean): string {
  const size = TRANSCRIPT.arrowHead;
  const back = leftward ? x + size : x - size;
  const spread = size * 0.42;
  return `${x},${y} ${back},${y - spread} ${back},${y + spread}`;
}

/**
 * The bar an actor carries while it is holding a call it has not answered.
 *
 * It grows at the rate the film runs rather than appearing whole: its bottom edge is wherever the
 * exchange currently is, so a bar that is still open reads as *still open* rather than as a
 * rectangle that was drawn in advance.
 */
function ActivationBar({
  bar,
  layout,
  current,
  stateOf,
}: {
  bar: Activation;
  layout: ProtocolLayout;
  current: number;
  stateOf: (index: number) => AnchorState;
}) {
  const lane = layout.byId.get(bar.lane);
  if (lane === undefined || current < bar.from) return null;

  const closes = bar.to;
  const settled =
    closes !== undefined && current >= closes ? 1 : stateOf(bar.from).degree * 0.001;
  // Reaching: while the call is open the bar follows the current row down.
  const reached =
    closes !== undefined && current >= closes
      ? bar.y + bar.height
      : Math.min(
          bar.y + bar.height,
          (layout.messages[Math.max(bar.from, current)] as Message).y,
        );
  // Never a square: a bar that begins as a dot on the lifeline reads as an artifact rather
  // than as work starting.
  const height = Math.max(TRANSCRIPT.activation * 2.2, reached - bar.y + settled);

  const width = TRANSCRIPT.activation;
  return (
    <rect
      x={lane.x - width / 2 + bar.depth * width * 0.62}
      y={bar.y}
      width={width}
      height={height}
      rx={3}
      fill={withAlpha(flowColor(lane.depth), 0.17)}
      stroke={withAlpha(flowColor(lane.depth), 0.4)}
      strokeWidth={1.5}
    />
  );
}

/**
 * One actor, as a plate at the head of its tenancy.
 *
 * "Head of its tenancy" rather than "head of its lane" is the whole of the change: a column's first
 * tenant has held it since before the film began, so its plate is in the cast row exactly as it
 * always was, and a later one takes possession further down and has to be *seen* to. The arrival
 * treatment is deliberately small — a lift and a moment of the live border — because a party
 * entering the story is an event in the exchange, not a transition in a slide deck.
 */
function LanePlate({
  lane,
  live,
  opening,
  arrived,
}: {
  lane: Lane;
  live: boolean;
  opening: number;
  arrived: number;
}) {
  const hue = flowColor(lane.depth);
  if (arrived <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: lane.plate.x,
        top: lane.plate.y,
        transform: lane.ordinal === 0 ? undefined : `translateY(${(1 - arrived) * 26}px)`,
        width: lane.plate.width,
        height: lane.plate.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        borderRadius: TRANSCRIPT.plateRadius,
        border: `${TRANSCRIPT.plateStroke}px solid ${withAlpha(hue, live ? 0.85 : 0.42)}`,
        backgroundColor: withAlpha(hue, live ? 0.14 : 0.06),
        boxShadow: live ? `0 0 ${64}px ${withAlpha(hue, 0.22)}` : undefined,
        opacity: opening * arrived,
        fontSize: TRANSCRIPT.actor,
        lineHeight: TRANSCRIPT.actorLineHeight,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: live ? COLORS.paper : COLORS.muted,
        padding: `0 ${TRANSCRIPT.actorPadX}px`,
      }}
    >
      <span>
        {lane.lines.map((line, index) => (
          <span key={index} style={{ display: "block" }}>
            {line}
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * A message's label.
 *
 * Set on a chip of the deck background, which is the whole of the collision policy: a label is
 * centred on its arrow, an arrow between distant lanes crosses every lifeline in between, and text
 * laid straight over a hairline is the one thing that makes a diagram look uncomposed. The chip is
 * the background rather than a card — no border, no radius worth noticing — so what it reads as is
 * the label having priority over the line, which is true.
 */
function MessageLabel({
  message,
  lane,
  age,
  state,
}: {
  message: Message;
  lane: Lane;
  age: number;
  state: AnchorState;
}) {
  if (state.sweep <= 0) return null;
  const strength = presence(age, HISTORY.label);
  const arriving = interpolate(state.sweep, [0.15, 0.75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        // Positioned by its centre and sized to its content, so what the layout measured and what
        // the browser draws cannot disagree. Letting CSS re-wrap would put a second break in a
        // label the layout had already decided was one line — which is how a sixty-character
        // digest came out as a full line and an orphaned `c1d2` underneath it.
        left: message.self ? message.label.x : message.label.x + message.label.width / 2,
        top: message.label.y - TRANSCRIPT.messageGap * 0.4,
        transform: message.self ? undefined : "translateX(-50%)",
        width: "max-content",
        maxWidth: "none",
        whiteSpace: "nowrap",
        padding: `${TRANSCRIPT.messageGap * 0.4}px ${TRANSCRIPT.messageGap}px`,
        textAlign: message.self ? "left" : "center",
        fontSize: TRANSCRIPT.message,
        lineHeight: TRANSCRIPT.messageLineHeight,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        color: mix(COLORS.dormant, age <= 0 ? COLORS.paper : COLORS.muted, strength),
        opacity: arriving * Math.min(1, strength + 0.5 * state.heat),
        backgroundColor: withAlpha(COLORS.ink, 0.82),
        borderRadius: 5,
        textShadow:
          age <= 0 ? `0 0 26px ${withAlpha(flowColor(lane.depth), 0.5)}` : undefined,
      }}
    >
      {message.lines.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  );
}

/**
 * Who is in which lane, pinned to the top of the frame.
 *
 * The one piece of screen-space chrome in this composition, and the defect it fixes is specific:
 * a protocol is *tall*, so within four or five messages the camera has scrolled the plates off the
 * top, and from then on a viewer looking at an arrow between the third and sixth columns has no
 * way to find out who those are. Every other answer is worse — drawing the names again further
 * down would put the cast list inside the traffic, and refusing to scroll would mean either a
 * shot too wide to read or a protocol of five messages.
 *
 * Nothing here is authored and nothing is scheduled. Positions are the lanes' own, through the
 * same camera transform the world uses, so a name is always exactly above its lifeline; the band
 * appears in proportion to how much of the real cast has left the frame, so on a short protocol
 * that never scrolls it never appears at all; and the active pair is lit the same way their plates
 * would have been. It is the plates, seen from where the camera now is.
 *
 * It names **who holds each column now**, which is why it is the safety net under lane reuse: a
 * viewer who missed a handover — because the camera was three columns away when it happened — can
 * still never be told the wrong name. Tenancy changes exactly where the arrival plate is drawn, so
 * the rail and the picture cannot disagree.
 */
function Rail({
  layout,
  view,
  aspect,
  lit,
  opening,
  current,
}: {
  layout: ProtocolLayout;
  view: Viewport;
  /** The shot's own aspect, which is the frame's only when no subtitle has taken a strip of it. */
  aspect: number;
  lit: (lane: Lane) => boolean;
  opening: number;
  current: number;
}) {
  const shown = viewRect(view, aspect);
  const cast = layout.cast;
  const visible =
    Math.max(
      0,
      Math.min(shown.y + shown.height, cast.y + cast.height) - Math.max(shown.y, cast.y),
    ) / Math.max(1, cast.height);
  const strength = 1 - smootherstep(Math.min(1, Math.max(0, visible)));
  if (strength <= 0.01) return null;

  const scale = 1920 / view.width;
  const pitch = layout.lanePitch * scale;
  const size = Math.min(30, Math.max(17, pitch * 0.1));

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        height: 152,
        opacity: strength * opening,
        pointerEvents: "none",
        background:
          `linear-gradient(${withAlpha(COLORS.ink, 0.94)} 0%, ` +
          `${withAlpha(COLORS.ink, 0.86)} 52%, ${withAlpha(COLORS.ink, 0)} 100%)`,
      }}
    >
      {layout.bySlot.map((held, slot) => {
        const lane = tenantAt(held, current);
        if (lane === undefined) return null;
        const x = (slot * layout.lanePitch - view.cx) * scale + 960;
        if (x < -pitch * 0.5 || x > 1920 + pitch * 0.5) return null;
        const live = lit(lane);
        const hue = flowColor(lane.depth);
        return (
          <div
            key={lane.id}
            style={{
              position: "absolute",
              left: x - pitch / 2,
              top: 34,
              width: pitch,
              textAlign: "center",
              fontSize: size,
              lineHeight: 1.16,
              fontWeight: 600,
              letterSpacing: "0.045em",
              textTransform: "uppercase",
              color: live ? COLORS.paper : COLORS.dim,
              textShadow: live ? `0 0 22px ${withAlpha(hue, 0.7)}` : undefined,
            }}
          >
            {lane.label}
            <div
              style={{
                margin: `${size * 0.42}px auto 0`,
                width: live ? 3 : 2,
                height: live ? 22 : 13,
                backgroundColor: withAlpha(hue, live ? 0.95 : 0.4),
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ circuit */

/**
 * The activation envelope a machine runs, and the shortest of the three.
 *
 * The atlas stretches decision:17's shape because a plate ignites at the word and the camera is
 * still a second away from it. A machine never has that problem: `MACHINE.lead` puts the camera
 * *there* before the traveller sets off, so an arrival happens in a frame that has already stopped
 * moving. What is left for the transient to do is mark the instant of arrival, and a transient over
 * a still frame is read immediately.
 *
 * It is also the only one of the three whose transient is not carrying the whole message. Occupancy
 * is persistent, so the flare says *now*, not *this one* — and a flare that outstayed the arrival
 * would start competing with the thing it was announcing.
 */
const CIRCUIT_TIMING: AnchorTiming = {
  establish: 18,
  heatRise: 5,
  heatHold: 12,
  heatFall: 28,
  sweep: 22,
} as const;

/**
 * How much of its presence a traversal keeps once the run has moved on.
 *
 * The transcript's problem, in a space that makes it worse. A protocol accumulates *downwards* and
 * the camera scrolls away from what it has finished with; a machine accumulates in place, on a map
 * whose whole point is that it does not move, so by the eighth occurrence the wake is drawn over
 * the same edges the ninth has to be found among.
 *
 * The floor is therefore high and the decay is quick. High, because the wake is the answer to *how
 * did it get here* and a wake that faded to nothing would take the answer with it. Quick, because
 * only the difference between recent and old is doing any work — three occurrences back and four
 * occurrences back are both simply "earlier", and a ramp that distinguished them would be spending
 * contrast on a distinction no viewer is making.
 */
const WAKE = {
  floor: 0.46,
  decay: 0.45,
} as const;

/**
 * A state machine, as a map with a traveller on it.
 *
 * Three things distinguish it from the two compositions that already have a camera, and all three
 * come from the same place: a machine is a structure *and* a sequence, and the sequence does not
 * build the structure.
 *
 * **Nothing is attenuated for not having happened.** An atlas draws unreached entities dim, because
 * narration is going to reach them and dimness is a promise. A transcript does not draw unhappened
 * traffic at all, because a message that has not been sent is a spoiler. Here the whole topology is
 * present, legible and unqualified from the first frame — the transitions the run never takes are
 * the answer to "what else could happen from here", which is one of the three questions a paused
 * frame has to answer, and an answer nobody can read is not one.
 *
 * **Occupancy is persistent, exclusive and released.** This is the thing decision:17's model cannot
 * express and the reason this composition exists. `heat` is a transient by construction and
 * `degree` is monotone and never comes back down, so between them an anchor can say *this was
 * reached* and can never say *this is where the machine is now, and that other one no longer is*.
 * So occupancy is its own quantity, it flows from the source to the destination as the traveller
 * crosses, and it is the only warm thing on the frame at any moment.
 *
 * **The surround steps back only while the flare lasts.** decision:23's most effective device is
 * dimming everything that is not the moment by half a stop, and it cannot be used here as written:
 * the moment never ends, so half a stop off the rest of the machine would be permanent, and the
 * permanent thing would be a map nobody can read. So the attenuation rides the *transient* rather
 * than the occupancy, and it is gentler — a quarter stop, for about a second, at each arrival.
 */
function Circuit({ scene, absoluteFrame }: { scene: Scene; absoluteFrame: number }) {
  const frame = useCurrentFrame();
  const machine = machineOf(scene.body);
  const progress = useMemo(
    () => (machine === undefined ? [] : runProgress(machine)),
    [machine],
  );
  const takes = useMemo(
    () => (machine === undefined ? [] : machine.scenario.map((entry) => entry.take)),
    [machine],
  );

  // The atlas's argument, applied to the third composition that bleeds: the camera is handed the
  // region the narration left rather than the whole frame, so a subtitle never lands on a state
  // plate. Zero without subtitles, which is why nothing else about the shot changes.
  const band = useSubtitleBand();
  // Three reservations, taken off the frame before anything is laid out: the chrome at the top,
  // the subtitles at the bottom, and the execution ledger down the left. The camera is told about
  // none of them individually — it is simply given a smaller window and drawn inside it, which is
  // what makes "no state is ever under the title, the subtitle, or the ledger" an invariant rather
  // than a property of the two machines that happen to exist.
  const viewport = {
    width: 1920 - ledgerBand(),
    height: 1080 - band,
  };
  const aspect = viewport.width / viewport.height;

  // Laid out by audition rather than by asking dagre once (`./audition.ts`). Still a pure function
  // of the topology and the window — permuting the scenario moves nothing — and still computed
  // exactly once per film.
  const layout = useMemo(
    () => (machine === undefined ? undefined : electLayout(machine, viewport)),
    [machine, viewport.width, viewport.height],
  );
  // What this slide left out, or nothing when it left nothing out (decision:54). Computed from the
  // *body* rather than from `machine`, because `machineOf` has already pruned by the time anything
  // else sees it — the counts are the one thing that has to remember the whole declaration.
  const reduction = useMemo(() => reductionOf(scene.body), [scene.body]);
  // Which plates lost edges. Empty for a whole-scope machine, so this costs an existing deck
  // nothing by construction rather than by a branch (sprint:23).
  const elisions = useMemo(() => elisionsOf(scene.body), [scene.body]);
  const fit = useMemo(
    () =>
      machine === undefined ? undefined : fitLedger(machine, reduction !== undefined),
    [machine, reduction],
  );
  const title = useMemo(() => fitTitle(scene.title), [scene.title]);

  const plan = useMemo(
    () =>
      layout === undefined
        ? undefined
        : machinePlan(
            layout,
            scene.beats,
            takes,
            {
              from: scene.from,
              until: revealFrom(scene),
              end: scene.from + scene.durationInFrames,
            },
            aspect,
            viewport.width,
          ),
    [layout, scene, takes, aspect, viewport.width],
  );

  if (
    machine === undefined ||
    layout === undefined ||
    plan === undefined ||
    fit === undefined
  ) {
    return null;
  }

  const view = cameraAt(plan.track, absoluteFrame);
  const scale = viewport.width / view.width;

  // Which occurrence the film is on, and therefore everything else. One number, read off the
  // beats, exactly as the transcript does it — and the only piece of state this composition has.
  const current = scene.beats.reduce(
    (latest, beat) => (beat.from <= absoluteFrame ? beat.index : latest),
    -1,
  );
  const beat = scene.beats.find((entry) => entry.index === current);
  const snapshot = progress[current];
  const start = startingState(machine);

  // The crossing. A motion, not a duration: how long a traveller takes to get somewhere is a fact
  // about how fast a viewer can follow a moving dot, and it is capped by the occurrence's own
  // length so a beat shorter than the crossing is never left with the traveller still in transit.
  const edge =
    beat === undefined ? undefined : layout.edgeById.get(takes[beat.index] ?? "");
  const crossFrames =
    beat === undefined ? 1 : Math.max(1, Math.min(MACHINE.cross, beat.durationInFrames));
  const cross =
    beat === undefined
      ? 1
      : interpolate(absoluteFrame, [beat.from, beat.from + crossFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease,
        });

  /**
   * How occupied a state is, 0 to 1, and it is a *flow* rather than a switch.
   *
   * While the traveller is on an edge, occupancy leaves the source at the rate it arrives at the
   * destination — so the frame never claims the machine is in two states, and never claims it is in
   * none. A self-transition is the degenerate case and falls out for free: source and destination
   * are one state, the two halves cancel, and occupancy simply does not move, which is exactly what
   * a self-transition means.
   */
  const occupancyOf = (id: string): number => {
    if (edge === undefined) return id === start ? 1 : 0;
    if (edge.from === edge.to) return id === edge.to ? 1 : 0;
    if (id === edge.from) return 1 - cross;
    if (id === edge.to) return cross;
    return 0;
  };

  const visited = snapshot?.visited ?? new Set(start === undefined ? [] : [start]);
  const taken = snapshot?.taken ?? new Map<string, number>();
  const route = snapshot?.route ?? (start === undefined ? [] : [start]);
  const occupied = snapshot?.occupied ?? start;

  // The arrival flare fires when the traveller lands, not when it sets off — and the surround
  // attenuation rides it, because a machine whose topology dimmed permanently would be a map with
  // the answer to one question written over the answer to the other two.
  const arrival =
    beat === undefined
      ? { degree: 0, heat: 0, sweep: 0 }
      : anchorState(absoluteFrame, beat.from + crossFrames, CIRCUIT_TIMING);
  const attention = arrival.heat;

  /** How long ago each transition was last taken, in occurrences. Absent means never. */
  const lastTaken = new Map<string, number>();
  for (let index = 0; index <= current; index += 1) {
    const id = takes[index];
    if (id !== undefined) lastTaken.set(id, index);
  }
  const wakeOf = (id: string): number => {
    const at = lastTaken.get(id);
    if (at === undefined) return 0;
    const age = current - at;
    return age <= 0 ? 1 : WAKE.floor + (1 - WAKE.floor) * WAKE.decay ** age;
  };

  /** Everything that could happen from where the machine is. Question three, on every frame. */
  const available = new Set(
    (occupied === undefined ? [] : (layout.leaving.get(occupied) ?? [])).map(
      (entry) => entry.id,
    ),
  );

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

  // The title names the machine and is wanted while the machine is all there is. Once the run
  // starts, the readout is in that corner of the frame doing a job, and two captions is one too
  // many. Derived from the first beat, exactly as a transcript's is.

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, overflow: "hidden" }}>
      {/* The graph's own window, and it **clips**.
          `place` puts the world inside a 1540 by 1080 frame and the camera is fitted to exactly
          that, so everything the shot contains lands inside it — but a machine is bigger than its
          shot by construction, and at a close shot the rest of it carries on past the edges. The
          first integrated render put four states and a dozen labels underneath the ledger, which
          is the one thing the rail's whole argument says cannot happen. A reservation that is not
          enforced by a clip is a reservation the composition merely intends. */}
      <div
        style={{
          position: "absolute",
          left: ledgerBand(),
          top: 0,
          width: viewport.width,
          height: 1080,
          overflow: "hidden",
        }}
      >
        <div style={place(MACHINE.gridParallax)}>
          <Field
            opacity={0.42 * opening}
            step={MACHINE.gridStep * 3}
            scale={scale * MACHINE.gridParallax}
          />
        </div>
        <div style={place(1)}>
          <Field opacity={0.7 * opening} step={MACHINE.gridStep} scale={scale} />
          <Routes
            layout={layout}
            active={edge?.id}
            cross={cross}
            wakeOf={wakeOf}
            available={available}
            attention={attention}
            heat={arrival.heat}
          />
          <ElisionStubs layout={layout} elisions={elisions} opening={opening} />
          {layout.nodes.map((node) => (
            <StatePlate
              key={node.id}
              node={node}
              occupancy={occupancyOf(node.id)}
              been={visited.has(node.id)}
              arriving={node.id === edge?.to ? arrival : undefined}
              attention={attention}
              opening={opening}
            />
          ))}
          {layout.edges.map((entry) => (
            <EventLabel
              key={entry.id}
              edge={entry}
              wake={wakeOf(entry.id)}
              count={taken.get(entry.id) ?? 0}
              available={available.has(entry.id)}
              live={entry.id === edge?.id}
              attention={attention}
              opening={opening}
            />
          ))}
          {edge === undefined ? null : <Traveller edge={edge} cross={cross} />}
        </div>
      </div>

      {/* Screen space: the horizon the map is seen against, and the reason the edges of the frame
          do not read as the edges of the machine. */}
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse 82% 78% at 50% 48%, ${withAlpha("#05070B", 0)} 0%, ` +
            `${withAlpha("#05070B", 0.2)} 62%, ${withAlpha("#04060A", 0.64)} 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* The gutter. The title at its head and the chronology filling up from its foot, in a
          region the camera was never given — so neither of them is ever over a state, and the
          machine below is never behind either of them. dragon:29's answer, taken. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: ledgerBand(),
          height: 1080,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: LEDGER_PAD_X,
            top: FRAME.marginY,
            width: ledgerBand() - LEDGER_PAD_X - LEDGER_PAD_RIGHT,
            ...reveal(frame, 0),
          }}
        >
          <Rule frame={frame} width={72} />
          <h1
            style={{
              ...heading,
              marginTop: SPACE.md,
              fontSize: title.size,
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
            }}
          >
            {title.lines.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </h1>
          {reduction === undefined ? null : <ScopeNote reduction={reduction} />}
        </div>
        <LedgerRail
          reduced={reduction !== undefined}
          machine={machine}
          fit={fit}
          current={current}
          occupied={
            occupied === undefined
              ? undefined
              : (layout.byId.get(occupied)?.label ?? occupied)
          }
          opening={opening}
        />
      </div>

      {/* A hairline where the gutter stops and the machine begins. The one thing that says the
          rail is chrome rather than the left-hand edge of the map. */}
      <div
        style={{
          position: "absolute",
          left: ledgerBand(),
          top: 0,
          width: 1,
          height: 1080,
          backgroundColor: withAlpha(MACHINE.edge, 0.3 * opening),
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}

/**
 * Every transition, as a stroke.
 *
 * One SVG in world coordinates, as `Relations` is, because these are strokes and a stroke wants to
 * be in the coordinate system it was measured in. Four states, and the ordering of them is the
 * whole of the notation:
 *
 *     possible     ordinary topology. Present from the first frame, and never a hint of a line
 *     available    it leaves where the machine is. A little brighter, and that is all
 *     wake         it has been taken. Brighter still, and fading with how long ago
 *     live         it is being taken right now, with a pulse running along it
 *
 * The gap between `possible` and `available` is deliberately the smallest one on the frame. It has
 * to be legible — it is half the answer to "what could happen next" — and it must not compete with
 * the wake, because a viewer who read "could happen" as "did happen" would be reading the film
 * backwards.
 */
function Routes({
  layout,
  active,
  cross,
  wakeOf,
  available,
  attention,
  heat,
}: {
  layout: MachineLayout;
  active: string | undefined;
  cross: number;
  wakeOf: (id: string) => number;
  available: ReadonlySet<string>;
  attention: number;
  heat: number;
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
        const wake = wakeOf(edge.id);
        const live = edge.id === active;
        // A quarter stop off everything that is not the arrival, for as long as the arrival lasts.
        // Never more: the topology is the other two thirds of what this frame has to say.
        const dim = 1 - 0.25 * attention * (live ? 0 : 1);
        const hue = wake > 0 ? mix(MACHINE.edge, MACHINE.taken, wake) : MACHINE.edge;
        const lit = live ? mix(hue, MACHINE.ignite, 0.55 + 0.35 * heat) : hue;
        const alpha =
          (0.5 +
            (available.has(edge.id) ? 0.16 : 0) +
            0.34 * wake +
            0.2 * (live ? 1 : 0)) *
          dim;
        const weight =
          MACHINE.edgeStroke +
          (MACHINE.takenStroke - MACHINE.edgeStroke) * wake +
          1.4 * (live ? 1 : 0);

        return (
          <g key={edge.id}>
            <path
              d={edge.path}
              fill="none"
              stroke={withAlpha(lit, alpha)}
              strokeWidth={weight}
              strokeLinecap="round"
            />
            {/* The energy running along the edge being taken, immediately behind the traveller.
                Gone the moment the crossing finishes — a pulse that lingered would make an
                occurrence that has already happened look like one still happening. */}
            {live && cross > 0 && cross < 1 ? (
              <path
                d={edge.path}
                fill="none"
                stroke={withAlpha(MACHINE.ignite, 0.92)}
                strokeWidth={weight * 1.35}
                strokeLinecap="round"
                strokeDasharray={`${MACHINE.pulse} ${edge.length}`}
                strokeDashoffset={MACHINE.pulse - cross * edge.length}
                style={{
                  filter: `drop-shadow(0 0 20px ${withAlpha(MACHINE.current, 0.9)})`,
                }}
              />
            ) : null}
            <ArrowHead
              points={edge.points}
              color={lit}
              opacity={(0.62 + 0.38 * wake) * dim}
            />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * One state, as a plate on the map.
 *
 * Three readings, and the ordering between them is the composition's central claim. **Possible** is
 * the baseline and it is a real contrast, not a hint — a state the run never enters is still part
 * of the machine being explained. **Visited** is a shade above it, and no more than that: a state
 * the run has left is ordinary topology again, not a spent thing, because "the door was open a
 * moment ago" is not a fact about the door. **Occupied** is the accent, a fill, a ring and a lift,
 * and it is the only warm thing anywhere on the frame.
 *
 * There is no fourth reading, and in particular there is no treatment for a state with nothing
 * leaving it. The atlas draws its out-degree-zero node as the world's product because in a world
 * that is what it is; here it would say "the machine ends here", which is a claim about a system
 * that this format has no way to know and that is very often false.
 */
function StatePlate({
  node,
  occupancy,
  been,
  arriving,
  attention,
  opening,
}: {
  node: MachineNode;
  /** 0 to 1, and a flow: mid-traversal both endpoints hold a share of it. */
  occupancy: number;
  been: boolean;
  arriving: AnchorState | undefined;
  attention: number;
  opening: number;
}) {
  const heat = occupancy * (arriving?.heat ?? 0);
  const dim = 1 - 0.25 * attention * (1 - occupancy);
  const base = been ? MACHINE.visited : MACHINE.possible;

  const stroke = mix(
    withAlpha(base, 1),
    mix(MACHINE.current, MACHINE.ignite, heat),
    occupancy,
  );
  const fill = mix(
    mix("#0B1017", base, been ? 0.055 : 0.03),
    mix("#140F09", MACHINE.current, 0.2),
    occupancy,
  );
  const label = mix(mix(base, COLORS.paper, been ? 0.5 : 0.28), "#FFFFFF", occupancy);

  return (
    <div
      style={{
        position: "absolute",
        left: node.rect.x,
        top: node.rect.y,
        width: node.rect.width,
        height: node.rect.height,
        opacity: opening * dim,
        transform: `scale(${1 + 0.035 * occupancy + 0.025 * heat})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: MACHINE.plateRadius,
        border: `${MACHINE.plateStroke + 2.2 * occupancy}px solid ${stroke}`,
        backgroundColor: fill,
        // Tight and bright rather than wide and faint, for the reason decision:23 recorded: a
        // wide bloom at low alpha is four values across three hundred pixels, and H.264 draws
        // four values as visible steps.
        boxShadow:
          `0 0 ${20 + 66 * occupancy + 34 * heat}px ` +
          `${withAlpha(MACHINE.current, 0.5 * occupancy + 0.3 * heat)}, ` +
          `inset 0 0 ${24 + 44 * occupancy}px ${withAlpha(MACHINE.current, 0.16 * occupancy)}`,
      }}
    >
      {/* The occupancy ring. Persistent, unlike everything else on this frame that is bright: it
          is not marking an event, it is stating where the machine is, and it stays until the
          machine is somewhere else. */}
      {occupancy > 0.01 ? (
        <div
          style={{
            position: "absolute",
            inset: -18,
            borderRadius: MACHINE.plateRadius,
            border: `${2.5 * occupancy}px solid ${withAlpha(MACHINE.current, 0.7 * occupancy)}`,
          }}
        />
      ) : null}
      {/* Arrival. One ring, once, expanding away as the traveller lands — including when the
          traveller lands back where it started, which is the only thing on the frame that says a
          self-transition happened at all. */}
      {arriving !== undefined && arriving.sweep > 0 && arriving.sweep < 1 ? (
        <div
          style={{
            position: "absolute",
            inset: -30,
            borderRadius: MACHINE.plateRadius,
            border: `5px solid ${withAlpha(MACHINE.ignite, 0.85 * (1 - arriving.sweep) ** 1.6)}`,
            transform: `scale(${1 + 0.22 * arriving.sweep})`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "relative",
          padding: `0 ${MACHINE.padX}px`,
          textAlign: "center",
          fontSize: MACHINE.label,
          fontWeight: 600,
          letterSpacing: "-0.015em",
          lineHeight: MACHINE.lineHeight,
          color: label,
          textShadow:
            occupancy > 0.01
              ? `0 0 ${34 * occupancy}px ${withAlpha(MACHINE.current, occupancy)}`
              : "none",
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
 * What fires a transition, and how many times it has.
 *
 * The count is the one piece of notation this composition adds, and it exists because of a specific
 * failure the metaphor has. A traversal is legible *while it is happening* — a spark crosses an
 * edge and nobody has to be told it is the second time. Paused, it is not: an edge with a wake on
 * it says "this was taken", and there is nothing in a brighter stroke that can say "twice". So from
 * the second occurrence onwards the label carries how many, and a frame stopped anywhere in the
 * film can be counted rather than remembered.
 *
 * Derived, never authored, and absent on the overwhelming majority of edges — a transition taken
 * once carries no mark at all, so the notation appears exactly where there is something to say.
 */
function EventLabel({
  edge,
  wake,
  count,
  available,
  live,
  attention,
  opening,
}: {
  edge: MachineEdge;
  wake: number;
  count: number;
  available: boolean;
  live: boolean;
  attention: number;
  opening: number;
}) {
  const dim = 1 - 0.3 * attention * (live ? 0 : 1);
  const tone = live
    ? MACHINE.ignite
    : wake > 0
      ? mix(MACHINE.possible, MACHINE.taken, wake)
      : MACHINE.possible;
  const strength = (0.62 + 0.1 * (available ? 1 : 0) + 0.34 * wake) * dim;

  return (
    <div
      style={{
        position: "absolute",
        left: edge.label.x,
        top: edge.label.y,
        width: edge.label.width,
        height: edge.label.height,
        opacity: opening,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          textAlign: "center",
          fontSize: MACHINE.event,
          lineHeight: MACHINE.eventLineHeight,
          fontWeight: live ? 600 : 500,
          color: withAlpha(tone, strength),
          // A short backdrop rather than a plate: an event label sits on a routed edge, and the
          // edge has to be visible arriving at it and leaving it.
          textShadow:
            `0 0 16px ${withAlpha(COLORS.ink, 0.95)}, 0 0 6px ${withAlpha(COLORS.ink, 0.95)}` +
            (live ? `, 0 0 28px ${withAlpha(MACHINE.current, 0.8)}` : ""),
        }}
      >
        {edge.lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
        {count >= 2 ? (
          <div
            style={{
              position: "absolute",
              left: "100%",
              top: 0,
              marginLeft: MACHINE.labelPadX,
              fontSize: MACHINE.event * 0.86,
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: withAlpha(MACHINE.current, 0.92 * dim),
              textShadow: `0 0 14px ${withAlpha(COLORS.ink, 0.95)}`,
            }}
          >
            ×{count}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The traveller: where the machine is, while it is between two places.
 *
 * A dot rather than a token with a name on it, and small rather than large. Its whole job is to be
 * the one thing moving on a frame where nothing else moves, and a moving object is found by the eye
 * before any static one however big the static one is. It also has to be legible on the frame's
 * *own* terms once it lands, and what it lands into is the occupancy ring — so it is the same
 * colour, and the arrival reads as the dot becoming the ring rather than as one thing being
 * replaced by another.
 */
function Traveller({ edge, cross }: { edge: MachineEdge; cross: number }) {
  if (cross <= 0 || cross >= 1) return null;
  const at = pointAlong(edge.points, cross);
  const size = MACHINE.travellerSize;
  return (
    <div
      style={{
        position: "absolute",
        left: at.x - size / 2,
        top: at.y - size / 2,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: MACHINE.ignite,
        boxShadow:
          `0 0 ${size * 1.4}px ${withAlpha(MACHINE.current, 0.95)}, ` +
          `0 0 ${size * 3}px ${withAlpha(MACHINE.current, 0.45)}`,
      }}
    />
  );
}

/**
 * The execution ledger, as a rail down the left of the frame.
 *
 * Screen space, outside the camera transform, and in a region taken off the camera's window before
 * anything was laid out — so it never pans with the graph, never lands on a state, and never causes
 * one to move. `./ledger.ts` has the argument for why a machine needs it at all; this is only how
 * it is set.
 *
 * Three decisions worth defending, and all three are about **not competing with the map**.
 *
 * **It is neutral.** Every row is set in the same steel the topology is drawn in, and the accent —
 * the one warm colour in the composition — appears nowhere in it. decision:47 spent that accent
 * entirely on occupancy, and a rail that used it to mean "latest" would be putting a second warm
 * thing on a frame whose central claim is that there is exactly one.
 *
 * **Latest is loudest, and older is quieter rather than smaller.** One size for every row, because
 * type that shrank with age would make the rail a perspective drawing and the oldest entries
 * illegible — which is the thing this replaced. What changes with age is presence, over a short
 * ramp that flattens: three back and four back are both simply "earlier", exactly as the wake's
 * decay already assumes.
 *
 * **The overflow row is a number.** `+6 earlier` is a fact; `…` is a shrug.
 *
 * The rail advances *during the traversal* rather than on arrival, which is the one place this
 * composition spends its foreknowledge of the phase budget: the crossing is the only moment in an
 * occurrence when something is already moving, so a row arriving then costs the viewer nothing,
 * and the stable window after the arrival stays completely still.
 */

/**
 * What a reduced slide says about itself.
 *
 * decision:54 made this a condition of the reduction existing, and the reason is not politeness: a
 * pruned `Running` shows three exits where the machine declares six, and a viewer who is not told
 * believes something false about the *system*, not merely something incomplete about the film.
 *
 * Three things it deliberately is not. It is **not a list** — dragon:18 already refused a rail of
 * sentences naming what a shot cut off, and this would be that rail with the same problem. It is
 * **not an apology**: "showing the narrated run" states what the picture is, where "6 transitions
 * hidden" would frame the whole slide as a lossy version of a better one. And it is **not in the
 * accent**, for the reason nothing else in the gutter is — the one warm thing on the frame is
 * occupancy.
 *
 * Counts on both axes, because states and transitions are pruned by different amounts and either
 * alone would understate it. `+N earlier` in the rail below is the same rule: a number is a fact
 * and an ellipsis is a shrug.
 */
function ScopeNote({ reduction }: { reduction: MachineReduction }) {
  return (
    <div
      style={{
        marginTop: SPACE.md,
        fontFamily: FONT_STACK,
        fontSize: MACHINE.railScope,
        lineHeight: 1.35,
        color: withAlpha(MACHINE.edge, 0.85),
      }}
    >
      {/* One count per line, broken here rather than by the box. The first render wrapped
          "6 of 9 states, 9 of 14 transitions" and orphaned the word `transitions` onto a line of
          its own, which is sprint:20's defect exactly — and a note about honesty that reads as a
          typographic accident is not doing its job. Two short lines cannot wrap at any size this
          rail is ever set at, so the block's height stops depending on a string. */}
      <div>showing the narrated run</div>
      <div style={{ color: withAlpha(MACHINE.edge, 0.62) }}>
        <div>
          {reduction.statesShown} of {reduction.statesDeclared} states
        </div>
        <div>
          {reduction.transitionsShown} of {reduction.transitionsDeclared} transitions
        </div>
      </div>
    </div>
  );
}

function LedgerRail({
  machine,
  fit,
  current,
  occupied,
  opening,
  reduced,
}: {
  machine: AuthoredMachine;
  fit: LedgerFit;
  current: number;
  occupied: string | undefined;
  opening: number;
  reduced: boolean;
}) {
  const rows = ledgerAt(machine, current, fit);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: MACHINE.railTitleBlock + (reduced ? MACHINE.railScopeBlock : 0),
        width: ledgerBand(),
        height: ledgerHeight(reduced),
        opacity: opening,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        paddingLeft: LEDGER_PAD_X,
        paddingRight: LEDGER_PAD_RIGHT,
        paddingBottom: SPACE.lg,
      }}
    >
      {rows.map((row, index) => (
        <LedgerEntry
          key={`${row.kind}-${row.ordinal ?? row.earlier ?? index}`}
          row={row}
          fit={fit}
          latest={index === rows.length - 1}
          here={occupied}
        />
      ))}
    </div>
  );
}

/**
 * One row.
 *
 * The ordinal sits in a gutter of its own so the event labels form a column a viewer can read down
 * without their eye stepping over a number of varying width. It is set in the mono face for the
 * reason every derived count in cuecraft is: it is a position in a list rather than a word.
 */
function LedgerEntry({
  row,
  fit,
  latest,
  here,
}: {
  row: LedgerRow;
  fit: LedgerFit;
  latest: boolean;
  here: string | undefined;
}) {
  // Presence rather than size, over a ramp that flattens: the latest entry is fully present, the
  // one before it nearly so, and everything past the third is one shade of "earlier".
  const age = row.age ?? 0;
  const presence = latest ? 1 : Math.max(0.42, 0.86 - 0.16 * age);

  if (row.kind === "earlier") {
    return (
      <div
        style={{
          fontFamily: MONO_STACK,
          fontSize: Math.round(fit.size * 0.78),
          lineHeight: MACHINE.railLead,
          letterSpacing: "0.04em",
          color: withAlpha(MACHINE.edge, 0.85),
          marginBottom: MACHINE.railGap,
          paddingLeft: LEDGER_GUTTER,
        }}
      >
        +{row.earlier} earlier
      </div>
    );
  }

  const tone = row.kind === "start" ? MACHINE.edge : MACHINE.possible;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        marginBottom: MACHINE.railGap,
      }}
    >
      <div
        style={{
          width: LEDGER_GUTTER,
          flexShrink: 0,
          fontFamily: MONO_STACK,
          fontSize: Math.round(fit.size * 0.82),
          lineHeight: MACHINE.railLead,
          color: withAlpha(
            MACHINE.edge,
            row.kind === "start" ? 0.7 : 0.55 + 0.45 * presence,
          ),
        }}
      >
        {row.kind === "start" ? "·" : row.ordinal}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {row.lines === undefined ? null : (
          <div
            style={{
              fontSize: fit.size,
              lineHeight: MACHINE.railLead,
              fontWeight: latest ? 600 : 400,
              color: withAlpha(tone, 0.28 + 0.72 * presence),
            }}
          >
            {row.lines.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
        )}
        {/* Where it arrived. The turnstile carries the whole grammar of the row, so no eyebrow has
            to say the word "to" — and on the start row there is no turnstile, because nothing
            went anywhere. */}
        <div
          style={{
            fontSize: fit.stateSize,
            lineHeight: MACHINE.railLead,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: withAlpha(
              // The latest row's destination is where the machine *is*, and it is the one thing in
              // the rail allowed to be as bright as paper. Not the accent: that is occupancy's, on
              // the map, and two of them would be two current states.
              latest && row.state === here ? COLORS.paper : MACHINE.visited,
              latest ? 0.96 : 0.2 + 0.6 * presence,
            ),
          }}
        >
          {row.kind === "start" ? row.state : `› ${row.state}`}
        </div>
      </div>
    </div>
  );
}

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
    <Frame
      scene={scene}
      slideCount={slideCount}
      bleed={
        scene.layout === "atlas" ||
        scene.layout === "transcript" ||
        scene.layout === "circuit"
      }
    >
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
function Composition({
  scene,
  absoluteFrame,
  scope = ROOT_SCOPE,
  span,
  trail = [],
}: {
  scene: Scene;
  absoluteFrame: number;
  scope?: Scope;
  span?: { from: number; until: number; revealTravel?: number };
  trail?: readonly string[];
}) {
  // Unconditionally, at the top: one branch below needs the sequence-local frame, and a hook
  // called inside a conditional is a hook called sometimes.
  const frame = useCurrentFrame();
  return scene.layout === "atlas" ? (
    <Atlas
      scene={scene}
      absoluteFrame={absoluteFrame}
      scope={scope}
      trail={trail}
      {...(span === undefined ? {} : { span })}
    />
  ) : scene.layout === "transcript" ? (
    <Transcript scene={scene} absoluteFrame={absoluteFrame} />
  ) : scene.layout === "circuit" ? (
    <Circuit scene={scene} absoluteFrame={absoluteFrame} />
  ) : scene.layout === "figure" ? (
    <>
      <Heading scene={scene} frame={frame} />
      <div style={{ flex: 1, display: "flex", marginTop: SPACE.xl }}>
        <Figure
          kind={scene.body.kind === "figure" ? scene.body.figure : "timing"}
          title={scene.title}
          absoluteFrame={absoluteFrame}
        />
      </div>
    </>
  ) : scene.layout === "series" ? (
    <Series scene={scene} absoluteFrame={absoluteFrame} />
  ) : scene.layout === "formula" ? (
    <Formula scene={scene} absoluteFrame={absoluteFrame} />
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
