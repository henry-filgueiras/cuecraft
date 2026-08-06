import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

import type { Scene } from "../compile/timeline.ts";
import { COLORS, FONT_STACK, LAYOUT, MOTION } from "./theme.ts";

/**
 * A slide: a rule, a title, some bullets, and furniture that stays out of the way.
 *
 * Motion is entrance only and finishes early — nothing here moves while narration is
 * carrying the point. The frame is designed to be judged as a still.
 */

const ease = Easing.out(Easing.cubic);

function rise(frame: number, start: number, span: number, distance: number) {
  const progress = interpolate(frame, [start, start + span], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return {
    opacity: progress,
    transform: `translateY(${(1 - progress) * distance}px)`,
  };
}

export function Slide({
  scene,
  slideCount,
  deckTitle,
  appearAt,
}: {
  scene: Scene;
  slideCount: number;
  deckTitle: string;
  /** Local frame at which this slide starts becoming visible; entrance begins there. */
  appearAt: number;
}) {
  const frame = useCurrentFrame() - appearAt;

  const ruleProgress = interpolate(frame, [0, MOTION.ruleDraw], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill
      style={{
        // Flat, and deliberately so. A soft radial highlight was tried here and looked
        // fine in the browser; encoded to H.264 it banded into visible concentric arcs
        // across the whole frame, because eight-bit near-black has almost no room for a
        // gradient. Typography can carry the frame; a gradient that survives encoding
        // cannot be had cheaply.
        backgroundColor: COLORS.ink,
        fontFamily: FONT_STACK,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: `${LAYOUT.paddingY}px ${LAYOUT.paddingX}px`,
        }}
      >
        <div
          style={{
            width: LAYOUT.ruleWidth,
            height: LAYOUT.ruleHeight,
            backgroundColor: COLORS.accent,
            marginBottom: LAYOUT.ruleGap,
            transform: `scaleX(${ruleProgress})`,
            transformOrigin: "left center",
          }}
        />

        <h1
          style={{
            margin: 0,
            maxWidth: LAYOUT.contentMaxWidth,
            fontSize: LAYOUT.titleSize,
            fontWeight: 700,
            lineHeight: 1.06,
            letterSpacing: "-0.022em",
            color: COLORS.paper,
            ...rise(frame, 0, MOTION.titleRise, 22),
          }}
        >
          {scene.title}
        </h1>

        {scene.bullets.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              margin: `${LAYOUT.titleGap}px 0 0 0`,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: LAYOUT.bulletGap,
              maxWidth: LAYOUT.contentMaxWidth,
            }}
          >
            {scene.bullets.map((bullet, index) => (
              <li
                key={bullet}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  fontSize: LAYOUT.bulletSize,
                  lineHeight: 1.3,
                  letterSpacing: "-0.005em",
                  color: COLORS.muted,
                  ...rise(
                    frame,
                    MOTION.bulletDelay + index * MOTION.bulletStagger,
                    MOTION.bulletRise,
                    14,
                  ),
                }}
              >
                <span
                  style={{
                    flex: "none",
                    width: LAYOUT.dashWidth,
                    height: LAYOUT.dashHeight,
                    marginRight: LAYOUT.dashGap,
                    // Optically centres the dash on the lowercase x-height rather than
                    // on the line box, which sits it too low.
                    marginTop: LAYOUT.bulletSize * 0.6,
                    backgroundColor: COLORS.accent,
                    opacity: 0.85,
                  }}
                />
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          left: LAYOUT.paddingX,
          right: LAYOUT.paddingX,
          bottom: LAYOUT.paddingY * 0.62,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 48,
          fontSize: LAYOUT.footerSize,
          fontWeight: 500,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: COLORS.faint,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {deckTitle}
        </span>
        <div style={{ display: "flex", gap: LAYOUT.segmentGap, flex: "none" }}>
          {Array.from({ length: slideCount }, (_, index) => (
            <span
              key={index}
              style={{
                width: LAYOUT.segmentWidth,
                height: LAYOUT.segmentHeight,
                backgroundColor:
                  index === scene.ordinal - 1 ? COLORS.accent : COLORS.inactive,
              }}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}
