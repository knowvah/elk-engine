<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Provider and metadata; adapters replay

Two independent tasks, run in parallel (disjoint write-sets). T7 closes dependency cycle 2 (the provider leaves
`PENDING_TYPES` and the options regenerate); T8 replays the `adapters` group.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T7  | `LayeredLayoutProvider`, staged `ElkLayered`, un-pend + regenerate, metadata replay | typescript-pro | see [T7](T7-provider-and-metadata.md#write-set) | T6 | [x] |
| T8  | `adapters` replay | typescript-pro | src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts | T5, T6 | [x] |

The batch is done when both tasks' acceptance criteria pass and the README gates are green; `PENDING_TYPES` is empty.
