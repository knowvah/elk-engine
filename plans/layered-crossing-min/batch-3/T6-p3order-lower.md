<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — p3order lower half: heuristics, constraint resolver, port distributors

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the crossing-minimization heuristics and port distributors`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7c (README), C4, C6, C7, C9. About 2,900 Java lines: `ICrossingMinimizationHeuristic` 68,
`ISweepPortDistributor` 66 (its static `create(CrossMinType, Random, LNode[][])` references `CrossMinType`, which T7
ports as the M15 file of `LayerSweepCrossingMinimizer`; port that small enum file here so the factory typechecks, and
T7 keeps it), `SweepCopy` 186, `ForsterConstraintResolver` 570, `BarycenterHeuristic` 416, `MedianHeuristic` 210,
`ModelOrderBarycenterHeuristic` 262, `AbstractBarycenterPortDistributor` 400, `LayerTotalPortDistributor` 90,
`NodeRelativePortDistributor` 106, `GreedyPortDistributor` 154. These are reached inside P3, so their oracle proof is
the P3 rows replayed in T7/T8; here each class is ported test-first against the behaviour the Java defines on
step-built graphs taken from the rows (orders recorded by `scenarios/*` rows whose options route through the class,
e.g. `MEDIAN_LAYER_SWEEP` for `MedianHeuristic`), never against hand-derived numbers.

## Task

1. Port the eleven files to `src/alg/layered/p3order/` with `@see`, Java boundaries, section files where needed.
   `BarycenterHeuristic`, `MedianHeuristic`, `ModelOrderBarycenterHeuristic` take `Random` from the constructor (C4):
   draws must match the JVM sequence exactly (`src/java/util/Random.ts`).
2. C7: `BarycenterHeuristic.calculateBarycenter` (`J/p3order/BarycenterHeuristic.java:~218`) recurses on nodes whose
   barycenter is not yet fixed — explicit stack + twin + 5,000-node case; `ForsterConstraintResolver.initAtNodeLevel`/
   `processConstraints` and `AbstractBarycenterPortDistributor.calculatePortRanks`/`distributePorts`: confirm overload
   vs recursion first (journal the finding in the hand-back).
3. C9: `GreedyPortDistributor.switchPorts` sets through `Lists.reverse(node.getPortSideView(side))`; a unit case proves
   the write reaches the node's port list through the proxy (and that `ports.set` beyond the view's bounds throws as
   `ArrayList.SubList`). If the view does not write through, stop (17) with the diagnosis.
4. C6: boxed `==`/`!=` audit (barycenter values are `double`s; `Integer` positions in the resolver's `NodeGroup`).
5. AD-10: `LinkedHashMultimap` (`ForsterConstraintResolver.java:72`) and any `HashSet`/`HashMap` of nodes → insertion
   order, journaled.
6. Tests: colocated per class; replay the `scenarios/*` P3 rows whose options select the class through a minimal
   local harness that instantiates `LayerSweepCrossingMinimizer`? **No** — that class is T7. Instead: unit cases that
   drive the class with inputs read from the rows (node orders per layer from `expected.layers`, port orders from
   `expected.ports`) and assert the Java contracts: barycenter of a fixed node equals the Java constant path, the
   resolver's group merging on in-layer constraints from `scenarios/*` rows that set `inLayerPredOf`/`inLayerSuccOf`,
   the distributors' rank formulas on the row graphs with the values the rows record in `ports`. Where a class can only
   be meaningfully asserted through the sweep, say so in the hand-back and leave it to T7's replay.

## Write-set

`src/alg/layered/p3order/{ICrossingMinimizationHeuristic,ISweepPortDistributor,SweepCopy,ForsterConstraintResolver,
BarycenterHeuristic,MedianHeuristic,ModelOrderBarycenterHeuristic,AbstractBarycenterPortDistributor,
LayerTotalPortDistributor,NodeRelativePortDistributor,GreedyPortDistributor}.ts`,
`src/alg/layered/p3order/LayerSweepCrossingMinimizerCrossMinType.ts` (M15, shared with T7 by agreement: T6 creates it,
T7 does not change it), their `.test.ts`, section files.

## Read-set

The eleven Java files, `J/p3order/LayerSweepCrossingMinimizer.java:655-668` (`CrossMinType`), `src/alg/layered/p3order/counting/*.ts`
(T5), `src/alg/layered/graph/LNode.ts:200-240` (`getPortSideView`), `src/guava/Lists.ts` (`reverse`),
`src/java/util/Random.ts`, `decisions.md` C4, C6, C7, C9, the P3 `scenarios/*` rows.

## Interface contract (consumed by T7)

Java signatures exactly: `ISweepPortDistributor.create(cmt, r, currentNodeOrder)`, `distributePortsWhileSweeping(order,
freeLayerIndex, isForwardSweep): boolean`; `ICrossingMinimizationHeuristic.minimizeCrossings(layer, freeLayerIndex,
forwardSweep, isFirstSweep): boolean`, `setFirstLayerOrder`, `alwaysImproves`, `isDeterministic`;
`ForsterConstraintResolver(LNode[][])`, `processConstraints(List<LNode>)`; `SweepCopy(List<LNode[][]>)`,
`SweepCopy(SweepCopy)`, `nodes()`, `transferNodeAndPortOrdersToGraph(GraphInfoHolder, boolean)` (takes the holder T7
writes: declare the parameter with an `import type` to `./GraphInfoHolder.js`, which T7 creates — T6 adds a minimal
`GraphInfoHolder.ts` declaring only the members `SweepCopy` reads, marked for T7 to complete; journal this handoff).

## Acceptance criteria

- Given the C9 unit case, when `switchPorts` runs through the reversed view, then the node's port list is swapped.
- Given `calculateBarycenter`'s twin on every P3 scenario graph and a 5,000-node chain under `--jitless`, when
  compared, then equal and no overflow.
- Given the resolver on the in-layer-constraint rows, when groups are built, then the groups match the orders those
  rows record.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
