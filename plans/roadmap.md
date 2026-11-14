<!-- SPDX-License-Identifier: EPL-2.0 -->

# Roadmap: elk-engine port after the skeleton

Each row becomes one `/plan-mission` input. Order is dependency order: no mission depends on a
later one, and it follows `test/architecture/bundle-deps.json` (graph, then core, then alg.common,
then every algorithm; `graph.json` needs core and graph). Java LOC are `wc -l` over hand-written
`.java`/`.xtend` in `docs/architecture/inventory.md` and `docs/architecture/port-map*.md`, tests
excluded unless stated. Task counts are rough (about one task per 600-800 Java LOC plus its
ported tests, to be re-estimated by each `/plan-mission`); they are not commitments.

| # | Mission | Scope | Depends on | Size (Java LOC / est. tasks) | Exit criteria |
|---|---------|-------|------------|------------------------------|---------------|
| 1 | Java foundations completion | Close JVM-vector gaps, then the shims they gate: `JavaHashMap`, `l2i`, `fround`, `PriorityQueue`, string/double text, `src/guava/` | skeleton | 0 ELK LOC (shims) / ~10 | Every shim passes JVM vectors; CLAUDE.md corrected; gates green |
| 2 | Property system + ElkGraph model | `graph.properties`, ElkGraph classes (AD-11), `ElkGraphUtil`, `ElkReflect` | 1 | 11,449 (+161 test) / ~18 | `graph` tests ported and green; `src/graph` imports only `src/java` |
| 3 | Core metadata slice + `.melk` codegen | `core.data`, `core.options`, `core.labels`, `tools/melk/` (AD-12), `CoreOptions` | 1, 2 | 4,263 + tool / ~14 | Generated `CoreOptions` equals oracle metadata dump |
| 4 | ELK JSON adapter | `graph.json` importer/exporter (Xtend to TS) | 2, 3 | 1,971 (+2,272 test) / ~8 | `graph.json` tests ported; round-trip equals oracle JSON |
| 5 | Core engine + simple providers | Rest of `core`; Fixed, Box, Random providers | 3, 4 | ~15,860 (+2,554 test) / ~22 | First TS layouts match committed goldens within 1e-6 |
| 6 | alg.common | Node spacing, compaction, network simplex, polyomino, spore utils | 5 | 14,677 (+1,715 test) / ~20 | `alg.common` tests ported and green; no algorithm imports |
| 7a | Layered: framework | Import/export, `graph`, `graph.transform`, options, intermediate enum | 6 | 11,864 / ~16 | Layered option set equals oracle dump; transform round-trip tests |
| 7b | Layered: p1 cycles, p2 layers | Cycle breakers, layerers | 7a | 4,182 / ~7 | Phase tests ported; layer assignment equals goldens |
| 7c | Layered: p3 crossing min | p3order, counting, greedyswitch, preserveorder | 7b | 7,633 / ~11 | Phase tests ported; node order equals goldens |
| 7d | Layered: p4 node placement | p4nodes, Brandes-Koepf, network simplex use | 7c | 4,792 / ~7 | Phase tests ported; y-coordinates equal goldens |
| 7e | Layered: p5 edge routing | Orthogonal, splines, polyline | 7d | 6,798 / ~10 | Phase tests ported; bend points equal goldens |
| 7f | Layered: intermediate processors | `intermediate` (52 files), unzipping | 7e | 13,920 / ~19 | Processor tests (27 files) ported; default-layered goldens match |
| 7g | Layered: loops, wrapping, compaction | loops.*, wrapping, intermediate.compaction, compaction.* | 7f | 10,773 / ~15 | Related tests ported; wrapped/compacted goldens match |
| 7h | Layered: components + compound | components, compound (hierarchy) | 7g | 4,120 / ~7 | All 97 `alg.layered.test` files ported and green |
| 8a | mrtree, radial, vertiflex | Three tree-style algorithms | 6 | 10,235 / ~14 | Ported tests green; per-algorithm goldens match |
| 8b | force (+stress), disco | Force-directed and component compaction | 6 | 4,645 / ~8 | Ported tests green; seeded goldens match |
| 8c | rectpacking, spore, topdownpacking | Packing, overlap removal, top-down | 6 | 7,127 / ~11 | Ported tests green; `NaiveMinST` tie-order goldens match |
| 9 | elkt corpus + parity dashboard | elkt-to-JSON oracle mode, full sweep | 4, 7h, 8c | tooling (no ELK LOC) / ~8 | 898 `.elkt` models converted; sweep reports per-model status |
| 10 | Text-sizing seams | First oracle patch + TS measurer seam | 5 | 0 (patch + seam) / ~5 | Patch, TS seam, goldens regenerated; sizes agree |
| 11 | Deferred bundles decision | libavoid, graphviz.dot, graphviz.layouter | 6 | 6,019 evaluated, 0 ported / ~3 | ADR with go/no-go per bundle; fitness test updated |
| 12 | Docs site + first publish | typedoc/vitepress site; semantic-release; npm | 7h, 8c, 9 | n/a / ~10 | Docs build and links pass in CI; first publish freezes API |
| 13 | ELK upgrade process | Move pin past `8aaa3c14` | 12 | n/a / ~4 | Runbook run once on a newer commit with a clean sweep |

Order note: 8a-8c need only mission 6, so they may run in parallel with mission 7.

## Deviations from the required list

- **Missions 3 and 4 swapped, metadata slice pulled forward.** `graph.json` requires `core` in
  `bundle-deps.json` and imports `core.data`, `core.options.CoreOptions`, `LayoutMetaDataService`
  (read from the Xtend sources). The generated `*Options` also extend `core.data` types. Keeping
  "JSON adapter" before "codegen" would make mission 3 depend on mission 5. So mission 3 ports
  `core.data`, `core.options`, `core.labels` plus the codegen, and mission 5 gets the remainder of
  `core`.
- **Missions 7 and 8 split into 7a-7h and 8a-8c.** 64,082 LOC (layered) and 22,007 LOC (other
  algorithms) are too large for one mission brief. Layered splits by the phase boundaries in
  `docs/architecture/port-map-alg-layered.md`; the eight parts sum to 64,082.
- **Mission 6 does not depend on mission 7**, and 8a-8c do not depend on 7: algorithms depend
  only on alg.common, core, graph.

## 1. Java foundations completion

Scope: first write JVM-recorded vectors in `tools/vectors/JavaVectors.java` (extend the generator,
never change it): `HashMap`/`HashSet` iteration order (String, Integer, Double, KVector-style keys,
with removals and resizes), `l2i`, `Math.fround` arithmetic, `log10` of powers of ten,
`Double.toString`/`parseDouble`, `String.hashCode`/`Double.hashCode`, `PriorityQueue` tie order,
zero-divisor throws, `Random.setSeed` mid-sequence. Then the shims, from Javadoc only (AD-9):
`JavaHashMap` (`HashMap` order is unspecified in the Javadoc, so it cannot be written from spec
without the vectors), `l2i`, float helpers, `PriorityQueue`, `src/guava/` helpers
(`translation-rules.md` section 4), `bigint` for `ElkMath.factl/binomiall` and 64-bit shifts for
`TwoBitGrid`, `IndexOutOfBounds`/`NumberFormatException` error classes (10 catch sites).
Also correct the four CLAUDE.md rows listed in `translation-rules.md` section 9.
Not in scope: any ELK class; `src/java/lang/StrictMath.ts` (add when a second transcendental
caller appears; `Random.ts` keeps its private fdlibm log).
Exit: vector tests green for each shim; CLAUDE.md corrections merged; `npm run typecheck` and
`npm run coverage` exit 0. Only 8 iterated containers are value-hashed
(`translation-rules-collections.md` section 2.1); 30 are identity-hashed (insertion order plus a
journal entry); enum keys are identity-hashed.

## 2. Property system + ElkGraph model

Scope: `IProperty`, `Property`, `MapPropertyHolder` (its `propertyMap` is value-hashed site V1, so
it uses `JavaHashMap`), `EMapPropertyHolder` analog, `ElkNode`/`ElkEdge`/`ElkPort`/`ElkLabel`/
`ElkEdgeSection`/`ElkBendPoint` as plain classes keeping Java accessor names (AD-11),
`ElkGraphUtil` factories, `ElkReflect`. Public surface follows AD-14, but nothing is exported from
`src/index.ts` yet.
Not in scope: EMF notifications, adapters, `ElkGraphPackage*`, `ElkGraphSwitch`,
`ElkGraphAdapterFactory`, XMI persistence.
Exit: ported `graph.test` suite green; `module-boundaries` fitness test shows `src/graph` imports
only `src/java`.

## 3. Core metadata slice + `.melk` codegen

Scope: hand port `core.data` (2,372), `core.options` (1,845), `core.labels` (46) and the `core.math`
and `core.util` classes they import; `tools/melk/` generator (AD-12) with output committed:
13 `.melk` files yield 27 generated classes (`port-map.md`), `CoreOptions` first. The generator
resolves `metadataClass` against the `.melk` `package` (not its directory: `Stress.melk`,
`Core.melk`) and emits `Math.fround` for float defaults (`aspectRatio = 1.6f`).
Not in scope: the other algorithms' option classes beyond the generator proving them (they land
with their algorithm missions); the Xtext editor.
Exit: a JSON dump of the oracle's `LayoutMetaDataService` equals the TS registry for `CoreOptions`
(test fails on any option, default, or bounds drift); generator golden tests for all 13 `.melk`.

## 4. ELK JSON adapter

Scope: port `JsonImporter`/`JsonExporter` and helpers (5 Xtend files, `translation-rules.md`
section 8) and port the nine `graph.json.test` files. The adapter is an I/O layer, not the public
contract (AD-14).
Not in scope: ELK Text, Xtext editors, layout.
Exit: import then export of every committed golden input reproduces the oracle's JSON within
1e-6 (structure exact); ported tests green.

## 5. Core engine + simple providers

Scope: remainder of `core` (about 15,860 LOC, derived as 20,414 minus 288 not-ported persistence
minus the 4,263 from mission 3, before util/math already pulled in): `RecursiveGraphLayoutEngine`,
`LayoutMetaDataService`, `AbstractLayoutProvider`, progress monitors, `core.comments`,
`core.validation`, `core.util`, `FixedLayoutProvider`, `BoxLayoutProvider`,
`RandomLayoutProvider`. Port the 20 `core.test` files.
Not in scope: `core.service`, `core.ui`, `core.debug*`, `core.util.persistence`.
Exit: first end-to-end TS layouts for fixed, box and random models equal the committed goldens
within 1e-6 via `test/golden/compare-json.ts`. This mission could split in two if its plan
exceeds roughly 25 tasks.

## 6. alg.common

Scope: node spacing and cell system, label placement, 1D compaction, network simplex, polyomino,
overlaps, spore utilities (`BowyerWatsonTriangulation`, `NaiveMinST`; value-hashed sites V6-V8,
first consumer of `JavaHashMap` ordering in output), `PolyominoOptions` via codegen. Port the 8
`alg.common.test` files.
Not in scope: any algorithm provider.
Exit: ported tests green; `NaiveMinST` unit test with HashSet tie order from JVM vectors.

## 7. Layered (7a-7h)

Shared rules: sizes are per Java package (`port-map-alg-layered.md`); an intermediate processor is
ported in the sub-mission whose phase first needs it, and 7f finishes the rest, so +-10% LOC may
move between 7b-7f. Each sub-mission ports its share of the 97 `alg.layered.test` files (22,384
LOC) before the code (AD-13). Not in scope: libavoid or graphviz layout.
- **7a framework (11,864):** `alg.layered` 3,301, `graph` 3,839, `graph.transform` 2,215 (EMF to
  AD-11), `options` 2,509 with `LayeredOptions` generated; whole `IntermediateProcessorStrategy`
  enum, factories not-yet-ported until 7f.
- **7b (4,182):** `p1cycles` 1,681, `p2layers` 2,501 (incl. network-simplex consumers).
- **7c (7,633):** `p3order` 4,037, `counting` 1,450, `greedyswitch` 1,114, `preserveorder` 1,032.
- **7d (4,792):** `p4nodes` 2,479, `bk` 2,313.
- **7e (6,798):** `p5edges` 874, `orthogonal` 1,962 + `direction` 512, `splines` 3,450.
- **7f (13,920):** `intermediate` 13,606, `unzipping` 314.
- **7g (10,773):** `loops` + `ordering` + `routing` 3,684, `wrapping` 2,168,
  `intermediate.compaction` 1,698, `compaction.*` 3,223.
- **7h (4,120):** `components` 2,614, `compound` 1,506.
Exit per sub-mission: ported tests green and the default-layered goldens (Ptolemy models, seed 1)
that exercise it equal the oracle. 7h exit: all 97 tests green plus a layered golden per
direction and per hierarchy-handling mode.

## 8. Remaining algorithms (8a-8c)

Each algorithm ports its tests first; each option class is generated by mission 3's tool.
- **8a (10,235):** `mrtree` 5,790 (`FanProcessor` V4 is value-hashed; `ComponentsProcessor`
  merge is last-writer-wins on V1), `radial` 2,752,
  `vertiflex` 1,693 (no test plugin; goldens only).
- **8b (4,645):** `force` 2,236 (uses `Random`; seeded goldens), `disco` 2,409.
- **8c (7,127):** `rectpacking` 4,688, `spore` 1,326 (end-to-end `NaiveMinST` ties),
  `topdownpacking` 1,113. `GridElkNode` (523 lines) implements the whole `ElkNode` interface by
  delegation, so AD-11 plain classes need an interface or adapter there; decide in the plan.
Not in scope: cross-algorithm imports not present in Java (fitness test enforces).
Exit: per-bundle tests green and one golden per algorithm option set within 1e-6.

## 9. elkt corpus + parity dashboard

Scope: an oracle harness mode converting the 898 `.elkt` models to JSON (all 550 `.json` models
in elk-models are Ptolemy defaults, layered with seed 1, so no other algorithm has a golden until
this lands); a local full-corpus sweep (the oracle lays out 256 models in 2.7 s) and a parity
dashboard. Sweeps stay local (AD-5); curated goldens are committed.
Not in scope: vendoring elk-models.
Exit: all 898 convert; the sweep prints pass/fail per model and an AD-4 known-divergences list is
created for `Math.*` (non-strict) call sites; V8 `Math.log` vs `StrictMath.log` 1-ulp cases are
listed, or `StrictMath.ts` is added if a second transcendental caller exists.

## 10. Text-sizing seams

Scope: first numbered oracle patch under `tools/oracle/patches/` normalizing text measurement,
paired with a TS `TextMeasurer`-style seam (pattern: dot-engine AD-10), refs regenerated by script
and journaled (AD-5). Not in scope: a real font-metrics implementation.
Exit: oracle rebuilt via `tools/oracle/build.sh`; goldens regenerated with the patch id in
`_meta.json`; TS and oracle sizes agree on label-bearing models. (Maven 3.9.x is required for
Tycho 4.0.12; `ELK_MVN` is documented in the oracle README.)

## 11. Deferred bundles decision

Scope: for `alg.libavoid` (1,548, external C++ process) and `alg.graphviz.dot` /
`alg.graphviz.layouter` (2,728 + 1,743), decide: skip, port, or delegate to `@knowvah/dot-engine`.
Output is an ADR, not code.
Exit: ADR committed with a go/no-go per bundle; `bundle-deps.json` updated if any is adopted.

## 12. Docs site + first publish

Scope: typedoc (needs a TS 6 alias because typedoc lacks TS 7 support, AD-6) and vitepress;
link check and example tests in CI; semantic-release; GitHub repo and npm name claimed by the user.
**The first publish freezes the ElkGraph API (AD-14)**: `ElkGraphUtil` and the AD-11 classes become
the semver contract; export `src/index.ts` deliberately and review the surface before release.
Not in scope: an idiomatic wrapper layer (separate later work).
Exit: docs build, link check, and example tests pass in CI; published package installs and lays
out a graph in a clean project.

## 13. ELK upgrade

Scope: a written, rehearsed process for moving the pin past `8aaa3c14` (AD-2): bump `ELK_COMMIT`,
rebuild the oracle, rerun the vector and corpus sweeps, diff `.melk` metadata dumps, port Java
diffs.
Exit: one rehearsal against a newer ELK commit produces a clean sweep or a triaged diff list.

## Revision 2026-10-11 (conformance-corpus)

Appended; no earlier line is edited. Source: D0, D3, D8, D10 in
`plans/conformance-corpus/decisions.md`. Where this section conflicts with the text above, this
section wins.

**Scope supersession.** Line 112 ("Not in scope: `core.service`, `core.ui`, `core.debug*`, ...")
no longer excludes `core.debug.grandom`: it is in scope (D0, mission 4d). `core.debug` is
reference only. `alg.disco.debug` is reference only. `graph.text`, `graph.json.text` and their
`.ide` bundles: runtime in scope, `.ide` deferred, `.ui` out. Mission 4's "Not in scope: ELK Text"
stays true for mission 4; ELK Text moves to 4b.

**Inserted missions (after 4, before 5; each is one `/plan-mission` input):**

| # | Mission | Scope | Depends on | Size (Java LOC / est. tasks) | Exit criteria |
|---|---------|-------|------------|------------------------------|---------------|
| 4b | `graph.text` (`.elkt`) | Hand-written recursive-descent parser, one method per `ElkGraph.xtext` rule (D8); Xtend value converters, naming, scoping, linking, validation; `ElkGraphFormatter` and serializer for the `.elkt` writer (D10) | 2, 3, 4 | 1,352 / ~8 | Every elk-models `.elkt` parses equal to the oracle's parse-only JSON; realworld `.json` and `.elkt` of one model parse to the same ElkGraph (D3); `.elkt` writer round trip (ElkGraph to `.elkt`) is byte-exact against the oracle |
| 4c | `graph.json.text` (`.elkj`) | Same approach for `ElkGraphJson.xtext` and its Xtend support | 4b (parser approach) | 972 / ~5 | `.elkj` inputs parse equal to the oracle; invalid input fails where the oracle fails (known divergence #1: presence only, D8) |
| 4d | `core.debug.grandom` (`.elkr`) | `GRandom.xtext` parser, `ConfigurationParser`, `GeneratorOptions`, `RandomGraphGenerator` with the exact JVM `Random` sequence | 4b | 2,696 / ~7 | Reproduces `test/corpus/generated/*.json` byte for byte (D7); `BlindTextGenerator` stays unseeded and out of goldens |

Mission 5 and later now depend on 4b where they need text input; their numbers do not change.

**Mission 9 rescoped** to "TS sweep + per-algorithm dashboard". The oracle side (elkt-to-JSON
mode, corpus census, native/retarget/generated tiers, oracle parity report) is the
conformance-corpus mission, not mission 9. Mission 9 keeps: running the TS engine over the same
cases, comparing against the oracle outputs, and the per-algorithm parity dashboard. Its exit
changes to: sweep reports per-algorithm status for every `(algorithm, model, variant)` case
(D1). It no longer converts the 898 `.elkt` models; that conversion is replaced by 4b.

## Revision 2026-10-14 (graph-text)

Appended; no earlier line is edited. Source: G1-G8 in `plans/graph-text/decisions.md`; the journal is
`plans/graph-text/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Mission 4b (`graph.text`) status.** The code, vectors and curated refs landed on `feature/graph-text`
(entry point `src/graph/text/ElkGraphText.ts`, Xtext subset `src/xtext`; design and runbook in
`docs/architecture/elk-text.md`). The exit criteria are measured by the local sweep, whose counts are in
`docs/conformance.md`, section "ELK Text (`.elkt`)". Two results differ from the exit text above and are
flagged for the user in the journal: the realworld `.json` and `.elkt` of one model do not parse to the same
ElkGraph (all 550 `.elkt` carry port `position`, which the `.json` lacks, so D3 is held as "oracle differs
identically", `D3_ORACLE_DIFFERENCES`), and syntax errors match by presence only (D8 #1).

**Follow-ups by mission:**

- **Mission 5** and every later algorithm mission: when the TS registry grows, regenerate the core-only graph.text
  refs and vectors by script (`tools/vectors/elkt-vectors.sh`, `tools/oracle/regen-elkt-refs.sh`), journal the
  regeneration, and drop the `MISSION5_ALGORITHMS` filter and its stand-in describe in
  `src/graph/text/validation/ElkGraphValidator.test.ts` (the filter's test fails once `fixed`, `box` and `random`
  resolve).
- **Mission 7** (layered): repeat the regeneration for the layered registry; about 177 to 182 models use layered keys
  and differ between the core and the default oracle registry.
- **Mission 4c** (`graph.json.text`): reuse `src/xtext` (converters, scoping, linking, validation base, the
  `formatting2` subset) and add the bundle to `XTEXT_CLIENT_BUNDLES` in
  `test/architecture/module-boundaries.fitness.test.ts`.
- **Any time (outside the mission 4b write-sets):** fix the mission-4 `JsonExporter` null option value gap
  (`src/graph/json/JsonExporter.ts:53`) and then remove `KNOWN_EXPORTER_GAPS` in `ElkGraphText.test.ts`; vendor the
  31 curated `.elkt` inputs or fetch the pinned corpus in CI so the curated refs run there; add a
  `StringIndexOutOfBoundsException` shim to `src/java/lang`; decide whether the 13 lexer recovery boundaries pinned
  in T9 become canonical lexer vector rows in a later regeneration.

**Update 2026-10-14 (user):** D3 amended (D3a, `plans/conformance-corpus/decisions.md`): realworld `.json` and
`.elkt` must be equal except for port positions; the graph-text tests now assert 550/550 under that rule and the
`D3_ORACLE_DIFFERENCES` list is removed.

**Update 2026-10-15 (user):** the `JsonExporter` null option value gap is fixed (a null value throws a `TypeError`,
Java's NPE); `KNOWN_EXPORTER_GAPS` is removed from `ElkGraphText.test.ts`.

**Update 2026-10-15 (user):** the `StringIndexOutOfBoundsException` shim is added to `src/java/lang`.

**Update 2026-10-15 (user):** the 31 curated `.elkt` inputs are vendored in `test/corpus/elkt-curated/`; the curated
refs run in CI.

**Update 2026-10-15 (user):** erased-generic casts are ported (`src/java/lang/JavaCast.ts`); 8 of the 10
`ClassCastException` converter rows replay, and the 2 rows a `number` cannot represent stay documented skips.

**Update 2026-10-15 (user):** the validator's line-101 proxy resolution is recorded through an option registered
after load; load-then-validate cannot reach it in any registry, so missions 5/7 have nothing to regenerate for it.

**Update 2026-10-15 (user):** the 13 T9 lexer recovery boundaries are canonical rows of `graph-text-lexer.json`.

**Update 2026-10-15 (user):** the Xtext `Linker` passes a null unresolved-proxy message on as Java does (T16).

**Update 2026-10-15 (user):** AD-16 exception policy approved (`plans/elk-engine-skeleton/decisions.md`). Follow-up, any
time before the first npm publish: add `Exception`/`RuntimeException`, re-parent the 18 Java-named root exception classes to their
Java parents (`ArithmeticException` leaves `RangeError`), rewrite the 6 listed frozen assertions with the user's approval,
and add the inheritance fitness test.

**Update 2026-10-15 (user):** AD-16 is implemented (base classes, 18 re-parented classes, fitness test).

**Update 2026-10-15 (user):** the 4 G3 sweep models are compared with the mission-5 stand-ins (validate-equal
898/898). Mission 5 deletes `test/helpers/mission5-stand-ins.ts` and the selections that use it (the validator test's
`mission5` rows, the sweep's `MISSION5_ALGORITHM_VALUE`).

## Revision 2026-10-16 (graph-json-text)

Appended; no earlier line is edited. Source: D1-D13 and the D2 amendment in `plans/graph-json-text/decisions.md`; the
journal is `plans/graph-json-text/decision-journal.md`. Where this section conflicts with the text above, this section
wins.

**Mission 4c (`graph.json.text`) status.** The code, vectors and curated refs landed on `feature/graph-json-text`
(entry point `src/graph/json/text/ElkGraphJsonText.ts`, internal; design and runbook in
`docs/architecture/elk-json-text.md`). The exit criteria above ("`.elkj` inputs parse equal to the oracle; invalid
input fails where the oracle fails") are restated as D2 = A', amended by the user on 2026-10-16:

- The pinned elk-models holds no `.elkj`, so the oracle's `convert` mode applies `ConvertGraphHandler`'s steps to
  the corpus (identifier generator seeded by patch `0002`, D12). Tier 1: those files parse and validate equal.
  Tier 2: ELK JSON read by the `.elkj` language parses equal. Writer tier: graphs written with
  `serialize(format())` byte-exact, then reparsed.
- **Size-capped:** the oracle's serializer needs 30 to 1,100 CPU-seconds per graph, so the sweep covers every graph
  up to 5 KB (345) plus 6 sampled larger ones (instead of ~40), 666 ELK JSON inputs for tier 2, and a determinism
  double-run on 30. The cap and sample are parameters of `tools/oracle/elkj-sweep.sh`; the full 1,448 are a
  days-of-CPU rerun.

**Result** (`docs/conformance.md`, section "ELK Textual JSON (`.elkj`)"): `tier1-parse-equal=344/344` (144 exact,
200 presence), `tier1-validate-equal=344/344`, `tier2-parse-equal=666/666` (591 exact, 75 both reject),
`writer-byte-exact=351/351` (315 byte-exact, 36 oracle failures matched), `reparse-equal=315/315`, 0
nondeterministic; oracle 2 h 04 min on 8 serial-GC JVMs, TS 4.2 s.

**Scope changes against the 4c row above.**

- **D13 (user, 2026-10-16):** linking is lazy like Xtext's `LazyLinker` rather than eager (D11 B): the mission
  ported `LazyLinker`, `LazyLinkingResource`, `LazyURIEncoder` and an EMF proxy/resource subset, amending mission-2
  D4. `ElkEdge.sources/targets` and the shapes' edge lists now resolve proxies; `.elkt` keeps its eager linker.
- The estimate (972 Java LOC / ~5 tasks) became 18 planned tasks, with T12 replaced by T12a-T12f and T12h.
- The 4b parse runtime moved to `src/xtext/parser/` (D1) and `graph.json.text` joined `XTEXT_CLIENT_BUNDLES`.

**Follow-ups by mission:**

- **Mission 5** and every later algorithm mission: when the TS registry grows, rerun `tools/vectors/elkj-vectors.sh`
  (about 30 min) and `tools/oracle/regen-elkj-refs.sh` with the `.elkt` ones, and journal the regeneration.
- **Any time (outside the 4c write-sets):** port Xtext's `DefaultTerminalConverter` (45 SIGNED_INT/FLOAT converter
  rows, unreachable from the grammar); record a bare-CR diagnostic vector for `.elkt` (the `.elkj` line fix of
  `fix(T11)` suggests the same deviation); port the `ElkNodeImpl.toString` proxy arm; move the shared copy of the
  graph (`ElkGraphCopy` duplicates 4b's `copyGraph`) to `src/graph/util`; widen the sweep sample if wanted.

## Revision 2026-10-22 (grandom)

Appended; no earlier line is edited. Source: D1-D9 in `plans/grandom/decisions.md`; the journal is
`plans/grandom/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 4d (`core.debug.grandom`) is done as mission 4f; the exit is met.** The code, vectors and corpus replay
landed on `feature/grandom` (internal facade `src/core/debug/grandom/GRandomText.ts`; design, evidence and runbook
in `docs/architecture/grandom.md`). The exit criterion of row 4d ("reproduces `test/corpus/generated/*.json` byte
for byte", D7) is met: 9/9 corpus files regenerate byte for byte, and every JVM vector row replays (lexer 433,
parse 142, validate 23, generate 58 seeded + 6 unseeded + 12 `RandVal`). `BlindTextGenerator` stays unseeded and
out of goldens.

**Scope changes against the 4d row above.**

- Option A (user, batch 4): the grandom model stays plain classes (D3); the parser and validator use `src/xtext`
  primitives but not `ParseSession`, `Diagnostician` or `AbstractDeclarativeValidator`, and the parser records the
  three validator positions (amends D2).
- `src/core/debug/grandom` joined `XTEXT_CLIENT_BUNDLES`; `src/core/math/ElkMath.ts` (`boundi` only) and the
  one-argument `Collections.shuffle(list)` were added (D5, D7).

**Follow-ups by mission:**

- **Any time (outside the 4f write-sets):** the `generateANTEGraph` branches beyond `form-acyclic` (planar,
  single source, hierarchy) are unit-tested from the Java source only; widen the generate vectors to pin them.
- **Any time:** the lexer inputs `cross-hierarchy relativex` and `self loopsx` are derived from the rule, not
  pinned by a vector; add lexer cases if needed.
- **Any time:** a shared `devAssert` helper does not exist; the Java `assert` statements in the grandom port are
  omitted with comments (`KVector.ts` precedent).
- **Deferred:** the `core.debug.grandom.ide` bundle (content assist) needs a browser-editor host decision.

## Revision 2026-10-23 (core-engine)

Appended; no earlier line is edited. Source: M1-M17 in `plans/core-engine/decisions.md`; the journal is
`plans/core-engine/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 5 splits (M1): 5a `core-engine` is done; 5b `core-remainder` is the next `/plan-mission` input.** 5a landed on
`feature/core-engine` (design, evidence and runbook in `docs/architecture/core-engine.md`). The row 5 exit ("first
end-to-end TS layouts for fixed, box and random equal the goldens within 1e-6") is met for 5a:

- All nine curated algorithm goldens (three each for `fixed`, `box`, `random`, in `test/golden/algorithms.json`,
  refs in `test/golden/refs/elk-algorithms/`) equal the oracle under `compareLayout` at 1e-6 on the first run (T17,
  M4). Both golden sets regenerate byte-stable.
- Ported JUnit: `RecursiveGraphLayoutEngineTest` (3 of 4 cases), `GraphValidatorTest`, the `ElkUtil` cases, `Issue457Test`
  and `Issue489Test`, plus the JSON and content-assist cases that waited for mission 5 (`SectionsTest`,
  `TransferLayoutTest`, `LayoutDataContentAssistTest`; T11, T16, T17, T18).
- `PENDING_TYPES = []`: `fixed`, `box` and `random` are registered as in the oracle's core-only registry; every landed
  vector replayed unchanged (M7, T8-T14).
- Corpus comparison of the 898 retarget cases per algorithm (M5, T19): counts and known divergences are in
  `docs/conformance.md`, section "Core layouts (fixed, box, random)".

**Row 5b (`core-remainder`).** Scope from `plans/core-engine/decisions.md#m1--split`, minus `ElkRectangle` (moved into
5a by M11): `alg/*` (rest), `comments/*`, `math/{BezierSpline,CubicSplineInterpolator,ISplineInterpolator}`, the rest
of `ElkMath`, `util/adapters/ElkGraphAdapters`, `util/selection/*`, `ElkSpacings`, `LayoutConfigurator`,
`PropertyConstantsDelegator`, `AbstractRandomListAccessor`, `DefaultFactory`, `Triple`, `Quadruple`,
`WrappedException`, a `java.awt.geom.Rectangle2D` shim with JVM vectors, and the tests that go with them
(`LayoutConfiguratorTest`, `SpacingConfigurationTest`, `AlgorithmAssemblerTest`, `LayoutProcessorConfigurationTest`,
`BezierSplineTest`, `CubicSplineInterpolatorTest`, the rest of `ElkMathTest` including the four rectangle cases that
call `ElkMath.contains/intersects`). Size about 7.5k Java lines, about 13 tasks. Depends on 5a. Exit: the listed tests
are ported and green; the issue-test harness switches from the hand-applied configurator body to `LayoutConfigurator`.
Both 5a and 5b land before mission 6. `core.util.persistence` stays out of scope (AD-11).

**Scope changes against row 5 above.**

- **M10, M12, M15, M16, M17 (user):** `ElkUtil`, `BoxLayoutProvider` and the engine are split into section modules for
  the 500-line cap; generated algorithm option constants and `*_DEP_*` constants are lazy getters (the same applies to
  every later algorithm bundle).
- **M2:** `elkjs-exclude` blocks are dropped (debug-folder helpers, `toSafePathName`).
- **M4:** the goldens live in a separate set so the corpus manifest and the docs-site showcase stay frozen.

**Follow-ups by mission:**

- **7a (layered):** `RecursiveGraphLayoutEngineTest.testEmptyAlgorithmId` (default resolves to layered), unchanged (M6).
- **7h:** `EdgeCoordsTest`, `exportLayoutOptions`, `importIndividualSpacingsTest` (T18).
- **Every later algorithm mission:** apply the M7/M9 procedure (replay vectors, flip tripwires per type) and rerun
  `tools/vectors/elkj-vectors.sh` and the `.elkt` regeneration when the TS registry grows; stub algorithm ids must not
  end in a registered algorithm's suffix (M14).
- **Docs (any time):** add the algorithm goldens to the docs-site showcase (M4).
- **Any time:** `variants.json` entries add native and generated sweep cases (`random-seed-1` adds one per model to
  the next full sweep); widen `IElkProgressMonitor` getters and `AbstractLayoutProvider.initialize` to their
  nullable Java types when those files are next touched.

## Revision 2026-10-24 (core-remainder)

Appended; no earlier line is edited. Source: R1-R7 and P1-P9 in `plans/core-remainder/decisions.md`; the journal is
`plans/core-remainder/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 5b (`core-remainder`) is done as mission 5b; the exit is met.** The code landed on `feature/core-remainder`
(design, evidence and runbook in `docs/architecture/core-engine.md#mission-5b`). The `core` bundle is complete except
`core.util.persistence` (AD-11).

- All listed JUnit ports are green: `LayoutConfiguratorTest`, `SpacingConfigurationTest`, `AlgorithmAssemblerTest`,
  `LayoutProcessorConfigurationTest`, `BezierSplineTest`, `CubicSplineInterpolatorTest` and the full `ElkMathTest`,
  including its 4 rectangle cases.
- The `.elkt` harness uses `LayoutConfigurator` as Java's `TestAlgorithm` does (T12); both golden sets regenerate
  byte-identical, with no assertion changed.
- 18 of 18 `comments.json` oracle scenarios replay equal (R6 asked for about 10); all 5,044 `regex.json` pattern
  strings match.
- Last full gate: 404 test files, 19,389 passed, 69 skipped; 99.28 % lines, 97.13 % branches, 99.27 % functions;
  `npm test` 53.2 s at load about 7 against the 66.3 s baseline (stop 12 clear).

**Scope changes against row 5b above.**

- **R1:** `comments/*`, `util/selection/*` and `PropertyConstantsDelegator` are ported now, although nothing in ELK
  calls them (no Java tests; the evidence is R6).
- **R2:** narrow `Pattern` and `JavaCharacter` shims from the Javadoc, proven by new vectors; extended to
  `String.equalsIgnoreCase` (flagged to the user at planning). Amended twice by the user during execution: JVM `\b`
  and per-code-point case maps come from the recorded `regex-boundary.json` (the JDK 21 `\b` goes beyond its Javadoc
  for combining marks), and `Collectors.summingDouble`/`averagingDouble` is pinned by `stream-sum.json`
  (1,035 rows). `CoreJdkVectors.java` therefore writes five files (`awt`, `regex`, `character`, `regex-boundary`,
  `stream-sum`).
- **R3:** `Rectangle2D` shim with only the `comments/*` surface (`awt.json`).
- **R4:** every `ElkMath` `*l` function is `bigint` through `Int64`.
- **R5:** comment interfaces with `default` methods are abstract classes.
- **R6:** 18 tie-free oracle scenarios for `CommentAttacher`, compared as sets.
- **R7:** new recorders `CoreJdkVectors.java` and `CommentVectors.java` (+ `comment-vectors.sh`); landed vectors and
  `JavaVectors.java` untouched.

**Follow-ups by mission:**

- **7a (layered):** `LayeredSpacings` builds on `ElkSpacings`' `AbstractSpacingsBuilder`; `ELK_OPTION_TARGET_FILTER`
  never filters (verbatim Java), so do not assume target filtering.
- **Every algorithm mission (6, 7, 8):** build the pipeline with `AlgorithmAssembler`; per slot, factories are ordered by
  ordinal and `Set` insertion order shows only between equal factories (journal such pairs, AD-10). Classes in
  `Class`-keyed maps of `LayoutConfigurator` are the `*Impl` constructors.
- **Next time the files are touched:** widen the nullable signatures (`AbstractLayoutProvider.initialize`,
  `IElkProgressMonitor` getters).
- **Any time:** a shared `devAssert` helper does not exist (T7 omitted the `ElkSpacings.java:80-84` asserts with a
  comment); the `StringBuilder` shim drops constructor arguments (use `new StringBuilder().append(s)`).
- **Tooling:** files added under `tools/vectors/` change the `vector-cache.sh` inputs digest, so the next `elkt`,
  `elkj` and `elkr` recorder runs are cold once. Check `uptime` before a coverage gate: foreign CPU load (about 180
  from another project) made timing-sensitive tests fail in batch 1.
- **JDK upgrade:** a change to `character.json` or `regex-boundary.json` is journaled and added to the
  known-divergences list; the shim is never patched around it (runbook in `docs/architecture/core-engine.md`).

## Revision 2026-10-26 (alg-common)

Appended; no earlier line is edited. Source: AC1-AC6 and P1-P7 in `plans/alg-common/decisions.md`; the journal is
`plans/alg-common/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 6 is split (AC1).** Mission 6a (`alg-common`) is done; mission 6b is next.

**Row 6a (`alg-common`) is done; the exit is met.** The code landed on `feature/alg-common` (design, evidence and
runbook in `docs/architecture/alg-common.md`). Ported: the root geometry, `utils`, `networksimplex`, `compaction`
(with `oned` and `options`), `overlaps`, `polyomino` (with `structures`), `spore`, and `PolyominoOptions` generated from
`Polyomino.melk`. Nothing is exported from `src/index.ts` and no provider is ported.

- The JUnit ports are green: `RectilinearConvexHullTest` (T8), `NetworkSimplexTest` (T7), `OneDimensionalCompactorTest`
  17 of 17 (T9) and `Issue475Test` (T5).
- Every `alg-common.json` scenario replays exactly (AC3, new recorder `tools/vectors/alg-common-vectors.sh`):
  `triangulation` 22, `polyomino` 108 (3 rows expect `IndexOutOfBoundsException`), `overlaps` 34, `spore` 18 (8
  scanline, 10 depth-first compaction).
- V6-V8 are implemented and proven: the 22 `triangulation` rows pin the edge iteration order and both cost trees,
  including the all-ties `constant` cost (T2 strategies, T8 sites).
- Landed vectors, goldens and corpus are unchanged: only `refs/java/alg-common.json` was added.
- Final gates and landing: see the decision journal and the mission summary in `plans/alg-common/README.md`.

**Scope changes against row 6 above.**

- **AC1:** `nodespacing/**` and `NodeMicroLayout` move to mission 6b.
- **P5:** the 8 `alg.common.test` files are split: 4 ported in 6a, 4 deferred (below).
- **AC4:** no debug file output (`SVGImage`, `DebugUtil`, `NGraph.writeDebugGraph`); every `/*d*/` call stays.
- **AC5:** `Issue475Test` vendors `475_fixedLayoutWithLongLabels.elkt` and adds it to `TICKET_INPUTS` in the landed
  `test/golden/algorithm-refs.test.ts` (AD-13 change approved by the user).
- **AC6:** Java recursions whose depth grows with the input become explicit-stack loops proven against a verbatim
  recursive reference (first case: `NetworkSimplex.tightTreeDFS`, `postorderTraversal`).

**Row 6b (`alg-common-nodespacing`): scope and evidence plan.**

- Scope: `nodespacing/**` (`cellsystem`, `internal`, `internal/algorithm`; 26 classes, 6,123 LOC) and `NodeMicroLayout`.
- Evidence (AC2): the 4 deferred JUnit files cannot run before layered, so the evidence is an oracle sweep of
  `NodeMicroLayout` over a designed set of graphs (a new recorder, as in AC3), compared at the AD-4 bar.
- Package edges to plan around: only `NodeMicroLayout` imports `nodespacing`, and `nodespacing` imports `overlaps`
  (ported in 6a).

**Deferred JUnit files (P5).**

- `InsidePortLabelTest`, `NextToPortLabelPlacementTest`, `PortLabelPlacementVariantsTest`: run `LayoutTestRunner` with
  layered; port in mission 7a.
- `NodeMicroLayoutTest`: needs layered, force, stress, mrtree, radial and rectpacking; port in mission 8x.
- Planning for any ticket-model JUnit port (7a, 8x) puts the model, its `inputs/manifest.json` row and the
  `TICKET_INPUTS` entry in the write-set; the `TICKET_INPUTS` edit is an AD-13 change to raise with the user.

**Follow-ups by mission.**

- **6b:** the above; `NodeMicroLayout` is the first root-package class to import `nodespacing`.
- **Before 7a (layered):** promote one of the three task-local `TreeSet` stand-ins (T9, T10, T11) to
  `src/java/util/TreeSet.ts`; layered's `CrossingsCounter` and `NodeContext` need a live `TreeSet`. Check every
  unbounded-depth recursive port (layered DFS passes) under `--jitless` and convert per AC6. A horizontal compaction
  that relies on predefined constraints must use `SCANLINE_CONSTRAINTS` (the quadratic calculation clears them).
- **7a:** port the 3 deferred label-placement JUnit files; `ElkMath.distance` callers pass a vector at least as long as
  the gap.
- **8a (disco):** `TwoBitGridTest` treats words as `bigint` and expects the read/write asymmetry; `PlanarGrid.weaklyIntersectsArea`
  throws on out-of-grid extensions (3 of 108 recorded rows); nothing registers `PolyominoOptions` before disco.
- **8x:** `DepthFirstCompaction.compactTree` and `minUnderlapWithSubtree` recurse per spanning-tree level; check large
  graphs with `--jitless`; port `NodeMicroLayoutTest`.
- **Any time:** the `devAssert` helper of translation rules 6.8 was never written (T10 omitted `assert false` defaults
  with a comment, as `KVector.ts` does); the `fromPattern` test helper is duplicated in two polyomino tests (move it to
  `test/helpers/` when next touched); `NetworkSimplexTest.testDeltas` is the canary for stack depth under suite load.
- **Tooling:** files added under `tools/vectors/` change the `vector-cache.sh` inputs digest, so the next `elkt`, `elkj`,
  `elkr` and `comments` recorder runs are cold once.

## Revision 2026-10-26 (alg-common-nodespacing)

Appended; no earlier line is edited. Source: NS1-NS6 and Q1-Q6 in `plans/alg-common-nodespacing/decisions.md`; the
journal is `plans/alg-common-nodespacing/decision-journal.md`. Where this section conflicts with the text above, this
section wins.

**Row 6b (`alg-common-nodespacing`) is done; the exit is met.** The code landed on `feature/alg-common-nodespacing`
(design, evidence and runbook in `docs/architecture/alg-common.md`, section 7; counts in
`docs/conformance.md#alg-common-nodespacing`). Ported: `nodespacing/**` (`cellsystem`, `internal`,
`internal/algorithm`; 26 classes) and `NodeMicroLayout`. Row 6 is now complete. Nothing is exported from
`src/index.ts` and no provider is ported.

- Every row of `test/golden/refs/java/node-micro-layout.json` replays at the AD-4 bar on the first run: 326 rows
  (`corpus` 16, `curated` 70, `variants` 4, `sweep` 236), 23 of them exceptions matched by class and message
  (20 `IllegalArgumentException` for models whose ports have no side, 3 `UnsupportedConfigurationException` for
  rejected placements).
- Branch coverage of `src/alg/common/nodespacing/**` is 99.87 % (748/749; the miss is an NS5 `default` arm).
- Landed vectors, goldens and corpus are unchanged: only `refs/java/node-micro-layout.json` was added.
- `npm test` 62.0 s against the 55.4 s baseline (+6.6 s, inside the stop-11 journal band); the replay itself is 1 s.

**NS decisions.** NS1: inputs are stored in the vector JSON as ELK JSON and replayed through `ElkGraphJson`; nothing
is vendored. NS2: four scenario groups. NS3: `NodeMicroLayout` runs bottom-up on every node with children. NS4: 0×0
labels get `width = 6.5 * text.length()`, `height = 13.0` (AWT metrics are platform-dependent); model rows are
recorded `raw` and `sized`. NS5: the 3 `assert` sites stay comments. NS6: nodes (x, y, w, h, `MARGINS`, `PADDING`),
ports (x, y) and labels (x, y, w, h) in model order, doubles as raw bits, compared within 1e-6.

**Kept upstream quirks (see `docs/conformance.md#alg-common-nodespacing-quirks`).** `NodeMicroLayout` rejects ports
without a side; `CellSystemConfigurator.java:118-119` sets the middle row's height contribution twice and never its
width; constrained outside port labels use swapped `withGap` arguments; `NodeMarginCalculator` processes a port edge's
head/tail label twice; `GridContainerCell` width passes overwrite earlier rows; `ContainerCell.minWidthOfCell` ignores
the padding of a zero-content cell.

**Follow-ups by mission.**

- **7a (layered):** port the 3 deferred label-placement JUnit files (`InsidePortLabelTest`,
  `NextToPortLabelPlacementTest`, `PortLabelPlacementVariantsTest`); `NodeDimensionCalculation` is the facade layered
  calls through `LGraphAdapters`. The 10 corpus/curated models whose ports have no side gain port coverage only once
  layered assigns sides. `NodeContext.portContexts` already uses the landed `TreeMultimap` (TreeSet semantics per
  side), so the live `TreeSet` follow-up from 6a is still only for `CrossingsCounter` and the three 6a stand-ins.
- **8x:** `NodeMicroLayout.forGraph(...).execute()` is the entry point for force, mrtree, radial and rectpacking; port
  `NodeMicroLayoutTest` (needs layered, force, stress, mrtree, radial and rectpacking).
- **Any time:** the `devAssert` helper of translation rules 6.8 is still unwritten (6b added three more commented
  `assert` sites: `NodeContext.java:277`, `HorizontalPortPlacementSizeCalculator.java:212`,
  `PortLabelPlacementCalculator.java:208`). When deriving nodespacing expectations by hand, check first:
  `minWidth/HeightOfCell` returns 0 for a zero-content cell with padding; a side with exactly 2 ports is
  space-efficient; port-edge labels count twice in margins; `NodeLabelLocation` sets overlap (OUT_T_L vs OUT_L_T).
- **Tooling:** `tools/vectors/NodeMicroLayoutVectors.java` is 920 lines; single-file recorders are outside the
  complexity gate but trip the global file-length hook on write (as `JavaVectors.java` does). Adding it under
  `tools/vectors/` made the next `elkt`/`elkj`/`elkr`/`comments` recorder runs cold once.

## Revision 2026-10-27 (ad13-rederivation)

Appended; no earlier line is edited. Source: D1-D7 and E1-E3 in `plans/ad13-rederivation/decisions.md`; the journal is
`plans/ad13-rederivation/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 6b evidence is strengthened; mission 6c is done.** Each of the five 6b `flag` sites (hand-derived expectations
corrected after a first failure) is now pinned to an oracle row in `test/golden/refs/java/nodespacing-sites.json`.
The 13 T4 test scenarios whose branches the `node-micro-layout.json` replay never reaches are pinned the same way. The
file has 23 rows and replays at the AD-4 bar (`src/alg/common/nodespacing/NodespacingSiteVectors.test.ts`). The
recorder is `tools/vectors/nodespacing-site-vectors.sh`. Every corrected 6b value equals the oracle. Two invalid-premise
originals are restored as their own cases: the OUT_L_T set and the 2-port `FIXED_RATIO` margins. No `src/` file changed
and no landed vector or golden changed. Counts are in `docs/conformance.md#alg-common-nodespacing`.

**Follow-ups.**

- The four hand-derivation rules from 6b are now pinned by oracle rows:
  - zero-content cells ignore padding: `insideLabels`, `allConstraints`, `collapsedContainers`
  - a side with exactly 2 ports is space-efficient: `fixedRatioMargins/two-ports`
  - port-edge labels count twice: `sidelessPortMargins`
  - overlapping label location sets: `labelLocation`
- **7a (layered):** the `node-micro-layout.json` sweep never sets a port alignment or a north/south border offset. A
  layered replay, or a later sweep revision, should cover BEGIN/END/JUSTIFIED and border offsets end to end. The
  `t4/*` rows cover them only at the unit level, and only on the horizontal axis for placement.
- **Tooling:** `PortPlacementCalculator.PORT_RATIO_OR_POSITION` is not a registered option, so any ELK JSON based
  vector carrying `FIXED_RATIO` ratios needs a side channel (here the `setPortRatio` step).

## Revision 2026-10-28 (layered-framework)

Appended; no earlier line is edited. Source: L1–L7, S1–S4 and X1–X7 in `plans/layered-framework/decisions.md`; the
journal is `plans/layered-framework/decision-journal.md`. Where this section conflicts with the text above, this
section wins.

**Row 7a is done.** The layered framework is ported and proven by three oracle replays (`layered-framework.json`,
272 rows) plus 330 site rows (`layered-sites.json`) that reach every branch the replays leave untaken; design, staged
classes and runbook in `docs/architecture/alg-layered.md`, counts in `docs/conformance.md#alg-layered-framework`.
No layout runs yet.

**Scope moves (binding for 7b–7h).**

- **L2 → 7f:** `ElkLayered` (staged in 7a: `doLayout`, `doCompoundLayout`, `prepareLayoutTest` throw),
  `GraphConfigurator`, `InteractiveLayeredGraphVisitor`, `DebugUtil`, `DotDebugUtil`, `JsonDebugUtil` (~3,100 lines)
  move from 7a to 7f, the first sub-mission with a running pipeline.
- **S1 → 7f:** the full-layout follow-ups: `InsidePortLabelTest`, `NextToPortLabelPlacementTest`,
  `PortLabelPlacementVariantsTest`, `RecursiveGraphLayoutEngineTest.testEmptyAlgorithmId`,
  `LayeredSpacingTest.AfterLayoutTest`, and an end-to-end alignment/border-offset sweep (7a covers alignment and
  border offsets at the adapter level: 142 `adapters` rows).
- **S2 → 7c:** the `TreeSet` stand-in promotion (first consumer `CrossingsCounter`); no 7a class uses a `TreeSet`.
- **S3 → 7b:** `IntermediateProcessorStrategy` (first consumers: the 7b phases' processor configurations).
- **L6 → 7b:** `TestGraphCreator` (1,217 lines) with its first consumers.

**Staged classes (L1), with the mission that replaces each** (`test/architecture/staged-classes.json`; the list is
empty after 7h): `ElkLayered` 7f, `intermediate/LabelDummySwitcher` 7f, `intermediate/loops/{SelfLoopEdge,
SelfLoopHolder, SelfLoopPort}` 7g, `intermediate/wrapping/{BreakingPointInserter, BreakingPointInserterBPInfo}` 7g,
`compound/CrossHierarchyEdge` 7h, `p5edges/splines/SplineSegment` 7e. The phase-strategy factory arms throw naming
7b (cycles, layers), 7c (crossing minimization) and 7d (node placement). Replacing a staged file: port it at the same
path, drop the `@staged` marker and the JSON row, keep the three 7a replays green.

**Follow-ups found during the run.**

- **7b:** `Tarjan`'s two hash containers are insertion-ordered (AD-10); a `SCCModelOrderCycleBreaker` replay mismatch
  traced to either is a stop. The `hierarchyAware` site row lists `LayerSweepCrossingMinimizer` as the only
  `IHierarchyAwareLayoutProcessor` implementor; the sentinel test in `IHierarchyAwareLayoutProcessor.test.ts` fails
  once 7c ports it and must then be updated to assert the brand.
- **7c:** `LNode.getPortSideView` is a write-through proxy with Java `SubList` bounds (X7); `GreedyPortDistributor.switchPorts`
  writes through `Lists.reverse(view)`.
- **7f:** the four `site/provider/*` rows carry the oracle's full layout output for small graphs; replay them once
  `ElkLayered` runs, and re-anchor `LayeredLayoutProvider.test.ts` (the `isCanceled` arm) and T11a's provider
  replay (which observes the staged driver by wrapping `ElkLayered.prototype`). The rows named in `unreached.md`
  § Amendments as "dead by construction" in `ElkGraphLayoutTransferrerNonMutating` stay dead with a real layout.
- **Any sub-mission:** a green replay is not evidence until replay-alone coverage shows the code under test ran
  (X4: a scenario that drives a layered processor before layering sizes nothing). Measure per class before writing
  unit tests, as T9 did.
- **Tooling:** the melk recorder cannot encode a `List<Integer>` option default (`cmEnforcedGroupOrders`); both melk
  tests check that record separately (`ShapePrimer`). T1's `dumpLGraph` encodes a `KVectorChain` property value as
  `{ class }` rather than a list; T11a wraps it. Embedded ELK JSON in a ref must be sanitised for Gson's bare
  `Infinity`/`NaN` (the T10 `strictNumbers` rule); the TS `JsonWriter` shim writes them bare too. The three 7a
  recorders are single-file launchers of 1,858 and 4,643 lines, outside `npm run complexity` (which scans `src/`).

## Revision 2026-10-29 (layered-cycles-layers)

Appended; no earlier line is edited. Source: SC1–SC4, B1–B10 and E1–E2a in `plans/layered-cycles-layers/decisions.md`;
the journal is `plans/layered-cycles-layers/decision-journal.md`. Where this section conflicts with the text above, this
section wins.

**Row 7b is done.** The eleven cycle breakers, the nine layerers, `IntermediateProcessorStrategy` and the ten
processors the two phases need are ported and proven by `layered-phases.json` (651 oracle rows: 534 pipeline rows
recorded through `ElkLayered.runLayoutTestUntil`, 80 scenario rows, 37 site rows), eight ported JUnit invariant
tests, and a 32,652-case hash sweep over all ptolemy models; design, idioms and runbook in
`docs/architecture/alg-layered.md` § 8, counts in `docs/conformance.md#alg-layered-phases`. The pipeline still does not
run (`ElkLayered`, `GraphConfigurator` → 7f).

**Scope moves (binding for 7c–7h).**

- **SC2 → 7f:** `ModelOrderLayerAssignmentTest` (7 cases), `PartitionTest`, `Issue871Test` need a full layout; their
  hand-built graphs are recorded as 7b `scenarios/*` rows, so the layer assignment they encode is proven now.
- **SC3 → 7c:** `TestGraphCreator` (L6 said 7b); `BasicCycleBreakerTest` extends it but calls none of its builders.
- **SC4 (7f):** `GraphConfigurator` and `ElkLayered` stay in 7f; 7f re-replays every 7b `models/*` row through the real
  pipeline and under the default `SEPARATE_CONNECTED_COMPONENTS` (B3: 7b rows set it false, `ComponentsProcessor` is 7h).
- **S3 (7a) closed:** `IntermediateProcessorStrategy` has 59 members (the 7a estimate of 63 was wrong); 10 arms are
  live, 2 throw naming 7c, 38 naming 7f, 9 naming 7g (B9 table).

**Hand-offs found during the run.**

- **Every phase mission (7c, 7d, 7e):** wiring a strategy enum's arms closes the ESM cycle enum → phase class →
  `LayeredOptions` → provider → transformer → enum. Before wiring: add the enum to melk `NON_LEAF_DEFAULT_TYPES`
  and regenerate; write every phase class's `*_PROCESSING_CONFIGURATION` as a cached static getter from the start;
  keep module-level reads of enum constants out of `graph/transform`; probe `import()` of each enum and the metadata
  provider after wiring; tests enter through the enum, never through an abstract phase base class (E1).
- **Every mission:** a Java `==`/`!=` on boxed `Integer`/`Long` is ported by tracing where the boxes come from;
  fresh `Integer.valueOf` boxes compare through `JavaInteger.sameValueOfBox` (equal and in -128..127), never as value
  equality by default (E2a). Four such sites exist in 7a/7b; `Tarjan.java:86` is one, so the SCC strategies never pop a
  component rooted at DFS index ≥ 128 and `SCCModelOrderCycleBreaker` stalls on large graphs — faithful, and a
  candidate upstream report.
- **7f:** `LabelDummyInserter` unlocks 43 branches of the 7b classes (`unreached.md` § U); re-measure replay-alone
  coverage of `p2layers` and `intermediate` after it lands. The 14 `SCC_*` oracle timeouts and the 581 zero-height
  `STRETCH_WIDTH` cases of the sweep stay `timeout`.
- **7f:** the Java invariant `testEdgesPointTowardsNextLayers` fails on the oracle's own left-to-right model-order
  promotion when external port dummies without `MODEL_ORDER` are present, and on BF/DF model-order layerings;
  decide whether to report upstream once the full pipeline reproduces it.
- **Tooling:** the recorder runs the JVM with `-XX:hashCode=2` so identity-hashed `HashSet`s iterate in insertion
  order; that holds only up to ten entries (the BFS source guard), and any later recorder that iterates a `HashSet`
  of graph elements needs the same bound. `LayeredPhaseVectors.java` is a 2,730-line single-file launcher (JDK 21's
  source launcher takes one file); a `javac` multi-file launcher is still a follow-up. The TS sweep test is stride-2
  sampled to stay near four minutes; `PHASE_SWEEP_STRIDE=1` runs every case.

## Revision 2026-10-30 (layered-crossing-min)

Appended; no earlier line is edited. Source: C1–C13 in `plans/layered-crossing-min/decisions.md`; the journal is
`plans/layered-crossing-min/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 7c is done.** `p3order` (16 classes) and `p3order.counting` (6), the eight intermediate processors a default
pipeline runs between P2 and P3, `greedyswitch` (5) and `preserveorder` (3), the four `CrossingMinimizationStrategy`
arms and ten `IntermediateProcessorStrategy` arms are ported and proven by `layered-order.json` (808 oracle rows: 657
pipeline rows recorded through `ElkLayered.runLayoutTestUntil` at the P3 stop, 89 scenario rows, 62 site rows), ten
ported JUnit invariant tests, a 6,728-case hash sweep over all ptolemy models and 88 anchored unit cases; design, idioms
and runbook in `docs/architecture/alg-layered.md` § 9, counts in `docs/conformance.md#alg-layered-ordering`. The
pipeline still does not run (`ElkLayered`, `GraphConfigurator` → 7f). The enum tally is now 7b 10 / 7c 10 / 7g 9 /
7f 30 (B9 table amended by C2).

**New row 7c-tests (before 7d; C1).** The hand-built JUnit suites of P3 are a sibling brief: `TestGraphCreator`
(1,217 lines; SC3 amended), `greedyswitch/{TestGraphCreator, InLayerEdgeTestGraphCreator,
NorthSouthEdgeTestGraphCreator}` and the 16 suites built on them (p3order 6, counting 4, greedyswitch 6, about 9,000
lines), `ConcreteSortByInputModelTest` and `AllowNonFlowPortsToSwitchSidesTest`; the sibling brief decides how their
expectations are derived (Java literals or recorded rows).

**Scope moves (binding for 7d–7h).**

- **C2:** the eight processors and the two greedy-switch arms moved from 7f/pending to 7c (done); `LabelDummyInserter`,
  `CommentPreprocessor`, `DirectionPreprocessor` stay 7f, `SelfLoopPreprocessor`, `BreakingPointInserter` 7g.
- **C3 (7h):** every 7c row and sweep case is a flat hierarchy level; 7h records nested rows
  (`HierarchyHandling.INCLUDE_CHILDREN`) and re-measures the 89 branches / 36 functions of the sweep driver's
  hierarchical paths (`GraphInfoHolder` children, `sweepInHierarchicalNodes`, `sortPortsByDummyPositionsInLastLayer`,
  the hierarchical greedy switch, `LayerSweepTypeDecider` past `rootNode()`), and re-evaluates the recursion of
  `countCurrentNumberOfCrossings` (kept recursive: bounded by hierarchy depth, C7).
- **7f:** three branches of the 7c classes need label dummies (`LongEdgeSplitter.ts:166,169`, `SortByInputModelProcessor.ts:159`); the
  `preserve_order` models with edge labels are refused by the 7c recorder, so 7f re-runs
  `SortByInputModelProcessorTest` over them (it runs on two authored label-free graphs now) and
  `PortListSorterTest.testMonotonicalCoordinates` (needs P4/P5 and `LongEdgeJoiner`).

**Hand-offs found during the run.**

- **Every phase mission (7d, 7e):** the E1 recipe held without a new lazy read: enum into `NON_LEAF_DEFAULT_TYPES`
  and regenerate first (T2), cached static getters for every `*_PROCESSING_CONFIGURATION`, the entry-point fitness
  test after wiring; no entry-order import.
- **Every mission (C6):** two boxed/float sites this time — `ModelOrderBarycenterHeuristic.java:90-91` (`Integer !=`
  → `JavaInteger.sameValueOfBox`) and `ForsterConstraintResolver.java:259-262` (`floatValue() ==` → `Float32`
  on both sides); `int` differences in comparators go through `Int32.sub`.
- **Every mission (C13):** a melk list-literal default (`#[…]`) is unmodifiable in Java; the emitter freezes it and
  `ElkReflect.isCloneable` rejects frozen objects, so `getProperty` does not store it. Any option with a list default
  added later inherits this; a `Cloneable` Java default (e.g. `KVector`) is still stored.
- **Recorder identity hashes (AD-10):** under `-XX:hashCode=2` every identity hash is the same value, so comparators
  that break ties on `hashCode()` (`HyperedgeCrossingsCounter`'s hyperedge and corner comparators) tie: the port
  returns 0 there and a later mission that meets such a tie-break must keep the recorder flag or record the hashes.
- **Replay helpers:** the 7c order dump lists baseline edges a processor detached (null ends); the 7b `phaseDump`
  alone does not. `compareOrderFullDump` applies no class twins (`JAVA_CLASS_TWINS` is `compareOrder`'s), so a full
  dump with a `HashMap`-valued property under a hand-placed layering mismatches: extend the twin map when a later
  mission needs such a row.
- **Sweep conventions:** INTERACTIVE cases run on the on-disk positions (7b convention); edgeless levels are skipped;
  the oracle sweep runs in about 40 s and the TS replay in 48 s at stride 2 (`ORDER_SWEEP_STRIDE=1` ≈ 90 s).
- **Follow-ups:** the `devAssert` helper named in the translation rules was never created (Java `assert`s are
  omitted, as every mission so far); crossing-count sums in `SwitchDecider`, `LayerSweepTypeDecider` and the
  thoroughness loops use plain `+` while `Counting`/`GraphInfoHolder` use `Int32.add` (unreachable wrap, inconsistent
  style); `PortListSorterTest`'s `@Configurator` (per-node `FIXED_ORDER` + `PORT_INDEX`) is not expressible as row
  options; `InvertedPortProcessorTest.testValidNodeOrder` is vacuous on the 13 ptolemy rows; the recorder is at 2,995
  of its 3,000-line cap, so 7d's recorder starts a new launcher (B7); the recorded full dump of a post-P3 row holds no
  port sides or anchors for layered nodes, so `SweepCopy`'s N/S side switch is visible only through the port order (a
  later recorder should dump layered node bodies); the site-row replay block (`replaySite`/`siteFactories`) is
  duplicated across the anchored test files and belongs in `test/helpers/` (cleanup); parallel agent briefs must name
  a private scratchpad subdirectory (two T12 agents overwrote each other's scratch script).

## Revision 2026-11-03 (layered-crossing-min-tests)

Appended; no earlier line is edited. Source: T1–T9 in `plans/layered-crossing-min-tests/decisions.md`; the journal is
`plans/layered-crossing-min-tests/decision-journal.md`. Where this section conflicts with the text above, this section
wins.

**Row 7c-tests is done.** The three greedy-switch graph creators (`test/helpers/TestGraphCreator.ts` with
`MockRandom`, `InLayerEdgeTestGraphCreator.ts`, `NorthSouthEdgeTestGraphCreator.ts`) and the fourteen unit-level
suites of P3 (p3order 6, counting 3, greedyswitch 5: 211 tests, 280 runs, 8 `@Ignore` methods as `it.skip`) are
ported with the Java tests' own literals as expectations (T1, AD-13); `tools/oracle/java-tests.sh` (T2) proves the
same 280 runs on the oracle build. No port defect surfaced (no T7 fix); the suites newly reach three of 7c's
"U nested" arms (`plans/layered-crossing-min-tests/coverage.md`). Counts in `docs/conformance.md#alg-layered-ordering`,
runbook in `docs/architecture/alg-layered.md` § 9.6.

**Scope moves (T8, amends 7c C1).**

- The root `org.eclipse.elk.alg.layered.TestGraphCreator` (1,217 lines) is referenced by no Java file: unported.
- `ConcreteSortByInputModelTest` (32) and `AllowNonFlowPortsToSwitchSidesTest` (6) call `LayeredLayoutProvider.layout`
  and assert coordinates and edge intersections: they pass on the oracle and move to **7f**.

**Hand-offs.**

- **7d (`BasicNodePlacementTest`), 7e (`BasicEdgeRouterTest`), later rows (`InLayerConstraintProcessorTest`,
  `Issue726Test`, `Issue734Test`):** build on `test/helpers/TestGraphCreator.ts`; its header lists the overload
  mapping, the public fields `graph`/`random`, and that north/south or fixed-order builders need
  `LayoutMetaDataService.initElkReflect()` first. The 7g self-loop suites use their own `SelfLoopTestGraphCreator`.
- **Every later mission's JUnit baseline:** `bash tools/oracle/java-tests.sh <fqcn…>` (one JVM per class, `-XX:hashCode=2`,
  one `runs= failures=` line each; a class that cannot load counts as `runs=1 failures=1`); run it at mission start
  and end and cite the counts in the conformance doc. Expected values come from the Java literals when the suite is
  unit-level (T1); a full-layout suite needs recorded rows.
- **7h:** the hierarchical sweep and greedy switch now carry a Java-derived check (17 nested cases in the p3order
  suites, `switchingDummyNodesNotifiesPortSwitch` in `SwitchDeciderTest`); 7h still re-measures the nested group with
  recorded rows, starting from the 61 branch arms and 3 functions `coverage.md` lists as untaken.
- **Agent rule for ported suites:** an agent may add no assertion the Java lacks (T4 added eight count checks that the
  orchestrator removed before committing); the review step checks the port against the Java before the commit.

## Revision 2026-11-02 (layered-node-placement)

Appended; no earlier line is edited. Source: N1–N12 in `plans/layered-node-placement/decisions.md`; the journal is
`plans/layered-node-placement/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 7d is done.** `p4nodes` (4 placers, 22 files with sections and nested types), `p4nodes.bk` (7 classes, 19
files), the five intermediate processors a P4 stop needs and the 5 + 5 enum arms that create them are ported and
proven by `layered-placement.json` (604 oracle rows with geometry: 494 pipeline rows recorded through
`ElkLayered.runLayoutTestStep` at the P4 stop and at each processor, 84 scenario rows, 26 site rows), the ported
`BasicNodePlacementTest` invariant over 15 runs (the Java suite `runs=8008 failures=0` on the oracle at start and end),
an 8,410-case hash sweep over all ptolemy models (1,970 reach P4 before 7e/7g; all match) and 27 anchored unit cases;
design, idioms and runbook in `docs/architecture/alg-layered-placement.md`, counts in
`docs/conformance.md#alg-layered-placement`. The pipeline still does not run (`ElkLayered`, `GraphConfigurator` →
7f). The enum tally is now 7b 10 / 7c 10 / 7d 5 / 7f 25 / 7g 9 (B9 table amended by N1).

**Scope moves (binding for 7e–7h).**

- **N1:** `InnermostNodeMarginCalculator`, `LabelAndNodeSizeProcessor`, `InLayerConstraintProcessor`,
  `HierarchicalPortDummySizeProcessor`, `NodePlacementRepeater` moved from 7f to 7d (done). Refusal categories fixed
  by the 7d recorder: `HYPEREDGE_DUMMY_MERGER` → **7e**; `LABEL_DUMMY_SWITCHER`, `LABEL_SIDE_SELECTOR`,
  `END_LABEL_PREPROCESSOR`, `CENTER_LABEL_MANAGEMENT_PROCESSOR`, `END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR`,
  `COMMENT_NODE_MARGIN_CALCULATOR`, `ALTERNATING_LAYER_UNZIPPER` → **7f**; `SELF_LOOP_PORT_RESTORER`,
  `SELF_LOOP_ROUTER`, `SINGLE_EDGE_GRAPH_WRAPPER`, `BREAKING_POINT_PROCESSOR` → **7g**.
- **7e:** `HIERARCHICAL_PORT_POSITION_PROCESSOR` (every placer's `HIERARCHY_PROCESSING_ADDITIONS`, before P5) and
  `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR` stay 7e; `HYPEREDGE_DUMMY_MERGER` refuses most ptolemy P4 levels (5,880
  sweep cases and 14 model levels), so 7e re-sweeps at the P4 and P5 stops. A P5 recorder starts from the 7d recorder's
  geometry core (`geometry` field, N3 presence rule, `PLACEMENT_CROSSCHECK`) in a new launcher (B7: the 7d one is at
  2,972 of 3,000 lines).
- **7f:** `DotDebugUtil` and `JsonDebugUtil` replace the staged `src/alg/layered/DebugUtil.ts` (`staged-classes.json`);
  the label processors unlock the `LABEL_DUMMY_INSERTER` models (16 accepted refusals); `GraphConfigurator`'s
  `NODE_PLACEMENT_REPEATER` rule needs only the `recomputeNodePlacement` property check (the `anyMatch` is always true).
- **7h:** no untaken 7d site needs nested graphs; the hierarchical additions are measured at P5.

**Hand-offs found during the run.**

- **Every phase mission (7e):** the E1 recipe held again without a new lazy read (enum into `NON_LEAF_DEFAULT_TYPES`
  and regenerate first, cached static configuration getters, the entry-point fitness test after wiring).
  `IntermediateProcessorStrategy.ts` is at 499 of 500 lines: the next arm wired there needs a split of the enum file
  (a section file for the `create` switch, Java order kept).
- **Row format and the 5 MiB cap (N3):** a 7c-shaped row is two thirds `changed`; a P4 variant family costs 20–95 KB
  per level, a full-dump site row 6–15 KB. `layered-placement.json` is 644 bytes under the cap after a variant-set
  trim and six unrecorded variant rows. **Decision needed before the next recording that touches it:** a higher cap, a
  second ref file per group, or a compacter `changed` encoding (a journal flag).
- **L4 in agent briefs:** three agents wrote hand-built tests whose behavioural expectations came from reading the
  Java; all were removed before commit and routed through T9 → T11 → T12. Briefs for ported classes should state the
  rule in the agent prompt ("every behavioural literal is an oracle row or a twin comparison").
- **Row inventories and site rows:** a class test that pins its row ids by selector must list the `sites/*` rows of
  its class once T11 lands (six inventories failed the batch-5 coverage gate until listed, in recorded order).
- **Scenario design (T1, T11):** a port with two or more edges puts `HYPEREDGE_DUMMY_MERGER` in the plan; the plan
  after P3 is `TWO_SIDED_GREEDY_SWITCH`, `IN_LAYER_CONSTRAINT_PROCESSOR`, `LABEL_AND_NODE_SIZE_PROCESSOR`,
  `INNERMOST_NODE_MARGIN_CALCULATOR`, then `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR`; a labelled N/S external dummy is
  replaced by a label-less copy under `FIXED_SIDE` or higher, so those label arms need a chain-forced row; a forced
  mid-gap crossing needs `CROSSING_MINIMIZATION_STRATEGY=INTERACTIVE` with positions and `layerConstraint=FIRST`;
  `EdgeAndLayerConstraintEdgeReverser` reverses every edge of a node whose ports are all inverted; the string `FIXED`
  is not a `PortLabelPlacement` (pass the empty set).
- **Recursion twins (N6):** the verbatim twins overflow at depth 5,000 with and without `--jitless` (the generator-based
  list iterators' frames); loops are proven on the rows and at depth 200, the deep case proves no overflow.
- **Follow-ups:** `BKNodePlacerFeasibility`'s infeasible arms are unreachable by construction (52,000 random graphs),
  as is `improveTwoPath`'s "neither case" arm (by reading); the `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` rows hold at
  most one N/S dummy per layer, so its `delta`/`step` values are proven by reading only (a two-dummy site row is a
  7e candidate); the per-file factories object is duplicated across every anchored test file (the 7c cleanup, still
  open); `ThresholdStrategySimpleThresholdStrategy.ts:88` is executed by a row but anchorable by no position; the
  `devAssert` helper is still unwritten (five Java `assert` lines omitted this mission).

## Revision 2026-11-03 (layered-edge-routing)

Appended; no earlier line is edited. Source: R1–R14 in `plans/layered-edge-routing/decisions.md`; the journal is
`plans/layered-edge-routing/decision-journal.md`. Where this section conflicts with the text above, this section wins.

**Row 7e is done.** `p5edges` (3 classes), `p5edges.orthogonal` with `direction` (11 classes, 17 files with sections
and nested types), `p5edges.splines` (6 classes, 15 files), the six intermediate processors a routed result needs (9
files) and the 3 + 6 arms that create them are ported and proven by `layered-routing.json` and
`layered-routing-steps.json` (943 oracle rows with edge geometry: 666 pipeline rows recorded through
`ElkLayered.runLayoutTestStep` at the P5 stop of each router and at each processor, 94 scenario rows, 25 site rows,
158 direct-call rows), the three ported JUnit invariants (`BasicEdgeRouterTest`, `Issue726Test`,
`LayerSizeAndGraphHeigthCalculatorTest`; the Java suites `runs=550 / 550 / 1 failures=0` on the oracle at start and
end), a 6,728-case hash sweep over all ptolemy models at the P4 and three P5 stops (6,280 ok; all match at stride 1)
and 62 anchored unit cases; design, idioms and runbook in `docs/architecture/alg-layered-routing.md`,
counts in `docs/conformance.md#alg-layered-routing`. The pipeline still does not run (`ElkLayered`,
`GraphConfigurator` → 7f). The enum tally is now 7b 10 / 7c 10 / 7d 5 / 7e 6 / 7f 19 / 7g 9 (B9 table amended by R1).

**Scope moves (binding for 7f–7h).**

- **R1:** `HyperedgeDummyMerger`, `HierarchicalPortPositionProcessor`, `LayerSizeAndGraphHeightCalculator`,
  `LongEdgeJoiner`, `NorthSouthPortPostprocessor`, `FinalSplineBendpointsCalculator` are 7e (done); `SplineSegment` is
  unstaged. 7f keeps `HierarchicalPortOrthogonalEdgeRouter`, `HypernodesProcessor`, `ConstraintsPostprocessor`,
  `EndLabelSorter`, `HierarchicalNodeResizer`, the label and comment processors and `AlternatingLayerUnzipper`; 7g keeps
  self loops, wrapping and compaction. Refusal categories fixed by the 7e recorder: `HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER`,
  `HYPERNODE_PROCESSOR`, `CONSTRAINTS_POSTPROCESSOR`, `COMMENT_POSTPROCESSOR`, `LABEL_DUMMY_REMOVER`,
  `END_LABEL_POSTPROCESSOR`, `END_LABEL_SORTER`, `HIERARCHICAL_NODE_RESIZER` → **7f**; `SELF_LOOP_POSTPROCESSOR`,
  `BREAKING_POINT_REMOVER`, `HORIZONTAL_COMPACTOR` → **7g**.
- **7f:** `ElkLayered`, `GraphConfigurator` (the plan builder must name `GraphTransformer` by position: it is both
  `DIRECTION_PREPROCESSOR` and `DIRECTION_POSTPROCESSOR`; with `feedbackEdges=true` `PORT_SIDE_PROCESSOR` moves before
  P1; `NODE_PLACEMENT_REPEATER` needs only the property check), the full-layout issue tests `Issue587/680/682`,
  `DotDebugUtil`/`JsonDebugUtil` for the staged `DebugUtil` (the orthogonal generator's guarded call is in place), the
  `NorthToSouth`/`SouthToNorth` direction strategies (ported, run only from the hierarchical router), the
  `HyperedgeDummyMerger` label-dummy paths (13 untaken arms), the 18 `LABEL_DUMMY_INSERTER` accepted refusals.
- **7g:** `NorthSouthPortPostprocessor.processSelfLoop` and the self-loop arms of the three routers (reached in 7e only
  on chain-forced rows that omit `SELF_LOOP_PREPROCESSOR`; E–E/W–W loops reach the routers, N–N loops become dummies),
  the self-loop spline router over `NubsSelfLoop` (no caller at this commit; its five factories are proven by call
  rows), `inverseOrder`/`SPLINE_SURVIVING_EDGE` in the bend-point calculator (`BreakingPointRemover`), the compaction
  arms (`segmentAllowsSloppyRouting`'s near arms are proven by option-only rows, the far arms are unreachable by the
  horizontal placement), the 112 `SELF_LOOP_PREPROCESSOR` sweep levels (re-sweep then). **R9 verdict to recheck:** the
  JVM order of the spline router's `HashSet<Pair<…>>` was unobservable in 7e; `getSplinePath` reads the first edge of a
  hyperedge under a compaction strategy other than `NONE`.
- **7h:** no untaken 7e site needs nested graphs.

**Hand-offs found during the run.**

- **Every phase mission:** the E1 recipe held again with no new lazy read (`EdgeRouting` is a core leaf enum; the
  routers' configurations are cached getters; the enum's `create` chain is a section importing the enum as a type).
- **Landed-helper gaps are twinned in the mission's own helpers, never by editing a landed one:** the 7a dump context
  names a removed element as a fresh `ref` (the recorder writes `{class}`), the 7b enum registry closes its list, the
  7b row loader closes its group list; a new ref group (`calls`) and a processor that removes elements both need the
  mission's helper to re-apply the recorder's rule.
- **Row inventories and `CALLERS` tables:** a new row family breaks every test that pins ids or counts by selector
  (six files in 7e) and every callers table; update them in the same commit as the rows.
- **Caps:** `layered-routing.json` is 52,641 bytes under 5 MiB; the recorder is at 2,998 of 3,000 lines (its sweep modes
  are a sibling launcher `LayeredRoutingSweep.java`, compiled together); `layered-placement.json` is still 644 bytes
  under the cap (7d flag, unchanged). **Decision needed before the next recording that touches either:** a higher cap,
  a second ref per group, a compacter `changed` encoding, or a second launcher per recorder.
- **Seeds:** the first `nextInt(2)` of `java.util.Random` is identical for seeds 1–40; a row that must record both
  outcomes of a draw scans seeds with a spread (4096, 5000, 12345).
- **Oracle throws on six hierarchical-port levels** under POLYLINE/SPLINES (`AdjacencyList` NPE: only the orthogonal
  router adds `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR`): candidate upstream report; the recorder's `ORACLE_THROWS` list
  is the only skip of a throwing level.
- **Follow-ups:** the three Medium splitter arms (`HyperEdgeSegmentSplitter.ts:220 if[1]`, `:400 if[1]`, `:406 if[1]`:
  a 1-ulp spacing could reach the last two); the `devAssert` helper is still unwritten (nine Java `assert` lines
  omitted this mission); the per-file factories/callers objects are duplicated across the anchored test files (the 7c
  cleanup, still open); `HyperEdgeSegment.toString` arms and the `NubSpline` no-caller members are pinned structurally.

## Revision 2026-11-03 (caps raised)

User decision after mission 7e's stop 14, superseding the 7d and 7e "decision needed" cap hand-offs above:

- **Ref cap: 16 MiB per file** under `test/golden/refs/java/` (was 5 MiB). `layered-placement.json` (644 bytes under
  the old cap) and `layered-routing.json` (52,641 under) keep their trimmed variant sets; a later mission that touches
  either may restore trimmed rows instead of adding a second ref per group.
- **Recorder cap: 5,000 lines per launcher** (was 3,000). Sweep/dump modes may live in the recorder again; the sibling
  launcher (`LayeredRoutingSweep.java`) stays as the 7e shape, not a rule.
- The five layered recorders' `MAX_BYTES` constants and throw messages now say 16 MiB; the next brief's stop 13 uses
  the new numbers (`plans/layered-edge-routing/decision-journal.md`, row `caps`).


## Revision 2026-11-05 (layered-pipeline)

Appended; no earlier line is edited. Source: F1–F16 and FX1–FX8 in `plans/layered-pipeline/decisions.md`; the journal is
`plans/layered-pipeline/decision-journal.md`. Where this section conflicts with the text above, this section wins. It is
the binding input of the 7f2 brief.

**Row 7f's first brief is done.** `ElkLayered` (with two section files), `GraphConfigurator`, the eight `components`
classes, `GraphTransformer`, `HierarchicalPortOrthogonalEdgeRouter`, `EndLabelSorter`, `HypernodesProcessor`,
`ConstraintsPostprocessor` and their six arms are ported; `LayeredLayoutProvider.layout` runs. Evidence:
`layered-pipeline.json` (1,239 rows: `full` 199, `models` 905, `scenarios` 93, `sites` 42; 1,181 replayed at AD-4, 58
pinned), the four ptolemy goldens equal, the 2,351 landed `models` rows re-replayed through the real driver (2 pinned),
28 Java suites ported with oracle `failures=0` at start and end, a 6,646-case sweep matching exactly at stride 1, and 58
anchored cases. No numeric divergence from the oracle.

**Scope moves, binding for 7f2–7h (F1).** Row 7f is split into 7f (`layered-pipeline`, done) and 7f2
(`layered-labels`). `components` moved from 7h to 7f, except `ComponentsCompactor` (staged, 7g).
`HierarchicalNodeResizingProcessor` moved from 7f to 7h. The processor enum's tally is 7b 10, 7c 10, 7d 5, 7e 6, 7f 6,
7f2 12, 7g 9, 7h 1; the stage marker accepts `7f2`.

**Hand-offs to 7f2 (`layered-labels`).**

- Port `LabelDummyInserter`, `LabelDummySwitcher` (staged), `LabelDummyRemover`, `LabelSideSelector`,
  `EndLabelPreprocessor`, `EndLabelPostprocessor`, `LabelManagementProcessor` (both arms), `CommentPreprocessor`,
  `CommentNodeMarginCalculator`, `CommentPostprocessor`, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor`,
  `DotDebugUtil`, `JsonDebugUtil` and `DebugUtil` (staged).
- **FX5:** flip `site/provider/flat` and `site/provider/cancelled` (`test/helpers/layered-site-replay.ts`) from the 7f2
  throw to comparing their recorded layout.
- **FX6, FX7:** delete the 2 `layered-phases.json` and 57 `layered-pipeline.json` entries naming 7f2 in
  `test/helpers/layered-pipeline-pinned-rows.ts`; the rows must then replay their recorded expectations.
- **FX2:** record a scenario with end labels on parallel edges that share source port, target node and target port,
  compared with the oracle; a mismatch in `EndLabelSorter`'s map order is stop 17 with evidence.
- Accepted label and comment refusals of `layered-pipeline.json` (19 `full` rows, 114 `models` rows) and of the earlier
  refs become recordable; the label arms of `HyperedgeDummyMerger` (13 untaken) and the label arms carried from 7c–7e.
- `NodeMarginCalculatorTest` gains its `CommentNodeMarginCalculator` and `EndLabelPreprocessor` hooks; `Issue871Test`
  (one test has edge labels) and the 11 suites `suite-allocation.md` assigns to 7f2 are ported then.
- `EndLabelSorter`'s sort body and `ConstraintsPostprocessor`'s logging arms (U in `unreached.md`) become reachable.

**Hand-offs to 7g.** Port `ComponentsCompactor` (staged) and `compaction/*`; the self-loop family: 600 sweep cases (112
levels × 3 routers, 66 whole models × 4 directions) are refused today, the `PIPELINE_SUITES_FULL=1` corpus suites fail
195 cases (3 × 65 models) on `SelfLoopPreProcessor`, and one `layered-pipeline.json` row is pinned to it (FX7);
`NodeMarginCalculatorTest` gains its `SelfLoopRouter` hook; R9's recheck of `getSplinePath` under compaction; the 10
suites allocated to 7g.

**Hand-offs to 7h.** Port `HierarchicalNodeResizingProcessor`, `CompoundGraphPreprocessor` and
`CompoundGraphPostprocessor` (staged); the hierarchical driver path (`doCompoundLayout`, `hierarchicalLayout`,
`ElkLayeredHierarchy.ts`, U in `unreached.md`); the `include-children*` provider rows, which expect the 7h throw today;
the 9 suites allocated to 7h.

**Flags for the user.**

- The label metrics (FX8) are a macOS JVM snapshot; a different JDK or OS may measure differently, so a re-record on
  another platform is a decision, as for any vector.
- `../elk` HEAD is 22 commits past the pin with no change in the layered, core, common or test bundles; recheck the diff
  in each mission.

**Follow-ups (cleanup, outside this mission's write-sets).** `ElkLayered.test.ts`'s 199-row loop duplicates
`LayeredPipelineVectors.test.ts`'s `full` group; `tools/corpus/ts-layout-compare.ts` registers no layered algorithm;
`src/java/util/LinkedList.ts`'s header claims identity equality for every ELK element (false for `KVector`);
`test/helpers/junit-delta.ts` and the private delta helper of `edge-route-orthogonal.ts` overlap; the older
`test/helpers/elkt-layout-harness.ts` beside the new runner; the per-file factories objects of the anchored tests; the
`devAssert` helper is still unwritten.

## Revision 2026-11-06 (layered-labels)

Appended; no earlier line is edited. Source: G1-G12, G3a and G11a in `plans/layered-labels/decisions.md`; the journal is
`plans/layered-labels/decision-journal.md`. Where this section conflicts with the text above, this section wins. It is
the binding input of the 7g and 7h briefs.

**Row 7f's second brief is done.** `LabelDummyInserter`, `LabelDummySwitcher` (unstaged), `LabelDummyRemover`,
`LabelSideSelector`, `EndLabelPreprocessor`, `EndLabelPostprocessor`, `LabelManagementProcessor` (both arms), the three
comment processors, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor`, `DotDebugUtil`, `JsonDebugUtil` and
`DebugUtil` (unstaged) are ported and their 12 arms wired; `LayeredLayoutProvider.layout` runs labels, comments,
unzipping and logging. Evidence: `layered-labels.json` (`rowCounts` `full` 399, `models` 640, `scenarios` 224, `sites`
42; 1,316 test cases replay at AD-4 with logged graphs per G3 and G3a), the 59 rows pinned to 7f2 replay their recorded
expectations, `site/provider/flat` and `cancelled` compare their recorded layout (FX5), FX2's parallel-end-label rows
equal the oracle, 11 Java suites ported (oracle baseline equal at mission start; at mission end equal
as well), a 1,105-case label sweep (935 ok hash-match at stride 1, 155 refused in 7g/7h categories, 15
throws equal on both sides; final run identical), 86 anchored cases. No port defect
was found by the replay; the helper fixes of T2 are in the journal.

**Enum tally after 7f2.** 49 arms ported, 10 pending: 7g 9, 7h 1 (7b 10, 7c 10, 7d 5, 7e 6, 7f 6, 7f2 12).

**Hand-offs to 7g.**

- Port the 9 pending arms `SelfLoopPreProcessor`, `SelfLoopPortRestorer`, `SelfLoopPostProcessor`, `SelfLoopRouter`,
  `BreakingPointInserter`, `BreakingPointProcessor`, `BreakingPointRemover`, `SingleEdgeGraphWrapper` and
  `HorizontalGraphCompactor`, plus the staged `ComponentsCompactor`.
- The one row still pinned: `models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN`
  (`test/helpers/layered-pipeline-pinned-rows.ts`); 7g deletes the entry and the recorded expectation then applies.
- Accepted 7g refusals to convert into rows: in `layered-labels.json`, 1 `full` row
  (`full/labels/ticket-213_componentsCompaction`, `COMPACTION_CONNECTED_COMPONENTS`); in the label sweep, 105 cases
  (`SELF_LOOP_PREPROCESSOR` 75, `HORIZONTAL_COMPACTOR` 25, `COMPACTION_CONNECTED_COMPONENTS` 5); the earlier refs'
  refusals stand as 7f's revision lists them.
- Unreached arms that need 7g (U in `plans/layered-labels/unreached.md`): 3 items. The corpus-wide runs of
  `LabelDummyRemoverTest` and `LabelSideSelectorTest` (`PIPELINE_SUITES_FULL=1`) fail 132 cases, all on
  `SelfLoopPreProcessor`; `NodeMarginCalculatorTest`'s `SelfLoopRouter` hook stays 7g.
- Suites: the 10 allocated to 7g by `plans/layered-pipeline/suite-allocation.md`; the baseline of the oracle runs is
  taken at 7g's start.

**Hand-offs to 7h.**

- Port `HierarchicalNodeResizingProcessor` (the 1 pending arm) and `CompoundGraphPreprocessor` and
  `CompoundGraphPostprocessor` (staged); the hierarchical driver path (`doCompoundLayout`, `hierarchicalLayout`,
  `ElkLayeredHierarchy.ts`).
- `include-children*` provider rows still expect the 7h throw (`test/helpers/layered-site-replay.ts`); 7h flips them.
- Accepted 7h refusals: 0 in `layered-labels.json`; 50 sweep cases (`INCLUDE_CHILDREN`). Unreached arms that need 7h: 7
  U items of `unreached.md` (hierarchical, nested-graph logging among them).
- Suites: the 9 allocated to 7h.
- Vendor new models outside `inputs/realworld/` (`.agent-notes/layered-pipeline.md`: `LayeredFrameworkVectors` closes
  that tree); 7f2's are under `inputs/labels/`.

**Flags for the user (open decisions).**

- Upstream (G10, stop 22): `fix/end-label-group-self-add` and `fix/end-label-group-order` are local, unsigned and not
  pushed, in worktrees `../elk-end-label-group-self-add` and `../elk-end-label-group-order`; the sign, push and PR
  commands are in the journal's T18 rows. The issue draft on `BF_MODEL_ORDER`/`DF_MODEL_ORDER` is never filed. Later
  candidates, each needing a judgement on intended behaviour: the visitor's `IndexOutOfBoundsException`
  (`InteractiveLayeredGraphVisitor.java:650`), `EndLabelPreprocessor`'s dead `LabelSide.ABOVE` arms,
  `EdgeAndLayerConstraintEdgeReverser`'s dead label checks (`:297,338`).
- G3 as written said property order is insertion order; G3a (user) replaced it by identity-hash normalisation, and the
  port iterates properties as the landed `JavaHashMap` does, compared as a multiset.
- The label metrics (FX8) remain a macOS JVM snapshot, now 2,258 entries; a re-record elsewhere is a decision.
- Upstream prose typo corrected at the port site (`LabelManagementProcessor`, "edge Unand tail labels"), listed in
  `docs/conformance.md`.
- `../elk` HEAD `b715fb1`; the diff to the pin over the layered, core, common and test bundles is empty; recheck in each
  mission.

**Follow-ups (outside this mission's write-sets).** Five mutation survivors in `LabelDummySwitcherSpaceEfficient.ts`
need a new oracle graph to discriminate; 7f's cleanup follow-ups stand.

## Revision 2026-11-10 (layered-loops-wrapping-compaction)

Appended; no earlier line is edited. Source: W1-W14 in `plans/layered-loops-wrapping-compaction/decisions.md`; the journal is
`plans/layered-loops-wrapping-compaction/decision-journal.md`. Where this section conflicts with the text above, this section
wins. It is the binding input of the 7h brief.

**Row 7g is done (tasks T1-T22).** The self loop package (`intermediate/loops` with `ordering` and `routing`), the four self loop
processors, `DummySelfLoopProcessor`, `intermediate/wrapping`, `intermediate/compaction`, the layered
`compaction/{oned,components,recthull}` and `ComponentsCompactor` are ported, and the 9 pending arms are wired;
`LayeredLayoutProvider.layout` runs self loops, `SINGLE_EDGE` and `MULTI_EDGE` wrapping, post compaction and
`compaction.connectedComponents`. The formerly pinned row `models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN`
replays its recorded expectation, and `full/labels/ticket-213_componentsCompaction` is a row of the new ref.

**Enum tally after 7g.** 58 arms ported, 1 pending: 7h `HIERARCHICAL_NODE_RESIZER` (7b 10, 7c 10, 7d 5, 7e 6, 7f 6, 7f2 12, 7g 9).

**Evidence.**

- `layered-loops.json` (16,358,809 bytes): `full` 731, `models` 307, `scenarios` 525, `sites` 64; `LayeredLoopsVectors.test.ts`
  replays every row of the four groups with 0 mismatches (1,637 tests, about 8 s alone; budget 30 s);
  `LayeredLoopsSites.test.ts` replays the 64 `sites` rows again under their scenario titles.
- 10 Java suites ported with their own assertions (16, 2, 5, 3, 2, 1, 1, 1, 1, 1 oracle runs); the start run equals the
  baseline; the end run equals the start run.
- Corpus-wide runs (`PIPELINE_SUITES_FULL=1`): 550, 550, 2,200, 550 + 1, 551 + 1 and `PortListSorterTest` 1,114, 0 failures,
  equal to the oracle's counts.
- Loops sweep: 3,073 oracle cases (part a 600, b 105, c 2,368; 2,997 ok, 76 throws); TS at stride 1: 2,997 hash-equal, 0
  mismatches, 76 throws on both sides.
- Twins: every iterated identity-keyed container of W6 is order-independent on the rows that reach it; R9 holds for
  `SplineEdgeRouter.getSplinePath` (254 rows), and one site (`collectVerticalSegmentsSplines`, 7 of 56 multi-edge rows)
  matches only in insertion order (issue #54).
- Coverage 98.78 / 96.75 / 98.77 / 98.79 after batch 10; coverage map `unreached.md` (372 items: S 97, J 43, U 211, X 21);
  174 anchored cases; mutation checks killed 121 of 137 mutants (5 equivalent or dead, 11 survivors).
- Landed vectors and goldens unchanged; the refs diff adds `layered-loops.json`, `inputs/loops/**` (40 inputs), the sweep test,
  and appends 43 label texts (2,258 to 2,301 keys) to `layered-label-metrics.json`.

**Decisions taken during the run.**

- Task boundary move (batch 2): T5 ported `SelfLoopPreProcessor`, T9 `SelfLoopPortRestorer`, T13 `SelfLoopRouter` and
  `SelfLoopPostProcessor`, so each self loop package met its oracle rows in the batch that ported it.
- Entry-point resolution (T15 `fix`): the cycle through `SplineSelfLoopRouter`'s `extends` makes `OrthogonalSelfLoopRouter` and
  `PolylineSelfLoopRouter` unusable as entry points; they are entered through the enum (7b decision E1, part 3), leave the
  entry-point lists, and no `src/` change was needed.
- NaN-canonical sweep hash (T19 `fix`): NaN is hashed as the one canonical NaN; every other value keeps its raw bits.
- Removed ptolemy filter (T17 `fix`): `ptolemy-suite-sources.ts` no longer excludes `gt_sinewaveoptimization_*`.
- Label-manager twin follows the row's recorder (T20 `fix`).
- Two W9 assertion changes moved between tasks: the `ComponentsCompactor`-related pins of `ComponentsProcessor.test.ts` moved
  from T15 to T12 (the placers construct the compactor without the enum), and `NodeMarginCalculatorTest`'s scope text and the
  `ptolemy-suite-sources.ts` filter widened in T17 (the filter is outside T17's write-set).

**Hand-offs to 7h.**

- Port `HierarchicalNodeResizingProcessor` (the 1 pending arm, `HIERARCHICAL_NODE_RESIZER`) and `CompoundGraphPreprocessor`,
  `CompoundGraphPostprocessor` and `CrossHierarchyEdge` (staged: `test/architecture/staged-classes.json` holds exactly these
  three rows, mission `7h`).
- The 7h refusal categories of the recorder and the sweep are `INCLUDE_CHILDREN` and `HIERARCHICAL_NODE_RESIZER`; the recorded
  ref has 0 accepted refusals.
- The loops sweep dropped 50 label-sweep (part b) cases refused by `INCLUDE_CHILDREN`; they belong to 7h's sweep.
- `include-children*` site rows of earlier missions (`test/helpers/layered-site-replay.ts`) still expect a throw naming 7h; 7h
  flips them.
- U items of `unreached.md` owned by 7h: the `NorthToSouthRoutingStrategy`/`SouthToNorthRoutingStrategy` arms (`:54 if[1]`,
  `:38`, `:58`, `:78`; they run only from the hierarchical port router) and the `SelfLoopPreProcessor.java:55,90,100` arms that
  need a compound node.
- Inputs that use `elk.stress`: `tickets/layered/665_includeChildrenDoesntStop.elkt` and
  `examples/hierarchy/hierarchicalLayoutMixing.elkt` (both set `hierarchyHandling: INCLUDE_CHILDREN` at the root;
  `.agent-notes/layered-pipeline.md`); the recorders' classpath registers no such algorithm, neither file is in a landed ref,
  and the stress algorithm is not ported.
- Suites: the 9 allocated to 7h by `plans/layered-pipeline/suite-allocation.md`.
- Vendor new models outside `inputs/realworld/`; 7g's are under `inputs/loops/`.

**Flags for the user (open decisions).**

- Issue #53 (`needs-ruling`): the NaN-canonical form amends W5's raw IEEE hex for NaN only; confirm or reject, decide whether the
  landed sweeps adopt it, and whether the NaN layouts join the upstream drafts.
- Issue #54 (`needs-ruling`): 7 `HORIZONTAL_COMPACTOR` rows of `models/splines-hyperedges-hyperedges_1/root` match the oracle
  only in insertion order of `SplineSegment.edges` (R9 at `collectVerticalSegmentsSplines`); the rows pass as recorded.
- Issue #56 (`needs-ruling`): the six upstream drafts of the journal's T22 row (`GraphStats.java:295-302`,
  `LabelPlacer.java:296`, `PortRestorer.java:180-188`, `SplineSegment.java:82`, NaN layouts, oracle throws); nothing is filed.
- Issue #55 (`follow-up`): the mutation survivors and the graphs a discriminating oracle row needs.
- The label metrics table grew by 43 texts (2,258 to 2,301 keys); it remains a macOS JVM snapshot (FX8).
- `../elk` HEAD is 22 commits past the pin; the diff to the pin over the layered, core, common and layered-test bundles is empty.

**Follow-ups (outside this mission's write-sets).** The survivors and unreached graphs of issue #55; `SplineEdgeRouterSegments.ts:137
if[1]` (`SplineEdgeRouter.java:395-404`) has no graph; the cleanup follow-ups of 7f and 7f2 stand.

## Revision 2026-11-10 (layered-compound)

Appended; no earlier line is edited. Source: H1-H14 in `plans/layered-compound/decisions.md`; the journal is
`plans/layered-compound/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task
ids are T1-T16.

**Row 7h is done.** The `compound` package (`CrossHierarchyEdge`, `CrossHierarchyEdgeComparator`, `CompoundGraphPreprocessor`,
`CompoundGraphPostprocessor`) and `HierarchicalNodeResizingProcessor` are ported, the last pending arm
(`HIERARCHICAL_NODE_RESIZER`) is wired, and the hierarchical driver of 7f (`doCompoundLayout`, `hierarchicalLayout`,
`ElkLayeredHierarchy.ts`) is proven against the oracle with no defect found in it. `LayeredLayoutProvider.layout` runs every
hierarchy-handling mode, `INCLUDE_CHILDREN` included. Design and runbook: `docs/architecture/alg-layered-compound.md`; counts:
`docs/conformance.md` § alg.layered, part i.

**Enum tally after 7h.** 59 arms ported, 0 pending (7b 10, 7c 10, 7d 5, 7e 6, 7f 6, 7f2 12, 7g 9, 7h 1).
`test/architecture/staged-classes.json` is `[]`: the staged list is empty.

**Evidence.**

- `layered-compound.json` (12,237,513 bytes): `full` 355, `models` 73 (whole-tree stops), `scenarios` 88, `sites` 24 (19 run
  rows, one of them logged, and 5 throw rows); `LayeredCompoundVectors.test.ts` replays every row through the real driver with 0
  mismatches (542 tests, 5.3 s alone at batch 7; budget 30 s); `LayeredCompoundSites.test.ts` 27 tests.
- Goldens: 24 refs under `test/golden/refs/elk-layered/` (four ptolemy hierarchical models × six direction and hierarchy
  variants, `-XX:hashCode=2`, named in `_meta.json`), equal to the TS layout at AD-4; byte-equal to a run without the flag;
  `refs/elk` and `refs/elk-algorithms` regenerate byte-identically.
- Suites: 97 of 97 `alg.layered.test` Java files ported (the nine issue suites and `SelfLoopTestGraphCreator`'s helper); the
  3 graph.json methods deferred to 7h ported (`EdgeCoordsTest`, `exportLayoutOptions`, `importIndividualSpacingsTest`); the
  oracle runs at mission start and at mission end equal the baseline (`docs/conformance.md`).
- Compound sweep: 1,169 oracle cases (part a 45, b 100, c 1,024; the 50 label-sweep refusals of 7g are part a's enumeration, 45
  after the stress filter): 1,164 ok, 5 throws, 0 timeouts, 0 refusals; TS at stride 1: 1,164 hash-equal, 5 throws equal, 0
  mismatches.
- Twins: five of the six hashed-container sites of the 7h classes are order-independent on every row that reaches them (369,
  297, 67, 197 and 321 rows, 0 differ); the postprocessor's `crossHierarchyMap.keySet()` order is observable in a shared port's
  edge list in the intermediate tree (7 of 238 rows, 13 ids with the `sites` rows) and not in any export. The order a
  treeified bucket would use is not established; the observable site has at most 6 keys.
- Mutation checks: 206 mutants, 185 killed by the replay stage and the class tests and twins, 21 survivors (equivalent, or reached
  and not observed by a recorded field); the anchored files alone kill 129.
- Coverage of the 7h classes 99.6 / 98.0 / 100 / 99.6 (statements / branches / functions / lines); whole suite after batch 8
  98.82 / 96.83 / 98.78 / 98.82, 956 files, 45,206 tests.
- Landed vectors, goldens and refs unchanged; the refs diff adds `layered-compound.json`, `refs/elk-layered/**`,
  `golden/layered.json`, 31 inputs under `inputs/compound/`, the sweep test, and appends 16 label texts to
  `layered-label-metrics.json`.

**Decisions taken during the run.** The task and journal rows hold each; the ones a later mission should know:

- The compound `models` rows replay through `RecursiveGraphLayoutEngine`, like `full`, not through a direct `doCompoundLayout`
  call (T1); a nested level's plan lacks the P3 sweep and the hierarchical greedy switch, which `hierarchicalLayout` skips
  without notifying.
- The recorder's tree dump gained `layerNodes` (T1 `fix`, before any TS existed); the first recording differs from the second
  only by that field.
- A throw row is a new row shape (`expected.throws` with class, message and the first ELK frame); a replay compares class and
  the frame through a stack inspection (T14).
- H5 part (c) selects no file as worded; `INCLUDE_CHILDREN` is applied at the root of every ptolemy hierarchical file (T13).
- `STRESS_PENDING` lives in `test/helpers/stress-pending.ts`, not in the runner (T11).

**Divergences fixed at origin.** The TS multimaps had no `toString` (`src/guava/Multimap.ts`, T14); the replay comparator's
value-form maps and the `layerNodes` comparison were fixed in the helpers (T6, T7, T8, T9). None was a layout divergence.

**Hand-offs.**

- To 9 (elkt corpus): layered is ready to register for the corpus; `tools/corpus/ts-layout-compare.ts` registers no layered
  algorithm today (a 7f follow-up), so the elkt corpus does not yet compare layered layouts.
- To 8b (`elk.stress`, issue #58, H13): `Issue665Test` (1 case) and `Issue700Test` (2 of 4 cases) wait. Remove `STRESS_PENDING`
  (`test/helpers/stress-pending.ts`) and its uses when stress is ported; the suites then run 1 + 2 more cases. A third stress
  input, `tickets/layered/588_hierarchicalLayoutNPE.elkt`, is read by no 7h suite and is not vendored.
- To 12 (docs site): `docs/architecture/alg-layered-compound.md` is new and linked from `docs/architecture/overview.md`,
  `alg-layered.md` and `docs/conformance.md`; the site publishes `conformance.md` and `overview.md` as wrappers, and no
  `alg-layered-*.md` page is in its `CANONICAL_PAGES` (unchanged from 7a to 7g).

**Flags for the maintainer (open decisions).** Open `needs-ruling` issues (`gh issue list --label needs-ruling --state open`):

- #61: the upstream drafts of this mission: U1 `SplineSegment.java:247` (`SPLINES` in `DOWN` or `UP` under `INCLUDE_CHILDREN`),
  U2 `ElkGraphImporter.java:1146` (`425_selfLoopInCompoundNode.elkt`), U3 `LGraphUtil.java:944` (`FIXED_RATIO`, a `null`
  `portNodeSize` from `CompoundGraphPreprocessor.java:182-185`), U4 `LayerSweepCrossingMinimizer.java:193-194` (one option
  tested twice), U5 `HierarchicalNodeResizingProcessor.java:207-220` (`moveExternalPorts` overwritten for nested graphs).
  Nothing is filed upstream.
- #59: 25 handed-over arms neither reached nor proven dead (six of `NorthToSouthRoutingStrategy`/`SouthToNorthRoutingStrategy`,
  19 of 7c's list); they stay as they are.
- #58: the three stress cases above.
- Earlier, still open: #56 (7g upstream drafts), #54 (spline segment edge order under compaction), #53 (NaN-canonical sweep
  hash), #52 (platform of the label-metrics snapshot), #51 (sign and file upstream fixes).
- The label metrics table grew by 16 texts; it remains a macOS JVM snapshot (FX8, #52).

**Follow-ups (outside this mission's write-sets).** `follow-up` issues open: #60 (oracle graphs for the compound mutants no
recorded field observes: G18, D10, D14, D15, D32 D33 D36 D39 D40 D44, the `moveExternalPorts` group, K9 and the others
that need a recorder field), #62 (three p3order test titles that still say "U for the rows until 7h"), #63 (the `STRIP_KEYS`
hand-off of `docs/architecture/elk-json.md` to 7h, which the brief did not carry and which changes landed parse refs), #55
(7g's unobserved arms).

## Revision 2026-11-11 (alg-trees)

Appended; no earlier line is edited. Source: TR1-TR10 in `plans/alg-trees/decisions.md`; the journal is
`plans/alg-trees/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task ids are
T1-T20; the base is `ab05a29bf42b0c246d18f891c64f740d21b2b9d4`.

**Row 8a is done.** `alg.mrtree`, `alg.radial` and `alg.vertiflex` are ported to `src/alg/{mrtree,radial,vertiflex}/` with
their generated options and providers (issue #37). `RecursiveGraphLayoutEngine` lays out a graph with each once its provider is
registered. Design and runbook: `docs/architecture/alg-trees.md`; counts: `docs/conformance.md` § Tree algorithms. The final
commit is one squashed commit `feat(trees): port mrtree, radial and vertiflex (8a)` with `Refs: #37`; the per-task history is
under the tag `alg-trees/pre-squash`.

**Evidence.**

- Vector refs (oracle `8aaa3c14`, `-XX:hashCode=2`, cold re-records `cmp`-identical at mission end): `mrtree.json` 188 rows
  (full 122, stops 54, throws 12), `mrtree-extra.json` 213 (140 / 68 / 5), `radial.json` 309 (148 / 150 / 11),
  `vertiflex.json` 471 (247 / 216 / 8), `mrtree-units.json` 2,656 (`edgeRouter` 422, `cyrusBeck` 46, `orderBalance` 18,
  `average` 2,170). Every row replays through the real provider with 0 mismatches except the two classified radial rows
  (`i30/rand-chain-big`, issue #64).
- Goldens: the `trees` set, 40 refs under `test/golden/refs/elk-trees/` (37 from T4 and 3 retargeted), equal to the TS layout at
  AD-4; `default`, `algorithms` and `layered` regenerate byte-identically.
- JUnit: `MrTreeGraphSizeTest` 6 of 6, `CenterOnRootTest` 2 of 2; oracle 6 / 0 and 2 / 0 at the start and at the end.
- Sweep, 906 cases per algorithm, layered registered in a scratch driver: mrtree ok 814, mismatch 3, both-throw 89; radial ok
  538, mismatch 3, both-throw 365; vertiflex ok 350, mismatch 2, both-throw 553, excluded 1; 0 one-sided throws. The 8
  residual cases are 7 whose option keys belong to unported rectpacking and force providers and 1 last-ulp `Math.sin` string
  (HotSpot ...4178, V8 ...4177).
- Coverage: whole suite 98.87 / 96.91 / 98.82 / 98.87; mrtree 99.6 / 98.7 / 99.5 / 99.6, radial 99.3 / 96.7 / 98.8 / 99.3,
  vertiflex 99.5 / 97.4 / 100 / 99.5. `staged-classes.json` is `[]`; `PENDING_TYPES` is `[]`.
- Recursion kept verbatim; a 2,000-deep path and caterpillar per algorithm complete in oracle and port, with and without
  `--jitless`.

**Decisions taken during the run.**

- TR5 deviated (T5): the three providers were held back with staged provider classes (`// @staged 8a`) until T11, T13 and T17,
  not with `PENDING_TYPES`, because the landed tripwire `test/melk/model-algorithms.test.ts:121-123` asserts `PENDING_TYPES`
  equals `[]` (AD-13; 7a hit the same line). The options were final from T5 on. Flagged for the audit.
- Additive recorder extensions: `fix(T3)` (vertiflex, 283 to 471 rows; node-level `considerNodeModelOrder` and the BEND
  left-pass arm were unexercised because every row set it on the root only) and `mrtree-extra.json` (213 rows beside
  `mrtree.json`, which stays byte-identical because committed tests pin its counts).
- A committed unit-vector recorder `tools/vectors/MrTreeUnitVectors.java` and `mrtree-units.json` replaced scratch probes whose
  expectations sat in a 552 KB file under `src/` (AD-5).
- `DoubleStream.average` settled by 2,170 JVM vectors: Kahan `sum - c` with the simple sum when the compensated sum is NaN and
  the simple sum is non-finite (2,170 of 2,170); `src/alg/mrtree/p4route/DoubleStreamAverage.ts`.
- The sweep tool `tools/corpus/ts-layout-compare.ts` registers the three providers and maps an oracle
  `NullPointerException` to the port's `TypeError` and a `StackOverflowError` to `RangeError` in `classify` (D10, AD-16b).
- Additive golden entries `{mrtree,radial,vertiflex}-generated-retarget`; the three earlier generated entries were recorded with
  layered and stay as valid layered goldens.
- The NodePlacer `DIRECTION` write (`NodePlacer.java:103-105`) is restored in `buildBeforeGraphs` for every replay after it.
- Prose carve-out applied to two progress-monitor task names (no ref records them): "AbsolutPlacer"
  (`AbsoluteXPlacer.java:32`) is "AbsolutePlacer" and "General 'Rotator" (`GeneralRotator.java:30`) is "General Rotator" in
  the port; listed under "upstream typos" in `docs/conformance.md`.

**Divergences fixed at origin.**

- `FanProcessor.java:105` compares `String` objects by reference; the first port compared content, on a proof that assumed one
  `(pId, index)` pair per level. `stops/bfs/cyc79n7/searchOrder=BFS` of `mrtree-extra.json` exposed it; the proof is withdrawn
  and the port models the identity of the `String` objects (T16).
- `NodeComparator.java:45-46` unboxes a null `NODE_MODEL_ORDER`: Java throws, the port returned 0. Found by the sweep
  (`edge_label_placement/hierarchy01`), fixed with `src/java/lang/Unbox.ts`; the same class of site at `RelativeXPlacer.java:455-456`
  (T8).
- A whole-ref test loop timed out at the 5 s default under coverage (`test/helpers/mrtree-replay-state.test.ts:93`); an explicit
  60 s timeout, now required of every whole-ref loop.
- The `trees` golden entries without `retarget` recorded layered (T4, found by T18).

**Hand-offs.**

- To 8b (disco; `elk.stress`, issue #58, as the layered-compound hand-off names it), 8c (spore) and 8x: per TR9, `NodeMicroLayoutTest` still needs force,
  stress and rectpacking (8x); `PlainJavaInitializationTest` and `ElkReflectTest` need force, stress, disco, rectpacking and
  spore (8x, after 8c); `DepthFirstCompaction` recursion is spore's (8c); `TwoBitGridTest`, `PlanarGrid` and `PolyominoOptions`
  registration are disco's (8b).
- To row 9 (elkt corpus): register the remaining providers, layered included, in `tools/corpus/ts-layout-compare.ts`; with layered
  registered the tree sweep has 8 residual cases (7 need rectpacking or force, 8x).

**Flags for the maintainer (open decisions).** Open `needs-ruling` issues:

- #64: radial `i30/rand-chain-big` (stops and full rows) depends on the iteration order of a treeified identity `HashSet` bin;
  classified, not matched.
- #65: upstream defects the ports copy (BFS two-parent trees, `edgeRoutingMode=NONE`, boxed and `String` reference comparisons,
  `EadesRadial.java:108`, cyclic graphs that pass the tree checks); drafts only, nothing filed upstream.
- #68: the 8 residual sweep cases and the three `*-generated` goldens recorded with layered (keep or drop).

Open `follow-up` issues: #66 (recorder scenarios for unobserved mutants and unrecorded arms) and #67 (the port's recursion
depth limit is below the oracle's for four deep-tree shapes, 2,500-3,500 against 3,500-7,000).

Audit points: the TR5 deviation (above); assertion pins changed inside the mission, none of them an oracle, vector or golden
expectation: the staging tripwires (enum-test cases that asserted `create()` throws the staged message now assert the
instance; `*Staged.test.ts` shrunk and deleted), the vertiflex count pins (283 to 471, 150 to 247, 125 to 216) changed before
the extended ref was committed, and the `EdgeRouter.test.ts` direction pin (`…/UNDEFINED` to `…/DOWN`, because the oracle's
graphs hold DOWN after `NodePlacer`); the `MARKER` widening in `test/architecture/staged-classes.fitness.test.ts` (one token,
`8a`, and its header comment). The T17 hand-derived coordinates were replaced by structural assertions before the commit.

## Revision 2026-11-11 (alg-force-disco)

Appended; no earlier line is edited. Source: FD1-FD10 in `plans/alg-force-disco/decisions.md`; the journal is
`plans/alg-force-disco/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task ids are
T1-T13; the base is `554490d4c448caf332ef4c238a9eb95661f784e0` (the 8a squash commit).

**Row 8b is done.** `alg.force` (the force layout `elk.force` and the stress layout `elk.stress`) and `alg.disco` are ported to
`src/alg/{force,disco}/` with their generated options and providers (issue #38). `RecursiveGraphLayoutEngine` lays out a graph
with each once its provider is registered. Design and runbook: `docs/architecture/alg-force-disco.md`; counts:
`docs/conformance.md` § Force, stress and disco. The final commit is one squashed commit
`feat(force): port force, stress and disco (8b)` with `Refs: #38` (FD10); the per-task history is under the tag
`alg-force-disco/pre-squash`.

**Evidence.**

- Vector refs (oracle `8aaa3c14` with patches 0001 and 0002, `-XX:hashCode=2`, cold re-records `cmp`-identical): `force.json`
  20,804 rows (full 594, stops 194, throws 2, log 20,014), `stress.json` 431 (320 / 108 / 3), `disco.json` 185 (92 / 88 / 5).
  Replays through the real providers: force 259,243 hex doubles, stress 135,229, all raw-bit identical; disco 75,002 raw-bit
  identical and 32 within 1e-6 only (maximum 8.5e-14), none beyond.
- Goldens: the `force-disco` set, 45 refs under `test/golden/refs/elk-force-disco/` (force 15, stress 10, disco 20), equal to
  the TS layout at AD-4; `default`, `algorithms`, `layered` and `trees` regenerate byte-identically.
- JUnit: `ForceImportTest` 3 of 3, `TwoBitGridTest` 3 of 3; oracle 3 / 0 and 3 / 0 at the start; at the end
  3 / 0 and 3 / 0 again.
- Sweep (layered registered): force planned 906, ok 815, mismatch 2, both-throw 89; stress planned 898, ok 807, mismatch 2,
  both-throw 89; disco planned 906, ok 0, mismatch 819 (all options-only), both-throw 87; 0 one-sided throws in all three. The
  mismatches are the rectpacking option key (issue #71 item 2) and the `debug.discoGraph` identity text (item 1).
- Coverage: the two bundles 99.93 / 98.67 / 100 / 99.93 (statements / branches / functions / lines); 298 of 302 branches, the
  other four are `U` rows 7, 8, 12, 16 of `plans/alg-force-disco/unreached.md` (16 `U` rows; "neither reached nor proven dead"
  is empty). Whole suite at the batch 5 gate 98.9 / 96.94 / 98.86 / 98.91 over 47,912 tests; at mission end
  98.9 / 96.95 / 98.86 / 98.91 over 47,913 tests. `staged-classes.json` is `[]`; `PENDING_TYPES` is `[]`.
- Recursion kept verbatim; a 2,000-node path completes in the oracle, in TS and under `--jitless`.

**Decisions taken during the run.**

- FD1: two JVM recorders (`ForceVectors.java` for force and stress, `DiscoVectors.java`), rows `full`, `stops`, `throws`.
- FD2: a new `force-disco` golden set, one golden per option value, one factor at a time.
- FD3: `EadesModel` calls `JavaMath.log`, the fdlibm `e_log`, raw-bit equal on all 20,014 JVM rows (V8 differs on 101, 0.50 %);
  proven on arm64, unverified on x86_64. `Random.ts` now imports it and its private copy is deleted.
- FD4: identity-hashed containers in insertion order; the one order-observable site (`adjustedPorts`) has a reversed-order twin
  that changes 2 of 41 rows, so the oracle used insertion order; parallel streams are sequential.
- FD5: three staged providers until wired, `MARKER` widened by one token (`8b`, pre-approved, no expected value changed);
  tests register providers explicitly, `PolyominoOptions` beside `DisCoMetaDataProvider`.
- FD6: oracle sweeps per algorithm with `-XX:hashCode=2`; TS through `ts-layout-compare.ts`, which gained the registrations.
- FD7: recursion verbatim; the 2,000-deep probe converted nothing (issue #70 records what lies beyond).
- FD8: `ForceImportTest` and `TwoBitGridTest` ported whole.
- FD9: issue #58 stays with the maintainer; debug properties kept; cross-bundle suites to 8x.
- FD10: one squash commit on the base, tag `alg-force-disco/pre-squash`, footer `Refs: #38`.

Deviations from the plan, all journaled: (1) write-set additions: helper files beside the planned ones rather than edits to
landed helpers (`test/helpers/force-replay-{elk,stops,stress}.ts`, `disco-replay-{elk,stops}.ts`,
`force-replay-dump.test.ts`, `DisCoLayoutProvider.test.ts`). (2) `layered` is registered in `tools/corpus/ts-layout-compare.ts`
beside force, stress and disco, one registration beyond the task's wording: without it the exporter picks different option
suffixes and nested default-algorithm nodes throw (probe on the 286-row sweep: 117 options-only mismatches and 5
`ts-only-throw` each for force and stress, 0 and 0 with it); the registrations are the `*MetaDataProvider`s the oracle registers.
(3) The brief's premise "disco throws in `firstEdgeSection` for an edge without a section" was wrong; the call creates a
section, so those rows are `full` and `stops` rows. (4) The recorder skips `repulsivePower` on graphs with an antiparallel
pair (the hang below). (5) Tests and tools register `PolyominoOptions` next to `DisCoMetaDataProvider` (FD5), which answers the roadmap note that nothing registers it before disco.

**Divergences and kept quirks.** Known divergences (details in `docs/conformance.md`): last-ulp `Math.sin`/`Math.cos` in
`ElkGraphTransformer.getOrthogonalPoints` (32 fields, at most 8.5e-14; V8 equals `StrictMath`, HotSpot's intrinsics differ on 5
`sin` and 9 `cos` inputs of 160 each; no contour cell flips); `debug.discoGraph` identity text (#71); option keys that depend on
the unported rectpacking provider (#71). Kept upstream quirks: the `avoidSamePosition` hang (`AbstractForceModel.java:187-208`);
DisCo's no-op polyomino options; `ComponentsProcessor.dfs` listing a cycle-closing edge twice; `recombine`'s empty bend-point
list for several components; `firstEdgeSection` creating a section; the `NullPointerException` for a parentless layout node
with an edge at its own port (`ElkGraphComponentsProcessor.java:108`); `broadestRow` written and never read; `DCPolyomino`'s
fill leaving a grid-aligned component with sentinel bounds that wrap in 32 bits. No upstream typo was found.

**Landed code fixed outside the bundles (stop 15, each at its origin with a stated mechanism).**

- `src/alg/common/polyomino/structures/TwoBitGrid.ts` `newWords`: `Array.from({ length })` yields `[]` for a negative length
  where Java's `new long[h][...]` throws `NegativeArraySizeException`; the new shim `src/java/lang/NegativeArraySizeException.ts`
  (parent `RuntimeException`, one row added to `test/architecture/exception-hierarchy.fitness.test.ts`). JVM probe: `(-4, 9)`
  gives "-4", `(3, -64)` "-2", `(-4, -64)` "-4", `(0, -64)` "-2".
- `src/graph/json/JsonExporter.ts`: a list-valued option was written with `Array.prototype.toString`; Java writes
  `AbstractCollection.toString`. Array values go through `collectionText`; a unit test was added.
- No landed expected value, ref, vector or tolerance changed. The only change to a landed test file under the gates is five new
  cases in `test/corpus/ts-layout-compare.test.ts`.

**Hand-offs.**

- To 8c (rectpacking): once rectpacking is registered, remove the `SUFFIX_DIFFERENCES` row of golden `force--iterations-50`
  (its tripwire fails until then) and re-run the sweep; the 6 sweep residuals (`interactiveRectpacking_{hierarchy,oneBigNode}`
  for force, stress and disco) close.
- To 8x: `NodeMicroLayoutTest` needs rectpacking; `PlainJavaInitializationTest` and `ElkReflectTest` need the remaining
  algorithms (8x, after 8c); `alg.disco.debug` is reference only.
- To row 9: `tools/corpus/ts-layout-compare.ts` now registers layered, the three tree algorithms, force, stress and disco; the
  remaining registrations (rectpacking, spore, topdownpacking, the others) are row 9's. Issue #68's force keys
  (`desiredEdgeLength`) are registered now; its rectpacking keys wait for 8c.
- Issue #58: the evidence is posted on the issue (all three held-back cases pass with the Java's assertions from temporary
  copies once `elk.force` and `elk.stress` are registered). Two further blockers independent of `elk.stress`:
  `refs/java/layered-label-metrics.json` lacks four label texts (`insideOtherLayout`, `child1`, `child2`,
  `insideOtherDirection`), and the two models are not vendored. `STRESS_PENDING` and both suites are untouched.
- Issue #70 (`follow-up`): `ComponentsProcessor.dfs` and `ElkGraphComponentsProcessor.dfs` overflow V8's stack beyond FD7's
  2,000 (TS completes at 4,000 and overflows at 16,000; the oracle completes at 16,000).

**Flags for the maintainer (open decisions).** Open `needs-ruling` issues:

- #69: the two upstream defects the ports copy (the `avoidSamePosition` hang, DisCo's no-op polyomino options), with upstream
  drafts; nothing filed upstream. Also asks whether a browser library may loop forever on a valid input until upstream fixes it.
- #71: the two classified option-text differences (`debug.discoGraph`, the rectpacking-dependent keys).
- #58: the stress-case ruling (evidence posted).

Open `follow-up` issue: #70 (the dfs recursion depth).

Audit points: the `decisions.md` audit points, the `MARKER` widening (FD5) and the new shim behind FD3 (the Java calls
`Math.log`, the port calls `JavaMath.log`); the `AbstractForceModel` entry-point ruling (the base class cannot be loaded first,
resolved under the layered-cycles-layers E1 and 7g T15 precedent; eight landed base classes behave the same); the `layered`
registration in the sweep tool; the x86_64 limit of FD3; the Row 16 argument of `unreached.md` (`ElkGraphTransformer.java:499-500`
is dead by a reading of the Java, not by a vector); the one added exception row in the exception-hierarchy fitness test.

## Revision 2026-11-13 (alg-packing)

Appended; no earlier line is edited. Source: PK1-PK12 in `plans/alg-packing/decisions.md`; the journal is
`plans/alg-packing/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task ids are
T1-T15; the base is `a30af6618ce3686be283d69fa1eac271670d8042` (the 8b squash commit).

**Row 8c is done.** `alg.rectpacking`, `alg.spore` (the algorithms `sporeOverlap` and `sporeCompaction`) and
`alg.topdownpacking` are ported to `src/alg/{rectpacking,spore,topdownpacking}/` (42, 21 and 11 modules) with their generated
options and providers (issue #39). `RecursiveGraphLayoutEngine` lays out a graph with each once its provider is registered.
Design and runbook: `docs/architecture/alg-packing.md`; counts: `docs/conformance.md` § Rectpacking, spore and topdownpacking.
The final commit is one squashed commit `feat(packing): port rectpacking, spore and topdownpacking (8c)` with `Refs: #39`
(PK12); the per-task history is under the tag `alg-packing/pre-squash`.

**Evidence.**

- Vector refs (oracle `8aaa3c14` with patches 0001 and 0002, `-XX:hashCode=2`, cold re-records `cmp`-identical at mission end):
  `rectpacking.json` 1,356 rows (full 558, stops 151, throws 7, sort 640), `spore-layout.json` 339 rows (full 113, stops 60,
  throws 4, minst 95, jitter 4, objects 63), `topdownpacking.json` 898 rows (full 296, stops 288, predicted 296, throws 18).
  Replays through the real providers and `RecursiveGraphLayoutEngine`: rectpacking full and stops rows raw-bit identical
  (66,304 and 132,339 doubles at T12, before the 13 rows T14 added, which also replay at raw bits); spore 67,980 doubles raw-bit
  identical at T11, all 76 order-sensitive `minst` rows in the recorded order (the end-to-end `NaiveMinST` tie order); all 898
  topdownpacking rows equal, with the real row list lengths of `GridElkNode`.
- Goldens: the `packing` set, 44 refs under `test/golden/refs/elk-packing/` (rectpacking 17, sporeCompaction 13, sporeOverlap 7,
  topdownpacking 7; one per option value; the four `--minst-ties-*` entries included), equal to the TS layout at AD-4;
  `default`, `algorithms`, `layered`, `trees`, `force-disco` and `packing` regenerate byte-identically at mission end.
- JUnit: the eight suites ported whole, 30 runs: `CompactionTest` 10, `PaddingTest` 4, `Issue583Test` 1, `UtilsTest` 3,
  `ScanlineOverlapRemovalTest` 1, `TopdownPackingTest` 4, `TopdownLayoutTest` 5, `PortPlacementCalculationTest` 2; the oracle
  runs 30 / 0 at the start and at the end.
- Sweep (every provider registered): rectpacking planned 919, ok 830, mismatch 0, both-throw 89; topdownpacking planned 906,
  ok 906; sporeCompaction planned 906, ok 99, nondeterministic 807; sporeOverlap planned 906, ok 94-97, both-throw 20-21,
  nondeterministic 788; 0 one-sided throws and 0 mismatches among deterministic cases, apart from four `sporeOverlap` cases
  the oracle's two-run determinism check misses (issue #79). The 8b residuals (6 cases) and the #68 item A residuals (7 cases)
  are `ok`.
- Coverage (each bundle's own tests): rectpacking branches 98.12 % (418 of 426), spore 100 % (85 of 85), topdownpacking
  96.42 % (54 of 56); `plans/alg-packing/unreached.md` has 18 `U` rows and one arm neither reached nor proven dead
  (`Compaction.java:364`, issue #81). Whole suite at mission end: 98.92 / 96.99 / 98.84 / 98.92 (statements / branches / functions / lines) over 49,157 tests. `staged-classes.json` is `[]`; `PENDING_TYPES` is `[]`.
- Recursion (PK6): `DepthFirstCompaction.compactTree` (landed `alg.common/spore`) and `GrowTreePhase.growAt` are explicit-stack
  loops, each proven against its verbatim recursive form on 1,000 seeded trees; both 2,000-node chains complete in the oracle
  and in TS. Under `--jitless` the overlap chain is in the default suite and the compaction chain passed in one detached run (2,394 s; it stays behind `SPORE_CHAIN_FULL=1`, `DepthFirstCompaction` being cubic on a path).

**Decisions taken during the run.**

- PK1: three recorders; stops are taken at the providers' own `logGraph` points (rectpacking) and through stepwise calls of
  the phases checked against the engine run (spore, topdownpacking); the `sort`, `minst`, `jitter` groups as planned, and one
  group beyond the plan, `objects` (63 rows: `Objects.equals`, `KVector.equals`, `TTriangle.contains`, `TEdge.equals` with NaN).
- PK2: the `packing` golden set; options with one constant (`structureExtractionStrategy`, `compactionStrategy`, topdown's two
  strategies) and `sporeOverlap`'s `processingOrder.*` (overwritten by the provider) have no golden.
- PK3: `GridElkNode implements ElkNode, Grid<ElkNode>` by delegation; `ElkGraphPackage`'s guard registry holds a list of classes
  per interface name; every landed guard result is unchanged.
- PK4: `Math.random()` verbatim; `jitter` rows assert invariants; nondeterministic sweep cases are counted, not compared.
- PK5: `JavaHashSet<TEdge>` and `JavaHashMap` (KVector strategy) replay the Java insertion history, `clear` keeping capacity.
- PK6: two conversions (above); thresholds beyond 2,000 in issue #76.
- PK7: `Array.prototype.sort` with the verbatim comparator; 427 of 640 JVM sort rows reproduce, 213 are classified (34
  Java-only throws, 179 order differences, all of length 32 or more), issue #75.
- PK8: 13 staged classes, unstaged task by task; `MARKER` widened by `8c`; four `NON_LEAF_DEFAULT_TYPES` entries.
- PK9: sweeps as above; the `SUFFIX_DIFFERENCES` row of `force--iterations-50` is removed.
- PK10: the eight suites. PK11: cross-bundle suites stay with 8x. PK12: one squash commit.

Deviations from the plan, all journaled: (1) T14 was split: its recursion half ran beside T12, its coverage half beside T13.
(2) The recorders were extended additively after the ports existed (13 rectpacking rows, 2 spore rows for arms no row
reached; 63 `objects` rows), each with a byte-identity proof of every earlier row. (3) Helper files beside the planned ones
(`rectpacking-replay-{run,p1p3,p2,provider}.ts`, `rectpacking-sort-classified.ts`, `spore-replay-providers.ts`,
`spore-tree-fixtures.ts`). (4) `tools/melk/config.ts` and the regenerated metadata providers were changed by the wiring tasks
(TDZ entries). (5) `tools/corpus/ts-layout-compare.ts` gained the #71 item 1 neutralisation of `debug.discoGraph` (ruled for
row 9; the PK9 re-run needed it). (6) `Compaction.compact` is split behind the class into `CompactionContext.ts` and
`CompactionPlacement.ts` (limits), and the staged provider tests of spore were deleted, not replaced (the vector replay
exercises the providers).

**Divergences and kept quirks.** Known divergences (details in `docs/conformance.md`): the 213 PK7 sort rows (interactive
rectpacking with at least 32 children carrying tied `desiredPosition`s can order differently from ELK, or lay out where ELK
throws); spore's jitter (inputs with coincident centres are nondeterministic in ELK and in the port); spore inputs whose
spanning tree is a path deeper than about 2,125 overflow V8's stack where the oracle completes up to 4,000 (#76). Kept
upstream quirks: the `absorbBlocks` hang (#73); the stale parent row after `placeNextBeside`; `RectRow.removeBlock` reducing
the width for an absent block; the `AreaApproximation.java:98` `NullPointerException` for zero-size nodes with zero spacing;
`InteractiveRectPackingGraphVisitor`'s reversed `endsWith` (and that nothing applies the visitor); `GridElkNode.put`'s insert
semantics; spore's overwritten explicit margins; `MaxSTPhase` rooting on `.vertex` while `MinSTPhase` roots on
`.originalVertex`. One upstream typo corrected (the task name of `ToAspectratioNodeExpander.java:51`).

**Changes to landed code.**

- `src/java/util/JavaObjects.ts` `equals`: an object equals itself before `equals` is called (the JVM's `Objects.equals`; a
  `KVector` with a NaN component is not equal to itself under `equals`). Found by the sweep (19 ptolemy cases); proven by the
  `objects` vector group; no landed expectation changed.
- `src/alg/common/spore/DepthFirstCompaction.ts` `compactTree`: explicit stack (PK6; the hand-off mission 6a recorded).
- `src/graph/ElkGraphPackage.ts`: the guard registry (PK3). `test/architecture/staged-classes.fitness.test.ts`: `MARKER`.
  `test/golden/force-disco-goldens.test.ts`: three registrations and the pre-approved row removal.
  `tools/oracle/regen-goldens.sh`: the `packing` set. `tools/melk/config.ts`: four `NON_LEAF_DEFAULT_TYPES` entries.
- No landed expected value, ref, vector or tolerance changed.

**Hand-offs.**

- To 8x: `NodeMicroLayoutTest`, `PlainJavaInitializationTest` and `ElkReflectTest` are unblocked (every in-scope algorithm is
  ported).
- To row 9: `tools/corpus/ts-layout-compare.ts` registers every in-scope provider and carries the #71 item 1 neutralisation;
  the sweep's determinism check for spore (#79) and a per-case bound (cubic `DepthFirstCompaction`, #73's inputs) are open.
- `docs/parity-report.md` is generated (`tools/corpus/parity-report.ts`); its TS column is still the constant
  "n/a (no TS port yet)" and it was not regenerated.

**Flags for the maintainer (open decisions).** Open `needs-ruling` issues: #75 (the 213 sort rows), #78 (four oracle rows
falsify a premise of this mission's `RectRow.test.ts`; classified, AD-13), #79 (four nondeterministic sweep cases classified
deterministic), #80 (upstream defects with drafts). Open `follow-up` issues: #73 (the upstream hang; filed as `needs-ruling`
and relabelled during the run), #76 (recursion depth beyond 2,000), #81 (the one open arm).

Audit points: the `decisions.md` audit points (the `MARKER` widening, the `ElkGraphPackage.ts` registry, the
`SUFFIX_DIFFERENCES` row removal, `Math.random()` in shipped code); the `JavaObjects.equals` change and its vector; the
explicit-stack conversion in landed `DepthFirstCompaction.ts`; the classified list in `RectRow.test.ts` (#78); the additive
recorder extensions and the count pins that followed them; the `neutraliseIdentity` step landing ahead of row 9; `U` rows 4
and 9 of `unreached.md` (dead by a reading of the Java supported by a search, not by a vector).

## Revision 2026-11-13 (ts-parity-dashboard)

Appended; no earlier line is edited. Source: TP1-TP8 in `plans/ts-parity-dashboard/decisions.md`; the journal is
`plans/ts-parity-dashboard/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task ids
are T1-T8; the base is `14f5b691cad42979fc0721ca18186267e1e509bd` (the 8c squash commit).

**Row 9 is done.** The TS engine runs over every `(algorithm, model, variant)` case of a fresh full oracle sweep and each case
gets one category (issue #40). The dashboard is the generated `docs/parity-report.md` (TS conformant column, `TS sweep` table,
annotated `TS findings`), mirrored to `docs-site/parity.md` by `npm run docs:build`. The AD-4 list of non-strict `Math.*` call
sites exists in `docs/conformance.md` § Non-strict Math call sites and is pinned by a fitness test. Design and runbook:
`docs/architecture/parity-dashboard.md`; counts: `docs/conformance.md` § TS corpus sweep. The final commit is one squashed
commit `feat(corpus): ts sweep and per-algorithm parity dashboard (9)` with `Refs: #40` (TP8); the per-task history is under
the tag `ts-parity-dashboard/pre-squash`. This was a tooling mission: no ELK class was ported.

**Evidence.**

- Oracle sweep (TP1): ELK `8aaa3c14` with patches 0001 and 0002, `-XX:hashCode=2`, into the default sweep directory: 18,930
  cases, 110 s, 0 `oracle-error`, 0 parse errors, 1 `timeout` (vertiflex, as in the old report). It replaced a 10,881-row
  filtered partial. The old report had 18,023 cases (patch 0001 only); +907 (layered native 6,265 → 7,160, rectpacking native
  21 → 24, one more generated input for nine algorithms).
- TS sweep (TP2, TP3), final run after the one fix: 14 algorithms, 8 forked shards, 120 s per case, 44.7 s wall, Node v26.3.1.
  18,930 cases, one outcome each in `--out`; counts sum to `planned` for every algorithm. ok 15,528; both-throw 1,430; mismatch
  1 (options-only); oracle-only-throw 1; ts-only-throw 0; ts-aborted 0; excluded 1,970; conformant 16,958 of 16,960 compared.
  Per algorithm (planned: ok / both-throw / excluded): box 898: 898/0/0; disco 906: 819/87/0; fixed 898: 869/29/0; force 906:
  817/89/0; layered 7,163: 7,144/19/0; mrtree 906: 817/89/0; radial 906: 540/365/0 and 1 mismatch; random 906: 534/0/372;
  rectpacking 919: 830/89/0; sporeCompaction 906: 99/0/807; sporeOverlap 906: 94/21/790 and 1 oracle-only-throw; stress 898:
  809/89/0; topdownpacking 906: 906/0/0; vertiflex 906: 352/553/1.
- Determinism (stop 6): two TS runs of the same oracle sweep differ in one case, a `sporeOverlap` jitter case (#79).
- Residuals (TP8): the 7 cases of #68 item A and the 6 of #71 item 2 are `ok`. The mission-5 options-only family of
  `fixed`/`box`/`random` (497 mismatches, 18 TS-only throws) is closed: 0 mismatches and 0 one-sided throws in all three.
- `Math.*` list (TP7): 36 transcendental call sites in 14 files (atan2 6, cos 7, sin 6, pow 7, acos 3, asin 3, log 2, exp 1,
  log10 1), each with its Java site and the tests that reach it; all 36 Java sites call `Math`, none `StrictMath`.
  `test/architecture/math-call-sites.fitness.test.ts` compares the scan with `math-call-sites.json` in both directions.
- Gates at mission end: in the journal's last `gate` rows (format, typecheck, complexity, coverage, docs build, full suite,
  report staleness, the six golden sets regenerated byte-identically).

**Decisions taken during the run.**

- TP1: as planned. TP3: `--out` of the sharded path holds `cases`; the in-process `execute` still writes the old summary.
- TP2: forked children with a `ready` handshake (start-up has its own 60 s limit, outside the per-case limit), one case per
  message, parent-side timer and SIGKILL, a fresh child after an abort; `excluded` rows never reach a child. The file is split
  into `ts-layout-{classify,pipeline,shards,protocol,worker}.ts` behind the CLI's re-exports.
- TP2 deviation (issue #82, `needs-ruling`): `CATEGORIES` stays the in-process six and the sweep uses `SWEEP_CATEGORIES`
  (seven, `ts-aborted` before `excluded`) with `summarizeSweep`, because the landed mission-5 test pins the six-key `counts`
  (AD-13). `--out`, stdout and the report carry seven.
- TP4: the report cells as in `decisions.md`, plus `— (no compared cases)` and `timeout none` for the two empty cases; the
  findings detail is a code span cut at 200 characters.
- TP5: `tools/corpus/ts-findings.json` has 7 display-only annotations (#68: 1; #79: 6).
- TP6: one landed-port defect fixed (below), its sibling sites filed as #83, the upstream defect as #84.
- TP7: as planned; no `StrictMath.ts`.
- TP8: evidence comments on #40, #68, #71, #74 and #79; nothing decided there.

Deviations from the plan, all journaled: (1) the #82 category split. (2) `ts-layout-pipeline.ts` and
`test/helpers/ts-layout-worker-deps.ts` beside the planned files. (3) `docs/parity-report.md` joined `.prettierignore`: its
generator compares it byte for byte and the old copy had been reformatted, so the staleness check and `format:check` could
not both pass. (4) T7's prose was written by `documentation-engineer`, not `technical-writer` (which has no Edit tool).
(5) T5 was run by the orchestrator, not fanned out: there were three mechanisms.

**Divergences.** No new known divergence. `retarget/radial/default/tests/layered/splines/sloppy_overlaps_2` is the accepted
last-ulp `Math.sin` case (#68 item B; one option string). The spore jitter cases are oracle nondeterminism (#79): in this sweep
the four cases of #79 are `nondeterministic`, and two more (`…/hierarchical/ptolemy_electricpowersystem_…SimXFMU`,
`…/ptolemy_test_auto32_…SimXFMU`) have verdict `throws` by chance (24 oracle runs each: 20 and 16 throws, 4 and 8 distinct
layouts), so a TS sweep shows 0 to 2 `oracle-only-throw` findings from them.

**Changes to landed code.**

- `src/alg/layered/p1cycles/ModelOrderCycleBreaker.ts`: the two reads of `ModelOrderCycleBreaker.java:70-71` go through
  `unboxInteger`. A nested graph under `INCLUDE_CHILDREN` has no `MAX_MODEL_ORDER_NODES` (`ElkGraphImporter.java:380-384` sets
  it on the top-level graph only), the Java throws a `NullPointerException`, the port laid out. Found by the sweep
  (`native/layered/hierarchy-include/examples/user-hints/model-order/modelOrderCycleBreaking`, now `both-throw`); the added
  unit test carries the oracle's message. No landed expected value, ref, vector or tolerance changed.
- `tools/corpus/ts-layout-compare.ts` and `parity-report.ts`: split and extended; their landed tests pass unedited.
  `parity-report.ts` now requires `--ts-summary` (exit 2 without it).
- `.prettierignore`: `docs/parity-report.md`.

**Hand-offs.**

- To row 12 (docs site): the dashboard publishes with the site through `docs-site/copy-reports.mjs`; no site component was
  added and `parity.md` stays in `TRANSLATABLE_EXCLUDES`.
- To row 13 (ELK upgrade): the runbook of `docs/architecture/parity-dashboard.md` (oracle sweep, TS sweep, report, staleness
  check) is the upgrade check; the `Math.*` fitness test fails on a new call site until it is listed.
- To #74: the `Math.*` list is the audit's input (per-site deltas against the 0.01 px bar were not measured here).
- `npm run complexity` and the coverage gate do not scan `tools/corpus`; this mission checked those files with explicit runs.

**Flags for the maintainer (open decisions).** New `needs-ruling` issues: #82 (the category lists against the landed test),
#84 (the upstream `MAX_MODEL_ORDER_NODES` defect, with a draft upstream issue; nothing was filed upstream). New `follow-up`
issue: #83 (`GreedyModelOrderCycleBreaker` and `SCCModelOrderCycleBreaker` miss the same unboxing throw; oracle evidence in
the issue). Still open and untouched: #72, #74, #75, #79.

Audit points: the change to landed `ModelOrderCycleBreaker.ts` and its test; the #82 split; the `.prettierignore` entry and
the reformatted (now unpadded) committed report; the annotations for the four #79 cases, which are not findings in this
sweep; the evidence cells of the `Math.*` table (a test reaches the call; it does not prove the test would detect a last-ulp
difference).

## Revision 2026-11-13 (text-sizing-seam)

Appended; no earlier line is edited. Source: TX1-TX8 in `plans/text-sizing-seam/decisions.md`; the journal is
`plans/text-sizing-seam/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task ids
are T1-T7; the base is `854cbbd7cb51bed20ca1fb176c5b69f72a00a4b9` (the row-9 squash commit).

**Row 10 is done, with one part waiting for a ruling (#86).** The oracle carries its first text-sizing patch,
`tools/oracle/patches/0003-alg.test-pluggable-label-text-measurer.patch` (issue #41), and the port has the paired seam in
`test/helpers/layout-test-text-measurer.ts`. With the fixed measure on both sides, the port sizes every label of every
label-bearing model as the oracle does. Design and runbook: `docs/architecture/text-sizing-seam.md`; counts:
`docs/conformance.md` § Text-sizing seam. The final commit is one squashed commit
`feat(oracle): text-sizing seam patch and ts measurer (10)` with `Refs: #41`; the per-task history is under the tag
`text-sizing-seam/pre-squash`. No ELK class was ported and nothing under `src/` changed.

**Decisions (planned unattended; all eight held, with the deviations below).**

- TX1: the patch touches only the test bundle `org.eclipse.elk.alg.test`; at the pin no plugin measures text.
- TX2: `TextMeasurer` with `AwtTextMeasurer` (the former body, verbatim) and `FixedAdvanceTextMeasurer`, selected by the
  system property `org.eclipse.elk.alg.test.textMeasurer` (unset or `awt`; `fixed`; anything else throws).
- TX3: "both". The default stays AWT in the oracle and the FX8 snapshot in TS; fixed mode exists only for the comparison.
- TX4: the fixed measure is `[length × 6, 12]`, exact in binary; not a font model.
- TX5: the TS twin lives in `test/helpers/`, not `src/`, because its Java site is test-framework code.
- TX6: evidence is a committed ref for the vendored models, a local corpus comparison, and runner parity in fixed mode.
- TX7: the default is proven unchanged by class hashes, default-mode JUnit outcomes and an AWT re-measure.
- TX8: refs are restamped by script only; the only ref diff is the `patches` arrays.

**Evidence** (reference platform `Darwin arm64`, JDK 21.0.1; oracle `8aaa3c14` + patches 0001, 0002, 0003).

- TX7: 1,348 class hashes before the rebuild, 1,351 after; the only differences are `TestConfiguration.class` (changed) and
  the three new classes. Default-mode JUnit over the 43 runner suites: 5,619 runs, 0 failures, per class equal before and
  after. The AWT re-measure through the patched code equals `layered-label-metrics.json` on 2,317 of 2,317 texts (the file
  is byte-identical).
- TX6(a): `test/golden/refs/java/label-sizing.json` (new, by `tools/vectors/label-sizing-vectors.sh`): 17 text rows, 119
  vendored label-bearing models, 1,052 label rows (131 preset), each model's layout. `test/golden/label-sizing.test.ts`
  (239 tests): every key, text, size and `preset` equal, every layout equal at 1e-6.
- TX6(b): `test/corpus/label-sizing-sweep.test.ts` (skip-gated; the oracle output is local): 759 of 759 corpus models and
  21,753 label rows equal (1,513 sized by the measurer, 20,240 preset by the model).
- TX6(c): in fixed mode the oracle's 43 suites give 5,619 runs and 0 failures; the TS runner's cases equal the JUnit line for
  41 of 43 classes. `Issue665Test` and `Issue700Test` differ by #58's three stress-dependent cases, in default mode too.
- TX8: all ten regen scripts reran; nine `_meta.json` gained `0003` in `patches`, nothing else moved.
- Gates at mission end: in the journal's last `gate` rows.

**Deviations from the plan, all journaled.**

- 119 models, not "up to 137": the planning count was a text grep; the recorder counts models whose parsed graph holds a
  label (108 + 19) and drops 8 content duplicates.
- The local corpus output is `$ELK_ORACLE_DIR/sweep/label-sizing/`, not `$ELK_ORACLE_DIR/label-sizing/`: a new untracked
  directory at the oracle root makes `build.sh` call the worktree stale.
- `build.sh` ran with an environment-scoped git excludes file for four existing cache directories (`vector-cache/`, `t4/`,
  `rerecord/`, `final-gate/`), which its staleness filter does not know (#85). `build.sh` itself was not edited.
- JUnit runs used a scratch copy of `java-tests.sh` with `org.eclipse.elk.alg.common.test` added (three suites live there).
- `test/helpers/label-sizing-rows.ts` beside the planned files: the label-row derivation both comparison tests share.
- The parity report changed in its patch line only, generated from the committed report's own sweep inputs and the new
  oracle manifest, not from the fresh sweep (#86, below).

**Flags for the maintainer (open decisions).**

- #86 (`needs-ruling`): a report generated from a fresh sweep cannot differ from the committed one by the patch line alone.
  Six `sporeOverlap` verdicts flicker between sweeps (unseeded `Math.random()` jitter, #79; confirmed by four repeats on one
  build) and the 14 timing rows change on every sweep. The spore rows, the timings and `ts-findings.json` are untouched;
  against the live sweep cache the staleness check reports the committed report stale.
- #85 (`follow-up`): `build.sh`'s staleness filter does not exempt `vector-cache/` and three old output directories.
- TX5 against `docs/conformance.md` § 4 step 3, which said "in `src/`": the step now has a sentence for test-bundle seams.
- TX3 "both": the snapshot is neither replaced nor extended. #58's four texts are still missing from it; in fixed mode they
  are not needed.
- The rebuild changed `oracle-build.json`, which is part of the vector cache's salt, so the next run of every cached JVM
  recorder is cold (the elkj round-trip recorder took 3 h 58 min cold in mission 4e).
- The patch's new Java types are `public`; the package is not exported by the bundle, as before.
- `../elk` past the pin over `plugins/` and `test/org.eclipse.elk.alg.test`: only `8bd00922` (prose, `graph` bundle), as at
  planning.

**Hand-offs.**

- To #58: in fixed mode the three stress-dependent cases need no snapshot rows; `STRESS_PENDING` and model vendoring remain.
- To #57 and #77 (upstream PRs as oracle patches): the next patch is `0004`; the in-place rebuild needs the #85 workaround
  or its fix, and it empties the vector cache.
- To row 13 (ELK upgrade): a pin bump must re-prove TX1 (no plugin measures text) and rerun
  `label-sizing-vectors.sh --remeasure-awt` on the reference platform.

## Revision 2026-11-13 (deferred-bundles-adr)

Appended; no earlier line is edited. Source: DB1-DB7 in `plans/deferred-bundles-adr/decisions.md`; the journal is
`plans/deferred-bundles-adr/decision-journal.md`. Where this section conflicts with the text above, this section wins. Task
ids are T1-T3; the base is `887d11e9b05dc357cc5b17fd50b018fb58080d75` (the row-10 squash commit).

**Row 11 is done as an ADR with Status Proposed; acceptance is pending on #88 (`needs-ruling`).** The ADR is
`docs/architecture/deferred-bundles-adr.md`; its evidence, with every command, is `plans/deferred-bundles-adr/evidence.md`.
The final commit is one squashed commit `docs(adr): propose deferred-bundles decision (11)` with `Refs: #42`; the per-task
history is under the tag `deferred-bundles-adr/pre-squash`. No ELK class was ported and nothing under `src/`, `test/` or
`tools/` changed.

**Recommendation per bundle (6,019 lines evaluated, 0 ported).**

| Bundle | Lines | Recommendation | Reason |
| ------ | ----: | -------------- | ------ |
| `alg.libavoid` | 1,548 | no-go: skip | A client of a downloaded C++ binary (libavoid-server v0.3.1); the routing is not in the Java, so the pin does not define the result; no delegate exists |
| `alg.graphviz.dot` | 2,728 | no-go: skip | Portable and oracle-provable, but its only consumer is `alg.graphviz.layouter` and `DotImporter` has none; 7 to 10 tasks for code nothing calls |
| `alg.graphviz.layouter` | 1,743 | no-go in this package | Process and Eclipse code; results depend on an unpinned Graphviz; a dot-engine delegate is feasible only as a separate package (AD-14), about 5 to 8 tasks, when a consumer asks |

For all three: no in-scope caller, no ELK test, none of the 898 corpus models. No recommendation needs a locked rule
amended.

**What did not change, and why.**

- `test/architecture/bundle-deps.json` and `tools/bundle-deps.ts` are byte-identical to the base (DB3): no bundle is
  adopted. The committed table equals a regeneration from the pinned manifests (checked by hand, journal T3).
- No new fitness test (DB4). "Deferred = not ported" is enforced by `module-boundaries.fitness.test.ts:322`
  (`has no unmapped directories`), self-checked at `:306`. The row-11 exit "fitness test updated" is met by that citation.
- CLAUDE.md's "Deferred" list, the skeleton's AD rows and `docs/conformance.md` are untouched; `inventory.md` rows 38-40 and
  `port-map.md` link the ADR and keep `Deferred` (DB6).
- No oracle rebuild, JVM run or external binary (DB7).

**On acceptance (#88), not done here.** CLAUDE.md moves the three bundles from "Deferred" to "Out of scope"; AD-17 is
appended to `plans/elk-engine-skeleton/decisions.md`; the inventory and port-map rows become `Out`; the ADR becomes Accepted.
A "go" for any bundle instead needs its suffix in `IN_SCOPE_SUFFIXES`, a regenerated `bundle-deps.json`, a mapping test and
a new roadmap row.

**Flags for the maintainer.**

- #88 (`needs-ruling`): accept, amend or reject the ADR.
- #89 (`follow-up`): `module-boundaries.fitness.test.ts:342` (`regenerated deps equal the committed file`) is skipped
  unless the ELK checkout's HEAD is exactly the pin; on this machine neither `../elk` (`b715fb10`) nor `../elk-oracle`
  (`d650f036`, pin plus patches) qualifies, so the check does not run locally.
- The LGPL-2.1-or-later licence of libavoid is recorded as a cost of porting it; whether such a port could ship in an
  EPL-2.0 package was not answered.

**Hand-offs.**

- To row 12 (docs site, first publish): the ADR is not a site page; links to it from the inventory and port-map pages are
  rewritten to GitHub blob URLs, which resolve once `chore/issue-queue` reaches `main`.
- To row 13 (ELK upgrade): a pin move that touches one of the three bundles, or gives one an in-scope caller or test, is a
  revisit trigger of the ADR.
- To the `shared.test` port (`test/integration/`): its manifest requires `alg.graphviz.layouter`, but none of its four
  classes uses it; the entry is not carried.
