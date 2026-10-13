<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — `JsonImporter` core

**Agent:** typescript-pro · **Commit:** `feat(T11): add the jsonimporter core`

## Context
J3 splits the importer into three files; this task writes the class file: fields
(`JsonImporter.xtend:53-76` — BiMaps/Maps per AD-10: `HashBiMap`/`Maps.newHashMap` keyed by typed
ids and by structural `JsonObject` equality), `transform` (85-97), `getInputModel`, `clearMaps`,
`transformChildNodes`, `transformNode`, `transformProperties`, `transformIndividualSpacings`,
`setOption`, `transformLabels`, `transformPorts`, `transformPort`, `transformShapeLayout`,
`doubleValueValid`, `shapeById`, `idByElement`, `register` x4, `recordCoordinateModes`,
`recordGlobalCoords`, `shapeAncestor`, `jsonParent`, `originalParent`, `globalX/Y`,
`shapeCoordsMode`, `edgeCoordsMode` (743-864). Edges (148-425) are T14; `transferLayout`
(549-741) is T16 — this task leaves the calls to them out and **exports a non-exported-to-index
state interface** (`JsonImporterState`, module-private to `src/graph/json`) that T14/T16 consume.

## Task
TDD. Port the members above (every branch; `dispatch` per §6.5/§8). Option values go through
`LayoutMetaDataService.getInstance().getOptionDataBySuffix` + `parseValue` with the **raw** string
(`stringVal`, J2); unknown keys and null parses are skipped (462-470). Properties: `layoutOptions`
wins over legacy `properties` (430-434). Tests compare against the edge-free `import` rows of
`graph-json.json` by building the same canonical ElkGraph tree in TS (helper colocated in the test).
`transform` must not yet call `transformEdges` — journal that the wiring lands in T14.

## Write-set
`src/graph/json/JsonImporter.ts`, `src/graph/json/JsonImporter.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonImporter.xtend:1-147,427-548,743-866`
- `test/golden/refs/java/graph-json.json` (`import`; `<G>` shape in `GraphJsonVectors.java` header)
- `src/graph/json/JsonAdapter.ts` (T9), `src/gson/*`, `src/guava/{HashBiMap,Maps}.ts`,
  `src/graph/util/ElkGraphUtil.ts` (note: Java `createLabel(text, parent)` is TS
  `createLabelWithText`), `src/core/data/LayoutMetaDataService.ts`, `src/core/util/IndividualSpacings.ts`
- `../decisions.md#j3--file-splits-refined-in-phase-5`, `#j5--quirks-preserved`, `#j10--test-setup`

## Interface contract (consumed by T14, T15, T16)
```ts
export class JsonImporter { transform(graph: unknown): ElkNode; getInputModel(): unknown; transferLayout(graph: ElkNode): void /* T16 */ }
export interface JsonImporterState { /* the maps and helpers T14/T16 need; not re-exported */ }
```

## Acceptance criteria
- Given each edge-free `import` row, then the TS canonical tree equals the recorded one, or the
  exception class + message match.
- Given duplicate ids and equal JSON node objects, then overwrite / `HashBiMap` IAE as recorded (J5).
- Given a numeric option value `10` vs `10.0`, then `parseValue` receives `"10"` vs `"10.0"`.
- Given `JsonImporter.ts`, then ≤ 500 lines and lizard clean.

## Quality bar
README gates; ≥ 95% coverage of the file; `@see` on the class; J10 test setup.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No edges, sections or `transferLayout` code (T14, T16). No new sibling files.
