<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — `PolylineEdgeRouter` and the five non-spline processors

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port the polyline router and the routing processors`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T5/`.

## Context

Mission 7e (README), R1, R4, R5, R8, R14. 1,453 Java lines: `PolylineEdgeRouter` 506 (T2 wrote the predicate and a
throwing stub; configurations `:76-200`, `process` `:202`, `processNode` `:322`, `processInLayerEdge` `:392`,
`calculateWestInLayerEdgeYDiff` `:429`, `addBendPoint` `:464` with `createdJunctionPoints` `:476-486`,
`isInLayerDummy` `:496`), `HyperedgeDummyMerger` 256 (`process` `:67`, `checkMergeAllowed` `:123`, nested
`MergeState` `:169`, `mergeNodes` `:195`, `identifyHyperedges` `:222` with a stream over all ports, `dfs` `:238`:
the mission's one true recursion), `HierarchicalPortPositionProcessor` 128 (`fixCoordinates` `:93` on the first and
last layer), `LayerSizeAndGraphHeightCalculator` 115, `LongEdgeJoiner` 177 (`joinAt` `:104`),
`NorthSouthPortPostprocessor` 271 (`processInputPort` `:146`, `processOutputPort` `:182`, `processSelfLoop` `:213`
reachable only with self loops: 7g rows, U; `processSplineInputPort`/`processSplineOutputPort` `:241,259` set
`SPLINE_NS_PORT_Y_COORD` under SPLINES). Their arms are wired here in T2's section (R5): the five processors; the
`FINAL_SPLINE_BENDPOINTS_CALCULATOR` arm is T9's.

## Task

1. Complete `src/alg/layered/p5edges/PolylineEdgeRouter.ts` (keep T2's predicate; drop the stub comment; sections
   if over 500 TS lines, e.g. `PolylineEdgeRouterInLayer.ts` for `processInLayerEdge`/`calculateWestInLayerEdgeYDiff`)
   and port the five processors to `src/alg/layered/intermediate/` with `@see`, Java method boundaries, every
   branch; `HyperedgeDummyMergerMergeState.ts` for the nested class (M15). The polyline router's six configurations are
   cached static getters (R4). `createdJunctionPoints` is a `Sets.newHashSet` with a `KVector` strategy (membership
   only, R9). R8: `dfs` becomes an explicit-stack loop reproducing the Java visit and `index` order, with a verbatim
   recursive twin in the test file; confirm the other names (`fixCoordinates`, `calculateWestInLayerEdgeYDiff`) are
   loop calls.
2. `src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts`: the five arms `HYPEREDGE_DUMMY_MERGER`,
   `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR`, `HIERARCHICAL_PORT_POSITION_PROCESSOR`, `LONG_EDGE_JOINER`,
   `NORTH_SOUTH_PORT_POSTPROCESSOR` instantiate (`J/intermediate/IntermediateProcessorStrategy.java:244,253,295,298,310`);
   `IntermediateProcessorStrategy.test.ts`'s "ports exactly" case (`:233-239`) counts 30 ported / 29 pending with the
   five names added to its 7e set (T9 adds the sixth); the tally is unchanged.
3. C6: grep each Java for `==`/`!=` between boxed values (`LayerSizeAndGraphHeightCalculator` and the merger compare
   `NodeType`/`PortSide` enums only; state the result). AD-10: journal every hashed container.
4. Tests, colocated per class, L4 (R14): replay every `models/*` and `scenarios/*` row whose stop is `P5/POLYLINE`
   or one of the five processors (any routing; `NORTH_SOUTH_PORT_POSTPROCESSOR` under SPLINES needs T8 for its P5
   prefix only when the stop is after P5 — under SPLINES it is **before** P5, so those rows replay now) with the class
   injected through T3's `Factories`, every other name through the real enums, and assert `compareRouting` (and
   `compareRoutingFullDump` where `expected.dump` exists) is `[]`. `HYPEREDGE_DUMMY_MERGER` rows prove the merger at
   its stop and `P4` rows on hyperedge levels prove it in a BK prefix. The `dfs` twin agrees on every hyperedge row
   and a 5,000-port chain (one node, one port with 5,000 edges to one target port, or the shape that makes the DFS
   deep) passes under `--pool=forks --execArgv=--jitless` while the twin may overflow (tolerated, 7d precedent).
   Rows whose stop is after `P5/POLYLINE` through T4's router (`LONG_EDGE_JOINER`, `NORTH_SOUTH_PORT_POSTPROCESSOR`
   under ORTHOGONAL) replay here with `OrthogonalEdgeRouter` from T4 **only if T4 has landed**; otherwise `it.skip`
   "T4 router" and say so (T10 un-skips).
5. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/p5edges/PolylineEdgeRouter*.ts` (+ tests), `src/alg/layered/intermediate/{HyperedgeDummyMerger,
HyperedgeDummyMergerMergeState,HierarchicalPortPositionProcessor,LayerSizeAndGraphHeightCalculator,LongEdgeJoiner,
NorthSouthPortPostprocessor}.ts` (+ tests), `src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts`,
`src/alg/layered/intermediate/IntermediateProcessorStrategy.test.ts` (the ported-set case only).

## Read-set

The six Java files, `J/intermediate/IntermediateProcessorStrategy.java:184-330`, `src/alg/layered/p5edges/PolylineEdgeRouter.ts`
(T2), `src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts` (T2), `src/alg/layered/intermediate/
{LongEdgeSplitter,NorthSouthPortPreprocessor*}.ts` and tests (the dual processors, pattern), `src/alg/layered/p4nodes/
LinearSegmentsNodePlacer.test.ts` (a loop-twin test, N6), `test/helpers/layered-routing-replay-*.ts` (T3 contract),
`src/alg/layered/options/InternalProperties.ts:295-325`, `decisions.md` R1, R4, R5, R8, R9, R14.

## Architecture decisions

R1 (scope), R4 (getters), R5 (arms in the section), R8 (`dfs` loop + twin), R9, R14, C6, AD-10, M15.

## Interface contract (consumed by T8, T9, T10)

Java names exactly: six classes with a no-argument constructor and `process(layeredGraph, monitor)`;
`PolylineEdgeRouter.getLayoutProcessorConfiguration(graph)`; the five arms return `new <Class>()`. T10's factory arm
is `new PolylineEdgeRouter()`.

## Acceptance criteria

- Given every `P5/POLYLINE` row and every row stopping at one of the five processors, when replayed with the class
  injected, then `compareRouting` is `[]`.
- Given the `dfs` loop and its twin, when run on every hyperedge row and the deep chain, then equal, and the loop
  passes under `--jitless`.
- Given the enum, when `create()` runs for the five members, then an instance; `FINAL_SPLINE_BENDPOINTS_CALCULATOR`
  still throws naming 7e.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
