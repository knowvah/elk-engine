<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: the four items

Four independent tasks with disjoint write-sets. T1 needs no JVM. T2, T3 and T4 each edit one recorder and regenerate
its ref; the orchestrator runs the recorders one at a time (load), detached under `nice -n 10`. Order suggestion: start
T1 and T3's search (subagents or inline), record T2, then T4, then T3's rows.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T1 | `testValidNodeOrder` on non-vacuous IPP rows | typescript-pro (sonnet) or orchestrator | `src/alg/layered/intermediate/InvertedPortProcessorTest.test.ts` | — | [x] |
| T2 | HPDS two- and three-dummy site rows | orchestrator | `tools/vectors/LayeredPlacementVectors.java`, `test/golden/refs/java/layered-placement.json`, an inventory test if one pins `sites/*` ids | — | [x] |
| T3 | The three splitter arms | orchestrator (+ typescript-pro for the search) | `tools/vectors/LayeredRoutingVectors.java`, `test/golden/refs/java/layered-routing*.json`, `test/helpers/layered-routing-replay-ops.ts` (only for `calls/`), routing count pins, `plans/layered-evidence-gaps/unreached.md` | — | [x] |
| T4 | Port alignment and border-offset scenarios | orchestrator | `tools/vectors/LayeredPipelineVectors.java`, `test/golden/refs/java/layered-pipeline.json` | — | [x] |

Each task ends with its own tests green, the D5 diff clean for its ref, and one commit (squashed in T6).
