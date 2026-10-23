<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Box B, TopdownSizeApproximator, graph.text stand-ins

T13 finishes Box (same file as T12). T14 is the last link of the codegen chain and empties `PENDING_TYPES`. T15
retires the `.elkt` stand-ins now that all three algorithms are registered (after T12). Disjoint write-sets; all
three run in parallel.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T13 | `BoxLayoutProvider` part B (group packing) (M15) | typescript-pro | src/core/util/BoxLayoutProvider{,Group,Grouping}.ts (+ tests) | T12 | [x] |
| T14 | `TopdownSizeApproximator{,Util}`; `PENDING_TYPES` emptied; final regeneration | typescript-pro | src/core/options/{TopdownSizeApproximator,TopdownSizeApproximatorUtil}.ts (+ tests), tools/melk/config.ts, src/core/options/CoreOptions.ts (generated), test/melk/**, src/graph/json/JsonMetaDataConverter.test.ts | T2, T8, T9, T12 | [x] |
| T15 | Retire the `.elkt` mission-5 stand-ins; replay the 11 deferred rows | typescript-pro | src/graph/text/validation/ElkGraphValidator.test.ts, test/corpus/elkt-sweep.test.ts, test/helpers/mission5-stand-ins.ts (delete) | T12 | [x] |
Batch done when every task's acceptance criteria pass and the README gates are green, including the after-batch-5
checks (no `BOX_GROUPING_PLACEHOLDER`, `PENDING_TYPES` empty).
