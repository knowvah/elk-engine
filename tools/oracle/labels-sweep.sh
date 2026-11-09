#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Mission 7f2, T15 (G7): runs the oracle's recursive engine on every label- or comment-bearing .elkt of
# $ELK_MODELS_DIR/{tests/layered,tickets/layered,examples} at the file's own options and with elk.direction RIGHT, LEFT, DOWN, UP,
# and writes one line per case to test/corpus/.labels-sweep/results.jsonl (gitignored): the SHA-256 of the canonical laid-out
# graph, or a refused / throws / timeout status. test/corpus/labels-sweep.test.ts replays the cases through the port. Line
# format: see the header of tools/vectors/LayeredLabelsVectors.java, whose --sweep and --dump modes this runs (single-file
# source launcher).
# Skipped when the sweep dir is fresh: same oracle build, same recorder source, same models commit, same input hash.
# Uses the classpath and JVM flags of tools/vectors/layered-labels-vectors.sh (constant identity hash).
# Usage: labels-sweep.sh [--force]   (LABELS_SWEEP_DIR overrides the output directory)
# Diagnosis of one case: labels-sweep.sh --dump <case id> <outDir>  (writes the canonical form the hash is taken over)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ELK_MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
SWEEP_DIR="${LABELS_SWEEP_DIR:-$ROOT/test/corpus/.labels-sweep}"
STAMP_FILE="$SWEEP_DIR/.stamp"
PROGRAM="$ROOT/tools/vectors/LayeredLabelsVectors.java"
SWEEP_DIRS=(tests/layered tickets/layered examples)
# Same list as layered-labels-vectors.sh.
THIRD_PARTY=(com.google.gson com.google.guava com.google.guava.failureaccess
  org.eclipse.emf.common org.eclipse.emf.ecore org.eclipse.emf.ecore.xmi
  org.eclipse.xtext.xbase.lib org.eclipse.xtend.lib org.eclipse.xtend.lib.macro
  org.eclipse.xtext org.eclipse.xtext.xbase org.eclipse.xtext.util org.antlr.runtime
  com.google.inject jakarta.inject.jakarta.inject-api org.aopalliance
  org.apache.log4j org.eclipse.equinox.common)

die() {
  echo "error: $1" >&2
  exit 1
}

oracle_jars() { # every oracle jar, one per line
  node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    console.log(Object.values(m.jars).join("\n"));
  ' "$ELK_ORACLE_DIR/oracle-build.json"
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
  done < <(oracle_jars)
  [ -n "$cp" ] || die "no jars in $ELK_ORACLE_DIR/oracle-build.json"
  for bsn in "${THIRD_PARTY[@]}"; do
    jar="$(newest_jar "$bsn")" || die "bundle $bsn not in p2 cache $P2_BUNDLES"
    cp="$cp:$jar"
  done
  printf '%s' "$cp"
}

model_files() { # one .elkt path (relative to the models dir) per line, C-locale order, of every label- or comment-bearing model
  (cd "$ELK_MODELS_DIR" && find "${SWEEP_DIRS[@]}" -type f -name '*.elkt' -print0 | xargs -0 grep -lE 'label|comment' | LC_ALL=C sort)
}

models_present() { # every sweep directory exists
  local d
  for d in "${SWEEP_DIRS[@]}"; do
    [ -d "$ELK_MODELS_DIR/$d" ] || return 1
  done
}

compute_stamp() { # oracle build + recorder + models commit + hash of every input
  {
    cat "$ELK_ORACLE_DIR/oracle-build.json" "$PROGRAM"
    git -C "$ELK_MODELS_DIR" rev-parse HEAD
    model_files | while IFS= read -r f; do
      echo "$f $(shasum -a 256 "$ELK_MODELS_DIR/$f" | cut -d' ' -f1)"
    done
  } | shasum -a 256 | cut -d' ' -f1
}

# The same JVM flags as layered-labels-vectors.sh: a constant identity hash makes HashSet<LNode> iterate in insertion
# order; the top frame of a repeated NullPointerException stays in the trace.
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }-XX:+UnlockExperimentalVMOptions -XX:hashCode=2 -XX:-OmitStackTraceInFastThrow"

run_program() { # run_program <mode args>...; the recorder's sweep and dump modes, run as a source program
  local cp
  cp="$(build_classpath)"
  java -cp "$cp" "$PROGRAM" "$@"
}

dump_case() { # dump_case <case id> <outDir>
  models_present || die "${SWEEP_DIRS[*]} missing under $ELK_MODELS_DIR; run test/corpus/fetch.sh"
  run_program --dump "$1" "$ELK_MODELS_DIR" "$2" || die "$(basename "$PROGRAM") --dump failed"
}

main() {
  local force=0 stamp
  if [ "${1:-}" = "--dump" ]; then
    [ "$#" -eq 3 ] || die "usage: labels-sweep.sh --dump <case id> <outDir>"
    dump_case "$2" "$3"
    return 0
  fi
  [ "${1:-}" = "--force" ] && force=1
  models_present || die "${SWEEP_DIRS[*]} missing under $ELK_MODELS_DIR; run test/corpus/fetch.sh"
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  stamp="$(compute_stamp)"
  if [ "$force" -eq 0 ] && [ -f "$STAMP_FILE" ] && [ "$(cat "$STAMP_FILE")" = "$stamp" ]; then
    echo "labels sweep fresh in ${SWEEP_DIR#"$ROOT"/} (use --force to rerun)" >&2
    return 0
  fi
  rm -rf "$SWEEP_DIR"
  mkdir -p "$SWEEP_DIR"
  run_program --sweep "$ELK_MODELS_DIR" "$SWEEP_DIR" || die "$(basename "$PROGRAM") --sweep failed"
  [ -s "$SWEEP_DIR/results.jsonl" ] || die "the sweep produced no results"
  echo "$stamp" >"$STAMP_FILE"
  echo "wrote $(wc -l <"$SWEEP_DIR/results.jsonl" | tr -d ' ') results to ${SWEEP_DIR#"$ROOT"/}" >&2
}

main "$@"
