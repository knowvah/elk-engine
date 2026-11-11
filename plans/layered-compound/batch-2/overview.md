<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Cross-hierarchy edges, node resizer

Two port tasks with disjoint write-sets run **in parallel**, after T1's ref and T2's helpers land. Neither can change a layout
yet. `CrossHierarchyEdge` and its comparator are only built by the compound processors, which are still staged (H11), and the
`HIERARCHICAL_NODE_RESIZER` enum arm keeps throwing until T8.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T4  | `CrossHierarchyEdge`, `CrossHierarchyEdgeComparator`, the `CROSS_HIERARCHY_MAP` shape ([brief](T4-cross-hierarchy-edge.md)) | typescript-pro | src/alg/layered/compound/{CrossHierarchyEdge,CrossHierarchyEdgeComparator}{,.test}.ts | T1, T2 | [x] |
| T5  | `HierarchicalNodeResizingProcessor` ([brief](T5-hierarchical-node-resizer.md)) | typescript-pro | src/alg/layered/intermediate/HierarchicalNodeResizingProcessor{,.test}.ts | T1, T2 | [x] |

Done when both pass their acceptance criteria, `doCompoundLayout` still throws the staged message, and the README gates are
green.
