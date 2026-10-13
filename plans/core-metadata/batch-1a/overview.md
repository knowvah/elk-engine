<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1a — Option enums, util closure, progress monitor

Four independent hand ports that the option data classes (batch 2–3) and the generated
`CoreOptions` (T14) import. Runs in parallel with batch 1b; write-sets are disjoint.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | 11 simple `core.options` enums | typescript-pro | src/core/options/{Alignment,EdgeCoords,EdgeLabelPlacement,EdgeRouting,EdgeType,HierarchyHandling,LabelSide,PortAlignment,PortConstraints,ShapeCoords,TopdownNodeTypes}.ts (+ .test.ts) | — | [x] |
| T2 | Option-set enums | typescript-pro | src/core/options/{ContentAlignment,NodeLabelPlacement,PortLabelPlacement,SizeOptions}.ts (+ .test.ts) | — | [x] |
| T3 | `Pair`, `ExclusiveBounds`, `IFactory`, `InstancePool`, `GraphAdapters` | typescript-pro | src/core/util/{Pair,ExclusiveBounds,IFactory,InstancePool}.ts, src/core/util/adapters/GraphAdapters.ts (+ .test.ts) | — | [x] |
| T4 | Progress monitor interfaces + `LoggedGraph` | typescript-pro | src/core/util/{IElkCancelIndicator,IElkProgressMonitor,LoggedGraph}.ts, src/java/lang/ClassCastException.ts (+ .test.ts) | — | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
