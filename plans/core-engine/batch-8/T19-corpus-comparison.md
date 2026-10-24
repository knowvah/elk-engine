<!-- SPDX-License-Identifier: EPL-2.0 -->

# T19 — Local TS-vs-oracle comparison for 898 × {fixed, box, random}

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T19): measure core layout parity over the corpus`

## Context
M5. The oracle sweep (`tools/oracle/sweep.sh [--filter <substring>] [--out <dir>]`, planner `tools/corpus/sweep.ts`)
lays out every census model retargeted to each algorithm (898 cases per algorithm for fixed/box/random; statuses in
`docs/parity-report.md`: box 898 ok; fixed 869 ok / 29 throws; random 533 ok / 372 nondeterministic because nested
composites stay unseeded). Run A outputs stay under the sweep dir; nothing is committed (AD-5). The TS side must
apply the identical overlay (`test/helpers/graph-overlay.ts`) and export flags (`test/golden/layout-goldens.test.ts`).

## Task
1. Produce oracle outputs for the three algorithms (rerun `sweep.sh` with a filter if the local sweep dir lacks them;
   record the command and wall time in the journal).
2. `tools/corpus/ts-layout-compare.ts` (tsx dev tool, reads `$ELK_MODELS_DIR` and the sweep dir from env/args like
   the other `tools/corpus` scripts): per case, run the TS pipeline, classify `ok` (no diffs), `mismatch`,
   `both-throw` (same exception class), `ts-only-throw`, `oracle-only-throw`, `excluded` (oracle nondeterministic);
   print counts per algorithm and TS vs oracle wall time; write a JSON summary to a path given on the command line
   (not committed). Unit-test the classifier and summary on fixtures.
3. Triage every `mismatch` / single-sided throw: diagnosis mode (CLAUDE.md) — name the mechanism (`file:line`) or
   stop 5. Last-ulp `Math.*` differences go to the known-divergences list (AD-4).
4. `docs/conformance.md`: add `## Core layouts (fixed, box, random)` with the counts table, the command lines to
   reproduce, the excluded-nondeterministic explanation and the known divergences found.

## Write-set
`tools/corpus/ts-layout-compare.ts` (+ test), `docs/conformance.md`.

## Read-set
`tools/corpus/{sweep,parity-report}.ts`, `tools/oracle/sweep.sh`, `docs/parity-report.md`,
`test/golden/{compare-json.ts,layout-goldens.test.ts}`, `test/helpers/graph-overlay.ts`,
`docs/conformance.md` (existing sections and the known-divergences list), `.agent-notes/conformance-corpus.md`.

## Acceptance criteria
- Given the sweep outputs, when the tool runs, then counts per algorithm sum to the number of planned cases.
- Given box (898 oracle ok), when compared, then every case is `ok` or has a named, listed divergence.
- Given a fixture pair differing by 2e-6 in one coordinate, when classified, then `mismatch`; by 5e-7, then `ok`.
- `docs/conformance.md` section exists with the table and reproduce commands; no sweep output is committed.

## Observability / Rollback
The counts are the mission's parity signal (Phase 4); TS wall time recorded next to the oracle's. Reversible: revert.
