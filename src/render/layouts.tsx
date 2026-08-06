import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

import type { Scene } from "../compile/timeline.ts";
import { COLORS, FONT_STACK, FRAME, MOTION, SPACE, TYPE, fitHeading } from "./theme.ts";

/**
 * The four curated compositions.
 *
 * `layout.ts` decides which one a slide gets from the shape of its content; these render it.
 * They share a frame, a type scale, and one motion primitive, and nothing else — each is
 * allowed to be an opinionated arrangement rather than a parameterisation of a single
 * template, which is the whole point of having four.
 *
 * What they deliberately do not have: cards, borders around content, drop shadows,
 * gradients, or icons. Structure is carried by scale, position, and hairlines.
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

const heading: CSSProperties = {
  margin: 0,
  fontWeight: 700,
  letterSpacing: "-0.024em",
  color: COLORS.paper,
};

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
          maxWidth: 1500,
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
 */
function Matrix({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const columns = scene.bullets.length > 4 ? 3 : 2;

  return (
    <>
      <Rule frame={frame} />
      <h1
        style={{
          ...heading,
          marginTop: SPACE.lg,
          fontSize: fitHeading(scene.title.length, TYPE.title),
          lineHeight: 1.06,
          maxWidth: 1500,
          ...reveal(frame, 0),
        }}
      >
        {scene.title}
      </h1>
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
        {scene.bullets.map((bullet, index) => (
          <div
            key={bullet}
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
                backgroundColor: COLORS.accent,
                opacity: 0.75,
              }}
            />
            <div
              style={{
                marginTop: SPACE.md,
                fontSize: TYPE.term,
                fontWeight: 500,
                letterSpacing: "-0.016em",
                lineHeight: 1.14,
                color: COLORS.paper,
              }}
            >
              {bullet}
            </div>
          </div>
        ))}
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
function IndexList({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  return (
    <>
      <Rule frame={frame} />
      <h1
        style={{
          ...heading,
          marginTop: SPACE.lg,
          fontSize: fitHeading(scene.title.length, TYPE.title),
          lineHeight: 1.06,
          maxWidth: 1500,
          ...reveal(frame, 0),
        }}
      >
        {scene.title}
      </h1>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          marginTop: SPACE.lg,
        }}
      >
        {scene.bullets.map((bullet, index) => (
          <div
            key={bullet}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: SPACE.xl,
              paddingTop: SPACE.lg,
              paddingBottom: SPACE.lg,
              borderTop: `1px solid ${COLORS.hairline}`,
              // The closing rule belongs to the last row, not to the container: on the
              // container it draws before any row has arrived, leaving a line under an
              // empty space during the entrance.
              ...(index === scene.bullets.length - 1
                ? { borderBottom: `1px solid ${COLORS.hairline}` }
                : {}),
              ...reveal(frame, contentDelay(index)),
            }}
          >
            <span
              style={{
                flex: "none",
                width: 92,
                fontSize: TYPE.ordinal,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: COLORS.accent,
                fontVariantNumeric: "tabular-nums",
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
                color: COLORS.paper,
              }}
            >
              {bullet}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * **lead** — a title worth dwelling on, and points too long to be labels.
 *
 * The only asymmetric composition: the heading holds a column of its own on the left, a
 * hairline divides, and the points stack on the right. This is what the other three fall
 * back to, so it has to survive both many items and long ones.
 */
function Lead({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
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
        {scene.bullets.map((bullet, index) => (
          <div key={bullet} style={{ ...reveal(frame, contentDelay(index)) }}>
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
              {bullet}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Slide({ scene, slideCount }: { scene: Scene; slideCount: number }) {
  return (
    <Frame scene={scene} slideCount={slideCount}>
      {scene.layout === "statement" ? (
        <Statement scene={scene} />
      ) : scene.layout === "matrix" ? (
        <Matrix scene={scene} />
      ) : scene.layout === "index" ? (
        <IndexList scene={scene} />
      ) : (
        <Lead scene={scene} />
      )}
    </Frame>
  );
}
