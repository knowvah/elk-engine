<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — Importer edges and sections

**Agent:** typescript-pro · **Commit:** `feat(T14): import edges and edge sections`

## Context
J3's second importer file: `JsonImporter.xtend:148-425` — `transformEdges`,
`transformPrimitiveEdge`, `transformPrimitiveEdgeLayout`, `transformEdge`, `transformEdgeSections`
(87 lines, CCN ~14: split per the standing rule), `fillEdgeSectionCoordinates`. Functions over
T11's `JsonImporterState`, in Java order.

## Task
TDD. Port the members above, every branch, with J5's quirks: missing section/bend-point coordinate
→ `TypeError` (null unboxing, D10); section references across edges resolve only if registered
earlier in traversal (366-379); the single-section special case (387-393); `HashMultimap` use
(313-314) per `src/guava/HashMultimap.ts`; `+=` on EList as `add`. Wire `transform` in
`JsonImporter.ts` to call `transformEdges` exactly where the Xtend does (one-line edit; nothing else
in that file). Tests: every `import` row with edges, via `JsonParser` + `new JsonImporter().transform`.

## Write-set
`src/graph/json/JsonImporterEdges.ts`, `src/graph/json/JsonImporterEdges.test.ts`,
`src/graph/json/JsonImporter.ts` (the wiring call only).

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonImporter.xtend:85-97,148-425`
- `src/graph/json/JsonImporter.ts` (T11; state interface), `test/golden/refs/java/graph-json.json`
- `src/guava/HashMultimap.ts`, `src/graph/util/ElkGraphUtil.ts` (`createEdge`, `createEdgeSection`,
  `createBendPoint`, `updateContainment`)

## Interface contract (consumed by T15, T16)
`transformEdges(state, jsonObj)` etc. — module functions, not re-exported from `src/index.ts`.

## Acceptance criteria
- Given every `import` row with edges, then the canonical tree or exception class + message match.
- Given sections `s1` and `44` linked in `SectionsTest.edgeSectionTest`'s input, then incoming/
  outgoing shapes and sections match the vector.
- Given `JsonImporterEdges.ts`, then ≤ 500 lines, lizard clean, ≥ 95% coverage.

## Quality bar
README gates; `@see` to `JsonImporter.xtend` on the module.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `transferLayout` (T16). No other edits to `JsonImporter.ts`.
