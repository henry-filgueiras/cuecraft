import { createContext, useContext, useMemo } from "react";

import type { SubtitleCue } from "./subtitle.ts";
import { subtitleAt, subtitleFit } from "./subtitle.ts";
import {
  COLORS,
  FONT_STACK,
  FRAME,
  HEADING_WIDTH,
  SUBTITLE,
  subtitleBand,
} from "./theme.ts";

// Moved to `./subtitle.ts` when `./explain.ts` became its second caller, and re-exported here so
// that every importer of it stayed where it was. See the note on its definition.
export { subtitleFit };

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
 * ## Two rows, always
 *
 * A subtitle is a *component*, not a line of text that happens to be near the bottom: a metadata
 * row, then the sentence. Both rows are drawn on every cue of every subtitled deck, and the band
 * above reserves the room for both unconditionally (`subtitleBand`).
 *
 * What varies is only what the metadata row holds. A film that changes speaker puts the narrator's
 * declared name there in their colour. A film that does not puts the deck's own opening mark there
 * — the 88x6 accent bar that `Rule` draws at the top of every slide, saying the one thing that is
 * true when nobody was named: *a block begins here*.
 *
 * decision:41 records the argument; sprint:13 found it by rendering the alternative rather than by
 * reasoning about it. When the row
 * was charged only to decks that named a cast, `examples/witnessglass.yaml`'s `index` slide put
 * "what it returned," at the same left edge, in the same weight and near enough the same size as
 * the four list rows above it, directly beneath the list's own closing hairline — where it read as
 * row 05. The named form was pleasant for a reason that had nothing to do with identity: it had a
 * second typographic register above the sentence, and a mark in a colour the slide was not using.
 *
 * ## What it deliberately is not
 *
 * Not centred: cuecraft has no centred text and a centred subtitle is the strongest single signal
 * that captions were added to a video afterwards. Not boxed: structure in this deck is carried by
 * scale, position and hairlines, and a filled panel would be the only card in the design language.
 * Not faded in or out per cue, beyond the deck's own opener and closer: a subtitle that animates is
 * a subtitle drawing attention to the machinery instead of to the sentence.
 *
 * And not scrimmed, which is what a caption over video normally does for contrast. sprint:13 built
 * one and measured it: a bottom-anchored ramp to `rgba(10, 13, 18, 0.55)` moved the darkest pixel
 * under it by *one level*, on `witnessglass` and on `tap`'s lit transcript world alike. The reason
 * is structural rather than a matter of taste — `COLORS.ink` is already the darkest thing cuecraft
 * ever puts on a frame, so a darkening scrim is ink painted over ink and there is nothing below it
 * to darken toward. A *lightening* one is visible, and looks like a smudge on the lens: the deck's
 * background is flat by decision, and the previous round's banding evidence applies to a vertical
 * ramp exactly as it did to a radial one. Contrast stays with the tight text shadow, which is local
 * to the glyphs and has nothing large enough to band.
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
        // and fills it from the top, so the metadata row and the first line of every sentence land
        // on exactly the same two rows for the length of the film. Anchoring the bottom was tried
        // first and is subtly worse: a one-line cue sits lower than a two-line one, so the text a
        // viewer is reading moves up and down as sentences change length.
        bottom: 0,
        height: subtitleBand(fit) - SUBTITLE.gap,
        width: HEADING_WIDTH,
        fontFamily: FONT_STACK,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        gap: SUBTITLE.labelGap,
      }}
    >
      {/* The metadata row, drawn on every cue of every subtitled deck (`subtitleBand`). What it
        holds varies; that it is there does not. */}
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
        {cue.speaker === undefined ? (
          // Nobody was named, so the row says the only true thing left: a block begins here. The
          // deck's own opening mark, at the deck's own weight — see SUBTITLE.markWidth for why a
          // stand-in name would have been the wrong answer.
          <div
            style={{
              width: SUBTITLE.markWidth,
              height: SUBTITLE.markHeight,
              backgroundColor: COLORS.accent,
            }}
          />
        ) : (
          cue.speaker.name
        )}
      </div>
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
