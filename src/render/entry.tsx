import { Composition, registerRoot } from "remotion";

import {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  type Timeline,
} from "../compile/timeline.ts";
import { PresentationVideo } from "./Presentation.tsx";

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
};

function Root() {
  return (
    <Composition
      id={COMPOSITION_ID}
      component={PresentationVideo}
      defaultProps={{ timeline: PLACEHOLDER }}
      durationInFrames={PLACEHOLDER.totalFrames}
      fps={PLACEHOLDER.fps}
      width={PLACEHOLDER.width}
      height={PLACEHOLDER.height}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(1, props.timeline.totalFrames),
        fps: props.timeline.fps,
        width: props.timeline.width,
        height: props.timeline.height,
      })}
    />
  );
}

registerRoot(Root);
