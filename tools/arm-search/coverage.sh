#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Counts how often the landed evidence takes each of the 25 arms of issue #59 (tools/arm-search/arms.json): one
# `vitest run --coverage` (v8, JSON reporter, no thresholds, a scratch reports directory) over the arm files only,
# then tools/arm-search/arm-counts.mjs.
# Usage: coverage.sh [<vitest test file or filter>...]
# Without arguments the tests are the runs A, B1 and B2 of plans/layered-compound/unreached.md § Measurement together:
# every src/alg/layered/Layered*Vectors.test.ts, LayeredCompoundSites and LayeredCompoundTwins, the two layered golden
# suites and every ported JUnit suite src/alg/layered/**/*Test.test.ts.
# ARM_SEARCH_DIR (default $TMPDIR/layered-arm-search) holds the scratch output; the script prints the report path.
# A vitest argument (such as -t <title>) may follow the test files; everything is passed through.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HERE="$ROOT/tools/arm-search"
SCRATCH="${ARM_SEARCH_DIR:-${TMPDIR:-/tmp}/layered-arm-search}"

cd "$ROOT"
tests=("$@")
if [ "${#tests[@]}" -eq 0 ]; then
  while IFS= read -r file; do
    tests+=("$file")
  done < <(
    {
      find src/alg/layered -maxdepth 1 -name 'Layered*Vectors.test.ts'
      echo src/alg/layered/LayeredCompoundSites.test.ts
      echo src/alg/layered/LayeredCompoundTwins.test.ts
      echo test/golden/layered-goldens.test.ts
      echo test/golden/layered-hierarchy-goldens.test.ts
      find src/alg/layered -name '*Test.test.ts'
    } | LC_ALL=C sort -u
  )
fi

include=()
while IFS= read -r file; do
  include+=("--coverage.include=$file")
done < <(node -e '
  const groups = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const files = Object.values(groups).flat().map((arm) => arm.file);
  console.log([...new Set(files)].join("\n"));
' "$HERE/arms.json")

mkdir -p "$SCRATCH"
run="$(mktemp -d "$SCRATCH/coverage.XXXXXX")"
report="$run/report" # vitest empties its reports directory, so the log stays beside it
echo "coverage report: $report/coverage-final.json" >&2
rc=0
npx vitest run "${tests[@]}" --coverage "${include[@]}" --coverage.reporter=json \
  "--coverage.reportsDirectory=$report" --coverage.thresholds.statements=0 --coverage.thresholds.branches=0 \
  --coverage.thresholds.functions=0 --coverage.thresholds.lines=0 >"$run/vitest.log" 2>&1 || rc=$?
tail -n 6 "$run/vitest.log" >&2
echo "vitest exit $rc" >&2
node "$HERE/arm-counts.mjs" "$report/coverage-final.json"
