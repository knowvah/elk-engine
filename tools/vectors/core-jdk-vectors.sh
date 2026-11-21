#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the JVM reference vectors for the pure-JDK classes org.eclipse.elk.core.comments uses (AD-9, AD-13) by
# running CoreJdkVectors.java on the reference JDK major, with no classpath and no extra JVM flag: the refs were
# recorded by the command in the program's header, and this script runs exactly that. Writes awt, regex, character,
# regex-boundary and stream-sum .json files into <outDir>.
# Usage: core-jdk-vectors.sh <outDir>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
JDK_MAJOR=21

die() {
  echo "error: $1" >&2
  exit 1
}

main() {
  [ "$#" -eq 1 ] || die "usage: core-jdk-vectors.sh <outDir>"
  local version
  version="$(java -XshowSettings:properties -version 2>&1 | sed -n 's/^ *java\.version = //p')"
  [ "${version%%.*}" = "$JDK_MAJOR" ] || die "java is ${version:-unknown}, vectors need JDK $JDK_MAJOR"
  java "$VECTORS_DIR/CoreJdkVectors.java" "$1"
}

main "$@"
