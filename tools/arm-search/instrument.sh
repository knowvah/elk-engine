#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Scratch instrumentation of the oracle for the arm search of issue #59 (plans/layered-arm-search D2). Java sources
# are copied OUT of the oracle worktree, logging lines are added to the copies, the copies are compiled, and the
# classes are put in front of the oracle jars on the classpath. The oracle worktree, its jars and $ELK_SOURCE_DIR are
# only read: nothing here is an oracle patch (AD-3), and no mode writes outside the directories it is given.
#
# Usage:
#   instrument.sh copy <srcDir> <source>...     copy sources into <srcDir> (keeps an existing copy). A <source> is a
#                                               fully qualified class name (org.eclipse.elk.alg.layered.p3order.Foo)
#                                               or a path below the oracle worktree (plugins/<bundle>/src/...java).
#                                               Copies land at <srcDir>/<bundle>/src/<package path>/<Class>.java.
#   instrument.sh diff <srcDir>                 print the unified diff of every copy against its oracle source
#                                               (a/ and b/ paths relative to <srcDir>): the committed .patch.
#   instrument.sh apply <srcDir> <patch>...     copy the sources each patch names, then apply it (patch -p1).
#   instrument.sh build <srcDir> <classesDir>   javac every copy against the oracle classpath into <classesDir>, and
#                                               print the classpath with <classesDir> first.
#   instrument.sh classpath                     print the oracle classpath (that of layered-order-vectors.sh).
#   instrument.sh probe <classesDir|-> <java argument>...
#                                               java -cp <classesDir>:<classpath> <java argument>... under nice -n 10,
#                                               with the recorders' JVM flags (-XX:hashCode=2) and -Delk.commit. For a
#                                               single-file probe of one graph ("-": no instrumented classes).
#   instrument.sh run <classesDir|-> <java argument>...
#                                               as probe, but first waits while the 1-minute load is above 12 (queue
#                                               rule for recorders and sweeps); exits 75 after ARM_SEARCH_LOAD_WAIT
#                                               seconds (default 480) of waiting.
# Examples (from the repository root):
#   instrument.sh run "$classes" tools/vectors/LayeredOrderVectors.java --sweep "$ELK_MODELS_DIR" "$scratch/order-sweep"
#   ORDER_FILTER=scenarios/ instrument.sh run "$classes" tools/vectors/LayeredOrderVectors.java "$scratch/out" tools/vectors
# Honours ELK_ORACLE_DIR (default <repo>/../elk-oracle) and P2_BUNDLES.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
P2_BUNDLES="${P2_BUNDLES:-$HOME/.m2/repository/p2/osgi/bundle}"
LOAD_LIMIT=12
LOAD_WAIT="${ARM_SEARCH_LOAD_WAIT:-480}"
LOAD_STEP=20
EXIT_USAGE=2
EXIT_BUSY=75
# Same list as tools/vectors/layered-order-vectors.sh.
THIRD_PARTY=(com.google.gson com.google.guava com.google.guava.failureaccess
  org.eclipse.emf.common org.eclipse.emf.ecore org.eclipse.emf.ecore.xmi
  org.eclipse.xtext.xbase.lib org.eclipse.xtend.lib org.eclipse.xtend.lib.macro
  org.eclipse.xtext org.eclipse.xtext.xbase org.eclipse.xtext.util org.antlr.runtime
  com.google.inject jakarta.inject.jakarta.inject-api org.aopalliance
  org.apache.log4j org.eclipse.equinox.common)
JVM_FLAGS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2 -XX:-OmitStackTraceInFastThrow"

die() {
  echo "error: $1" >&2
  exit 1
}

usage() {
  sed -n '8,27p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2
  exit "$EXIT_USAGE"
}

oracle_jars() { # every oracle jar, one per line
  node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    console.log(Object.values(m.jars).join("\n"));
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

build_classpath() {
  local cp="" jar bsn
  [ -f "$ELK_ORACLE_DIR/oracle-build.json" ] ||
    die "$ELK_ORACLE_DIR/oracle-build.json missing; run tools/oracle/build.sh"
  while IFS= read -r jar; do
    [ -f "$jar" ] || die "oracle jar missing: $jar (run tools/oracle/build.sh)"
    cp="${cp:+$cp:}$jar"
  done < <(oracle_jars)
  [ -n "$cp" ] || die "no jars in $ELK_ORACLE_DIR/oracle-build.json"
  for bsn in "${THIRD_PARTY[@]}"; do
    jar="$(newest_jar "$bsn")" || die "bundle $bsn not in p2 cache $P2_BUNDLES"
    cp="$cp:$jar"
  done
  printf '%s' "$cp"
}

oracle_path() { # oracle_path <source>; the path below the oracle worktree, plugins/<bundle>/src/<package path>.java
  local source="$1" rel hits
  case "$source" in
    plugins/*.java) rel="$source" ;;
    *)
      hits="$(cd "$ELK_ORACLE_DIR" && find plugins -path "plugins/*/src/${source//.//}.java" -not -path '*/target/*')"
      [ "$(printf '%s\n' "$hits" | grep -c .)" -eq 1 ] || die "$source names no single source under plugins/*/src: $hits"
      rel="$hits"
      ;;
  esac
  [ -f "$ELK_ORACLE_DIR/$rel" ] || die "no such oracle source: $rel"
  printf '%s' "$rel"
}

copy_sources() { # copy_sources <srcDir> <source>...
  local src_dir="$1" source rel
  shift
  for source in "$@"; do
    rel="$(oracle_path "$source")"
    rel="${rel#plugins/}"
    if [ -f "$src_dir/$rel" ]; then
      echo "kept $src_dir/$rel" >&2
      continue
    fi
    mkdir -p "$(dirname "$src_dir/$rel")"
    cp "$ELK_ORACLE_DIR/plugins/$rel" "$src_dir/$rel"
    echo "copied $src_dir/$rel" >&2
  done
}

copies() { # copies <srcDir>; the copied sources, relative to <srcDir>, C-locale order
  (cd "$1" && find . -type f -name '*.java' | sed 's|^\./||' | LC_ALL=C sort)
}

diff_sources() { # diff_sources <srcDir>
  local src_dir="$1" rel
  while IFS= read -r rel; do
    diff -u --label "a/$rel" --label "b/$rel" "$ELK_ORACLE_DIR/plugins/$rel" "$src_dir/$rel" || true
  done < <(copies "$src_dir")
}

apply_patches() { # apply_patches <srcDir> <patch>...
  local src_dir="$1" patch_file rel
  shift
  for patch_file in "$@"; do
    [ -f "$patch_file" ] || die "no such patch: $patch_file"
    while IFS= read -r rel; do
      copy_sources "$src_dir" "plugins/$rel"
    done < <(sed -n 's|^+++ b/\(.*\.java\)$|\1|p' "$patch_file")
    patch -s -p1 -d "$src_dir" <"$patch_file" || die "$patch_file does not apply to $src_dir"
  done
}

build_classes() { # build_classes <srcDir> <classesDir>; prints the classpath, <classesDir> first
  local src_dir="$1" classes="$2" cp rel sources=()
  cp="$(build_classpath)"
  while IFS= read -r rel; do
    sources+=("$src_dir/$rel")
  done < <(copies "$src_dir")
  [ "${#sources[@]}" -gt 0 ] || die "no copied source under $src_dir"
  mkdir -p "$classes"
  javac -encoding UTF-8 -proc:none -nowarn -cp "$cp" -d "$classes" "${sources[@]}" >&2 ||
    die "javac failed on the copies under $src_dir"
  printf '%s:%s\n' "$classes" "$cp"
}

wait_for_load() { # the queue rule: no JVM sweep or recorder starts while the 1-minute load is above LOAD_LIMIT
  local waited=0 load
  while :; do
    load="$(sysctl -n vm.loadavg 2>/dev/null | awk '{ print $2 }')"
    [ -n "$load" ] || load="$(uptime | sed 's/.*load averages\{0,1\}: *//' | awk '{ print $1 }' | tr -d ,)"
    if awk -v l="$load" -v m="$LOAD_LIMIT" 'BEGIN { exit !(l <= m) }'; then
      return 0
    fi
    if [ "$waited" -ge "$LOAD_WAIT" ]; then
      echo "error: load $load still above $LOAD_LIMIT after ${waited}s" >&2
      return "$EXIT_BUSY"
    fi
    sleep "$LOAD_STEP"
    waited=$((waited + LOAD_STEP))
  done
}

run_java() { # run_java <classesDir|-> <java argument>...
  local classes="$1" cp commit
  shift
  cp="$(build_classpath)"
  [ "$classes" = - ] || cp="$classes:$cp"
  commit="$(tr -d '[:space:]' <"$ROOT/tools/oracle/ELK_COMMIT")"
  JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }$JVM_FLAGS" \
    exec nice -n 10 java -Delk.commit="$commit" -cp "$cp" "$@"
}

main() {
  local mode="${1:-}"
  [ "$#" -gt 0 ] && shift
  case "$mode" in
    copy) [ "$#" -ge 2 ] || usage; copy_sources "$@" ;;
    diff) [ "$#" -eq 1 ] || usage; diff_sources "$1" ;;
    apply) [ "$#" -ge 2 ] || usage; apply_patches "$@" ;;
    build) [ "$#" -eq 2 ] || usage; build_classes "$1" "$2" ;;
    classpath) [ "$#" -eq 0 ] || usage; build_classpath; echo ;;
    probe) [ "$#" -ge 2 ] || usage; run_java "$@" ;;
    run) [ "$#" -ge 2 ] || usage; wait_for_load; run_java "$@" ;;
    *) usage ;;
  esac
}

main "$@"
