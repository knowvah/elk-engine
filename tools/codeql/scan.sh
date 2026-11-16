#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# The CodeQL gate: runs the code-quality suites that GitHub Code Quality runs on pull requests, locally, over the Java
# recorders in tools/vectors and over the TypeScript, then fails on any finding tools/codeql/accepted.json does not
# accept (tools/codeql/check.ts). About four minutes. Query packs are pinned so a run is repeatable; bump them
# deliberately and re-triage.
#
#   npm run codeql            (or: bash tools/codeql/scan.sh)
#
# Needs the CodeQL CLI (macOS: brew install --cask codeql); the packs download on first use. The CLI's terms allow
# this repository (public, EPL-2.0). Databases and SARIF go to .codeql/ (gitignored).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${CODEQL_OUT:-$ROOT/.codeql}"
JAVA_SUITE="codeql/java-queries@1.12.0:codeql-suites/java-code-quality.qls"
JS_SUITE="codeql/javascript-queries@2.5.0:codeql-suites/javascript-code-quality.qls"

if ! command -v codeql >/dev/null 2>&1; then
  echo "error: codeql not found; install the CodeQL CLI (macOS: brew install --cask codeql)" >&2
  exit 2
fi

mkdir -p "$OUT"
scan() { # scan <name> <suite> <codeql database create args...>
  local name="$1" suite="$2"
  shift 2
  echo "codeql: $name database"
  codeql database create "$OUT/db-$name" --overwrite --source-root="$ROOT" "$@" >"$OUT/$name-db.log" 2>&1 ||
    { tail -20 "$OUT/$name-db.log" >&2; exit 2; }
  echo "codeql: $name analysis"
  codeql database analyze "$OUT/db-$name" "$suite" --download --format=sarif-latest --output="$OUT/$name.sarif" \
    >"$OUT/$name-analyze.log" 2>&1 || { tail -20 "$OUT/$name-analyze.log" >&2; exit 2; }
}

scan java "$JAVA_SUITE" --language=java --build-mode=none
scan js "$JS_SUITE" --language=javascript-typescript
cd "$ROOT"
npx tsx tools/codeql/check.ts tools/codeql/accepted.json "$OUT/java.sarif" "$OUT/js.sarif"
