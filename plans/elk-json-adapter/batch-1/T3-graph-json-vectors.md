<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — `graph.json` import/export/converter JVM vectors (`graph-json.json`)

**Agent:** java-architect · **Commit:** `test(T3): record graph.json import and export from the oracle jvm`

## Context
The importer, exporter and converter ports (T9, T11–T15) compare against these recordings, written
before any TS (AD-13). They pin exact error texts and exception classes (J5), export text per flag
combination (J8), the id-collision suffix under seed 1 (J4) and the Java `toString` text of every
option value type.

## Task
1. Fixture inputs under `tools/vectors/graph-json-scenarios/` (one `.json` per scenario, or one
   JSONL file — journal the choice). Cover, at minimum:
   - **import errors** (each message site, `JsonAdapter.xtend:38,47`, `JsonImporter.xtend:153,192,
     195-196,206,210-211,218-219,298-299,366-367,378-379,403,412,540,564,584-585`,
     `ElkGraphJson.java:123-124`): one input per message, plus the non-ELK exception paths of J5
     (missing section coordinate → NPE, `HashBiMap` duplicate value → IAE, `asString` on null/object
     → the Gson exception, malformed strict input → `JsonIOException`/`JsonSyntaxException`).
   - **import successes**: nodes/ports/labels nesting; numeric and string ids incl. `3`, `3.0`,
     `2147483648`; layoutOptions vs legacy `properties` (both present: layoutOptions wins); option
     values given as numbers, strings, booleans; unknown option keys; individual spacings; primitive
     and extended edges; sections linked across edges (`incomingSections`/`outgoingSections`, ids
     `44`/`"s1"`); the single-section special case (`JsonImporter.xtend:387-393`); junction points;
     edge/shape coordinate-mode options; duplicate ids.
   - **export**: each success fixture exported with every combination of the 6 builder flags
     (`ElkGraphJson.java:162-167`) — or a pairwise-covering subset of ≥ 16 combos incl. the oracle's
     (`CaseRunner.java:71-78`), journal which — through `ElkGraphJson.forGraph(root)…toJson()`;
     id-collision fixtures (duplicate identifiers, missing identifiers) under system property
     `org.eclipse.elk.graph.json.exportSeed=1` (patch 0001); exporter quirk: an edge whose endpoint
     is not in the exported graph (J5) → recorded exception.
   - **optionText**: for each value type reachable through `CoreOptions` (double, int, boolean,
     string, enum, `EnumSet`, `KVector`, `KVectorChain`, `ElkPadding`, `ElkMargin`,
     `IndividualSpacings`), the string the exporter writes (`JsonExporter.xtend:321,342`).
   - **converter**: `JsonMetaDataConverter.toJson` for every option, category and algorithm in the
     `LayoutMetaDataService` registered with `CoreOptions` only (isolated loader — see
     `MetaDataVectors.java`), as compact Gson text; plus one row calling `toJson` with an
     `ILayoutMetaData` of none of the three types (the Xtend dispatcher's exception).
2. `tools/vectors/GraphJsonVectors.java` + `graph-json-vectors.sh <outDir>` (copy
   `metadata-vectors.sh`'s structure; classpath = oracle jars + Gson 2.11.0 + the third-party jars
   the oracle needs; pinned-commit check). Each import row records either the resulting ElkGraph as
   a canonical tree (identifiers, geometry, properties as `{id, text}` in `getAllProperties()` order,
   labels, edges with sections/bend points) or `throws{class, message}`. Each export row records
   the exact output text. Schema in the Java file header.
3. Run twice; byte-identical; existing refs unchanged.

## Write-set
`tools/vectors/GraphJsonVectors.java`, `tools/vectors/graph-json-vectors.sh`,
`tools/vectors/graph-json-scenarios/*`, `test/golden/refs/java/graph-json.json`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/*` (all six)
- `tools/vectors/{metadata-vectors.sh,MetaDataVectors.java}` (classpath, isolated service loader)
- `tools/oracle/harness/CaseRunner.java:44-78`, `tools/oracle/patches/0001-*.patch`
- `../decisions.md#j4--exporter-random`, `#j5--quirks-preserved`

## Interface contract (consumed by T9, T11–T15, T17, T19)
```json
{ "elkCommit": "…", "gsonVersion": "2.11.0", "exportSeed": 1,
  "import":  [ { "id": "…", "input": "<fixture file>", "lenient": true, "graph": <G> } | { …, "throws": { "class": "…", "message": "…" } } ],
  "export":  [ { "id": "…", "input": "…", "flags": { "prettyPrint": b, "shortLayoutOptionKeys": b, "omitZeroPositions": b,
                 "omitZeroDimension": b, "omitLayout": b, "omitUnknownLayoutOptions": b }, "text": "…" } | { …, "throws": {…} } ],
  "optionText": [ { "option": "…", "valueInput": "…", "text": "…" } ],
  "converter":  [ { "kind": "option|category|algorithm", "id": "…", "text": "…" } ] }
```
`<G>` is a canonical ElkGraph tree; document its exact shape in the Java header (T11/T14 build
the same tree from TS).

## Acceptance criteria
- Given each message site listed above, then one `import` row records its exact message and class.
- Given the export fixtures, then rows exist for the oracle's flag combination and ≥ 15 others, and
  the id-collision rows carry `_g` suffixes generated under seed 1.
- Given two runs, then `graph-json.json` is byte-identical; existing refs unchanged.

## Quality bar
README gates; `shellcheck` clean; lizard clean on the Java (split into helper classes inside the
single file or move data to fixtures to stay ≤ 500 lines).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No Gson/OpenJDK/Guava source. No edits to existing vector files, scripts or oracle patches.
