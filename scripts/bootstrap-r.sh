#!/usr/bin/env bash
#
# Bootstrap the R environment cuecraft's `exhibit:` body runs against.
#
# Takes a checkout to a state where a presentation can hand a computation to R and get a
# picture back. Base R only: no packages are installed, and nothing here writes to an R
# library. If a deck ever needs a package, that is a decision, not a bootstrap step.
#
# It also checks for ffmpeg, because a program that hands back a *film* has to encode one
# (decision:64) and cuecraft delegates encoding rather than implementing it. That is a check
# rather than an install: ffmpeg is not needed to render any deck that has no temporal exhibit
# in it, and a bootstrap that installed it unconditionally would be installing a media
# toolchain for a checkout that may never want one.
#
# Safe to rerun: an R that is already present and working is verified, not reinstalled.
#
# See archaeology/decisions/ for why the boundary looks like this, and src/compute/r.ts
# for the protocol that crosses it.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

# The Homebrew formula. `r` is the CRAN build; `r-app` would be the GUI, which is exactly
# the thing a headless CLI must not depend on.
readonly BREW_FORMULA="r"

info() { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mwarning:\033[0m %s\n' "$*" >&2; }
die() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# --- detection ---------------------------------------------------------------------

have_rscript() { command -v Rscript >/dev/null 2>&1; }

have_ffmpeg() { command -v ffmpeg >/dev/null 2>&1; }

# Not "is ffmpeg there" but "can it write the one thing a temporal exhibit needs": an H.264
# MP4 a browser will decode. A build without libx264 is on PATH and fails at the encode.
ffmpeg_works() {
  ffmpeg -hide_banner -encoders 2>/dev/null | grep -q ' libx264 '
}

# A working Rscript, not merely one on PATH. A half-installed R — a Homebrew formula
# whose dependencies moved, a leftover shim from an uninstalled bundle — puts the binary
# where `command -v` finds it and fails the moment anything is asked of it.
rscript_works() {
  local answer
  answer="$(printf 'cat("ok")\n' | Rscript --vanilla - 2>/dev/null)" || return 1
  [[ "$answer" == "ok" ]]
}

# --- installation ------------------------------------------------------------------

install_r() {
  local os
  os="$(uname -s)"

  if [[ "$os" != "Darwin" ]]; then
    die "no Rscript on PATH, and automatic installation here is macOS-only.
Install R for ${os} from https://cran.r-project.org/ and rerun this script."
  fi

  command -v brew >/dev/null 2>&1 ||
    die "no Rscript on PATH, and Homebrew is not installed.
Either install Homebrew from https://brew.sh and rerun this script,
or install R yourself from https://cran.r-project.org/ and rerun to verify."

  info "Installing R through Homebrew (formula: ${BREW_FORMULA})"
  brew install --formula "$BREW_FORMULA" ||
    die "brew install ${BREW_FORMULA} failed. The output above says why.
'brew doctor' is usually the next thing to run."

  have_rscript ||
    die "brew install ${BREW_FORMULA} reported success but Rscript is still not on PATH.
Check that $(brew --prefix)/bin is in your PATH and rerun."
}

# --- verification ------------------------------------------------------------------

# Not "does R start" but "can R do the one thing cuecraft asks of it": write a PNG to a
# directory it was handed, on a machine with no display. macOS R defaults its png() device
# to quartz, which needs a window server; cairo does not, and a bootstrap that verified
# only the interpreter would pass on a machine where every render fails.
smoke_test() {
  info "Verifying that R can draw a PNG headlessly"

  local workspace
  workspace="$(mktemp -d -t cuecraft-r-bootstrap)"
  # shellcheck disable=SC2064
  trap "rm -rf '$workspace'" RETURN

  CUECRAFT_OUTPUT_DIR="$workspace" Rscript --vanilla - <<'R' || die "R failed to draw a PNG. The output above says why."
    out <- file.path(Sys.getenv("CUECRAFT_OUTPUT_DIR"), "bootstrap.png")
    if (!capabilities("cairo")) {
      stop("this R was built without cairo, so it cannot draw a PNG without a display")
    }
    png(out, width = 400, height = 300, type = "cairo")
    plot(1:10, main = "cuecraft")
    invisible(dev.off())
    if (!file.exists(out) || file.info(out)$size == 0) stop("no PNG was written")
    cat("wrote", out, "\n")
R

  [[ -s "${workspace}/bootstrap.png" ]] || die "R reported success but wrote no PNG"
}

# --- entry point -------------------------------------------------------------------

main() {
  case "${1:-}" in
    --help | -h)
      sed -n '3,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      printf '\nUsage: %s\n' "${BASH_SOURCE[0]}"
      return 0
      ;;
    "") ;;
    *) die "unknown option: $1" ;;
  esac

  info "Checking for R"
  if have_rscript && rscript_works; then
    info "$(Rscript --version 2>&1 | head -1) at $(command -v Rscript)"
  else
    if have_rscript; then
      warn "Rscript is on PATH but does not run; reinstalling through Homebrew"
    fi
    install_r
    rscript_works || die "Rscript is installed but does not run. This is an R problem, not a cuecraft one."
    info "$(Rscript --version 2>&1 | head -1) at $(command -v Rscript)"
  fi

  smoke_test

  info "Checking for ffmpeg, which an animated exhibit encodes with"
  if have_ffmpeg && ffmpeg_works; then
    info "$(ffmpeg -version 2>&1 | head -1) at $(command -v ffmpeg)"
  elif have_ffmpeg; then
    warn "ffmpeg is on PATH but has no libx264 encoder.
examples/kmeans/ will fail at the encode. On macOS: brew reinstall ffmpeg"
  else
    warn "no ffmpeg on PATH. Decks with a still exhibit are fine; examples/kmeans/ needs one.
On macOS: brew install ffmpeg"
  fi

  cat <<EOF

$(info "R is ready")

  Rscript          $(command -v Rscript)
  packages         none, deliberately — the demos are base R
  ffmpeg           $(command -v ffmpeg || echo "not installed (only animated exhibits need it)")

Try it:

  npm run test:r                                          # the runner, against real R
  npm run render -- examples/revenue/revenue.yaml -o out/revenue.mp4
  npm run render -- examples/kmeans/kmeans.yaml -o out/kmeans.mp4    # needs ffmpeg

EOF
}

main "$@"
