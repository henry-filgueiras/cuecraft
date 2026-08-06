#!/usr/bin/env bash
#
# Bootstrap cuecraft's local text-to-speech stack.
#
# Takes a clean checkout to a state where `cuecraft speak` synthesizes audio on this
# machine, with no API credentials and no network access at inference time.
#
# Safe to rerun: already-present artifacts are re-verified, not re-downloaded.
#
# See archaeology/decisions/0008-*.md for why the stack looks like this.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

lock_file="kokoro-model.lock.json"
model_root=".cuecraft/models"

# Node's own type stripping means the lock file is read by the same runtime that will
# later consume it, so there is no second parser to keep in sync.
readonly MIN_NODE_MAJOR=22
readonly MIN_NODE_MINOR=18

info() { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mwarning:\033[0m %s\n' "$*" >&2; }
die() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

lock_query() {
  # Reads the pinned manifest. Deliberately uses node rather than jq so that bootstrap
  # depends on nothing the project does not already require.
  node -e "
    const lock = require('./$lock_file');
    $1
  "
}

# --- prerequisites -----------------------------------------------------------------

check_prerequisites() {
  info "Checking prerequisites"

  command -v node >/dev/null 2>&1 || die "node is not installed. Install Node >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR} and rerun."
  command -v npm >/dev/null 2>&1 || die "npm is not installed. Install Node >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR} and rerun."
  command -v curl >/dev/null 2>&1 || die "curl is not installed."
  command -v shasum >/dev/null 2>&1 || die "shasum is not installed."

  local version major minor
  version="$(node --version)"
  version="${version#v}"
  major="${version%%.*}"
  minor="${version#*.}"
  minor="${minor%%.*}"

  if ((major < MIN_NODE_MAJOR)) || ((major == MIN_NODE_MAJOR && minor < MIN_NODE_MINOR)); then
    die "node ${version} is too old; cuecraft needs >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR} for TypeScript type stripping."
  fi

  local arch os
  os="$(uname -s)"
  arch="$(uname -m)"
  info "node ${version} on ${os}/${arch}"

  if [[ "$os" == "Darwin" && "$arch" != "arm64" ]]; then
    warn "this stack is exercised on Apple Silicon; ${arch} may work but is untested here."
  fi
}

# --- npm dependencies --------------------------------------------------------------

install_dependencies() {
  info "Installing pinned npm dependencies"

  # `npm ci` is the reproducible install: it obeys package-lock.json exactly and refuses
  # to silently resolve a newer version. It also removes anything not in the lockfile.
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    die "package-lock.json is missing; refusing to install unpinned dependencies."
  fi

  # The ONNX Runtime binaries for macOS ship inside the npm package, so cuecraft does not
  # depend on the postinstall scripts npm may be configured to withhold. Prove it rather
  # than assume it — a missing native binding here is much cheaper to diagnose than during
  # the first synthesis.
  node -e "require('onnxruntime-node')" 2>/dev/null ||
    die "onnxruntime-node failed to load. If npm withheld its install scripts, run 'npm approve-scripts onnxruntime-node' and rerun."
}

# --- model artifacts ---------------------------------------------------------------

sha256_of() { shasum -a 256 "$1" | cut -d' ' -f1; }

fetch_artifacts() {
  local model_id revision destination count
  model_id="$(lock_query 'process.stdout.write(lock.modelId)')"
  revision="$(lock_query 'process.stdout.write(lock.revision)')"
  count="$(lock_query 'process.stdout.write(String(lock.files.length))')"
  destination="${model_root}/${model_id}"

  info "Fetching ${count} pinned artifact(s) for ${model_id}"
  info "revision ${revision}"

  mkdir -p "$destination"

  local index=0
  while ((index < count)); do
    local path bytes expected target actual url
    path="$(lock_query "process.stdout.write(lock.files[$index].path)")"
    bytes="$(lock_query "process.stdout.write(String(lock.files[$index].bytes))")"
    expected="$(lock_query "process.stdout.write(lock.files[$index].sha256)")"
    target="${destination}/${path}"
    index=$((index + 1))

    if [[ -f "$target" ]]; then
      actual="$(sha256_of "$target")"
      if [[ "$actual" == "$expected" ]]; then
        printf '    ok       %s\n' "$path"
        continue
      fi
      warn "checksum mismatch for ${path}; re-downloading"
      rm -f "$target"
    fi

    # Resolve against the immutable commit, never a branch name.
    url="https://huggingface.co/${model_id}/resolve/${revision}/${path}"
    printf '    fetching %s (%s bytes)\n' "$path" "$bytes"

    mkdir -p "$(dirname "$target")"
    # Download to a sibling temp file so an interrupted run never leaves a truncated
    # artifact that looks complete on the next pass.
    curl --fail --location --silent --show-error --output "${target}.part" "$url" ||
      die "download failed for ${path}"

    actual="$(sha256_of "${target}.part")"
    if [[ "$actual" != "$expected" ]]; then
      rm -f "${target}.part"
      die "checksum mismatch for ${path}
  expected ${expected}
  actual   ${actual}
The pin in ${lock_file} does not match what upstream served. Do not use this artifact."
    fi

    mv "${target}.part" "$target"
    printf '    verified %s\n' "$path"
  done
}

# --- verification ------------------------------------------------------------------

smoke_test() {
  info "Verifying local synthesis"

  local output
  output="$(mktemp -t cuecraft-bootstrap).wav"
  # shellcheck disable=SC2064
  trap "rm -f '$output'" RETURN

  node src/cli.ts speak "Good evening. Your laptop is now doing the talking." \
    --output "$output" ||
    die "local synthesis failed. The model artifacts verified, so this is a runtime problem."

  [[ -s "$output" ]] || die "synthesis produced an empty file at ${output}"
}

print_hashes() {
  # Recomputes the manifest from whatever is currently on disk. Used when intentionally
  # moving the pin to a new upstream revision.
  local model_id destination
  model_id="$(lock_query 'process.stdout.write(lock.modelId)')"
  destination="${model_root}/${model_id}"

  [[ -d "$destination" ]] || die "no artifacts at ${destination}; run bootstrap first."

  local path
  while IFS= read -r path; do
    printf '{ "path": "%s", "bytes": %s, "sha256": "%s" },\n' \
      "${path#"$destination"/}" "$(stat -f '%z' "$path")" "$(sha256_of "$path")"
  done < <(find "$destination" -type f ! -name '*.part' | sort)
}

# --- entry point -------------------------------------------------------------------

main() {
  case "${1:-}" in
    --print-hashes)
      print_hashes
      return 0
      ;;
    --help | -h)
      sed -n '3,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      printf '\nUsage: %s [--print-hashes]\n' "${BASH_SOURCE[0]}"
      return 0
      ;;
    "") ;;
    *) die "unknown option: $1" ;;
  esac

  check_prerequisites
  install_dependencies
  fetch_artifacts
  smoke_test

  local footprint
  footprint="$(du -sh "$model_root" | cut -f1)"

  cat <<EOF

$(info "Local text-to-speech is ready")

  model artifacts   ${model_root}/  (${footprint})
  voice data        node_modules/kokoro-js/voices/  (pinned by package-lock.json)

Try it:

  npm run speak -- "Good evening. Your laptop is now doing the talking." -o tmp/hello.wav

Reset:

  rm -rf ${model_root}

EOF
}

main "$@"
