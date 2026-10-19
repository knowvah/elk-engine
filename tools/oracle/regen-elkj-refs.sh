#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the oracle's `parse` output (ELK JSON export, no layout) of the curated
# .elkj inputs (test/corpus/elkj-curated.json) as test/golden/refs/elkj-parse
# (graph-json-text D2). Tier 1: the oracle's `convert` of an elk-models .elkt/.json
# (ELK's own "Convert graph" steps, identifier seed 1: D12) is vendored as
# test/corpus/elkj-curated/<id>.elkj and parsed with `parse`. Tier 2: a realworld
# .json or repo ELK JSON file is vendored byte-for-byte as <id>.<ext> and read
# through the .elkj language with `parse-elkj`. The oracle runs with the
# CoreOptions-only registry (ORACLE_REGISTRY=core), as regen-elkt-refs.sh.
# Output is byte-stable: no timestamps. A file the oracle rejects (syntax errors)
# has no ref file, only an `outcomes` entry (syntax errors match by presence, D6).
# The converted files are what the refs were recorded from, so the curated test
# runs without elk-models or the oracle; _meta.json holds the sha256 of each.
# Usage: regen-elkj-refs.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="$ROOT/test/corpus/manifest.json"
CURATED="$ROOT/test/corpus/elkj-curated.json"
CORPUS_DIR="$ROOT/test/corpus"
VENDOR_DIR="$CORPUS_DIR/elkj-curated"
REFS_PARENT="$ROOT/test/golden/refs"
REFS_DIR="$REFS_PARENT/elkj-parse"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"
EXPORT_SEED=1     # keep in sync with run.sh
IDENTIFIER_SEED=1 # keep in sync with run.sh (D12)
SEED_PATCH="0002-graph-seedable-GraphIdentifierGenerator-random.patch"
CONVERT_JOBS=4 # parallel JVMs for `convert`; the output does not depend on it
GENERATED_BY="tools/oracle/regen-elkj-refs.sh"
META_FILE="_meta.json"
# Grammar features and input shapes no curated file (and no converted file) has;
# the T2-T5 JVM vectors and the tier-3 scenarios cover them.
UNCOVERED_BY_CORPUS='["unterminated-string","string-escape-sequences","duplicate-property-keys","reference-to-label-or-edge","qualified-name-reference","bom-or-non-lf-line-endings","invalid-utf8","lexer-recovery-numbers"]'

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

# The oracle must have been built with the D12 seed patch, or `convert` of a
# graph with duplicate ids is not repeatable.
require_seed_patch() {
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  node -e '
    const b = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    if (!b.patches.some((p) => String(p).includes(process.argv[2]))) process.exit(1);
  ' "$ELK_ORACLE_DIR/oracle-build.json" "$SEED_PATCH" ||
    die "oracle built without $SEED_PATCH; run tools/oracle/build.sh"
}

# Prints one JSON Lines case per curated entry of the tier, sorted by id.
# write_cases <tier> <mode> <dir of the inputs, "" = the entry's source> <dest>
write_cases() {
  node -e '
    const fs = require("fs");
    const path = require("path");
    const [curated, modelsDir, root, tier, mode, inputDir, dest] = process.argv.slice(1);
    const models = JSON.parse(fs.readFileSync(curated, "utf8")).models;
    const ids = models.map((m) => m.id);
    if (new Set(ids).size !== ids.length) throw new Error("duplicate id in " + curated);
    const resolve = (source) => {
      const [kind, rel] = [source.slice(0, source.indexOf(":")), source.slice(source.indexOf(":") + 1)];
      if (kind === "elk-models") return path.join(modelsDir, rel);
      if (kind === "repo") return path.join(root, rel);
      throw new Error("unknown source kind in " + source);
    };
    const ext = (m) => (m.tier === 1 ? ".elkj" : path.extname(m.source));
    const lines = models
      .filter((m) => m.tier === Number(tier))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((m) => JSON.stringify({
        id: m.id,
        input: inputDir === "" ? resolve(m.source) : path.join(inputDir, m.id + ext(m)),
        mode,
      }));
    fs.writeFileSync(dest, lines.length === 0 ? "" : lines.join("\n") + "\n");
  ' "$CURATED" "$MODELS_DIR" "$ROOT" "$1" "$2" "$3" "$4"
}

# Fails when a source file of the curated list is absent.
require_sources() {
  node -e '
    const fs = require("fs");
    const path = require("path");
    const [curated, modelsDir, root] = process.argv.slice(1);
    for (const m of JSON.parse(fs.readFileSync(curated, "utf8")).models) {
      const i = m.source.indexOf(":");
      const base = m.source.slice(0, i) === "elk-models" ? modelsDir : root;
      const file = path.join(base, m.source.slice(i + 1));
      if (!fs.existsSync(file)) { console.error(m.id + ": " + file + " missing"); process.exit(1); }
    }
  ' "$CURATED" "$MODELS_DIR" "$ROOT" ||
    die "a curated source is missing (elk-models: run test/corpus/fetch.sh)"
}

run_harness() { # run_harness <casesFile> <outDir> <resultsFile>; exit 1 = some case threw
  local rc=0
  ORACLE_REGISTRY=core "$ROOT/tools/oracle/run.sh" --cases "$1" "$2" >"$3" || rc=$?
  [ "$rc" -le 1 ] || die "oracle exited with $rc"
}

# `convert` is bounded by no timeout (the .elkj serializer takes tens of seconds
# per graph) and spread over CONVERT_JOBS JVMs; any failure of a case is fatal.
run_convert() { # run_convert <casesFile> <outDir> <workDir>
  local cases="$1" out="$2" work="$3" job pids=() rc
  for ((job = 0; job < CONVERT_JOBS; job++)); do
    awk -v n="$CONVERT_JOBS" -v j="$job" 'NF && (NR - 1) % n == j' "$cases" >"$work/convert.$job.jsonl"
    : >"$work/convert.$job.results"
    if [ -s "$work/convert.$job.jsonl" ]; then
      ELK_SWEEP_TIMEOUT_MS=0 ORACLE_REGISTRY=core "$ROOT/tools/oracle/run.sh" --cases \
        "$work/convert.$job.jsonl" "$out" >"$work/convert.$job.results" 2>"$work/convert.$job.log" &
      pids+=("$!")
    fi
  done
  for pid in ${pids[@]+"${pids[@]}"}; do
    rc=0
    wait "$pid" || rc=$?
    if [ "$rc" -ne 0 ]; then
      cat "$work"/convert.*.log >&2
      cat "$work"/convert.*.results >&2
      die "oracle convert exited with $rc"
    fi
  done
  cat "$work"/convert.*.results | grep -v '"status":"ok"' && die "oracle convert failed for a case (above)"
  return 0
}

registry_list() { # registry_list <flag>; the sorted JSON array printed by run.sh
  ORACLE_REGISTRY=core "$ROOT/tools/oracle/run.sh" "$1"
}

stage_vendored() { # stage_vendored <convertOut> <stageDir>
  node -e '
    const fs = require("fs");
    const path = require("path");
    const [curated, modelsDir, root, convertOut, stage] = process.argv.slice(1);
    for (const m of JSON.parse(fs.readFileSync(curated, "utf8")).models) {
      const i = m.source.indexOf(":");
      const kind = m.source.slice(0, i);
      const rel = m.source.slice(i + 1);
      const from = m.tier === 1
        ? path.join(convertOut, m.id.split("/").join("__") + ".elkj")
        : path.join(kind === "elk-models" ? modelsDir : root, rel);
      const to = path.join(stage, m.id + (m.tier === 1 ? ".elkj" : path.extname(rel)));
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  ' "$CURATED" "$MODELS_DIR" "$ROOT" "$1" "$2"
}

write_meta() { # write_meta <dest> <results file> <options json> <algorithms json> <vendored dir>
  node -e '
    const fs = require("fs");
    const path = require("path");
    const crypto = require("crypto");
    const [build, manifest, curated, generatedBy, expSeed, idSeed, uncovered, results, options, algorithms, vendored, dest] =
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
    const files = {};
    for (const m of [...models].sort((x, y) => byId(x.id, y.id))) {
      const file = m.id + (m.tier === 1 ? ".elkj" : path.extname(m.source));
      files[m.id] = file;
      inputSha256[m.id] = crypto.createHash("sha256").update(fs.readFileSync(path.join(vendored, file))).digest("hex");
      if (outcomes[m.id] === undefined) throw new Error("no oracle result for " + m.id);
    }
    const sorted = Object.fromEntries(Object.entries(outcomes).sort(([x], [y]) => byId(x, y)));
    const meta = {
      elkCommit: b.commit,
      patches: b.patches,
      modelsCommit: JSON.parse(fs.readFileSync(manifest, "utf8")).commit,
      registry: "core",
      exportSeed: Number(expSeed),
      identifierSeed: Number(idSeed),
      jdk: b.jdk,
      generatedBy,
      files,
      inputSha256,
      outcomes: sorted,
      uncoveredByCorpus: JSON.parse(uncovered),
      optionIds: JSON.parse(fs.readFileSync(options, "utf8")),
      algorithmIds: JSON.parse(fs.readFileSync(algorithms, "utf8")),
    };
    fs.writeFileSync(dest, JSON.stringify(meta, null, 2) + "\n");
  ' "$ELK_ORACLE_DIR/oracle-build.json" "$MANIFEST" "$CURATED" "$GENERATED_BY" "$EXPORT_SEED" \
    "$IDENTIFIER_SEED" "$UNCOVERED_BY_CORPUS" "$2" "$3" "$4" "$5" "$1"
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

swap_dirs() { # swap_dirs <stagingDir> <destDir>; replaces destDir in two renames
  local stage="$1" dest="$2" old="$1.old"
  chmod 755 "$stage"
  if [ -d "$dest" ]; then
    mv "$dest" "$old"
  fi
  mv "$stage" "$dest"
  rm -rf "$old"
}

cleanup() {
  rm -rf "${CONVERT_DIR:-}" "${PARSE_DIR:-}" "${REFS_STAGE:-}" "${VENDOR_STAGE:-}" "${WORK_DIR:-}"
}

main() {
  local count
  [ "$#" -eq 0 ] || die "usage: regen-elkj-refs.sh (no arguments)"
  [ -f "$CURATED" ] || die "$CURATED missing"
  require_models_commit
  require_seed_patch
  require_sources
  mkdir -p "$REFS_PARENT"
  CONVERT_DIR="$(mktemp -d)"
  PARSE_DIR="$(mktemp -d)"
  WORK_DIR="$(mktemp -d)"
  REFS_STAGE="$(mktemp -d "$REFS_PARENT/.elkj-parse-staging.XXXXXX")"
  VENDOR_STAGE="$(mktemp -d "$CORPUS_DIR/.elkj-curated-staging.XXXXXX")"
  trap cleanup EXIT
  # tier 1: convert, then vendor the converted files with the tier-2 sources
  write_cases 1 convert "" "$WORK_DIR/convert.jsonl"
  run_convert "$WORK_DIR/convert.jsonl" "$CONVERT_DIR" "$WORK_DIR"
  stage_vendored "$CONVERT_DIR" "$VENDOR_STAGE"
  # parse the vendored bytes: tier 1 as .elkj, tier 2 through the .elkj language
  write_cases 1 parse "$VENDOR_STAGE" "$WORK_DIR/parse1.jsonl"
  write_cases 2 parse-elkj "$VENDOR_STAGE" "$WORK_DIR/parse2.jsonl"
  cat "$WORK_DIR/parse1.jsonl" "$WORK_DIR/parse2.jsonl" >"$WORK_DIR/parse.jsonl"
  run_harness "$WORK_DIR/parse.jsonl" "$PARSE_DIR" "$WORK_DIR/results.jsonl"
  registry_list --list-options >"$WORK_DIR/options.json"
  registry_list --list-algorithms >"$WORK_DIR/algorithms.json"
  count="$(stage_refs "$PARSE_DIR" "$REFS_STAGE")"
  write_meta "$REFS_STAGE/$META_FILE" "$WORK_DIR/results.jsonl" "$WORK_DIR/options.json" \
    "$WORK_DIR/algorithms.json" "$VENDOR_STAGE"
  swap_dirs "$REFS_STAGE" "$REFS_DIR"
  swap_dirs "$VENDOR_STAGE" "$VENDOR_DIR"
  echo "wrote $count refs + $META_FILE to test/golden/refs/elkj-parse," \
    "vendored inputs to test/corpus/elkj-curated" >&2
}

main "$@"
