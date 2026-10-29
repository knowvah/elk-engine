<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Wire the enum arms, replay every row, port the invariant tests

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T8): replay every layered phase row and port the invariant tests`
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`.

## Context

Mission 7b (README), B4, B9. Batch 2 proved each class on its own scenario rows; this task proves the whole 7b set the
way the pipeline will use it: every processor instantiated by name, every phase by strategy, every `models/*` row's
prefix run in order. The Java tests are `LayoutTestRunner` whitebox tests whose methods receive the LGraph after a
processor; their bodies port unchanged and run over the replayed graphs instead.

## Task

1. `S/intermediate/IntermediateProcessorStrategy.ts`: the ten 7b arms (B9 table) import and instantiate; the test's
   ten cases now assert an instance of the class.
2. `S/LayeredPhaseVectors.test.ts`: for every row of `test/golden/refs/java/layered-phases.json`, `runPrefix` or
   `runSteps` with `createProcessor = name => IntermediateProcessorStrategy.valueOf(name).create()` and
   `createPhase = (phase, strategy) => CycleBreakingStrategy|LayeringStrategy.valueOf(strategy).create()`; assert no
   diff; assert the total row count and the per-group counts; the `sites` group is empty until T11 (assert the count
   from the file's `rowCounts`, not a literal).
3. Ported invariant tests, one file each, Java method bodies verbatim over the replayed graphs of the matching rows:
   - `S/p1cycles/BasicCycleBreakerTest.test.ts`: `testIsAcyclic` + `dfs` (`JT/p1cycles/BasicCycleBreakerTest.java:140-198`;
     the DFS twin rule B8 applies to the test's own recursion) over every P1 `models` row;
   - `S/p2layers/BasicLayerAssignmentTest.test.ts`: `testNoLayerlessNodes`, `testNoEmptyLayers`,
     `testEdgesPointTowardsNextLayers` (`JT/p2layers/BasicLayerAssignmentTest.java:135-186`) over every P2 row;
   - `S/p2layers/BasicModelOrderTest.test.ts`: the BF/DF rows replay without error (`:80-83`);
   - `S/intermediate/EdgeAndLayerConstraintEdgeReverserTest.test.ts` (`JT/intermediate/…:56-82`),
     `LayerConstraintProcessorTest.test.ts` (`:63-133`), `ReversedEdgeRestorerTest.test.ts` (`:61-70`, over rows whose
     steps run the restorer), `NodePromotionTest.test.ts` (`:121-135`), `PartitionPostProcessorTest.test.ts` (`:61-96`),
     each over the rows dumped after that processor.
   A Java test that only a full layout can satisfy is not ported here (SC2 list).

## Write-set

`S/intermediate/IntermediateProcessorStrategy.ts` (the ten arms) and `.test.ts`; `S/LayeredPhaseVectors.test.ts`;
`S/p1cycles/BasicCycleBreakerTest.test.ts`; `S/p2layers/{BasicLayerAssignmentTest,BasicModelOrderTest}.test.ts`;
`S/intermediate/{EdgeAndLayerConstraintEdgeReverserTest,LayerConstraintProcessorTest,ReversedEdgeRestorerTest,NodePromotionTest,PartitionPostProcessorTest}.test.ts`.

## Read-set

The Java test files above; `test/helpers/layered-phase-replay-*.ts`; `S/options/{CycleBreakingStrategy,LayeringStrategy}.ts`;
`S/alg/layered/LayeredSiteVectors.test.ts` (7a generic replay pattern); `decisions.md` B4, B9, SC2.

## Acceptance criteria

- Given every row, when replayed by name, then no diff; the per-group counts equal `rowCounts`.
- Given the invariant tests, when run over the replayed graphs, then every case passes for every applicable row.
- Given the enum, when `create()` runs for a 7b member, then it returns an instance; others still throw.

## Observability / Rollback

N/A. Reversible.
