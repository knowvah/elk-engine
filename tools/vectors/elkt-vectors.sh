#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the JVM behaviour of the .elkt language (graph-text mission, AD-13, G6/G7): runs every
# tools/vectors/Elkt*Vectors.java (sorted) as a single-file source program against the source-built
# oracle jars (AD-3) plus the Xtext standalone third-party bundles. Each program is invoked as
#   java -cp <classpath> <program> <outDir> <tools/vectors dir>
# and writes <outDir>/graph-text-<x>.json itself (ElktLexerVectors -> graph-text-lexer.json, ...).
# Usage: elkt-vectors.sh <outDir>
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle) and P2_BUNDLES. ELKT_VECTORS_LIST=1 prints the
# programs that would run (sorted) and exits without running them.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
XTEXT_BUNDLE=org.eclipse.xtext
XTEXT_VERSION=2.36.0
# Same list as tools/oracle/run.sh THIRD_PARTY (Xtext standalone setup needs Guice and its companions).
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

programs() { # one Elkt*Vectors.java path per line, sorted (C locale: byte order)
  local f
  for f in $(LC_ALL=C find "$VECTORS_DIR" -maxdepth 1 -name 'Elkt*Vectors.java' | LC_ALL=C sort); do
    echo "$f"
  done
}

check_xtext_version() {
  local dir
  dir="$(basename "$(dirname "$(newest_jar "$XTEXT_BUNDLE")")")"
  case "$dir" in
    "$XTEXT_VERSION" | "$XTEXT_VERSION".*) ;;
    *) die "xtext $dir in the p2 cache, expected $XTEXT_VERSION" ;;
  esac
}

main() {
  [ "$#" -eq 1 ] || die "usage: elkt-vectors.sh <outDir>"
  if [ "${ELKT_VECTORS_LIST:-}" = 1 ]; then
    programs
    return 0
  fi
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built cp program rc
  pinned="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  built="$(oracle_field commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
  check_xtext_version
  cp="$(build_classpath)"
  mkdir -p "$1"
  while IFS= read -r program; do
    [ -n "$program" ] || continue
    echo "running $(basename "$program")" >&2
    rc=0
    java -cp "$cp" "$program" "$1" "$VECTORS_DIR" || rc=$?
    [ "$rc" -eq 0 ] || die "$(basename "$program") failed (exit $rc)"
  done < <(programs)
}

main "$@"
