#!/usr/bin/env bash
#
# Bootstrap the faces cuecraft's hyperlegible typography profile is set in.
#
# Takes a clean checkout to a state where `accessibility: dyslexia: true` renders in
# Atkinson Hyperlegible Next and Atkinson Hyperlegible Mono, offline, with the exact bytes
# fonts.lock.json names.
#
# Safe to rerun: already-present files are re-verified, not re-fetched, and a checkout that
# is already correct costs one pass of shasum over ninety kilobytes.
#
# See archaeology/sprints/0029-*/ for why the provisioning looks like this, and
# archaeology/dragons/0004-*.md for the reproducibility problem it is one half of.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

lock_file="fonts.lock.json"
package_root="node_modules/@fontsource"

info() { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mwarning:\033[0m %s\n' "$*" >&2; }
die() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

lock_query() {
  # Reads the manifest with the same runtime that will later consume it, so there is no
  # second parser to keep in step. Deliberately node rather than jq: bootstrap depends on
  # nothing the project does not already require.
  node -e "
    const lock = require('./$lock_file');
    const families = lock.families;
    $1
  "
}

sha256_of() { shasum -a 256 "$1" | cut -d' ' -f1; }

# --- prerequisites -----------------------------------------------------------------

check_prerequisites() {
  command -v node >/dev/null 2>&1 || die "node is not installed."
  command -v npm >/dev/null 2>&1 || die "npm is not installed."
  command -v shasum >/dev/null 2>&1 || die "shasum is not installed."
  [[ -f "$lock_file" ]] || die "$lock_file is missing; this checkout is incomplete."
  [[ -f package-lock.json ]] || die "package-lock.json is missing; refusing to install unpinned dependencies."
}

# --- the fast path -----------------------------------------------------------------

# Every file the lock names, present and matching. Silent, and the whole point of it is that
# a bootstrapped machine pays almost nothing to prove it is still bootstrapped.
everything_verifies() {
  local count index package path expected target actual
  count="$(lock_query 'process.stdout.write(String(families.flatMap((f) => f.files).length))')"
  index=0
  while ((index < count)); do
    package="$(lock_query "const all = families.flatMap((f) => f.files.map((file) => ({ ...file, package: f.package }))); process.stdout.write(all[$index].package)")"
    path="$(lock_query "const all = families.flatMap((f) => f.files.map((file) => ({ ...file, package: f.package }))); process.stdout.write(all[$index].path)")"
    expected="$(lock_query "const all = families.flatMap((f) => f.files); process.stdout.write(all[$index].sha256)")"
    target="node_modules/${package}/${path}"
    index=$((index + 1))

    [[ -f "$target" ]] || return 1
    actual="$(sha256_of "$target")"
    [[ "$actual" == "$expected" ]] || return 1
  done
  return 0
}

# --- installation ------------------------------------------------------------------

install_packages() {
  info "Installing pinned npm dependencies"

  # `npm ci` is the reproducible install and the atomicity story in one: it obeys
  # package-lock.json exactly, refuses to silently resolve a newer version, verifies every
  # tarball against its `integrity` hash before unpacking, and stages extraction so an
  # interrupted run does not leave a half-written package that looks complete. Nothing here
  # needs to reimplement any of that.
  if ! npm ci --no-audit --no-fund; then
    die "npm ci failed.

If this machine is offline, the fonts cannot be fetched and nothing else can fix that:
Atkinson Hyperlegible ships inside two npm packages and cuecraft does not vendor them.

  - On a machine with network:  npm ci  (or  npm run bootstrap:fonts)
  - Copying a bootstrapped checkout: copy node_modules/@fontsource/ across and rerun this
    script, which will verify the bytes rather than trust the copy.

Renders that do not ask for 'accessibility: dyslexia: true' need none of this and are
unaffected."
  fi
}

# --- verification ------------------------------------------------------------------

verify_files() {
  local count index name package version path bytes expected target actual missing
  count="$(lock_query 'process.stdout.write(String(families.length))')"
  missing=0

  index=0
  while ((index < count)); do
    name="$(lock_query "process.stdout.write(families[$index].family)")"
    package="$(lock_query "process.stdout.write(families[$index].package)")"
    version="$(lock_query "process.stdout.write(families[$index].version)")"
    info "${name} — ${package}@${version}"

    local installed
    installed="$(node -e "
      try { process.stdout.write(require('./node_modules/${package}/package.json').version); }
      catch { process.stdout.write(''); }
    ")"
    if [[ "$installed" != "$version" ]]; then
      die "${package} is at '${installed:-absent}' but ${lock_file} pins ${version}.
Run 'npm ci' to restore the pinned tree, or move the pin deliberately (see --print-hashes)."
    fi

    local files
    files="$(lock_query "process.stdout.write(String(families[$index].files.length))")"
    local file=0
    while ((file < files)); do
      path="$(lock_query "process.stdout.write(families[$index].files[$file].path)")"
      bytes="$(lock_query "process.stdout.write(String(families[$index].files[$file].bytes))")"
      expected="$(lock_query "process.stdout.write(families[$index].files[$file].sha256)")"
      target="node_modules/${package}/${path}"
      file=$((file + 1))

      if [[ ! -f "$target" ]]; then
        warn "missing ${target}"
        missing=$((missing + 1))
        continue
      fi

      actual="$(sha256_of "$target")"
      if [[ "$actual" != "$expected" ]]; then
        die "checksum mismatch for ${target}
  expected ${expected}
  actual   ${actual}
${package}@${version} did not ship the bytes ${lock_file} pins. Do not render with this."
      fi
      printf '    ok       %s (%s bytes)\n' "$(basename "$path")" "$bytes"
    done

    local license
    license="node_modules/${package}/$(lock_query "process.stdout.write(families[$index].license)")"
    [[ -f "$license" ]] || die "the OFL-1.1 licence is missing from ${package}; refusing to use a font whose licence did not ship with it."
    printf '    licence  %s\n' "$license"

    index=$((index + 1))
  done

  ((missing == 0)) || die "${missing} pinned font file(s) are missing. Run 'npm ci' and rerun."
}

# --- moving the pin ----------------------------------------------------------------

print_hashes() {
  # Recomputes the manifest from whatever is currently installed. Used when intentionally
  # moving to a new upstream version — never as a way of making a mismatch go away.
  lock_query '
    const { createHash } = require("node:crypto");
    const { readFileSync } = require("node:fs");
    for (const family of families) {
      for (const file of family.files) {
        const path = `node_modules/${family.package}/${file.path}`;
        const bytes = readFileSync(path);
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        console.log(JSON.stringify({ path: file.path, bytes: bytes.length, sha256 }) + ",");
      }
    }
  '
}

# --- entry point -------------------------------------------------------------------

main() {
  case "${1:-}" in
    --print-hashes)
      print_hashes
      return 0
      ;;
    --help | -h)
      sed -n '3,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      printf '\nUsage: %s [--print-hashes]\n' "${BASH_SOURCE[0]}"
      return 0
      ;;
    "") ;;
    *) die "unknown option: $1" ;;
  esac

  check_prerequisites

  if everything_verifies; then
    info "Hyperlegible faces are already installed and verified"
    verify_files
    return 0
  fi

  install_packages
  verify_files

  cat <<EOF

$(info "The hyperlegible typography profile is ready")

  faces         ${package_root}/  (pinned by package-lock.json, checked against ${lock_file})
  bundled by    the composition's own webpack, exactly as KaTeX's are

Try it, on any deck:

  accessibility:
    dyslexia: true

Nothing is fetched during a render, in either profile.

EOF
}

main "$@"
