<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Orthogonal routing: `p5edges/orthogonal`, `direction`, `OrthogonalEdgeRouter`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4): port orthogonal edge routing`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T4/`.

## Context

Mission 7e (README), R1, R4, R6, R7, R9. The default router. 2,774 Java lines: `OrthogonalEdgeRouter` 297
(configurations `:59-216`, `process` `:217-297` with its `float xpos`), `OrthogonalRoutingGenerator` 564 (ctor `:129`,
`routeEdges` `:159`, `minimumHorizontalSegmentDistance` `:248`, `minimumDifference` `:261`, `createHyperEdgeSegments`
`:298`, `createDependencyIfNecessary` `:325`, `countConflicts` `:397`, `countCrossings` `:436`, cycle breaking
`:455-492`, `topologicalNumbering` `:493`), `HyperEdgeSegment` 473 (comparable by `mark`, `equals`/`hashCode` on it
`:436-455`, `insertSorted` `:146`, `recomputeExtent` overloads `:341,349`, split `:370-420`),
`HyperEdgeSegmentDependency` 184 (+ nested `DependencyType` `:35`), `HyperEdgeSegmentSplitter` 466 (+ nested
`FreeArea` `:430`, `AreaRating` `:452`; `assert` `:440`), `HyperEdgeCycleDetector` 275 (private ctor with
`assert false` `:43-44`; `detectCycles` `:62`, `computeLinearOrderingMarks` `:148` with `Sets.newTreeSet` `:152` and
the `random.nextInt` draw `:205`, `updateNeighbors` `:235`), `direction/` 512 (`BaseRoutingDirectionStrategy`
`:38-191` with `createdJunctionPoints` and `forRoutingDirection` `:57`; three strategies; `RoutingDirection`).
`OrthogonalRoutingGenerator.routeEdges` calls the staged `DebugUtil.logDebugGraph` (`:190-215`) behind
`debugPrefix != null && monitor.isLoggingEnabled()`: `src/alg/layered/DebugUtil.ts:69` (`logDebugGraphHyperedges`)
throws naming 7f; keep the guarded call verbatim. The `IntermediateProcessorStrategy` members the configurations name
exist (the 7f/7g ones throw on `create()`, which no replay reaches).

## Task

1. Port the 11 files to `src/alg/layered/p5edges/orthogonal/`, `…/orthogonal/direction/` and
   `src/alg/layered/p5edges/OrthogonalEdgeRouter.ts` with `@see`, Java method boundaries, every branch. Splits
   (push-forward, journal in the hand-back): `OrthogonalRoutingGenerator` over 500 TS lines → sections at method
   boundaries (`…Conflicts.ts`: `countConflicts`, `countCrossings`, `minimumDifference`; `…Cycles.ts`: the cycle
   breaking and `topologicalNumbering`), facade keeps `routeEdges`; nested types in prefixed files
   (`HyperEdgeSegmentDependencyDependencyType.ts`, `HyperEdgeSegmentSplitterFreeArea.ts`, `…AreaRating.ts`).
   `OrthogonalEdgeRouter`'s eight `LayoutProcessorConfiguration` constants are cached static getters (R4,
   `src/alg/layered/p4nodes/SimpleNodePlacer.ts:29-47`); `PRED_EXTERNAL_WEST_OR_EAST_PORT` is imported from T2's
   `PolylineEdgeRouter.ts`. `xpos` goes through `Float32.add`/`fromDouble` (`src/java/lang/Float32.ts:28-48`), R6.
   `Stream<Double>.sorted().distinct()` (`:248-262`) through `DoubleCompare.compare` and `Double.equals` semantics.
   `Sets.newTreeSet` (`src/guava/Sets.ts:175`) with `HyperEdgeSegment.compareTo`; `portToEdgeSegmentMap` a `Map`
   (lookup only); `createdJunctionPoints` a `Sets.newHashSet` with a `KVector` strategy (membership only, R9);
   `random.nextInt(bound)` from `InternalProperties.RANDOM` (`src/java/util/Random.ts:122`), R7. The Java `assert`
   lines omitted with a comment naming the line.
2. C6: grep each Java for `==`/`!=` between boxed values (`List<Double>`/`Double` locals in the generator and the
   splitter are the candidates); state the result. AD-10: journal every hashed container with its verdict (R9 lists
   the expected ones). R8: confirm no method recurses (`breakCriticalCycles`, `split`, `updateDependencies` are
   loop calls); say so.
3. Tests, colocated per class, L4 (R14): replay every `models/*` and `scenarios/*` row whose stop is `P5/ORTHOGONAL`
   or `LONG_EDGE_JOINER`/`NORTH_SOUTH_PORT_POSTPROCESSOR` under ORTHOGONAL **up to the P5 stop** (the after-P5
   stops need T5's processors: write those cases, `it.skip` with the reason "T5 processors", T10 un-skips) with
   `OrthogonalEdgeRouter` injected through T3's `Factories` (`runSteps` for step rows, `runRoutingPrefix` for pipeline
   rows; `HYPEREDGE_DUMMY_MERGER` rows also need T5: skip likewise) and assert `compareRouting` (and
   `compareRoutingFullDump` where `expected.dump` exists) returns `[]`; `unnecessaryBendpoints`, `mergeEdges`
   (after T5), spacing and `feedbackEdges` variants included. Unit cases for `HyperEdgeSegment`, the dependency,
   the splitter, the cycle detector and the direction strategies only where a `calls/*` or `scenarios/*` row gives the
   literal, or where the case is structural (enum ordinals, exception classes, `compareTo` on `mark`).
4. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/p5edges/orthogonal/**/*.ts` (+ tests), `src/alg/layered/p5edges/OrthogonalEdgeRouter.ts` (+ test).

## Read-set

The 11 Java files, `J/graph/LGraphUtil.java:223` (`placeNodesHorizontally`; TS
`src/alg/layered/graph/LGraphUtilLayers.ts:22`), `src/alg/layered/p5edges/PolylineEdgeRouter.ts` (T2 stub),
`src/alg/layered/DebugUtil.ts`, `src/alg/layered/p4nodes/SimpleNodePlacer.ts:1-60` (getter pattern),
`src/alg/layered/p4nodes/bk/BKNodePlacer.ts` and `.test.ts` (a comparable port and its row test),
`test/helpers/layered-routing-replay-*.ts` (T3 contract), `src/java/lang/{Float32,DoubleCompare}.ts`,
`src/java/util/Random.ts:100-140`, `src/guava/{Sets,Iterables}.ts`, `decisions.md` R4, R6, R7, R9, R14.

## Architecture decisions

R1, R4 (getters; the predicate shared), R6 (`float xpos`, boxed-double streams, asserts), R7, R9, R14, C6, AD-10.

## Interface contract (consumed by T8, T10)

Java names exactly: `OrthogonalEdgeRouter` with a no-argument constructor, `getLayoutProcessorConfiguration(graph)`
and `process(layeredGraph, monitor)`; `OrthogonalRoutingGenerator(direction, edgeSpacing, debugPrefix)` with
`routeEdges(monitor, layeredGraph, sourceLayerNodes, sourceLayerIndex, targetLayerNodes, startPos)`;
`RoutingDirection` enum with `values()`/`valueOf`. T10's factory arm is `new OrthogonalEdgeRouter()`.

## Acceptance criteria

- Given every `P5/ORTHOGONAL` row, when replayed with the router injected, then `compareRouting` is `[]` (bend
  points, junction points, node x, layer sizes, graph size within 1e-6).
- Given the rows that need a T5 processor, when run, then they are skipped with the T5 reason and nothing else is
  skipped.
- Given the hand-back, when read, then it states the C6 result, the AD-10 verdicts and the recursion check.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
