#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates the committed oracle golden refs (AD-5) from the pinned
# elk-models corpus. Output is byte-stable: no timestamps.
# Usage: regen-goldens.sh [--set default|algorithms]
#   default     test/corpus/manifest.json  -> test/golden/refs/elk
#   algorithms  test/golden/algorithms.json -> test/golden/refs/elk-algorithms
# Both sets take the pinned models commit from test/corpus/manifest.json.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CORPUS_MANIFEST="$ROOT/test/corpus/manifest.json"
MANIFEST="$CORPUS_MANIFEST"
REFS_PARENT="$ROOT/test/golden/refs"
REFS_NAME="elk"
REFS_DIR="$REFS_PARENT/$REFS_NAME"
VENDORED_DIR=""
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"
GENERATED_BY="tools/oracle/regen-goldens.sh"
META_FILE="_meta.json"

die() {
  echo "error: $1" >&2
  exit 1
}

select_set() { # select_set <default|algorithms>
  case "$1" in
    default) ;;
    algorithms)
      MANIFEST="$ROOT/test/golden/algorithms.json"
      REFS_NAME="elk-algorithms"
      REFS_DIR="$REFS_PARENT/$REFS_NAME"
      VENDORED_DIR="$ROOT/test/golden/inputs"
      ;;
    *) die "unknown set '$1' (expected default or algorithms)" ;;
  esac
}

parse_args() {
  local set_name="default"
  while [ $# -gt 0 ]; do
    case "$1" in
      --set)
        [ $# -ge 2 ] || die "--set needs a value"
        set_name="$2"
        shift 2
        ;;
      *) die "unknown argument '$1'" ;;
    esac
  done
  select_set "$set_name"
}

manifest_commit() {
  node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).commit)' "$CORPUS_MANIFEST"
}

golden_ids() { # prints one golden id per line
  node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    for (const g of m.golden) console.log(g.id);
  ' "$MANIFEST"
}

golden_paths() { # prints one golden input path per line
  node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    for (const g of m.golden) console.log(g.path);
  ' "$MANIFEST"
}

# Prints one oracle case per golden entry (JSON Lines). `variant` is always
# sent; `algorithm` only when the entry carries `retarget` (D2).
write_cases() { # write_cases <models dir> <dest file>
  node -e '
    const fs = require("fs");
    const [manifest, modelsDir, dest] = process.argv.slice(1, 4);
    const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
    const lines = m.golden.map((g) => {
      const c = { id: g.id, input: modelsDir + "/" + g.path, mode: "layout" };
      if (g.retarget !== undefined) c.algorithm = g.algorithm;
      c.variant = g.variant;
      return JSON.stringify(c);
    });
    fs.writeFileSync(dest, lines.join("\n") + "\n");
  ' "$MANIFEST" "$1" "$2"
}

require_models_commit() {
  local expected actual
  expected="$(manifest_commit)"
  [ -d "$MODELS_DIR" ] || die "elk-models not found at $MODELS_DIR (run test/corpus/fetch.sh)"
  actual="$(git -C "$MODELS_DIR" rev-parse HEAD 2>/dev/null)" ||
    die "$MODELS_DIR is not a git repository"
  [ "$actual" = "$expected" ] ||
    die "elk-models at $actual, expected pinned $expected"
}

# The algorithms set vendors its inputs; they must equal the pinned corpus.
require_vendored_inputs() {
  local rel
  [ -n "$VENDORED_DIR" ] || return 0
  while IFS= read -r rel; do
    cmp -s "$VENDORED_DIR/$rel" "$MODELS_DIR/$rel" ||
      die "vendored input $rel differs from the pinned corpus"
  done < <(golden_paths)
}

write_meta() { # write_meta <dest file>
  node -e '
    const fs = require("fs");
    const [build, corpusManifest, generatedBy] = process.argv.slice(1, 4);
    const b = JSON.parse(fs.readFileSync(build, "utf8"));
    const m = JSON.parse(fs.readFileSync(corpusManifest, "utf8"));
    const meta = {
      elkCommit: b.commit,
      patches: b.patches,
      jdk: b.jdk,
      modelsCommit: m.commit,
      generatedBy,
    };
    fs.writeFileSync(process.argv[4], JSON.stringify(meta, null, 2) + "\n");
  ' "$ELK_ORACLE_DIR/oracle-build.json" "$CORPUS_MANIFEST" "$GENERATED_BY" "$1"
}

run_harness() { # run_harness <outDir> <casesFile>
  write_cases "$MODELS_DIR" "$2"
  "$ROOT/tools/oracle/run.sh" --cases "$2" "$1"
}

stage_refs() { # stage_refs <harnessOut> <stagingDir>; returns count via stdout
  local out="$1" stage="$2" id count=0
  while IFS= read -r id; do
    cp "$out/$id.json" "$stage/$id.json"
    count=$((count + 1))
  done < <(golden_ids)
  write_meta "$stage/$META_FILE"
  echo "$count"
}

swap_dirs() { # swap_dirs <stagingDir>; replaces REFS_DIR in two renames
  local stage="$1" old="$1.old"
  chmod 755 "$stage"
  if [ -d "$REFS_DIR" ]; then
    mv "$REFS_DIR" "$old"
  fi
  mv "$stage" "$REFS_DIR"
  rm -rf "$old"
}

cleanup() {
  rm -rf "${OUT_DIR:-}" "${STAGE_DIR:-}" "${CASES_FILE:-}"
}

main() {
  local count start elapsed
  parse_args "$@"
  require_models_commit
  require_vendored_inputs
  mkdir -p "$REFS_PARENT"
  OUT_DIR="$(mktemp -d)"
  STAGE_DIR="$(mktemp -d "$REFS_PARENT/.$REFS_NAME-staging.XXXXXX")"
  CASES_FILE="$(mktemp)"
  trap cleanup EXIT
  start=$SECONDS
  run_harness "$OUT_DIR" "$CASES_FILE"
  elapsed=$((SECONDS - start))
  count="$(stage_refs "$OUT_DIR" "$STAGE_DIR")"
  swap_dirs "$STAGE_DIR"
  echo "wrote $count refs + $META_FILE to test/golden/refs/$REFS_NAME (harness ${elapsed}s)" >&2
}

main "$@"
