<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Placement recorder, entry-point preparation, replay foundation

Three tasks with disjoint write-sets; T1 and T3 run in parallel, T2 is a short orchestrator task that lands before
batch 2 wires anything. T1 records every expectation the mission will replay (AD-13 first). T2 applies the E1 recipe
(N4) before any `NodePlacementStrategy` arm is wired and adds the enum to the entry-point fitness test. T3 builds the
TS twin of T1's row format on top of the 7c helpers; it consumes T1's **header contract** (below), not its output, and
runs on the 7c rows until T1 lands.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T1  | Oracle recorder `LayeredPlacementVectors` and `layered-placement.json` ([brief](T1-placement-recorder.md)) | java-architect | tools/vectors/{LayeredPlacementVectors.java,layered-placement-vectors.sh}, test/golden/refs/java/layered-placement.json, test/golden/inputs/tests/layered/node_placement/**, test/golden/inputs/manifest.json, test/golden/algorithm-refs.test.ts | — | [x] |
| T2  | E1 preparation and the entry-point fitness test ([brief](T2-entry-points.md)) | orchestrator (main session) | tools/melk/config.ts, src/alg/layered/options/LayeredMetaDataProvider.ts (generated), test/architecture/layered-entry-points.fitness.test.ts | — | [x] |
| T3  | Placement replay helpers ([brief](T3-placement-replay.md)) | typescript-pro | test/helpers/layered-placement-replay-{rows,dump,compare,ops}.ts + tests | — | [x] |

The batch is done when all three tasks pass their acceptance criteria and the README gates are green. Agents never run
`npm run coverage` and never commit; the orchestrator commits per task.
