<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Wire the factory, replay every row, port the three JUnit invariants

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T10): wire edge routing and replay every row`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7e (README), R4, R10, R14. Batches 2–4 proved each class on its rows with the class injected; this task
proves the whole set the way the pipeline uses it. 7d's `src/alg/layered/LayeredPlacementVectors.test.ts` (77 lines)
and `src/alg/layered/p4nodes/BasicNodePlacementTest.test.ts` are the pattern. The entry-point fitness test
(`test/architecture/layered-entry-points.fitness.test.ts:17-28`) names `EdgeRouterFactory` as the 7e entry in its
header comment; it must stay green after wiring (the E1 recipe, never an entry-order import, stop 15).

## Task

1. `src/alg/layered/p5edges/EdgeRouterFactory.ts`: `J/p5edges/EdgeRouterFactory.java:33-70` verbatim —
   `static factoryFor(edgeRoutingStrategy: EdgeRouting): EdgeRouterFactory` with the static `factoryCache` `Map`
   (R4), `create()` returning `new PolylineEdgeRouter()`, `new SplineEdgeRouter()`, else `new OrthogonalEdgeRouter()`;
   implements `ILayoutPhaseFactory<LayeredPhases, LGraph>`; `@see`. Its test asserts the instance class per
   `EdgeRouting` value (`UNDEFINED` → orthogonal, as the Java `default`) and that `factoryFor` caches.
2. `test/architecture/layered-entry-points.fitness.test.ts`: add `'src/alg/layered/p5edges/EdgeRouterFactory.ts'` to
   `ENTRY_POINTS` (after `NodePlacementStrategy.ts`); header comment names 7f as the next entry. Run it in a fresh
   process; a `ReferenceError` is stop 15 (apply the E1 recipe inside the 7e files first: getters, in-function reads).
3. `src/alg/layered/LayeredRoutingVectors.test.ts`: every row of both refs by name through the real factories
   (`createProcessor` = `IntermediateProcessorStrategy.valueOf(name).create()`; `createPhase` maps the five phases to
   the four strategy enums and `EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(r)).create()`), `runRoutingPrefix`
   for pipeline rows, `runSteps` for step rows, `runCall` for `calls` rows with a callers map over the T6/T7 statics,
   `compareRouting`/`compareRoutingFullDump`/`compareCall`; counts from both `rowCounts`, unique ids across the files,
   one `it` per row; the file runs under 25 s alone (stop 11).
4. Un-skip the T4/T5 cases marked "T5 processors"/"T4 router" and the T6 geometry notes; every case must pass.
5. JUnit ports (R10; agent rule: no assertion the Java lacks; the review before the commit checks each against the Java):
   - `test/helpers/edge-route-orthogonal.ts`: `checkEdgeRouteIsOrthogonal(edge, route)` and `isHorizontal` verbatim
     from `JT/p5edges/BasicEdgeRouterTest.java:96-148` (`TOLERANCE = 0.05`, "Route with less than 2 points", the
     alternating check) throwing the same messages; a small structural test.
   - `src/alg/layered/p5edges/BasicEdgeRouterTest.test.ts`: `testOrthogonalEdges` over the replayed `models/*`
     `P5/ORTHOGONAL` rows (the Java's `orthogonalConfigurator`, `:48-52`; the polyline and spline providers are
     commented out upstream `:54-62`), applied per `LEdge` as `JT/issues/Issue726Test.java:60-74` assembles the route
     (source absolute anchor, bend points, target absolute anchor), every edge of every layer's nodes.
   - `src/alg/layered/issues/Issue726Test.test.ts`: `testOrthogonalEdges` verbatim on the row(s) of
     `tickets/layered/726_edgesMissingBendPoints.elkt` at `P5/ORTHOGONAL` (`@TestAfterProcessor(OrthogonalEdgeRouter.class)`).
   - `src/alg/layered/intermediate/LayerSizeAndGraphHeigthCalculatorTest.test.ts` (Java spelling):
     `testAllNodesContained` verbatim (`JT/intermediate/LayerSizeAndGraphHeigthCalculatorTest.java:44-60`, `TOLERANCE
     = 0.1`) over the replayed `models/*` `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR` rows.
   Report the row count per ported test and any test with no row (a recorder gap for the orchestrator).

## Write-set

`src/alg/layered/p5edges/EdgeRouterFactory.ts` + `.test.ts`, `test/architecture/layered-entry-points.fitness.test.ts`,
`src/alg/layered/LayeredRoutingVectors.test.ts`, `test/helpers/edge-route-orthogonal.ts` + `.test.ts`,
`src/alg/layered/p5edges/BasicEdgeRouterTest.test.ts`, `src/alg/layered/issues/Issue726Test.test.ts`,
`src/alg/layered/intermediate/LayerSizeAndGraphHeigthCalculatorTest.test.ts`, the skipped cases in the T4/T5/T6
test files (un-skip only).

## Read-set

`J/p5edges/EdgeRouterFactory.java`, `JT/p5edges/BasicEdgeRouterTest.java`, `JT/issues/Issue726Test.java`,
`JT/intermediate/LayerSizeAndGraphHeigthCalculatorTest.java`, `src/alg/layered/LayeredPlacementVectors.test.ts`
(pattern), `src/alg/layered/p4nodes/BasicNodePlacementTest.test.ts` (row selection pattern),
`test/helpers/layered-routing-replay-*.ts` (T3), `test/helpers/layered-phase-replay-ops.ts:19-24`,
`test/architecture/layered-entry-points.fitness.test.ts`, `src/core/options/EdgeRouting.ts`, `decisions.md` R4, R10,
`.agent-notes/layered-cycles-layers.md` (the enum-cycle observations).

## Architecture decisions

R4 (E1; stop 15), R10 (row selection; no extra assertion), R14, C5/C6 of 7c, B9 of 7b.

## Interface contract (consumed by T11–T14)

`LayeredRoutingVectors.test.ts` names its cases exactly as 7d's does, so that `npx vitest run -t '<row id>'` selects
one row for per-row coverage. The factories and callers objects are local to each test file (T14a/T14b may copy them).

## Acceptance criteria

- Given every row of both refs, when replayed by name through the real factories, then no diff; per-group counts
  equal `rowCounts`; the file runs under 25 s alone.
- Given the three invariants over their rows, when run, then every case passes and no file holds an assertion the
  Java lacks.
- Given the factory, when `create()` runs per `EdgeRouting` value, then the matching router; the enum tally is
  `7b 10 / 7c 10 / 7d 5 / 7e 6 / 7f 19 / 7g 9` with 31 ported.
- Given `npx vitest run test/architecture`, when run after wiring, then the entry-point test is green.

## Observability / Rollback

N/A. Reversible.
