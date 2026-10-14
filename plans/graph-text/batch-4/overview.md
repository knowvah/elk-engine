<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Parser and linker core

Two independent tasks with disjoint write-sets: T15 is the hand-written recursive-descent parser (one method
per grammar rule, D8) producing an ElkGraph with *unresolved* cross references recorded as nodes, plus value
conversion, positions and parse-time diagnostics; T16 is the Xtext eager linker core that resolves such
recorded references through the scope provider. They meet only through the T7 adapter interfaces
(`ICrossReferenceNode`, `INodeModel`), so neither imports the other. Depends on batch 3 (T13 converters,
T14 scoping) and transitively on 2a/2b.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T15 | `ElkGraphParser`: recursive-descent parser, value conversion, positions, reference records | typescript-pro | src/graph/text/parser/{ElkGraphParser,ElkGraphParserEdges,ParseRecords}.ts (+ .test.ts) | T3, T7, T9, T10, T11, T13 | [x] |
| T16 | Xtext linking core: `Linker`, `DefaultLinkingService`, diagnostics | typescript-pro | src/xtext/linking/**, src/xtext/diagnostics/** except Severity.ts (+ .test.ts) | T14, T7 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
