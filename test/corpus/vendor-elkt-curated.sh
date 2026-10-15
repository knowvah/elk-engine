#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Copies the curated elk-models .elkt files (test/corpus/elkt-curated.json)
# byte-for-byte from the pinned elk-models checkout to test/corpus/elkt-curated,
# keeping their corpus paths, so the curated refs run without elk-models (CI).
# The files are EPL-2.0 like this repository (NOTICE.md). The curated test
# checks every copy against the inputSha256 recorded in
# test/golden/refs/elkt-parse/_meta.json. tools/oracle/regen-elkt-refs.sh runs
# this after it rewrites the refs, so inputs and refs move together.
# Usage: vendor-elkt-curated.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="$ROOT/test/corpus/manifest.json"
CURATED="$ROOT/test/corpus/elkt-curated.json"
DEST="$ROOT/test/corpus/elkt-curated"
MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"

die() {
  echo "error: $1" >&2
  exit 1
}

require_models_commit() {
  local expected actual
  expected="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).commit)' "$MANIFEST")"
  [ -d "$MODELS_DIR" ] || die "elk-models not found at $MODELS_DIR (run test/corpus/fetch.sh)"
  actual="$(git -C "$MODELS_DIR" rev-parse HEAD 2>/dev/null)" ||
    die "$MODELS_DIR is not a git repository"
  [ "$actual" = "$expected" ] ||
    die "elk-models at $actual, expected pinned $expected"
}

# Prints the corpus path of every curated model, one per line.
curated_paths() {
  node -e '
    const models = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).models;
    for (const m of models) console.log(m.path);
  ' "$CURATED"
}

cleanup() {
  rm -rf "${STAGE_DIR:-}" "${OLD_DIR:-}"
}

main() {
  local count=0 rel
  [ $# -eq 0 ] || die "usage: vendor-elkt-curated.sh (no arguments)"
  [ -f "$CURATED" ] || die "$CURATED missing"
  require_models_commit
  STAGE_DIR="$(mktemp -d "$ROOT/test/corpus/.elkt-curated-staging.XXXXXX")"
  OLD_DIR="$(mktemp -d "$ROOT/test/corpus/.elkt-curated-old.XXXXXX")"
  trap cleanup EXIT
  while IFS= read -r rel; do
    [ -f "$MODELS_DIR/$rel" ] || die "$rel missing in $MODELS_DIR"
    mkdir -p "$STAGE_DIR/$(dirname "$rel")"
    cp "$MODELS_DIR/$rel" "$STAGE_DIR/$rel"
    count=$((count + 1))
  done < <(curated_paths)
  if [ -d "$DEST" ]; then
    mv "$DEST" "$OLD_DIR/elkt-curated"
  fi
  mv "$STAGE_DIR" "$DEST"
  echo "vendored $count curated inputs to test/corpus/elkt-curated" >&2
}

main "$@"
