<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Replay-alone coverage map

**Agent:** main session · **Commit:** `docs(T13): map pipeline branches unreached by the replays`

## Context

Mission 7f, F12, L4 under X5. `plans/layered-edge-routing/unreached.md` is the format, 7e's `batch-6/T11-coverage-map.md` the procedure. The classes measured are the 7f set only:
`src/alg/layered/{ElkLayered,GraphConfigurator}*.ts`, `src/alg/layered/components/**`, `src/alg/layered/intermediate/{GraphTransformer,HierarchicalPortOrthogonalEdgeRouter,EndLabelSorter,HypernodesProcessor,ConstraintsPostprocessor}*.ts`.
Replay-alone means the row replays and the SC4 re-replay, without the ported suites (X4); T12's suites may report additional reach but do not close a branch here.

## Task

1. Run, alone, with the log outside the reports directory and the load recorded:
   `npx vitest run --coverage --coverage.include='src/alg/layered/**' --coverage.exclude='**/*.test.ts' --coverage.reporter=json --coverage.reporter=text --coverage.reportsDirectory=<scratch>/T13 src/alg/layered/LayeredPipelineVectors.test.ts src/alg/layered/LayeredPipelineReplay.test.ts`; keep only the 7f classes. Re-measure the landed hand-offs as well: `HyperedgeDummyMerger`'s label arms and the 43 `p2layers`/`intermediate` branches stay U → 7f2.
2. Classify every untaken branch and uncovered function: **S** (a step scenario: graph, steps, expected shape, the field it decides), **J** (structural, unit-tested from the Java), **U** (labels and comments 7f2; self loops, wrapping, compaction 7g; nested graphs and the hierarchical driver 7h; dead by construction with the Java line), **X** (throwing arms, stages). Per-row runs (`-t '<row id>'`) attribute an arm.
3. Write `unreached.md` in 7e's layout: per-class table, the S list with stable ids `sites/<Class>/<name>`, the J list, the U list with mechanisms, totals. Stop 9 above about 30 S scenarios.

## Write-set

`plans/layered-pipeline/unreached.md`.

## Read-set

`plans/layered-edge-routing/unreached.md`, `plans/layered-edge-routing/batch-6/T11-coverage-map.md`, the 7f sources, the Java per branch, `decisions.md` F12, `.agent-notes/layered-crossing-min.md` (per-row coverage).

## Interface contract (consumed by T15, T16)

`unreached.md`: one row per S scenario with id, graph, steps, expected shape and the field it decides; one row per J item; one row per U item with mechanism and Java line.

## Acceptance criteria

- Given the coverage run, when filtered to the 7f classes, then every untaken branch and uncovered function appears exactly once in S, J, U or X (a scratch script checks the partition).
- Given the S list, when counted, then at most about 30 scenarios (else stop 9).

## Observability / Rollback

N/A (a document). Reversible.
