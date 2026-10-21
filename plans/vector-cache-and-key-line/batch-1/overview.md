<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: F7 vectors + fix; write-recorder row cache

Two independent tasks with disjoint write-sets; run them in parallel. T1 runs `elkt-vectors.sh`, which no task in this
batch edits (T3 edits the scripts in batch 2). Only the orchestrator commits, one commit per task.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T1](T1-f7-key-line.md) | F7: lone-CR/CRLF validate vectors, then `#parsePropertyKey` via `cursor.lineOf` | typescript-pro | 2 new `tools/vectors/elkt-validate-scenarios/*.elkt`, `test/golden/refs/java/graph-text-validate.json` (by script), `src/graph/text/parser/ElkGraphParser.ts` (+ PF1 literals) | — | [x] |
| [T2](T2-write-row-cache.md) | C4: optional per-row `cacheDir` for `ElkjWriteVectors` | java-architect | `tools/vectors/ElkjWriteVectors.java` | — | [x] |

Interface: T2's argument contract (`<outDir> <vectorsDir> [<cacheDir>]`) is consumed by T3 (batch 2).
Batch gate: README "Quality gates".
