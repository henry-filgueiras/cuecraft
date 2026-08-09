import { Composition, registerRoot } from "remotion";

import {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  type Timeline,
} from "../compile/timeline.ts";
import { PresentationVideo, RecalledCanvasVideo } from "./Presentation.tsx";

/**
 * The Remotion entry point.
 *
 * This file is never imported by Node — it is handed to `@remotion/bundler` as a path and
 * compiled by Remotion's own toolchain, which is why it may use JSX while the rest of the
 * source stays runnable under Node's type stripping.
 *
 * Duration is not known when the composition is registered: it comes from measured
 * narration (dragon:1). `calculateMetadata` is Remotion's documented mechanism for exactly
 * that — the compiled timeline arrives as input props and the composition sizes itself to
 * it. The registered defaults below are placeholders that only ever render in the Remotion
 * Studio preview.
 */

export const COMPOSITION_ID = "presentation";

/**
 * The quoted canvas, unframed — a diagnostic surface, not a film.
 *
 * Registered beside the presentation because sprint:16 put a quotation card around a replay, which
 * necessarily ended sprint:15's byte-equality between a replayed frame and the frame it replays: the
 * final composition now carries a scrim, a transform, an outline and a label, deliberately. The
 * claim underneath that equality — that what is being quoted is exactly the moment it claims to be —
 * is asserted here instead, against the same `RecalledCanvas` the card draws.
 *
 * It renders nothing on any frame where no recall is playing, which is every frame of every deck
 * that never quotes itself.
 */
export const CANVAS_ID = "recalled-canvas";

const PLACEHOLDER: Timeline = {
  title: "cuecraft",
  fps: DEFAULT_FPS,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  totalFrames: DEFAULT_FPS,
  scenes: [],
  facts: {
    fps: DEFAULT_FPS,
    totalFrames: DEFAULT_FPS,
    totalSeconds: 1,
    clips: [],
    anchors: [],
  },
  subtitles: [],
};

/** Both compositions size themselves to the timeline they are handed, and to nothing else. */
const metadata = ({ props }: { props: { timeline: Timeline } }) => ({
  durationInFrames: Math.max(1, props.timeline.totalFrames),
  fps: props.timeline.fps,
  width: props.timeline.width,
  height: props.timeline.height,
});

function Root() {
  return (
    <>
      <Composition
        id={COMPOSITION_ID}
        component={PresentationVideo}
        defaultProps={{ timeline: PLACEHOLDER }}
        durationInFrames={PLACEHOLDER.totalFrames}
        fps={PLACEHOLDER.fps}
        width={PLACEHOLDER.width}
        height={PLACEHOLDER.height}
        calculateMetadata={metadata}
      />
      <Composition
        id={CANVAS_ID}
        component={RecalledCanvasVideo}
        defaultProps={{ timeline: PLACEHOLDER }}
        durationInFrames={PLACEHOLDER.totalFrames}
        fps={PLACEHOLDER.fps}
        width={PLACEHOLDER.width}
        height={PLACEHOLDER.height}
        calculateMetadata={metadata}
      />
    </>
  );
}

registerRoot(Root);
