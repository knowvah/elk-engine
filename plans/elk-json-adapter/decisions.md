<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — elk-json-adapter (locked 2026-10-13)

All approved by the user during planning. They amend, never rewrite, AD-1…AD-15
(`plans/elk-engine-skeleton/decisions.md`), M1–M8, D1–D10, the conformance-corpus decisions and
C1–C10 + the standing rules (`plans/core-metadata/decisions.md`).

| ID | Decision |
|----|----------|
| J1 | Gson 2.11.0 subset in `src/gson/`, specified by Javadoc + JVM vectors only; no Gson source |
| J2 | JSON numbers keep their raw literal text; `getAsDouble` via `JavaDouble.parseDouble` |
| J3 | Classes over 500 lines split at Java section boundaries into named sibling files |
| J4 | `JsonExporter` takes an optional `Random` (default unseeded); pairs with oracle patch 0001 |
| J5 | Every upstream quirk is preserved and vector-proven; listed in `docs/conformance.md` |
| J6 | 4 layout-dependent tests deferred (mission 5 / 7h); `transferLayout` covered now by replay |
| J7 | Exit evidence: oracle `parse` refs of the 4 committed goldens + local 550-model sweep |
| J8 | Byte-exact text for vectors and `elk-parse` refs; 1e-6 structural compare for the sweep |
| J9 | `JsonAdapter` is a stateless class with the full Xtend surface; held as an instance |
| J10 | Ported tests reset the service per test: `unload()` + `getInstance()` in `beforeEach` |

## J1 — Gson subset

The oracle runs Gson **2.11.0** (p2 cache; the bundle manifest names 2.8.2 — irrelevant). Port only
what `graph.json` and its tests call: `JsonElement`, `JsonNull`, `JsonPrimitive`,
`LazilyParsedNumber`, `JsonObject`, `JsonArray`, `stream/JsonReader` (strict + lenient),
`JsonParser`, `stream/JsonWriter`, `Gson`/`GsonBuilder` (`disableHtmlEscaping`,
`setPrettyPrinting`, `create`, `toJson(JsonElement)`, `getAdapter(JsonElement).read`), `TypeAdapter`,
`JsonIOException`, `JsonSyntaxException`, `stream/MalformedJsonException`. Behaviour comes from the
Gson Javadoc and `test/golden/refs/java/gson.json` (T1). A behaviour with no vector is stop 7. The
`src/gson` fitness rule mirrors `src/guava`: it imports only `src/gson` and `src/java`.

## J2 — Number text

A parsed number keeps its literal (`10.0` stays `"10.0"`): `getAsString` returns it, `getAsDouble`
parses it with `JavaDouble.parseDouble` (accepts strings such as `"12"`, `"NaN"`, as Gson does),
`isNumber` reflects the token type. Layout-option values and element identifiers (`getIdSave`) take
the raw text; `asId` turns integral numbers into `intValue()` with Java saturation at 2^31-1.

## J3 — File splits (refined in Phase 5)

A `graph.json` class whose TS exceeds 500 lines splits at Java section boundaries into
`<Class><Section>.ts` siblings holding functions over a non-exported state interface, in Java order;
the class keeps its fields, public API and delegates. Named splits:
`JsonImporter.ts` (class, fields, entry points, nodes, ports, labels, properties, id registration),
`JsonImporterEdges.ts` (Xtend 148-425), `JsonImporterLayoutTransfer.ts` (549-741 + coordinate-mode
helpers 797-864); `JsonExporterSections.ts` (Xtend 157-291) only if `JsonExporter.ts` exceeds 500.
Method-level splits follow the mission-3 standing rule. Any other sibling file is stop 9.

## J4 — Exporter `Random`

`val RANDOM = new Random()` (`JsonExporter.xtend:489`, an instance field) becomes a constructor
parameter `random: Random = new Random()` (unseeded, as upstream). `ElkGraphJson` builders are
unchanged. Tests, vectors comparisons and the round-trip pass `new Random(1)`, matching the oracle's
`EXPORT_SEED=1` (patch 0001; `docs/conformance.md` §1 promised this seam).

## J5 — Quirks preserved

Kept and vector-proven: `formatError(...)` without `throw` in the exporter (`JsonExporter.xtend:183,
196`) → unknown endpoint fails in `JsonPrimitive(null)` with `IllegalArgumentException`; missing
section/bend-point coordinates → null unboxing → `TypeError` (D10) while missing shape coordinates
→ 0 (`doubleValueValid`); duplicate ids overwrite earlier map entries; `HashBiMap` rejects equal JSON
values (`IllegalArgumentException`); `transferLayout` only adds keys (stale ones stay; `sections`
moves to the end); a layout-created label NPEs in transfer. Exception classes use `src/java/lang`
shims; messages must equal the JVM where a test or vector records them. Each quirk is listed in
`docs/conformance.md` (T20).

## J6 — Layout-dependent tests

Deferred, ported unchanged later and named in each test file header: `EdgeCoordsTest` (1 method, 6
modes; layered → 7h), `IndividualSpacingsTest.importTest` (layered → 7h),
`SectionsTest.preserveSectionIdsTest` and `TransferLayoutTest.transferLayoutEdgeSectionExistsTest`
(random → 5). Now: T4 records, on the JVM, each of these graphs' post-layout geometry and the
transferred JSON; T16's replay test applies the geometry in TS, runs `transferLayout`, and compares
bytes.

## J7 — Exit evidence

T5 runs the oracle in `parse` mode (import → export, no layout; oracle export flags) on the 4
committed goldens in `test/golden/refs/elk/` and commits `test/golden/refs/elk-parse/*.json` +
`_meta.json`. T18's round-trip test requires TS import→export of the same inputs to equal them.
T18's local sweep runs all 550 elk-models `.json` through oracle and TS `parse`; skipped without
`ELK_MODELS_DIR`. The elk-models corpus stays unvendored.

## J8 — Comparison strictness

Byte-exact text for `gson.json`, `graph-json.json`, `graph-json-transfer.json` and `elk-parse`
(export does no arithmetic; `DoubleToString` is JVM-exact). The sweep uses
`test/golden/compare-json.ts` (1e-6, AD-4). A byte-exact failure is a diagnosis, never a reason to
loosen the comparison (AD-13).

## J9 — `JsonAdapter`

A stateless class with every public Xtend method (`JsonAdapter.xtend:27-28`: elkjs keeps it in
sync). `JsonImporter`/`JsonExporter` hold `private readonly adapter = new JsonAdapter()`; Xtend
`extension` calls become `this.adapter.x(...)`. `dispatch` and type `switch` follow
translation-rules §6.5 (`docs/translation-rules.md:363-376`) and §8 (`:450-478`).

## J10 — Test setup

Four Java test files rely on an earlier test having initialised `LayoutMetaDataService`. Every
ported file does `LayoutMetaDataService.unload(); LayoutMetaDataService.getInstance();` in
`beforeEach` (the `PlainJavaInitialization` equivalent). No assertion changes.

## J7 amendment (2026-10-13, user, T5 stop)

ELK cannot re-import its own layout goldens: the layout export writes `resolvedAlgorithm`
(`LayoutAlgorithmData`), and `JsonImporter.xtend:465` → `LayoutOptionData.java:155` throws
`IllegalStateException`. Parse inputs are therefore the 4 committed goldens with every
`resolvedAlgorithm` key removed from each `layoutOptions` object, by a scripted transform applied
identically by `regen-parse-refs.sh` (oracle) and the T18 round-trip test (TS). No stripped inputs
are committed. `refs/elk-parse/_meta.json` records the raw and the stripped sha256 per file. A
`graph-json.json` import row (T3) pins the raw-import exception; TS must reproduce it.
