import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";

import type { Recall, Scene, Timeline } from "../compile/timeline.ts";
import { FactsContext } from "./figures.tsx";
import { Slide } from "./layouts.tsx";
import { SubtitleBandContext, Subtitles, subtitleFit } from "./subtitles.tsx";
import { COLORS, MOTION, subtitleBand } from "./theme.ts";

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

  // One number for the whole deck: the room every bordered composition gives up so that nothing is
  // ever laid out underneath the narration. Zero when the deck asked for no subtitles, which is
  // what makes every existing film render exactly as it did before.
  const band =
    timeline.subtitles.length === 0 ? 0 : subtitleBand(subtitleFit(timeline.subtitles));

  return (
    // The compilation's own facts, offered to any composition that asks. Read-only, frozen by
    // `buildTimeline`, and reaching the renderer only after everything they describe is settled.
    <FactsContext value={timeline.facts}>
      <SubtitleBandContext value={band}>
        <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
          <AbsoluteFill style={{ opacity: deckOpacity }}>
            {scenes.map((scene, index) => {
              const { appearAt, fadeIn, fadeOut } = sceneMotion(scene, index, scenes);

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
                      <Slide
                        scene={scene}
                        slideCount={scenes.length}
                        absoluteFrame={frame}
                      />
                    </Sequence>
                  </SceneLayer>
                </Sequence>
              );
            })}

            {/* Over the current slide and under the subtitle, which is the order the two claims
              are made in: the picture is the earlier slide's, and the text belongs to whatever is
              being said now — which, during a replay, is the earlier slide's too. */}
            {scenes.flatMap((scene) =>
              scene.recalls.map((recall) => {
                const at = scenes.findIndex((s) => s.ordinal === recall.sourceOrdinal);
                const source = scenes[at];
                if (source === undefined) return null;
                return (
                  <Replay
                    key={`recall-${scene.ordinal}-${recall.from}`}
                    recall={recall}
                    source={source}
                    appearAt={sceneMotion(source, at, scenes).appearAt}
                    frame={frame}
                    slideCount={scenes.length}
                  />
                );
              }),
            )}

            {/* Above every scene and inside none of them: no camera transform, no world scale and
              no per-slide fade can reach it, which is the whole of why it stays still while the
              picture moves. Inside the deck opacity, so the film still settles to background. */}
            <Subtitles cues={timeline.subtitles} frame={frame} />
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

          {/* The same file, placed a second time. Nothing was synthesized for it, and nothing here
            knows that — a recalled clip is an `<Audio>` at a frame for a duration, exactly like
            every other one, which is the evidence that the replay is on the one serial track. */}
          {scenes.flatMap((scene) =>
            scene.recalls.map((recall) => (
              <Sequence
                key={`recall-audio-${scene.ordinal}-${recall.from}`}
                from={recall.from}
                durationInFrames={recall.durationInFrames}
                name={`recall-${scene.ordinal}-${recall.id}`}
              >
                <Audio src={staticFile(recall.src)} />
              </Sequence>
            )),
          )}
        </AbsoluteFill>
      </SubtitleBandContext>
    </FactsContext>
  );
}

/**
 * When a scene appears, and how long it takes to arrive and leave.
 *
 * Derived once and shared, because a recall renders a slide the film has already shown and has to
 * render it *the same way*. `appearAt` in particular is not decoration: it shifts the sequence-local
 * frame that every entrance animation in `./layouts.tsx` reads, so a replay that recomputed it
 * differently — or skipped it — would draw the same slide at a different point in its own arrival.
 */
function sceneMotion(
  scene: Scene,
  index: number,
  scenes: readonly Scene[],
): { appearAt: number; fadeIn: number; fadeOut: number } {
  const isFirst = index === 0;
  const isLast = index === scenes.length - 1;

  // Room before narration starts, and room after it ends. Everything visual has to happen in one
  // of these two windows.
  const before = scene.narrationFrom - scene.from;
  const after =
    scene.from +
    scene.durationInFrames -
    (scene.narrationFrom + scene.narrationDurationInFrames);

  const appearAt = isFirst ? 0 : Math.min(MOTION.hold, Math.max(0, before - 1));
  return {
    appearAt,
    fadeIn: Math.max(
      1,
      Math.min(isFirst ? MOTION.opener : MOTION.fadeIn, before - appearAt),
    ),
    // The last slide leaves via the deck-wide closer instead, so it does not fade twice.
    fadeOut: isLast ? 0 : Math.max(0, Math.min(MOTION.fadeOut, after)),
  };
}

/**
 * An earlier slide, played again over the frames a `recall:` bought.
 *
 * Opaque and above the current slide rather than swapped for it, so the cut is a cut: the recalled
 * composition paints its own background over the whole frame, appears on one frame and is gone on
 * the next. No crossfade, no vignette, no caption saying "earlier" — decision:24's rule that the
 * camera earns its moves, applied to a move nobody asked for. The signal that this is the past is
 * the picture itself, and the progress rule stepping back to a slide already seen.
 *
 * Two frames are handed down, and they are different numbers for different jobs:
 *
 * - **`absoluteFrame`** is `sourceFrom + (frame - from)` — where on the deck's clock the recalled
 *   slide *was*. Anchors, spans, beats and camera keys are all absolute (decision:13), so this is
 *   what makes an element that lit up during the original sentence light up again here.
 * - **The sequence-local frame** is set by the negative `from` below, so that
 *   `useCurrentFrame()` inside the composition reads exactly what it read then. The offset is the
 *   original nesting undone: a scene sits at `scene.from` and its content at `appearAt` within it.
 */
function Replay({
  recall,
  source,
  appearAt,
  frame,
  slideCount,
}: {
  recall: Recall;
  source: Scene;
  appearAt: number;
  /** The composition's own frame. */
  frame: number;
  slideCount: number;
}) {
  return (
    <Sequence
      from={recall.from}
      durationInFrames={recall.durationInFrames}
      layout="none"
      name={`replay-${source.ordinal}-${recall.id}`}
    >
      <Sequence from={-(recall.sourceFrom - source.from - appearAt)} layout="none">
        <Slide
          scene={source}
          slideCount={slideCount}
          absoluteFrame={recall.sourceFrom + (frame - recall.from)}
        />
      </Sequence>
    </Sequence>
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
