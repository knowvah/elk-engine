#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the ElkGraph model's JVM behaviour (AD-13) by running GraphVectors.java
# against the source-built oracle's org.eclipse.elk.graph jar (AD-3) plus EMF and
# Guava from the p2 cache. Writes <outDir>/graph.json.
# Usage: graph-vectors.sh <outDir>
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle) and P2_BUNDLES.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
GRAPH_BUNDLE=org.eclipse.elk.graph
# Require-Bundle of org.eclipse.elk.graph (EMF ecore, Guava) plus their companions.
THIRD_PARTY=(org.eclipse.emf.common org.eclipse.emf.ecore com.google.guava
  com.google.guava.failureaccess)

die() {
  echo "error: $1" >&2
  exit 1
}

oracle_field() { # oracle_field <commit|graphJar>; reads oracle-build.json
  node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    console.log(process.argv[2] === "commit" ? m.commit : m.jars[process.argv[3]] || "");
  ' "$ELK_ORACLE_DIR/oracle-build.json" "$1" "$GRAPH_BUNDLE"
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
  local cp jar bsn
  cp="$(oracle_field graphJar)"
  [ -n "$cp" ] || die "$GRAPH_BUNDLE missing from $ELK_ORACLE_DIR/oracle-build.json"
  [ -f "$cp" ] || die "oracle jar missing: $cp (run tools/oracle/build.sh)"
  for bsn in "${THIRD_PARTY[@]}"; do
    jar="$(newest_jar "$bsn")" || die "bundle $bsn not in p2 cache $P2_BUNDLES"
    echo "using $bsn $(basename "$(dirname "$jar")")" >&2
    cp="$cp:$jar"
  done
  printf '%s' "$cp"
}

main() {
  [ "$#" -eq 1 ] || die "usage: graph-vectors.sh <outDir>"
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built
  pinned="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  built="$(oracle_field commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
  java -cp "$(build_classpath)" "$VECTORS_DIR/GraphVectors.java" "$1" "$VECTORS_DIR/graph-scenarios.txt"
}

main "$@"
