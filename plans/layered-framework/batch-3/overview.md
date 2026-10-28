<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — `LayeredSpacings`; `LGraphAdapters` and `Tarjan`

Two independent tasks on top of the T3 model, run in parallel (disjoint write-sets).

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T4  | `LayeredSpacings` and the portable `LayeredSpacingTest` cases | typescript-pro | src/alg/layered/options/LayeredSpacings{,.test}.ts, src/alg/layered/LayeredSpacingTest.test.ts | T3 | [x] |
| T5  | `LGraphAdapters` and `Tarjan` (AC6) | typescript-pro | src/alg/layered/graph/{LGraphAdapters,Tarjan}{,.test}.ts (+ M15 nested-type files) | T3 | [x] |

The batch is done when both tasks' acceptance criteria pass and the README gates are green.
