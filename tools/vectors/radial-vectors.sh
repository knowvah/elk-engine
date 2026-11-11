#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the JVM behaviour of org.eclipse.elk.alg.radial (mission 8a, T2, TR1-TR3, AD-13): the RadialLayoutProvider steps and
# the recursive engine result for designed tree scenarios. Runs tools/vectors/RadialVectors.java as a single-file source program
# against the source-built oracle jars (AD-3) plus the third-party bundles the ELK JSON importer needs. The program is invoked as
#   java -cp <classpath> RadialVectors.java <outDir> <tools/vectors dir>
# and writes <outDir>/radial.json itself (the landed copy lives in test/golden/refs/java/radial.json).
# Usage: radial-vectors.sh <outDir>              the pinned recording (cached by salted input hash, vector-cache.sh)
#        radial-vectors.sh --unpinned <outDir>   TR3 evidence run: no -XX:hashCode=2, no cache, no self-checks; never committed
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle), P2_BUNDLES and ELK_VECTORS_CACHE=off. The cache salt does not cover the
# corpus input the program reads (test/corpus/generated/radial-tree-small.json), so before every run this script checks the
# SHA-256 table embedded in the program against the file on disk.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
PROGRAM="$VECTORS_DIR/RadialVectors.java"
THIRD_PARTY=(com.google.gson com.google.guava com.google.guava.failureaccess
  org.eclipse.emf.common org.eclipse.emf.ecore org.eclipse.emf.ecore.xmi
  org.eclipse.xtext.xbase.lib org.eclipse.xtend.lib org.eclipse.xtend.lib.macro
  org.eclipse.xtext org.eclipse.xtext.util)

die() {
  echo "error: $1" >&2
  exit 1
}

# shellcheck source=tools/vectors/vector-cache.sh
. "$VECTORS_DIR/vector-cache.sh"

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
    cp="$cp:$jar"
  done
  printf '%s' "$cp"
}

check_inputs() { # every "// <sha256>  repo:<path>" line of the program's table must match the file on disk
  local sha key path actual bad=""
  while read -r sha key; do
    path="$ROOT/${key#repo:}"
    if [ ! -f "$path" ]; then
      bad="$bad missing:$path"
      continue
    fi
    actual="$(shasum -a 256 "$path" | cut -d' ' -f1)"
    [ "$actual" = "$sha" ] || bad="$bad changed:$path"
  done < <(grep -E '^[[:space:]]*//[[:space:]]+[0-9a-f]{64}  repo:' "$PROGRAM" | sed -E 's#^[[:space:]]*//[[:space:]]+##' | tr -s ' ')
  [ -z "$bad" ] || die "input files do not match the table in $(basename "$PROGRAM"):$bad"
}

main() {
  local unpinned=0
  if [ "${1:-}" = "--unpinned" ]; then
    unpinned=1
    shift
  fi
  [ "$#" -eq 1 ] || die "usage: radial-vectors.sh [--unpinned] <outDir>"
  check_inputs
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built cp rc=0
  pinned="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  built="$(oracle_field commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
  cp="$(build_classpath)"
  mkdir -p "$1"
  # ELK iterates identity-hashed collections in a run-dependent order; a constant identity hash makes them iterate in insertion
  # order (the AD-10 convention). The program refuses to run pinned-mode without it. -XX:-OmitStackTraceInFastThrow keeps the top
  # frame of a NullPointerException the oracle throws repeatedly. The flags are not part of the cache salt, but this script is.
  if [ "$unpinned" -eq 1 ]; then
    export RADIAL_UNPINNED=1
    export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }-XX:-OmitStackTraceInFastThrow"
    export ELK_VECTORS_CACHE=off
  else
    export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }-XX:+UnlockExperimentalVMOptions -XX:hashCode=2 -XX:-OmitStackTraceInFastThrow"
  fi
  vc_init radial
  vc_run "$VECTORS_DIR/radial-vectors.sh" "$cp" "$PROGRAM" "$1" || rc=$?
  [ "$rc" -eq 0 ] || die "$(basename "$PROGRAM") failed (exit $rc)"
}

main "$@"
