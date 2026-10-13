#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the layout metadata the oracle's generated *Options / *MetaDataProvider
# classes register (AD-13, C4) by running MetaDataVectors.java against every jar of
# the source-built oracle (AD-3) plus the third-party bundles they need from the p2
# cache. Writes <outDir>/metadata.json.
# Usage: metadata-vectors.sh <outDir>
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle) and P2_BUNDLES.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
# Require-Bundle of the oracle bundles on the classpath (EMF ecore, Guava) plus companions.
THIRD_PARTY=(org.eclipse.emf.common org.eclipse.emf.ecore com.google.guava
  com.google.guava.failureaccess org.eclipse.xtext.xbase.lib)

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
  [ "$#" -eq 1 ] || die "usage: metadata-vectors.sh <outDir>"
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built
  pinned="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  built="$(oracle_field commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
  java -cp "$(build_classpath)" "$VECTORS_DIR/MetaDataVectors.java" "$1"
}

main "$@"
