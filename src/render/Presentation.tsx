import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";

import type { Timeline } from "../compile/timeline.ts";
import { Slide } from "./layouts.tsx";
import { COLORS, MOTION } from "./theme.ts";

/**
 * The composition: the timeline laid out in frames, plus one restrained transition.
 *
 * The transition does not compress the timeline. Remotion's `TransitionSeries` implements
 * crossfades by *overlapping* adjacent sequences, which shortens the video by the
 * transition duration and pulls every subsequent scene earlier — exactly the drift
 * dragon:1 warns about. Here every scene keeps the absolute frames the timeline assigned
 * it and simply fades within them, so total duration is the sum of scene durations,
 * unconditionally. The outgoing slide leaves inside its own post-say padding and the
 * incoming one arrives inside its own pre-say padding; see MOTION in theme.ts for why they
 * dip through the background instead of dissolving into each other.
 *
 * Every fade is capped by the padding it has to fit inside, so a deck with a short
 * `pre_say` gets a quicker transition rather than motion over its own narration.
 *
 * Audio sits outside the fading wrapper on its own absolute sequences: opacity is a visual
 * concern and must never be able to touch narration. A slide's narration is now several
 * clips rather than one, each placed at the frame the timeline computed for it, with
 * authored pauses appearing as the gaps between them. Remotion mixes them into the output
 * track; nothing here concatenates audio (decision:5).
 */

/**
 * A type alias rather than an interface on purpose: Remotion constrains composition props
 * to `Record<string, unknown>`, and only a type alias gets the implicit index signature
 * that satisfies it.
 */
export type PresentationProps = { readonly timeline: Timeline };

export function PresentationVideo({ timeline }: PresentationProps) {
  const frame = useCurrentFrame();
  const { scenes, totalFrames } = timeline;

  const last = scenes.at(-1);
  const trailing =
    last === undefined
      ? 0
      : totalFrames - (last.narrationFrom + last.narrationDurationInFrames);
  const closer = Math.max(0, Math.min(MOTION.closer, trailing));

  const deckOpacity =
    closer === 0
      ? 1
      : interpolate(frame, [totalFrames - closer, totalFrames - 1], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <AbsoluteFill style={{ opacity: deckOpacity }}>
        {scenes.map((scene, index) => {
          const isFirst = index === 0;
          const isLast = index === scenes.length - 1;

          // Room before narration starts, and room after it ends. Everything visual has
          // to happen in one of these two windows.
          const before = scene.narrationFrom - scene.from;
          const after =
            scene.from +
            scene.durationInFrames -
            (scene.narrationFrom + scene.narrationDurationInFrames);

          const appearAt = isFirst ? 0 : Math.min(MOTION.hold, Math.max(0, before - 1));
          const fadeIn = Math.max(
            1,
            Math.min(isFirst ? MOTION.opener : MOTION.fadeIn, before - appearAt),
          );
          // The last slide leaves via the deck-wide closer instead, so it does not fade
          // twice.
          const fadeOut = isLast ? 0 : Math.max(0, Math.min(MOTION.fadeOut, after));

          return (
            <Sequence
              key={scene.ordinal}
              from={scene.from}
              durationInFrames={scene.durationInFrames}
              layout="none"
              name={`slide-${scene.ordinal}`}
            >
              <SceneLayer
                appearAt={appearAt}
                fadeIn={fadeIn}
                fadeOut={fadeOut}
                durationInFrames={scene.durationInFrames}
              >
                {/* Shifts the local frame so entrance motion starts when the slide
                    becomes visible rather than while it is still transparent. */}
                <Sequence from={appearAt} layout="none" name="content">
                  <Slide scene={scene} slideCount={scenes.length} absoluteFrame={frame} />
                </Sequence>
              </SceneLayer>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      {scenes.flatMap((scene) =>
        scene.clips.map((clip, index) => (
          <Sequence
            key={`${scene.ordinal}-${index}`}
            from={clip.from}
            durationInFrames={clip.durationInFrames}
            name={`narration-${scene.ordinal}-${index + 1}`}
          >
            <Audio src={staticFile(clip.src)} />
          </Sequence>
        )),
      )}
    </AbsoluteFill>
  );
}

function SceneLayer({
  appearAt,
  fadeIn,
  fadeOut,
  durationInFrames,
  children,
}: {
  appearAt: number;
  fadeIn: number;
  fadeOut: number;
  durationInFrames: number;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();

  const arriving = interpolate(frame, [appearAt, appearAt + fadeIn], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leaving =
    fadeOut === 0
      ? 1
      : interpolate(frame, [durationInFrames - fadeOut, durationInFrames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  return (
    <AbsoluteFill style={{ opacity: Math.min(arriving, leaving) }}>
      {children}
    </AbsoluteFill>
  );
}
