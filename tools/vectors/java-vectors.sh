#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the JVM reference vectors for the TypeScript Java-runtime shims (AD-9, AD-13) by running JavaVectors.java
# with every identity hash pinned to 1 (-XX:hashCode=2, an experimental HotSpot flag). collections.json records
# HashMap/HashSet tree bins whose tie order comes from System.identityHashCode, and the single-file source launcher
# compiles in the recording JVM, so unpinned that order shifts with any edit to the recorder's source. Pinned, the
# output depends only on what the recorder does. Writes random, lang, numeric, hash, text, random-setseed and
# collections .json files into <outDir>.
# Usage: java-vectors.sh <outDir>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
JDK_MAJOR=21

die() {
  echo "error: $1" >&2
  exit 1
}

main() {
  [ "$#" -eq 1 ] || die "usage: java-vectors.sh <outDir>"
  local version
  version="$(java -XshowSettings:properties -version 2>&1 | sed -n 's/^ *java\.version = //p')"
  [ "${version%%.*}" = "$JDK_MAJOR" ] || die "java is ${version:-unknown}, vectors need JDK $JDK_MAJOR"
  java -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "$VECTORS_DIR/JavaVectors.java" "$1"
}

main "$@"
