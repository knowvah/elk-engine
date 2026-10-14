#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Lays out (or parses) ELK JSON / ELK text (.elkt) graphs with the
# source-built oracle (AD-3).
# Usage: run.sh <outDir> <input.json|input.elkt>...
#        run.sh --cases <cases.jsonl> <outDir>
#        run.sh --list-algorithms | --list-options
# Case file: JSON Lines {"id","input","mode":"layout"|"parse"|"generate",
# "algorithm"?,"variant"?} ("generate" reads a grandom .elkr and writes the
# graph unlaid-out); output is <outDir>/<id with "/" replaced by
# "__">.json, one JSON result line per case on stdout. Each case is bounded
# by ELK_SWEEP_TIMEOUT_MS (default 30000); a JVM that hit a timeout exits
# with code 75 and is restarted on the cases without a result line.
# Env ORACLE_REGISTRY=default|core (default "default"): "core" passes
# -Delk.oracle.registry=core, so the harness registers CoreOptions only (G3,
# the TS registry of C8) and skips the explicit algorithm providers. Meant for
# "parse" cases and --list-*; --list-options prints the registry's option ids.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HARNESS_DIR="$ROOT/tools/oracle/harness"
VARIANTS_FILE="$ROOT/test/corpus/variants.json"
EXIT_TIMEOUT=75 # keep in sync with ElkOracle.EXIT_TIMEOUT
DEFAULT_TIMEOUT_MS=30000
# Seeds JsonExporter id-collision suffixes (seam patch 0001; decisions D5b).
EXPORT_SEED=1
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
ORACLE_REGISTRY="${ORACLE_REGISTRY:-default}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
# Third-party bundles named by Require-Bundle in the in-scope manifests, plus
# companions that are not Require-Bundle entries: Guava's failureaccess, and
# Guice with its inject/aopalliance/log4j dependencies (Xtext standalone setup).
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

oracle_jars() { # prints one in-scope jar path per line
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
    cp="$cp:$jar"
  done < <(oracle_jars)
  for bsn in "${THIRD_PARTY[@]}"; do
    jar="$(newest_jar "$bsn")" || die "bundle $bsn not in p2 cache $P2_BUNDLES"
    echo "using $bsn $(basename "$(dirname "$jar")")" >&2
    cp="$cp:$jar"
  done
  printf '%s' "${cp#:}"
}

stale_harness() { # stale_harness <classesDir>; succeeds when a source is newer
  local src
  for src in "$HARNESS_DIR"/*.java; do
    [ -f "$1/$(basename "${src%.java}").class" ] || return 0
    [ "$src" -nt "$1/ElkOracle.class" ] && return 0
  done
  return 1
}

compile_harness() { # compile_harness <classpath> <classesDir>
  stale_harness "$2" || return 0
  mkdir -p "$2"
  javac -nowarn -encoding UTF-8 -cp "$1" -d "$2" "$HARNESS_DIR"/*.java
}

cleanup() {
  rm -rf "${WORK_DIR:-}"
}

oracle_java() { # oracle_java <timeoutMs> <args...>; runs the harness JVM
  local timeout="$1"
  shift
  local registry_opts=()
  [ "$ORACLE_REGISTRY" = core ] && registry_opts=(-Delk.oracle.registry=core)
  java -Delk.oracle.variants="$VARIANTS_FILE" -Delk.oracle.timeoutMs="$timeout" \
    -Dorg.eclipse.elk.graph.json.exportSeed="$EXPORT_SEED" \
    ${registry_opts[@]+"${registry_opts[@]}"} \
    -cp "$CLASSES:$CP" ElkOracle "$@"
}

run_cases() { # run_cases <cases.jsonl> <outDir>; restarts the JVM after a timeout
  local timeout="${ELK_SWEEP_TIMEOUT_MS:-$DEFAULT_TIMEOUT_MS}"
  local cur="$WORK_DIR/cases.cur" iter="$WORK_DIR/iter.out" rc overall=0 done_count
  case "$timeout" in '' | *[!0-9]*) die "ELK_SWEEP_TIMEOUT_MS must be a non-negative integer" ;; esac
  awk 'NF' "$1" >"$cur"
  while true; do
    rc=0
    oracle_java "$timeout" --cases "$cur" "$2" | tee "$iter" || rc=$?
    if [ "$rc" -eq "$EXIT_TIMEOUT" ]; then
      done_count="$(wc -l <"$iter")"
      tail -n +"$((done_count + 1))" "$cur" >"$cur.next"
      mv "$cur.next" "$cur"
      [ -s "$cur" ] || break
    elif [ "$rc" -eq 1 ]; then
      overall=1
      break
    else
      overall="$rc"
      break
    fi
  done
  return "$overall"
}

main() {
  CLASSES="$ELK_ORACLE_DIR/harness-classes"
  [ "$#" -ge 1 ] || die "usage: run.sh <outDir> <input>... | run.sh --cases <cases.jsonl> <outDir> | run.sh --list-algorithms | run.sh --list-options"
  case "$ORACLE_REGISTRY" in default | core) ;; *) die "ORACLE_REGISTRY must be default or core" ;; esac
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  CP="$(build_classpath)"
  compile_harness "$CP" "$CLASSES"
  case "${1:-}" in
    --list-algorithms)
      [ "$#" -eq 1 ] || die "--list-algorithms takes no arguments"
      oracle_java 0 --list-algorithms
      ;;
    --list-options)
      [ "$#" -eq 1 ] || die "--list-options takes no arguments"
      oracle_java 0 --list-options
      ;;
    --cases)
      [ "$#" -eq 3 ] || die "usage: run.sh --cases <cases.jsonl> <outDir>"
      WORK_DIR="$(mktemp -d)"
      trap cleanup EXIT
      run_cases "$2" "$3"
      ;;
    *)
      [ "$#" -ge 2 ] || die "usage: run.sh <outDir> <input>... "
      oracle_java 0 "$@"
      ;;
  esac
}

main "$@"
