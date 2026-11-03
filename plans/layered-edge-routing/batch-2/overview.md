<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Orthogonal; polyline and the processors; spline data; NURBS

Four parallel tasks after batch 1, test-first against the `models/*`, `scenarios/*` and `calls/*` rows of the two
routing refs with the class injected through T3's helpers (7b–7d pattern: `runSteps`/`runRoutingPrefix` with a
`Factories` whose `createPhase('P5_EDGE_ROUTING', r)` or `createProcessor(name)` returns the class under test; every
other name goes through the real enums, whose 7b–7d arms instantiate). Write-sets are disjoint by file. T4 and T8
import T2's predicate from `PolylineEdgeRouter.ts`; T5 completes that file. Every task applies R14: no behavioural
literal that is not an oracle row or a twin comparison; a verbatim `X || X` is collapsed with a comment naming the
Java line, everything else stays verbatim.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T4  | `p5edges/orthogonal/**`, `direction/**`, `OrthogonalEdgeRouter` ([brief](T4-orthogonal.md)) | typescript-pro | src/alg/layered/p5edges/orthogonal/**/*.ts + tests, src/alg/layered/p5edges/OrthogonalEdgeRouter.ts + test | T1, T2, T3 | [x] |
| T5  | `PolylineEdgeRouter` and the five non-spline processors ([brief](T5-polyline-and-processors.md)) | typescript-pro | src/alg/layered/p5edges/PolylineEdgeRouter*.ts + tests, src/alg/layered/intermediate/{HyperedgeDummyMerger*,HierarchicalPortPositionProcessor,LayerSizeAndGraphHeightCalculator,LongEdgeJoiner,NorthSouthPortPostprocessor}.ts + tests, src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts (five arms) | T1, T2, T3 | [x] |
| T6  | `SplineSegment` (unstaged), `SplinesMath`, `Rectangle`, the spline router's nested types ([brief](T6-spline-data.md)) | typescript-pro | src/alg/layered/p5edges/splines/{SplineSegment,SplineSegmentEdgeInformation,SplinesMath,Rectangle,SplineEdgeRouterDependency,SplineEdgeRouterSideToProcess}.ts + tests, test/architecture/staged-classes.json | T1, T2, T3 | [x] |
| T7  | `NubSpline`, `NubsSelfLoop` ([brief](T7-nub-spline.md)) | typescript-pro | src/alg/layered/p5edges/splines/{NubSpline*,NubsSelfLoop}.ts + tests | T1, T2, T3 | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green. Each agent uses its own
scratchpad subdirectory (`<scratchpad>/T4/` …); agents never run `npm run coverage` and never commit.
