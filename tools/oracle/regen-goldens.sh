#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Regenerates the committed oracle golden refs (AD-5) from the pinned
# elk-models corpus. Output is byte-stable: no timestamps.
# Usage: regen-goldens.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="$ROOT/test/corpus/manifest.json"
REFS_PARENT="$ROOT/test/golden/refs"
REFS_DIR="$REFS_PARENT/elk"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"
GENERATED_BY="tools/oracle/regen-goldens.sh"
META_FILE="_meta.json"

die() {
  echo "error: $1" >&2
  exit 1
}

manifest_commit() {
  node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).commit)' "$MANIFEST"
}

# shellcheck disable=SC2016 # JS template literal, not shell expansion
golden_entries() { # prints "<id><TAB><relative path>" per golden entry
  node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    for (const g of m.golden) console.log(`${g.id}\t${g.path}`);
  ' "$MANIFEST"
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

write_meta() { # write_meta <dest file>
  node -e '
    const fs = require("fs");
    const [build, manifest, generatedBy] = process.argv.slice(1, 4);
    const b = JSON.parse(fs.readFileSync(build, "utf8"));
    const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
    const meta = {
      elkCommit: b.commit,
      patches: b.patches,
      jdk: b.jdk,
      modelsCommit: m.commit,
      generatedBy,
    };
    fs.writeFileSync(process.argv[4], JSON.stringify(meta, null, 2) + "\n");
  ' "$ELK_ORACLE_DIR/oracle-build.json" "$MANIFEST" "$GENERATED_BY" "$1"
}

run_harness() { # run_harness <outDir>; inputs are read from golden_entries
  local out="$1" id rel
  local inputs=()
  while IFS=$'\t' read -r id rel; do
    inputs+=("$MODELS_DIR/$rel")
  done < <(golden_entries)
  "$ROOT/tools/oracle/run.sh" "$out" "${inputs[@]}"
}

stage_refs() { # stage_refs <harnessOut> <stagingDir>; returns count via stdout
  local out="$1" stage="$2" id rel count=0
  while IFS=$'\t' read -r id rel; do
    cp "$out/$(basename "$rel")" "$stage/$id.json"
    count=$((count + 1))
  done < <(golden_entries)
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
  rm -rf "${OUT_DIR:-}" "${STAGE_DIR:-}"
}

main() {
  local count start elapsed
  require_models_commit
  mkdir -p "$REFS_PARENT"
  OUT_DIR="$(mktemp -d)"
  STAGE_DIR="$(mktemp -d "$REFS_PARENT/.elk-staging.XXXXXX")"
  trap cleanup EXIT
  start=$SECONDS
  run_harness "$OUT_DIR"
  elapsed=$((SECONDS - start))
  count="$(stage_refs "$OUT_DIR" "$STAGE_DIR")"
  swap_dirs "$STAGE_DIR"
  echo "wrote $count refs + $META_FILE to test/golden/refs/elk (harness ${elapsed}s)" >&2
}

main "$@"
