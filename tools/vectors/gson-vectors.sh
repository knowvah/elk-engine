#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the Gson 2.11.0 behaviour graph.json relies on (AD-13, J1) by running GsonVectors.java
# against the Gson bundle in the p2 cache, after checking the oracle was built from the pinned ELK
# commit (AD-3) and that the bundle is exactly Gson 2.11.0. Writes <outDir>/gson.json.
# Usage: gson-vectors.sh <outDir>
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle) and P2_BUNDLES.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
GSON_BUNDLE=com.google.gson
GSON_VERSION=2.11.0

die() {
  echo "error: $1" >&2
  exit 1
}

oracle_commit() {
  node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    console.log(m.commit);
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

jar_version() { # jar_version <jar>; Bundle-Version from the manifest
  unzip -p "$1" META-INF/MANIFEST.MF | tr -d '\r' | sed -n 's/^Bundle-Version: *//p'
}

main() {
  [ "$#" -eq 1 ] || die "usage: gson-vectors.sh <outDir>"
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built jar version
  pinned="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  built="$(oracle_commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
  jar="$(newest_jar "$GSON_BUNDLE")" || die "bundle $GSON_BUNDLE not in p2 cache $P2_BUNDLES"
  version="$(jar_version "$jar")"
  [ "$version" = "$GSON_VERSION" ] || die "$jar is Gson $version, vectors need $GSON_VERSION"
  echo "using $GSON_BUNDLE $version" >&2
  java -cp "$jar" "$VECTORS_DIR/GsonVectors.java" "$1" "$version" "$VECTORS_DIR/gson-cases.txt"
}

main "$@"
