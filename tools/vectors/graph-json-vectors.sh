#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the ELK Graph JSON adapter's JVM behaviour (AD-13, J4/J5/J8) by running
# GraphJsonVectors.java against every jar of the source-built oracle (AD-3, incl. patch
# 0001's export seed seam) plus Gson 2.11.0 and the other third-party bundles from the p2
# cache. Inputs: tools/vectors/graph-json-scenarios/. Writes <outDir>/graph-json.json.
# Usage: graph-json-vectors.sh <outDir>
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle) and P2_BUNDLES.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
GSON_BUNDLE=com.google.gson
GSON_VERSION=2.11.0
# Require-Bundle of the oracle bundles on the classpath (EMF ecore, Guava, xbase lib) plus companions.
THIRD_PARTY=(org.eclipse.emf.common org.eclipse.emf.ecore com.google.guava
  com.google.guava.failureaccess org.eclipse.xtext.xbase.lib "$GSON_BUNDLE")

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
    echo "using $bsn $(basename "$(dirname "$jar")")" >&2
    cp="$cp:$jar"
  done
  printf '%s' "$cp"
}

main() {
  [ "$#" -eq 1 ] || die "usage: graph-json-vectors.sh <outDir>"
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built gson
  pinned="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  built="$(oracle_field commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
  gson="$(basename "$(dirname "$(newest_jar "$GSON_BUNDLE")")")"
  [ "$gson" = "$GSON_VERSION" ] || die "gson $gson in the p2 cache, expected $GSON_VERSION"
  java -cp "$(build_classpath)" "$VECTORS_DIR/GraphJsonVectors.java" "$1" \
    "$VECTORS_DIR/graph-json-scenarios" "$GSON_VERSION"
}

main "$@"
