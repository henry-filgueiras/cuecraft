/**
 * Duration literals in the presentation source.
 *
 * Authors write `750ms` or `1.5s`, never `22` — a bare number would have to mean
 * milliseconds, seconds, or frames, and the reader could not tell which. Frames in
 * particular are deliberately unavailable: timing is derived from measured narration
 * (decision:1), and a hand-authored frame count would be a way to smuggle the renderer's
 * units back into the source.
 */

export const DURATION_HINT = 'a duration like "750ms", "1.5s" or "2s"';

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)(ms|s)$/;

export function isDurationLiteral(value: string): boolean {
  return DURATION_PATTERN.test(value.trim());
}

/**
 * Convert a validated duration literal to milliseconds.
 *
 * Throws on anything {@link isDurationLiteral} rejects, so callers that validated first
 * can treat this as total.
 */
export function parseDurationMs(value: string): number {
  const match = DURATION_PATTERN.exec(value.trim());
  const amount = match?.[1];
  const unit = match?.[2];
  if (amount === undefined || unit === undefined) {
    throw new RangeError(`${JSON.stringify(value)} is not ${DURATION_HINT}`);
  }
  return unit === "s" ? Number(amount) * 1000 : Number(amount);
}

/** Render milliseconds as `mm:ss.s`, for completion reports rather than for the source. */
export function formatTimecode(milliseconds: number): string {
  const totalSeconds = milliseconds / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
}
