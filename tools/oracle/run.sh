#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Lays out ELK JSON graphs with the source-built oracle (AD-3).
# Usage: run.sh <outDir> <input.json>...
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HARNESS="$ROOT/tools/oracle/harness/ElkOracle.java"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
# Third-party bundles named by Require-Bundle in the in-scope manifests, plus
# Guava's failureaccess companion (not a Require-Bundle entry).
THIRD_PARTY=(com.google.gson com.google.guava com.google.guava.failureaccess
  org.eclipse.emf.common org.eclipse.emf.ecore org.eclipse.emf.ecore.xmi
  org.eclipse.xtext.xbase.lib org.eclipse.xtend.lib org.eclipse.xtend.lib.macro)

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

compile_harness() { # compile_harness <classpath> <classesDir>
  local class="$2/ElkOracle.class"
  if [ -f "$class" ] && [ ! "$HARNESS" -nt "$class" ]; then
    return 0
  fi
  mkdir -p "$2"
  javac -nowarn -encoding UTF-8 -cp "$1" -d "$2" "$HARNESS"
}

main() {
  local classes="$ELK_ORACLE_DIR/harness-classes" cp
  [ "$#" -ge 2 ] || die "usage: run.sh <outDir> <input.json>..."
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  cp="$(build_classpath)"
  compile_harness "$cp" "$classes"
  exec java -cp "$classes:$cp" ElkOracle "$@"
}

main "$@"
