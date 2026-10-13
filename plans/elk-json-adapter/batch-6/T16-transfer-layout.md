<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — `transferLayout` and the replay test

**Agent:** typescript-pro · **Commit:** `feat(T16): add jsonimporter transferlayout`

## Context
J3's third importer file: `JsonImporter.xtend:549-741` — `transferLayout` (two passes over
`ElkGraphUtil.propertiesSkippingIteratorFor(graph, true)`), `transferLayoutInt1` (node, port,
Object), `transferLayoutInt2` (edge: 102 lines, CCN ~14 — split per the standing rule; label;
Object), `transferShapeLayout`, `adjustX`/`adjustY` (shape and edge overloads, `switch` on the
coordinate mode). J6: the four layout-dependent tests are deferred; this task proves the code now
by replaying JVM-recorded post-layout geometry (T4).

## Task
TDD.
1. `JsonImporterLayoutTransfer.ts`: port the members above over T11's `JsonImporterState`, in Java
   order, every branch, J5 quirks (writes are additive; `sections` removed and re-added so it moves
   to the end; existing section JSON objects reused by identity; new ones get id
   `<edgeId>_s<index>`; `container` written when the original parent's edge mode is CONTAINER;
   layout-created label → NPE → `TypeError`; layout-created node/port/edge → the explicit messages).
   `JsonImporter.transferLayout` delegates (one edit in `JsonImporter.ts`).
2. `test/graph-json/transfer-replay.test.ts`: for each `graph-json-transfer.json` case — parse the
   input with `JsonParser`, import with `new JsonImporter().transform(jsonObject)` (T15 runs in parallel); apply the recorded geometry
   (shapes by path; for each edge, rebuild its sections in recorded order — reuse the imported
   section object when `importedId` is set, else create one with `ElkGraphUtil.createEdgeSection` and
   the recorded identifier; set points, bend points, incoming/outgoing shapes and sections, junction
   points, containment); call `transferLayout`; compare `new Gson().toJson(jsonObject)` with
   `transferredText` byte for byte.
3. `JsonImporterLayoutTransfer.test.ts`: synthetic graphs for the branches the replay misses
   (explicit-message throws, additive writes). `TransferLayoutTest` itself is ported in T19.

## Write-set
`src/graph/json/JsonImporterLayoutTransfer.ts`, `src/graph/json/JsonImporterLayoutTransfer.test.ts`,
`src/graph/json/JsonImporter.ts` (delegation only), `test/graph-json/transfer-replay.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonImporter.xtend:549-864`
- `test/golden/refs/java/graph-json-transfer.json` (schema: `TransferVectors.java` header)
- `src/graph/json/{JsonImporter,JsonImporterEdges}.ts`, `src/gson/**`, `src/graph/util/ElkGraphUtil.ts`
  (`propertiesSkippingIteratorFor`), `src/core/options/{ShapeCoords,EdgeCoords}.ts`
- `../decisions.md#j5--quirks-preserved`, `#j6--layout-dependent-tests`

## Interface contract (consumed by T19)
`JsonImporter.transferLayout(graph: ElkNode): void` — mutates the input `JsonObject` in place.

## Acceptance criteria
- Given each of the 6 `EdgeCoordsTest` cases and the 3 other replay cases, then the transferred
  text is byte-identical to `transferredText`.
- Given a node created after import, then `JsonImportException("Node did not exist in input.")`;
  likewise port/edge with their messages.
- Given an edge whose layout cleared its bend points, then the stale `bendPoints` key remains (J5).
- Given `JsonImporterLayoutTransfer.ts`, then ≤ 500 lines, lizard clean, ≥ 95% coverage.

## Quality bar
README gates; `@see` to `JsonImporter.xtend` on the module.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No layout algorithm code. No other edits to `JsonImporter.ts`.
