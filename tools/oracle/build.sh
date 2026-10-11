#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Builds upstream ELK from source in a detached worktree (AD-3).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ORACLE_TOOLS="$ROOT/tools/oracle"
ELK_SOURCE_DIR="${ELK_SOURCE_DIR:-$ROOT/../elk}"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
BUILD_LOG="$ROOT/.oracle-build.log"
EXIT_PRECONDITION=1
EXIT_STALE=2
# Tycho 4.0.12 fails to start on Maven 3.10 (Guice: "No implementation for
# MavenTargetLocationFactory"); it needs the 3.9 series.
MAVEN_SERIES="3.9"
MVN="${ELK_MVN:-mvn}"
GIT_IDENT=(-c user.name=elk-engine-oracle -c user.email=oracle@invalid)
# In-scope bundles, org.eclipse.elk. prefix omitted (decisions.md).
BUNDLES=(core graph graph.json alg.common alg.layered alg.mrtree alg.radial
  alg.force alg.disco alg.rectpacking alg.spore alg.topdownpacking
  alg.vertiflex)
# Build outputs ELK does not fully gitignore.
OUTPUT_FILTER='(^|/)(target|xtend-gen|src-gen)/|oracle-build\.json$'

abs_path() { # abs_path <path>; normalizes, parent dir must exist
  (cd "$(dirname "$1")" 2>/dev/null && echo "$PWD/$(basename "$1")") || echo "$1"
}

die() { # die <exit-code> <message>
  echo "error: $2" >&2
  exit "$1"
}

check_tools() {
  local tool version
  for tool in git java "$MVN"; do
    command -v "$tool" >/dev/null 2>&1 ||
      die "$EXIT_PRECONDITION" "'$tool' not found on PATH; install it (Maven $MAVEN_SERIES.x and JDK 21, e.g. brew install maven openjdk@21); set ELK_MVN to a specific mvn"
  done
  version="$("$MVN" -v | sed -n '1s/^Apache Maven \([0-9][0-9.]*\).*/\1/p')"
  case "$version" in
    "$MAVEN_SERIES".*) ;;
    *) die "$EXIT_PRECONDITION" "Maven $MAVEN_SERIES.x required (Tycho 4.0.12 breaks on 3.10), found '${version:-unknown}'; set ELK_MVN to a 3.9 mvn" ;;
  esac
}

check_source() {
  git -C "$ELK_SOURCE_DIR" rev-parse --git-dir >/dev/null 2>&1 ||
    die "$EXIT_PRECONDITION" "ELK_SOURCE_DIR is not a git repo: $ELK_SOURCE_DIR"
  git -C "$ELK_SOURCE_DIR" cat-file -e "${COMMIT}^{commit}" 2>/dev/null ||
    die "$EXIT_PRECONDITION" "commit $COMMIT not found in $ELK_SOURCE_DIR"
}

patch_files() {
  local f
  for f in "$ORACLE_TOOLS"/patches/*.patch; do
    [ -e "$f" ] && echo "$f"
  done
  return 0
}

patch_subjects() {
  local f
  while IFS= read -r f; do
    sed -n '/^Subject: /{s/^Subject: \(\[[^]]*\] \)\{0,1\}//p;q;}' "$f"
  done < <(patch_files)
}

create_worktree() {
  local f
  echo "creating worktree $ELK_ORACLE_DIR at $COMMIT"
  git -C "$ELK_SOURCE_DIR" worktree add --detach "$ELK_ORACLE_DIR" "$COMMIT"
  # Per-patch loop keeps this bash 3.2 safe (no mapfile, no empty arrays).
  while IFS= read -r f; do
    git "${GIT_IDENT[@]}" -C "$ELK_ORACLE_DIR" am --3way "$f"
  done < <(patch_files)
}

stale() {
  echo "oracle worktree out of date; remove with \`git -C $ELK_SOURCE_DIR worktree remove $ELK_ORACLE_DIR\`" >&2
  exit "$EXIT_STALE"
}

verify_worktree() {
  local common source_common expected actual dirty
  common="$(git -C "$ELK_ORACLE_DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || stale
  source_common="$(git -C "$ELK_SOURCE_DIR" rev-parse --path-format=absolute --git-common-dir)"
  [ "$common" = "$source_common" ] || stale
  git -C "$ELK_ORACLE_DIR" merge-base --is-ancestor "$COMMIT" HEAD || stale
  expected="$(patch_subjects)"
  actual="$(git -C "$ELK_ORACLE_DIR" log --reverse --format=%s "$COMMIT..HEAD")"
  [ "$expected" = "$actual" ] || stale
  dirty="$(git -C "$ELK_ORACLE_DIR" status --porcelain | grep -Ev "$OUTPUT_FILTER" || true)"
  [ -z "$dirty" ] || stale
  echo "existing oracle worktree verified"
}

run_maven() {
  (
    cd "$ELK_ORACLE_DIR/build"
    export MAVEN_OPTS="${MAVEN_OPTS:--Xmx3g}"
    "$MVN" -B --no-transfer-progress -P elk-meta clean install -DskipTests
    "$MVN" -B --no-transfer-progress clean install -DskipTests -Dmaven.test.skip=true
  ) 2>&1 | tee "$BUILD_LOG"
}

find_jar() { # find_jar <bundle>; prints the Tycho-built bundle jar
  local dir="$ELK_ORACLE_DIR/plugins/org.eclipse.elk.$1/target" f
  for f in "$dir"/org.eclipse.elk."$1"-*.jar; do
    case "$f" in *-sources.jar | *-javadoc.jar) continue ;; esac
    [ -f "$f" ] && { echo "$f"; return 0; }
  done
  return 1
}

patches_json() {
  local f out=""
  while IFS= read -r f; do
    out+="${out:+,}\"$(basename "$f")\""
  done < <(patch_files)
  printf '%s' "$out"
}

jars_json() {
  local b jar out="" missing=0
  for b in "${BUNDLES[@]}"; do
    if jar="$(find_jar "$b")"; then
      out+="${out:+,}\"org.eclipse.elk.$b\":\"$jar\""
    else
      echo "error: no jar built for org.eclipse.elk.$b" >&2
      missing=1
    fi
  done
  [ "$missing" -eq 0 ] || return 3
  printf '%s' "$out"
}

write_manifest() {
  local jdk jars patches
  jars="$(jars_json)" || exit 3
  patches="$(patches_json)"
  jdk="$(java -version 2>&1 | head -n1)"
  printf '{"commit":"%s","patches":[%s],"jdk":"%s","builtAt":"%s","jars":{%s}}\n' \
    "$COMMIT" "$patches" "${jdk//\"/\\\"}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$jars" \
    >"$ELK_ORACLE_DIR/oracle-build.json"
}

main() {
  local start="$SECONDS"
  ELK_SOURCE_DIR="$(abs_path "$ELK_SOURCE_DIR")"
  ELK_ORACLE_DIR="$(abs_path "$ELK_ORACLE_DIR")"
  COMMIT="$(tr -d '[:space:]' <"$ORACLE_TOOLS/ELK_COMMIT")"
  echo "repo root:   $ROOT"
  echo "ELK source:  $ELK_SOURCE_DIR"
  echo "ELK oracle:  $ELK_ORACLE_DIR"
  check_tools
  check_source
  if [ -e "$ELK_ORACLE_DIR" ]; then verify_worktree; else create_worktree; fi
  run_maven
  write_manifest
  echo "oracle build OK in $((SECONDS - start))s (exit 0)"
}

main "$@"
