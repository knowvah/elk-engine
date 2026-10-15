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
