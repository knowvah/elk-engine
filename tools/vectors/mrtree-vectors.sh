#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# ORIGIN: tools/vectors/layered-compound-vectors.sh
# Records the JVM behaviour of org.eclipse.elk.alg.mrtree (mission 8a, T1, TR1-TR3, AD-13): the whole TreeLayoutProvider pipeline
# (import, components split, each processor/phase of MrTree's assembled list, components pack, applyLayout) plus the engine result.
# Runs tools/vectors/MrTreeVectors.java as a single-file source program against the source-built oracle jars (AD-3) plus the
# third-party bundles graph.text needs, invoked as
#   java -cp <classpath> MrTreeVectors.java <outDir> <tools/vectors dir>
# and writes <outDir>/mrtree.json, <outDir>/mrtree-extra.json and <outDir>/mrtree-extra2.json itself, in that order (the
# landed copies live in test/golden/refs/java). MRTREE_FILE=main|extra|extra2 writes one of them.
# Usage: mrtree-vectors.sh <outDir>
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle) and P2_BUNDLES. Before every run the SHA-256 table embedded in the
# program (the generated corpus input under test/corpus/generated) is checked against the files on disk. Results are cached by
# salted input hash under $ELK_ORACLE_DIR/vector-cache/mrtree/ (vector-cache.sh); ELK_VECTORS_CACHE=off runs cold.
# Diagnosis aid: MRTREE_STATS=1 prints per-step change counts on stderr.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
PROGRAM="$VECTORS_DIR/MrTreeVectors.java"
# Same list as elkt-vectors.sh (the .elkt loader needs the Xtext standalone setup and Guice).
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
    echo "using $bsn $(basename "$(dirname "$jar")")" >&2
    cp="$cp:$jar"
  done
  printf '%s' "$cp"
}

check_models() { # every "<sha256>  repo:<path>" line of the program's table must match the file on disk
  local sha key path actual bad=""
  while read -r sha key; do
    path="$ROOT/${key#repo:}"
    if [ ! -f "$path" ]; then
      bad="$bad missing:$path"
      continue
    fi
    actual="$(shasum -a 256 "$path" | cut -d' ' -f1)"
    [ "$actual" = "$sha" ] || bad="$bad changed:$path"
  done < <(grep -E '^[[:space:]]*[0-9a-f]{64}  repo:' "$PROGRAM" | tr -s ' ')
  [ -z "$bad" ] || die "model files do not match the table in $(basename "$PROGRAM"):$bad"
}

# ELK iterates identity-hashed collections in a run-dependent order; a constant identity hash makes them iterate in
# insertion order (the AD-10 convention). The program refuses to run without it. The flag is not part of the cache
# salt, but this script is. Why: the "Identity hashes" paragraph in the header of MrTreeVectors.java.
# -XX:-OmitStackTraceInFastThrow keeps the top frame of a repeated NullPointerException.
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }-XX:+UnlockExperimentalVMOptions -XX:hashCode=2 -XX:-OmitStackTraceInFastThrow"

main() {
  [ "$#" -eq 1 ] || die "usage: mrtree-vectors.sh <outDir>"
  check_models
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built cp rc=0
  pinned="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  built="$(oracle_field commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
  cp="$(build_classpath)"
  mkdir -p "$1"
  vc_init mrtree
  vc_run "$VECTORS_DIR/mrtree-vectors.sh" "$cp" "$PROGRAM" "$1" || rc=$?
  [ "$rc" -eq 0 ] || die "$(basename "$PROGRAM") failed (exit $rc)"
}

main "$@"
