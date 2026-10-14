#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Writes the oracle's `parse` (import -> export, no layout) output for every
# .json model under $ELK_MODELS_DIR to test/corpus/.json-sweep/ (gitignored),
# plus results.jsonl (one oracle result line per model; a model the oracle
# rejects has status "throws" and no output file). J7/J8.
# Skipped when the sweep dir is fresh: same oracle ELK commit + patches, same
# harness sources, same models commit and the same input hash.
# Usage: json-sweep.sh [--force]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ELK_MODELS_DIR="${ELK_MODELS_DIR:-$ROOT/../../eclipse-elk/elk-models}"
ELK_ORACLE_DIR="${ELK_ORACLE_DIR:-$ROOT/../elk-oracle}"
SWEEP_DIR="$ROOT/test/corpus/.json-sweep"
STAMP_FILE="$SWEEP_DIR/.stamp"
RESULTS_FILE="$SWEEP_DIR/results.jsonl"

die() {
  echo "error: $1" >&2
  exit 1
}

model_ids() { # prints one model id (path below the models dir, no .json) per line
  (cd "$ELK_MODELS_DIR" && find . -type f -name '*.json' | sed -e 's|^\./||' -e 's|\.json$||' | LC_ALL=C sort)
}

compute_stamp() { # oracle build + harness + models commit + hash of every input
  {
    cat "$ELK_ORACLE_DIR/oracle-build.json"
    cat "$ROOT"/tools/oracle/harness/*.java "$ROOT"/tools/oracle/patches/*.patch
    git -C "$ELK_MODELS_DIR" rev-parse HEAD
    model_ids | while IFS= read -r id; do
      echo "$id $(shasum -a 256 "$ELK_MODELS_DIR/$id.json" | cut -d' ' -f1)"
    done
  } | shasum -a 256 | cut -d' ' -f1
}

write_cases() { # write_cases <dest file>
  local id
  : >"$1"
  while IFS= read -r id; do
    printf '{"id":"%s","input":"%s/%s.json","mode":"parse"}\n' "$id" "$ELK_MODELS_DIR" "$id" >>"$1"
  done < <(model_ids)
}

main() {
  local force=0 stamp cases
  [ "${1:-}" = "--force" ] && force=1
  [ -d "$ELK_MODELS_DIR" ] || die "$ELK_MODELS_DIR missing; run test/corpus/fetch.sh"
  stamp="$(compute_stamp)"
  if [ "$force" -eq 0 ] && [ -f "$STAMP_FILE" ] && [ "$(cat "$STAMP_FILE")" = "$stamp" ]; then
    echo "json sweep fresh in test/corpus/.json-sweep (use --force to rerun)" >&2
    return 0
  fi
  cases="$(mktemp)"
  write_cases "$cases"
  rm -rf "$SWEEP_DIR"
  mkdir -p "$SWEEP_DIR"
  # run.sh exits non-zero when a case throws; the results file is the record.
  ELK_ORACLE_DIR="$ELK_ORACLE_DIR" "$ROOT/tools/oracle/run.sh" --cases "$cases" "$SWEEP_DIR" >"$RESULTS_FILE" || true
  rm -f "$cases"
  [ -s "$RESULTS_FILE" ] || die "oracle produced no results"
  echo "$stamp" >"$STAMP_FILE"
  echo "wrote $(wc -l <"$RESULTS_FILE" | tr -d ' ') results to test/corpus/.json-sweep" >&2
}

main "$@"
