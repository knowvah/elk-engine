<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1b: EMF factory, C3 moves, C1 scope provider, C6 docs

Runs in parallel with batch 1a (it is split from it only to keep overviews ≤ 5 tasks); no task here depends on 1a,
and the write-sets are disjoint from 1a's and from each other. Only the orchestrator commits, one commit per task.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T4](T4-f1a-emf-factory.md) | F1a: `EDataType`/`EPackage`/`EFactory`, `EcorePackage` literals, `EcoreFactoryImpl` EInt/EDouble/EString | typescript-pro | `src/emf/ecore/{EDataType,EPackage,EFactory,EcorePackage}.ts`, `src/emf/ecore/impl/EcoreFactoryImpl.ts` (+ tests) | — | [x] |
| [T5](T5-c3-moves.md) | C3: stand-ins to `xtext/diagnostics`, `xtext/util`, `xtext/service`, `equinox/core/runtime`; D7 boundary rule | typescript-pro | see task | — | [x] |
| [T6](T6-c1-scope-provider.md) | C1: the linking bundle exposes the scope provider; the serializer uses it | typescript-pro | `src/graph/json/text/{linking/ElkGraphJsonLinkingServices,ElkGraphJsonTextServices,serializer/ElkGraphJsonSerializer,serializer/ElkGraphJsonCrossReferenceSerializer}.ts` | — | [x] |
| [T7](T7-c6-architecture-docs.md) | C6: `port-map.md` graph.json.text section; `inventory.md` row; the `src/xtext` importer sentence | documentation-engineer | `docs/architecture/{port-map,inventory}.md` | — | [x] |

Interface: T4's `EFactory` contract is consumed by T8 (batch 2). Batch gate: README "Quality gates".
