import { createContext, useContext, useMemo } from "react";

import type { SubtitleCue } from "./subtitle.ts";
import { subtitleAt } from "./subtitle.ts";
import {
  COLORS,
  FONT_STACK,
  FRAME,
  HEADING_WIDTH,
  SUBTITLE,
  fitSubtitle,
  subtitleBand,
} from "./theme.ts";

/**
 * The narration, set on the frame, outside everything that moves.
 *
 * ## Screen space, and why that is the whole placement argument
 *
 * decision:36 took the camera out of the world so that looking at a rectangle stopped being a fact
 * about graphs. This is the same separation one layer further out: a subtitle is drawn by the
 * *composition root*, above every scene, inside no `Frame`, under no camera transform and inside no
 * `Sequence` that a slide owns. Nothing an archetype does can reach it.
 *
 * That matters most where cuecraft is least like a slideshow. An atlas is a place larger than the
 * window and the camera flies through it; a transcript scrolls a band of traffic. If the sentence
 * explaining the picture were *in* the picture it would pan, zoom and scale along with the thing it
 * is explaining, which is precisely backwards: the explanation is the one thing on the frame that
 * should be still.
 *
 * ## The band, and why the composition gives it up
 *
 * Screen space alone would put the words on top of the slide. cuecraft's compositions do not leave
 * a gap at the bottom to be captioned into — they are *fitted* to the box they are given, so a
 * specimen, a formula or a figure would run underneath the text.
 *
 * So the room is taken out of the box before anything is laid out (`subtitleBand`), deck-wide and
 * derived, and handed down as a context rather than as a prop through nine archetypes. Two
 * compositions cannot give it up: `atlas` and `transcript` ask `Frame` for full bleed because what
 * they are showing extends past all four edges, and there is no margin to take. Those two are
 * overlaid, and that is a real cost recorded as dragon:21 rather than solved with a layout engine.
 *
 * ## What it deliberately is not
 *
 * Not centred: cuecraft has no centred text and a centred subtitle is the strongest single signal
 * that captions were added to a video afterwards. Not boxed: structure in this deck is carried by
 * scale, position and hairlines, and a filled panel would be the only card in the design language.
 * Not faded in or out per cue, beyond the deck's own opener and closer: a subtitle that animates is
 * a subtitle drawing attention to the machinery instead of to the sentence.
 *
 * And not gradient-scrimmed, which is what a caption over video normally does for contrast. That
 * was tried and rejected on evidence cuecraft already had: `Frame`'s background is flat because a
 * soft highlight banded into visible arcs once encoded to H.264, and eight-bit near-black has no
 * more room for a vertical ramp than it had for a radial one. Contrast is carried by a tight text
 * shadow instead, which is local to the glyphs and has nothing large enough to band.
 */

/**
 * How much room the composition above has given up, in pixels.
 *
 * Zero everywhere except under a deck that asked for subtitles, so every existing deck's
 * `bodyBox` arithmetic is unchanged by construction rather than by a branch.
 */
export const SubtitleBandContext = createContext<number>(0);

export function useSubtitleBand(): number {
  return useContext(SubtitleBandContext);
}

/**
 * One size and one line count for the whole deck.
 *
 * Fitted across every sentence the film will show — `fitQuote`'s move (decision:28), and the
 * reason is stronger here: type that resized when the narration moved on would put a change of
 * size under every full stop.
 */
export function subtitleFit(cues: readonly SubtitleCue[]) {
  const labelled = cues.some((cue) => cue.speaker !== undefined);
  const fit = fitSubtitle(
    cues.map((cue) => cue.text),
    HEADING_WIDTH,
  );
  return { ...fit, labelled };
}

export function useSubtitleFit(cues: readonly SubtitleCue[]) {
  return useMemo(() => subtitleFit(cues), [cues]);
}

/**
 * The tight halo that keeps a subtitle legible over a world plate or a lit specimen.
 *
 * Three stacked shadows rather than one: a near-opaque one at no offset to kill the background
 * immediately around each stroke, and two softer ones to carry the letterform apart from whatever
 * is behind it. All of them are the deck's own ink, so nothing new appears on the frame — the
 * background simply asserts itself for a few pixels.
 */
const HALO = ["0 0 2px rgba(10, 13, 18, 0.96)", "0 1px 7px rgba(10, 13, 18, 0.88)"].join(
  ", ",
);

export function Subtitles({
  cues,
  frame,
}: {
  cues: readonly SubtitleCue[];
  /** The composition's own frame. Subtitle intervals are absolute, like every other frame here. */
  frame: number;
}) {
  const fit = useSubtitleFit(cues);
  const cue = subtitleAt(cues, frame);
  if (cue === undefined) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: FRAME.marginX,
        // **Anchored by its top edge, not its bottom.** The block is given the whole band's height
        // and fills it from the top, so the speaker's name and the first line of every sentence
        // land on exactly the same two rows for the length of the film. Anchoring the bottom was
        // tried first and is subtly worse: a one-line cue sits lower than a two-line one, so the
        // text a viewer is reading moves up and down as sentences change length.
        bottom: 0,
        height: subtitleBand(fit) - SUBTITLE.gap,
        width: HEADING_WIDTH,
        fontFamily: FONT_STACK,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        gap: fit.labelled ? SUBTITLE.labelGap : 0,
      }}
    >
      {fit.labelled ? (
        <div
          style={{
            height: Math.ceil(SUBTITLE.label * 1.1),
            display: "flex",
            alignItems: "center",
            fontSize: SUBTITLE.label,
            fontWeight: 700,
            letterSpacing: SUBTITLE.labelTracking,
            // The name is the identity; the colour is a second way of reading the same fact.
            // Neither is load-bearing alone, which is what makes this survive greyscale.
            color: cue.speaker?.color ?? "transparent",
            textShadow: HALO,
            textTransform: "uppercase",
          }}
        >
          {cue.speaker?.name ?? ""}
        </div>
      ) : null}
      <div
        style={{
          fontSize: fit.size,
          lineHeight: SUBTITLE.lineHeight,
          fontWeight: 400,
          letterSpacing: "-0.008em",
          color: COLORS.paper,
          textShadow: HALO,
          // Wrapped, never clipped and never shortened: an utterance is projected whole or it is
          // not projected (decision:28).
          textWrap: "pretty",
        }}
      >
        {cue.text}
      </div>
    </div>
  );
}
