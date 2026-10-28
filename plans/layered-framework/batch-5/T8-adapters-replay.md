<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `adapters` replay

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T8): replay layered adapter vectors`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`.

## Context

Mission 7a (README). T1 recorded, per model and sweep graph, the node sizes, margins, port and label positions after
the two layered call sequences over `LGraphAdapters` (`J/intermediate/LabelAndNodeSizeProcessor.java:68-72`,
`J/intermediate/InnermostNodeMarginCalculator.java:62-63`). This closes the 6c follow-up: port alignment
(BEGIN/END/JUSTIFIED) and N/S border offsets checked end to end at the adapter level.

## Task

1. `S/graph/LayeredFrameworkAdapterVectors.test.ts`: one `it` per `adapters` row. Import the row's `input` through
   `importInput` and `ElkGraphTransformer.importGraph` (T6 helper), run the same two sequences against the TS
   `NodeDimensionCalculation`, and compare the `expected` shape at the AD-4 bar.
2. A mismatch is a divergence (stop 5 unless the mechanism is named); never edit the vectors.

## Write-set

`S/graph/LayeredFrameworkAdapterVectors.test.ts`.

## Read-set

`test/helpers/layered-framework-replay.ts` (T6), `S/graph/LGraphAdapters.ts` (T5),
`src/alg/common/nodespacing/NodeDimensionCalculation.ts`, the T1 recorder header (`adapters` format).

## Acceptance criteria

- Given every `adapters` row, when replayed, then sizes, margins and positions match at the AD-4 bar.
- Given the rows with BEGIN, END, JUSTIFIED alignment or a non-zero N/S `PORT_BORDER_OFFSET`, when replayed, then
  they pass (the 6c follow-up).

## Observability / Rollback

N/A — test only. Reversible: revert the commit.
