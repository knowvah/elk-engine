<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `EndLabelSorter`, `HypernodesProcessor`, `ConstraintsPostprocessor`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the end label sorter, hypernodes and constraints processors`
`J` as README. Scratch: a private subdirectory `<scratchpad>/T7/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal;
a hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line;
everything else stays verbatim.

## Context

Mission 7f, F1, F11. `END_LABEL_SORTER` is in the baseline plan of every layout (`J/GraphConfigurator.java:~64`), but its body does
work only with end labels, which need 7f2's `EndLabelPreprocessor`: those arms are U → 7f2. `HypernodesProcessor` runs on hypernode
graphs after orthogonal routing; `ConstraintsPostprocessor` under `interactiveLayout` or `generatePositionAndLayerIds`.

## Task

1. `src/alg/layered/intermediate/EndLabelSorter.ts` with its nested `LabelGroup` per M15 (`J/intermediate/EndLabelSorter.java`).
   `edgeToGroupMap` (`:161`) is a `Map`, confirmed lookup-only (F11); an iteration is stop 17. String compare in the sort follows
   the Java (UTF-16 code units). Its monitor step and the no-label path run on every row.
2. `src/alg/layered/intermediate/HypernodesProcessor.ts`: `J/intermediate/HypernodesProcessor.java`, its `shiftHypernode` and helpers.
3. `src/alg/layered/intermediate/ConstraintsPostprocessor.ts`: `J/intermediate/ConstraintsPostprocessor.java`. The two
   `DebugUtil.logDebugGraph` calls (`:45,:71`, behind `isLoggingEnabled`) go through the staged slot method.
4. Replay each class's rows with the class injected.

## Write-set

`src/alg/layered/intermediate/{EndLabelSorter,HypernodesProcessor,ConstraintsPostprocessor}*.ts` and their tests.

## Read-set

The three Java files, `src/alg/layered/DebugUtil.ts`, `docs/translation-rules.md`, `test/helpers/layered-pipeline-replay-*.ts`,
`decisions.md` F1, F11, F16.

## Interface contract (consumed by T8)

`new EndLabelSorter()`, `new HypernodesProcessor()`, `new ConstraintsPostprocessor()`; `process(graph, monitor)`.

## Acceptance criteria

- Given a hypernode scenario with bend points on both sides, when replayed, then the node's position and bend points equal the row within 1e-6.
- Given a `generatePositionAndLayerIds` row, when replayed, then each node's layer id and position id equal the row.
- Given a label-free graph, when `EndLabelSorter` runs, then the graph is unchanged and the row matches.

## Observability / Rollback

N/A — no new observable operations. Reversible.
