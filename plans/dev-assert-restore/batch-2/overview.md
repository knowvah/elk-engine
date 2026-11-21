<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: wraps and new tests

Needs T1 (helper) and T2 (sites live, [census.md](../census.md)). Three parallel subagents (`typescript-pro`, sonnet)
with disjoint write-sets; each task file plus `census.md` is the prompt. Rules for each: edit only the write-set; wrap
only what the census lists; no expected value, tolerance, case list or existing title changes (AD-13; the approval
covers `withAssertions(false, …)` wrapping only); never commit, never run the full suite, never start a JVM. Run the
owned test files before and after, in both modes (`ELK_DEV_ASSERTIONS=off` too), and report per-file counts. A needed
edit outside the write-set comes back to the orchestrator.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T3](T3-end-label-wraps.md) | #32: predicate helper, runner wraps, count, new test | typescript-pro | `test/helpers/unsized-end-labels{,.test}.ts`, the runner files the census names (labels, routing, compound, loops replay helpers), `src/alg/layered/intermediate/EndLabelPreprocessor.test.ts` | T2 | [x] |
| [T4](T4-core-common-sites.md) | #9, #12, #13: wraps and new tests | typescript-pro | `src/core/data/LayoutAlgorithmData.test.ts`, `src/core/data/LayoutCategoryData.test.ts`, `src/core/testing/TestController.test.ts`, `src/core/util/PropertyConstantsDelegator.test.ts`, `src/core/util/InstancePool.test.ts`, `src/alg/common/nodespacing/internal/NodeContext.test.ts`, `src/alg/common/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.test.ts`, `src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts` | T2 | [x] |
| [T5](T5-layered-sites.md) | #21, #22, #23, #40, #116, #123: wraps and new tests | typescript-pro | `src/alg/layered/graph/LGraphUtilExternalPorts.test.ts`, `src/alg/layered/LayeredSiteVectors.test.ts`, `src/alg/layered/graph/LNode.test.ts`, `src/alg/layered/intermediate/HighDegreeNodeLayeringProcessor.test.ts`, `src/alg/layered/options/EdgeLabelSideSelection.test.ts`, `src/alg/layered/p3order/ForsterConstraintResolver.test.ts` | T2 | [x] |

If the census puts a #113 test in a file not listed here (for example `LNode.sites.test.ts`), the orchestrator adds it
to the owning task by site before dispatch. If a #32 runner frame is a helper that T4 or T5 also needs (the site-replay
helpers), the orchestrator moves that file to one task. Batch gate: the union of the census's failing files passes in
both modes; then one orchestrator commit per task.
