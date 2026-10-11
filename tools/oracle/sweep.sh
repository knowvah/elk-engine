#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Runs the oracle sweep (every planned case twice, separate JVMs) and writes
# results.jsonl + summary.json under $ELK_ORACLE_DIR/sweep/ (never the repo).
# Usage: sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
#                 [--out <dir>] [--plan-only]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
exec npx tsx tools/corpus/sweep.ts "$@"
