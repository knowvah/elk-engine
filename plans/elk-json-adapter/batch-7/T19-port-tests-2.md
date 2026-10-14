<!-- SPDX-License-Identifier: EPL-2.0 -->

# T19 — Port `ExportTest`, `IndividualSpacingsTest`, `SectionsTest`, `TransferLayoutTest`

**Agent:** typescript-pro · **Commit:** `test(T19): port the export, spacing, section and transfer tests`

## Context
The remaining 13 layout-free methods. Three methods in these files need a layout algorithm and are
deferred unchanged (J6); `EdgeCoordsTest` (1 method) is deferred as a whole file.

## Task
Port, one TS file per Xtend file, colocated in `src/graph/json/`: `ExportTest` (6),
`IndividualSpacingsTest` (2 of 3), `SectionsTest` (3 of 4), `TransferLayoutTest` (2 of 3). J10 setup;
`CoreOptions.RANDOM_SEED` and other constants from the generated `CoreOptions`; `Maybe` from T2;
`JsonParser`/`Gson` from `src/gson`. Each file's header names its deferred methods and missions; the
`TransferLayoutTest` header also records the wholly deferred `EdgeCoordsTest`:
- `IndividualSpacingsTest.importTest` → 7h (layered); `EdgeCoordsTest` → 7h (layered);
- `SectionsTest.preserveSectionIdsTest` → 5 (random);
- `TransferLayoutTest.transferLayoutEdgeSectionExistsTest` → 5 (random).
No skipped or placeholder bodies.

## Write-set
`src/graph/json/{ExportTest,IndividualSpacingsTest,SectionsTest,TransferLayoutTest}.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/{ExportTest,IndividualSpacingsTest,SectionsTest,TransferLayoutTest,EdgeCoordsTest}.xtend` (`EdgeCoordsTest` for the header note only)
- `src/graph/json/ElkGraphJson.ts`, `src/graph/json/JsonImporter.ts` (`transferLayout`), `src/gson/**`
- `../decisions.md#j6--layout-dependent-tests`, `#j10--test-setup`

## Interface contract
None consumed later.

## Acceptance criteria
- Given the 13 methods, then each is ported with assertions unchanged and passes.
- Given each header, then it names the deferred methods with their missions (4 methods, J6).
- Given `ExportTest`'s duplicate-id case, then the `_g` assertion holds with the builder's unseeded
  `Random` (the test checks a substring only).

## Quality bar
README gates; stop 10 if any assertion would need to change.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No source edits.
