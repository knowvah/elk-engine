<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13b — Comment, unzipper, partition and `Issue871` suites

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T13b): port the comment, unzipper and partition suites`
`JT` as README. Scratch: a private subdirectory `<scratchpad>/T13b/`.

**Rules (F16).** Expected values are the Java's own literals; no assertion the Java lacks; never relax an assertion (stop 3).
A hand-built Java graph is ported literal for literal (sizes, ids, options, edge order). L4 applies.

## Context

Mission 7f2, G1, G8, F7, F8, FX1. Allocation: `plans/layered-pipeline/suite-allocation.md:19,20,30,65`. Java run counts: 12, 3, 5, 3
(`java-baseline.md`). `AlternatingLayerUnzipperTest` (731 lines) and `Issue871Test` (180) call `LayeredLayoutProvider` directly on
hand-built `ElkGraphUtil` graphs; `CommentPostprocessorTest` and `PartitionTest` use `LayoutTestRunner`. `PartitionTest` moved whole to
7f2 because `partitioning-withEdgeLabels` has `LABEL_DUMMY_INSERTER` (FX1). `Issue871Test.testNoFeedbackEdgesStillWorking`
(`JT/issues/Issue871Test.java:129-170`) creates edge labels `"1"`, `"2"` and node labels, sized through the runner's label metrics
when the Java framework would size them (here the graph is built in the test, so sizes follow the Java literals; check, do not
guess, whether the Java test sizes labels itself).

## Task

1. `intermediate/AlternatingLayerUnzipperTest.test.ts` from `JT/intermediate/AlternatingLayerUnzipperTest.java:33-731`: the 12 `@Test`
   methods at `:46, 95, 151, 198, 253, 322, 378, 433, 497, 561, 627, 677`, each building its graph from `ElkGraphUtil.createGraph()`
   and running `layeredLayout.layout`; the shared fixture at `:35-44`. Hold the 12 graph builders in a test-local helper file if the
   test file exceeds 500 lines (new file in the write-set below).
2. `intermediate/CommentPostprocessorTest.test.ts` from `JT/intermediate/CommentPostprocessorTest.java:39-164`
   (`tests/layered/comment_boxes/**`, 3 files; `testSpacings` at `:58`); `intermediate/PartitionTest.test.ts` from
   `JT/intermediate/PartitionTest.java:42-133` (`tests/layered/partitioning/**` 4 files and
   `tickets/layered/656_brokenLayoutPartitions.elkt`; `testPartitionOrder` at `:64`).
3. `issues/Issue871Test.test.ts` from `JT/issues/Issue871Test.java:41-180`: `testFeedbackEdgeBelow` (`:48`), `testFeedbackEdgeBasic`
   (`:91`), `testNoFeedbackEdgesStillWorking` (`:129`). The labels make the plan hold `LABEL_DUMMY_INSERTER`; with T11 wired it runs.
4. Counts equal `java-baseline.md` (12, 3, 5, 3) over the vendored inputs (`$ELK_MODELS_DIR` only when `PIPELINE_SUITES_FULL=1`).
5. A non-vacuity check per suite lives in a separate `it` titled `(non-vacuity)`, outside the ported cases: the unzipper cases
   unzip at least one layer, the comment cases hold at least one comment box with an edge, the partition cases have partitions.
   A missing label text: report it, do not edit the table (T3's append-only procedure belongs to the orchestrator).
6. A suite that throws naming 7g or 7h moves with a journal row (one correction row for `suite-allocation.md`); report the tally.

## Write-set

`src/alg/layered/intermediate/{CommentPostprocessorTest,AlternatingLayerUnzipperTest,PartitionTest}.test.ts` (plus a test-local
`AlternatingLayerUnzipperTestGraphs.ts` helper if needed), `src/alg/layered/issues/Issue871Test.test.ts`.

## Read-set

The four Java suites, `test/helpers/layout-test-runner.ts`, `src/alg/layered/issues/Issue587Test.test.ts`,
`plans/layered-pipeline/suite-allocation.md:19-20,30,65`, `decisions.md` G8, F7, F8, FX1, F16.

## Architecture decisions

G1, G8, F7, F8, FX1 (a suite with a later-mission input moves whole), F16.

## Interface contract

None downstream.

## Acceptance criteria

- Given each suite, when run, then every case passes and the count equals `java-baseline.md` (12, 3, 5, 3).
- Given the independent reviewer's comparison with the Java, when read, then no assertion is added or dropped.
- Given `AlternatingLayerUnzipperTest`, when run, then each of the 12 graphs matches the Java's expected layer assignment.
- Given a suite that needs a later mission, when found, then it moved with a journal row, not a skip.

## Observability / Rollback

N/A — no new observable operations. Reversible.
