#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Coverage gate: runs `vitest run --coverage` with its full output kept in a log
# file, and on a non-zero exit says why. A run once exited 1 with every test
# passing and nothing visible in a filtered view of the output; the reason
# (an unhandled error, a coverage report that failed to write, a threshold) is
# printed after the test summary, so it is easy to miss.
#
# Usage:
#   tools/coverage-gate/run.sh [vitest args...]   run the gate (npm run coverage)
#   tools/coverage-gate/run.sh --classify <log>   explain an existing log (tests)
#
# Logs go to $COVERAGE_LOG_DIR (default coverage-logs/, gitignored); the newest
# $COVERAGE_LOG_KEEP (default 20) are kept. vitest's own coverage/ directory is
# cleaned by vitest on every run, so the logs cannot live there.
set -u

KEEP="${COVERAGE_LOG_KEEP:-20}"

# Prints the reason a run that exited non-zero failed. Arguments: log file.
classify() {
  local log="$1"
  if grep -Eq '^ *Tests +[0-9]+ failed' "$log"; then
    echo "coverage gate: test failures:"
    grep -E '^ *(FAIL|Tests) ' "$log"
    return
  fi
  if grep -Eq 'Unhandled (Error|Rejection)' "$log"; then
    echo "coverage gate: all tests passed, but vitest reported an unhandled error:"
    grep -E -A 12 'Unhandled (Error|Rejection)' "$log"
    return
  fi
  if grep -Eq '^ERROR: Coverage for' "$log"; then
    echo "coverage gate: all tests passed, but a coverage threshold was not met:"
    grep -E '^ERROR: Coverage for' "$log"
    return
  fi
  echo "coverage gate: no known failure signature; last 30 lines of the log:"
  tail -n 30 "$log"
}

# Deletes all but the newest $KEEP logs. Arguments: log directory.
prune_logs() {
  local dir="$1"
  local old
  # Names embed a sortable timestamp, so reverse name order is newest first.
  old="$(printf '%s\n' "$dir"/coverage-*.log | sort -r | tail -n +"$((KEEP + 1))")"
  if [ -n "$old" ]; then
    echo "$old" | while IFS= read -r f; do rm -f "$f"; done
  fi
}

if [ "${1:-}" = "--classify" ]; then
  if [ -z "${2:-}" ] || [ ! -f "$2" ]; then
    echo "usage: $0 --classify <log>" >&2
    exit 2
  fi
  classify "$2"
  exit 0
fi

cd "$(dirname "$0")/../.." || exit 2
LOG_DIR="${COVERAGE_LOG_DIR:-coverage-logs}"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/coverage-$(date +%Y%m%d-%H%M%S)-$$.log"

npx vitest run --coverage "$@" 2>&1 | tee "$LOG"
status="${PIPESTATUS[0]}"

if [ "$status" -ne 0 ]; then
  echo
  classify "$LOG"
  echo "coverage gate: exit $status; full log: $LOG"
else
  echo "coverage gate: ok; full log: $LOG"
fi
prune_logs "$LOG_DIR"
exit "$status"
