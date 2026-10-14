#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the oracle's `parse` output (ELK JSON export, no layout) of the
# curated elk-models .elkt files (test/corpus/elkt-curated.json) as
# test/golden/refs/elkt-parse (graph-text G3, G7). The oracle runs with the
# CoreOptions-only registry (ORACLE_REGISTRY=core): the TS registry is the
# same set (C8). Output is byte-stable: no timestamps.
# A model the oracle rejects has no ref file, only an `outcomes` entry.
# Usage: regen-elkt-refs.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="$ROOT/test/corpus/manifest.json"
CURATED="$ROOT/test/corpus/elkt-curated.json"
REFS_PARENT="$ROOT/test/golden/refs"
REFS_DIR="$REFS_PARENT/elkt-parse"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"
EXPORT_SEED=1 # keep in sync with run.sh
GENERATED_BY="tools/oracle/regen-elkt-refs.sh"
META_FILE="_meta.json"
# Grammar features no pinned-corpus model uses (scan of all 898 .elkt); they
# are covered by the JVM vectors only.
UNCOVERED_BY_CORPUS='["null-value","exponent-float","single-quoted-string","multi-source-edge","multi-target-edge","edge-section-incoming-outgoing","section-outgoing-sections"]'

die() {
  echo "error: $1" >&2
  exit 1
}

manifest_commit() {
  node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).commit)' "$MANIFEST"
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

# Prints one parse case per curated entry (JSON Lines), sorted by id.
write_cases() { # write_cases <dest file>
  node -e '
    const fs = require("fs");
    const [curated, modelsDir, dest] = process.argv.slice(1);
    const models = JSON.parse(fs.readFileSync(curated, "utf8")).models;
    const ids = models.map((m) => m.id);
    if (new Set(ids).size !== ids.length) throw new Error("duplicate id in " + curated);
    const lines = [...models]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((m) => JSON.stringify({ id: m.id, input: modelsDir + "/" + m.path, mode: "parse" }));
    fs.writeFileSync(dest, lines.join("\n") + "\n");
  ' "$CURATED" "$MODELS_DIR" "$1"
}

run_harness() { # run_harness <casesFile> <outDir> <resultsFile>; exit 1 = some case threw
  local rc=0
  ORACLE_REGISTRY=core "$ROOT/tools/oracle/run.sh" --cases "$1" "$2" >"$3" || rc=$?
  [ "$rc" -le 1 ] || die "oracle exited with $rc"
}

registry_list() { # registry_list <flag>; the sorted JSON array printed by run.sh
  ORACLE_REGISTRY=core "$ROOT/tools/oracle/run.sh" "$1"
}

write_meta() { # write_meta <dest> <results file> <options json> <algorithms json>
  node -e '
    const fs = require("fs");
    const crypto = require("crypto");
    const [build, manifest, curated, modelsDir, generatedBy, seed, uncovered, results, options, algorithms, dest] =
      process.argv.slice(1);
    const b = JSON.parse(fs.readFileSync(build, "utf8"));
    const models = JSON.parse(fs.readFileSync(curated, "utf8")).models;
    const byId = (a, c) => (a < c ? -1 : a > c ? 1 : 0);
    const outcomes = {};
    for (const line of fs.readFileSync(results, "utf8").split("\n").filter(Boolean)) {
      const r = JSON.parse(line);
      if (r.status !== "ok" && r.status !== "throws") throw new Error("oracle error: " + line);
      outcomes[r.id] = r.exception === undefined ? { status: r.status } : { status: r.status, exception: r.exception };
    }
    const inputSha256 = {};
    for (const m of [...models].sort((x, y) => byId(x.id, y.id))) {
      inputSha256[m.id] = crypto.createHash("sha256").update(fs.readFileSync(modelsDir + "/" + m.path)).digest("hex");
    }
    const sorted = Object.fromEntries(Object.entries(outcomes).sort(([x], [y]) => byId(x, y)));
    const meta = {
      elkCommit: b.commit,
      patches: b.patches,
      modelsCommit: JSON.parse(fs.readFileSync(manifest, "utf8")).commit,
      registry: "core",
      exportSeed: Number(seed),
      jdk: b.jdk,
      generatedBy,
      inputSha256,
      outcomes: sorted,
      uncoveredByCorpus: JSON.parse(uncovered),
      optionIds: JSON.parse(fs.readFileSync(options, "utf8")),
      algorithmIds: JSON.parse(fs.readFileSync(algorithms, "utf8")),
    };
    fs.writeFileSync(dest, JSON.stringify(meta, null, 2) + "\n");
  ' "$ELK_ORACLE_DIR/oracle-build.json" "$MANIFEST" "$CURATED" "$MODELS_DIR" "$GENERATED_BY" \
    "$EXPORT_SEED" "$UNCOVERED_BY_CORPUS" "$2" "$3" "$4" "$1"
}

stage_refs() { # stage_refs <harnessOut> <stagingDir>; prints the count
  local out="$1" stage="$2" file count=0
  for file in "$out"/*.json; do
    [ -f "$file" ] || continue
    cp "$file" "$stage/$(basename "$file")"
    count=$((count + 1))
  done
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
  rm -rf "${OUT_DIR:-}" "${STAGE_DIR:-}" "${WORK_DIR:-}"
}

main() {
  local count
  [ -f "$CURATED" ] || die "$CURATED missing"
  require_models_commit
  mkdir -p "$REFS_PARENT"
  OUT_DIR="$(mktemp -d)"
  WORK_DIR="$(mktemp -d)"
  STAGE_DIR="$(mktemp -d "$REFS_PARENT/.elkt-parse-staging.XXXXXX")"
  trap cleanup EXIT
  write_cases "$WORK_DIR/cases.jsonl"
  run_harness "$WORK_DIR/cases.jsonl" "$OUT_DIR" "$WORK_DIR/results.jsonl"
  registry_list --list-options >"$WORK_DIR/options.json"
  registry_list --list-algorithms >"$WORK_DIR/algorithms.json"
  count="$(stage_refs "$OUT_DIR" "$STAGE_DIR")"
  write_meta "$STAGE_DIR/$META_FILE" "$WORK_DIR/results.jsonl" "$WORK_DIR/options.json" "$WORK_DIR/algorithms.json"
  swap_dirs "$STAGE_DIR"
  echo "wrote $count refs + $META_FILE to test/golden/refs/elkt-parse" >&2
}

main "$@"
