<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — p3order upper half and greedy switch

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the layer sweep crossing minimizer and greedy switch`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7c (README), C3–C7, C10. About 2,600 Java lines: `GraphInfoHolder` 288, `LayerSweepTypeDecider` 236,
`LayerSweepCrossingMinimizer` 681, `InteractiveCrossingMinimizer` 236, `NoCrossingMinimizer` 68, and `greedyswitch`:
`GreedySwitchHeuristic` 160, `SwitchDecider` 259, `CrossingMatrixFiller` 79, `BetweenLayerEdgeTwoNodeCrossingsCounter`
400, `NorthSouthEdgeNeighbouringNodeCrossingsCounter` 216. With these the P3 rows replay end to end: this task's tests
replay every `scenarios/*` row whose last step is `runPhase P3_NODE_ORDERING <S>` through
`CrossingMinimizationStrategy.<S>.create()` (and the greedy-switch processor rows through `new GreedySwitchProcessor`-equivalents
wired in T8 — here through direct instantiation), with `compareOrder`/`compareOrderFullDump`.

## Task

1. Port the ten classes with `@see`, Java boundaries, section files (`LayerSweepCrossingMinimizer` will need several:
   split at its Java section comments), M15 files for nested types (`CrossMinType` exists from T6; `GraphInfoHolder`'s
   minimal declaration from T6 becomes the full class). Every phase class's processor configuration is a cached static
   getter (C5, E1); `LayerSweepCrossingMinimizer` carries the 7a `IHierarchyAwareLayoutProcessor` brand (C10).
2. `src/alg/layered/options/CrossingMinimizationStrategy.ts`: the four arms create the phases (`LAYER_SWEEP` →
   `BARYCENTER`, `MEDIAN_LAYER_SWEEP` → `MEDIAN`, `INTERACTIVE`, `NONE`); the dead `notPorted` helper goes. Then run
   `npx vitest run test/architecture/layered-entry-points.fitness.test.ts`: it must stay green (C5); if it fails, apply
   the E1 recipe inside this write-set (lazy reads) or stop (15).
3. `src/alg/layered/IHierarchyAwareLayoutProcessor.test.ts`: the sentinel case flips to asserting the brand on
   `LayerSweepCrossingMinimizer` (C10; cite the 7a journal).
4. C4: the thoroughness loop and `GraphInfoHolder`'s `Random` from `InternalProperties.RANDOM`; C6 audit; C7:
   `LayerSweepCrossingMinimizer.countCurrentNumberOfCrossings` (overload or recursion?), the hierarchical recursion
   `sweepInHierarchicalNodes`/`sweepInHierarchicalNode` is U until 7h (port it faithfully, no twin needed if no row
   reaches it — say so). AD-10: `Sets.newHashSet` of changed graphs, `Lists.newLinkedList` → insertion order, journaled.
5. Tests: colocated per class; the P3 scenario rows per strategy and option (greedy switch types, thoroughness, model
   order, semi-interactive, interactive positions); the greedy-switch processor rows; exception cases with Java messages.

## Write-set

`src/alg/layered/p3order/{GraphInfoHolder,LayerSweepTypeDecider,LayerSweepCrossingMinimizer,InteractiveCrossingMinimizer,
NoCrossingMinimizer}.ts` (+ section files), `src/alg/layered/intermediate/greedyswitch/*.ts`,
`src/alg/layered/options/CrossingMinimizationStrategy.ts` (+ `.test.ts`), `src/alg/layered/IHierarchyAwareLayoutProcessor.test.ts`,
their `.test.ts`; `test/architecture/staged-classes.json` only under L1.

## Read-set

The ten Java files, `J/options/CrossingMinimizationStrategy.java`, T5/T6 outputs (`src/alg/layered/p3order/**`,
`counting/**`, `preserveorder/**`), `src/alg/layered/IHierarchyAwareLayoutProcessor.ts`, `test/architecture/layered-entry-points.fitness.test.ts`,
`decisions.md` C3–C7, C10, `.agent-notes/layered-cycles-layers.md` (enum cycle, lazy configurations), the P3 rows.

## Acceptance criteria

- Given every `scenarios/*` row ending in `runPhase P3_NODE_ORDERING`, when replayed through the strategy enum, then
  `compareOrder` is `[]` (and the full dump where present).
- Given the entry-point fitness test, when run after wiring, then green with no entry-order import anywhere.
- Given the sentinel test, when run, then it asserts the brand on `LayerSweepCrossingMinimizer` and passes.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
