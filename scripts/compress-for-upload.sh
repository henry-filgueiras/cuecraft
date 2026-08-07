#!/usr/bin/env bash
#
# Fit a rendered presentation under a file-hosting size limit.
#
# GitHub's Markdown editor accepts a dropped video only up to 10 MB, and a minute of
# atlas at Remotion's default settings is closer to 18. This re-encodes a rendered MP4
# to a smaller one that plays the same, so the showpieces can be attached to the README.
#
# Quality first, size as a ceiling: it encodes at a constant quality and only steps the
# quality down if the result is still over the limit.
#
# The input is never modified, and neither is anything under source control. Both files
# are projections (decision:1) — always safe to delete, never committed.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

# --- what a smaller copy is allowed to be -------------------------------------------

# GitHub's attachment limit for the drag-and-drop path in the Markdown editor, measured
# rather than assumed: an 11 MB file is rejected there. Overridable, because this script
# is about fitting *a* limit and that number is somebody else's to change.
readonly DEFAULT_LIMIT_MB=10
# Leave the encoder somewhere to land. Aiming exactly at the limit produces files that
# are under it by kilobytes, which is a bad place to be when the limit is enforced on
# something slightly different from what `stat` reports.
readonly HEADROOM=0.92

# x264's constant-rate-factor. 23 is x264's own default and, on this content — flat dark
# fields, hairline grids, large type, slow camera — it is visually indistinguishable from
# Remotion's output at roughly half the size (SSIM 0.997 against the observatory).
readonly DEFAULT_CRF=23
# Where it stops trying. Past about 30 the blueprint grid starts to break up in the wide
# shots, and a showpiece that fits by being ugly is not a showpiece.
readonly MAX_CRF=30
readonly CRF_STEP=2

# Narration is mono 24 kHz from the start; Remotion muxes it as 317 kbps stereo. Carrying
# one channel at a bitrate speech does not need is about 2.5 MB of every showpiece.
readonly AUDIO_BITRATE=64k

info() { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mwarning:\033[0m %s\n' "$*" >&2; }
die() {
  printf '\033[31merror:\033[0m %s\n' "$*" >&2
  exit 1
}

bytes_of() { stat -f '%z' "$1" 2>/dev/null || stat -c '%s' "$1"; }

megabytes() { awk -v b="$1" 'BEGIN { printf "%.2f", b / 1048576 }'; }

# --- the encode ----------------------------------------------------------------------

encode() {
  local input="$1" output="$2" crf="$3"

  # One ffmpeg invocation, no filters, no scaling, no frame-rate change: the picture that
  # comes out is the picture the renderer composed, carrying fewer bits. `-preset veryslow`
  # spends encoder time rather than bitrate, which is the right trade when the encode
  # happens once and the file is downloaded many times.
  #
  # `+faststart` moves the index to the front so the video starts playing before it has
  # finished downloading — which is the whole experience of a video embedded in a README.
  ffmpeg -y -loglevel error -nostdin \
    -i "$input" \
    -c:v libx264 -preset veryslow -crf "$crf" -profile:v high -level 4.0 \
    -c:a aac -ac 1 -b:a "$AUDIO_BITRATE" \
    -movflags +faststart \
    "$output"
}

# --- entry point ---------------------------------------------------------------------

usage() {
  cat <<'EOF'
Fit a rendered presentation under a file-hosting size limit.

Usage:
  scripts/compress-for-upload.sh <input.mp4> [output.mp4] [--limit <MB>]

  input.mp4    A rendered presentation, e.g. out/observatory.mp4
  output.mp4   Where to write it (default: out/upload/<name>.mp4)
  --limit MB   Size ceiling (default: 10, GitHub's Markdown-editor limit)

Examples:
  scripts/compress-for-upload.sh out/observatory.mp4
  npm run compress:upload -- out/cathedral-v2.mp4 --limit 25
EOF
}

main() {
  local input="" output="" limit_mb="$DEFAULT_LIMIT_MB"

  while (($# > 0)); do
    case "$1" in
      --help | -h)
        usage
        return 0
        ;;
      --limit)
        [[ -n "${2:-}" ]] || die "--limit needs a size in MB"
        limit_mb="$2"
        shift 2
        ;;
      -*) die "unknown option: $1" ;;
      *)
        if [[ -z "$input" ]]; then
          input="$1"
        elif [[ -z "$output" ]]; then
          output="$1"
        else
          die "too many arguments; expected an input and an output"
        fi
        shift
        ;;
    esac
  done

  [[ -n "$input" ]] || {
    usage
    return 1
  }

  command -v ffmpeg >/dev/null 2>&1 ||
    die "ffmpeg is not installed. It ships with the same package as the ffprobe test:render already needs."
  [[ -f "$input" ]] || die "no such file: ${input}
Render it first, e.g. npm run render -- examples/observatory.yaml -o ${input}"

  [[ "$limit_mb" =~ ^[0-9]+$ ]] || die "--limit must be a whole number of MB, got: ${limit_mb}"

  if [[ -z "$output" ]]; then
    output="out/upload/$(basename "$input")"
  fi

  # Re-encoding a file over itself would destroy the canonical render, and re-encoding a
  # previous output in place would compound the loss silently.
  [[ "$(cd "$(dirname "$input")" && pwd)/$(basename "$input")" != \
    "$(cd "$(dirname "$output")" 2>/dev/null && pwd)/$(basename "$output")" ]] ||
    die "input and output are the same file; refusing to encode over the render"

  mkdir -p "$(dirname "$output")"

  local original limit target
  original="$(bytes_of "$input")"
  limit=$((limit_mb * 1048576))
  target="$(awk -v l="$limit" -v h="$HEADROOM" 'BEGIN { printf "%d", l * h }')"

  info "Compressing $(basename "$input") — $(megabytes "$original") MB, limit ${limit_mb} MB"

  local crf="$DEFAULT_CRF" produced
  while true; do
    printf '    crf %-3s ' "$crf"
    encode "$input" "$output" "$crf" || die "ffmpeg failed at crf ${crf}"
    produced="$(bytes_of "$output")"
    printf '%6s MB\n' "$(megabytes "$produced")"

    ((produced <= target)) && break

    if ((crf + CRF_STEP > MAX_CRF)); then
      # Report rather than pretend. A file that will not fit at the quality floor is a
      # real fact about the presentation, and the honest fixes are shorter narration or a
      # host without this limit — not a quietly mangled video.
      warn "$(basename "$output") is still over ${limit_mb} MB at the quality floor (crf ${crf}); kept it anyway"
      break
    fi
    crf=$((crf + CRF_STEP))
  done

  local saved
  saved="$(awk -v a="$original" -v b="$produced" 'BEGIN { printf "%.0f", (1 - b / a) * 100 }')"

  cat <<EOF

$(info "Wrote ${output}")

  $(megabytes "$original") MB  ->  $(megabytes "$produced") MB   (${saved}% smaller, crf ${crf})

The original render is untouched. Both files are projections: regenerate either one,
never commit either one.

EOF
}

main "$@"
