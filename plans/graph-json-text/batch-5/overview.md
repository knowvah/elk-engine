<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Linking (re-scoped by D13, 2026-10-16)

T12 (`T12-linking.md`, eager linking under D11 B) is **superseded** by D13 (D11 option A, user 2026-10-16): Xtext lazy
linking and the EMF proxy/resource subset. Plan record: [d13-plan.md](d13-plan.md). Sub-batches run in order; tasks
within a sub-batch have disjoint write-sets and run in parallel.

| Sub | ID | Description | Agent | Writes | Depends On | Done |
|-----|----|-------------|-------|--------|------------|------|
| 5a | T12a | EMF `URI`, `Resource`/`ResourceSet`, EObject proxy surface, `EcoreUtil.resolve` | typescript-pro | src/emf/common/util/URI.ts, src/emf/ecore/resource/**, src/emf/ecore/{EObject,InternalEObject}.ts, src/emf/ecore/impl/BasicEObjectImpl.ts, src/emf/ecore/util/EcoreUtil.ts (+ tests) | — | [x] |
| 5a | T12h | JVM vectors: inverse state and resolution paths | java-architect | tools/vectors/ElkjInverseVectors.java, test/golden/refs/java/graph-json-text-inverse.json | — | [x] |
| 5b | T12b | EMF resolving lists | typescript-pro | src/emf/common/util/BasicEList.ts, src/emf/ecore/util/{EObjectEList,EObjectWithInverseEList,EObjectResolvingEList}.ts (+ tests) | T12a | [x] |
| 5b | T12c | `LazyURIEncoder`, `LazyLinker` | typescript-pro | src/xtext/linking/lazy/{LazyURIEncoder,LazyLinker}.ts (+ tests) | T12a | [x] |
| 5c | T12d | `LazyLinkingResource` | typescript-pro | src/xtext/linking/lazy/LazyLinkingResource*.ts (+ tests) | T12b, T12c | [x] |
| 5c | T12e | ElkGraph resolving lists | typescript-pro | src/graph/impl/{ElkEdgeImpl,ElkConnectableShapeImpl}.ts (+ tests) | T12b, T12h | [x] |
| 5d | T12f | `.elkj` lazy-linker wiring and reference table | typescript-pro | src/graph/json/text/linking/** (+ tests) | T12d, T12e | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green, plus the full layout suite and a
before/after benchmark of edge-endpoint access (d13-plan risk 8).
