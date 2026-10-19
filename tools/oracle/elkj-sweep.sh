#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# The .elkj oracle sweep (graph-json-text mission T17, D2 as amended 2026-10-16): the source-built oracle's output for
# the ELK textual JSON language, always with the CoreOptions-only registry (ORACLE_REGISTRY=core, D4), under
# $ELK_MODELS_DIR. Kinds, in this order (ids are model paths WITH extension; the output file is the id with "/" -> "__"):
#   convert     S graphs (.elkt and realworld .json) -> ELK's own .elkj (run.sh mode convert, identifierSeed=1, D12)  dir convert/
#   parse       the converted .elkj files read by the .elkj language, exported as ELK JSON (tier 1)                  dir parse/
#   validate    IResourceValidator issues of the converted files (ElkjSweep.java; tier 1)                           dir validate/
#   parse-elkj  every realworld .json + tools/vectors/{graph-json,transfer}-scenarios/*.json + test/corpus/generated/
#               *.json read THROUGH the .elkj language (tier 2); a malformed input records the oracle's failure     dir parse-elkj/
#   write       the same S graphs serialized by Xtext (copy + serialize(format())) and reparsed (ElkjSweep.java)    dir write/
# S = the SELECTION: every graph of at most CAP bytes, plus a deterministic stratified sample of the larger ones (the
# oracle's serializer needs minutes of CPU per graph, so the full 1,448 are days of CPU; D2 amendment). Selection rule:
#   small   all graphs with size <= CAP bytes (default 5000: 345 of 1,448);
#   sample  of the larger graphs, SAMPLE (default 40) in size bands that double from CAP ([CAP,2CAP) .. [16CAP,inf));
#           each band gets round(SAMPLE * band / larger) graphs (at least 1, trimmed/padded in the biggest bands to sum
#           to SAMPLE), taken as every k-th graph by sorted path (byte order): index floor((i + 0.5) * band / quota);
#           with SAMPLE_MAX > 0 only graphs up to that many bytes are in the pool (the serializer's cost grows with the
#           graph, not smoothly: the sample is the knob that fits the sweep into a time budget);
#   determinism DET (default 30) small graphs run a second time: up to DET/2 of those whose graph repeats an identifier
#           (where the seeded id generator matters, D12), the rest every k-th by sorted path; every kind compares its
#           two runs byte for byte ("nondeterministic"). Tier 2, parse and validate run twice on everything (cheap).
# Output (AD-5, never in the repo): $ELK_ORACLE_DIR/sweep/elkj-<elkCommit>-<modelsCommit>/{convert,parse,validate,
# parse-elkj,write}/..., selection.tsv (path, size, small|sample, determinism 0|1), results.jsonl ({"id","kind","status":
# "ok|throws|nondeterministic|oracle-error|timeout"[,"exception"],"runs":1|2}, no timings, so reruns are byte-identical),
# summary.json, wall.tsv (kind, seconds) and timings/<kind>.jsonl (run-1 result lines with ms; not part of the contract).
# Work files and logs: $ELK_ORACLE_DIR/sweep/elkj/ (kept; a stage that finished is skipped when the sweep is rerun with
# the same stamp, a chunk that finished likewise, so an interrupted sweep resumes). Run it detached:
#   nohup tools/oracle/elkj-sweep.sh >$ELK_ORACLE_DIR/sweep/elkj.log 2>&1 &
# Skipped when the sweep dir is fresh: same oracle build, harness and tool sources, models commit, parameters and inputs.
# Usage: elkj-sweep.sh [--force] [--cap BYTES] [--sample N] [--sample-max BYTES] [--determinism N] [--jobs N]
#   Parameters as flags or env: ELKJ_SWEEP_CAP, ELKJ_SWEEP_SAMPLE, ELKJ_SWEEP_SAMPLE_MAX, ELKJ_SWEEP_DETERMINISM, ELKJ_SWEEP_JOBS (parallel
#   JVMs for convert and write, default 8), ELKJ_SWEEP_CHUNK (cases per convert/write JVM, default 6),
#   ELKJ_SWEEP_JAVA_OPTS (JAVA_TOOL_OPTIONS of every JVM, default "-XX:+UseSerialGC -Xmn3g -Xmx8g": the serializer's
#   path search allocates without pause, and measured on 4 graphs of 0.6-2.7 KB the serial collector used 3.5x less
#   CPU than G1 for the same output, because G1's parallel and concurrent threads only add work on a shared machine).
#   A full run (every graph, double-run) is --cap 100000000 --determinism 100000000.
#   Env: ELK_MODELS_DIR, ELK_ORACLE_DIR, P2_BUNDLES, ELK_SWEEP_TIMEOUT_MS (parse kinds; convert is never bounded)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ELK_MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
TOOLS="$ROOT/tools/oracle"
SWEEP_PROGRAM="$TOOLS/ElkjSweep.java"
XTEXT_BUNDLE=org.eclipse.xtext
XTEXT_VERSION=2.36.0
REALWORLD=realworld
DEFAULT_CAP=5000
DEFAULT_SAMPLE=40
DEFAULT_DETERMINISM=30
DEFAULT_JOBS=8
DEFAULT_CHUNK=6
CHEAP_CHUNK=120 # cases per JVM for parse and parse-elkj (milliseconds each; a JVM start costs seconds)
PARSE_TIMEOUT_MS=600000
DEFAULT_JAVA_OPTS="-XX:+UseSerialGC -Xmn3g -Xmx8g"
# Repo ELK JSON read through the .elkj language (tier 2), relative to the repo root.
REPO_JSON_DIRS=(tools/vectors/graph-json-scenarios tools/vectors/transfer-scenarios test/corpus/generated)
# Same list as tools/oracle/run.sh (Xtext standalone setup needs Guice and its companions).
THIRD_PARTY=(com.google.gson com.google.guava com.google.guava.failureaccess
  org.eclipse.emf.common org.eclipse.emf.ecore org.eclipse.emf.ecore.xmi
  org.eclipse.xtext.xbase.lib org.eclipse.xtend.lib org.eclipse.xtend.lib.macro
  org.eclipse.xtext org.eclipse.xtext.xbase org.eclipse.xtext.util org.antlr.runtime
  com.google.inject jakarta.inject.jakarta.inject-api org.aopalliance
  org.apache.log4j org.eclipse.equinox.common)

CAP="${ELKJ_SWEEP_CAP:-$DEFAULT_CAP}"
SAMPLE="${ELKJ_SWEEP_SAMPLE:-$DEFAULT_SAMPLE}"
SAMPLE_MAX="${ELKJ_SWEEP_SAMPLE_MAX:-0}"
DETERMINISM="${ELKJ_SWEEP_DETERMINISM:-$DEFAULT_DETERMINISM}"
JOBS="${ELKJ_SWEEP_JOBS:-$DEFAULT_JOBS}"
CHUNK="${ELKJ_SWEEP_CHUNK:-$DEFAULT_CHUNK}"
JAVA_OPTS="${ELKJ_SWEEP_JAVA_OPTS:-$DEFAULT_JAVA_OPTS}"

log() {
  echo "$(date '+%H:%M:%S') elkj-sweep: $*" >&2
}

die() {
  echo "error: $1" >&2
  exit 1
}

oracle_field() { # oracle_field <commit|jars>; jars = every oracle jar, one per line
  node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    console.log(process.argv[2] === "commit" ? m.commit : Object.values(m.jars).join("\n"));
  ' "$ELK_ORACLE_DIR/oracle-build.json" "$1"
}

newest_jar() { # newest_jar <bsn>; highest version dir by version sort
  local dir="$P2_BUNDLES/$1" ver jar
  ver="$(find "$dir" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null | sort -V | tail -n1)"
  [ -n "$ver" ] || return 1
  for jar in "$dir/$ver"/*.jar; do
    case "$jar" in *-sources.jar) continue ;; esac
    [ -f "$jar" ] && { echo "$jar"; return 0; }
  done
  return 1
}

build_classpath() {
  local cp="" jar bsn
  while IFS= read -r jar; do
    [ -f "$jar" ] || die "oracle jar missing: $jar (run tools/oracle/build.sh)"
    cp="${cp:+$cp:}$jar"
  done < <(oracle_field jars)
  [ -n "$cp" ] || die "no jars in $ELK_ORACLE_DIR/oracle-build.json"
  for bsn in "${THIRD_PARTY[@]}"; do
    jar="$(newest_jar "$bsn")" || die "bundle $bsn not in p2 cache $P2_BUNDLES"
    cp="$cp:$jar"
  done
  printf '%s' "$cp"
}

check_xtext_version() {
  local dir
  dir="$(basename "$(dirname "$(newest_jar "$XTEXT_BUNDLE")")")"
  case "$dir" in
    "$XTEXT_VERSION" | "$XTEXT_VERSION".*) ;;
    *) die "xtext $dir in the p2 cache, expected $XTEXT_VERSION" ;;
  esac
}

require_seed_patch() { # convert of a graph with duplicate ids is only repeatable with the D12 patch
  node -e '
    const b = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    if (!b.patches.some((p) => String(p).includes("0002-graph-seedable-GraphIdentifierGenerator-random"))) process.exit(1);
  ' "$ELK_ORACLE_DIR/oracle-build.json" || die "oracle built without patch 0002 (D12); run tools/oracle/build.sh"
}

model_files() { # model_files <extension> [subdir]: model paths below the models dir, one per line, byte order
  (cd "$ELK_MODELS_DIR" && find "${2:-.}" -type f -name "*.$1" | sed -e 's|^\./||' | LC_ALL=C sort)
}

# ---- selection

source_graphs() { # every graph a write/convert case can read: "<size>\t<path>" in byte order of the path
  { model_files elkt; model_files json "$REALWORLD"; } | LC_ALL=C sort | while IFS= read -r path; do
    printf '%s\t%s\n' "$(wc -c <"$ELK_MODELS_DIR/$path" | tr -d ' ')" "$path"
  done
}

select_graphs() { # select_graphs <sizes.tsv> <dest>; the small graphs plus the stratified sample (see the header)
  node -e '
    const fs = require("fs");
    const [sizesFile, cap, sample, max, dest] = process.argv.slice(1);
    const BANDS = 5;
    const rows = fs.readFileSync(sizesFile, "utf8").split("\n").filter(Boolean).map((l) => {
      const [size, path] = l.split("\t");
      return { size: Number(size), path };
    });
    const small = rows.filter((r) => r.size <= Number(cap));
    const large = rows.filter((r) => r.size > Number(cap) && (Number(max) === 0 || r.size <= Number(max)));
    const bandOf = (r) => Math.min(BANDS - 1, Math.floor(Math.log2(r.size / Number(cap))));
    const bands = Array.from({ length: BANDS }, (_, b) => large.filter((r) => bandOf(r) === b));
    const want = Math.min(Number(sample), large.length);
    const quota = bands.map((b) => (b.length === 0 || want === 0 ? 0 : Math.min(b.length, Math.max(1, Math.round((want * b.length) / large.length)))));
    const sum = () => quota.reduce((a, b) => a + b, 0);
    const widest = (key) => bands.map((_, b) => b).sort((x, y) => key(y) - key(x) || y - x)[0];
    while (sum() > want) quota[widest((b) => quota[b])]--;
    while (sum() < want) quota[widest((b) => bands[b].length - quota[b])]++;
    const picked = bands.flatMap((members, b) =>
      Array.from({ length: quota[b] }, (_, i) => members[Math.floor(((i + 0.5) * members.length) / quota[b])]));
    const out = [...small.map((r) => ({ ...r, tier: "small" })), ...picked.map((r) => ({ ...r, tier: "sample" }))]
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    fs.writeFileSync(dest, out.map((r) => [r.path, r.size, r.tier, 0].join("\t") + "\n").join(""));
    console.error("selection: small=" + small.length + " sample=" + picked.length + " of " + large.length + " larger, quota per band " + quota.join("/"));
  ' "$1" "$CAP" "$SAMPLE" "$SAMPLE_MAX" "$2"
}

mark_determinism() { # mark_determinism <selection.tsv> <duplicates.txt>; sets column 4 on DETERMINISM small graphs
  node -e '
    const fs = require("fs");
    const [file, dupFile, want] = process.argv.slice(1);
    const rows = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));
    const dups = new Set(fs.readFileSync(dupFile, "utf8").split("\n").filter(Boolean));
    const everyKth = (list, n) => (n >= list.length ? list : Array.from({ length: n }, (_, i) => list[Math.floor(((i + 0.5) * list.length) / n)]));
    const small = rows.filter((r) => r[2] === "small");
    const dupRows = everyKth(small.filter((r) => dups.has(r[0])), Math.min(Math.ceil(Number(want) / 2), small.length));
    const chosen = new Set(dupRows.map((r) => r[0]));
    const rest = small.filter((r) => !chosen.has(r[0]));
    everyKth(rest, Math.min(Number(want) - chosen.size, rest.length)).forEach((r) => chosen.add(r[0]));
    for (const r of rows) r[3] = chosen.has(r[0]) ? 1 : 0;
    fs.writeFileSync(file, rows.map((r) => r.join("\t") + "\n").join(""));
    console.error("determinism: " + chosen.size + " graphs, " + dupRows.length + " with a repeated identifier");
  ' "$1" "$2" "$DETERMINISM"
}

tier2_inputs() { # "<id>\t<absolute path>" of every tier-2 input, id order
  {
    model_files json "$REALWORLD" | while IFS= read -r path; do printf '%s\t%s/%s\n' "$path" "$ELK_MODELS_DIR" "$path"; done
    local dir file
    for dir in "${REPO_JSON_DIRS[@]}"; do
      for file in "$ROOT/$dir"/*.json; do
        [ -f "$file" ] && printf '%s\t%s\n' "$dir/$(basename "$file")" "$file"
      done
    done
  } | LC_ALL=C sort
}

# ---- case files (largest first: the long cases start first and the tail is short)

cases_tsv() { # cases_tsv <selection.tsv> <onlyDeterminism 0|1> <dest>: "<id>\t<abs path>"
  awk -F'\t' -v only="$2" -v dir="$ELK_MODELS_DIR" 'only == 0 || $4 == 1 { printf "%s\t%d\t%s/%s\n", $1, $2, dir, $1 }' "$1" |
    LC_ALL=C sort -t "$(printf '\t')" -k2,2nr -k1,1 | cut -f1,3 >"$3"
}

cases_jsonl() { # cases_jsonl <id\tpath file> <mode> <dest>
  awk -F'\t' -v mode="$2" '{ printf "{\"id\":\"%s\",\"input\":\"%s\",\"mode\":\"%s\"}\n", $1, $2, mode }' "$1" >"$3"
}

# ---- running the kinds: the chunks of every expensive kind go through one queue, largest first, drained by JOBS JVMs

TAB="$(printf '\t')"

run_chunk() { # run_chunk <runner> <chunk> <outDir> <arg>; one JVM over a chunk's cases; harness = run.sh (arg =
  # timeoutMs; its exit 1 means some case threw, which is a recorded result), write = ElkjSweep write (arg = threads)
  local runner="$1" chunk="$2" out="$3" rc=0
  [ -f "$chunk.done" ] && return 0
  date +%s >"$chunk.start"
  case "$runner" in
    harness)
      ELK_SWEEP_TIMEOUT_MS="$4" ORACLE_REGISTRY=core "$TOOLS/run.sh" --cases "$chunk" "$out" >"${chunk%.chunk}.results" 2>"$chunk.log" || rc=$?
      if [ "$rc" -le 1 ]; then rc=0; fi
      ;;
    write)
      mkdir -p "$out"
      java -cp "$CP" "$SWEEP_PROGRAM" write "$chunk" "$out" "$4" >"${chunk%.chunk}.results" 2>"$chunk.log" || rc=$?
      ;;
  esac
  [ "$rc" -eq 0 ] || { echo "error: chunk $chunk exited with $rc (see $chunk.log)" >&2; return 1; }
  date +%s >"$chunk.done"
}

add_chunks() { # add_chunks <name> <runner> <cases file> <outDir> <arg> <chunkSize>: splits the cases (largest first)
  # into chunks, a graph above CAP alone and the rest <chunkSize> at a time, and queues them as "size runner chunk out arg"
  local name="$1" prefix="$WORK/$1.chunks/c"
  mkdir -p "$WORK/$name.chunks" "$4"
  awk -F'\t' -v runner="$2" -v prefix="$prefix" -v out="$4" -v arg="$5" -v chunk="$6" -v cap="$CAP" '
    FNR == NR { size[$1] = $2; next }
    {
      id = $1
      if (substr($0, 1, 1) == "{") { match($0, /"id":"[^"]*"/); id = substr($0, RSTART + 6, RLENGTH - 7) }
      s = (id in size) ? size[id] : 0
      alone = s > cap
      if (n == 0 || alone || prevAlone || n >= chunk) {
        if (file != "") close(file)
        k++
        file = sprintf("%s.%04d.chunk", prefix, k)
        queue[k] = s "\t" runner "\t" file "\t" out "\t" arg
        n = 0
      }
      print > file
      n++
      prevAlone = alone
    }
    END { for (i = 1; i <= k; i++) print queue[i] }
  ' "$WORK/selection.tsv" "$3" >>"$WORK/queue.tsv"
}

drain_queue() { # runs the queued chunks, largest first, JOBS at a time; a finished chunk is skipped on a rerun
  [ -s "$WORK/queue.tsv" ] || return 0
  LC_ALL=C sort -s -t "$TAB" -k1,1nr "$WORK/queue.tsv" | cut -f2- |
    xargs -P "$JOBS" -L 1 "${BASH_SOURCE[0]}" __chunk || die "a chunk failed (logs next to $WORK/*.chunks/c.*.chunk)"
  : >"$WORK/queue.tsv"
}

collect() { # collect <name> <dest>: the result lines of a name's chunks, in chunk order
  cat "$WORK/$1.chunks"/c.*.results >"$2"
  [ -s "$2" ] || die "$1 produced no results"
}

span() { # span <name>: seconds from the first chunk start to the last chunk end of a name
  local first last
  first="$(cat "$WORK/$1.chunks"/c.*.start | sort -n | head -n1)"
  last="$(cat "$WORK/$1.chunks"/c.*.done | sort -n | tail -n1)"
  echo "$((last - first))"
}

run_java() { # run_java <name> <kind> <cases.tsv> <outDir> <results>: one ElkjSweep JVM, once per stamp
  local name="$1" kind="$2" cases="$3" out="$4" results="$5"
  [ -f "$WORK/$name.done" ] && return 0
  rm -rf "$out"
  mkdir -p "$out"
  java -cp "$CP" "$SWEEP_PROGRAM" "$kind" "$cases" "$out" >"$results" 2>"$results.log" ||
    die "$kind run failed (see $results.log)"
  [ -s "$results" ] || die "$kind run produced no results"
  touch "$WORK/$name.done"
}

stage() { # stage <name> <function>: runs once per stamp; records the wall seconds
  local name="$1" start
  if [ -f "$WORK/$name.stage" ]; then
    log "$name: done earlier"
    return 0
  fi
  start="$(date +%s)"
  "$2"
  echo "$(($(date +%s) - start))" >"$WORK/$name.stage"
  log "$name: $(cat "$WORK/$name.stage") s"
}

merge_kind() { # merge_kind <kind> <ext> <dir1> <results1> <dir2|-> <results2|->
  java -cp "$CP" "$SWEEP_PROGRAM" merge "$1" "$2" "$3" "$4" "${5:--}" "${6:--}" >>"$WORK/results.jsonl"
}

stage_oracle() { # convert, write and tier 2 (parse-elkj): independent of each other, so they share one queue
  local run
  cases_tsv "$WORK/selection.tsv" 0 "$WORK/convert.1.tsv"
  cases_tsv "$WORK/selection.tsv" 1 "$WORK/convert.2.tsv"
  cases_jsonl "$WORK/convert.1.tsv" convert "$WORK/convert.1.jsonl"
  cases_jsonl "$WORK/convert.2.tsv" convert "$WORK/convert.2.jsonl"
  cases_jsonl "$WORK/tier2.tsv" parse-elkj "$WORK/parse-elkj.jsonl"
  : >"$WORK/queue.tsv"
  for run in 1 2; do
    add_chunks "convert$run" harness "$WORK/convert.$run.jsonl" "$WORK/convert.$run" 0 "$CHUNK"
    add_chunks "write$run" write "$WORK/convert.$run.tsv" "$WORK/write.$run" 1 "$CHUNK"
    add_chunks "parse-elkj$run" harness "$WORK/parse-elkj.jsonl" "$WORK/parse-elkj.$run" "${ELK_SWEEP_TIMEOUT_MS:-$PARSE_TIMEOUT_MS}" "$CHEAP_CHUNK"
  done
  drain_queue
  for run in 1 2; do
    collect "convert$run" "$WORK/convert.$run.res"
    collect "write$run" "$WORK/write.$run.res"
    collect "parse-elkj$run" "$WORK/parse-elkj.$run.res"
  done
}

converted_cases() { # converted_cases <dest>: "<id>\t<converted file>" for the graphs whose first convert run succeeded
  node -e '
    const fs = require("fs");
    const [resultsFile, dir, dest] = process.argv.slice(1);
    const lines = fs.readFileSync(resultsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const ok = lines.filter((r) => r.status === "ok").map((r) => r.id).sort();
    fs.writeFileSync(dest, ok.map((id) => id + "\t" + dir + "/" + id.split("/").join("__") + ".elkj\n").join(""));
  ' "$WORK/convert.1.res" "$WORK/convert.1" "$1"
}

stage_parse() { # tier 1: the converted files through the .elkj language (cheap: milliseconds each)
  local run
  converted_cases "$WORK/tier1.tsv"
  cases_jsonl "$WORK/tier1.tsv" parse "$WORK/parse.jsonl"
  : >"$WORK/queue.tsv"
  for run in 1 2; do
    add_chunks "parse$run" harness "$WORK/parse.jsonl" "$WORK/parse.$run" "${ELK_SWEEP_TIMEOUT_MS:-$PARSE_TIMEOUT_MS}" "$CHEAP_CHUNK"
  done
  drain_queue
  for run in 1 2; do collect "parse$run" "$WORK/parse.$run.res"; done
}

stage_validate() {
  local run
  for run in 1 2; do
    run_java "validate$run" validate "$WORK/tier1.tsv" "$WORK/validate.$run" "$WORK/validate.$run.res"
  done
}

# ---- stamp and assembly

compute_stamp() { # oracle build + harness + tool sources + models commit + parameters + the selected and tier-2 inputs
  {
    cat "$ELK_ORACLE_DIR/oracle-build.json"
    cat "$TOOLS"/harness/*.java "$TOOLS"/patches/*.patch "$SWEEP_PROGRAM" "$TOOLS/run.sh" "${BASH_SOURCE[0]}"
    git -C "$ELK_MODELS_DIR" rev-parse HEAD
    echo "cap=$CAP sample=$SAMPLE sample-max=$SAMPLE_MAX determinism=$DETERMINISM"
    { cut -f1 "$1" | while IFS= read -r path; do echo "$ELK_MODELS_DIR/$path"; done; cut -f2 "$2"; } |
      while IFS= read -r file; do echo "$file $(shasum -a 256 "$file" | cut -d' ' -f1)"; done
  } | shasum -a 256 | cut -d' ' -f1
}

assemble() { # assemble <sweepDir>
  local sweep="$1" new="$1.new" kind
  rm -rf "$new"
  mkdir -p "$new/timings"
  mv "$WORK/convert.1" "$new/convert"
  mv "$WORK/parse.1" "$new/parse"
  mv "$WORK/validate.1" "$new/validate"
  mv "$WORK/parse-elkj.1" "$new/parse-elkj"
  mv "$WORK/write.1" "$new/write"
  cp "$WORK/selection.tsv" "$new/selection.tsv"
  cp "$WORK/results.jsonl" "$new/results.jsonl"
  java -cp "$CP" "$SWEEP_PROGRAM" summary "$WORK/results.jsonl" "$ELK_COMMIT" "$MODELS_COMMIT" >"$new/summary.json"
  for kind in convert parse validate parse-elkj write; do
    cp "$WORK/$kind.1.res" "$new/timings/$kind.jsonl"
  done
  # seconds from the first chunk start to the last chunk end of the first run (convert, write and parse-elkj overlap in
  # one queue), the wall of the whole queue, and the later stages
  {
    printf 'convert\t%s\nwrite\t%s\nparse-elkj\t%s\n' "$(span convert1)" "$(span write1)" "$(span parse-elkj1)"
    printf 'queue(convert+write+parse-elkj)\t%s\nparse\t%s\nvalidate\t%s\n' \
      "$(cat "$WORK/oracle.stage")" "$(cat "$WORK/parse.stage")" "$(cat "$WORK/validate.stage")"
  } >"$new/wall.tsv"
  echo "$STAMP" >"$new/.stamp"
  rm -rf "$sweep"
  mv "$new" "$sweep"
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --force) FORCE=1 ;;
      --cap) CAP="${2:?--cap needs bytes}"; shift ;;
      --sample) SAMPLE="${2:?--sample needs a count}"; shift ;;
      --sample-max) SAMPLE_MAX="${2:?--sample-max needs bytes}"; shift ;;
      --determinism) DETERMINISM="${2:?--determinism needs a count}"; shift ;;
      --jobs) JOBS="${2:?--jobs needs a count}"; shift ;;
      --help | -h) echo "usage: elkj-sweep.sh [--force] [--cap BYTES] [--sample N] [--sample-max BYTES] [--determinism N] [--jobs N]" >&2; exit 0 ;;
      *) echo "usage: elkj-sweep.sh [--force] [--cap BYTES] [--sample N] [--sample-max BYTES] [--determinism N] [--jobs N]" >&2; exit 2 ;;
    esac
    shift
  done
  case "$CAP$SAMPLE$SAMPLE_MAX$DETERMINISM$JOBS$CHUNK" in '' | *[!0-9]*) die "parameters must be non-negative integers" ;; esac
  [ "$CAP" -ge 1 ] && [ "$JOBS" -ge 1 ] && [ "$CHUNK" -ge 1 ] || die "cap, jobs and chunk must be at least 1"
}

main() {
  if [ "${1:-}" = __chunk ]; then # internal: one chunk of run_chunks, called through xargs
    export JAVA_TOOL_OPTIONS="$JAVA_OPTS"
    CP="$(build_classpath)"
    run_chunk "$2" "$3" "$4" "$5"
    return
  fi
  if [ "${1:-}" = __classpath ]; then # internal: the classpath of the JVM programs, for ad-hoc runs of ElkjSweep.java
    build_classpath
    return
  fi
  FORCE=0
  parse_args "$@"
  [ -d "$ELK_MODELS_DIR" ] || die "$ELK_MODELS_DIR missing; run test/corpus/fetch.sh"
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] || die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  ELK_COMMIT="$(oracle_field commit)"
  [ "$(tr -d '[:space:]' <"$TOOLS/ELK_COMMIT")" = "$ELK_COMMIT" ] || die "oracle built from $ELK_COMMIT, not the pinned commit"
  check_xtext_version
  require_seed_patch
  MODELS_COMMIT="$(git -C "$ELK_MODELS_DIR" rev-parse HEAD)"
  SWEEP="$ELK_ORACLE_DIR/sweep/elkj-$ELK_COMMIT-$MODELS_COMMIT"
  WORK="$ELK_ORACLE_DIR/sweep/elkj"
  CP="$(build_classpath)"
  export ELK_ORACLE_DIR ELK_MODELS_DIR P2_BUNDLES JOBS CHUNK CAP SAMPLE SAMPLE_MAX DETERMINISM WORK CP JAVA_OPTS
  export JAVA_TOOL_OPTIONS="$JAVA_OPTS"
  mkdir -p "$WORK.new"
  source_graphs >"$WORK.new/sizes.tsv"
  select_graphs "$WORK.new/sizes.tsv" "$WORK.new/selection.tsv"
  tier2_inputs >"$WORK.new/tier2.tsv"
  STAMP="$(compute_stamp "$WORK.new/selection.tsv" "$WORK.new/tier2.tsv")"
  if [ "$FORCE" -eq 0 ] && [ -f "$SWEEP/.stamp" ] && [ "$(cat "$SWEEP/.stamp")" = "$STAMP" ]; then
    rm -rf "$WORK.new"
    log "sweep fresh in $SWEEP (use --force to rerun)"
    return 0
  fi
  if [ "$FORCE" -eq 1 ] || [ ! -f "$WORK/.stamp" ] || [ "$(cat "$WORK/.stamp")" != "$STAMP" ]; then
    rm -rf "$WORK"
    mv "$WORK.new" "$WORK"
    echo "$STAMP" >"$WORK/.stamp"
  else
    rm -rf "$WORK.new"
    log "resuming the interrupted sweep in $WORK"
  fi
  run_sweep
}

run_sweep() {
  local small_cases="$WORK/small.tsv" first
  # compile the harness once, before the parallel JVMs race to do it
  ORACLE_REGISTRY=core "$TOOLS/run.sh" --list-options >/dev/null 2>&1 || die "run.sh --list-options failed"
  if [ ! -f "$WORK/determinism.done" ]; then
    awk -F'\t' -v dir="$ELK_MODELS_DIR" '$3 == "small" { printf "%s\t%s/%s\n", $1, dir, $1 }' "$WORK/selection.tsv" >"$small_cases"
    java -cp "$CP" "$SWEEP_PROGRAM" duplicates "$small_cases" >"$WORK/duplicates.txt"
    mark_determinism "$WORK/selection.tsv" "$WORK/duplicates.txt"
    touch "$WORK/determinism.done"
  fi
  log "selection: $(wc -l <"$WORK/selection.tsv" | tr -d ' ') graphs, $(awk -F'\t' '$4 == 1' "$WORK/selection.tsv" | wc -l | tr -d ' ') twice"
  stage oracle stage_oracle
  stage parse stage_parse
  stage validate stage_validate
  : >"$WORK/results.jsonl"
  merge_kind convert .elkj "$WORK/convert.1" "$WORK/convert.1.res" "$WORK/convert.2" "$WORK/convert.2.res"
  merge_kind parse .json "$WORK/parse.1" "$WORK/parse.1.res" "$WORK/parse.2" "$WORK/parse.2.res"
  merge_kind validate .json "$WORK/validate.1" "$WORK/validate.1.res" "$WORK/validate.2" "$WORK/validate.2.res"
  merge_kind parse-elkj .json "$WORK/parse-elkj.1" "$WORK/parse-elkj.1.res" "$WORK/parse-elkj.2" "$WORK/parse-elkj.2.res"
  merge_kind write .json "$WORK/write.1" "$WORK/write.1.res" "$WORK/write.2" "$WORK/write.2.res"
  first="$(grep -c nondeterministic "$WORK/results.jsonl" || true)"
  assemble "$SWEEP"
  log "wrote $(wc -l <"$SWEEP/results.jsonl" | tr -d ' ') results to $SWEEP ($first nondeterministic)"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then # not when sourced (tests of the selection)
  main "$@"
fi
