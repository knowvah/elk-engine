<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — `JsonExporter`

**Agent:** typescript-pro · **Commit:** `feat(T12): add the jsonexporter`

## Context
`JsonExporter.xtend` (509 lines). Output key order is insertion order in code order; omission rules
and short option keys decide the text the round-trip compares byte for byte (J7, J8).

## Task
TDD. Port every member (`setOptions`, `export`, `init`, `transformNode`, `transformPort`,
`transformEdges`, `transformEdge`, `transformSection`, `transformLabel`, `transformProperties`,
`transformIndividualSpacings`, `transferShapeLayout`, `createAndRegister` x4, `idByElement` x3,
`getShortOptionKey`, `emptyIfNull`, `isKnown`, `sixDigitRandomNumber`, `padZeroes`, `assertUnique`).
J4: constructor `(random: Random = new Random())` replaces `val RANDOM = new Random()` (489). J5:
`formatError(...)` without `throw` (183, 196) stays — the unknown endpoint then fails in
`JsonPrimitive(null)`. Layout option values are written with the Java `toString` of each value type
(`optionText` vectors). If the file exceeds 500 lines, move Xtend 157-291 (edges, sections) to
`JsonExporterSections.ts` per J3. Tests: the full `export` row replay needs the importer's edges (T14), so it runs in T15. Here, build
ElkGraphs in the test with `ElkGraphUtil` that mirror chosen `export` rows (at least: one per flag,
the oracle's flag set, id collisions under `new Random(1)`, sections/bend points/junction points,
individual spacings, unknown options) and compare the written text to those rows byte for byte
(T8's writer). Journal which rows are mirrored.

## Write-set
`src/graph/json/JsonExporter.ts`, `src/graph/json/JsonExporterSections.ts` (only if needed),
colocated tests.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonExporter.xtend`
- `test/golden/refs/java/graph-json.json` (`export`, `optionText`)
- `src/graph/json/JsonAdapter.ts`, `src/gson/**`, `src/java/util/Random.ts`, `src/guava/{HashBiMap,Splitter}.ts`,
  `src/core/data/LayoutMetaDataService.ts`, `src/core/options/CoreOptions.ts` (constants only)
- `../decisions.md#j4--exporter-random`, `#j5--quirks-preserved`, `#j8--comparison-strictness`

## Interface contract (consumed by T15)
`class JsonExporter { constructor(random?: Random); setOptions(omitZeroPos, omitZeroDim, omitLayout,
shortLayoutOptionKeys, omitUnknownLayoutOptions): void; export(graph: ElkNode): JsonObject; static emptyIfNull … }`
— argument order exactly as `JsonExporter.xtend:67-74`.

## Acceptance criteria
- Given each mirrored `export` row, then the TS text is byte-identical (J8), including `_g` suffixes
  under seed 1. (Every row is replayed end to end in T15.)
- Given the unknown-endpoint row, then the same exception class and message.
- Given every `optionText` row, then the written string matches.
- Given the files, then each ≤ 500 lines and lizard clean.

## Quality bar
README gates; ≥ 95% coverage; `@see` on the class.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
`ElkGraphJson` is T15. No change to `Random.ts`.
