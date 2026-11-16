#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Mission 7g, T19 (W5): runs the oracle's recursive engine and ElkLayered on three families of cases and writes one line per case to
# test/corpus/.loops-sweep/results.jsonl (gitignored): the SHA-256 of the canonical laid-out graph, or a refused / throws / timeout status.
#   a  the pipeline sweep's cases (every realworld/ptolemy/**.json: levels x 3 routings, whole models x 4 directions) kept where the
#      whole plan of some level holds one of the nine arms of 7g or compaction.connectedComponents is on
#   b  the label sweep's cases (label- or comment-bearing .elkt of tests/layered, tickets/layered, examples; default + 4 directions), same filter
#   c  an option family (wrapping.strategy SINGLE_EDGE / MULTI_EDGE, compaction.postCompaction.strategy EDGE_LENGTH /
#      LEFT_RIGHT_CONNECTION_LOCKING) over the self loop, compaction and components models and every ptolemy model
# test/corpus/loops-sweep.test.ts replays the cases through the port. Line format and case ids: see the header of
# tools/vectors/LayeredLoopsVectors.java, whose --sweep and --dump modes this runs (single-file source launcher, run from the repo root).
# Skipped when the sweep dir is fresh: same oracle build, same recorder source, same models commit, same input hash. The stamp does
# not cover diagnosis-aid environment variables (LOOPS_FILTER, ...): run --force after a run that set one.
# Uses the classpath and JVM flags of tools/vectors/layered-loops-vectors.sh (constant identity hash).
# Usage: loops-sweep.sh [--force]   (LOOPS_SWEEP_DIR overrides the output directory)
# Diagnosis of one case: loops-sweep.sh --dump <case id> <outDir>  (writes the canonical form the hash is taken over)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ELK_MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
SWEEP_DIR="${LOOPS_SWEEP_DIR:-$ROOT/test/corpus/.loops-sweep}"
STAMP_FILE="$SWEEP_DIR/.stamp"
PROGRAM="$ROOT/tools/vectors/LayeredLoopsVectors.java"
LABEL_DIRS=(tests/layered tickets/layered examples)
OPTION_DIRS=(tests/layered/self_loops tests/layered/compaction_oned tests/layered/connected_components)
PTOLEMY_DIR="realworld/ptolemy"
VENDORED_DIR="test/golden/inputs/loops"
# Same list as layered-loops-vectors.sh.
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

model_files() { # one path (relative to the models dir) per line, C-locale order, of every model any part reads
  (
    cd "$ELK_MODELS_DIR"
    find "${LABEL_DIRS[@]}" -type f -name '*.elkt' -print0 | xargs -0 grep -lE 'label|comment'
    find "${OPTION_DIRS[@]}" -type f -name '*.elkt'
    find "$PTOLEMY_DIR" -type f -name '*.json'
    (cd "$ROOT/$VENDORED_DIR" && find . -type f | sed 's|^\./||')
  ) | LC_ALL=C sort -u
}

models_present() { # every directory a part reads exists
  local d
  for d in "${LABEL_DIRS[@]}" "${OPTION_DIRS[@]}" "$PTOLEMY_DIR"; do
    [ -d "$ELK_MODELS_DIR/$d" ] || return 1
  done
  [ -d "$ROOT/$VENDORED_DIR" ]
}

compute_stamp() { # oracle build + recorder + models commit + hash of every input
  {
    cat "$ELK_ORACLE_DIR/oracle-build.json" "$PROGRAM"
    git -C "$ELK_MODELS_DIR" rev-parse HEAD
    model_files | while IFS= read -r f; do
      echo "$f $(shasum -a 256 "$ELK_MODELS_DIR/$f" | cut -d' ' -f1)"
    done
    (cd "$ROOT" && find "$VENDORED_DIR" -type f | LC_ALL=C sort | xargs shasum -a 256)
  } | shasum -a 256 | cut -d' ' -f1
}

# The same JVM flags as layered-loops-vectors.sh: a constant identity hash makes identity-hashed collections iterate in
# insertion order; the top frame of a repeated NullPointerException stays in the trace.
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }-XX:+UnlockExperimentalVMOptions -XX:hashCode=2 -XX:-OmitStackTraceInFastThrow"

run_program() { # run_program <mode args>...; the recorder's sweep and dump modes, run as a source program from the repo root
  local cp
  cp="$(build_classpath)"
  (cd "$ROOT" && java -cp "$cp" "$PROGRAM" "$@")
}

dump_case() { # dump_case <case id> <outDir>
  models_present || die "sweep inputs missing under $ELK_MODELS_DIR; run test/corpus/fetch.sh"
  run_program --dump "$1" "$ELK_MODELS_DIR" "$2" || die "$(basename "$PROGRAM") --dump failed"
}

main() {
  local force=0 stamp
  if [ "${1:-}" = "--dump" ]; then
    [ "$#" -eq 3 ] || die "usage: loops-sweep.sh --dump <case id> <outDir>"
    dump_case "$2" "$3"
    return 0
  fi
  [ "${1:-}" = "--force" ] && force=1
  models_present || die "sweep inputs missing under $ELK_MODELS_DIR; run test/corpus/fetch.sh"
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  stamp="$(compute_stamp)"
  if [ "$force" -eq 0 ] && [ -f "$STAMP_FILE" ] && [ "$(cat "$STAMP_FILE")" = "$stamp" ]; then
    echo "loops sweep fresh in ${SWEEP_DIR#"$ROOT"/} (use --force to rerun)" >&2
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
