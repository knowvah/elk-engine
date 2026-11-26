#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# The DOT export oracle sweep (mission graphviz-dot D6, written in T3, run in full by T12): for every .elkt model under
# $ELK_MODELS_DIR, the source-built oracle's DotExporter text under default properties and the oracle's parse of that
# text, always with the CoreOptions-only registry (G3, ORACLE_REGISTRY=core). tools/oracle/DotExportSweep.java documents
# the per-model files: <name>.dot, <name>.model.json, or <name>.throws.json (name = model path minus .elkt, "/" -> "__").
# Output (AD-5, never in the repo): $ELK_ORACLE_DIR/sweep/dot-export/, plus summary.json (counts) and .stamp.
# Resumable: models already done are skipped. The .stamp records the oracle build, the sweep sources and the models commit;
# a sweep dir with another stamp is refused (stale results) unless --force, which empties it first.
# Refuses to run unless oracle-build.json names tools/oracle/ELK_COMMIT and records the alg.graphviz.dot jar (D8).
# Usage: dot-export-sweep.sh [--force] [--limit N]   run (the first N models in byte order with --limit)
#        dot-export-sweep.sh --list                  print the model paths (relative to $ELK_MODELS_DIR) and exit
# Env: ELK_MODELS_DIR (default <repo>/../../eclipse-elk/elk-models), ELK_ORACLE_DIR (default <repo>/../elk-oracle),
#      P2_BUNDLES.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ELK_MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
TOOLS="$ROOT/tools/oracle"
SWEEP_PROGRAM="$TOOLS/DotExportSweep.java"
XTEXT_BUNDLE=org.eclipse.xtext
XTEXT_VERSION=2.36.0
DOT_BUNDLE=org.eclipse.elk.alg.graphviz.dot
# Same list as tools/vectors/dot-vectors.sh (Xtext standalone setup needs Guice and its companions).
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

usage() {
  echo "usage: dot-export-sweep.sh [--force] [--limit N] | --list | --help" >&2
}

oracle_field() { # oracle_field <commit|jars|dot>; jars = every oracle jar, one per line; dot = the DOT bundle's jar or ""
  node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const field = process.argv[2];
    if (field === "commit") console.log(m.commit);
    else if (field === "jars") console.log(Object.values(m.jars).join("\n"));
    else console.log(m.jars[process.argv[3]] ?? "");
  ' "$ELK_ORACLE_DIR/oracle-build.json" "$1" "$DOT_BUNDLE"
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

check_oracle() {
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] || die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built
  pinned="$(tr -d '[:space:]' <"$TOOLS/ELK_COMMIT")"
  built="$(oracle_field commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
  [ -n "$(oracle_field dot)" ] ||
    die "oracle-build.json records no $DOT_BUNDLE jar; run tools/oracle/build.sh --record-only"
  check_xtext_version
}

model_files() { # model paths below the models dir, one per line, byte order
  (cd "$ELK_MODELS_DIR" && find . -type f -name '*.elkt' | sed -e 's|^\./||' | LC_ALL=C sort)
}

compute_stamp() { # oracle build + sweep sources + models commit
  {
    cat "$ELK_ORACLE_DIR/oracle-build.json" "$SWEEP_PROGRAM" "${BASH_SOURCE[0]}"
    git -C "$ELK_MODELS_DIR" rev-parse HEAD
  } | shasum -a 256 | cut -d' ' -f1
}

write_cases() { # write_cases <dest> <limit or "">: "<name>\t<path>" per model
  local path name n=0
  : >"$1"
  while IFS= read -r path; do
    [ -z "$2" ] || [ "$n" -lt "$2" ] || break
    name="${path%.elkt}"
    printf '%s\t%s/%s\n' "${name//\//__}" "$ELK_MODELS_DIR" "$path" >>"$1"
    n=$((n + 1))
  done < <(model_files)
}

prepare_dir() { # prepare_dir <sweepDir> <stamp> <force>
  if [ "$3" -eq 1 ]; then
    rm -rf "$1"
  elif [ -f "$1/.stamp" ] && [ "$(cat "$1/.stamp")" != "$2" ]; then
    die "$1 holds results of another oracle build, sweep source or models commit; rerun with --force"
  fi
  mkdir -p "$1"
  echo "$2" >"$1/.stamp"
}

main() {
  local force=0 limit="" list=0 sweep stamp cp work models
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --force) force=1 ;;
      --list) list=1 ;;
      --limit)
        [ "$#" -ge 2 ] && [[ "$2" =~ ^[0-9]+$ ]] || { usage; return 2; }
        limit="$2"
        shift
        ;;
      --help | -h) usage; return 0 ;;
      *) usage; return 2 ;;
    esac
    shift
  done
  [ -d "$ELK_MODELS_DIR" ] || die "$ELK_MODELS_DIR missing; run test/corpus/fetch.sh"
  if [ "$list" -eq 1 ]; then
    model_files
    return 0
  fi
  check_oracle
  sweep="$ELK_ORACLE_DIR/sweep/dot-export"
  stamp="$(compute_stamp)"
  prepare_dir "$sweep" "$stamp" "$force"
  cp="$(build_classpath)"
  work="$(mktemp -d)"
  trap 'rm -rf "${work:-}"' EXIT
  write_cases "$work/cases.tsv" "$limit"
  models="$(model_files | wc -l | tr -d ' ')"
  java -cp "$cp" "$SWEEP_PROGRAM" run "$work/cases.tsv" "$sweep" || die "sweep run failed"
  java -cp "$cp" "$SWEEP_PROGRAM" summary "$sweep" "$(oracle_field commit)" "$(git -C "$ELK_MODELS_DIR" rev-parse HEAD)" \
    "$models" >"$work/summary.json"
  mv "$work/summary.json" "$sweep/summary.json"
  echo "dot-export sweep: $(cat "$sweep/summary.json")" >&2
}

main "$@"
