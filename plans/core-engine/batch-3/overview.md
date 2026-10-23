<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Resolver, Random

T9 needs `ElkUtil` complete (T6); T10 is the second link of the codegen chain (after T8). Disjoint write-sets; both
run in parallel.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T9 | `LayoutAlgorithmResolver` (started early, see journal) | typescript-pro | src/core/data/LayoutAlgorithmResolver.ts (+ test) | T1, T6 | [x] |
| T10 | `RandomLayoutProvider`; un-hold Random; Random tripwires | typescript-pro | src/core/util/RandomLayoutProvider.ts (+ test), tools/melk/config.ts, src/core/options/{RandomLayouterOptions,CoreOptions}.ts (generated), test/melk/**, src/graph/json/JsonMetaDataConverter.test.ts, test/helpers/mission5-stand-ins.ts | T8 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
