#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records how the JUnit test framework sizes labels (mission text-sizing-seam; decisions TX3, TX4, TX6, TX7) by running
# LabelSizingVectors.java against the source-built oracle (AD-3) with oracle patch 0003 (pluggable label text measurer).
# Sizing goes through the real TestConfiguration.apply of org.eclipse.elk.alg.test; the measurer is chosen by the property
# org.eclipse.elk.alg.test.textMeasurer, which this script sets.
# Usage: label-sizing-vectors.sh <outDir>                        fixed measurer -> <outDir>/label-sizing.json
#        label-sizing-vectors.sh --corpus <modelsDir> <outDir>   fixed measurer -> <outDir>/label-sizing-corpus.json
#        label-sizing-vectors.sh --remeasure-awt <outDir>        property unset (AWT) -> <outDir>/awt-remeasure.json
# Refuses to run unless `uname -sm` is "Darwin arm64" and the JDK is 21.0.1 (the reference platform, #52), and unless the
# oracle was built from the pinned commit with patch 0003. The classpath is the one of tools/oracle/java-tests.sh.
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle), P2_BUNDLES and M2_REPO.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
M2_REPO="${M2_REPO:-$HOME/.m2/repository}"
JUNIT_VERSION=4.13.2
REFERENCE_PLATFORM="Darwin arm64"
REFERENCE_JDK="21.0.1"
PATCH_0003="0003-alg.test-pluggable-label-text-measurer.patch"
MEASURER_PROPERTY="org.eclipse.elk.alg.test.textMeasurer"
# Same list as tools/oracle/java-tests.sh.
THIRD_PARTY=(com.google.gson com.google.guava com.google.guava.failureaccess
  org.eclipse.emf.common org.eclipse.emf.ecore org.eclipse.emf.ecore.xmi
  org.eclipse.xtext.xbase.lib org.eclipse.xtend.lib org.eclipse.xtend.lib.macro
  org.eclipse.xtext org.eclipse.xtext.xbase org.eclipse.xtext.util org.antlr.runtime
  com.google.inject jakarta.inject.jakarta.inject-api org.aopalliance
  org.apache.log4j org.eclipse.equinox.common
  org.eclipse.core.runtime org.eclipse.osgi org.eclipse.xtext.common.types org.objectweb.asm org.hamcrest)
TEST_BUNDLES=(org.eclipse.elk.alg.layered.test org.eclipse.elk.alg.test)

die() {
  echo "error: $1" >&2
  exit 1
}

usage() {
  echo "usage: label-sizing-vectors.sh <outDir> | --corpus <modelsDir> <outDir> | --remeasure-awt <outDir>" >&2
  exit 1
}

oracle_field() { # oracle_field <commit|jars|patches>; jars and patches = one per line
  node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const f = process.argv[2];
    console.log(f === "commit" ? m.commit : f === "patches" ? m.patches.join("\n") : Object.values(m.jars).join("\n"));
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

check_platform() {
  [ "$(uname -sm)" = "$REFERENCE_PLATFORM" ] || die "platform is $(uname -sm), the reference platform is $REFERENCE_PLATFORM"
  java -version 2>&1 | grep -q "\"$REFERENCE_JDK\"" || die "java is not $REFERENCE_JDK (the reference JDK)"
}

check_oracle() {
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] || die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built
  pinned="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  built="$(oracle_field commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
  oracle_field patches | grep -qx "$PATCH_0003" || die "oracle was built without $PATCH_0003"
}

build_classpath() {
  local cp="" jar bsn dir
  while IFS= read -r jar; do
    [ -f "$jar" ] || die "oracle jar missing: $jar (run tools/oracle/build.sh)"
    cp="${cp:+$cp:}$jar"
  done < <(oracle_field jars)
  [ -n "$cp" ] || die "no jars in $ELK_ORACLE_DIR/oracle-build.json"
  for bsn in "${TEST_BUNDLES[@]}"; do
    dir="$ELK_ORACLE_DIR/test/$bsn/target/classes"
    [ -d "$dir" ] || die "test bundle classes missing: $dir (run tools/oracle/build.sh)"
    cp="$cp:$dir"
  done
  for bsn in "${THIRD_PARTY[@]}"; do
    jar="$(newest_jar "$bsn")" || die "bundle $bsn not in p2 cache $P2_BUNDLES"
    cp="$cp:$jar"
  done
  jar="$M2_REPO/junit/junit/$JUNIT_VERSION/junit-$JUNIT_VERSION.jar"
  [ -f "$jar" ] || die "junit $JUNIT_VERSION not in $M2_REPO"
  printf '%s' "$cp:$jar"
}

# run_program <mode> <measurer|-> <outDir> [modelsDir]: measurer "-" leaves the property unset (AWT).
run_program() {
  local mode="$1" measurer="$2" out="$3" models="${4:-}" cp
  local -a props=(-Djava.awt.headless=true) extra=()
  [ "$measurer" = "-" ] || props+=("-D$MEASURER_PROPERTY=$measurer")
  [ -z "$models" ] || extra+=("$models")
  cp="$(build_classpath)"
  # Constant identity hashes (AD-10), as tools/oracle/java-tests.sh does.
  export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }-XX:+UnlockExperimentalVMOptions -XX:hashCode=2"
  java -cp "$cp" "${props[@]}" "$VECTORS_DIR/LabelSizingVectors.java" "$mode" "$ROOT" "$out" ${extra[@]+"${extra[@]}"}
}

main() {
  check_platform
  check_oracle
  case "${1:-}" in
    --corpus)
      [ "$#" -eq 3 ] || usage
      run_program corpus fixed "$3" "$2"
      ;;
    --remeasure-awt)
      [ "$#" -eq 2 ] || usage
      run_program awt - "$2"
      ;;
    "" | -*) usage ;;
    *)
      [ "$#" -eq 1 ] || usage
      run_program vendored fixed "$1"
      ;;
  esac
}

main "$@"
