<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Wire the processor arms, replay every row, port the invariant tests

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T8): replay every layered order row and port the invariant tests`
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7c (README), C2, C5. Batches 2–4 proved each class on its rows with the class injected; this task proves the
whole set the way the pipeline uses it. 7b's `src/alg/layered/LayeredPhaseVectors.test.ts` and its eight invariant
tests are the pattern (incl. the rule that invariants run over pipeline and scenario rows of the Java tests'
configurations, never over `sites/*`).

## Task

1. `IntermediateProcessorStrategy.ts`: the ten 7c arms (`PORT_SIDE_PROCESSOR`, `PORT_LIST_SORTER`,
   `LONG_EDGE_SPLITTER`, `INVERTED_PORT_PROCESSOR`, `NORTH_SOUTH_PORT_PREPROCESSOR`,
   `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR`, `SEMI_INTERACTIVE_CROSSMIN_PROCESSOR`, `SORT_BY_INPUT_ORDER_OF_MODEL`,
   `ONE_SIDED_GREEDY_SWITCH`, `TWO_SIDED_GREEDY_SWITCH`) import and instantiate (the greedy-switch arms create
   `GreedySwitchProcessor`? — no: the Java arms create `new GreedySwitchProcessor(type)`; check `IntermediateProcessorStrategy.java`
   and port exactly; if that class is not in the T7 set, it is an L1 question for the orchestrator before you write).
   The test's B9 tally moves ten members from pending to ported. Then the entry-point fitness test must stay green.
2. `src/alg/layered/LayeredOrderVectors.test.ts`: every row of `layered-order.json` with the real factories
   (`createPhase` maps `P1`/`P2`/`P3` to the three strategy enums); counts from `rowCounts`; one `it` per row.
3. Ten invariant tests, Java bodies verbatim over the replayed graphs of the matching rows, restricted to the
   configurations the Java test runs (read its `@ConfiguratorProvider`s): `BasicCrossingMinimizationTest`
   (`JT/p3order/...:*`), `ForsterConstraintResolverTest`, `ModelOrderBarycenterHeuristicTest`, `PortListSorterTest`,
   `LongEdgeSplitterTest`, `InvertedPortProcessorTest`, `PortSideProcessorTest`, `NorthSouthPortPreprocessorTest`,
   `SortByInputModelProcessorTest`, `BasicConsiderModelOrderTest`. A Java method only a full layout can satisfy is not
   ported (name it); `sites/*` rows are excluded.

## Write-set

`src/alg/layered/intermediate/IntermediateProcessorStrategy.ts` and `.test.ts`; `src/alg/layered/LayeredOrderVectors.test.ts`;
`src/alg/layered/p3order/{BasicCrossingMinimizationTest,ForsterConstraintResolverTest,ModelOrderBarycenterHeuristicTest}.test.ts`;
`src/alg/layered/intermediate/{PortListSorterTest,LongEdgeSplitterTest,InvertedPortProcessorTest,PortSideProcessorTest,
NorthSouthPortPreprocessorTest,SortByInputModelProcessorTest,BasicConsiderModelOrderTest}.test.ts`.

## Read-set

The Java tests above, `J/intermediate/IntermediateProcessorStrategy.java` (the ten arms), `src/alg/layered/LayeredPhaseVectors.test.ts`
and `src/alg/layered/intermediate/NodePromotionTest.test.ts` (patterns), `test/helpers/layered-order-replay-*.ts`,
`decisions.md` C2, C5.

## Acceptance criteria

- Given every row, when replayed by name, then no diff; per-group counts equal `rowCounts`; the file runs under 20 s alone.
- Given the invariant tests over the Java tests' configurations, then every case passes.
- Given the enum, when `create()` runs for a 7c member, then an instance; the 7f/7g members still throw; the fitness
  test stays green.

## Observability / Rollback

N/A. Reversible.
