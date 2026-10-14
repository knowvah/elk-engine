#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# The .elkt oracle sweep (graph-text mission T23, G3/G7): the source-built oracle's output for every .elkt model under
# $ELK_MODELS_DIR and every realworld .json model, always with the CoreOptions-only registry (ORACLE_REGISTRY=core),
# every kind in two separate JVM runs compared byte for byte (D5; a differing case is "nondeterministic").
#   parse       898 .elkt  -> ELK JSON (run.sh --cases, mode parse)         dir parse/
#   parse-json  550 realworld .json -> ELK JSON (the D3 comparison)         dir parse-json/
#   validate    898 .elkt  -> IResourceValidator issues (ElktSweep.java)    dir validate/
#   write       898 .elkt + 550 realworld .json -> serialized text + the oracle's reparse (ElktSweep.java)  dir write/
# Output (AD-5, never in the repo): $ELK_ORACLE_DIR/sweep/elkt-<elkCommit>-<modelsCommit>/{parse,parse-json,
# validate,write}/<id with "/" as "__">.json, results.jsonl ({"id","kind","status":"ok|throws|nondeterministic|
# oracle-error|timeout"[,"exception"]}, no timings, so reruns are byte-identical) and summary.json.
# Skipped when the sweep dir is fresh: same oracle build, harness and tool sources, models commit and input hashes.
# Usage: elkt-sweep.sh [--force]      Env: ELK_MODELS_DIR, ELK_ORACLE_DIR, P2_BUNDLES, ELK_SWEEP_TIMEOUT_MS
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ELK_MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
TOOLS="$ROOT/tools/oracle"
SWEEP_PROGRAM="$TOOLS/ElktSweep.java"
XTEXT_BUNDLE=org.eclipse.xtext
XTEXT_VERSION=2.36.0
REALWORLD=realworld
# Same list as tools/vectors/elkt-vectors.sh (Xtext standalone setup needs Guice and its companions).
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

model_files() { # model_files <extension> [subdir]: model paths below the models dir, one per line, byte order
  (cd "$ELK_MODELS_DIR" && find "${2:-.}" -type f -name "*.$1" | sed -e 's|^\./||' | LC_ALL=C sort)
}

compute_stamp() { # oracle build + harness + tool sources + models commit + hash of every input
  {
    cat "$ELK_ORACLE_DIR/oracle-build.json"
    cat "$TOOLS"/harness/*.java "$TOOLS"/patches/*.patch "$SWEEP_PROGRAM" "$TOOLS/run.sh" "${BASH_SOURCE[0]}"
    git -C "$ELK_MODELS_DIR" rev-parse HEAD
    { model_files elkt; model_files json "$REALWORLD"; } | while IFS= read -r path; do
      echo "$path $(shasum -a 256 "$ELK_MODELS_DIR/$path" | cut -d' ' -f1)"
    done
  } | shasum -a 256 | cut -d' ' -f1
}

write_cases() { # write_cases <kind> <dest>; parse kinds are JSON Lines for run.sh, validate/write are id<TAB>path
  local kind="$1" path id
  : >"$2"
  while IFS= read -r path; do
    id="${path%.*}"
    case "$kind" in
      parse | parse-json) printf '{"id":"%s","input":"%s/%s","mode":"parse"}\n' "$id" "$ELK_MODELS_DIR" "$path" >>"$2" ;;
      validate) printf '%s\t%s/%s\n' "$id" "$ELK_MODELS_DIR" "$path" >>"$2" ;;
      write) printf '%s\t%s/%s\n' "$path" "$ELK_MODELS_DIR" "$path" >>"$2" ;;
    esac
  done < <(kind_inputs "$kind")
}

kind_inputs() { # kind_inputs <kind>: the model paths a kind covers
  case "$1" in
    parse | validate) model_files elkt ;;
    parse-json) model_files json "$REALWORLD" ;;
    write) model_files elkt && model_files json "$REALWORLD" ;;
  esac
}

run_once() { # run_once <kind> <cases> <outDir> <results>; one JVM run (run.sh restarts it after a timeout)
  local kind="$1"
  mkdir -p "$3"
  case "$kind" in
    parse | parse-json)
      ELK_ORACLE_DIR="$ELK_ORACLE_DIR" ORACLE_REGISTRY=core "$TOOLS/run.sh" --cases "$2" "$3" >"$4" 2>/dev/null || true
      ;;
    *)
      java -cp "$CP" "$SWEEP_PROGRAM" "$kind" "$2" "$3" >"$4" || die "$kind run failed"
      ;;
  esac
  [ -s "$4" ] || die "$kind run produced no results"
}

sweep_kind() { # sweep_kind <kind> <workDir> <outTree>: two runs, merged lines appended to <outTree>/results.jsonl
  local kind="$1" work="$2" cases="$2/$1.cases"
  write_cases "$kind" "$cases"
  run_once "$kind" "$cases" "$work/$kind.1" "$work/$kind.1.jsonl"
  run_once "$kind" "$cases" "$work/$kind.2" "$work/$kind.2.jsonl"
  java -cp "$CP" "$SWEEP_PROGRAM" merge "$kind" "$work/$kind.1" "$work/$kind.1.jsonl" "$work/$kind.2" "$work/$kind.2.jsonl" \
    >>"$3/results.jsonl"
  mv "$work/$kind.1" "$3/$kind"
  echo "$kind: $(wc -l <"$cases" | tr -d ' ') cases" >&2
}

usage() {
  echo "usage: elkt-sweep.sh [--force | --help]" >&2
}

main() {
  local force=0 stamp sweep work elk_commit models_commit kind
  case "${1:-}" in
    "") ;;
    --force) force=1 ;;
    --help | -h) usage; return 0 ;;
    *) usage; return 2 ;;
  esac
  [ "$#" -le 1 ] || { usage; return 2; }
  [ -d "$ELK_MODELS_DIR" ] || die "$ELK_MODELS_DIR missing; run test/corpus/fetch.sh"
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] || die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  elk_commit="$(oracle_field commit)"
  [ "$(tr -d '[:space:]' <"$TOOLS/ELK_COMMIT")" = "$elk_commit" ] || die "oracle built from $elk_commit, not the pinned commit"
  check_xtext_version
  models_commit="$(git -C "$ELK_MODELS_DIR" rev-parse HEAD)"
  sweep="$ELK_ORACLE_DIR/sweep/elkt-$elk_commit-$models_commit"
  stamp="$(compute_stamp)"
  if [ "$force" -eq 0 ] && [ -f "$sweep/.stamp" ] && [ "$(cat "$sweep/.stamp")" = "$stamp" ]; then
    echo "elkt sweep fresh in $sweep (use --force to rerun)" >&2
    return 0
  fi
  CP="$(build_classpath)"
  work="$(mktemp -d)"
  trap 'rm -rf "${work:-}"' EXIT
  mkdir -p "$work/out"
  : >"$work/out/results.jsonl"
  for kind in parse parse-json validate write; do
    sweep_kind "$kind" "$work" "$work/out"
  done
  java -cp "$CP" "$SWEEP_PROGRAM" summary "$work/out/results.jsonl" "$elk_commit" "$models_commit" >"$work/out/summary.json"
  echo "$stamp" >"$work/out/.stamp"
  rm -rf "$sweep"
  mkdir -p "$(dirname "$sweep")"
  mv "$work/out" "$sweep"
  echo "wrote $(wc -l <"$sweep/results.jsonl" | tr -d ' ') results to $sweep" >&2
}

main "$@"
