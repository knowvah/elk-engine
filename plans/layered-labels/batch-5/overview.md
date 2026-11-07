<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Ported suites

Three tasks with disjoint write-sets, **in parallel**, all test files. They port the 12 suites of
[java-baseline.md](../java-baseline.md) (11 allocated by `plans/layered-pipeline/suite-allocation.md` plus `Issue871Test`) and the
hand-offs of G1 (`NodeMarginCalculatorTest` hooks, `SortByInputModelProcessorTest` over `preserve_order`, 7b's
`testEdgesPointTowardsNextLayers` question). They run through 7f's runner (`test/helpers/layout-test-runner.ts`) with the Java's own
assertions, sized labels from `layered-label-metrics.json` (G8), and a non-vacuity check per suite (`.agent-notes/layered-pipeline.md`:
a green suite can still be vacuous).

| ID   | Description | Agent | Writes | Depends On | Done |
| ---- | ----------- | ----- | ------ | ---------- | ---- |
| T13a | Label suites: `LabelDummyRemoverTest`, `LabelSideSelectorTest`, `EndLabelSorterTest`, `Issue445/471/541/905` ([brief](T13a-label-suites.md)) | typescript-pro | src/alg/layered/intermediate/{LabelDummyRemoverTest,LabelSideSelectorTest,EndLabelSorterTest}.test.ts, src/alg/layered/issues/Issue{445,471,541,905}Test.test.ts | T3, T11 | [x] |
| T13b | `CommentPostprocessorTest`, `AlternatingLayerUnzipperTest`, `PartitionTest`, `Issue871Test` ([brief](T13b-comment-unzipper-partition-suites.md)) | typescript-pro | src/alg/layered/intermediate/{CommentPostprocessorTest,AlternatingLayerUnzipperTest,PartitionTest}.test.ts, src/alg/layered/issues/Issue871Test.test.ts | T3, T11 | [x] |
| T13c | Hand-offs: `NodeMarginCalculatorTest` hooks, `SortByInputModelProcessorTest` `preserve_order`, `testEdgesPointTowardsNextLayers` ([brief](T13c-hand-off-suites.md)) | typescript-pro | src/alg/layered/intermediate/{NodeMarginCalculatorTest,SortByInputModelProcessorTest}.test.ts (new cases only) | T3, T11 | [x] |

Run counts are `java-baseline.md`'s (12, 3, 4, 550, 551, 1, 1, 2, 2, 5, 3). A suite that needs a label text missing from the table
reports it; the orchestrator appends it under G8's proof (T3's test), since three parallel agents never write the same file. A
suite whose plan throws naming 7g or 7h moves with a journal row (stop 21 above about a third of the 12). **Before each commit**,
an independent reviewer (a separate agent, 7f's precedent) compares every ported suite with its Java source for added or dropped
assertions; the orchestrator commits per task. A port defect found by a suite goes to the orchestrator, who routes it through T12's
write-set (stop 1 for the suite agents). The batch is done when the README gates are green.
