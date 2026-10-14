<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — `transferLayout` replay vectors (`graph-json-transfer.json`)

**Agent:** java-architect · **Commit:** `test(T4): record transferlayout replays from the oracle jvm`

## Context
Four ported tests need a layout algorithm that is not ported yet (J6). To test `transferLayout`
(about 200 Xtend lines of coordinate-mode logic) now, the JVM lays the graphs out, and this task
records (a) the post-layout geometry of every element and (b) the JSON that `transferLayout`
writes. T16 applies (a) in TS and must reproduce (b) byte for byte.

## Task
1. `tools/vectors/transfer-scenarios/`: the inputs of `EdgeCoordsTest` (`EdgeCoordsTest.xtend`; the
   6 shape/edge coordinate-mode variants it loops over), `IndividualSpacingsTest.importTest`,
   `SectionsTest.preserveSectionIdsTest`, `TransferLayoutTest.transferLayoutEdgeSectionExistsTest`,
   plus 2–3 extra inputs that hit branches those miss (ROOT/PARENT/CONTAINER modes on nested edge
   labels; an edge whose sections were given at import; junction points). Journal the extras.
2. `tools/vectors/TransferVectors.java` + `transfer-vectors.sh <outDir>`: for each case, as the test
   does — `ElkGraphJson.forGraph(jsonObject).rememberImporter(maybe).toElk()`, lay out with
   `RecursiveGraphLayoutEngine` (the algorithm the test sets; `BasicProgressMonitor`), then:
   - record **geometry**: for every node/port/label (keyed by a stable path of identifiers, e.g.
     `n1/p2`, labels by parent path + index) `x, y, width, height`; for every edge its sections in
     order, each with `importedId` (the id of the section object that existed at import, by identity,
     or `null` for a layout-created section), `identifier`, start/end/bend points,
     incoming/outgoing shape paths, incoming/outgoing section indices; junction points; containment
     (the edge's containing node after layout);
   - call `importer.transferLayout(root)` and record the mutated input as compact Gson text
     (`new Gson().toJson(jsonObject)`) — this is what the tests compare.
   Random algorithm cases use the test's seed (or the default) — record it.
3. Run twice; byte-identical (layered/random are deterministic with fixed seeds — if not, stop 6).

## Write-set
`tools/vectors/TransferVectors.java`, `tools/vectors/transfer-vectors.sh`,
`tools/vectors/transfer-scenarios/*`, `test/golden/refs/java/graph-json-transfer.json`.

## Read-set
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.graph.json.test/src/org/eclipse/elk/graph/json/test/{EdgeCoordsTest,IndividualSpacingsTest,SectionsTest,TransferLayoutTest}.xtend`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonImporter.xtend:549-864`
- `tools/vectors/metadata-vectors.sh`, `tools/oracle/harness/CaseRunner.java:44-63` (layout call)
- `../decisions.md#j6--layout-dependent-tests`

## Interface contract (consumed by T16)
```json
{ "elkCommit": "…", "gsonVersion": "2.11.0",
  "cases": [ { "name": "…", "input": "<scenario file>", "algorithm": "…", "seed": n | null,
    "geometry": { "shapes": { "<path>": {"x":…,"y":…,"width":…,"height":…} },
                  "edges": { "<edgeId>": { "container": "<path>", "junctionPoints": [[x,y]…] | null,
                    "sections": [ { "importedId": "…" | null, "identifier": "…" | null,
                      "start": [x,y], "end": [x,y], "bends": [[x,y]…],
                      "incomingShape": "<path>" | null, "outgoingShape": "<path>" | null,
                      "incomingSections": [i…], "outgoingSections": [i…] } ] } } },
    "transferredText": "…" } ] }
```
Doubles as Java `Double.toString` text (strings) so no precision is lost; document in the header.

## Acceptance criteria
- Given the 6 `EdgeCoordsTest` variants and the 3 other test graphs, then each has a case whose
  `transferredText` equals what the Xtend test compares (spot-check one against the test's expected
  JSON with `JsonObject.equals`, recording the result in the journal).
- Given a section that existed at import, then its `importedId` is that section's id.
- Given two runs, then the file is byte-identical; existing refs unchanged.

## Quality bar
README gates; `shellcheck` clean; lizard clean on the Java.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No Gson/OpenJDK/Guava source. No edits to existing vector files, scripts or oracle patches.
