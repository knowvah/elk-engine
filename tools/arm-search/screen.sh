#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# The TypeScript screen of the arm search (issue #59, plans/layered-arm-search D2): replays the candidates of a JSON
# file through tools/arm-search/screen.spec.ts (format: its header) under v8 coverage of the arm files, and prints the
# count of each of the 25 arms (tools/arm-search/arm-counts.mjs).
# Usage: screen.sh [--each] <candidates.json> [<candidate id>]
#   --each   one vitest run per candidate, so every candidate gets its own arm counts (slower; without it the counts
#            are those of all candidates together).
# The scratch vitest config, the coverage report and results.jsonl (one line per candidate: ok or the error, the
# final layers or the layout) are written to a fresh directory under ARM_SEARCH_DIR (default $TMPDIR/layered-arm-search),
# printed on stderr. Nothing is written inside the repository.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HERE="$ROOT/tools/arm-search"
SCRATCH="${ARM_SEARCH_DIR:-${TMPDIR:-/tmp}/layered-arm-search}"
EXIT_USAGE=2

each=0
if [ "${1:-}" = "--each" ]; then
  each=1
  shift
fi
[ "$#" -ge 1 ] && [ "$#" -le 2 ] || {
  echo "usage: screen.sh [--each] <candidates.json> [<candidate id>]" >&2
  exit "$EXIT_USAGE"
}
candidates="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
only="${2:-}"

mkdir -p "$SCRATCH"
run="$(mktemp -d "$SCRATCH/screen.XXXXXX")"
echo "screen output: $run" >&2
# The repository's vitest.config.ts includes src/ and test/ only; this config (outside the repository, so no import of
# vitest/config resolves: a plain object) names the screen spec and keeps the suite's alias and assertion setup.
cat >"$run/vitest.config.mjs" <<CONFIG
export default {
  root: '$ROOT',
  resolve: { alias: { '@knowvah/elk-engine': '$ROOT/test/public-api/candidate-index.ts' } },
  test: {
    include: ['tools/arm-search/screen.spec.ts'],
    setupFiles: ['test/setup/dev-assertions.ts'],
    coverage: { provider: 'v8' },
  },
};
CONFIG

include=()
while IFS= read -r file; do
  include+=("--coverage.include=$file")
done < <(node -e '
  const groups = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log([...new Set(Object.values(groups).flat().map((arm) => arm.file))].join("\n"));
' "$HERE/arms.json")

screen() { # screen <report dir> [<candidate id>]
  local report="$1" id="${2:-}" rc=0
  env ARM_SCREEN_FILE="$candidates" ARM_SCREEN_OUT="$run/results.jsonl" ${id:+"ARM_SCREEN_ID=$id"} \
    npx vitest run --config "$run/vitest.config.mjs" --coverage "${include[@]}" --coverage.reporter=json \
    "--coverage.reportsDirectory=$report" >>"$run/vitest.log" 2>&1 || rc=$?
  [ "$rc" -eq 0 ] || echo "vitest exit $rc (see $run/vitest.log)" >&2
  node "$HERE/arm-counts.mjs" "$report/coverage-final.json" | awk -F' [|] ' '$4 != 0'
}

cd "$ROOT"
if [ "$each" -eq 1 ] && [ -z "$only" ]; then
  n=0
  while IFS= read -r id; do
    n=$((n + 1))
    echo "== $id"
    screen "$run/report-$n" "$id"
  done < <(node -e '
    for (const c of JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))) console.log(c.id);
  ' "$candidates")
else
  screen "$run/report" "$only"
fi
echo "results: $run/results.jsonl" >&2
