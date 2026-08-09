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
import { recallAt } from "../compile/timeline.ts";
import { FactsContext } from "./figures.tsx";
import { Slide } from "./layouts.tsx";
import type { SubtitleCue } from "./subtitle.ts";
import { SubtitleBandContext, Subtitles, subtitleFit } from "./subtitles.tsx";
import {
  COLORS,
  FONT_STACK,
  FRAME,
  MONO_STACK,
  MOTION,
  RECALL,
  SUBTITLE,
  subtitleBand,
} from "./theme.ts";

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

  // Whether the film is quoting itself on this frame. Derived from the compiled recalls rather than
  // stored anywhere, because a `Recall` already carries a frame and a duration and whether this
  // frame is inside one is arithmetic (`../compile/timeline.ts`).
  //
  // **One decision, read twice.** The card below and the subtitle suppression further down both
  // hang off this single answer rather than off two mechanisms that happen to agree — an earlier
  // cut had the card gated by a `<Sequence>` and the subtitle by this, which is two ways of saying
  // the same thing and therefore two ways of drifting apart.
  const quoted = recallAt(scenes, frame);
  const quotation = quotationProps(quoted?.recall, scenes, frame, timeline.subtitles);

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

            {/* Over the current slide, which keeps rendering underneath at its own present-time
              frame: a quotation is shown *inside* the film rather than instead of it, and the two
              progress positions on screen at once are the whole of what says so. */}
            {quotation === undefined ? null : (
              <QuotationCard
                {...quotation}
                width={timeline.width}
                height={timeline.height}
                fps={timeline.fps}
              />
            )}

            {/* Above every scene and inside none of them: no camera transform, no world scale and
              no per-slide fade can reach it, which is the whole of why it stays still while the
              picture moves. Inside the deck opacity, so the film still settles to background.
              *Except* while the film is quoting itself — a recalled sentence belongs to the
              recalled canvas, and drawing it in the present frame's furniture as well would both
              double it and put a caption from the past under a slide from the present. */}
            {quoted === undefined ? (
              <Subtitles cues={timeline.subtitles} frame={frame} />
            ) : null}
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
 * The quoted canvas on its own, with nothing around it.
 *
 * A diagnostic surface, and the reason it exists is worth stating plainly. sprint:15's strongest
 * evidence was an exact one: a replayed frame and the frame it replays, rendered independently
 * through the real browser, came out **byte-identical**. Adding the quotation card necessarily
 * destroys that equality at the composition level — the final frame now has a scrim, a transform, an
 * outline and a label on it, and it is supposed to.
 *
 * What must not be destroyed is the claim underneath it: that *the thing being quoted* is still
 * exactly the moment it claims to be. So the boundary moves rather than the rigour. This renders the
 * same `RecalledCanvas` the card renders, at the same frames, with no framing — and the byte
 * equality is asserted there instead. Because it is the same component and not a re-implementation,
 * a change that broke the card's mapping would break this too.
 *
 * Nothing outside the render test uses it, it takes the same props as the film, and it draws nothing
 * at all on a frame where no recall is playing.
 */
export function RecalledCanvasVideo({ timeline }: PresentationProps) {
  const frame = useCurrentFrame();
  const { scenes } = timeline;
  const band =
    timeline.subtitles.length === 0 ? 0 : subtitleBand(subtitleFit(timeline.subtitles));

  const quotation = quotationProps(
    recallAt(scenes, frame)?.recall,
    scenes,
    frame,
    timeline.subtitles,
  );

  return (
    <FactsContext value={timeline.facts}>
      <SubtitleBandContext value={band}>
        <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
          <AbsoluteFill>
            {quotation === undefined ? null : <RecalledCanvas {...quotation} />}
          </AbsoluteFill>
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

export interface ReplayProps {
  readonly recall: Recall;
  readonly source: Scene;
  readonly appearAt: number;
  /** The composition's own frame. */
  readonly frame: number;
  readonly slideCount: number;
  readonly cues: readonly SubtitleCue[];
}

/**
 * Everything the quotation needs, worked out once from the recall that is playing.
 *
 * A function rather than three lines inline, because both the film and the diagnostic canvas need
 * the same answer and a second copy of "which scene is being quoted, and what was its `appearAt`"
 * is a second copy that can be wrong.
 */
function quotationProps(
  recall: Recall | undefined,
  scenes: readonly Scene[],
  frame: number,
  cues: readonly SubtitleCue[],
): ReplayProps | undefined {
  if (recall === undefined) return undefined;
  const at = scenes.findIndex((scene) => scene.ordinal === recall.sourceOrdinal);
  const source = scenes[at];
  if (source === undefined) return undefined;
  return {
    recall,
    source,
    appearAt: sceneMotion(source, at, scenes).appearAt,
    frame,
    slideCount: scenes.length,
    cues,
  };
}

/**
 * What is being quoted: the earlier slide, whole, at the moment it is being replayed from.
 *
 * **This component is the correctness claim.** Everything about the replayed picture is decided
 * here and nothing is decided by the frame around it, which is what lets the frame be added,
 * changed or removed without anybody having to re-argue that the right moment is on screen. It
 * renders full-bleed and unadorned, exactly as the film rendered this slide the first time.
 *
 * Two frames are handed down, and they are different numbers for different jobs:
 *
 * - **`absoluteFrame`** is `sourceFrom + (frame - from)` — where on the deck's clock the recalled
 *   slide *was*. Anchors, spans, beats and camera keys are all absolute (decision:13), so this is
 *   what makes an element that lit up during the original sentence light up again here.
 * - **The sequence-local frame** is what every entrance animation in `./layouts.tsx` reads, and it
 *   is set by the `<Sequence>` below. The wanted local frame is
 *
 *       L = sourceFrom + (frame - recall.from) - source.from - appearAt
 *
 *   — the original nesting undone, since a scene sits at `scene.from` and its content at `appearAt`
 *   within it. Mounted at the composition root, `frame - L` is the constant below, and that is why
 *   this component is **self-contained**: it does not have to be inside any particular `<Sequence>`
 *   to read the right frame. An earlier cut took the offset relative to a wrapping sequence, and the
 *   diagnostic surface that renders this without one silently drew a different moment — which is
 *   exactly the class of bug the byte-equality proof exists to catch, and did.
 *
 * The subtitle is *inside* the canvas rather than outside it, because it is part of what is being
 * quoted: the sentence and the picture were one moment, and the deck-level band is furniture
 * belonging to the present frame (`./subtitles.tsx`). It is drawn from the same finished track the
 * band reads, so the words, the speaker and the interval are the compiler's rather than this
 * component's.
 */
export function RecalledCanvas({
  recall,
  source,
  appearAt,
  frame,
  slideCount,
  cues,
}: ReplayProps) {
  return (
    <Sequence
      from={recall.from + source.from + appearAt - recall.sourceFrom}
      layout="none"
    >
      <AbsoluteFill>
        <Slide
          scene={source}
          slideCount={slideCount}
          absoluteFrame={recall.sourceFrom + (frame - recall.from)}
        />
        <Subtitles cues={cues} frame={frame} />
      </AbsoluteFill>
    </Sequence>
  );
}

/**
 * The quotation card: the past shown whole, inside something, over a present that has receded.
 *
 * sprint:15 played a recall full-bleed and proved the frame was byte-identical to its source. What
 * `examples/retry.yaml` then showed at full size is that byte-identical is not the same as legible:
 * a hard cut between two native cuecraft slides is indistinguishable from ordinary progression, so
 * the film was correct and said nothing. A viewer who does not already remember slide 1 has no way
 * to tell evidence from the next thing.
 *
 * The fix is a **frame rather than a filter**, and the distinction is the whole of the design.
 * Cinema marks a flashback by damaging it — sepia, grain, blur, a filtered voice — and every one of
 * those degrades the thing being quoted in order to say that it is quoted. Here the evidence *is*
 * the sentence, so it stays undamaged and legible, and what marks it is that it is now inside
 * something: scaled off the edges, outlined in the deck's own accent, and labelled with the slide it
 * came from.
 *
 * **Both clocks are on screen at once**, which is the part that needs no new vocabulary at all. The
 * present slide keeps rendering underneath at its own present-time frame with its progress rule at
 * the bottom edge; the quoted canvas carries its own, retreated to where the film was. Nothing had
 * to be invented to say "a different moment of this film" — the deck already had a way of saying
 * where it is, and now two of them are visible.
 *
 * Still a hard cut in and a hard cut out. No fade, no settle, no interpolation: the card appears on
 * one frame and is gone on the next. It needs no `<Sequence>` of its own to arrange that, because
 * it is only mounted on the frames `recallAt` says are quoted — the compiled interval, exactly, and
 * the same answer the subtitle band is suppressed by.
 */
function QuotationCard({
  width,
  height,
  fps,
  ...canvas
}: ReplayProps & { width: number; height: number; fps: number }) {
  const { recall } = canvas;

  // The card, in screen space. Rounded to whole pixels so the outline lands on a pixel boundary
  // rather than on a half of one, which at a 2px hairline is the difference between a line and a
  // smear.
  const w = Math.round(width * RECALL.inset);
  const h = Math.round(height * RECALL.inset);
  const x = Math.round((width - w) / 2);
  const y = Math.round((height - h) / 2);

  return (
    <AbsoluteFill>
      {/* The present recedes — but its clock does not. The deck's own background at partial
        opacity, rather than a blur or a desaturation, so nothing new appears on the frame; and it
        stops short of the bottom edge, because the present slide's progress rule is the one thing
        down there that is not content. Scrimmed with everything else it goes to an unreadable
        brown, and the frame loses the second clock — which is the entire reason the present slide
        is still on screen at all. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          bottom: FRAME.progressHeight,
          backgroundColor: COLORS.ink,
          opacity: RECALL.recede,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          overflow: "hidden",
          // Outside the box rather than inside it, so the hairline is exactly its own width and
          // steals no pixel from what is being quoted.
          outline: `${RECALL.outline}px solid ${COLORS.accent}`,
        }}
      >
        {/* The canvas is laid out at full size and *then* scaled, so every fitting decision inside
          it — type size, line breaks, the subtitle band — is the one the film made the first time.
          Laying it out into a smaller box would re-fit it, and a quotation that rewrapped would no
          longer be the frame it claims to be. */}
        <div
          style={{
            width,
            height,
            transform: `scale(${RECALL.inset})`,
            transformOrigin: "top left",
          }}
        >
          <RecalledCanvas {...canvas} />
        </div>
      </div>

      <QuotationFooter
        recall={recall}
        frame={canvas.frame}
        fps={fps}
        left={x}
        width={w}
        top={y + h + RECALL.footerGap}
      />
    </AbsoluteFill>
  );
}

/**
 * How long the quotation is, and how far through it we are.
 *
 * The one thing the card by itself cannot say. It answers "this is the past" and "which slide", and
 * a viewer is then holding an open question — a quotation is a hold on the present, and a hold of
 * unknown length reads as an interruption rather than as evidence. Everything needed to close that
 * is already compiled: a `Recall` has a first frame and a measured duration, and the current frame
 * is the third number. So this is a **reading** of the interval and adds nothing to it.
 *
 * ## What it is not
 *
 * Not a player. There is no play mark, no pause mark, no handle on the rail and no shape that
 * invites a click, because none of those would be true — this is a rendered MP4 and the frame
 * cannot honour an affordance. cuecraft has never drawn a control it does not have.
 *
 * ## Why the rail is thinner than a progress rule
 *
 * With the footer on, the frame carries three horizontal accent bars, and they mean three different
 * things: the present slide's position in the deck along the bottom edge, the quoted slide's
 * position in the deck inside the card, and recall-local progress here between them. That is the
 * risk the round was opened to test. Weight is what separates them — `RECALL.rail` is thinner than
 * `FRAME.progressHeight`, and this one is inset between two blocks of type rather than running the
 * full bleed, so it reads as part of a caption rather than as a third edge of the frame.
 *
 * The time is set in `MONO_STACK` in the seconds idiom `figures.tsx` already uses for a derived
 * number, at one decimal: two decimals at 30fps is a digit changing three times a second in the
 * corner of a frame somebody is trying to read a quotation on.
 */
function QuotationFooter({
  recall,
  frame,
  fps,
  left,
  width,
  top,
}: {
  recall: Recall;
  frame: number;
  fps: number;
  left: number;
  width: number;
  top: number;
}) {
  // Clamped rather than trusted: the card is only mounted inside the interval, so this is belt and
  // braces against a caller that mounts it elsewhere — and a rail that overshot would be a rail
  // reporting something the compiler did not say.
  const elapsed = Math.min(Math.max(frame - recall.from, 0), recall.durationInFrames);
  const through = recall.durationInFrames === 0 ? 1 : elapsed / recall.durationInFrames;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: RECALL.label,
        display: "flex",
        alignItems: "center",
        gap: RECALL.railGap,
        fontFamily: FONT_STACK,
        color: COLORS.accent,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: RECALL.labelGap,
          flex: "none",
          fontSize: RECALL.label,
          fontWeight: 700,
          letterSpacing: SUBTITLE.labelTracking,
          textTransform: "uppercase",
        }}
      >
        <Backmark />
        {`Recall · Slide ${recall.sourceOrdinal}`}
      </div>

      <div
        style={{
          flex: "none",
          width: RECALL.railWidth,
          height: RECALL.rail,
          backgroundColor: COLORS.track,
        }}
      >
        <div
          style={{
            width: `${through * 100}%`,
            height: "100%",
            backgroundColor: COLORS.accent,
          }}
        />
      </div>

      {/* Hard against the end of the rail, not justified to the far edge of the card.
        Right-justified was the first cut and it makes a claim the rail does not honour: the eye
        reads the number as the rail's end label, so a thousand pixels of gap between them says the
        track runs all the way over there. At 6.9s of 7.1s that is actively misleading — a meter
        that looks full, ending nowhere near the total printed beside it. Where the rail stops is
        where the reading stops, and the two now touch. */}
      <div
        style={{
          flex: "none",
          fontFamily: MONO_STACK,
          fontSize: RECALL.time,
          // The elapsed half is the one that moves; the total is context, so it recedes.
          color: COLORS.dim,
        }}
      >
        <span style={{ color: COLORS.accent }}>{seconds(elapsed / fps)}</span>
        {` / ${seconds(recall.durationInFrames / fps)}`}
      </div>
    </div>
  );
}

/** One decimal: at 30fps, two would put a digit changing three times a second on the frame. */
function seconds(value: number): string {
  return `${value.toFixed(1)}s`;
}

/**
 * The deck's accent bar with a return on it, drawn rather than typed.
 *
 * A glyph would have been shorter — `↶` says exactly this — and dragon:4 is the reason it is
 * not used: cuecraft's typography depends on whatever fonts the host machine has, and an arrow that
 * renders as a tofu box on one machine is worse than no mark at all. Two divs cannot go missing.
 */
function Backmark() {
  return (
    <div
      style={{
        position: "relative",
        width: SUBTITLE.markWidth,
        height: RECALL.label,
        flex: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: Math.round(RECALL.label / 2) - SUBTITLE.markHeight,
          width: SUBTITLE.markWidth,
          height: SUBTITLE.markHeight,
          backgroundColor: COLORS.accent,
        }}
      />
      {/* The turn back: a short stroke rising from the bar's left end, so the mark reads as
        something returning to where it started rather than as a plain rule. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: Math.round(RECALL.label / 2) - SUBTITLE.markHeight,
          width: SUBTITLE.markHeight,
          height: RECALL.backmarkRise,
          backgroundColor: COLORS.accent,
        }}
      />
    </div>
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
