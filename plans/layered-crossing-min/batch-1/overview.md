<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Order recorder, entry-point gate, replay foundation

Three parallel tasks with disjoint write-sets. T1 records every expectation the mission will replay (AD-13 first).
T2 applies the E1 recipe before any arm is wired and turns the fresh-process import probe into a fitness test.
T3 builds the TS twin of T1's row format on top of the 7b helpers. T3 consumes T1's header contract (below), not its
output; it runs on the 7b rows until T1 lands.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T1  | Oracle recorder `LayeredOrderVectors` and `layered-order.json` ([brief](T1-order-recorder.md)) | java-architect | tools/vectors/{LayeredOrderVectors.java,layered-order-vectors.sh}, test/golden/refs/java/layered-order.json, test/golden/inputs/** (new vendored models), manifest, test/golden/algorithm-refs.test.ts | — | [x] |
| T2  | E1 preparation and the entry-point fitness test ([brief](T2-entry-points.md)) | typescript-pro | tools/melk/config.ts, src/alg/layered/options/LayeredMetaDataProvider.ts (generated), test/architecture/layered-entry-points.fitness.test.ts | — | [x] |
| T3  | Order replay helpers ([brief](T3-order-replay.md)) | typescript-pro | test/helpers/layered-order-replay-{rows,dump,compare}.ts + tests | — | [x] |

The batch is done when all three tasks pass their acceptance criteria and the README gates are green. Agents never run
`npm run coverage` and never commit.
