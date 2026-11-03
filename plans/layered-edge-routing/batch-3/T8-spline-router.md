<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `SplineEdgeRouter`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T8): port the spline edge router`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T8/`.

## Context

Mission 7e (README), R1, R4, R7, R9, R14. 1,049 Java lines: constants `:81-84` (`SPLINE_DIMENSION`), six
configurations `:88-124` (the N/S postprocessor **before** P5 `:108-111`, the bend-point calculator after P5
`:88-91`), `getLayoutProcessorConfiguration` `:126`, `process` `:183-315` (empty-layers early return `:186`; the
`SplineRoutingMode.SLOPPY` branch; sets `SPLINE_EDGE_CHAIN` and `SPLINE_ROUTE_START` on the start edges `:300-308`),
`createSegmentsAndComputeRanking` `:318`, `clearThenFillMappings` `:361` (`findAndAddSuccessor` `:493` is a loop
call), `computeSloppySpacing` `:461`, `createSplineSegments` `:521`, `createSplineSegmentsForHyperEdges` `:568-653`
(the `upEdges`/`downEdges` `HashSet<Pair<…>>` of R9; `assert false` `:582`), `createDependency` `:655`, `breakCycles`
`:712` with the `random.nextInt` draw `:777`, `updateNeighbors` `:824`, `topologicalNumbering` `:856`, `isStraight`
`:937`, `getEdgeChain` `:941`, `getSplinePath` `:951`, `isNormalNode` `:980`, `isQualifiedAsStartingNode` `:995`.
T6 ported `SplineSegment`, `SplineEdgeRouterDependency` and `SplineEdgeRouterSideToProcess`; T2's
`PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT` is imported (`:211-214`). The result of a `P5/SPLINES` stop is
the segment structure (R3 `splines`), not bend points: T9 computes those.

## Task

1. Port `SplineEdgeRouter.ts` with sections at method boundaries (`SplineEdgeRouterSegments.ts`:
   `clearThenFillMappings`, `findAndAddSuccessor`, `createSplineSegments`, `createSplineSegmentsForHyperEdges`,
   `createDependency`; `SplineEdgeRouterRanking.ts`: `breakCycles`, `updateNeighbors`, `topologicalNumbering`; facade
   keeps the configuration, `process`, `createSegmentsAndComputeRanking`, `computeSloppySpacing`, the chain/path
   getters and the static predicates), `@see`, every branch, Java order. Configurations as cached static getters
   (R4). Containers (R9, journal each): `leftPortsLayer`/`rightPortsLayer`/`selfLoopsLayer` `Set` (LinkedHashSet),
   `edgeToSegmentMap`/`successingEdge` `Map` (lookup), `upEdges`/`downEdges` insertion-ordered `Set<Pair<…>>` (the
   value-hash caveat), `unprocessed` in `topologicalNumbering` `Set` (LinkedHashSet). `random.nextInt(bound)` from
   `InternalProperties.RANDOM` (R7). The `assert false` omitted with a comment. Keep `isQualifiedAsStartingNode` and
   `isNormalNode` static for T9.
2. C6 and R8 checks as in T4 (streams over `splineSegmentsLayer` `:233-235` use `mapToInt`/`max`: integer
   semantics through `Int32`); state the results.
3. Tests, colocated, L4 (R14): replay every `models/*` and `scenarios/*` row whose stop is `P5/SPLINES` with the
   router injected through T3's `Factories` (prefix processors through the real enums: `NORTH_SOUTH_PORT_POSTPROCESSOR`
   before P5 is T5's), assert `compareRouting` (and `compareRoutingFullDump` where `expected.dump` exists) is `[]`:
   the `splines` summaries (chains, segment boxes, ranks, straightness, `xDelta`) and node x positions are the
   proof; `SLOPPY` and layer-spacing-factor variants included. The hyperedge spline rows (`splines/hyperedges/*`,
   `hyperedge_merging/*` under SPLINES) are the R9 proof: a mismatch there is diagnosed with the oracle `--dump`
   (T1's aids) and, if the mechanism is the `Pair` set order, reported as stop 17 with the diagnosis artifact
   (mechanism, origin `file:line`, causal chain, ruled out) — never worked around.
4. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/p5edges/splines/{SplineEdgeRouter,SplineEdgeRouterSegments,SplineEdgeRouterRanking}.ts` (+ tests).

## Read-set

`J/p5edges/splines/SplineEdgeRouter.java`, `J/p5edges/PolylineEdgeRouter.java:62-69`, the T6 and T7 files
(`SplineSegment.ts`, `SplineEdgeRouterDependency.ts`, `SplineEdgeRouterSideToProcess.ts`, `NubSpline.ts` signatures),
`src/alg/layered/p5edges/OrthogonalEdgeRouter.ts` (T4, the getter and `process` shape), `src/alg/layered/options/
{SplineRoutingMode,InternalProperties}.ts`, `src/core/util/Pair.ts:91`, `src/java/util/Random.ts:100-140`,
`test/helpers/layered-routing-replay-*.ts` (T3 contract), `decisions.md` R3, R4, R7, R9, R14.

## Architecture decisions

R1, R3 (what a P5 SPLINES row proves), R4, R7, R9 (the `Pair` set), R14, C6, AD-10, P1.

## Interface contract (consumed by T9, T10)

Java names exactly: `SplineEdgeRouter` with a no-argument constructor, `getLayoutProcessorConfiguration(graph)`,
`process(layeredGraph, monitor)`, `static SPLINE_DIMENSION`, `static isQualifiedAsStartingNode(node)`,
`static isNormalNode(node)`; after `process` every start edge carries `SPLINE_EDGE_CHAIN` and `SPLINE_ROUTE_START`
(`SplineSegment[]`). T10's factory arm is `new SplineEdgeRouter()`.

## Acceptance criteria

- Given every `P5/SPLINES` row, when replayed with the router injected, then `compareRouting` is `[]`.
- Given the hyperedge spline rows, when replayed, then `[]`, or a stop-17 report with the diagnosis artifact.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
