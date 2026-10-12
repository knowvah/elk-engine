<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Property classes + ElkReflect; model interfaces + base impls

Two independent tasks. T7 needs the shims, enums and `core.math` (ported `PropertyTest`); T8
needs the EMF runtime and the property interfaces.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T7 | `Property`, `MapPropertyHolder`, `PropertyHolderComparator`, `GraphFeature`, annotation registries, `ElkReflect` + ported `PropertyTest` | typescript-pro | src/graph/properties/{Property,MapPropertyHolder,PropertyHolderComparator,GraphFeature,AdvancedPropertyValue,ExperimentalPropertyValue}.ts, src/graph/util/ElkReflect.ts (+ tests) | T3, T4, T5 | [x] |
| T8 | ElkGraph interfaces, type guards, `ElkGraphPackage` constants, base impls | typescript-pro | src/graph/{EMapPropertyHolder,ElkGraphElement,ElkShape,ElkLabel,ElkConnectableShape,ElkNode,ElkPort,ElkEdge,ElkBendPoint,ElkEdgeSection,ElkGraphFactory,ElkGraphPackage}.ts, src/graph/impl/{EMapPropertyHolderImpl,ElkGraphElementImpl,ElkShapeImpl,ElkLabelImpl,ElkBendPointImpl,ElkPropertyToValueMapEntryImpl}.ts (+ tests) | T3, T6 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
