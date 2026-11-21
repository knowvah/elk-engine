#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the Guava 33.3.0-jre behaviour src/guava relies on (AD-9, AD-13) by running GuavaVectors.java against the
# Guava and failureaccess bundles in the p2 cache, after checking the oracle was built from the pinned ELK commit
# (AD-3: the p2 cache is the oracle build's) and that the bundles are exactly the versions the ref was recorded with.
# No extra JVM flag: the ref was recorded by the command in the program's header, and this script runs exactly that.
# Writes <outDir>/guava.json.
# Usage: guava-vectors.sh <outDir>
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle) and P2_BUNDLES.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
GUAVA_BUNDLE=com.google.guava
# The OSGi Bundle-Version of Maven's 33.3.0-jre, the version GuavaVectors.java prints.
GUAVA_VERSION=33.3.0.jre
FAILUREACCESS_BUNDLE=com.google.guava.failureaccess
FAILUREACCESS_VERSION=1.0.2

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

pinned_jar() { # pinned_jar <bsn> <version>; the bundle's jar, or die unless it is exactly that version
  local jar version
  jar="$(newest_jar "$1")" || die "bundle $1 not in p2 cache $P2_BUNDLES"
  version="$(jar_version "$jar")"
  [ "$version" = "$2" ] || die "$jar is $1 $version, vectors need $2"
  echo "using $1 $version" >&2
  echo "$jar"
}

main() {
  [ "$#" -eq 1 ] || die "usage: guava-vectors.sh <outDir>"
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built guava failureaccess
  pinned="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  built="$(oracle_commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
  guava="$(pinned_jar "$GUAVA_BUNDLE" "$GUAVA_VERSION")"
  failureaccess="$(pinned_jar "$FAILUREACCESS_BUNDLE" "$FAILUREACCESS_VERSION")"
  java -cp "$guava:$failureaccess" "$VECTORS_DIR/GuavaVectors.java" "$1"
}

main "$@"
