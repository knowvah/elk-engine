<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Routing recorder, enum split and stubs, replay foundation

Three tasks with disjoint write-sets; T1 and T3 run in parallel, T2 is a short orchestrator task that lands before
batch 2 ports anything. T1 records every expectation the mission will replay (AD-13 first). T2 splits the processor
enum's `create` chain into a section (R5), writes the mission-internal `PolylineEdgeRouter.ts` predicate stub the
orthogonal and spline routers import, and moves the six 7e arms in the ARMS test. T3 builds the TS twin of T1's row
format on top of the 7d helpers; it consumes T1's **header contract** (below), not its output, and runs on the 7d
rows until T1 lands.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T1  | Oracle recorder `LayeredRoutingVectors`, the two refs, vendored inputs ([brief](T1-routing-recorder.md)) | java-architect | tools/vectors/{LayeredRoutingVectors.java,layered-routing-vectors.sh}, test/golden/refs/java/{layered-routing,layered-routing-steps}.json, test/golden/inputs/tests/layered/{splines,hyperedge_merging,hierarchical_ports}/**, test/golden/inputs/tickets/layered/{726,341,371}_*.elkt, test/golden/inputs/manifest.json, test/golden/algorithm-refs.test.ts | — | [x] |
| T2  | Enum `create` section, predicate stub, ARMS tally ([brief](T2-enum-split-and-stubs.md)) | orchestrator (main session) | src/alg/layered/intermediate/{IntermediateProcessorStrategy,IntermediateProcessorStrategyCreate}.ts + tests, src/alg/layered/p5edges/PolylineEdgeRouter.ts (stub) | — | [x] |
| T3  | Routing replay helpers incl. `calls` ([brief](T3-routing-replay.md)) | typescript-pro | test/helpers/layered-routing-replay-{rows,dump,compare,ops}.ts + tests | — | [x] |

The batch is done when all three tasks pass their acceptance criteria and the README gates are green. Agents never run
`npm run coverage` and never commit; the orchestrator commits per task.
