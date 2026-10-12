<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Shims, JVM vectors, property interfaces, enums

Four independent tasks. T2 records the model's behaviour on the JVM before any model code exists
(AD-13, D9); T1/T3/T4 lay the shim and interface files every later task imports.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | Java shims: `IllegalStateException`, `ListIterator`, `LinkedList` | typescript-pro | src/java/lang/IllegalStateException.ts, src/java/util/{ListIterator,LinkedList}.ts (+ .test.ts) | — | [ ] |
| T2 | JVM vectors for the ElkGraph model (`graph.json`) | java-architect | tools/vectors/GraphVectors.java, tools/vectors/graph-vectors.sh, test/golden/refs/java/graph.json | — | [ ] |
| T3 | `Comparable` + `graph.properties` interfaces | typescript-pro | src/java/lang/Comparable.ts, src/graph/properties/{IProperty,IPropertyHolder,IPropertyValueProxy,PropertyMap}.ts | — | [ ] |
| T4 | `EnumSet` shim + `PortSide`, `Direction`, `SizeConstraint` | typescript-pro | src/java/util/EnumSet.ts, src/core/options/{PortSide,Direction,SizeConstraint}.ts (+ .test.ts) | — | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
