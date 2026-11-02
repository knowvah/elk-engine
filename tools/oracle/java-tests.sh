#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Runs JUnit 4 suites of ELK's test bundles against the source-built oracle (AD-3; mission 7c-tests, T2): the oracle
# jars of $ELK_ORACLE_DIR/oracle-build.json, the compiled classes of the layered and alg test bundles, the third-party
# bundles the vector scripts use plus the ones JUnit, Hamcrest, the Xtext standalone setup and Guice need at test time,
# and junit 4.13.2 from ~/.m2. Each class runs in its own JVM under -XX:hashCode=2 (constant identity hashes, the
# AD-10 convention the vector scripts use) and prints one line "<fqcn> runs=<n> failures=<n>"; the JUnitCore output of
# every class is kept under a temp dir whose path is printed when a class fails. The baseline the mission brief cites
# (plans/layered-crossing-min-tests/decisions.md#baseline) is this script over the fourteen crossing-minimization
# suites; 7d–7h reuse it for theirs.
# Usage: java-tests.sh <fully.qualified.TestClass>...
# Exit: 0 all classes passed; 1 usage, a missing bundle (named), a stale oracle, or a failing class.
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle), P2_BUNDLES (default ~/.m2/repository/p2/osgi/bundle) and
# M2_REPO (default ~/.m2/repository).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
M2_REPO="${M2_REPO:-$HOME/.m2/repository}"
JUNIT_VERSION=4.13.2
# The vector scripts' list (Xtext standalone setup and Guice) plus the test-time extras: the Eclipse runtime classes
# Guice and Xtext's standalone setup reference (OperationCanceledException), the xbase JVM type model, ASM, log4j 1.2
# (Xtext's standalone logger) and Hamcrest 3 (hamcrest-core 1.3 has no jar in the local Maven cache).
THIRD_PARTY=(com.google.gson com.google.guava com.google.guava.failureaccess
  org.eclipse.emf.common org.eclipse.emf.ecore org.eclipse.emf.ecore.xmi
  org.eclipse.xtext.xbase.lib org.eclipse.xtend.lib org.eclipse.xtend.lib.macro
  org.eclipse.xtext org.eclipse.xtext.xbase org.eclipse.xtext.util org.antlr.runtime
  com.google.inject jakarta.inject.jakarta.inject-api org.aopalliance
  org.apache.log4j org.eclipse.equinox.common
  org.eclipse.core.runtime org.eclipse.osgi org.eclipse.xtext.common.types org.objectweb.asm org.hamcrest)
# Compiled test bundles of the oracle worktree (built by tools/oracle/build.sh's Tycho run).
TEST_BUNDLES=(org.eclipse.elk.alg.layered.test org.eclipse.elk.alg.test)

die() {
  echo "error: $1" >&2
  exit 1
}

usage() {
  echo "usage: java-tests.sh <fully.qualified.TestClass>..." >&2
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

check_oracle() {
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  local pinned built
  pinned="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  built="$(oracle_field commit)"
  [ "$pinned" = "$built" ] || die "oracle built from $built, pinned commit is $pinned"
}

# Constant identity hashes: ELK iterates identity-hashed collections in insertion order under this flag (AD-10), which
# is what the TS port reproduces; the baseline counts are identical with and without it.
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }-XX:+UnlockExperimentalVMOptions -XX:hashCode=2"

# run_class <classpath> <logDir> <fqcn>: prints the count line; returns 1 when the class fails.
run_class() {
  local cp="$1" log="$2/$3.log" fqcn="$3" runs failures summary rc=0
  java -cp "$cp" org.junit.runner.JUnitCore "$fqcn" >"$log" 2>&1 || rc=$?
  if summary="$(grep -E '^OK \([0-9]+ tests?\)' "$log")"; then
    runs="$(sed -E 's/^OK \(([0-9]+) tests?\)/\1/' <<<"$summary")"
    failures=0
  elif summary="$(grep -E '^Tests run: [0-9]+, +Failures: [0-9]+' "$log")"; then
    runs="$(sed -E 's/^Tests run: ([0-9]+),.*/\1/' <<<"$summary")"
    failures="$(sed -E 's/.*Failures: ([0-9]+).*/\1/' <<<"$summary")"
  else
    echo "$fqcn runs=? failures=? (no JUnit summary; exit $rc; log $log)"
    return 1
  fi
  echo "$fqcn runs=$runs failures=$failures"
  if [ "$failures" -ne 0 ] || [ "$rc" -ne 0 ]; then
    echo "  log: $log" >&2
    return 1
  fi
}

main() {
  [ "$#" -ge 1 ] || usage
  check_oracle
  local cp tmp logdir fqcn failed=0
  cp="$(build_classpath)"
  tmp="${TMPDIR:-/tmp}"
  logdir="$(mktemp -d "${tmp%/}/elk-java-tests.XXXXXX")"
  for fqcn in "$@"; do
    run_class "$cp" "$logdir" "$fqcn" || failed=$((failed + 1))
  done
  [ "$failed" -eq 0 ] || die "$failed class(es) failed; logs under $logdir"
}

main "$@"
