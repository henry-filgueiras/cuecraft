import { createContext, useContext } from "react";
import { interpolate, useCurrentFrame } from "remotion";

import {
  anchorAt,
  around,
  clipAt,
  type AnchorFact,
  type ClipFact,
  type CompilationFacts,
} from "../compile/facts.ts";
import type { FigureKind } from "../presentation/figure.ts";
import { anchorState, WORLD_TIMING } from "./anchor.ts";
import { useSubtitleBand } from "./subtitles.tsx";
import {
  CODE,
  COLORS,
  FIGURE,
  MONO_STACK,
  MOTION,
  QUOTE_LEADING,
  SPACE,
  TYPE,
  bodyBox,
  fitQuote,
  mix,
  quoteHeight,
  withAlpha,
} from "./theme.ts";

/**
 * The compilation, drawn.
 *
 * Two compositions, both of which show facts about the video they are inside: the measured
 * boundaries of its own narration, and the relationships its own narration resolved. Nothing here
 * is authored except the choice of which of the two to show.
 *
 * The design problem is not access — the facts are right there — it is that **raw compiler state
 * is not presentation content**. A deck with thirty resolved anchors listed at once is a debugger,
 * and reading a debugger is work. So both figures *project*: they select the neighbourhood of the
 * moment, order it the way it is heard, format it the way a caption is formatted, and light the
 * one that is happening now. Selection and emphasis are the renderer's, as composition always has
 * been; the numbers are the compiler's and are never adjusted.
 *
 * The other design problem is that these are the only graphics in cuecraft where a number is the
 * subject. So the numbers are set at display scale in a tabular face, and the prose around them
 * is small — the opposite of every developer timeline ever made, and the whole reason these read
 * as explanation rather than as instrumentation.
 */

/**
 * Facts reach the compositions by context rather than by prop.
 *
 * Threading a fifth argument through `Slide` -> `Composition` -> `Atlas` -> `Portal` -> `Interior`
 * -> `Composition` would have put the compilation's own output in the signature of every
 * archetype, including the seven that will never look at it.
 */
export const FactsContext = createContext<CompilationFacts | undefined>(undefined);

export function useFacts(): CompilationFacts | undefined {
  return useContext(FactsContext);
}

export function Figure({
  kind,
  title,
  absoluteFrame,
}: {
  kind: FigureKind;
  /** The heading above the figure — which is how much canvas is left under it. */
  title: string;
  absoluteFrame: number;
}) {
  const facts = useFacts();
  if (facts === undefined || facts.clips.length === 0) return null;
  return kind === "timing" ? (
    <Chronicle facts={facts} title={title} absoluteFrame={absoluteFrame} />
  ) : (
    <Resolution facts={facts} title={title} absoluteFrame={absoluteFrame} />
  );
}

/** Seconds, to the hundredth. The precision *is* the claim: nothing rounded is measured. */
function seconds(value: number): string {
  return `${value.toFixed(2)}s`;
}

function timecode(value: number): string {
  const whole = Math.floor(value);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** A sentence, quoted. Formatting is the renderer's; the words are the author's, all of them. */
function quoted(text: string): string {
  return `“${text.trim()}”`;
}

/**
 * **timing** — the narration you are hearing, measured.
 *
 * A single rail spanning the whole video, one span per synthesized sentence, positioned and
 * widthed by the frames the compiler assigned them. Nothing is to scale by convention; it is to
 * scale because the scale is the data.
 *
 * Underneath, the sentence being spoken *right now* and the number that is its real length. The
 * playhead is not a runtime clock — the render is deterministic, so where the video has got to is
 * simply this frame against the boundaries the compiler froze. That is what makes the marker
 * truthful rather than decorative: it is derived from the same fact as the sound.
 */
function Chronicle({
  facts,
  title,
  absoluteFrame,
}: {
  facts: CompilationFacts;
  title: string;
  absoluteFrame: number;
}) {
  const band = useSubtitleBand();
  const frame = useCurrentFrame();
  const current = clipAt(facts, absoluteFrame);
  const at = (value: number) => (value / facts.totalFrames) * 100;

  // The measured duration takes a fixed column — the widest one any clip will need — so the
  // sentence beside it starts in the same place all the way through, and so the width left for
  // the sentence is known before anything is drawn.
  const measureWidth = Math.ceil(
    Math.max(...facts.clips.map((clip) => seconds(clip.seconds).length)) *
      FIGURE.measure *
      CODE.charWidth,
  );
  const quote = fitQuote(
    facts.clips.map((clip) => quoted(clip.text)),
    bodyBox(title, band).width - measureWidth - SPACE.xl,
  );

  const drawn = interpolate(frame, [0, MOTION.rise * 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrived = interpolate(frame, [MOTION.rise, MOTION.rise * 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingBottom: SPACE.xxl,
      }}
    >
      <Legend left="measured narration" right={`${facts.clips.length} clips`} />

      <div
        style={{ position: "relative", marginTop: SPACE.xxl, height: FIGURE.railBlock }}
      >
        {/* Where the relationships land, above the rail: the ticks are the anchors. */}
        {facts.anchors.map((anchor) => (
          <div
            key={`${anchor.id}-${anchor.frame}`}
            style={{
              position: "absolute",
              left: `${at(anchor.frame)}%`,
              top: 0,
              width: 2,
              height: FIGURE.tick,
              backgroundColor: withAlpha(COLORS.accent, 0.55 * drawn),
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: FIGURE.tick + SPACE.sm,
            height: FIGURE.rail,
            borderRadius: FIGURE.rail / 2,
            backgroundColor: withAlpha("#4A5E7A", 0.28),
          }}
        />
        {facts.clips.map((clip) => {
          const past = clip.from + clip.durationInFrames <= absoluteFrame;
          const live = current?.ordinal === clip.ordinal;
          return (
            <div
              key={clip.ordinal}
              style={{
                position: "absolute",
                left: `${at(clip.from)}%`,
                width: `${Math.max(0.25, at(clip.durationInFrames) * drawn)}%`,
                top: FIGURE.tick + SPACE.sm,
                height: FIGURE.rail,
                borderRadius: FIGURE.rail / 2,
                backgroundColor: live
                  ? FIGURE.timeLit
                  : withAlpha(FIGURE.time, past ? 0.85 : 0.34),
                boxShadow: live ? `0 0 26px ${withAlpha(FIGURE.timeLit, 0.8)}` : "none",
              }}
            />
          );
        })}

        {/* Where the video has got to, which is this frame against those boundaries. Given a
            head, because a hairline is a rendering artefact and a marker is a claim. */}
        <div
          style={{
            position: "absolute",
            left: `${at(absoluteFrame)}%`,
            top: 0,
            width: 2,
            height: FIGURE.railBlock,
            backgroundColor: COLORS.paper,
            opacity: arrived,
            boxShadow: `0 0 20px ${withAlpha(COLORS.paper, 0.9)}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${at(absoluteFrame)}%`,
            top: -(FIGURE.label + SPACE.sm),
            transform: "translateX(-50%)",
            opacity: arrived,
            fontFamily: MONO_STACK,
            fontSize: FIGURE.label,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.paper,
            whiteSpace: "nowrap",
            textShadow: `0 0 20px ${withAlpha("#05070B", 1)}`,
          }}
        >
          you are here
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: FIGURE.railBlock - FIGURE.scale,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: MONO_STACK,
            fontSize: FIGURE.scale,
            color: COLORS.dim,
            opacity: drawn,
          }}
        >
          <span>0:00</span>
          <span>{timecode(facts.totalSeconds)}</span>
        </div>
      </div>

      {current !== undefined ? (
        <CurrentClip
          clip={current}
          arrived={arrived}
          measureWidth={measureWidth}
          quote={quote}
        />
      ) : null}
    </div>
  );
}

/**
 * The sentence being heard, and its real length, at the size a headline is set.
 *
 * The block is given the height of the longest sentence in the deck rather than of this one, so
 * the rail above it does not shift up and down as the narration moves from a short cue to a long
 * one. The sentence itself is whole, always (`fitQuote`).
 */
function CurrentClip({
  clip,
  arrived,
  measureWidth,
  quote,
}: {
  clip: ClipFact;
  arrived: number;
  measureWidth: number;
  quote: { readonly size: number; readonly lines: number };
}) {
  return (
    <div
      style={{
        marginTop: SPACE.xxl,
        display: "flex",
        alignItems: "baseline",
        gap: SPACE.xl,
        opacity: arrived,
      }}
    >
      <div
        style={{
          width: measureWidth,
          fontFamily: MONO_STACK,
          fontSize: FIGURE.measure,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: FIGURE.timeLit,
          textShadow: `0 0 46px ${withAlpha(FIGURE.timeLit, 0.45)}`,
        }}
      >
        {seconds(clip.seconds)}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: MONO_STACK,
            fontSize: FIGURE.label,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.dim,
          }}
        >
          clip {String(clip.ordinal).padStart(2, "0")} · measured, not estimated
        </div>
        <div
          style={{
            marginTop: SPACE.sm,
            height: quoteHeight(quote.size, quote.lines),
            fontSize: quote.size,
            lineHeight: QUOTE_LEADING,
            color: COLORS.muted,
          }}
        >
          {quoted(clip.text)}
        </div>
      </div>
    </div>
  );
}

/**
 * **anchors** — what the author wrote, and when cuecraft decided it becomes true.
 *
 * Two columns, and the gap between them is the entire thesis of the project. On the left, things
 * somebody typed: a sentence, and the name of what it is about. On the right, a number nobody
 * typed and nobody could have. The row that is currently true is lit.
 *
 * A few rows, not all of them, chosen around the moment — the projection decision. The full list
 * is available and putting it on screen would be a worse presentation of the same truth.
 *
 * *How many* rows is derived rather than fixed, because the sentences are set whole and a row
 * that has to hold a whole sentence is as tall as that sentence needs. `FIGURE.rows` is the most
 * worth showing and `FIGURE.minRows` the fewest that still read as a neighbourhood; between them
 * the answer is however many fit under the heading. Selecting fewer relationships is a projection
 * cost; dropping half a sentence is a lie about what was said.
 */
function Resolution({
  facts,
  title,
  absoluteFrame,
}: {
  facts: CompilationFacts;
  title: string;
  absoluteFrame: number;
}) {
  const band = useSubtitleBand();
  const frame = useCurrentFrame();
  const current = anchorAt(facts, absoluteFrame);
  const index = facts.anchors.findIndex(
    (anchor) => anchor.frame === current?.frame && anchor.id === current?.id,
  );

  const quote = fitQuote(
    facts.anchors.map((anchor) => quoted(anchor.text)),
    rowQuoteWidth(bodyBox(title, band).width),
  );
  const rowHeight = quoteHeight(quote.size, quote.lines) + 2 * SPACE.md;
  const budget = bodyBox(title, band).height - SPACE.xxl - LEGEND_HEIGHT - SPACE.lg;
  const rows = Math.max(
    FIGURE.minRows,
    Math.min(FIGURE.rows, Math.floor(budget / rowHeight)),
  );
  const window = around(facts.anchors, Math.max(index, 0), rows);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingBottom: SPACE.xxl,
      }}
    >
      <Legend left="what the author wrote" right="when cuecraft resolved it" />
      <div style={{ marginTop: SPACE.lg }}>
        {window.items.map((anchor, row) => (
          <Row
            key={`${anchor.id}-${anchor.frame}`}
            anchor={anchor}
            live={anchor.frame === current?.frame && anchor.id === current?.id}
            reached={anchor.frame <= absoluteFrame}
            frame={frame}
            delay={MOTION.contentDelay + row * MOTION.stagger * 1.6}
            absoluteFrame={absoluteFrame}
            height={rowHeight}
            quote={quote}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The measure a row's sentence is set to.
 *
 * The row bleeds one gutter to the left of the column so its lit background reads as a band
 * rather than as a box, and the two derived columns on the right are fixed — so the sentence gets
 * what is left, and it is known without measuring anything.
 */
function rowQuoteWidth(width: number): number {
  return width - SPACE.lg - 2 * SPACE.lg - ROW_IDENTITY - ROW_RESOLVED;
}

const ROW_IDENTITY = 260;
const ROW_RESOLVED = 210;
/** The two small-caps column names, their rule, and the space above it. */
const LEGEND_HEIGHT = Math.ceil(FIGURE.label * 1.2) + SPACE.sm + 1;

function Row({
  anchor,
  live,
  reached,
  frame,
  delay,
  absoluteFrame,
  height,
  quote,
}: {
  anchor: AnchorFact;
  live: boolean;
  reached: boolean;
  frame: number;
  delay: number;
  absoluteFrame: number;
  /** Uniform across the window, so a one-line sentence does not shorten its own row. */
  height: number;
  quote: { readonly size: number; readonly lines: number };
}) {
  const arriving = interpolate(frame, [delay, delay + MOTION.rise], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // The same transient every other activation in cuecraft uses, read off the same frame the
  // anchor itself resolved to — so a row ignites here exactly when its element ignites out there.
  const { heat } = anchorState(
    absoluteFrame,
    live ? anchor.frame : undefined,
    WORLD_TIMING,
  );
  const presence = (reached ? 1 : 0.42) * arriving;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: SPACE.lg,
        height,
        padding: `0 ${SPACE.lg}px`,
        marginLeft: -SPACE.lg,
        borderRadius: 8,
        opacity: presence,
        backgroundColor: live
          ? withAlpha(FIGURE.derived, 0.07 + 0.06 * heat)
          : "transparent",
        boxShadow: live
          ? `inset 3px 0 0 0 ${mix(FIGURE.derived, "#FFFFFF", 0.3 * heat)}`
          : "none",
        transform: `translateY(${(1 - arriving) * 14}px)`,
      }}
    >
      <div
        style={{
          flex: 1,
          fontSize: quote.size,
          lineHeight: QUOTE_LEADING,
          color: live ? COLORS.paper : COLORS.muted,
        }}
      >
        {quoted(anchor.text)}
      </div>
      <div
        style={{
          width: ROW_IDENTITY,
          fontFamily: MONO_STACK,
          fontSize: FIGURE.identity,
          color: FIGURE.authored,
          letterSpacing: "-0.01em",
        }}
      >
        {anchor.id}
      </div>
      <div
        style={{
          width: ROW_RESOLVED,
          textAlign: "right",
          fontFamily: MONO_STACK,
          fontSize: FIGURE.resolved,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: live ? mix(FIGURE.derived, "#FFFFFF", 0.35 * heat) : FIGURE.derived,
          textShadow: live
            ? `0 0 ${34 * (0.4 + heat)}px ${withAlpha(FIGURE.derived, 0.6)}`
            : "none",
        }}
      >
        {seconds(anchor.seconds)}
      </div>
    </div>
  );
}

/** The two words at the top of every figure that say which half of the frame is which. */
function Legend({ left, right }: { left: string; right: string }) {
  const style = {
    fontFamily: MONO_STACK,
    fontSize: FIGURE.label,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
  };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        paddingBottom: SPACE.sm,
        borderBottom: `1px solid ${COLORS.hairline}`,
      }}
    >
      <span style={{ ...style, color: FIGURE.authored }}>{left}</span>
      <span style={{ ...style, color: FIGURE.derived }}>{right}</span>
    </div>
  );
}

export const FIGURE_TYPE = TYPE;
