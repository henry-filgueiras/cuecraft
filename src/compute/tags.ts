import { execFile } from "node:child_process";
import { promisify } from "node:util";

/**
 * Reading a metadata tag off a finished film.
 *
 * One job, for one caller: `cuecraft snapshot` needs the render identity stamped into an MP4 before
 * it will trust a symbol table's frame numbers (decision:67).
 *
 * ## Why this is not in `./mp4.ts`
 *
 * `mp4.ts` walks the same file and reads the same box tree, and putting this there would be wrong
 * for a reason that module already states about itself. It runs during **materialization**, on every
 * render of every deck with a film in it, and it deliberately reads two integers out of a header
 * rather than spawning a process: *"a build-time dependency of every render in exchange for
 * arithmetic."* That bargain is right for it and would be wrong here — this runs only where ffmpeg
 * is already required, and moving it into `mp4.ts` would put an external process on the render path.
 *
 * ## Why ffprobe rather than another fifty lines of walking
 *
 * `mp4.ts` draws its line at reading a **header**, and a metadata tag is technically on the right
 * side of it — the string sits in `moov/udta/meta/ilst/©cmt/data`, four levels of sized boxes below
 * a tree that module already walks. It is still the wrong trade. That is four more box layouts, an
 * Apple-specific atom naming convention with a non-ASCII marker byte, and a `data` payload with its
 * own type and locale fields, all to reach a string that `ffprobe -show_entries format_tags` returns
 * in one line — and decision:5 says delegate media primitives to mature libraries rather than grow a
 * longer parser. The cost argument that justified hand-parsing `mvhd` does not apply, because the
 * two call sites already spawn ffmpeg to extract the frame this check is guarding.
 *
 * It is a **header read either way**: ffprobe reads `moov` and stops, so this costs about the same
 * on a twenty-megabyte film as on a small one. That is the property the design depends on, since a
 * loop over `cuecraft snapshot --symbol …` pays it once per marker.
 */

const run = promisify(execFile);

/**
 * One metadata tag from a film's container, or nothing.
 *
 * **Absence is never an error here, and neither is a broken file.** The caller's whole verdict model
 * has a third state for "cannot tell" (`matchRender`), and this is where most of that state comes
 * from: a film rendered before this existed, a film remuxed by something that dropped its tags, a
 * path that is not a film at all, or no ffprobe on the machine. Every one of those is a reason to be
 * unable to establish provenance, and none of them is a reason to refuse to extract a frame. So this
 * returns `undefined` rather than throwing, and the extraction that follows will produce its own
 * error if the file is genuinely unusable.
 */
export async function readTag(path: string, tag: string): Promise<string | undefined> {
  try {
    const { stdout } = await run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      `format_tags=${tag}`,
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path,
    ]);
    const value = stdout.trim();
    return value === "" ? undefined : value;
  } catch {
    return undefined;
  }
}
