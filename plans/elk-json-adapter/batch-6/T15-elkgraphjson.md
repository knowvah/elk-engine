<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — `ElkGraphJson` and end-to-end vector replay

**Agent:** typescript-pro · **Commit:** `feat(T15): add elkgraphjson`

## Context
The bundle's entry point (`ElkGraphJson.java`, 244 lines): `forGraph(String | JsonObject | ElkNode)`,
`ImportBuilder` (`rememberImporter(Maybe)`, `lenient`, `toElk`) and `ExportBuilder` (6 flags,
`toJson`). This task also replays **every** `import` and `export` row of `graph-json.json` end to end
(the full replay T12 deferred).

## Task
TDD. Port the class, both builders (nested types per C3: file-level classes + `static readonly`
aliases), every branch: `toElk` (lenient by default; non-object top level →
`JsonImportException("Top-level element of the graph must be a json object.")`; reader failure →
`JsonIOException` as recorded), `forGraph(JsonObject)` uses the object **without copying** (tests
mutate it), `toJson` (`GsonBuilder().disableHtmlEscaping()[.setPrettyPrinting()]`). `forGraph`
overloads dispatch on `typeof`/`instanceof` (§6.5). The builder constructs `new JsonExporter()`
(unseeded, J4) and gains **no** API: the replay exports the id-collision rows via
`new JsonExporter(new Random(1))` + `setOptions` + T10's `toJson` (the same calls `toJson` makes),
and every other row via the builder; journal it.

## Write-set
`src/graph/json/ElkGraphJson.ts`, `src/graph/json/ElkGraphJson.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/ElkGraphJson.java`
- `test/golden/refs/java/graph-json.json` (all `import`/`export` rows), `src/gson/**`,
  `src/graph/json/*` (T9, T11, T12), `src/core/util/Maybe.ts` (T2)
- `../decisions.md#j4--exporter-random`, `#j8--comparison-strictness`

## Interface contract (consumed by T16–T19)
`ElkGraphJson.forGraph(text).rememberImporter(maybe).lenient(b).toElk()`;
`ElkGraphJson.forGraph(root).prettyPrint(b).shortLayoutOptionKeys(b).omitZeroPositions(b)
.omitZeroDimension(b).omitLayout(b).omitUnknownLayoutOptions(b).toJson()`.

## Acceptance criteria
- Given every `import` row, when imported through `forGraph(input).lenient(row.lenient).toElk()`,
  then the canonical tree or exception matches.
- Given every `export` row, when its input is imported and exported with its flags (seeded rows via
  `new JsonExporter(new Random(1))`), then the text is byte-identical.
- Given `"[]"`, then `JsonImportException` with the Java message; given strict sloppy JSON, then the
  recorded exception.
- Given `rememberImporter(maybe)`, then `maybe.get()` is the importer used.

## Quality bar
README gates; 100% coverage; `@see` on the class and builders.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No builder API beyond the Java's (J4 seam is on `JsonExporter` only).
